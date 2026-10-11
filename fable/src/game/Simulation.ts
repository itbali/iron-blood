import {
  FIGHT_ANNOUNCE_FRAMES,
  FINISHER_FRAMES,
  FINISHER_RANGE,
  FINISHER_WINDOW_FRAMES,
  INTRO_FRAMES,
  KO_FRAMES,
  MAX_ROUNDS,
  METER_MAX,
  METER_ROUND_CARRY,
  PROJECTILE_MAX,
  PUSH_APART_SPEED,
  ROUND_ANNOUNCE_FRAMES,
  ROUND_END_FRAMES,
  STAGE_HALF_WIDTH,
  SUPER_FLASH_FRAMES,
  TICK_RATE,
  BOSS_PHASE2_RATIO,
} from '@/core/constants';
import { Emitter } from '@/core/events';
import { Rng } from '@/core/rng';
import type { PlayerSide } from '@/core/types';
import type { CharacterConfig } from '@/characters/CharacterConfig';
import type { AttackData, ProjectileSpec } from '@/combat/AttackData';
import { CombatSystem } from '@/combat/CombatSystem';
import { ComboSystem } from '@/combat/ComboSystem';
import { Fighter } from '@/combat/Fighter';
import { FighterState, STUN_STATES } from '@/combat/FighterState';
import { boxesOverlap, getPushbox } from '@/combat/HitboxSystem';
import { Projectile } from '@/combat/Projectile';
import type { SimContext, SimEvents } from '@/combat/SimContext';
import { Btn, EMPTY_INPUT, hasButton, type InputFrame } from '@/input/InputFrame';
import type { HudSnapshot, MatchResult, SimPhase } from './GameState';

export interface SimulationOptions {
  seed: number;
  rounds: number;
  timeLimit: number;
  training: boolean;
  finishers: boolean;
  skipIntro?: boolean;
}

const START_X = 330;

const directionOnly = (input: InputFrame): InputFrame => (input.held === 0 && input.pressed === 0 ? input : { x: input.x, y: input.y, held: 0, pressed: 0 });
const INTRO_START_X = 1500;

/**
 * Headless match simulation. Advances exactly one tick per call, using only the provided inputs.
 * No DOM, no timers: deterministic and replayable.
 */
export class Simulation implements SimContext {
  readonly events = new Emitter<SimEvents>();
  readonly rng: Rng;
  readonly fighters: [Fighter, Fighter];
  readonly projectiles: Projectile[] = [];
  readonly combos: ComboSystem;
  readonly combat: CombatSystem;
  readonly options: SimulationOptions;

  frame = 0;
  phase: SimPhase = 'intro';
  phaseFrame = 0;
  round = 1;
  timer: number;
  timerTick = 0;
  hitStop = 0;
  roundWinner: PlayerSide | null = null;
  matchWinner: PlayerSide | null = null;
  draw = false;
  roundResults: (PlayerSide | null)[] = [];
  finisherAvailable = false;
  finisherUsed = false;
  superFlash = 0;
  superFlashFighter: PlayerSide | null = null;
  totalDamage: [number, number] = [0, 0];
  dialogue: { side: PlayerSide; text: string } | null = null;
  private introLines: [string, string];
  private fightFrames = 0;

  constructor(p1: CharacterConfig, p2: CharacterConfig, options: SimulationOptions) {
    this.options = options;
    this.rng = new Rng(options.seed);
    this.fighters = [new Fighter(0, p1), new Fighter(1, p2)];
    this.timer = options.timeLimit;
    this.combos = new ComboSystem(this.events);
    this.combat = new CombatSystem(this.events, this.combos);
    this.combat.setContext(this);
    this.introLines = [this.rng.pick(p1.lines.intro), this.rng.pick(p2.lines.intro)];
    this.fighters[0].resetForRound(-START_X, 1, 0);
    this.fighters[1].resetForRound(START_X, -1, 0);
    if (options.skipIntro) {
      this.enterPhase('round-start');
    } else {
      this.fighters[0].x = -INTRO_START_X;
      this.fighters[1].x = INTRO_START_X;
      this.fighters[0].setState(FighterState.INTRO);
      this.fighters[1].setState(FighterState.INTRO);
      this.enterPhase('intro');
    }
  }

  get p1(): Fighter {
    return this.fighters[0];
  }

  get p2(): Fighter {
    return this.fighters[1];
  }

  get inputsEnabled(): boolean {
    return this.phase === 'fight' || this.phase === 'finisher-window';
  }

  get isOver(): boolean {
    return this.phase === 'match-end';
  }

  spawnProjectile(owner: Fighter, spec: ProjectileSpec, attack: AttackData): void {
    if (this.projectiles.length >= PROJECTILE_MAX) return;
    const spread = spec.count && spec.count > 1 ? (owner.projectileSpawned - (spec.count - 1) / 2) * 3 : 0;
    const p = new Projectile(owner.side, owner.x + spec.offset.x * owner.facing, owner.y + spec.offset.y, owner.facing, spec, attack);
    p.vy += spread;
    this.projectiles.push(p);
    this.events.emit('projectileSpawn', { projectile: p });
  }

  resolveThrowHit(attacker: Fighter, defender: Fighter, attack: AttackData, isLast: boolean): void {
    const before = defender.hp;
    this.combat.resolveThrowHit(attacker, defender, attack, isLast, this.frame);
    this.totalDamage[attacker.side] += before - defender.hp;
    this.hitStop = Math.max(this.hitStop, isLast ? attack.hitStop : 2);
  }

  /** Skips the intro / finisher cinematic when the player presses a button. */
  skipCinematic(): void {
    if (this.phase === 'intro') this.phaseFrame = INTRO_FRAMES;
    else if (this.phase === 'finisher') this.phaseFrame = FINISHER_FRAMES;
    else if (this.phase === 'round-end') this.phaseFrame = Math.max(this.phaseFrame, ROUND_END_FRAMES - 10);
  }

  /** Training helper: puts both fighters back at their start positions. */
  resetPositions(): void {
    const carry = [this.p1.meter, this.p2.meter];
    this.p1.resetForRound(-START_X, 1, carry[0] ?? 0);
    this.p2.resetForRound(START_X, -1, carry[1] ?? 0);
    this.projectiles.length = 0;
    this.combos.reset();
    this.hitStop = 0;
    this.enterPhase('fight');
  }

  tick(inputs: [InputFrame, InputFrame]): void {
    this.frame++;
    this.phaseFrame++;
    if (this.superFlash > 0) this.superFlash--;

    const live = this.inputsEnabled;
    // During the finisher window the winner may only walk; buttons are reserved for the finisher check.
    const window = this.phase === 'finisher-window';
    const in1 = live ? (window ? directionOnly(inputs[0]) : inputs[0]) : EMPTY_INPUT;
    const in2 = live ? (window ? directionOnly(inputs[1]) : inputs[1]) : EMPTY_INPUT;
    this.p1.readInput(in1, this.frame);
    this.p2.readInput(in2, this.frame);

    if (this.hitStop > 0) {
      this.hitStop--;
      this.tickVisualOnly();
      this.updatePhase(inputs);
      return;
    }

    if (this.phase === 'fight' || this.phase === 'finisher-window' || this.phase === 'ko' || this.phase === 'round-end') {
      this.updateFighters();
      this.updateProjectiles();
      this.resolveCombat();
      this.pushApart();
    }

    this.updatePhase(inputs);
  }

  private tickVisualOnly(): void {
    for (const f of this.fighters) {
      if (f.visual.flash > 0) f.visual.flash--;
    }
  }

  private updateFighters(): void {
    const [a, b] = this.fighters;
    const freezeA = this.superFlash > 0 && this.superFlashFighter !== 0;
    const freezeB = this.superFlash > 0 && this.superFlashFighter !== 1;
    if (!freezeA) a.update(b, this);
    if (!freezeB) b.update(a, this);
    for (const f of this.fighters) {
      if (f.currentAttack?.superFreeze && f.attackFrame === 1 && f.isAttacking) {
        this.superFlash = SUPER_FLASH_FRAMES;
        this.superFlashFighter = f.side;
        this.events.emit('superStart', { fighter: f, attack: f.currentAttack });
      }
    }
  }

  private updateProjectiles(): void {
    for (const p of this.projectiles) p.update();
    // Projectile vs projectile: both are destroyed.
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i]!;
      if (!p.alive) continue;
      for (let j = i + 1; j < this.projectiles.length; j++) {
        const q = this.projectiles[j]!;
        if (!q.alive || q.owner === p.owner) continue;
        if (boxesOverlap(p.box, q.box)) {
          p.alive = false;
          q.alive = false;
          this.events.emit('projectileClash', { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
        }
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i]!.alive) this.projectiles.splice(i, 1);
    }
  }

  private resolveCombat(): void {
    if (this.phase !== 'fight') {
      this.combos.update([false, false], [false, false]);
      return;
    }
    const [a, b] = this.fighters;
    const hpBefore: [number, number] = [a.hp, b.hp];
    let stop = 0;
    stop = Math.max(stop, this.combat.resolveMelee(a, b, this.frame));
    stop = Math.max(stop, this.combat.resolveMelee(b, a, this.frame));
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const owner = this.fighters[p.owner];
      const target = this.fighters[(1 - p.owner) as PlayerSide];
      stop = Math.max(stop, this.combat.resolveProjectile(p, owner, target, this.frame));
    }
    if (stop > 0) this.hitStop = Math.max(this.hitStop, stop);
    this.totalDamage[0] += hpBefore[1] - b.hp;
    this.totalDamage[1] += hpBefore[0] - a.hp;

    const inStun = (f: Fighter): boolean => STUN_STATES.has(f.state) || f.state === FighterState.HURT;
    const whiffed = (f: Fighter): boolean => f.isAttacking && f.attackPhase === 'recovery' && !f.attackHit && !f.attackBlocked && f.currentAttack?.category !== 'grab';
    this.combos.update([inStun(b), inStun(a)], [whiffed(a), whiffed(b)]);

    this.checkBossPhase();

    if (a.hp <= 0 || b.hp <= 0) this.onKnockout(a.hp <= 0 ? 0 : 1);
  }

  private checkBossPhase(): void {
    for (const f of this.fighters) {
      const boss = f.config.boss;
      if (!boss || f.phase2) continue;
      if (f.hp <= f.maxHp * (boss.phase2Ratio ?? BOSS_PHASE2_RATIO)) {
        f.phase2 = true;
        f.speedScale = 1.25;
        f.damageBonus = 1.2;
        f.addMeter(METER_MAX);
        this.events.emit('bossPhase2', { fighter: f });
        this.events.emit('slowmo', { ticks: 40, scale: 0.35 });
      }
    }
  }

  /** Keeps the fighters from overlapping: push both apart along x. */
  private pushApart(): void {
    const [a, b] = this.fighters;
    if (a.state === FighterState.GRABBED || b.state === FighterState.GRABBED) return;
    if (a.state === FighterState.THROW || b.state === FighterState.THROW) return;
    if (a.isDown || b.isDown) return;
    const pa = getPushbox(a);
    const pb = getPushbox(b);
    if (!boxesOverlap(pa, pb)) return;
    const overlap = Math.min(pa.right - pb.left, pb.right - pa.left);
    const dir = a.x <= b.x ? 1 : -1;
    // Resolve the full overlap every tick so fighters can never cross, then let walls decide who yields.
    const half = Math.max(PUSH_APART_SPEED, overlap / 2 + 0.5);
    const limit = STAGE_HALF_WIDTH;
    const aLimit = limit - a.config.pushbox.w / 2;
    const bLimit = limit - b.config.pushbox.w / 2;
    const aBlocked = dir > 0 ? a.x - half < -aLimit : a.x + half > aLimit;
    const bBlocked = dir > 0 ? b.x + half > bLimit : b.x - half < -bLimit;
    if (aBlocked) b.x += dir * half * 2;
    else if (bBlocked) a.x -= dir * half * 2;
    else {
      a.x -= dir * half;
      b.x += dir * half;
    }
    a.x = Math.max(-aLimit, Math.min(aLimit, a.x));
    b.x = Math.max(-bLimit, Math.min(bLimit, b.x));
  }

  private onKnockout(loser: PlayerSide): void {
    if (this.phase !== 'fight') return;
    const winner = (1 - loser) as PlayerSide;
    this.roundWinner = winner;
    const loserF = this.fighters[loser];
    loserF.clearAttack();
    if (loserF.state !== FighterState.HURT) {
      loserF.vx = (loserF.x < this.fighters[winner].x ? -1 : 1) * 10;
      loserF.vy = 10;
      loserF.y = Math.max(loserF.y, 0.01);
      loserF.setState(FighterState.HURT);
    }
    this.events.emit('ko', { loser, winner });
    this.events.emit('slowmo', { ticks: 60, scale: 0.3 });
    this.enterPhase('ko');
  }

  private enterPhase(phase: SimPhase): void {
    this.phase = phase;
    this.phaseFrame = 0;
    this.events.emit('phase', { phase, round: this.round });
  }

  private updatePhase(inputs: [InputFrame, InputFrame]): void {
    switch (this.phase) {
      case 'intro':
        this.updateIntro(inputs);
        break;
      case 'round-start':
        if (this.phaseFrame === 1) this.events.emit('announce', { text: `ROUND ${this.round}` });
        if (this.phaseFrame === ROUND_ANNOUNCE_FRAMES) this.events.emit('announce', { text: 'FIGHT' });
        if (this.phaseFrame >= ROUND_ANNOUNCE_FRAMES + FIGHT_ANNOUNCE_FRAMES) this.enterPhase('fight');
        break;
      case 'fight':
        this.updateTimer();
        break;
      case 'ko':
        if (this.phaseFrame >= KO_FRAMES) this.afterKnockout();
        break;
      case 'finisher-window':
        this.updateFinisherWindow(inputs);
        break;
      case 'finisher':
        this.updateFinisher();
        break;
      case 'round-end':
        if (this.phaseFrame >= ROUND_END_FRAMES) this.nextRoundOrEnd();
        break;
      case 'match-end':
        break;
    }
  }

  private updateIntro(inputs: [InputFrame, InputFrame]): void {
    const t = Math.min(1, this.phaseFrame / (INTRO_FRAMES * 0.45));
    const ease = 1 - Math.pow(1 - t, 3);
    this.p1.x = -INTRO_START_X + (INTRO_START_X - START_X) * ease;
    this.p2.x = INTRO_START_X - (INTRO_START_X - START_X) * ease;
    this.p1.facing = 1;
    this.p2.facing = -1;
    if (this.phaseFrame === Math.floor(INTRO_FRAMES * 0.45)) {
      this.dialogue = { side: 0, text: this.introLines[0] };
      this.events.emit('dialogue', this.dialogue);
    }
    if (this.phaseFrame === Math.floor(INTRO_FRAMES * 0.72)) {
      this.dialogue = { side: 1, text: this.introLines[1] };
      this.events.emit('dialogue', this.dialogue);
    }
    const skip = (inputs[0].pressed | inputs[1].pressed) !== 0;
    if (skip && this.phaseFrame > 20) this.phaseFrame = INTRO_FRAMES;
    if (this.phaseFrame >= INTRO_FRAMES) {
      this.dialogue = null;
      this.p1.resetForRound(-START_X, 1, 0);
      this.p2.resetForRound(START_X, -1, 0);
      this.enterPhase('round-start');
    }
  }

  private updateTimer(): void {
    this.fightFrames++;
    if (this.options.training) return;
    this.timerTick++;
    if (this.timerTick >= TICK_RATE) {
      this.timerTick = 0;
      this.timer--;
      if (this.timer <= 0) {
        this.timer = 0;
        this.onTimeout();
      }
    }
  }

  private onTimeout(): void {
    const [a, b] = this.fighters;
    // Compare health ratios so characters with larger pools are not favored at time over.
    const ra = a.hp / a.maxHp;
    const rb = b.hp / b.maxHp;
    const winner: PlayerSide | null = ra > rb ? 0 : rb > ra ? 1 : null;
    this.roundWinner = winner;
    this.events.emit('timeout', { winner });
    this.finishRound(winner);
  }

  private afterKnockout(): void {
    const winner = this.roundWinner;
    if (winner === null) return;
    const loser = (1 - winner) as PlayerSide;
    const decisive = this.fighters[winner].roundsWon + 1 >= this.options.rounds;
    if (decisive && this.options.finishers && !this.options.training) {
      const loserF = this.fighters[loser];
      loserF.y = 0;
      loserF.vx = 0;
      loserF.vy = 0;
      loserF.setState(FighterState.FINISHED);
      loserF.facing = loserF.x < this.fighters[winner].x ? 1 : -1;
      this.finisherAvailable = true;
      this.events.emit('announce', { text: 'END HIM' });
      this.enterPhase('finisher-window');
      return;
    }
    this.finishRound(winner);
  }

  private updateFinisherWindow(inputs: [InputFrame, InputFrame]): void {
    const winner = this.roundWinner;
    if (winner === null) return;
    const w = this.fighters[winner];
    const l = this.fighters[(1 - winner) as PlayerSide];
    const input = inputs[winner];
    const dist = Math.abs(w.x - l.x);
    const facingLoser = (l.x - w.x) * w.facing > 0;
    if (w.isActionable && dist <= FINISHER_RANGE && facingLoser && hasButton(input.pressed, Btn.SP1 | Btn.SP2 | Btn.HP | Btn.HK)) {
      this.startFinisher(winner);
      return;
    }
    if (this.phaseFrame >= FINISHER_WINDOW_FRAMES) {
      this.finisherAvailable = false;
      l.setState(FighterState.DEAD);
      this.events.emit('finisherSkipped', { winner });
      this.finishRound(winner);
    }
  }

  private startFinisher(winner: PlayerSide): void {
    const loser = (1 - winner) as PlayerSide;
    const w = this.fighters[winner];
    const l = this.fighters[loser];
    this.finisherAvailable = false;
    this.finisherUsed = true;
    w.clearAttack();
    w.setState(FighterState.FINISHER);
    w.vx = 0;
    l.setState(FighterState.FINISHED);
    l.vx = 0;
    const gap = w.config.pushbox.w / 2 + l.config.pushbox.w / 2 + 30;
    l.x = w.x + w.facing * gap;
    l.facing = w.facing > 0 ? -1 : 1;
    this.events.emit('finisherStart', { winner, loser, name: w.config.finisher.name });
    this.enterPhase('finisher');
  }

  private updateFinisher(): void {
    const winner = this.roundWinner;
    if (winner === null) return;
    const l = this.fighters[(1 - winner) as PlayerSide];
    if (this.phaseFrame === Math.floor(FINISHER_FRAMES * 0.62)) {
      l.vx = l.facing * -14;
      l.vy = 12;
      l.y = 0.01;
      l.setState(FighterState.HURT);
      l.hp = 0;
      this.hitStop = 12;
      this.events.emit('slowmo', { ticks: 50, scale: 0.25 });
    }
    if (this.phaseFrame >= FINISHER_FRAMES) {
      l.setState(FighterState.DEAD);
      this.finishRound(winner);
    }
  }

  private finishRound(winner: PlayerSide | null): void {
    this.roundResults.push(winner);
    this.roundWinner = winner;
    const [a, b] = this.fighters;
    if (winner !== null) {
      this.fighters[winner].roundsWon++;
      const loser = this.fighters[(1 - winner) as PlayerSide];
      const w = this.fighters[winner];
      if (w.state !== FighterState.FINISHER) {
        w.clearAttack();
        w.setState(FighterState.VICTORY);
      }
      if (loser.hp > 0) {
        loser.clearAttack();
        loser.setState(FighterState.DEFEAT);
      }
    } else {
      for (const f of [a, b]) {
        f.clearAttack();
        f.setState(FighterState.DEFEAT);
      }
    }
    this.projectiles.length = 0;
    this.events.emit('roundEnd', { winner, round: this.round });
    this.enterPhase('round-end');
  }

  private nextRoundOrEnd(): void {
    const [a, b] = this.fighters;
    const needed = this.options.rounds;
    if (a.roundsWon >= needed || b.roundsWon >= needed || this.round >= MAX_ROUNDS) {
      this.matchWinner = a.roundsWon > b.roundsWon ? 0 : b.roundsWon > a.roundsWon ? 1 : null;
      this.draw = this.matchWinner === null;
      const result: MatchResult = {
        winner: this.matchWinner,
        draw: this.draw,
        rounds: [...this.roundResults],
        maxCombo: this.combos.tracks[0].maxHits,
        damageDealt: this.totalDamage[0],
        durationFrames: this.fightFrames,
        finisherUsed: this.finisherUsed,
      };
      this.enterPhase('match-end');
      this.events.emit('matchEnd', { result });
      return;
    }
    this.round++;
    this.timer = this.options.timeLimit;
    this.timerTick = 0;
    this.roundWinner = null;
    this.hitStop = 0;
    this.combos.reset();
    a.resetForRound(-START_X, 1, a.meter * METER_ROUND_CARRY);
    b.resetForRound(START_X, -1, b.meter * METER_ROUND_CARRY);
    this.enterPhase('round-start');
  }

  /** Plain HUD snapshot; cheap enough to call a few times per second. */
  snapshot(): HudSnapshot {
    const [a, b] = this.fighters;
    const announcement = this.announcementText();
    return {
      phase: this.phase,
      phaseFrame: this.phaseFrame,
      round: this.round,
      timer: this.timer,
      timerEnabled: !this.options.training,
      p1: this.fighterSnapshot(a, 0),
      p2: this.fighterSnapshot(b, 1),
      winner: this.roundWinner,
      roundWinner: this.roundWinner,
      matchWinner: this.matchWinner,
      draw: this.draw,
      announcement: announcement.main,
      subtitle: announcement.sub,
      dialogue: this.dialogue ? { speaker: this.fighters[this.dialogue.side].config.name, text: this.dialogue.text, side: this.dialogue.side } : null,
      finisherAvailable: this.finisherAvailable,
      finisherName: this.roundWinner !== null ? this.fighters[this.roundWinner].config.finisher.name : '',
      superReady: [a.meter >= METER_MAX || a.infiniteMeter, b.meter >= METER_MAX || b.infiniteMeter],
    };
  }

  private fighterSnapshot(f: Fighter, side: PlayerSide) {
    const combo = this.combos.tracks[side];
    return {
      id: f.config.id,
      name: f.config.name,
      hp: Math.max(0, f.hp),
      maxHp: f.maxHp,
      meter: f.meter,
      meterMax: METER_MAX,
      roundsWon: f.roundsWon,
      state: f.state,
      comboHits: combo.active ? combo.hits : 0,
      comboDamage: combo.active ? combo.damage : 0,
      maxCombo: combo.maxHits,
      phase2: f.phase2,
    };
  }

  private announcementText(): { main: string; sub: string } {
    switch (this.phase) {
      case 'round-start':
        return this.phaseFrame < ROUND_ANNOUNCE_FRAMES ? { main: `ROUND ${this.round}`, sub: '' } : { main: 'FIGHT', sub: '' };
      case 'ko':
        return { main: 'K.O.', sub: '' };
      case 'finisher-window':
        return { main: 'END HIM', sub: 'MOVE IN AND PRESS SPECIAL' };
      case 'finisher':
        return { main: '', sub: this.roundWinner !== null ? this.fighters[this.roundWinner].config.finisher.name.toUpperCase() : '' };
      case 'round-end': {
        if (this.roundWinner === null) return { main: 'DRAW', sub: 'TIME OVER' };
        const name = this.fighters[this.roundWinner].config.name.toUpperCase();
        const sub = this.timer === 0 ? 'TIME OVER' : this.finisherUsed && this.fighters[this.roundWinner].roundsWon >= this.options.rounds ? 'EXECUTED' : `ROUND ${this.round}`;
        return { main: `${name} WINS`, sub };
      }
      case 'match-end':
        if (this.matchWinner === null) return { main: 'DRAW', sub: '' };
        return { main: `${this.fighters[this.matchWinner].config.name.toUpperCase()} WINS`, sub: 'MATCH' };
      default:
        return { main: '', sub: '' };
    }
  }
}
