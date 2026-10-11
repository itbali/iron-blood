import type { SfxId } from '../combat/types';

export type MusicTrack = 'menu' | 'battle' | 'victory' | 'boss' | 'boss2' | 'none';

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
}

interface TrackDef {
  bpm: number;
  kick: string;
  snare: string;
  hat: string;
  bass: string;
  lead: string;
  /** Scale degrees (semitones from root) used by bass/lead. */
  scale: number[];
  pad: boolean;
  swell: boolean;
  leadWave: OscillatorType;
}

const TRACKS: Record<Exclude<MusicTrack, 'none'>, TrackDef> = {
  menu: {
    bpm: 72, kick: 'x...............', snare: '................', hat: '..........x.....', bass: '0.......0...3...',
    lead: '0...2...3...5...', scale: [0, 1, 3, 5, 7, 8, 10], pad: true, swell: true, leadWave: 'triangle',
  },
  battle: {
    bpm: 128, kick: 'x...x...x...x..x', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx', bass: '0.00.0.30.00.5.3.',
    lead: '0.......3.......', scale: [0, 1, 3, 5, 7, 8, 10], pad: true, swell: false, leadWave: 'sawtooth',
  },
  boss: {
    bpm: 140, kick: 'x..xx..xx..xx.x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', bass: '0.0.0.60.0.0.6.1.',
    lead: '0.3.5.3.0.6.5.3.', scale: [0, 1, 3, 6, 7, 8, 11], pad: true, swell: false, leadWave: 'sawtooth',
  },
  boss2: {
    bpm: 164, kick: 'x.xxx.xxx.xxx.xx', snare: '....x..x....x..x', hat: 'xxxxxxxxxxxxxxxx', bass: '0.0.0.60.0.0.61.0',
    lead: '0.3.5.6.8.6.5.3.', scale: [0, 1, 3, 6, 7, 8, 11], pad: true, swell: false, leadWave: 'sawtooth',
  },
  victory: {
    bpm: 84, kick: 'x...............', snare: '................', hat: '................', bass: '0.......3.......',
    lead: '0..2.3.5.7...5.3', scale: [0, 2, 3, 5, 7, 8, 10], pad: true, swell: false, leadWave: 'triangle',
  },
};

const mtof = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

type AudioCtor = typeof AudioContext;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private volumes: Volumes = { master: 0.8, music: 0.6, sfx: 0.9 };
  private track: MusicTrack = 'none';
  private root = 38;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private padNodes: { stop: () => void } | null = null;
  readonly supported: boolean;
  private lastPlay: Partial<Record<SfxId, number>> = {};

  constructor() {
    const g = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    this.supported = typeof g.AudioContext !== 'undefined' || typeof g.webkitAudioContext !== 'undefined';
  }

  /** Must be called from a user gesture before sound can play. */
  unlock(): void {
    if (!this.supported) return;
    if (!this.ctx) {
      try {
        const g = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
        const Ctor = (g.AudioContext ?? g.webkitAudioContext) as AudioCtor;
        this.ctx = new Ctor();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 6;
        this.master = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.applyVolumes();
      } catch (err) {
        console.error('Audio init failed', err);
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.track !== 'none' && !this.timer) this.startScheduler();
  }

  setVolumes(v: Volumes): void {
    this.volumes = { ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    this.master.gain.value = this.volumes.master;
    this.musicGain.gain.value = this.volumes.music * 0.5;
    this.sfxGain.gain.value = this.volumes.sfx;
  }

  setTrack(track: MusicTrack, root = 38): void {
    if (track === this.track && root === this.root) return;
    this.track = track;
    this.root = root;
    this.step = 0;
    this.stopPad();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (track === 'none' || !this.ctx) return;
    this.startScheduler();
  }

  currentTrack(): MusicTrack {
    return this.track;
  }

  private startScheduler(): void {
    if (!this.ctx || this.track === 'none') return;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.startPad();
    this.timer = setInterval(() => this.schedule(), 40);
  }

  private startPad(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || this.track === 'none') return;
    const def = TRACKS[this.track];
    if (!def.pad) return;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(this.track === 'victory' ? 0.22 : 0.14, ctx.currentTime + 2);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = this.track === 'menu' ? 500 : 800;
    const oscs: OscillatorNode[] = [];
    const notes = [this.root, this.root + 7, this.root + 12 + (def.scale[2] ?? 3)];
    for (const n of notes) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(n);
        o.detune.value = det;
        o.connect(filt);
        o.start();
        oscs.push(o);
      }
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(filt.frequency);
    lfo.start();
    filt.connect(g);
    g.connect(this.musicGain);
    this.padNodes = {
      stop: () => {
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + 0.4);
        for (const o of oscs) o.stop(t + 0.5);
        lfo.stop(t + 0.5);
      },
    };
  }

  private stopPad(): void {
    this.padNodes?.stop();
    this.padNodes = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || this.track === 'none') return;
    const def = TRACKS[this.track];
    const stepDur = 60 / def.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.18) {
      this.playStep(def, this.step % 16, this.nextTime, Math.floor(this.step / 16));
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private playStep(def: TrackDef, i: number, t: number, bar: number): void {
    const root = this.root;
    if (def.kick[i] === 'x') this.kick(t, 0.9);
    if (def.snare[i] === 'x') this.snare(t, 0.5);
    if (def.hat[i] === 'x') this.hat(t, i % 4 === 0 ? 0.22 : 0.12);
    const b = def.bass[i];
    if (b !== '.' && b !== undefined) {
      const deg = def.scale[parseInt(b, 10) % def.scale.length] ?? 0;
      this.bass(t, mtof(root - 12 + deg), 60 / def.bpm / 3.2);
    }
    const l = def.lead[i];
    if (l !== '.' && l !== undefined && (this.track !== 'battle' || bar % 2 === 1)) {
      const deg = def.scale[parseInt(l, 10) % def.scale.length] ?? 0;
      this.lead(t, mtof(root + 24 + deg), 60 / def.bpm / 2.2, def.leadWave);
    }
    if (def.swell && i === 0 && bar % 2 === 0) this.swell(t, 60 / def.bpm * 6);
  }

  private env(g: GainNode, t: number, attack: number, peak: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private kick(t: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.002, vol * 0.8, 0.22);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.3);
  }

  private noiseNode(t: number, dur: number, type: BiquadFilterType, freq: number, vol: number, dest: AudioNode, q = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.002, vol, dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private snare(t: number, vol: number): void {
    if (!this.musicGain) return;
    this.noiseNode(t, 0.14, 'highpass', 1800, vol * 0.5, this.musicGain);
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    this.env(g, t, 0.001, vol * 0.4, 0.1);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.15);
  }

  private hat(t: number, vol: number): void {
    if (this.musicGain) this.noiseNode(t, 0.04, 'highpass', 7000, vol * 0.6, this.musicGain);
  }

  private bass(t: number, f: number, dur: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(180, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.005, 0.38, dur);
    o.connect(filt);
    filt.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private lead(t: number, f: number, dur: number, wave: OscillatorType): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = f;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2200;
    const g = ctx.createGain();
    this.env(g, t, 0.01, 0.12, dur);
    o.connect(filt);
    filt.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private swell(t: number, dur: number): void {
    if (!this.musicGain) return;
    this.noiseNode(t, dur, 'bandpass', 600, 0.12, this.musicGain, 3);
  }

  /** Play a one-shot sound effect. Silent before the first user gesture. */
  play(id: SfxId, opts: { pitch?: number; vol?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const last = this.lastPlay[id] ?? -1;
    if (now - last < 0.035 && id !== 'ko') return;
    this.lastPlay[id] = now;
    const pitch = opts.pitch ?? 1;
    const vol = opts.vol ?? 1;
    const out = this.sfxGain;
    const t = now;
    const osc = (type: OscillatorType, f0: number, f1: number, dur: number, v: number, delay = 0): void => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0 * pitch, t + delay);
      o.frequency.exponentialRampToValueAtTime(Math.max(10, f1 * pitch), t + delay + dur);
      this.env(g, t + delay, 0.003, v * vol, dur);
      o.connect(g);
      g.connect(out);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.05);
    };
    const noise = (type: BiquadFilterType, f: number, dur: number, v: number, delay = 0, q = 1): void =>
      this.noiseNode(t + delay, dur, type, f * pitch, v * vol, out, q);

    switch (id) {
      case 'punch':
        noise('bandpass', 1100, 0.09, 0.7);
        osc('sine', 180, 60, 0.1, 0.7);
        break;
      case 'kick':
        noise('lowpass', 900, 0.12, 0.8);
        osc('sine', 130, 45, 0.14, 0.8);
        break;
      case 'heavy-hit':
        noise('lowpass', 1400, 0.2, 0.9);
        osc('sine', 110, 28, 0.28, 1.0);
        osc('square', 200, 50, 0.1, 0.25);
        break;
      case 'block':
        osc('square', 900, 780, 0.07, 0.25);
        osc('square', 1380, 1200, 0.06, 0.2);
        noise('highpass', 3000, 0.07, 0.4);
        break;
      case 'perfect-block':
        osc('sine', 1300, 2000, 0.4, 0.5);
        osc('sine', 1950, 2900, 0.3, 0.3, 0.02);
        noise('highpass', 5000, 0.18, 0.5);
        break;
      case 'grab':
        noise('bandpass', 400, 0.18, 0.6);
        osc('sine', 100, 70, 0.15, 0.7, 0.08);
        break;
      case 'throw':
        noise('bandpass', 700, 0.25, 0.5);
        osc('sine', 90, 30, 0.3, 0.9, 0.12);
        break;
      case 'special':
        osc('sawtooth', 180, 900, 0.28, 0.35);
        noise('bandpass', 1500, 0.25, 0.3, 0, 2);
        break;
      case 'projectile':
        osc('sawtooth', 1100, 220, 0.22, 0.3);
        noise('highpass', 2500, 0.15, 0.25);
        break;
      case 'ko':
        osc('sine', 70, 22, 1.1, 1.1);
        noise('lowpass', 800, 0.9, 0.9);
        osc('sawtooth', 300, 40, 0.6, 0.3);
        break;
      case 'victory':
        [0, 4, 7, 12].forEach((s, i) => osc('triangle', 330 * Math.pow(2, s / 12), 330 * Math.pow(2, s / 12), 0.5, 0.3, i * 0.11));
        break;
      case 'countdown':
        osc('square', 440, 440, 0.12, 0.25);
        break;
      case 'round-start':
        osc('sawtooth', 110, 112, 0.6, 0.4);
        osc('sawtooth', 165, 168, 0.6, 0.3);
        noise('lowpass', 500, 0.5, 0.4);
        break;
      case 'menu-hover':
        osc('triangle', 660, 700, 0.05, 0.25);
        break;
      case 'menu-click':
        osc('square', 220, 440, 0.08, 0.3);
        noise('highpass', 2000, 0.05, 0.3);
        break;
      case 'whoosh':
        noise('bandpass', 1200, 0.16, 0.35, 0, 0.8);
        break;
      case 'wall':
        osc('sine', 90, 35, 0.2, 0.8);
        noise('lowpass', 600, 0.15, 0.7);
        break;
      case 'jump':
        noise('bandpass', 900, 0.1, 0.2);
        break;
      case 'land':
        osc('sine', 80, 40, 0.1, 0.4);
        noise('lowpass', 500, 0.08, 0.3);
        break;
      case 'super':
        osc('sawtooth', 100, 1200, 0.7, 0.4);
        osc('sine', 60, 30, 0.9, 0.9, 0.6);
        noise('bandpass', 2000, 0.6, 0.35, 0, 2);
        break;
      case 'teleport':
        osc('sine', 2000, 160, 0.2, 0.35);
        noise('highpass', 4000, 0.12, 0.35);
        break;
      case 'finisher':
        osc('sine', 60, 20, 1.4, 1.1);
        [0, 3, 7, 10].forEach((s, i) => osc('sawtooth', 110 * Math.pow(2, s / 12), 110 * Math.pow(2, s / 12), 1.2, 0.12, i * 0.03));
        noise('lowpass', 700, 1.0, 0.7);
        break;
      case 'announce':
        osc('sine', 70, 68, 1.2, 0.8);
        osc('sine', 143, 141, 1.0, 0.3);
        osc('sine', 211, 209, 0.8, 0.2);
        break;
      case 'phase':
        osc('sawtooth', 200, 700, 0.5, 0.35);
        osc('sawtooth', 205, 710, 0.5, 0.3);
        noise('bandpass', 900, 0.5, 0.3, 0, 2);
        break;
    }
  }
}
