import { FighterState, type MoveDef, type MotionDir } from '../combat/types';
import type { Fighter } from '../characters/Fighter';
import type { FightSim } from '../game/FightSim';
import { mulberry32 } from '../game/rng';
import { BUTTON_BIT, Btn, type InputFrame, type InputSource } from '../input/InputFrame';
import { METER_MAX, TECH_WINDOW } from '../data/constants';
import { AIStateMachine, type AIWeights } from './AIStateMachine';
import { PROFILES, type AIProfile, type Difficulty } from './Difficulty';

interface Observation {
  enemyState: FighterState;
  enemyMove: MoveDef | null;
  enemyMoveFrame: number;
  enemyAirborne: boolean;
  enemyCrouching: boolean;
  dist: number;
  projectileDx: number | null;
  projectileLow: boolean;
}

interface MoveInfo {
  move: MoveDef;
  reach: number;
  startup: number;
  recovery: number;
  damage: number;
  low: boolean;
  high: boolean;
}

export type DummyMode = 'ai' | 'stand' | 'crouch' | 'block' | 'jump';

const DIR_RAW = (d: MotionDir, facing: 1 | -1): number => {
  switch (d) {
    case 'FWD': return facing === 1 ? Btn.RIGHT : Btn.LEFT;
    case 'BACK': return facing === 1 ? Btn.LEFT : Btn.RIGHT;
    case 'UP': return Btn.UP;
    case 'DOWN': return Btn.DOWN;
  }
};

/**
 * Plays the game through the same InputFrame interface as a human. It only reads information a player
 * could see on screen, delayed by a difficulty-dependent reaction time.
 */
export class AIController implements InputSource {
  readonly fsm = new AIStateMachine();
  profile: AIProfile;
  mode: DummyMode = 'ai';
  enabled = true;
  intent = 'idle';

  private readonly rng: () => number;
  private readonly history: Observation[] = [];
  private script: InputFrame[] = [];
  private moveDir = 0;
  private moveFrames = 0;
  private blockFrames = 0;
  private blockLow = false;
  private thinkTimer = 0;
  private plan: string[] = [];
  private planIdx = 0;
  private infos: MoveInfo[];
  private enemyBlocks = 0;
  private enemySamples = 1;
  private idealDist: number;
  private zoner: boolean;
  private aggressionBoost = 1;

  constructor(private readonly sim: FightSim, private readonly slot: number, difficulty: Difficulty, seed = 1234) {
    this.profile = { ...PROFILES[difficulty] };
    this.rng = mulberry32(seed + slot * 77);
    const me = sim.fighters[slot];
    this.infos = this.buildInfos(me);
    const pokes = this.infos.filter((i) => i.move.kind === 'normal' && i.move.stance === 'stand');
    const best = pokes.reduce((a, b) => (b.reach > a.reach ? b : a), pokes[0]);
    this.idealDist = (best?.reach ?? 100) + 20;
    const hasProjectile = this.infos.some((i) => i.move.projectile);
    this.zoner = hasProjectile && me.def.aiBias.zoning >= 0.35;
  }

  setDifficulty(d: Difficulty): void {
    this.profile = { ...PROFILES[d] };
  }

  private buildInfos(me: Fighter): MoveInfo[] {
    const out: MoveInfo[] = [];
    for (const m of Object.values(me.def.moves)) {
      if (m.chainOnly && m.kind !== 'normal') continue;
      let reach = 0;
      for (const b of m.hitboxes) reach = Math.max(reach, b.x + b.w);
      if (m.projectile) reach = 700;
      if (m.grab) reach = m.grab.range;
      if (m.lunge) for (const l of m.lunge) reach += Math.max(0, l.vx) * Math.max(0, Math.min(l.to, m.attack.startup + m.attack.active) - l.from);
      if (m.teleport) reach = Math.max(reach, 380);
      if (m.kind === 'super') reach = 400;
      if (m.counter) reach = 0;
      out.push({
        move: m,
        reach,
        startup: m.attack.startup,
        recovery: m.attack.recovery,
        damage: m.projectile?.damage ?? m.attack.damage,
        low: m.attack.hitLevel === 'low',
        high: m.attack.hitLevel === 'high',
      });
    }
    return out;
  }

  private observe(me: Fighter, en: Fighter): void {
    const proj = this.sim.projectiles.find((p) => p.owner !== this.slot);
    this.history.push({
      enemyState: en.state,
      enemyMove: en.move,
      enemyMoveFrame: en.curFrame,
      enemyAirborne: en.airborne,
      enemyCrouching: en.isCrouching,
      dist: Math.abs(en.x - me.x),
      projectileDx: proj ? (proj.x - me.x) * me.facing : null,
      projectileLow: proj ? proj.attack.hitLevel === 'low' : false,
    });
    if (this.history.length > 40) this.history.shift();
    if (en.state === FighterState.BLOCK) this.enemyBlocks++;
    this.enemySamples++;
  }

  private delayed(): Observation {
    const idx = Math.max(0, this.history.length - 1 - this.profile.reactionFrames);
    return this.history[idx];
  }

  poll(): InputFrame {
    const me = this.sim.fighters[this.slot];
    const en = this.sim.fighters[1 - this.slot];
    this.observe(me, en);
    if (!this.enabled) return 0;
    if (this.mode !== 'ai') return this.dummy(me);
    if (me.def.boss && me.phase >= 2) this.aggressionBoost = me.def.phase2?.aggression ?? 1.4;

    // break out of throws
    if (me.state === FighterState.HIT && me.grabbedBy && me.grabbedBy.throwFrame <= TECH_WINDOW) {
      if (this.rng() < this.profile.tech * 0.25 && me.grabbedBy.throwData?.techable) return Btn.GRAB;
    }

    if (this.script.length > 0) return this.script.shift() ?? 0;

    if (me.isAttacking && me.move) return this.continueChain(me);
    this.plan = [];

    if (!me.isFree || me.landLag > 0) return 0;

    const reaction = this.react(me, en);
    if (reaction !== null) return reaction;

    if (this.blockFrames > 0) {
      this.blockFrames--;
      return Btn.BLOCK | (this.blockLow ? Btn.DOWN : 0);
    }

    this.thinkTimer--;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.profile.thinkInterval + Math.floor(this.rng() * 4);
      const act = this.decide(me, en);
      if (act !== null) return act;
    }
    return this.movement(me, en);
  }

  private dummy(me: Fighter): InputFrame {
    switch (this.mode) {
      case 'crouch': return Btn.DOWN;
      case 'block': return Btn.BLOCK;
      case 'jump': return me.state === FighterState.JUMP ? 0 : Btn.UP;
      default: return 0;
    }
  }

  /** Reads what the opponent is doing (with delay) and decides to block, tech or anti-air. */
  private react(me: Fighter, en: Fighter): InputFrame | null {
    const o = this.delayed();
    const p = this.profile;
    const dist = Math.abs(en.x - me.x);

    // incoming projectile
    if (o.projectileDx !== null && o.projectileDx > 0 && o.projectileDx < 260 && me.isFree) {
      if (this.rng() < p.blockChance * 0.6) {
        this.blockFrames = 14;
        this.blockLow = o.projectileLow;
        return Btn.BLOCK | (o.projectileLow ? Btn.DOWN : 0);
      }
      if (this.rng() < 0.25 * p.aggression + 0.1) return this.pressMove(this.findMove((m) => m.stance === 'air' && m.button === 'lk'), true) ?? Btn.UP | (me.facing === 1 ? Btn.RIGHT : Btn.LEFT);
    }

    const move = o.enemyMove;
    const attacking = move && (o.enemyState === FighterState.ATTACK || o.enemyState === FighterState.SPECIAL);
    if (attacking && move && dist < this.threatRange(move, en) + 40) {
      const a = move.attack;
      const untilActive = a.startup - o.enemyMoveFrame - 1;
      const active = o.enemyMoveFrame >= a.startup && o.enemyMoveFrame < a.startup + a.active;
      if ((untilActive <= 10 && untilActive > -1) || active) {
        const wantBlock = this.rng() < p.blockChance * (this.enemySamples > 60 ? 1 : 0.8);
        if (wantBlock && !move.noBlock) {
          const low = a.hitLevel === 'low';
          // perfect block: only start pressing in the final frames of startup
          if (untilActive > 5 && this.rng() < p.perfectBlock) return null;
          this.blockFrames = Math.max(6, a.active + 4);
          this.blockLow = low;
          return Btn.BLOCK | (low ? Btn.DOWN : 0);
        }
      }
    }
    if (move?.grab && o.enemyState === FighterState.GRAB && dist < move.grab.range + 40 && this.rng() < p.blockChance * 0.5) {
      return me.facing === 1 ? Btn.UP | Btn.RIGHT : Btn.UP | Btn.LEFT;
    }

    // anti-air
    if (o.enemyAirborne && o.enemyState === FighterState.JUMP && dist < 230 && this.rng() < p.antiAir * 0.35) {
      const aa = this.findMove((m) => m.kind === 'special' && m.id.length > 0 && m.invuln !== undefined && m.launch !== undefined && m.projectile === undefined && !m.grab && !m.teleport && m.lunge?.[0]?.vy !== undefined);
      if (aa && me.canUse(aa)) return this.pressMove(aa, true);
      const upper = me.def.moves.crouchHP;
      if (upper) return this.pressMove(upper, true);
    }
    return null;
  }

  private threatRange(move: MoveDef, en: Fighter): number {
    let r = 0;
    for (const b of move.hitboxes) r = Math.max(r, b.x + b.w);
    if (move.lunge) for (const l of move.lunge) r += Math.max(0, l.vx) * Math.max(0, l.to - l.from);
    if (move.projectile) r = 600;
    if (move.teleport) r = 600;
    if (move.kind === 'super') r = 600;
    return r + en.def.pushWidth * 0.3;
  }

  private findMove(pred: (m: MoveDef) => boolean): MoveDef | undefined {
    const me = this.sim.fighters[this.slot];
    return Object.values(me.def.moves).find(pred);
  }

  /** Frames that perform `m` through the normal input path. */
  private pressMove(m: MoveDef | undefined, queue: boolean): InputFrame | null {
    if (!m) return null;
    const me = this.sim.fighters[this.slot];
    const frames: InputFrame[] = [];
    if (m.superInput) {
      frames.push(Btn.SP1 | Btn.SP2);
    } else if (m.kind === 'grab' && !m.command) {
      frames.push(Btn.GRAB);
    } else if (m.command) {
      const seq = m.command.seq;
      const btn = BUTTON_BIT[m.command.button];
      let prev = 0;
      seq.forEach((d, i) => {
        const raw = DIR_RAW(d, me.facing);
        if (i > 0 && prev === raw && !(raw & Btn.DOWN)) frames.push(0);
        const isLast = i === seq.length - 1;
        const hold = d === 'FWD' && seq[i - 1] === 'DOWN' ? Btn.DOWN : 0;
        frames.push(raw | hold | (isLast ? btn : 0));
        prev = raw;
      });
      if (frames.length === seq.length && seq.every((d) => d === 'DOWN')) frames.push(btn);
    } else if (m.button) {
      const stance = m.stance === 'crouch' ? Btn.DOWN : 0;
      frames.push(stance | BUTTON_BIT[m.button]);
    }
    if (m.stance === 'air' && m.button) {
      // air normal needs a jump first
      const dir = me.facing === 1 ? Btn.RIGHT : Btn.LEFT;
      this.script = [Btn.UP | dir, dir, dir, dir, dir, dir, dir, dir, dir | BUTTON_BIT[m.button]];
      return this.script.shift() ?? 0;
    }
    if (frames.length === 0) return null;
    if (queue) this.script = frames.slice(1);
    return frames[0];
  }

  private chooseMovesFor(dist: number, me: Fighter, en: Fighter): MoveInfo[] {
    const half = en.def.pushWidth * 0.45;
    return this.infos.filter((i) => {
      const m = i.move;
      if (m.chainOnly || m.stance === 'air' || m.counter || m.kind === 'super') return false;
      if (!me.canUse(m)) return false;
      if (m.kind === 'normal' && m.id === 'grab') return false;
      return i.reach + half >= dist - 8;
    });
  }

  private decide(me: Fighter, en: Fighter): InputFrame | null {
    const p = this.profile;
    const dist = Math.abs(en.x - me.x);
    const enemyAttackingNow = en.isAttacking;
    const stateIn = {
      dist, idealDist: this.idealDist,
      enemyAttacking: enemyAttackingNow,
      enemyBlocking: en.state === FighterState.BLOCK,
      enemyAirborne: en.airborne,
      enemyStunned: en.inStun || en.state === FighterState.KNOCKDOWN,
      ownStunned: me.inStun,
      ownHpRatio: me.hp / me.maxHp,
      enemyHpRatio: en.hp / en.maxHp,
      projectileThreat: this.history[this.history.length - 1]?.projectileDx !== null,
      zoner: this.zoner,
      ownMeterFull: me.meter >= METER_MAX,
    };
    const aggr = Math.min(1, p.aggression * this.aggressionBoost);
    this.fsm.update(stateIn, aggr);
    const w = this.fsm.weights(stateIn, aggr);

    if (this.rng() < p.hesitation) {
      this.setMovement(0, 8 + Math.floor(this.rng() * 10));
      this.intent = 'hesitate';
      return null;
    }

    // punish: enemy in recovery of a move and we can reach
    const o = this.delayed();
    if (o.enemyMove && (o.enemyState === FighterState.ATTACK || o.enemyState === FighterState.SPECIAL)) {
      const a = o.enemyMove.attack;
      const recoveryLeft = a.startup + a.active + a.recovery - o.enemyMoveFrame - p.reactionFrames;
      if (o.enemyMoveFrame >= a.startup + a.active && recoveryLeft > 6 && this.rng() < p.punish) {
        const options = this.chooseMovesFor(dist, me, en).filter((i) => i.startup + 2 < recoveryLeft);
        const best = options.sort((a2, b2) => b2.damage - a2.damage)[0];
        if (best) {
          this.intent = 'punish';
          return this.beginAttack(best.move, me, en, true);
        }
      }
    }

    // super when ready
    if (p.useSuper && me.meter >= METER_MAX && dist < 380 && this.rng() < 0.35) {
      const sup = me.def.moves[this.infos.find((i) => i.move.kind === 'super')?.move.id ?? ''];
      if (sup && me.canUse(sup) && (en.inStun || dist < 260)) {
        this.intent = 'super';
        return this.pressMove(sup, true);
      }
    }

    const total = w.approach + w.retreat + w.attack + w.block + w.jump + w.special + w.grab;
    let r = this.rng() * total;
    const pick = (k: keyof AIWeights): boolean => {
      r -= w[k];
      return r <= 0;
    };
    if (pick('attack')) return this.doAttack(me, en, dist);
    if (pick('special')) return this.doSpecial(me, en, dist);
    if (pick('grab')) return this.doGrab(me, en, dist);
    if (pick('block')) {
      this.blockFrames = 10 + Math.floor(this.rng() * 14);
      this.blockLow = this.rng() < 0.3;
      this.intent = 'block';
      return null;
    }
    if (pick('jump')) {
      const dir = this.rng() < 0.7 ? me.facing : -me.facing;
      this.script = [dir === 1 ? Btn.RIGHT : Btn.LEFT, dir === 1 ? Btn.RIGHT : Btn.LEFT];
      this.intent = 'jump';
      return Btn.UP | (dir === 1 ? Btn.RIGHT : Btn.LEFT);
    }
    if (pick('retreat')) {
      this.setMovement(-1, 10 + Math.floor(this.rng() * 18));
      this.intent = 'retreat';
      return null;
    }
    this.setMovement(1, 10 + Math.floor(this.rng() * 18));
    this.intent = 'approach';
    return null;
  }

  private doAttack(me: Fighter, en: Fighter, dist: number): InputFrame | null {
    const p = this.profile;
    let options = this.chooseMovesFor(dist, me, en).filter((i) => i.move.kind === 'normal');
    if (en.isCrouching) options = options.filter((i) => !i.high);
    if (options.length === 0) {
      this.setMovement(1, 8);
      this.intent = 'close-in';
      return null;
    }
    let choice: MoveInfo;
    if (p.spacing > 0.7) {
      options.sort((a, b) => b.damage / (b.startup + b.recovery * 0.5) - a.damage / (a.startup + a.recovery * 0.5));
      choice = options[Math.floor(this.rng() * Math.min(2, options.length))];
    } else {
      choice = options[Math.floor(this.rng() * options.length)];
    }
    this.intent = 'attack';
    return this.beginAttack(choice.move, me, en, false);
  }

  private doSpecial(me: Fighter, en: Fighter, dist: number): InputFrame | null {
    const specials = this.chooseMovesFor(dist, me, en).filter((i) => i.move.kind === 'special' && !i.move.grab);
    if (specials.length === 0) {
      this.setMovement(this.zoner ? -1 : 1, 10);
      return null;
    }
    if (this.rng() > this.profile.specialChance + 0.35) return this.doAttack(me, en, dist);
    // prefer projectiles at range, lunges at mid range
    const proj = specials.filter((s) => s.move.projectile);
    const pool = dist > 300 && proj.length > 0 ? proj : specials.filter((s) => !s.move.projectile || dist > 220);
    const list = pool.length > 0 ? pool : specials;
    const choice = list[Math.floor(this.rng() * list.length)];
    this.intent = 'special';
    return this.beginAttack(choice.move, me, en, false);
  }

  private doGrab(me: Fighter, en: Fighter, dist: number): InputFrame | null {
    const grabs = this.infos.filter((i) => i.move.grab && me.canUse(i.move) && dist < i.reach + 30);
    if (grabs.length === 0) return this.doAttack(me, en, dist);
    const g = grabs[Math.floor(this.rng() * grabs.length)];
    this.intent = 'grab';
    return this.pressMove(g.move, true);
  }

  /** Starts a move and sets up a follow-up chain according to difficulty. */
  private beginAttack(m: MoveDef, me: Fighter, en: Fighter, punish: boolean): InputFrame | null {
    this.plan = [];
    this.planIdx = 0;
    if (m.kind === 'normal' && this.rng() < this.profile.comboChance) {
      this.plan = this.buildRoute(m, me, punish);
    } else if (m.attack.cancelInto && m.attack.cancelInto.length > 0 && this.rng() < this.profile.comboChance * 0.5) {
      this.plan = this.buildRoute(m, me, punish);
    }
    void en;
    return this.pressMove(m, true);
  }

  private buildRoute(start: MoveDef, me: Fighter, punish: boolean): string[] {
    const route: string[] = [];
    let cur: MoveDef | undefined = start;
    const maxLen = punish ? this.profile.comboLength : Math.max(1, Math.min(this.profile.comboLength, 1 + Math.floor(this.rng() * this.profile.comboLength)));
    for (let step = 0; step < maxLen && cur; step++) {
      const options: string[] = (cur.attack.cancelInto ?? []).filter((id) => {
        const t = me.def.moves[id];
        return !!t && !t.grab && !t.counter && (t.kind !== 'super' || (this.profile.useSuper && me.meter >= METER_MAX));
      });
      if (options.length === 0) break;
      // prefer ending in a special on strong profiles
      const specials = options.filter((id) => me.def.moves[id].kind !== 'normal');
      const normals = options.filter((id) => me.def.moves[id].kind === 'normal');
      let nextId: string;
      if (step >= maxLen - 1 && specials.length > 0 && this.rng() < this.profile.specialChance + 0.3) {
        nextId = specials[Math.floor(this.rng() * specials.length)];
      } else if (normals.length > 0) {
        nextId = normals[Math.floor(this.rng() * normals.length)];
      } else {
        nextId = options[Math.floor(this.rng() * options.length)];
      }
      route.push(nextId);
      cur = me.def.moves[nextId];
      if (cur.kind !== 'normal') break;
    }
    return route;
  }

  private continueChain(me: Fighter): InputFrame {
    const m = me.move;
    if (!m) return 0;
    // stay in place while attacking, except for forward pressure on lunges
    if (this.plan.length > this.planIdx && me.moveConnected !== 'none' && me.moveFrame >= m.attack.startup) {
      const nextId = this.plan[this.planIdx];
      const next = me.def.moves[nextId];
      if (next && m.attack.cancelInto?.includes(nextId) && me.canUse(next)) {
        this.planIdx++;
        const f = this.pressMove(next, true);
        if (f !== null) return f;
      }
    }
    if (this.plan.length > this.planIdx && me.moveConnected === 'block' && this.rng() < 0.4) {
      this.plan = [];
    }
    return 0;
  }

  private setMovement(dir: number, frames: number): void {
    this.moveDir = dir;
    this.moveFrames = frames;
  }

  private movement(me: Fighter, en: Fighter): InputFrame {
    const dist = Math.abs(en.x - me.x);
    const toward = en.x > me.x ? Btn.RIGHT : Btn.LEFT;
    const away = toward === Btn.RIGHT ? Btn.LEFT : Btn.RIGHT;
    const p = this.profile;
    if (this.moveFrames > 0) {
      this.moveFrames--;
      // spacing skill: stop approaching once at ideal distance
      if (this.moveDir > 0 && dist < this.idealDist && p.spacing > 0.4) {
        this.moveFrames = 0;
        return 0;
      }
      if (this.moveDir < 0 && Math.abs(me.x) > this.sim.stageHalf - 120) {
        this.moveFrames = 0;
        return toward;
      }
      return this.moveDir > 0 ? toward : this.moveDir < 0 ? away : 0;
    }
    if (dist > this.idealDist + 40 && this.rng() < 0.7 * (p.aggression + 0.3)) return toward;
    return 0;
  }
}
