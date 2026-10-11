import { AIController } from '../ai/AIController';
import { DummyController } from '../ai/DummyController';
import type { AudioManager } from '../audio/AudioManager';
import type { ThemeId } from '../audio/music';
import type { MoveDef, ProjectileDef } from '../combat/AttackData';
import { CombatSystem } from '../combat/CombatSystem';
import { ComboSystem } from '../combat/ComboSystem';
import { LockSystem } from '../combat/LockSystem';
import { Projectile } from '../combat/Projectile';
import type { FinisherDef } from '../characters/CharacterDef';
import type { FighterContext } from '../characters/Fighter';
import { Fighter } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { MAX_METER, ROUND_METER_CARRY, ROUNDS_TO_WIN, SLOWMO_SCALE, START_OFFSET } from '../core/constants';
import { Rng } from '../core/math';
import { getCharacter } from '../data/characters';
import { getStage } from '../data/stages';
import { DamageNumbers } from '../effects/DamageNumbers';
import { HitEffects } from '../effects/HitEffects';
import { ParticleSystem } from '../effects/ParticleSystem';
import { ScreenFlash } from '../effects/ScreenFlash';
import { ScreenShake } from '../effects/ScreenShake';
import type { InputManager } from '../input/InputManager';
import type { FrameInput } from '../input/InputTypes';
import { ATTACK_BUTTONS, EMPTY_INPUT } from '../input/InputTypes';
import type { Settings } from '../progression/Settings';
import { Camera } from '../render/Camera';
import { FightRenderer } from '../render/FightRenderer';
import type { Stage } from '../render/stages/StageBase';
import { EventPresenter } from './EventPresenter';
import type { GameEvent } from './events';
import type { MatchConfig, MatchResult } from './GameState';
import type { HudStore } from './HudStore';
import { IntroDirector } from './IntroDirector';
import type { MatchSignal } from './MatchController';
import { MatchController } from './MatchController';
import { PhysicsSystem } from './PhysicsSystem';

export interface SessionOptions {
  config: MatchConfig;
  input: InputManager;
  audio: AudioManager;
  hud: HudStore;
  settings: Settings;
  onMatchOver: (result: MatchResult) => void;
  seed?: number;
}

export interface TrainingOptions {
  infiniteHealth: boolean;
  infiniteMeter: boolean;
  aiEnabled: boolean;
}

export interface FrameDataReadout {
  moveId: string;
  startup: number;
  active: number;
  recovery: number;
  advantage: number;
  blocked: boolean;
}

const TRAINING_REFILL_DELAY = 50;
const KO_SLOWMO_MS = 900;
const PHASE2_FREEZE = 50;

/**
 * Owns one match: fighters, combat systems, match flow, AI and presentation.
 * `step()` runs exactly one 60 Hz simulation tick in the order the design doc asks for:
 * INPUT → UPDATE → PHYSICS → COMBAT → AI → ANIMATION → EFFECTS. Rendering is separate.
 */
export class FightSession {
  readonly fighters: [Fighter, Fighter];
  readonly projectiles: Projectile[] = [];
  readonly match: MatchController;
  readonly combo = new ComboSystem();
  readonly locks: LockSystem;
  readonly combat: CombatSystem;
  readonly physics = new PhysicsSystem();
  readonly ai: [AIController | null, AIController | null] = [null, null];
  readonly dummy = new DummyController();
  readonly stage: Stage;

  readonly particles = new ParticleSystem();
  readonly shake = new ScreenShake();
  readonly flash = new ScreenFlash();
  readonly numbers = new DamageNumbers();
  readonly camera: Camera;
  readonly effects: HitEffects;
  readonly renderer = new FightRenderer();
  private readonly presenter: EventPresenter;
  private intro: IntroDirector | null = null;

  frame = 0;
  private events: GameEvent[] = [];
  private hitstop = 0;
  private freeze = 0;
  private slowmoUntil = 0;
  private chromaFrames = 0;
  private danger = 0;
  private aiInputs: [FrameInput, FrameInput] = [EMPTY_INPUT, EMPTY_INPUT];
  /** Presses made during hitstop / super freeze are carried over so they are never lost. */
  private carriedPresses: [number, number] = [0, 0];
  private finisherRunning = false;
  private finisherDone = false;
  private finisherName: string | null = null;
  private idleFrames: [number, number] = [0, 0];
  private matchOverSent = false;
  private rng: Rng;

  debug = false;
  training: TrainingOptions = { infiniteHealth: true, infiniteMeter: false, aiEnabled: false };
  lastFrameData: FrameDataReadout | null = null;
  readonly isTraining: boolean;

  constructor(private readonly opts: SessionOptions) {
    const { config } = opts;
    this.rng = new Rng(opts.seed ?? 1337);
    this.isTraining = config.mode === 'training';
    this.fighters = [new Fighter(getCharacter(config.p1), 0), new Fighter(getCharacter(config.p2), 1)];
    this.fighters[0].skin = config.p1Skin ?? 'default';
    this.fighters[1].skin = config.p2Skin ?? 'default';
    this.locks = new LockSystem(this.combo, (x) => this.physics.clampX(this.fighters[0], x));
    this.combat = new CombatSystem(this.combo, this.locks);
    this.match = new MatchController(config.skipIntro || this.isTraining);
    if (this.isTraining) this.match.timerEnabled = false;
    this.stage = getStage(config.stage).create();
    this.stage.init();
    this.camera = new Camera(this.shake);
    this.effects = new HitEffects(this.particles, this.shake, this.camera, this.flash, this.numbers);
    this.presenter = new EventPresenter(this.fighters, this.effects, opts.audio, opts.hud, this.camera, this.flash, {
      slowmo: (ms) => this.slowmo(ms),
      chroma: (f) => (this.chromaFrames = Math.max(this.chromaFrames, f)),
      onFrameAdvantage: (e) => {
        if (e.attacker === 0 || this.isTraining) this.lastFrameData = { ...e };
      },
    });

    config.controllers.forEach((c, i) => {
      if (c === 'cpu') this.ai[i] = new AIController(config.difficulty, (opts.seed ?? 99) + i * 7919, this.fighters[i]);
    });
    if (this.isTraining) {
      this.ai[1] = new AIController(config.difficulty, 4242, this.fighters[1]);
      this.dummy.mode = 'stand';
    }
    this.applySettings(opts.settings);
    this.initHud();
    this.startMatch();
  }

  // ------------------------------------------------------------------ setup

  applySettings(s: Settings): void {
    this.particles.density = s.graphics.particles;
    this.shake.enabled = s.graphics.screenShake && !s.accessibility.reducedMotion;
    this.shake.scale = s.graphics.shakeIntensity;
    this.flash.enabled = s.accessibility.flashes;
    this.camera.reducedMotion = s.accessibility.reducedMotion;
    this.numbers.enabled = s.accessibility.damageNumbers;
  }

  private initHud(): void {
    const d = this.opts.hud.draft;
    const cfg = this.opts.config;
    this.fighters.forEach((f, i) => {
      d.fighters[i] = {
        name: f.def.name,
        id: f.def.id,
        hp: f.hp,
        maxHp: f.maxHp,
        meter: 0,
        wins: 0,
        superReady: false,
        phase2: false,
        controller: cfg.controllers[i] === 'cpu' ? 'CPU' : cfg.controllers[i] === 'human2' ? 'PLAYER 2' : i === 0 ? 'PLAYER 1' : 'DUMMY',
      };
    });
    d.timer = 99;
    d.timerVisible = !this.isTraining;
    d.round = 1;
    d.roundsToWin = ROUNDS_TO_WIN;
    d.announce = null;
    d.subtitle = null;
    d.combo = [null, null];
    d.callout = null;
    d.finisherHint = null;
    d.bossName = cfg.isBoss ? this.fighters[1].def.name.toUpperCase() : null;
    d.arcadeStage = cfg.arcadeStage ?? null;
    d.maxCombo = [0, 0];
    d.phase = this.match.phase;
  }

  private startMatch(): void {
    this.resetRound(0);
    if (this.match.phase === 'intro') {
      const pick = (f: Fighter) => {
        const lines = f.def.dialogue.introLines;
        return f.index === 0 && f.def.id === 'raven' ? lines[0] : lines[this.rng.int(0, lines.length - 1)];
      };
      this.intro = new IntroDirector(this.fighters, this.camera, this.opts.hud, [pick(this.fighters[0]), pick(this.fighters[1])]);
      this.intro.start();
    }
    this.playMusic(this.opts.config.isBoss ? 'boss' : 'battle');
  }

  private resetRound(meterCarry: number): void {
    this.fighters[0].resetForRound(-START_OFFSET, 1, meterCarry);
    this.fighters[1].resetForRound(START_OFFSET, -1, meterCarry);
    LockSystem.clear(this.fighters[0]);
    LockSystem.clear(this.fighters[1]);
    this.projectiles.length = 0;
    this.combo.reset();
    this.camera.reset(0);
    this.flash.reset();
    this.finisherRunning = false;
    this.finisherDone = false;
    this.danger = 0;
    this.hitstop = 0;
    this.freeze = 0;
    if (this.opts.config.isBoss) this.playMusic('boss');
    const d = this.opts.hud.draft;
    d.combo = [null, null];
    d.finisherHint = null;
    this.applyTrainingFlags();
  }

  private applyTrainingFlags(): void {
    if (!this.isTraining) return;
    for (const f of this.fighters) {
      f.infiniteHealth = this.training.infiniteHealth;
      f.infiniteMeter = this.training.infiniteMeter;
      if (f.infiniteMeter) f.meter = MAX_METER;
    }
  }

  setTraining(t: Partial<TrainingOptions>): void {
    this.training = { ...this.training, ...t };
    this.applyTrainingFlags();
  }

  private playMusic(id: ThemeId): void {
    this.opts.audio.playMusic(id);
  }

  // ------------------------------------------------------------------ time control

  get timeScale(): number {
    return performance.now() < this.slowmoUntil ? SLOWMO_SCALE : 1;
  }

  slowmo(ms: number): void {
    this.slowmoUntil = Math.max(this.slowmoUntil, performance.now() + ms);
  }

  // ------------------------------------------------------------------ simulation

  private fighterCtx(f: Fighter): FighterContext {
    const opponent = this.fighters[1 - f.index];
    const winner = this.match.roundWinner;
    return {
      events: this.events,
      opponent,
      inputEnabled: this.match.inputEnabled && (this.match.phase !== 'finisher' || f.index === winner),
      finisherWindow: this.match.phase === 'finisher' && f.index === winner && !this.finisherRunning && opponent.state === FighterState.DAZED,
      spawnProjectile: (owner, def) => this.spawnProjectile(owner, def),
      requestFreeze: (owner, move) => this.superFreeze(owner, move),
      startFinisher: (attacker, fin) => this.startFinisher(attacker, fin),
      clampX: (x) => this.physics.clampX(f, x),
    };
  }

  private gatherInputs(): [FrameInput, FrameInput] {
    const sampled = this.opts.input.sample();
    const cfg = this.opts.config;
    const out: [FrameInput, FrameInput] = [EMPTY_INPUT, EMPTY_INPUT];
    for (let i = 0; i < 2; i++) {
      const c = cfg.controllers[i];
      if (c === 'human1') out[i] = sampled[0];
      else if (c === 'human2') out[i] = sampled[1];
      else if (this.isTraining && i === 1 && !this.training.aiEnabled) out[i] = this.dummy.update(this.fighters[1]);
      else out[i] = this.aiInputs[i];
    }
    if (this.match.phase === 'intro' && this.intro) {
      const skip = sampled.some((s) => s.pressed & ATTACK_BUTTONS);
      if (skip && this.intro && this.match.phaseFrame > 20) {
        this.match.skip();
        this.intro.finish();
        this.intro = null;
        this.applySignals([{ type: 'phase', phase: 'round-start' }]);
      }
    }
    return out;
  }

  step(): void {
    this.frame++;
    const inputs = this.gatherInputs();
    const frozen = this.freeze > 0 || this.hitstop > 0;
    for (let i = 0; i < 2; i++) {
      if (frozen) {
        this.carriedPresses[i] |= inputs[i].pressed;
      } else if (this.carriedPresses[i]) {
        inputs[i] = { ...inputs[i], pressed: inputs[i].pressed | this.carriedPresses[i], held: inputs[i].held | this.carriedPresses[i] };
        this.carriedPresses[i] = 0;
      }
    }

    if (this.freeze > 0) {
      // Super freeze: everything waits except the presentation.
      this.freeze--;
      if (this.freeze === 0) this.flash.setDarken(this.anyDarkLock() ? 0.55 : 0);
      this.flushPresentation();
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop--;
      this.flushPresentation();
      return;
    }

    const [a, b] = this.fighters;
    // UPDATE
    a.update(inputs[0], this.fighterCtx(a));
    b.update(inputs[1], this.fighterCtx(b));
    // PHYSICS
    this.physics.step(this.fighters, this.events);
    for (const p of this.projectiles) p.update();
    if (this.intro && this.match.phase === 'intro') this.intro.tick(this.match.phaseFrame + 1);
    // COMBAT
    const cctx = { events: this.events, frame: this.frame, addHitstop: (n: number) => (this.hitstop = Math.max(this.hitstop, n)) };
    if (a.lock) this.locks.update(a, this.events);
    if (b.lock) this.locks.update(b, this.events);
    this.combat.resolveFighters(this.fighters, cctx);
    this.combat.resolveProjectiles(this.projectiles, this.fighters, cctx);
    for (let i = this.projectiles.length - 1; i >= 0; i--) if (this.projectiles[i].dead) this.projectiles.splice(i, 1);
    this.combo.update(this.frame, [this.isRecovered(a), this.isRecovered(b)], this.events);
    this.handleWhiffs();
    this.trackFinisher();
    this.checkBossPhase();
    this.checkKO();
    this.trainingUpkeep();
    // MATCH FLOW
    this.applySignals(
      this.match.tick({
        hp: [a.hp, b.hp],
        maxHp: [a.maxHp, b.maxHp],
        finisherRunning: this.finisherRunning,
        finisherDone: this.finisherDone,
      }),
    );
    // AI (decides next frame's input from what it can observe now)
    for (let i = 0; i < 2; i++) {
      const ai = this.ai[i];
      if (!ai) continue;
      const self = this.fighters[i];
      const opp = this.fighters[1 - i];
      ai.observe(opp, this.projectiles);
      this.aiInputs[i] = ai.update(opp, {
        finisherWindow: this.fighterCtx(self).finisherWindow,
        fightActive: this.match.inputEnabled && (!this.isTraining || this.training.aiEnabled || i === 0),
      });
    }
    // EFFECTS
    this.flushPresentation();
  }

  private isRecovered(f: Fighter): boolean {
    return f.isActionable || f.state === FighterState.JUMP || f.state === FighterState.ATTACK || f.state === FighterState.SPECIAL;
  }

  private handleWhiffs(): void {
    for (const e of this.events) {
      if (e.type === 'whiff') this.combo.onFailedFollowUp(e.fighter, this.frame, this.events);
    }
  }

  private flushPresentation(): void {
    if (this.events.length) {
      this.presenter.handle(this.events);
      this.events.length = 0;
    }
    this.syncHud();
  }

  private spawnProjectile(owner: Fighter, def: ProjectileDef): void {
    const target = this.fighters[1 - owner.index];
    const count = def.count ?? 1;
    for (let i = 0; i < count; i++) {
      const offset = count > 1 ? (i - (count - 1) / 2) * (def.spread ?? 20) : 0;
      const p = new Projectile(owner, def, target, offset);
      if (count > 1) p.frame = -i * 4;
      this.projectiles.push(p);
    }
    this.events.push({ type: 'projectile', fighter: owner.index, x: owner.x + def.spawnX * owner.facing * owner.scale, y: owner.y + def.spawnY * owner.scale, color: def.color });
  }

  private superFreeze(owner: Fighter, move: MoveDef): void {
    this.freeze = move.superFreeze ?? 0;
    this.events.push({ type: 'super-freeze', fighter: owner.index, frames: this.freeze, name: move.name, color: owner.def.visual.palette.glow });
  }

  private anyDarkLock(): boolean {
    return this.fighters.some((f) => !!f.lock?.def.darken);
  }

  private startFinisher(attacker: Fighter, fin: FinisherDef): void {
    const victim = this.fighters[1 - attacker.index];
    attacker.move = null;
    this.locks.start(attacker, victim, fin.lock, { name: fin.name, finisher: true, anchorDefender: true }, this.events);
    this.finisherRunning = true;
    this.finisherName = fin.name;
    this.opts.hud.draft.finisherHint = null;
    this.opts.hud.draft.announce = null;
    this.events.push({ type: 'finisher', fighter: attacker.index, name: fin.name });
    this.opts.audio.play('blade');
  }

  private trackFinisher(): void {
    if (this.match.phase !== 'finisher') return;
    const winner = this.match.roundWinner;
    if (winner === -1) return;
    const w = this.fighters[winner];
    const loser = this.fighters[1 - winner];
    if (this.finisherRunning && !w.lock) {
      this.finisherRunning = false;
      this.finisherDone = true;
      this.match.finisherUsed = this.finisherName;
    }
    if (!this.finisherRunning && !this.finisherDone && (loser.state === FighterState.DEAD || loser.state === FighterState.KNOCKDOWN) && loser.stateFrame > 20) {
      this.finisherDone = true;
    }
  }

  private checkBossPhase(): void {
    for (const f of this.fighters) {
      const boss = f.def.boss;
      if (!boss || f.phase2 || f.hp <= 0 || f.hp > f.maxHp * boss.phase2Threshold) continue;
      f.phase2 = true;
      this.freeze = PHASE2_FREEZE;
      this.danger = 1;
      this.ai[f.index]?.setPhase2();
      this.camera.cinematic(f.x, 160 * f.scale, 1.5, PHASE2_FREEZE + 10, 0.02);
      this.flash.flash(boss.phase2Glow, 0.6);
      this.effects.superCharge(f.x, f.y, boss.phase2Glow);
      this.effects.shakeScreen(12);
      this.opts.audio.play('phase2');
      this.playMusic('boss2');
      const d = this.opts.hud.draft;
      d.announce = { id: this.opts.hud.nextId(), text: 'PHASE 2', style: 'phase2', sub: `${f.def.name.toUpperCase()} UNLEASHED` };
    }
  }

  private checkKO(): void {
    if (this.match.phase !== 'fight') return;
    const [a, b] = this.fighters;
    const deadA = a.hp <= 0 && !a.isLocked;
    const deadB = b.hp <= 0 && !b.isLocked;
    if (!deadA && !deadB) return;
    const signals = deadA && deadB ? this.match.reportDoubleKO() : this.match.reportKO(deadA ? 0 : 1);
    const loser = deadA ? a : b;
    this.slowmo(KO_SLOWMO_MS);
    this.camera.cinematic(loser.x, 110, 1.35, 70, loser.facing * 0.02);
    this.flash.flash('#ffffff', 0.5);
    this.effects.shakeScreen(10);
    this.opts.audio.play('ko');
    this.applySignals(signals);
  }

  private trainingUpkeep(): void {
    if (!this.isTraining) return;
    this.fighters.forEach((f, i) => {
      this.idleFrames[i] = f.isActionable && !f.isLocked ? this.idleFrames[i] + 1 : 0;
      if (this.training.infiniteHealth && this.idleFrames[i] > TRAINING_REFILL_DELAY && f.hp < f.maxHp) f.hp = f.maxHp;
      if (this.training.infiniteMeter) f.meter = MAX_METER;
    });
  }

  private applySignals(signals: MatchSignal[]): void {
    const hud = this.opts.hud;
    for (const s of signals) {
      switch (s.type) {
        case 'phase':
          hud.draft.phase = s.phase;
          if (s.phase === 'round-start' && this.intro) {
            this.intro.finish();
            this.intro = null;
          }
          if (s.phase === 'victory') this.onVictoryPhase();
          break;
        case 'announce':
          hud.draft.announce = { id: hud.nextId(), text: s.text, style: s.style, sub: s.sub };
          if (s.style === 'round') this.opts.audio.play('round');
          if (s.style === 'fight') this.opts.audio.play('fight');
          if (s.style === 'time') this.opts.audio.play('round');
          break;
        case 'countdown':
          this.opts.audio.play('countdown', { volume: 0.5 });
          break;
        case 'reset-round':
          this.resetRound(ROUND_METER_CARRY);
          break;
        case 'enable-finisher': {
          const loser = this.fighters[1 - s.winner];
          if (loser.state === FighterState.DEAD || loser.state === FighterState.KNOCKDOWN) {
            loser.setState(FighterState.GETUP);
            loser.invuln = 0;
          } else if (loser.state !== FighterState.DAZED) {
            loser.setState(FighterState.DAZED);
          }
          const w = this.fighters[s.winner];
          const fin = w.def.finishers;
          hud.draft.finisherHint = fin.map((f) => `${f.notation}  ${f.name.toUpperCase()}${f.range !== Infinity ? ' (close)' : ''}`).join('   ·   ');
          break;
        }
        case 'round-won':
          this.onRoundWon(s.winner, s.reason);
          break;
        case 'match-over':
          this.sendResult();
          break;
      }
    }
  }

  private onRoundWon(winner: 0 | 1 | -1, reason: 'ko' | 'time' | 'finisher'): void {
    const hud = this.opts.hud.draft;
    hud.finisherHint = null;
    hud.fighters[0].wins = this.match.wins[0];
    hud.fighters[1].wins = this.match.wins[1];
    if (winner === -1) {
      hud.announce = { id: this.opts.hud.nextId(), text: 'DRAW', style: 'draw' };
      return;
    }
    const w = this.fighters[winner];
    const l = this.fighters[1 - winner];
    if (!w.isLocked) w.setState(FighterState.VICTORY);
    if (l.state === FighterState.DAZED) {
      l.setState(FighterState.DEAD);
      l.finisherOutcome = 'collapse';
      l.outcomeFrame = 0;
    }
    if (reason === 'time') {
      l.setState(FighterState.DEAD);
      l.defeatPose = true;
    }
    const sub = reason === 'finisher' ? (this.finisherName ? `${this.finisherName.toUpperCase()}` : undefined) : w.hp >= w.maxHp ? 'FLAWLESS' : undefined;
    hud.announce = { id: this.opts.hud.nextId(), text: `${w.def.name.toUpperCase()} WINS`, style: 'win', sub };
    this.opts.audio.play('victory');
  }

  private onVictoryPhase(): void {
    const winner = this.match.winner;
    const hud = this.opts.hud.draft;
    const cfg = this.opts.config;
    if (winner === -1) {
      hud.announce = { id: this.opts.hud.nextId(), text: 'DRAW GAME', style: 'draw' };
      return;
    }
    const w = this.fighters[winner];
    const l = this.fighters[1 - winner];
    w.setState(FighterState.VICTORY);
    this.camera.cinematic(w.x, 140 * w.scale, 1.5, 200, 0);
    const humanLost = cfg.controllers[winner] === 'cpu' && cfg.controllers[1 - winner] !== 'cpu';
    if (humanLost) {
      hud.announce = { id: this.opts.hud.nextId(), text: 'DEFEATED', style: 'defeat', sub: l.def.dialogue.defeatLines[0] };
      this.opts.audio.stopMusic();
    } else {
      hud.announce = { id: this.opts.hud.nextId(), text: `${w.def.name.toUpperCase()} WINS`, style: 'win', sub: `"${w.def.dialogue.victoryLines[this.rng.int(0, w.def.dialogue.victoryLines.length - 1)]}"` };
      this.playMusic('victory');
    }
  }

  private sendResult(): void {
    if (this.matchOverSent) return;
    this.matchOverSent = true;
    const [a, b] = this.fighters;
    this.opts.onMatchOver({
      winner: this.match.winner,
      roundsWon: [...this.match.wins] as [number, number],
      timeSeconds: Math.round(this.match.totalFrames / 60),
      maxCombo: [this.combo.maxCombo(0), this.combo.maxCombo(1)],
      damageDealt: [a.stats.damageDealt, b.stats.damageDealt],
      finisher: this.match.finisherUsed,
      perfect: this.match.winner !== -1 && this.fighters[this.match.winner].hp >= this.fighters[this.match.winner].maxHp,
    });
  }

  private syncHud(): void {
    const d = this.opts.hud.draft;
    this.fighters.forEach((f, i) => {
      const h = d.fighters[i];
      h.hp = Math.max(0, f.hp);
      h.meter = f.meter;
      h.superReady = f.meter >= MAX_METER;
      h.phase2 = f.phase2;
    });
    d.timer = this.match.timerSeconds;
    d.round = this.match.round;
  }

  // ------------------------------------------------------------------ presentation (per render frame)

  /** Real-time visual update; `dt` is in 60 Hz frame units. */
  render(ctx: CanvasRenderingContext2D, interp: number, now: number, dt: number): void {
    const effDt = dt * this.timeScale;
    const [a, b] = this.fighters;
    this.camera.update(effDt, a.x, a.y, b.x, b.y);
    this.shake.update(dt);
    this.flash.update(dt);
    this.particles.update(effDt);
    this.numbers.update(effDt);
    if (this.chromaFrames > 0) this.chromaFrames = Math.max(0, this.chromaFrames - dt);
    const g = this.opts.settings.graphics;
    this.renderer.render(
      ctx,
      {
        fighters: this.fighters,
        projectiles: this.projectiles,
        stage: this.stage,
        camera: this.camera,
        particles: this.particles,
        numbers: this.numbers,
        flash: this.flash,
        danger: this.danger,
        chroma: this.chromaFrames,
        debug: this.debug,
        frame: this.frame,
        colorblind: this.opts.settings.accessibility.colorblind,
      },
      { quality: g.quality, motionBlur: g.motionBlur, effects: g.effects, reducedMotion: this.opts.settings.accessibility.reducedMotion },
      interp,
      now,
      effDt,
    );
  }

  // ------------------------------------------------------------------ commands

  resetPositions(): void {
    this.resetRound(1);
    this.lastFrameData = null;
  }

  /** Developer cheats — wired only when import.meta.env.DEV is true. */
  cheat(code: string): void {
    const [a, b] = this.fighters;
    switch (code) {
      case 'F4':
        a.infiniteHealth = !a.infiniteHealth;
        b.infiniteHealth = a.infiniteHealth;
        break;
      case 'F5':
        a.infiniteMeter = !a.infiniteMeter;
        if (a.infiniteMeter) a.meter = MAX_METER;
        break;
      case 'F6':
        a.hp = a.maxHp;
        b.hp = b.maxHp;
        break;
      case 'F8':
        for (const ai of this.ai) if (ai) ai.enabled = !ai.enabled;
        if (this.isTraining) this.training.aiEnabled = !this.training.aiEnabled;
        break;
    }
  }

  debugInfo(fps: number): Record<string, string> {
    const [a, b] = this.fighters;
    const fmt = (f: Fighter) => {
      const d = f.describe();
      return `${f.def.name} · ${d.state} · ${d.move} · pos ${d.x},${d.y} · vel ${d.vx},${d.vy} · hp ${d.hp} · meter ${d.meter}`;
    };
    const buf = a.buffer.recentDirs(12).join('');
    const presses = a.buffer
      .recentPresses(20)
      .map((p) => `${p.pressed}@${p.age}`)
      .join(' ');
    return {
      FPS: fps.toFixed(0),
      Frame: String(this.frame),
      'Game State': `${this.match.phase} · round ${this.match.round} · ${this.match.timerSeconds}s · hitstop ${this.hitstop}`,
      P1: fmt(a),
      P2: fmt(b),
      'Input Buffer': `${buf}  ${presses}`,
      'AI State': this.ai.map((ai, i) => (ai ? `P${i + 1}: ${ai.debugState}` : '')).filter(Boolean).join(' | ') || '—',
      'Frame Advantage': this.lastFrameData ? `${this.lastFrameData.moveId}: ${this.lastFrameData.advantage > 0 ? '+' : ''}${this.lastFrameData.advantage}` : '—',
    };
  }
}
