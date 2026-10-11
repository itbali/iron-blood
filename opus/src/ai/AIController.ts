import type { HitLevel, MoveDef } from '../combat/AttackData';
import type { Projectile } from '../combat/Projectile';
import type { NormalSlot } from '../characters/CharacterDef';
import type { Fighter } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { MAX_METER } from '../core/constants';
import { Rng } from '../core/math';
import type { Difficulty } from '../game/GameState';
import type { MotionToken } from '../input/InputBuffer';
import type { Axis, FrameInput } from '../input/InputTypes';
import { Button } from '../input/InputTypes';
import type { DifficultyProfile } from './Difficulty';
import { DIFFICULTIES } from './Difficulty';

/** One step of an input plan; `fx` is relative to facing (1 = toward the opponent). */
interface PlanStep {
  fx: Axis;
  y: Axis;
  hold?: number;
  press?: number;
  frames: number;
  /** Wait (up to `frames`) until our current move connects; abort the plan if it never does. */
  onConnect?: boolean;
}

export type AIIntent =
  | 'idle'
  | 'approach'
  | 'retreat'
  | 'attack'
  | 'block'
  | 'jump'
  | 'special'
  | 'grab'
  | 'combo'
  | 'antiair'
  | 'punish'
  | 'super'
  | 'finisher'
  | 'wakeup';

/** What the AI can "see": the same information a human reads from the screen. */
interface Observation {
  x: number;
  y: number;
  state: FighterState;
  attacking: boolean;
  recovering: boolean;
  recoveryLeft: number;
  hitLevel: HitLevel | null;
  reach: number;
  airborne: boolean;
  approachingAir: boolean;
  blocking: boolean;
  knockedDown: boolean;
  projectileThreat: number;
}

const HISTORY = 64;
const TOKEN_TO_DIR: Record<MotionToken, [Axis, Axis]> = {
  F: [1, 0],
  B: [-1, 0],
  D: [0, -1],
  U: [0, 1],
  DF: [1, -1],
  DB: [-1, -1],
  N: [0, 0],
};

/**
 * Decision-making opponent. It never touches fighter state directly: it only emits
 * FrameInput through the same pipeline as a keyboard, and reacts to a *delayed*
 * observation of the opponent, so harder levels differ by reaction time and choices,
 * not by reading the player's inputs.
 */
export class AIController {
  readonly profile: DifficultyProfile;
  private rng: Rng;
  private plan: PlanStep[] = [];
  private observations: Observation[] = [];
  private frame = 0;
  private nextDecision = 0;
  intent: AIIntent = 'idle';
  enabled = true;
  private aggressionBoost = 0;

  constructor(
    difficulty: Difficulty,
    seed: number,
    private readonly self: Fighter,
  ) {
    this.profile = DIFFICULTIES[difficulty];
    this.rng = new Rng(seed);
  }

  setPhase2(): void {
    this.aggressionBoost = 0.3;
  }

  get debugState(): string {
    return `${this.profile.label} · ${this.intent} · plan ${this.plan.length}`;
  }

  observe(opp: Fighter, projectiles: Projectile[]): void {
    const m = opp.move;
    const phase = opp.movePhase;
    let threat = 9999;
    for (const p of projectiles) {
      if (p.owner === opp && !p.dead) {
        const d = (this.self.x - p.x) * p.facing;
        if (d > 0 && d < threat) threat = d;
        if (p.def.targeted && p.telegraph > 0) threat = Math.min(threat, Math.abs(p.x - this.self.x) < 90 ? 0 : threat);
      }
    }
    const obs: Observation = {
      x: opp.x,
      y: opp.y,
      state: opp.state,
      attacking: !!m && (phase === 'startup' || phase === 'active') && (m.hitboxes.length > 0 || !!m.grab),
      recovering: !!m && phase === 'recovery',
      recoveryLeft: m ? opp.moveTotalFrames - opp.moveFrame : 0,
      hitLevel: m ? m.hitLevel : null,
      reach: m ? this.moveReach(m, opp.scale) : 0,
      airborne: opp.y > 10,
      approachingAir: opp.y > 10 && Math.sign(opp.vx) === Math.sign(this.self.x - opp.x),
      blocking: opp.state === FighterState.BLOCK,
      knockedDown: opp.state === FighterState.KNOCKDOWN || opp.state === FighterState.GETUP,
      projectileThreat: threat,
    };
    this.observations.push(obs);
    if (this.observations.length > HISTORY) this.observations.shift();
  }

  private delayed(): Observation | undefined {
    const idx = this.observations.length - 1 - this.profile.reactionFrames;
    return this.observations[Math.max(0, idx)];
  }

  private moveReach(m: MoveDef, scale: number): number {
    let r = 0;
    for (const hb of m.hitboxes) r = Math.max(r, (hb.x + hb.w) * scale);
    if (m.motion) for (const s of m.motion) if (s.vx) r += s.vx * Math.max(1, (s.until ?? s.frame) - s.frame) * 0.8;
    return r + 30;
  }

  /** Called once per simulation frame; returns the input for the next frame. */
  update(opp: Fighter, ctx: { finisherWindow: boolean; fightActive: boolean }): FrameInput {
    this.frame++;
    const me = this.self;
    if (!this.enabled || !ctx.fightActive) {
      this.plan = [];
      this.intent = 'idle';
      return { x: 0, y: 0, held: 0, pressed: 0 };
    }

    if (me.isLocked) {
      if (me.lockedBy && this.rng.chance(this.profile.techChance / 4)) return this.out(0, 0, 0, Button.GRAB);
      return this.out(0, 0, 0, 0);
    }

    if (ctx.finisherWindow) return this.finisherBrain(opp);

    const obs = this.delayed();
    if (obs && me.isActionable && this.react(obs, opp)) {
      // reaction replaced the plan
    } else if (this.plan.length === 0 && this.frame >= this.nextDecision && (me.isActionable || me.state === FighterState.JUMP)) {
      if (obs) this.decide(obs, opp);
      this.nextDecision = this.frame + this.profile.decisionInterval + this.rng.int(0, this.profile.decisionInterval);
    }
    return this.runPlan();
  }

  // ------------------------------------------------------------------ reactions

  /** Reactive layer: blocking, anti-airs and punishes based on the delayed observation. */
  private react(obs: Observation, opp: Fighter): boolean {
    const p = this.profile;
    const me = this.self;
    const dist = Math.abs(obs.x - me.x);
    const busyDefending = this.intent === 'block' && this.plan.length > 0;

    if (obs.projectileThreat < 260 && !busyDefending && this.rng.chance(p.blockChance * 0.6)) {
      if (this.rng.chance(p.spacing * 0.5) && obs.projectileThreat > 120) {
        this.setPlan('jump', [{ fx: 1, y: 1, frames: 3 }, { fx: 0, y: 0, frames: 14 }, { fx: 0, y: 0, press: Button.HK, frames: 1 }]);
      } else {
        this.setPlan('block', [{ fx: 0, y: 0, hold: Button.BLOCK, frames: 26 }]);
      }
      return true;
    }

    if (obs.attacking && dist < obs.reach + 30 && !busyDefending) {
      if (this.rng.chance(p.blockChance)) {
        const low = obs.hitLevel === 'low' ? this.rng.chance(p.lowBlockAccuracy) : !this.rng.chance(p.lowBlockAccuracy) && this.rng.chance(0.2);
        this.setPlan('block', [{ fx: 0, y: low ? -1 : 0, hold: Button.BLOCK, frames: 16 + this.rng.int(0, 8) }]);
        return true;
      }
      return false;
    }

    if (obs.approachingAir && dist < 260 && this.intent !== 'antiair' && this.rng.chance(p.antiAirChance)) {
      const reversal = this.findReversal();
      if (reversal && this.rng.chance(0.5)) this.setPlan('antiair', this.specialSteps(reversal.motion, reversal.button));
      else this.setPlan('antiair', [{ fx: 0, y: -1, frames: 1 }, { fx: 0, y: -1, press: Button.HP, frames: 2 }]);
      return true;
    }

    if (obs.recovering && obs.recoveryLeft > 8 && dist < 180 && this.intent !== 'punish' && this.rng.chance(p.punishChance)) {
      if (me.meter >= MAX_METER && this.rng.chance(p.superChance)) {
        this.setPlan('super', [{ fx: 0, y: 0, press: Button.S1 | Button.S2, frames: 2 }]);
      } else {
        this.setPlan('punish', this.comboSteps(dist));
      }
      return true;
    }
    void opp;
    return false;
  }

  // ------------------------------------------------------------------ neutral

  private decide(obs: Observation, opp: Fighter): void {
    const me = this.self;
    const p = this.profile;
    const dist = Math.abs(obs.x - me.x);
    const scale = me.scale;
    const pokeRange = 125 * scale;
    const aggression = Math.min(1, p.aggression + this.aggressionBoost + (me.hp < opp.hp ? 0.1 : 0));
    const lowHp = me.hp / me.maxHp < 0.25;

    if (me.state === FighterState.JUMP) {
      this.setPlan('attack', [{ fx: 0, y: 0, press: this.rng.chance(0.5) ? Button.HK : Button.HP, frames: 1 }]);
      return;
    }

    if (obs.knockedDown) {
      this.setPlan('wakeup', dist > 160 ? this.walk(1, 14) : [{ fx: 0, y: 0, frames: 8 }]);
      return;
    }

    if (me.meter >= MAX_METER && dist < 220 && this.rng.chance(p.superChance * 0.35)) {
      this.setPlan('super', [{ fx: 0, y: 0, press: Button.S1 | Button.S2, frames: 2 }]);
      return;
    }

    if (dist < 95 * scale && obs.blocking && this.rng.chance(p.throwChance * 2)) {
      this.setPlan('grab', [{ fx: 0, y: 0, press: Button.GRAB, frames: 2 }]);
      return;
    }

    if (dist < 85 * scale && this.rng.chance(p.throwChance)) {
      this.setPlan('grab', [{ fx: 1, y: 0, frames: 2 }, { fx: 0, y: 0, press: Button.GRAB, frames: 2 }]);
      return;
    }

    if (dist <= pokeRange) {
      if (this.rng.chance(0.18 * (1 - aggression))) {
        this.setPlan('block', [{ fx: 0, y: 0, hold: Button.BLOCK, frames: 14 }]);
      } else if (lowHp && this.rng.chance(0.3)) {
        this.setPlan('retreat', this.walk(-1, 16));
      } else {
        this.setPlan('combo', this.comboSteps(dist));
      }
      return;
    }

    const projectileSpecial = this.findSpecial((m) => !!m.projectile && !m.projectile.targeted);
    const targetedSpecial = this.findSpecial((m) => !!m.projectile?.targeted);
    const dashSpecial = this.findSpecialByMotion(['F', 'N', 'F']);

    if (dist > 360) {
      const r = this.rng.next();
      if (r < p.specialChance && projectileSpecial) {
        this.setPlan('special', this.specialSteps(projectileSpecial.motion, projectileSpecial.button));
      } else if (r < p.specialChance * 1.4 && targetedSpecial) {
        this.setPlan('special', this.specialSteps(targetedSpecial.motion, targetedSpecial.button));
      } else if (r < 0.15 + aggression * 0.7) {
        this.setPlan('approach', this.walk(1, 18 + this.rng.int(0, 16)));
      } else {
        this.setPlan('idle', [{ fx: 0, y: 0, frames: 10 }]);
      }
      return;
    }

    // mid range
    const r = this.rng.next();
    if (r < p.specialChance * 0.6 && dashSpecial && dist < 300) {
      this.setPlan('special', this.specialSteps(dashSpecial.motion, dashSpecial.button));
    } else if (r < p.specialChance && projectileSpecial) {
      this.setPlan('special', this.specialSteps(projectileSpecial.motion, projectileSpecial.button));
    } else if (r < p.specialChance + 0.12 * aggression && dist < 300) {
      this.setPlan('jump', [
        { fx: 1, y: 1, frames: 3 },
        { fx: 0, y: 0, frames: 12 + this.rng.int(0, 6) },
        { fx: 0, y: 0, press: this.rng.chance(0.5) ? Button.HK : Button.HP, frames: 1 },
        { fx: 0, y: 0, frames: 12 },
      ]);
    } else if (r < 0.2 + aggression * 0.75) {
      const steps = Math.max(6, Math.round((dist - pokeRange * (0.7 + p.spacing * 0.2)) / Math.max(1, me.def.physique.walkSpeed)));
      this.setPlan('approach', this.walk(1, Math.min(steps, 30)));
    } else if (r < 0.92) {
      this.setPlan('retreat', this.walk(-1, 8 + this.rng.int(0, 10)));
    } else {
      this.setPlan('block', [{ fx: 0, y: 0, hold: Button.BLOCK, frames: 12 }]);
    }
  }

  private finisherBrain(opp: Fighter): FrameInput {
    const me = this.self;
    if (this.plan.length === 0 && me.isActionable && this.frame >= this.nextDecision) {
      this.nextDecision = this.frame + 20;
      const fin = me.def.finishers[0];
      if (fin && this.rng.chance(this.profile.finisherChance)) {
        if (Math.abs(opp.x - me.x) > fin.range) this.setPlan('approach', this.walk(1, 12));
        else this.setPlan('finisher', this.specialSteps(fin.motion, fin.button));
      } else if (this.rng.chance(0.03)) {
        this.setPlan('attack', [...this.walk(1, 20), { fx: 0, y: 0, press: Button.HP, frames: 1 }]);
      }
    }
    return this.runPlan();
  }

  // ------------------------------------------------------------------ plan helpers

  private comboSteps(dist: number): PlanStep[] {
    const me = this.self;
    const p = this.profile;
    const route = this.pickRoute(dist);
    const steps: PlanStep[] = [];
    if (dist > 105 * me.scale) steps.push(...this.walk(1, Math.min(10, Math.round((dist - 90 * me.scale) / me.def.physique.walkSpeed))));
    route.forEach((link, i) => {
      if (i > 0) {
        if (i >= p.maxComboLength || !this.rng.chance(p.comboChance)) return;
        steps.push({ fx: 0, y: link.crouch ? -1 : 0, frames: 26, onConnect: true });
      }
      if (link.motion) steps.push(...this.specialSteps(link.motion, link.button ?? 's1'));
      else steps.push({ fx: 0, y: link.crouch ? -1 : 0, press: link.press, frames: 2 });
    });
    return steps;
  }

  /** Builds a combo route from the character's own cancel data — no hard-coded per-character scripts. */
  private pickRoute(dist: number): { press?: number; crouch?: boolean; motion?: MotionToken[]; button?: 's1' | 's2' }[] {
    const n = this.self.def.normals;
    const routes: { press?: number; crouch?: boolean; motion?: MotionToken[]; button?: 's1' | 's2' }[][] = [];
    const special = this.findSpecial((m) => m.kind === 'special' && m.hitboxes.length > 0 && !m.grab) ?? this.findSpecial((m) => !!m.projectile);
    const specialLink = special ? [{ motion: special.motion, button: special.button }] : [];
    const chain = (slots: NormalSlot[], bits: number[], crouch = false) => {
      const links: { press?: number; crouch?: boolean }[] = [];
      for (let i = 0; i < slots.length; i++) {
        if (i > 0 && !n[slots[i - 1]].cancelInto?.includes(n[slots[i]].id)) break;
        links.push({ press: bits[i], crouch });
      }
      return links;
    };
    routes.push([...chain(['lp', 'lp', 'hp'], [Button.LP, Button.LP, Button.HP]), ...specialLink]);
    routes.push([...chain(['lp', 'hp'], [Button.LP, Button.HP]), ...specialLink]);
    routes.push([...chain(['lk', 'hk'], [Button.LK, Button.HK]), ...specialLink]);
    routes.push(chain(['clk', 'chk'], [Button.LK, Button.HK], true));
    routes.push([{ press: Button.HK }]);
    if (dist > 110 * this.self.scale) return this.rng.chance(0.5) ? [{ press: Button.HK }] : [{ press: Button.LK }];
    return this.rng.pick(routes.filter((r) => r.length > 0));
  }

  private findSpecial(pred: (m: MoveDef) => boolean): { motion: MotionToken[]; button: 's1' | 's2' } | null {
    const me = this.self;
    for (const sp of me.def.specialInputs) {
      if (sp.button === 'grab') continue;
      const m = me.def.specials.find((x) => x.id === sp.move);
      if (!m || (m.phase2Only && !me.phase2)) continue;
      if (pred(m)) return { motion: sp.motion, button: sp.button };
    }
    return null;
  }

  private findSpecialByMotion(motion: MotionToken[]): { motion: MotionToken[]; button: 's1' | 's2' } | null {
    const sp = this.self.def.specialInputs.find((s) => s.motion.join() === motion.join() && s.button !== 'grab');
    if (!sp) return null;
    const m = this.self.def.specials.find((x) => x.id === sp.move);
    if (!m || (m.phase2Only && !this.self.phase2)) return null;
    return { motion: sp.motion, button: sp.button as 's1' | 's2' };
  }

  private findReversal(): { motion: MotionToken[]; button: 's1' | 's2' } | null {
    return this.findSpecial((m) => !!m.antiAir || (!!m.invuln && m.invuln[0] <= 1 && m.hitboxes.length > 0));
  }

  private specialSteps(motion: MotionToken[], button: 's1' | 's2' | 'grab'): PlanStep[] {
    const bit = button === 's1' ? Button.S1 : button === 's2' ? Button.S2 : Button.GRAB;
    if (motion.length === 0) return [{ fx: 0, y: 0, press: bit, frames: 2 }];
    const expanded: MotionToken[] = [];
    motion.forEach((t, i) => {
      expanded.push(t);
      const next = motion[i + 1];
      if (t === 'D' && next === 'F') expanded.push('DF');
      if (t === 'D' && next === 'B') expanded.push('DB');
      if (t === 'D' && next === 'D') expanded.push('N');
    });
    const steps: PlanStep[] = expanded.map((t) => ({ fx: TOKEN_TO_DIR[t][0], y: TOKEN_TO_DIR[t][1], frames: 2 }));
    const last = steps[steps.length - 1];
    last.press = bit;
    steps.push({ fx: 0, y: 0, frames: 2 });
    return steps;
  }

  private walk(dir: 1 | -1, frames: number): PlanStep[] {
    return [{ fx: dir, y: 0, frames: Math.max(1, frames) }];
  }

  private setPlan(intent: AIIntent, steps: PlanStep[]): void {
    this.intent = intent;
    this.plan = steps.map((s) => ({ ...s }));
  }

  private runPlan(): FrameInput {
    const me = this.self;
    while (this.plan.length) {
      const step = this.plan[0];
      if (step.onConnect) {
        if (me.moveConnected && me.move) {
          this.plan.shift();
          continue;
        }
        if (!me.move || step.frames <= 0) {
          this.plan = [];
          break;
        }
        step.frames--;
        return this.out(0, step.y, 0, 0);
      }
      step.frames--;
      if (step.frames <= 0) this.plan.shift();
      let press = step.press ?? 0;
      if (press && this.rng.chance(this.profile.mistakeChance)) press = 0;
      const x = (step.fx * me.facing) as Axis;
      return this.out(x, step.y, step.hold ?? 0, press);
    }
    if (this.intent !== 'idle' && this.plan.length === 0) this.intent = 'idle';
    return this.out(0, 0, 0, 0);
  }

  private out(x: Axis, y: Axis, hold: number, press: number): FrameInput {
    return { x, y, held: hold | press, pressed: press };
  }
}
