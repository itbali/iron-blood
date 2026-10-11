import { AIController } from '../ai/AIController';
import type { AudioManager } from '../audio/AudioManager';
import { FighterState, type FinisherDef } from '../combat/types';
import { getCharacter } from '../data/characters';
import { getStage } from '../data/stages';
import { VIEW_H, VIEW_W, METER_MAX, ROUNDS_TO_WIN } from '../data/constants';
import { HitEffects } from '../effects/HitEffects';
import type { FxContext } from '../effects/FxContext';
import { ParticleSystem } from '../effects/ParticleSystem';
import { ScreenShake } from '../effects/ScreenShake';
import { SlowMotion } from '../effects/SlowMotion';
import { FightSim } from '../game/FightSim';
import type { FightConfig, FightResult } from '../game/FightConfig';
import { GameLoop } from '../game/GameLoop';
import { INTRO_FRAMES } from '../game/RoundManager';
import type { RoundEvent } from '../game/RoundManager';
import type { InputManager } from '../input/InputManager';
import type { InputFrame } from '../input/InputFrame';
import { keyLabel } from '../input/KeyBindings';
import type { Settings, SettingsStore } from '../progression/Settings';
import type { HudController } from '../ui/HudController';
import { Camera } from './Camera';
import { FinisherDirector } from './FinisherDirector';
import { IntroDirector } from './IntroDirector';
import { FightRenderer, type DamageNumber, type RenderFx } from './render/FightRenderer';
import { StageRenderer } from './render/StageRenderer';
import { view } from './render/view';

export interface SceneHost {
  onMatchEnd(result: FightResult): void;
  onPauseChange(paused: boolean): void;
  onExit(): void;
}

export interface SceneDeps {
  canvas: HTMLCanvasElement;
  hud: HudController;
  audio: AudioManager;
  input: InputManager;
  settings: SettingsStore;
  host: SceneHost;
}

const VICTORY_HOLD_FRAMES = 230;
const PARTICLE_DENSITY = { off: 0, low: 0.4, normal: 1, high: 1.6 } as const;
const QUALITY = { low: 0.45, medium: 0.8, high: 1 } as const;

export class FightScene {
  readonly sim: FightSim;
  readonly cfg: FightConfig;
  protected readonly ai: (AIController | null)[] = [null, null];
  protected readonly camera = new Camera();
  protected readonly shake = new ScreenShake();
  protected readonly slowmo = new SlowMotion();
  protected readonly particles = new ParticleSystem();
  protected readonly renderer = new FightRenderer();
  protected readonly stage: StageRenderer;
  protected readonly fx: RenderFx = {
    flash: 0, flashColor: '#ffffff', dim: 0, aberration: 0, hitLights: [], vignette: 1, quality: 1, reduced: false,
    motion: true, phase2: false, colorblind: false, dissolve: 0, dissolveSlot: 0, eclipse: 0,
  };
  protected readonly numbers: DamageNumber[] = [];
  protected readonly fxCtx: FxContext;
  private readonly hitFx: HitEffects;
  private readonly intro: IntroDirector;
  private readonly finisherDir: FinisherDirector;
  private readonly loop: GameLoop;
  private ctx2d: CanvasRenderingContext2D;
  private unsub: (() => void)[] = [];
  paused = false;
  debug = false;
  private visualTime = 0;
  private victoryFrames = 0;
  private ended = false;
  private lastDebugAt = 0;
  private stats = { finisher: false };
  private disposed = false;

  constructor(readonly deps: SceneDeps, cfg: FightConfig) {
    this.cfg = cfg;
    const p1 = getCharacter(cfg.p1.charId);
    const p2 = getCharacter(cfg.p2.charId);
    const training = cfg.mode === 'training';
    this.sim = new FightSim({
      p1: { def: p1, skin: cfg.p1.skin },
      p2: { def: p2, skin: cfg.p2.skin },
      mode: cfg.mode,
      humanSlots: cfg.humanSlots,
      bossFight: cfg.bossFight,
      finishers: cfg.finishers,
      round: { introFrames: training ? 0 : INTRO_FRAMES },
    });
    this.stage = new StageRenderer(getStage(cfg.stage));
    const ctx = deps.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx2d = ctx;
    this.fxCtx = {
      sim: this.sim, particles: this.particles, camera: this.camera, shake: this.shake, slowmo: this.slowmo,
      audio: deps.audio, hud: deps.hud, fx: this.fx, numbers: this.numbers, settings: () => deps.settings.get(),
    };
    this.hitFx = new HitEffects(this.fxCtx);
    this.intro = new IntroDirector(this.fxCtx, getStage(cfg.stage).name, () => deps.settings.get().subtitles);
    this.finisherDir = new FinisherDirector(this.fxCtx);
    for (let slot = 0; slot < 2; slot++) {
      if (!cfg.humanSlots.includes(slot)) {
        this.ai[slot] = new AIController(this.sim, slot, cfg.difficulty, 4242 + slot);
      }
    }
    this.loop = new GameLoop({
      update: () => this.update(),
      render: (dt) => this.render(dt),
      timeScale: () => (this.paused ? 0 : this.slowmo.scale),
    });
    this.applySettings(deps.settings.get());
    this.unsub.push(deps.settings.subscribe((s) => this.applySettings(s)));
    this.unsub.push(deps.input.onKeyDown((code) => this.onKey(code)));
  }

  /** Builds the stage, reporting progress for the loading screen. */
  async load(onProgress: (p: number) => void): Promise<void> {
    await this.stage.build(onProgress);
  }

  start(): void {
    const stage = getStage(this.cfg.stage);
    this.deps.audio.setTrack(this.cfg.bossFight ? 'boss' : 'battle', stage.musicRoot);
    this.deps.hud.reset();
    this.loop.start();
  }

  dispose(): void {
    this.disposed = true;
    this.loop.stop();
    this.unsub.forEach((u) => u());
    this.unsub = [];
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const maxW = 1920;
    const pxW = Math.min(maxW, Math.round(cssW * dpr));
    const pxH = Math.round((pxW * VIEW_H) / VIEW_W);
    this.deps.canvas.width = pxW;
    this.deps.canvas.height = pxH;
    view.scale = pxW / VIEW_W;
    void cssH;
  }

  applySettings(s: Settings): void {
    const q = QUALITY[s.quality];
    this.particles.density = PARTICLE_DENSITY[s.particles] * (s.effects ? 1 : 0.4) * (s.quality === 'low' ? 0.6 : 1);
    this.fx.quality = q;
    this.fx.reduced = s.reducedMotion;
    this.fx.motion = s.motionBlur;
    this.fx.colorblind = s.colorblind !== 'off';
    this.shake.scale = s.screenShake ? (s.reducedMotion ? 0.3 : 1) : 0;
    this.deps.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
  }

  get timeScale(): number {
    return this.slowmo.scale;
  }

  get fps(): number {
    return this.loop.fps;
  }

  // ───────────── input / flow ─────────────

  protected onKey(code: string): void {
    if (this.disposed) return;
    if (code === 'Escape') {
      this.setPaused(!this.paused);
      return;
    }
    if (this.paused) return;
    if (code === 'Enter') this.skip();
    if (code === 'KeyR') this.restart();
    if (code === 'F3') this.debug = !this.debug;
    if (import.meta.env.DEV) void import('./devCheats').then((m) => m.devKey(this, code));
  }

  skip(): void {
    const r = this.sim.rounds;
    if (r.phase === 'intro') {
      r.skipIntro();
      this.camera.setOverride(null);
      this.deps.hud.hideSubtitle();
      this.deps.hud.skipHint(false);
      this.sim.resetPositions();
    } else if (r.phase === 'finisher') {
      this.sim.skipFinisher();
      this.finisherDir.reset();
      this.deps.hud.finisherPrompt(false);
      this.deps.hud.skipHint(false);
    } else if (r.phase === 'victory' && !this.ended) {
      this.victoryFrames = VICTORY_HOLD_FRAMES;
    }
  }

  setPaused(p: boolean): void {
    if (p === this.paused) return;
    this.paused = p;
    this.deps.host.onPauseChange(p);
  }

  restart(): void {
    this.sim.restartMatch();
    this.resetVisuals();
    this.ended = false;
    this.victoryFrames = 0;
    this.stats.finisher = false;
    this.deps.audio.setTrack(this.cfg.bossFight ? 'boss' : 'battle', getStage(this.cfg.stage).musicRoot);
  }

  protected resetVisuals(): void {
    this.particles.clear();
    this.numbers.length = 0;
    this.shake.reset();
    this.slowmo.reset();
    this.camera.reset();
    this.renderer.clearGhosts();
    this.fx.flash = 0;
    this.fx.dim = 0;
    this.fx.dissolve = 0;
    this.fx.eclipse = 0;
    this.fx.phase2 = false;
    this.fx.hitLights.length = 0;
    this.finisherDir.reset();
    this.deps.hud.reset();
    this.intro.reset();
  }

  private pollInputs(): [InputFrame, InputFrame] {
    const out: [InputFrame, InputFrame] = [0, 0];
    for (let slot = 0; slot < 2; slot++) {
      const ai = this.ai[slot];
      out[slot] = ai ? ai.poll() : this.deps.input.poll(slot);
    }
    return out;
  }

  // ───────────── fixed update ─────────────

  protected update(): void {
    if (this.paused || this.disposed) return;
    const sim = this.sim;
    sim.step(this.pollInputs());
    this.visualTime++;

    for (const ev of sim.events) this.hitFx.handle(ev);
    for (const end of sim.comboEnds) this.deps.hud.comboEnd(end.slot, end.dropped);
    for (const re of sim.rounds.events) this.onRoundEvent(re);

    this.stepDirectors();
    this.stepEffects();
    this.afterStep();
  }

  /** Hook for subclasses (training mode). */
  protected afterStep(): void {
    /* base scene has nothing extra to do */
  }

  private stepDirectors(): void {
    const sim = this.sim;
    const r = sim.rounds;
    if (r.phase === 'intro') {
      this.intro.step(r.phaseFrame, this.sim.rounds.cfg.introFrames);
      this.deps.hud.skipHint(r.phaseFrame > 20 && r.phaseFrame < 300);
    } else if (r.phase === 'finisher' && sim.finisher) {
      this.finisherDir.step(sim.finisher.frame, sim.finisher.def.duration);
      this.stats.finisher = true;
    } else if (r.phase === 'finisher') {
      const loser = sim.fighters[1 - (r.roundWinner ?? 0)];
      this.camera.setOverride({ x: loser.x, y: Camera.yFor(125, 1.5, 410), zoom: 1.5, strength: 0.7 });
    } else if (r.phase === 'ko') {
      const winner = r.roundWinner ?? -1;
      const loser = sim.fighters[winner === 0 ? 1 : 0];
      if (winner >= 0) this.camera.setOverride({ x: loser.x, y: Camera.yFor(125, 1.35, 410), zoom: 1.35, strength: 0.55 });
    } else if (r.phase === 'victory' || r.phase === 'round-end') {
      const w = r.matchWinner ?? r.roundWinner;
      if (w !== null && w >= 0 && r.phase === 'victory') {
        const f = sim.fighters[w];
        this.camera.setOverride({ x: f.x, y: Camera.yFor(125, 1.45, 410), zoom: 1.45, strength: 0.7 });
      } else {
        this.camera.setOverride(null);
      }
    } else {
      this.cinematicCamera();
    }
    if (r.phase !== 'intro') this.deps.hud.skipHint(r.phase === 'finisher' && !!sim.finisher);
  }

  private cinematicCamera(): void {
    const [a, b] = this.sim.fighters;
    const sup = [a, b].find((f) => f.move?.kind === 'super' && f.isAttacking);
    const throwing = [a, b].find((f) => f.state === FighterState.THROW && f.throwData?.cinematic);
    if (sup) {
      this.camera.setOverride({ x: (a.x + b.x) / 2, y: Camera.yFor(125, 1.5, 410), zoom: 1.5, strength: 0.8 });
      this.fx.dim = Math.min(0.5, this.fx.dim + 0.06);
    } else if (throwing) {
      this.camera.setOverride({ x: (a.x + b.x) / 2, y: Camera.yFor(125, 1.55, 410), zoom: 1.55, strength: 0.85 });
    } else {
      this.camera.setOverride(null);
      this.fx.dim = Math.max(0, this.fx.dim - 0.05);
    }
  }

  private stepEffects(): void {
    const sim = this.sim;
    const [a, b] = sim.fighters;
    this.particles.update();
    this.shake.update();
    this.stage.update();
    this.renderer.pushGhosts(sim);
    this.fx.flash *= 0.84;
    this.fx.aberration *= 0.8;
    if (this.fx.aberration < 0.1) this.fx.aberration = 0;
    for (const l of this.fx.hitLights) l.life--;
    while (this.fx.hitLights.length > 0 && this.fx.hitLights[0].life <= 0) this.fx.hitLights.shift();
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life--;
      n.y += n.vy;
      n.vy *= 0.96;
      if (n.life <= 0) this.numbers.splice(i, 1);
    }
    if (sim.rounds.phase !== 'finisher' && !sim.finisher) this.fx.eclipse *= 0.9;
    this.camera.update(a.x, b.x, a.y, b.y);

    // trail particles on fast attacks
    for (const f of sim.fighters) {
      if (f.afterimage > 0 && this.fx.motion) {
        this.particles.trail(f.x - f.facing * 20, f.y + f.def.height * 0.5, f.def.style.trail, 12);
      }
      if (f.state === FighterState.WALK && Math.abs(f.vx) > 3 && sim.frame % 9 === 0) {
        this.particles.dust(f.x - f.facing * 14, 2, 1, -f.facing);
      }
      if (f.state === FighterState.DEAD && f.kneel && sim.frame % 6 === 0) this.particles.blood(f.x, 40, f.facing, 1);
    }
    if (this.stage.def.id === 'temple' && sim.frame % 10 === 0) this.particles.embers(this.camera.x, 20, 1, '#ff9a4a', 900);
    if (this.stage.def.id === 'industrial' && sim.frame % 45 === 0) this.particles.smoke(this.camera.x + (Math.random() - 0.5) * 900, 0, 1, 'rgba(120,120,135,0.25)', 40);
  }

  // ───────────── round flow ─────────────

  private onRoundEvent(ev: RoundEvent): void {
    const hud = this.deps.hud;
    const audio = this.deps.audio;
    const sim = this.sim;
    switch (ev.type) {
      case 'round-announce': {
        this.camera.setOverride(null);
        hud.clearCombos();
        hud.hideSubtitle();
        hud.skipHint(false);
        this.fx.dissolve = 0;
        this.fx.eclipse = 0;
        this.renderer.clearGhosts();
        this.particles.clear();
        const r = sim.rounds;
        const label = r.finalRound ? 'FINAL ROUND' : `ROUND ${ev.round ?? r.round}`;
        hud.banner(label, { kind: 'round', duration: 1100 });
        audio.play('announce');
        audio.play('countdown');
        break;
      }
      case 'fight-start':
        hud.banner('FIGHT!', { kind: 'fight', duration: 900 });
        audio.play('round-start');
        break;
      case 'ko': {
        const w = ev.winner ?? -1;
        const txt = sim.rounds.timeUp ? 'TIME UP' : w < 0 ? 'DRAW' : 'KNOCKOUT';
        hud.banner(txt, { kind: 'ko', duration: 1700 });
        if (sim.rounds.timeUp) audio.play('ko', { vol: 0.6 });
        break;
      }
      case 'finisher-window': {
        const winner = sim.fighters[ev.winner ?? 0];
        this.camera.setOverride(null);
        hud.banner('END HIM', { kind: 'ko', duration: 1800 });
        hud.finisherPrompt(true, this.finisherHints(winner.def.finishers, winner.slot));
        hud.skipHint(false);
        audio.play('announce', { pitch: 0.7 });
        break;
      }
      case 'round-end': {
        hud.finisherPrompt(false);
        hud.skipHint(false);
        this.slowmo.reset();
        const w = ev.winner ?? -1;
        const r = sim.rounds;
        if (r.matchWinner === null) {
          if (w < 0) hud.banner('DRAW', { kind: 'win', sub: `ROUND ${ev.round}`, duration: 1900 });
          else hud.banner(`${sim.fighters[w].def.name.toUpperCase()} WINS`, { kind: 'win', sub: `ROUND ${ev.round}`, duration: 1900 });
        }
        break;
      }
      case 'victory':
        this.onVictory(ev.winner ?? 0);
        break;
      default:
        break;
    }
  }

  private finisherHints(defs: FinisherDef[], slot: number): string {
    const binds = this.deps.input.getBindings()[slot === 0 ? 'p1' : 'p2'];
    const key = (a: keyof typeof binds): string => keyLabel(binds[a][0] ?? '?');
    const arrow = (d: string): string => ({ FWD: '→', BACK: '←', DOWN: '↓', UP: '↑' }[d] ?? d);
    const btn = (b: string): string => ({ sp1: key('sp1'), sp2: key('sp2'), hp: key('hp'), hk: key('hk'), lp: key('lp'), lk: key('lk') }[b] ?? b);
    return defs
      .map((d) => `<div class="fin-row"><b>${d.name.toUpperCase()}</b><span>${d.seq.map(arrow).join(' ')} + ${btn(d.button)}</span></div>`)
      .join('');
  }

  private onVictory(winner: number): void {
    const sim = this.sim;
    const hud = this.deps.hud;
    const audio = this.deps.audio;
    const wf = sim.fighters[winner];
    const humanWon = this.cfg.humanSlots.includes(winner);
    const single = this.cfg.humanSlots.length === 1;
    this.camera.setOverride({ x: wf.x, y: Camera.yFor(125, 1.45, 410), zoom: 1.45, strength: 0.7 });
    if (single && !humanWon) {
      hud.banner('DEFEATED', { kind: 'ko', sub: `${wf.def.name.toUpperCase()} WINS`, duration: 4000 });
    } else {
      hud.banner(`${wf.def.name.toUpperCase()} WINS`, { kind: 'win', duration: 4000 });
    }
    if (this.deps.settings.get().subtitles) {
      const lines = wf.def.dialogue.victory;
      hud.subtitle(wf.def.name, lines[Math.floor(Math.random() * lines.length)] ?? '', 3200);
    }
    if (humanWon || !single) {
      audio.setTrack('victory');
      audio.play('victory');
    } else {
      audio.setTrack('none');
    }
    this.victoryFrames = 0;
    this.ended = false;
  }

  private buildResult(): FightResult {
    const sim = this.sim;
    const w = (sim.rounds.matchWinner ?? 0) as 0 | 1;
    return {
      winnerSlot: w,
      p1Wins: sim.rounds.wins[0],
      p2Wins: sim.rounds.wins[1],
      timeSec: Math.round(sim.frame / 60),
      maxCombo: [sim.combo.maxCombo[0], sim.combo.maxCombo[1]],
      damage: [Math.round(sim.stats.damage[0]), Math.round(sim.stats.damage[1])],
      finisher: this.stats.finisher,
      humanWon: this.cfg.humanSlots.includes(w),
    };
  }

  // ───────────── render ─────────────

  protected render(dt: number): void {
    if (this.disposed) return;
    this.slowmo.update(this.paused ? 0 : dt);
    this.updateHud();
    this.fx.phase2 = this.sim.bossPhase2;
    this.renderer.draw(
      this.ctx2d, this.sim, this.camera, this.stage, this.particles, this.numbers, this.fx,
      { on: this.debug, frame: this.sim.frame }, { x: this.shake.x, y: this.shake.y }, this.visualTime,
    );
    if (!this.paused) this.tickVictory();
    this.updateDebugText();
  }

  private tickVictory(): void {
    if (this.sim.rounds.phase !== 'victory' || this.ended) return;
    this.victoryFrames++;
    if (this.victoryFrames >= VICTORY_HOLD_FRAMES) {
      this.ended = true;
      this.deps.host.onMatchEnd(this.buildResult());
    }
  }

  private updateHud(): void {
    const sim = this.sim;
    const [a, b] = sim.fighters;
    const r = sim.rounds;
    const training = this.cfg.mode === 'training';
    let label = r.finalRound ? 'FINAL ROUND' : `ROUND ${r.round}`;
    if (training) label = 'TRAINING';
    else if (this.cfg.arcade) label = `FIGHT ${this.cfg.arcade.index}/${this.cfg.arcade.total} · ${label}`;
    this.deps.hud.update({
      p1: { name: a.def.name, hp: a.hp, maxHp: a.maxHp, meter: a.meter, wins: r.wins[0], superReady: a.meter >= METER_MAX },
      p2: { name: b.def.name, hp: b.hp, maxHp: b.maxHp, meter: b.meter, wins: r.wins[1], superReady: b.meter >= METER_MAX },
      timer: training ? null : r.timerSeconds,
      roundLabel: label,
      roundsToWin: ROUNDS_TO_WIN,
      bossPhase2: sim.bossPhase2,
      infiniteTimer: training,
    });
  }

  protected debugLines(): string[] {
    const sim = this.sim;
    const [a, b] = sim.fighters;
    const lines = [
      `FPS ${this.loop.fps}   TIMESCALE ${this.slowmo.scale.toFixed(2)}   PARTICLES ${this.particles.active}`,
      `GAME STATE ${sim.rounds.phase.toUpperCase()}  ROUND ${sim.rounds.round}  FRAME ${sim.frame}  HITSTOP ${sim.hitstop}`,
    ];
    for (const f of [a, b]) {
      const buf = f.buffer.snapshot(8).map((e) => e.rel.toString(2).padStart(4, '0')).join(' ');
      lines.push(
        `P${f.slot + 1} ${f.def.name}  STATE ${f.state}  HP ${Math.ceil(f.hp)}  METER ${f.meter.toFixed(0)}`,
        `   POS ${f.x.toFixed(0)},${f.y.toFixed(0)}  VEL ${f.vx.toFixed(1)},${f.vy.toFixed(1)}  FACE ${f.facing}`,
        `   ATTACK ${f.move?.id ?? '-'}  FRAME ${f.curFrame}/${f.move ? f.move.attack.startup + f.move.attack.active + f.move.attack.recovery : 0}  ADV ${f.lastAdvantage ?? '-'}`,
        `   BUFFER ${buf}`,
      );
      const ai = this.ai[f.slot];
      if (ai) lines.push(`   AI ${ai.fsm.state}/${ai.intent}${ai.enabled ? '' : ' (OFF)'}`);
    }
    return lines;
  }

  private updateDebugText(): void {
    const now = performance.now();
    if (now - this.lastDebugAt < 100) return;
    this.lastDebugAt = now;
    this.deps.hud.setDebug(this.debug ? this.debugLines().join('\n') : null);
  }

  /** Dev/testing handle. */
  get internals(): { sim: FightSim; ai: (AIController | null)[]; camera: Camera } {
    return { sim: this.sim, ai: this.ai, camera: this.camera };
  }
}

