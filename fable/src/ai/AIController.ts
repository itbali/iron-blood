import type { AttackData } from '@/combat/AttackData';
import { attackTotalFrames } from '@/combat/AttackData';
import type { Fighter } from '@/combat/Fighter';
import { FighterState, STUN_STATES } from '@/combat/FighterState';
import { METER_MAX, STAGE_HALF_WIDTH } from '@/core/constants';
import type { Rng } from '@/core/rng';
import type { Difficulty, PlayerSide } from '@/core/types';
import { Btn, makeInput, type InputFrame } from '@/input/InputFrame';
import type { Simulation } from '@/game/Simulation';
import { AIPlan, type AIIntent, type PlanStep } from './AIStateMachine';
import { DIFFICULTY_PROFILES, type DifficultyProfile } from './Difficulty';

/** What the AI knows about the world. Captured from the same simulation state the player sees. */
interface Observation {
  frame: number;
  distance: number;
  enemyState: FighterState;
  enemyAttack: AttackData | null;
  enemyAttackPhase: 'startup' | 'active' | 'recovery' | null;
  enemyAttackReach: number;
  enemyAirborne: boolean;
  enemyBlocking: boolean;
  enemyDown: boolean;
  enemyInStun: boolean;
  enemyMeter: number;
  ownHealth: number;
  enemyHealth: number;
  projectileIncoming: number;
  projectileLow: boolean;
  ownAtWall: boolean;
  enemyAtWall: boolean;
}

const CLOSE_RANGE = 150;
const MID_RANGE = 420;
const ANTI_AIR_RANGE = 230;

/**
 * Decision-making opponent. It only emits InputFrames, exactly like a human on a keyboard,
 * so it cannot do anything a player could not.
 */
export class AIController {
  readonly side: PlayerSide;
  readonly profile: DifficultyProfile;
  intent: AIIntent = 'idle';
  private plan: AIPlan | null = null;
  private history: Observation[] = [];
  private lastDecision = -999;
  private cooldowns = new Map<string, number>();
  private readonly rng: Rng;
  private readonly me: Fighter;
  private readonly enemy: Fighter;
  private stunReactFrame = -1;

  constructor(side: PlayerSide, difficulty: Difficulty, sim: Simulation) {
    this.side = side;
    this.profile = DIFFICULTY_PROFILES[difficulty];
    this.rng = sim.rng;
    this.me = sim.fighters[side];
    this.enemy = sim.fighters[(1 - side) as PlayerSide];
  }

  get debugState(): string {
    return `${this.intent}${this.plan ? '' : ' (idle)'}`;
  }

  update(sim: Simulation): InputFrame {
    const now = sim.frame;
    this.history.push(this.observe(sim));
    const delay = this.profile.reactionFrames;
    while (this.history.length > delay + 1) this.history.shift();
    const obs = this.history[0]!;

    // Stunned or mid-attack: keep feeding the plan (buffered presses still matter), otherwise wait.
    if (STUN_STATES.has(this.me.state) || this.me.state === FighterState.HURT) {
      this.plan = null;
      this.intent = 'wait';
      return this.recoveryInput(obs);
    }

    const urgent = this.detectDanger(obs);
    const planDone = !this.plan || this.plan.done;
    const canReplan = now - this.lastDecision >= this.profile.decisionInterval;

    if (urgent && (planDone || this.plan!.interruptible) && this.canReact(now)) {
      this.plan = this.defend(obs, urgent);
      this.lastDecision = now;
    } else if (planDone && (canReplan || this.me.isActionable)) {
      this.plan = this.decide(obs);
      this.lastDecision = now;
    }

    if (!this.plan || this.plan.done) {
      this.intent = 'idle';
      return makeInput();
    }
    this.intent = this.plan.intent;
    return this.plan.next();
  }

  private canReact(now: number): boolean {
    if (this.stunReactFrame === now) return false;
    this.stunReactFrame = now;
    return true;
  }

  private observe(sim: Simulation): Observation {
    const me = this.me;
    const enemy = this.enemy;
    let incoming = Infinity;
    let low = false;
    for (const p of sim.projectiles) {
      if (p.owner === me.side) continue;
      const approaching = (p.x - me.x) * -Math.sign(p.vx) >= 0;
      if (!approaching) continue;
      const d = Math.abs(p.x - me.x);
      if (d < incoming) {
        incoming = d;
        low = p.spec.hitLevel === 'low' || p.y < 60;
      }
    }
    const atWall = (f: Fighter) => Math.abs(f.x) > STAGE_HALF_WIDTH - f.config.pushbox.w - 20;
    const enemyAttack = enemy.isAttacking ? enemy.currentAttack : null;
    const reach = enemyAttack ? attackReach(enemyAttack) : 0;
    const facingMe = (me.x - enemy.x) * enemy.facing > 0;
    return {
      frame: sim.frame,
      distance: Math.abs(enemy.x - me.x),
      enemyState: enemy.state,
      enemyAttack,
      enemyAttackPhase: enemyAttack ? enemy.attackPhase : null,
      enemyAttackReach: facingMe ? reach : 0,
      enemyAirborne: enemy.airborne,
      enemyBlocking: enemy.state === FighterState.BLOCK || enemy.state === FighterState.BLOCKSTUN,
      enemyDown: enemy.isDown,
      enemyInStun: STUN_STATES.has(enemy.state) || enemy.state === FighterState.HURT,
      enemyMeter: enemy.meter,
      ownHealth: me.hp / me.maxHp,
      enemyHealth: enemy.hp / enemy.maxHp,
      projectileIncoming: incoming,
      projectileLow: low,
      ownAtWall: atWall(me),
      enemyAtWall: atWall(enemy),
    };
  }

  private detectDanger(obs: Observation): 'melee' | 'projectile' | 'grab' | null {
    if (obs.projectileIncoming < 260) return 'projectile';
    if (obs.enemyAttack && obs.enemyAttackPhase !== 'recovery') {
      if (obs.enemyAttack.grab) return obs.distance < obs.enemyAttack.grab.range + 40 ? 'grab' : null;
      if (obs.distance <= obs.enemyAttackReach + 60) return 'melee';
    }
    return null;
  }

  /** While stunned / knocked down: hold block on wake-up at higher difficulties. */
  private recoveryInput(obs: Observation): InputFrame {
    if (this.rng.chance(this.profile.blockChance * 0.5) && obs.distance < MID_RANGE) {
      return makeInput(0, 0, Btn.BLOCK, 0);
    }
    return makeInput();
  }

  private defend(obs: Observation, danger: 'melee' | 'projectile' | 'grab'): AIPlan {
    const p = this.profile;
    const fwd = this.me.facing;
    const back = (-fwd) as -1 | 1;
    if (danger === 'grab') {
      // Jump or back away: grabs cannot be blocked.
      if (this.rng.chance(0.6)) return new AIPlan('jump', [{ input: makeInput(back, 1), frames: 6 }], false);
      return new AIPlan('retreat', [{ input: makeInput(back, 0), frames: 14 }]);
    }
    if (danger === 'projectile') {
      if (this.rng.chance(p.projectileJumpChance)) {
        return new AIPlan('jump', [{ input: makeInput(fwd, 1), frames: 4 }, { input: makeInput(fwd, 0), frames: 20 }], false);
      }
      if (this.rng.chance(p.blockChance)) {
        const y = obs.projectileLow ? -1 : 0;
        return new AIPlan('block', [{ input: makeInput(0, y, Btn.BLOCK, Btn.BLOCK), frames: 30 }], false);
      }
      return new AIPlan('wait', [{ input: makeInput(), frames: 6 }]);
    }
    // Melee threat: block (matching the level), or at high skill answer with an invulnerable special.
    if (this.rng.chance(p.blockChance)) {
      const low = obs.enemyAttack?.hitLevel === 'low';
      const y = low ? -1 : 0;
      const frames = obs.enemyAttack ? Math.max(12, attackTotalFrames(obs.enemyAttack) - (obs.enemyAttackPhase === 'active' ? 4 : 0)) : 16;
      return new AIPlan('block', [{ input: makeInput(0, y, Btn.BLOCK, Btn.BLOCK), frames }], false);
    }
    if (this.rng.chance(p.punishChance * 0.3)) {
      const invuln = this.pickSpecial('close', true);
      if (invuln) return this.attackPlan('special', [invuln]);
    }
    return new AIPlan('wait', [{ input: makeInput(), frames: 4 }]);
  }

  private decide(obs: Observation): AIPlan {
    const p = this.profile;
    const ai = this.me.config.ai;
    const fwd = this.me.facing;
    const back = (-fwd) as -1 | 1;
    // Boss phase 2: relentless pressure, more specials, fewer hesitations.
    const enraged = this.me.phase2;
    const aggression = Math.min(1, ai.aggression * p.aggression * (obs.ownHealth < 0.3 && obs.enemyHealth > 0.6 ? 0.8 : 1) * (enraged ? 1.4 : 1));
    const specialChance = enraged ? Math.min(0.8, p.specialChance * 1.6) : p.specialChance;
    const mistakeChance = enraged ? p.mistakeChance * 0.4 : p.mistakeChance;

    if (this.rng.chance(mistakeChance)) {
      return new AIPlan(this.rng.chance(0.5) ? 'wait' : 'retreat', [{ input: makeInput(this.rng.chance(0.5) ? back : 0, 0), frames: this.rng.int(6, 18) }]);
    }

    // Super: full meter and the opponent is open.
    if ((this.me.meter >= METER_MAX || this.me.infiniteMeter) && this.rng.chance(p.superChance)) {
      const superAttack = this.me.config.attacks[this.me.config.superId];
      const inRange = superAttack?.projectile ? obs.distance < 900 : obs.distance < 260;
      if (superAttack && inRange && (obs.enemyInStun || obs.enemyAttackPhase === 'recovery' || obs.distance < CLOSE_RANGE || this.rng.chance(0.25))) {
        return this.attackPlan('super', [superAttack.id]);
      }
    }

    // Punish: the opponent whiffed and is recovering in range.
    if (obs.enemyAttackPhase === 'recovery' && obs.distance < MID_RANGE && this.rng.chance(p.punishChance)) {
      if (obs.distance < CLOSE_RANGE + 30) return this.comboPlan(true);
      const dash = this.pickSpecial('mid', false);
      if (dash) return this.attackPlan('punish', [dash]);
      return new AIPlan('approach', [{ input: makeInput(fwd, 0), frames: 10 }]);
    }

    // Anti-air.
    if (obs.enemyAirborne && obs.distance < ANTI_AIR_RANGE && this.rng.chance(p.punishChance)) {
      return this.attackPlan('antiAir', ['crouchHeavyPunch']);
    }

    // Opponent knocked down: step in for pressure or keep spacing.
    if (obs.enemyDown) {
      if (obs.distance > CLOSE_RANGE && this.rng.chance(aggression)) return new AIPlan('approach', [{ input: makeInput(fwd, 0), frames: 12 }]);
      return new AIPlan('wait', [{ input: makeInput(0, 0), frames: 8 }]);
    }

    // Enemy blocking a lot: mix in grabs and lows.
    if (obs.enemyBlocking && obs.distance < CLOSE_RANGE && this.rng.chance(p.grabChance + ai.grabby * 0.4)) {
      const grab = this.pickGrab();
      return this.attackPlan('grab', [grab]);
    }

    if (obs.distance <= CLOSE_RANGE) return this.decideClose(aggression, specialChance);
    if (obs.distance <= MID_RANGE) return this.decideMid(obs, aggression, specialChance);
    return this.decideFar(aggression, specialChance);
  }

  private decideClose(aggression: number, specialChance: number): AIPlan {
    const p = this.profile;
    const ai = this.me.config.ai;
    const back = (-this.me.facing) as -1 | 1;
    if (this.rng.chance(aggression)) {
      if (this.rng.chance(p.grabChance * ai.grabby * 2)) return this.attackPlan('grab', [this.pickGrab()]);
      if (this.rng.chance(specialChance * 0.5)) {
        const sp = this.pickSpecial('close', false);
        if (sp) return this.attackPlan('special', [sp]);
      }
      return this.comboPlan(false);
    }
    if (this.rng.chance(p.blockChance * 0.5)) return new AIPlan('block', [{ input: makeInput(0, 0, Btn.BLOCK, Btn.BLOCK), frames: 14 }]);
    if (this.rng.chance(p.jumpChance)) return new AIPlan('jump', [{ input: makeInput(back, 1), frames: 4 }, { input: makeInput(back, 0), frames: 12 }], false);
    return new AIPlan('retreat', [{ input: makeInput(back, 0), frames: this.rng.int(8, 16) }]);
  }

  private decideMid(obs: Observation, aggression: number, specialChance: number): AIPlan {
    const p = this.profile;
    const ai = this.me.config.ai;
    const fwd = this.me.facing;
    const back = (-fwd) as -1 | 1;
    const wantsCloser = obs.distance > ai.preferredRange;
    if (this.rng.chance(specialChance * (0.6 + ai.zoning * 0.5))) {
      const sp = this.pickSpecial('mid', false);
      if (sp) return this.attackPlan('special', [sp]);
    }
    if (this.rng.chance(p.jumpChance * (1 + aggression))) {
      // Jump-in attack: press a kick near the apex.
      return new AIPlan('jump', [{ input: makeInput(fwd, 1), frames: 4 }, { input: makeInput(fwd, 0), frames: 16 }, { input: makeInput(fwd, 0, Btn.HK, Btn.HK), frames: 20 }], false);
    }
    if (wantsCloser || this.rng.chance(aggression * 0.6)) {
      const frames = this.rng.int(10, 24);
      const steps: PlanStep[] = [{ input: makeInput(fwd, 0), frames }];
      // Poke on arrival with a quick kick.
      if (this.rng.chance(0.5)) steps.push({ input: makeInput(fwd, 0, Btn.LK, Btn.LK), frames: 14 });
      return new AIPlan('approach', steps);
    }
    if (this.rng.chance(p.spacingSkill * 0.5)) return new AIPlan('retreat', [{ input: makeInput(back, 0), frames: this.rng.int(6, 14) }]);
    return new AIPlan('wait', [{ input: makeInput(), frames: this.rng.int(4, 10) }]);
  }

  private decideFar(aggression: number, specialChance: number): AIPlan {
    const p = this.profile;
    const ai = this.me.config.ai;
    const fwd = this.me.facing;
    if (this.rng.chance(ai.zoning * (0.4 + specialChance))) {
      const sp = this.pickSpecial('far', false);
      if (sp) return this.attackPlan('special', [sp]);
    }
    if (this.rng.chance(p.jumpChance * 0.8)) {
      return new AIPlan('jump', [{ input: makeInput(fwd, 1), frames: 4 }, { input: makeInput(fwd, 0), frames: 24 }], false);
    }
    const frames = aggression > 0.8 ? this.rng.int(14, 24) : this.rng.int(18, 30);
    return new AIPlan('approach', [{ input: makeInput(fwd, 0), frames }]);
  }

  private comboPlan(punish: boolean): AIPlan {
    const p = this.profile;
    const ai = this.me.config.ai;
    const combos = ai.combos;
    if (combos.length && this.rng.chance(p.comboChance)) {
      const combo = this.rng.pick(combos).slice(0, p.maxComboLength);
      return this.attackPlan('combo', combo);
    }
    const single = punish ? 'heavyPunch' : this.rng.pick(['lightPunch', 'lightKick', 'heavyPunch', 'crouchLightKick', 'heavyKick']);
    return this.attackPlan('attack', [single]);
  }

  private pickGrab(): string {
    const ai = this.me.config.ai;
    const special = ai.closeSpecials.find((id) => this.me.config.attacks[id]?.grab);
    if (special && this.rng.chance(0.5) && this.ready(special)) return special;
    return 'throw';
  }

  private pickSpecial(range: 'close' | 'mid' | 'far', invulnOnly: boolean): string | null {
    const ai = this.me.config.ai;
    const pool = range === 'close' ? ai.closeSpecials : range === 'mid' ? ai.midSpecials : ai.farSpecials;
    const options = pool.filter((id) => {
      const a = this.me.config.attacks[id];
      if (!a || !this.ready(id)) return false;
      if (invulnOnly && !a.invuln && !a.armor) return false;
      return true;
    });
    if (!options.length) return null;
    return this.rng.pick(options);
  }

  private ready(id: string): boolean {
    const until = this.cooldowns.get(id) ?? 0;
    return this.history[this.history.length - 1]!.frame >= until;
  }

  /** Turns a list of attack ids into timed inputs, including motion inputs and stance. */
  private attackPlan(intent: AIIntent, ids: string[]): AIPlan {
    const steps: PlanStep[] = [];
    const fwd = this.me.facing;
    const back = (-fwd) as -1 | 1;
    const now = this.history[this.history.length - 1]!.frame;
    for (const id of ids) {
      const a = this.me.config.attacks[id];
      if (!a) continue;
      const stance = a.input.stance ?? 'stand';
      const y: -1 | 0 | 1 = stance === 'crouch' ? -1 : 0;
      if (a.input.twoButton) {
        steps.push({ input: makeInput(0, 0, Btn.SP1 | Btn.SP2, Btn.SP1 | Btn.SP2), frames: 2 });
      } else if (a.input.motion === 'ff') {
        steps.push({ input: makeInput(fwd, 0), frames: 3 });
        steps.push({ input: makeInput(0, 0), frames: 2 });
        steps.push({ input: makeInput(fwd, 0, a.input.button, a.input.button), frames: 2 });
      } else if (a.input.motion === 'df') {
        steps.push({ input: makeInput(0, -1), frames: 3 });
        steps.push({ input: makeInput(fwd, -1), frames: 2 });
        steps.push({ input: makeInput(fwd, 0, a.input.button, a.input.button), frames: 2 });
      } else if (a.input.motion === 'db') {
        steps.push({ input: makeInput(0, -1), frames: 3 });
        steps.push({ input: makeInput(back, -1), frames: 2 });
        steps.push({ input: makeInput(back, 0, a.input.button, a.input.button), frames: 2 });
      } else {
        steps.push({ input: makeInput(0, y, a.input.button, a.input.button), frames: 2 });
      }
      // Wait until the move can be cancelled (just after active frames begin), then queue the next press.
      const wait = Math.max(2, a.startup + Math.max(1, a.active - 1));
      steps.push({ input: makeInput(0, y), frames: wait });
      if (a.category === 'special' || a.category === 'super') {
        const base = a.category === 'super' ? 120 : Math.round(90 * (2 - this.profile.specialChance * 2)) + this.rng.int(0, 60);
        this.cooldowns.set(id, now + base);
      }
    }
    // Small recovery pause so the AI does not mash immediately after a string.
    steps.push({ input: makeInput(0, 0), frames: this.rng.int(4, 10) });
    return new AIPlan(intent, steps, false);
  }
}

const attackReach = (a: AttackData): number => {
  let reach = 0;
  for (const b of a.hitboxes) reach = Math.max(reach, b.x + b.w / 2);
  if (a.movement) {
    const mv = (a.movement.startup ?? 0) * a.startup + (a.movement.active ?? 0) * a.active;
    reach += mv;
  }
  if (a.grab) reach = Math.max(reach, a.grab.range);
  if (a.teleport) reach += a.teleport.distance ?? 400;
  return reach;
};
