import { AIController } from '@/ai/AIController';
import type { AudioManager } from '@/audio/AudioManager';
import { FighterState } from '@/combat/FighterState';
import { HUD_PUSH_INTERVAL_MS, METER_MAX, ROUND_TIME, ROUNDS_TO_WIN } from '@/core/constants';
import type { PlayerSide } from '@/core/types';
import { CHARACTERS } from '@/data/characters';
import { STAGES } from '@/data/stages';
import { HitEffects } from '@/effects/HitEffects';
import type { InputManager } from '@/input/InputManager';
import { EMPTY_INPUT, makeInput, type InputFrame } from '@/input/InputFrame';
import type { GameSettings } from '@/progression/Settings';
import { Renderer } from '@/render/Renderer';
import { Store } from '@/state/store';
import { GameLoop } from './GameLoop';
import type { MatchConfig, MatchResult } from './GameState';
import { Simulation } from './Simulation';
import { initialFightUiState, type Banner, type FightUiState, type TrainingState } from './FightUiState';

export interface GameCallbacks {
  onMatchEnd(result: MatchResult): void;
  onPerfectBlock(): void;
}

/**
 * Orchestrates one match: owns the simulation, AI, loop, renderer and effects, and publishes
 * HUD state to React through a store. Gameplay logic lives in Simulation; this class only wires systems.
 */
export class Game {
  readonly ui = new Store<FightUiState>(initialFightUiState());
  readonly sim: Simulation;
  readonly renderer: Renderer;
  readonly loop: GameLoop;
  private ai: [AIController | null, AIController | null] = [null, null];
  private effects: HitEffects;
  private lastHudPush = 0;
  private bannerId = 0;
  private bannerTimers: number[] = [];
  private disposed = false;
  private superTrack: { side: PlayerSide; damage: number; hits: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeInput: (() => void) | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly config: MatchConfig,
    private input: InputManager,
    private audio: AudioManager,
    settings: GameSettings,
    private callbacks: GameCallbacks,
  ) {
    const p1 = CHARACTERS[config.p1];
    const p2 = CHARACTERS[config.p2];
    this.sim = new Simulation(p1, p2, {
      seed: config.seed,
      rounds: config.rounds || ROUNDS_TO_WIN,
      timeLimit: config.timeLimit || ROUND_TIME,
      training: config.mode === 'training',
      finishers: settings.gameplay.finishers && config.mode !== 'training',
      skipIntro: config.mode === 'training',
    });
    this.sim.fighters.forEach((f, i) => {
      f.palette = config.skins[i as 0 | 1] === 'crimson' ? f.config.altPalette : f.config.palette;
    });
    this.renderer = new Renderer(canvas, STAGES[config.stage]);
    this.applySettings(settings);
    if (!config.p2Human) this.ai[1] = new AIController(1, config.difficulty, this.sim);
    if (config.mode === 'training') {
      const t = config.training;
      const state: TrainingState = { ...this.ui.get().training, ...(t ?? {}) };
      this.ui.patch({ training: state });
      this.applyTraining(state);
    }
    this.loop = new GameLoop({ tick: () => this.tick(), render: (alpha, dt) => this.render(alpha, dt) });
    this.effects = new HitEffects(this.sim, this.renderer, this.loop, audio, { banner: (text, side, kind) => this.banner(text, side, kind) });
    this.sim.events.on('matchEnd', (e) => {
      this.ui.patch({ result: e.result });
      this.pushHud(true);
      this.callbacks.onMatchEnd(e.result);
    });
    this.sim.events.on('hit', (e) => {
      if (e.perfect) this.callbacks.onPerfectBlock();
      if (this.superTrack && e.attacker.side === this.superTrack.side && !e.blocked) {
        this.superTrack.damage += e.damage;
        this.superTrack.hits++;
      }
    });
    this.sim.events.on('superStart', (e) => {
      this.superTrack = { side: e.fighter.side, damage: 0, hits: 0 };
    });
    this.sim.events.on('phase', (e) => {
      if (e.phase === 'match-end' || e.phase === 'round-end') this.pushHud(true);
    });
    this.sim.events.on('bossPhase2', () => this.audio.playMusic('battle-boss'));
    this.renderer.camera.snap({ x1: this.sim.p1.x, y1: 0, x2: this.sim.p2.x, y2: 0 });
    this.observeSize();
    this.unsubscribeInput = this.input.onSystem((action) => this.onSystemKey(action));
    if (import.meta.env.DEV) (window as unknown as { __ironblood?: Game }).__ironblood = this;
  }

  private observeSize(): void {
    const parent = this.canvas.parentElement;
    const apply = () => {
      const rect = (parent ?? this.canvas).getBoundingClientRect();
      this.renderer.resize(rect.width, rect.height);
    };
    apply();
    if (typeof ResizeObserver !== 'undefined' && parent) {
      this.resizeObserver = new ResizeObserver(apply);
      this.resizeObserver.observe(parent);
    }
  }

  applySettings(s: GameSettings): void {
    this.renderer.settings = {
      particles: s.graphics.particles,
      screenShake: s.graphics.screenShake,
      motionBlur: s.graphics.motionBlur,
      effects: s.graphics.effects,
      reducedMotion: s.accessibility.reducedMotion,
      reducedFlashes: s.accessibility.reducedFlashes,
      colorblind: s.accessibility.colorblind,
      quality: s.graphics.quality,
    };
    this.renderer.particles.density = s.graphics.particles ? (s.graphics.quality === 'low' ? 0.4 : s.graphics.quality === 'medium' ? 0.7 : 1) : 0;
    this.renderer.shake.scale = s.graphics.screenShake ? 1 : 0;
    this.input.setBindings(0, s.controls.p1);
    this.input.setBindings(1, s.controls.p2);
    const parent = this.canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      this.renderer.resize(rect.width, rect.height);
    }
  }

  start(): void {
    this.audio.playMusic('battle');
    // Drop presses latched while the previous screen was active so they cannot skip the intro.
    this.input.clear();
    this.loop.start();
  }

  get paused(): boolean {
    return this.loop.paused;
  }

  pause(): void {
    if (this.loop.paused || this.sim.isOver) return;
    this.loop.paused = true;
    this.input.clear();
    this.ui.patch({ paused: true });
  }

  resume(): void {
    this.loop.paused = false;
    this.input.clear();
    this.ui.patch({ paused: false });
  }

  togglePause(): void {
    if (this.loop.paused) this.resume();
    else this.pause();
  }

  toggleDebug(): void {
    this.renderer.debug = !this.renderer.debug;
    this.ui.patch({ debug: this.renderer.debug });
  }

  setTraining(partial: Partial<TrainingState>): void {
    const state = { ...this.ui.get().training, ...partial };
    this.ui.patch({ training: state });
    this.applyTraining(state);
  }

  private applyTraining(t: TrainingState): void {
    const [a, b] = this.sim.fighters;
    a.infiniteHealth = t.infiniteHealth;
    b.infiniteHealth = t.infiniteHealth;
    a.infiniteMeter = t.infiniteMeter;
    b.infiniteMeter = t.infiniteMeter;
    if (t.infiniteMeter) {
      a.meter = METER_MAX;
      b.meter = METER_MAX;
    }
    this.ai[1] = t.aiEnabled ? new AIController(1, this.config.difficulty, this.sim) : null;
    this.renderer.showHitboxes = t.showHitboxes;
  }

  resetPositions(): void {
    this.sim.resetPositions();
    this.renderer.particles.clear();
    this.renderer.damageNumbers.length = 0;
  }

  /** Developer cheats; only wired in development builds. */
  cheat(action: 'health' | 'meter' | 'refill' | 'reset' | 'ai'): void {
    if (!import.meta.env.DEV) return;
    const c = { ...this.ui.get().cheats };
    const [a, b] = this.sim.fighters;
    switch (action) {
      case 'health':
        c.infiniteHealth = !c.infiniteHealth;
        a.infiniteHealth = c.infiniteHealth;
        break;
      case 'meter':
        c.infiniteMeter = !c.infiniteMeter;
        a.infiniteMeter = c.infiniteMeter;
        if (c.infiniteMeter) a.meter = METER_MAX;
        break;
      case 'refill':
        a.hp = a.maxHp;
        b.hp = b.maxHp;
        break;
      case 'reset':
        this.resetPositions();
        break;
      case 'ai':
        c.aiDisabled = !c.aiDisabled;
        break;
    }
    this.ui.patch({ cheats: c });
  }

  private onSystemKey(action: string): void {
    if (this.disposed) return;
    switch (action) {
      case 'debug':
        this.toggleDebug();
        break;
      case 'cheatHealth':
        this.cheat('health');
        break;
      case 'cheatMeter':
        this.cheat('meter');
        break;
      case 'cheatRefill':
        this.cheat('refill');
        break;
      case 'cheatReset':
        this.cheat('reset');
        break;
      case 'cheatAi':
        this.cheat('ai');
        break;
    }
  }

  private banner(text: string, side: 0 | 1, kind: Banner['kind']): void {
    const id = ++this.bannerId;
    const banners = [...this.ui.get().banners.filter((b) => b.kind !== kind || b.side !== side), { id, text, side, kind }].slice(-4);
    this.ui.patch({ banners });
    const timer = window.setTimeout(() => {
      this.ui.patch({ banners: this.ui.get().banners.filter((b) => b.id !== id) });
    }, 1100);
    this.bannerTimers.push(timer);
  }

  private tick(): void {
    const sim = this.sim;
    this.renderer.recordTick(sim);
    const ui = this.ui.get();
    const p1: InputFrame = this.input.sample(0);
    let p2: InputFrame;
    const aiDisabled = ui.cheats.aiDisabled;
    if (this.config.p2Human) p2 = this.input.sample(1);
    else if (this.ai[1] && !aiDisabled) p2 = sim.inputsEnabled ? this.ai[1].update(sim) : EMPTY_INPUT;
    else if (this.config.mode === 'training' && ui.training.dummyBlock) p2 = makeInput(0, 0, 64, 0);
    else p2 = EMPTY_INPUT;
    this.input.endTick();

    // Any press skips cinematics (intro / finisher / round-end lingering).
    if ((p1.pressed || p2.pressed) && sim.phaseFrame > 20 && (sim.phase === 'intro' || sim.phase === 'finisher')) sim.skipCinematic();

    if (ui.training.infiniteHealth && this.config.mode === 'training') {
      for (const f of sim.fighters) {
        if (f.hp < f.maxHp && f.state === FighterState.IDLE && f.stateFrame > 30) f.hp = Math.min(f.maxHp, f.hp + 8);
      }
    }
    sim.tick([p1, p2]);
    this.effects.update();

    if (this.superTrack && sim.fighters[this.superTrack.side].state !== FighterState.SPECIAL) {
      const t = this.superTrack;
      this.superTrack = null;
      if (t.hits > 0) {
        this.ui.patch({ superSummary: { side: t.side, damage: t.damage, hits: t.hits } });
        window.setTimeout(() => this.ui.patch({ superSummary: null }), 1800);
      }
    }
  }

  private render(alpha: number, dtTicks: number): void {
    this.renderer.update(this.sim, dtTicks);
    const debugInfo = this.renderer.debug ? { fps: this.loop.fps, aiState: this.ai[1]?.debugState ?? (this.config.p2Human ? 'human' : 'off'), phase: this.sim.phase } : null;
    this.renderer.render(this.sim, alpha, debugInfo);
    const now = performance.now();
    if (now - this.lastHudPush >= HUD_PUSH_INTERVAL_MS) this.pushHud(false);
  }

  private pushHud(force: boolean): void {
    this.lastHudPush = performance.now();
    const hud = this.sim.snapshot();
    const state = this.ui.get();
    const needsFrameData = state.training.showFrameData && this.config.mode === 'training';
    const frameData = needsFrameData || this.renderer.debug ? this.frameData() : null;
    if (!force && state.hud && shallowEqualHud(state.hud, hud) && !frameData && !state.frameData) return;
    this.ui.patch({ hud, frameData });
  }

  private frameData() {
    const f = (side: 0 | 1) => {
      const x = this.sim.fighters[side];
      return {
        state: x.state,
        attack: x.currentAttack?.id ?? (x.lastAttackId || '-'),
        frame: x.attackFrame,
        phase: x.attackPhase ?? '-',
        advantage: x.lastFrameAdvantage,
        velocity: `${x.vx.toFixed(1)}, ${x.vy.toFixed(1)}`,
        hp: Math.round(x.hp),
        meter: Math.round(x.meter),
      };
    };
    return { p1: f(0), p2: f(1), fps: this.loop.fps, frame: this.sim.frame };
  }

  dispose(): void {
    this.disposed = true;
    this.loop.stop();
    this.effects.dispose();
    this.resizeObserver?.disconnect();
    this.unsubscribeInput?.();
    for (const t of this.bannerTimers) window.clearTimeout(t);
    this.sim.events.clear();
  }
}

const shallowEqualHud = (a: FightUiState['hud'], b: FightUiState['hud']): boolean => {
  if (!a || !b) return false;
  return (
    a.phase === b.phase &&
    a.timer === b.timer &&
    a.round === b.round &&
    a.announcement === b.announcement &&
    a.subtitle === b.subtitle &&
    a.finisherAvailable === b.finisherAvailable &&
    a.dialogue?.text === b.dialogue?.text &&
    a.p1.hp === b.p1.hp &&
    a.p2.hp === b.p2.hp &&
    a.p1.meter === b.p1.meter &&
    a.p2.meter === b.p2.meter &&
    a.p1.comboHits === b.p1.comboHits &&
    a.p2.comboHits === b.p2.comboHits &&
    a.p1.comboDamage === b.p1.comboDamage &&
    a.p2.comboDamage === b.p2.comboDamage &&
    a.p1.roundsWon === b.p1.roundsWon &&
    a.p2.roundsWon === b.p2.roundsWon &&
    a.p1.phase2 === b.p1.phase2 &&
    a.p2.phase2 === b.p2.phase2 &&
    a.phaseFrame === b.phaseFrame
  );
};
