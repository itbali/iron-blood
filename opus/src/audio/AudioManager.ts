import { MUSIC_THEMES, type MusicTheme, type ThemeId } from './music';

export type SfxId =
  | 'hover' | 'click' | 'back' | 'select' | 'confirm'
  | 'punch' | 'kick' | 'heavy' | 'block' | 'perfect' | 'grab' | 'throw' | 'special' | 'projectile'
  | 'ko' | 'victory' | 'countdown' | 'round' | 'fight' | 'wall' | 'whoosh' | 'dash' | 'slash' | 'zap'
  | 'teleport' | 'super' | 'superhit' | 'charge' | 'slam' | 'burst' | 'explosion' | 'rocket' | 'servo'
  | 'crush' | 'counter' | 'summon' | 'blade' | 'phase2' | 'clash' | 'land' | 'jump' | 'tech' | 'combo';

export interface PlayOptions {
  volume?: number;
  pan?: number;
  pitch?: number;
}

type Generator = (a: AudioManager, t: number, out: AudioNode, o: Required<PlayOptions>) => void;

const LOOKAHEAD_S = 0.12;
const SCHEDULER_MS = 25;
const MUSIC_FADE_S = 0.5;

/**
 * Procedural audio with a sample-override path. Every sound is addressed by id
 * (`audio.play('punch')`); registering a sample for that id later replaces the
 * synthesized placeholder without touching gameplay code.
 */
export class AudioManager {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private musicFader!: GainNode;
  sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private samples = new Map<string, AudioBuffer>();
  private volumes = { master: 0.8, music: 0.55, sfx: 0.85 };
  private theme: MusicTheme | null = null;
  private pendingTheme: ThemeId | null = null;
  private step = 0;
  private nextStepTime = 0;
  private timer: number | null = null;
  private lastPlayed = new Map<string, number>();
  private warned = new Set<string>();

  /** Must be called from a user gesture (browsers keep AudioContext suspended until then). */
  unlock(): void {
    try {
      if (!this.ctx) this.create();
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    } catch (err) {
      console.error('Audio unavailable', err);
    }
  }

  private create(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.musicFader = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicFader.connect(this.musicBus).connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    if (this.pendingTheme) {
      const t = this.pendingTheme;
      this.pendingTheme = null;
      this.playMusic(t);
    }
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.5, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.02);
  }

  /** Loads a real sample for an id; on failure the procedural version stays in place. */
  async registerSample(id: string, url: string): Promise<void> {
    if (!this.ctx) return;
    try {
      const res = await fetch(url);
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.samples.set(id, buf);
    } catch (err) {
      console.error(`Failed to load sample "${id}" from ${url}; using procedural fallback`, err);
    }
  }

  play(id: SfxId | string, opts: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const last = this.lastPlayed.get(id) ?? 0;
    if (now - last < 0.025) return;
    this.lastPlayed.set(id, now);
    const o: Required<PlayOptions> = { volume: opts.volume ?? 1, pan: opts.pan ?? 0, pitch: opts.pitch ?? 1 };
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, o.pan));
    const gain = ctx.createGain();
    gain.gain.value = o.volume;
    gain.connect(panner).connect(this.sfxBus);
    const sample = this.samples.get(id);
    if (sample) {
      const src = ctx.createBufferSource();
      src.buffer = sample;
      src.playbackRate.value = o.pitch;
      src.connect(gain);
      src.start(now);
      return;
    }
    const gen = SFX[id as SfxId];
    if (!gen) {
      if (!this.warned.has(id)) {
        this.warned.add(id);
        console.error(`Unknown sound "${id}", using fallback`);
      }
      SFX.punch(this, now, gain, o);
      return;
    }
    gen(this, now, gain, o);
  }

  // ---------------------------------------------------------------- synthesis primitives

  tone(out: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, attack = 0.003): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(out: AudioNode, t: number, filter: BiquadFilterType, f0: number, f1: number, dur: number, vol: number, q = 1, attack = 0.002): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bq).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------- music

  playMusic(id: ThemeId): void {
    if (!this.ctx) {
      this.pendingTheme = id;
      return;
    }
    const next = MUSIC_THEMES[id];
    if (this.theme === next) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.musicFader.gain.cancelScheduledValues(t);
    this.musicFader.gain.setValueAtTime(this.musicFader.gain.value, t);
    this.musicFader.gain.linearRampToValueAtTime(0, t + MUSIC_FADE_S);
    window.setTimeout(() => {
      if (!this.ctx) return;
      this.theme = next;
      this.step = 0;
      this.nextStepTime = this.ctx.currentTime + 0.05;
      const now = this.ctx.currentTime;
      this.musicFader.gain.cancelScheduledValues(now);
      this.musicFader.gain.setValueAtTime(0, now);
      this.musicFader.gain.linearRampToValueAtTime(1, now + MUSIC_FADE_S);
      if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), SCHEDULER_MS);
    }, MUSIC_FADE_S * 1000);
  }

  stopMusic(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicFader.gain.cancelScheduledValues(t);
    this.musicFader.gain.setValueAtTime(this.musicFader.gain.value, t);
    this.musicFader.gain.linearRampToValueAtTime(0, t + MUSIC_FADE_S);
    window.setTimeout(() => {
      this.theme = null;
    }, MUSIC_FADE_S * 1000);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const theme = this.theme;
    if (!ctx || !theme) return;
    const stepDur = 60 / theme.bpm / 4;
    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD_S) {
      theme.render(this, this.musicFader, this.nextStepTime, this.step, stepDur);
      this.step++;
      this.nextStepTime += stepDur;
    }
  }

  dispose(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}

const SFX: Record<SfxId, Generator> = {
  hover: (a, t, out, o) => a.tone(out, t, 'triangle', 1400 * o.pitch, 1800 * o.pitch, 0.05, 0.08),
  click: (a, t, out) => {
    a.tone(out, t, 'square', 600, 300, 0.08, 0.12);
    a.noise(out, t, 'highpass', 3000, 2000, 0.05, 0.1);
  },
  back: (a, t, out) => a.tone(out, t, 'triangle', 500, 220, 0.12, 0.12),
  select: (a, t, out) => {
    a.tone(out, t, 'sawtooth', 220, 440, 0.1, 0.1);
    a.noise(out, t, 'bandpass', 1800, 4000, 0.12, 0.12, 2);
  },
  confirm: (a, t, out) => {
    a.tone(out, t, 'sawtooth', 110, 55, 0.6, 0.35);
    a.noise(out, t, 'lowpass', 3000, 200, 0.5, 0.3);
    a.tone(out, t + 0.02, 'square', 440, 880, 0.15, 0.08);
  },
  punch: (a, t, out, o) => {
    a.noise(out, t, 'lowpass', 2400 * o.pitch, 400, 0.09, 0.5);
    a.tone(out, t, 'sine', 160 * o.pitch, 60, 0.1, 0.5);
  },
  kick: (a, t, out, o) => {
    a.noise(out, t, 'lowpass', 1600 * o.pitch, 300, 0.12, 0.5);
    a.tone(out, t, 'sine', 120 * o.pitch, 45, 0.14, 0.6);
  },
  heavy: (a, t, out, o) => {
    a.noise(out, t, 'lowpass', 3200 * o.pitch, 200, 0.22, 0.8);
    a.tone(out, t, 'sine', 110 * o.pitch, 35, 0.28, 0.9);
    a.tone(out, t, 'square', 70, 40, 0.12, 0.15);
  },
  superhit: (a, t, out) => {
    a.noise(out, t, 'lowpass', 5000, 150, 0.6, 0.9);
    a.tone(out, t, 'sine', 90, 28, 0.7, 1);
    a.tone(out, t, 'sawtooth', 220, 55, 0.4, 0.2);
  },
  block: (a, t, out) => {
    a.noise(out, t, 'bandpass', 2600, 1800, 0.08, 0.45, 4);
    a.tone(out, t, 'square', 900, 700, 0.06, 0.08);
  },
  perfect: (a, t, out) => {
    a.tone(out, t, 'sine', 1320, 1320, 0.7, 0.25);
    a.tone(out, t, 'sine', 1980, 1980, 0.6, 0.16);
    a.noise(out, t, 'highpass', 6000, 4000, 0.2, 0.2);
  },
  grab: (a, t, out) => {
    a.noise(out, t, 'bandpass', 900, 500, 0.15, 0.35, 1.5);
    a.tone(out, t, 'sine', 140, 90, 0.12, 0.3);
  },
  throw: (a, t, out) => {
    a.noise(out, t, 'lowpass', 2000, 120, 0.4, 0.8);
    a.tone(out, t, 'sine', 80, 30, 0.45, 0.9);
  },
  slam: (a, t, out) => {
    a.noise(out, t, 'lowpass', 1500, 80, 0.5, 0.9);
    a.tone(out, t, 'sine', 70, 25, 0.55, 1);
  },
  crush: (a, t, out) => {
    a.noise(out, t, 'bandpass', 700, 300, 0.25, 0.6, 2);
    a.tone(out, t, 'sawtooth', 90, 50, 0.2, 0.2);
  },
  special: (a, t, out) => {
    a.tone(out, t, 'sawtooth', 200, 800, 0.25, 0.15);
    a.noise(out, t, 'bandpass', 800, 3000, 0.25, 0.25, 2);
  },
  projectile: (a, t, out) => {
    a.tone(out, t, 'sawtooth', 900, 180, 0.35, 0.18);
    a.tone(out, t, 'square', 450, 120, 0.3, 0.08);
    a.noise(out, t, 'bandpass', 2500, 600, 0.3, 0.2, 3);
  },
  zap: (a, t, out) => {
    for (let i = 0; i < 4; i++) a.tone(out, t + i * 0.025, 'square', 1800 - i * 200, 300, 0.05, 0.08);
    a.noise(out, t, 'highpass', 4000, 2000, 0.2, 0.2);
  },
  slash: (a, t, out, o) => {
    a.noise(out, t, 'highpass', 1800 * o.pitch, 7000, 0.14, 0.5, 0.8);
    a.tone(out, t, 'sawtooth', 1200, 300, 0.1, 0.06);
  },
  blade: (a, t, out) => {
    a.tone(out, t, 'sine', 600, 2400, 0.6, 0.15, 0.2);
    a.noise(out, t, 'bandpass', 3000, 6000, 0.6, 0.15, 6, 0.2);
  },
  whoosh: (a, t, out) => a.noise(out, t, 'bandpass', 600, 2400, 0.14, 0.18, 1.2, 0.03),
  dash: (a, t, out) => {
    a.noise(out, t, 'bandpass', 400, 3000, 0.25, 0.4, 1, 0.02);
    a.tone(out, t, 'sawtooth', 120, 400, 0.2, 0.1);
  },
  teleport: (a, t, out) => {
    a.tone(out, t, 'sine', 300, 1600, 0.25, 0.2);
    a.tone(out, t + 0.05, 'triangle', 1600, 200, 0.25, 0.12);
  },
  charge: (a, t, out) => {
    a.tone(out, t, 'sawtooth', 80, 640, 0.7, 0.2, 0.3);
    a.noise(out, t, 'bandpass', 300, 3000, 0.7, 0.18, 3, 0.3);
  },
  super: (a, t, out) => {
    a.tone(out, t, 'sawtooth', 55, 440, 0.8, 0.3, 0.05);
    a.tone(out, t, 'square', 110, 880, 0.8, 0.1, 0.05);
    a.noise(out, t, 'lowpass', 400, 6000, 0.8, 0.3, 1, 0.1);
  },
  burst: (a, t, out) => {
    a.noise(out, t, 'lowpass', 6000, 300, 0.4, 0.7);
    a.tone(out, t, 'sine', 200, 50, 0.4, 0.6);
  },
  explosion: (a, t, out) => {
    a.noise(out, t, 'lowpass', 4000, 60, 1.1, 1);
    a.tone(out, t, 'sine', 70, 20, 1, 1);
  },
  rocket: (a, t, out) => {
    a.noise(out, t, 'bandpass', 500, 2500, 0.4, 0.5, 1);
    a.tone(out, t, 'sawtooth', 60, 200, 0.4, 0.2);
  },
  servo: (a, t, out) => {
    a.tone(out, t, 'square', 180, 320, 0.2, 0.1);
    a.tone(out, t + 0.1, 'square', 320, 180, 0.2, 0.1);
  },
  counter: (a, t, out) => {
    a.tone(out, t, 'sine', 880, 660, 0.3, 0.12);
    a.noise(out, t, 'highpass', 5000, 3000, 0.15, 0.1);
  },
  summon: (a, t, out) => {
    a.tone(out, t, 'sawtooth', 70, 140, 0.6, 0.25, 0.1);
    a.noise(out, t, 'lowpass', 200, 1200, 0.6, 0.3, 2, 0.1);
  },
  ko: (a, t, out) => {
    a.noise(out, t, 'lowpass', 3000, 40, 1.6, 1);
    a.tone(out, t, 'sine', 65, 22, 1.6, 1);
    a.tone(out, t, 'sawtooth', 130, 33, 1.2, 0.25);
  },
  victory: (a, t, out) => {
    [0, 4, 7, 12].forEach((n, i) => a.tone(out, t + i * 0.09, 'sawtooth', 220 * Math.pow(2, n / 12), 220 * Math.pow(2, n / 12), 0.6, 0.12));
  },
  countdown: (a, t, out) => a.tone(out, t, 'square', 880, 880, 0.12, 0.12),
  round: (a, t, out) => {
    a.tone(out, t, 'sine', 98, 92, 1.4, 0.6, 0.01);
    a.tone(out, t, 'sine', 196, 188, 1.2, 0.25, 0.01);
    a.noise(out, t, 'bandpass', 600, 300, 1.0, 0.3, 3);
  },
  fight: (a, t, out) => {
    a.noise(out, t, 'lowpass', 6000, 300, 0.5, 0.8);
    a.tone(out, t, 'sawtooth', 110, 55, 0.6, 0.4);
    a.tone(out, t, 'square', 220, 110, 0.4, 0.15);
  },
  wall: (a, t, out) => {
    a.noise(out, t, 'bandpass', 1400, 600, 0.3, 0.6, 5);
    a.tone(out, t, 'square', 210, 190, 0.25, 0.12);
    a.tone(out, t, 'square', 317, 300, 0.25, 0.08);
  },
  phase2: (a, t, out) => {
    for (let i = 0; i < 3; i++) a.tone(out, t + i * 0.35, 'sawtooth', 440, 330, 0.3, 0.2);
    a.tone(out, t, 'sine', 50, 30, 1.4, 0.8);
  },
  clash: (a, t, out) => {
    a.noise(out, t, 'bandpass', 3000, 1000, 0.3, 0.6, 6);
    a.tone(out, t, 'triangle', 1200, 1100, 0.4, 0.15);
  },
  land: (a, t, out) => a.noise(out, t, 'lowpass', 600, 100, 0.12, 0.3),
  jump: (a, t, out) => a.noise(out, t, 'bandpass', 400, 900, 0.1, 0.12, 1),
  tech: (a, t, out) => {
    a.noise(out, t, 'bandpass', 2000, 1200, 0.15, 0.4, 4);
    a.tone(out, t, 'triangle', 700, 900, 0.15, 0.12);
  },
  combo: (a, t, out, o) => a.tone(out, t, 'square', 660 * o.pitch, 990 * o.pitch, 0.08, 0.06),
};
