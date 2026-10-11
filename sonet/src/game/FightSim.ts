import { FighterState, type CharacterDef, type FinisherDef, type GameEvent, type GameEventType } from '../combat/types';
import { CombatSystem, type CombatWorld } from '../combat/CombatSystem';
import { ComboSystem, type ComboEnd } from '../combat/ComboSystem';
import { createProjectile, type Projectile } from '../combat/Projectile';
import { Fighter, type FighterCtx } from '../characters/Fighter';
import {
  FIGHTER_START_X, HITSTOP_HEAVY, HITSTOP_SPECIAL, METER_MAX, METER_ON_DEAL, METER_ON_TAKE, STAGE_HALF_WIDTH,
} from '../data/constants';
import { BUTTON_BIT, DIR_BIT, type InputFrame } from '../input/InputFrame';
import { RoundManager, DEFAULT_ROUND_CONFIG, type RoundConfig, type RoundEvent } from './RoundManager';
import type { FighterSnapshot, GameState } from './GameState';

export type SimMode = 'arcade' | 'versus' | 'training';

export interface FighterSetup {
  def: CharacterDef;
  skin: string;
}

export interface SimConfig {
  p1: FighterSetup;
  p2: FighterSetup;
  mode: SimMode;
  humanSlots: number[];
  bossFight: boolean;
  finishers: boolean;
  round?: Partial<RoundConfig>;
}

export interface FinisherRun {
  def: FinisherDef;
  winner: number;
  loser: number;
  frame: number;
}

export interface MatchStats {
  damage: [number, number];
  hits: [number, number];
}

export class FightSim {
  readonly fighters: [Fighter, Fighter];
  readonly projectiles: Projectile[] = [];
  readonly combo = new ComboSystem();
  readonly rounds: RoundManager;
  readonly events: GameEvent[] = [];
  readonly comboEnds: ComboEnd[] = [];
  readonly stats: MatchStats = { damage: [0, 0], hits: [0, 0] };
  readonly stageHalf = STAGE_HALF_WIDTH;
  frame = 0;
  hitstop = 0;
  finisher: FinisherRun | null = null;
  bossPhase2 = false;
  infiniteMeter: [boolean, boolean] = [false, false];
  private readonly combat = new CombatSystem();
  private readonly ctxs: [FighterCtx, FighterCtx];
  private wallCooldown = [0, 0];
  readonly config: SimConfig;

  constructor(config: SimConfig) {
    this.config = config;
    this.fighters = [new Fighter(0, config.p1.def, config.p1.skin), new Fighter(1, config.p2.def, config.p2.skin)];
    for (const f of this.fighters) {
      f.phase = f.def.phase2 && !config.bossFight ? 2 : 1;
    }
    const training = config.mode === 'training';
    const roundCfg: RoundConfig = {
      ...DEFAULT_ROUND_CONFIG,
      training,
      timed: !training,
      finisherEligible: (winner) => config.finishers && config.humanSlots.includes(winner),
      ...config.round,
    };
    this.rounds = new RoundManager(roundCfg);
    const emit = this.emit.bind(this);
    const spawn = this.spawnProjectile.bind(this);
    this.ctxs = [
      { opponent: this.fighters[1], emit, spawnProjectile: spawn, stageHalf: this.stageHalf },
      { opponent: this.fighters[0], emit, spawnProjectile: spawn, stageHalf: this.stageHalf },
    ];
    this.placeFighters();
  }

  ctxFor(f: Fighter): FighterCtx {
    return this.ctxs[f.slot];
  }

  private placeFighters(): void {
    this.fighters[0].resetForRound(-FIGHTER_START_X, 1);
    this.fighters[1].resetForRound(FIGHTER_START_X, -1);
  }

  resetRound(): void {
    this.placeFighters();
    this.projectiles.length = 0;
    this.combo.reset();
    this.finisher = null;
    this.hitstop = 0;
    for (const f of this.fighters) f.meter = Math.max(f.meter * 0.5, 0);
  }

  /** Training / dev: put everything back to a neutral start without touching round state. */
  resetPositions(): void {
    const meters = this.fighters.map((f) => f.meter);
    this.placeFighters();
    this.projectiles.length = 0;
    this.combo.reset();
    this.hitstop = 0;
    this.fighters.forEach((f, i) => (f.meter = meters[i]));
  }

  restartMatch(): void {
    this.rounds.wins = [0, 0];
    this.rounds.round = 1;
    this.rounds.matchWinner = null;
    this.rounds.finalRound = false;
    this.rounds.roundWinner = null;
    this.rounds.timerFrames = this.rounds.cfg.roundTime * 60;
    this.rounds.phase = this.rounds.cfg.training ? 'fight' : 'round-announce';
    this.rounds.phaseFrame = 0;
    this.rounds.finisherStage = 'none';
    this.resetRound();
    for (const f of this.fighters) f.meter = 0;
    this.bossPhase2 = false;
    this.fighters.forEach((f) => (f.phase = f.def.phase2 && !this.config.bossFight ? 2 : 1));
    if (!this.rounds.cfg.training) this.rounds.events.push({ type: 'round-announce', round: 1 });
  }

  addHitstop(frames: number): void {
    if (frames > this.hitstop) this.hitstop = frames;
  }

  emit(type: GameEventType, f: Fighter, strength: GameEvent['strength'], extra: Partial<GameEvent> = {}): void {
    const ev: GameEvent = {
      type,
      x: extra.x ?? f.x,
      y: extra.y ?? f.y + f.def.height * 0.5,
      slot: f.slot,
      strength,
      facing: extra.facing ?? f.facing,
      ...extra,
    };
    this.events.push(ev);
    if (type === 'hit') {
      const v = ev.victim ?? 1 - f.slot;
      this.stats.damage[f.slot] += ev.damage ?? 0;
      this.stats.hits[f.slot] += 1;
      void v;
    }
    if (type === 'throw-hit') this.onThrowHit(ev, f);
  }

  private onThrowHit(ev: GameEvent, attacker: Fighter): void {
    const victim = this.fighters[1 - attacker.slot];
    const dmg = ev.damage ?? 0;
    this.combo.breakCombo(victim.slot);
    this.combo.register(attacker.slot, dmg);
    this.stats.damage[attacker.slot] += dmg;
    this.stats.hits[attacker.slot] += 1;
    attacker.meter = Math.min(METER_MAX, attacker.meter + dmg * METER_ON_DEAL);
    victim.meter = Math.min(METER_MAX, victim.meter + dmg * METER_ON_TAKE);
    this.addHitstop(ev.moveId === 'slam' ? HITSTOP_SPECIAL : HITSTOP_HEAVY);
    if (victim.hp <= 0) this.events.push({ ...ev, type: 'ko', damage: dmg });
  }

  private spawnProjectile(owner: Fighter, move: NonNullable<Fighter['move']>): void {
    if (!move.projectile) return;
    this.projectiles.push(createProjectile(owner.slot, owner.x, owner.y, owner.facing, move, move.projectile));
  }

  get worldCtx(): CombatWorld {
    return this as unknown as CombatWorld;
  }

  onComboEnd(end: ComboEnd): void {
    this.comboEnds.push(end);
  }

  /** Whether fighters accept player input this tick. */
  private inputsLive(): boolean {
    const p = this.rounds.phase;
    if (p === 'fight') return true;
    if (p === 'round-announce') return this.rounds.fightLive;
    return false;
  }

  step(inputs: [InputFrame, InputFrame]): void {
    this.events.length = 0;
    this.comboEnds.length = 0;
    this.rounds.events.length = 0;
    this.frame++;

    if (this.hitstop > 0) {
      this.hitstop--;
      // buffer keeps filling during hit-stop so short taps and scripted AI frames are never lost
      const liveNow = this.inputsLive();
      this.fighters.forEach((f, i) => f.buffer.push(liveNow ? inputs[i] : 0, f.facing));
      return;
    }

    const live = this.inputsLive();
    const finisherWindow = this.rounds.phase === 'finisher' && this.rounds.finisherStage === 'window';
    const [a, b] = this.fighters;
    const eff: [InputFrame, InputFrame] = [live ? inputs[0] : 0, live ? inputs[1] : 0];

    if (this.rounds.phase === 'finisher') {
      this.stepFinisher(inputs, finisherWindow);
    } else {
      a.update(eff[0], this.ctxs[0]);
      b.update(eff[1], this.ctxs[1]);
    }

    this.physics();
    this.updateProjectiles();
    if (this.rounds.phase !== 'finisher' || !this.finisher) this.combat.resolve(this.worldCtx);
    this.afterCombat();
    this.cheats();

    this.rounds.tick(
      { hp: [a.hp, b.hp], maxHp: [a.maxHp, b.maxHp] },
      { resetRound: () => this.resetRound() },
    );
    this.handleRoundEvents(this.rounds.events);
  }

  private stepFinisher(inputs: [InputFrame, InputFrame], window: boolean): void {
    const w = this.rounds.roundWinner ?? 0;
    const winner = this.fighters[w];
    const loser = this.fighters[1 - w];
    loser.update(0, this.ctxFor(loser));
    if (window) {
      winner.buffer.push(inputs[w], winner.facing);
      winner.input = 0;
      winner.vx = 0;
      winner.stateFrame++;
      winner.animTime++;
      for (const def of winner.def.finishers) {
        if (winner.buffer.pressed(BUTTON_BIT[def.button], 8) && winner.buffer.motion(def.seq.slice())) {
          this.beginFinisher(def, w);
          return;
        }
      }
      void DIR_BIT;
    } else if (this.finisher) {
      this.finisher.frame++;
      winner.animTime++;
      if (this.finisher.frame >= this.finisher.def.duration) this.rounds.endFinisher();
    }
  }

  private beginFinisher(def: FinisherDef, winnerSlot: number): void {
    const winner = this.fighters[winnerSlot];
    const loser = this.fighters[1 - winnerSlot];
    this.finisher = { def, winner: winnerSlot, loser: 1 - winnerSlot, frame: 0 };
    this.rounds.startFinisher();
    winner.x = loser.x - winner.facing * (winner.def.pushWidth * 0.5 + loser.def.pushWidth * 0.5 + 40);
    winner.facing = loser.x >= winner.x ? 1 : -1;
    winner.vx = 0;
  }

  skipFinisher(): void {
    if (this.rounds.phase === 'finisher') this.rounds.skipFinisher();
  }

  private physics(): void {
    const [a, b] = this.fighters;
    a.wallImpact = 0;
    b.wallImpact = 0;
    a.integrate(this.ctxs[0]);
    b.integrate(this.ctxs[1]);
    this.separate(a, b);
    for (let i = 0; i < 2; i++) {
      if (this.wallCooldown[i] > 0) this.wallCooldown[i]--;
      const f = this.fighters[i];
      if (f.wallImpact > 2 && f.inStun && this.wallCooldown[i] === 0) {
        this.wallCooldown[i] = 24;
        const other = this.fighters[1 - i];
        const away = f.x > 0 ? -1 : 1;
        other.vx += away * f.wallImpact * 0.55;
        this.emit('wall', f, f.wallImpact > 7 ? 'heavy' : 'light', { x: f.x + (f.x > 0 ? 30 : -30), y: f.y + 120 });
      }
    }
  }

  private separate(a: Fighter, b: Fighter): void {
    if (a.state === FighterState.THROW || b.state === FighterState.THROW) return;
    const ra = a.pushRect();
    const rb = b.pushRect();
    if (ra.y1 >= rb.y2 || rb.y1 >= ra.y2) return;
    const need = (a.def.pushWidth + b.def.pushWidth) / 2;
    const dx = b.x - a.x;
    const overlap = need - Math.abs(dx);
    if (overlap <= 0) return;
    const dir = dx === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dx);
    const limit = this.stageHalf - 40;
    let pushA = overlap / 2;
    let pushB = overlap / 2;
    if (Math.abs(a.x - dir * pushA) > limit) {
      pushB += pushA - (limit - Math.abs(a.x));
      pushA = limit - Math.abs(a.x);
    }
    if (Math.abs(b.x + dir * pushB) > limit) {
      pushA += pushB - (limit - Math.abs(b.x));
      pushB = limit - Math.abs(b.x);
    }
    a.x -= dir * Math.max(0, pushA);
    b.x += dir * Math.max(0, pushB);
  }

  private updateProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.age++;
      p.life--;
      if (p.life <= 0 || Math.abs(p.x) > this.stageHalf + 150) this.projectiles.splice(i, 1);
    }
  }

  private afterCombat(): void {
    const [a, b] = this.fighters;
    const stunned: [boolean, boolean] = [a.inStun, b.inStun];
    const free: [boolean, boolean] = [a.isFree, b.isFree];
    for (const end of this.combo.update(stunned, free)) {
      const atk = this.fighters[end.slot];
      // a combo only counts as "broken" when the attacker's follow-up whiffed or was blocked
      end.dropped = end.dropped && atk.isAttacking && atk.moveConnected !== 'hit';
      this.onComboEnd(end);
    }
    if (!this.bossPhase2) {
      for (const f of this.fighters) {
        if (f.def.phase2 && this.config.bossFight && f.hp > 0 && f.hp <= f.maxHp * 0.5 && f.phase === 1) {
          f.phase = 2;
          this.bossPhase2 = true;
          this.emit('phase2', f, 'super');
        }
      }
    }
    for (const f of this.fighters) {
      if (f.infiniteHealth && f.isFree && f.hp < f.maxHp) f.hp = f.maxHp;
    }
    for (let i = 0; i < 2; i++) if (this.infiniteMeter[i]) this.fighters[i].meter = METER_MAX;
  }

  private cheats(): void {
    if (this.rounds.cfg.training) {
      for (const f of this.fighters) {
        if (f.hp <= 0 && !f.infiniteHealth) f.hp = f.maxHp;
      }
    }
  }

  private handleRoundEvents(list: RoundEvent[]): void {
    for (const ev of list) {
      if (ev.type === 'ko') {
        const winner = ev.winner ?? -1;
        for (const f of this.fighters) {
          if (f.slot === winner) continue;
          if (f.hp <= 0 || this.rounds.timeUp) {
            if (f.state !== FighterState.DEAD && f.state !== FighterState.HURT) f.setState(FighterState.KNOCKDOWN);
          }
        }
      }
      if (ev.type === 'finisher-window') {
        const loser = this.fighters[1 - (ev.winner ?? 0)];
        loser.kneel = true;
        loser.state = FighterState.DEAD;
        loser.stateFrame = 0;
        loser.vx = 0;
        loser.y = 0;
        loser.vy = 0;
        this.fighters[ev.winner ?? 0].setState(FighterState.IDLE);
      }
      if (ev.type === 'round-end') {
        const w = ev.winner ?? -1;
        if (w >= 0) {
          const winner = this.fighters[w];
          winner.move = null;
          winner.setState(FighterState.VICTORY);
          winner.vx = 0;
        }
      }
    }
  }

  snapshot(): GameState {
    const snap = (f: Fighter): FighterSnapshot => ({
      charId: f.def.id, name: f.def.name, hp: f.hp, maxHp: f.maxHp, meter: f.meter, state: f.state,
      roundWins: this.rounds.wins[f.slot],
    });
    return {
      phase: this.rounds.phase,
      round: this.rounds.round,
      timer: this.rounds.timerSeconds,
      player1: snap(this.fighters[0]),
      player2: snap(this.fighters[1]),
      winner: this.rounds.matchWinner !== null ? this.fighters[this.rounds.matchWinner].def.name : undefined,
    };
  }
}
