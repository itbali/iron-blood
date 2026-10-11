/**
 * Procedural WebAudio sound design. Every sound is synthesized so no asset files are needed;
 * `play(name)` is the only entry point gameplay code uses, so real samples can replace the
 * synth table later without touching combat code.
 */
export type SoundName =
  | 'menu-hover'
  | 'menu-click'
  | 'menu-back'
  | 'punch'
  | 'kick'
  | 'heavy-hit'
  | 'heavy-kick'
  | 'block'
  | 'perfect-block'
  | 'grab'
  | 'throw'
  | 'special'
  | 'projectile'
  | 'dash'
  | 'teleport'
  | 'slam'
  | 'cannon'
  | 'counter'
  | 'super'
  | 'ko'
  | 'victory'
  | 'countdown'
  | 'round-start'
  | 'fight'
  | 'whoosh'
  | 'jump'
  | 'land'
  | 'wall'
  | 'finisher'
  | 'boss-phase'
  | 'armor'
  | 'select';

export type MusicName = 'menu' | 'battle' | 'battle-boss' | 'victory' | 'none';

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
}

interface MusicPattern {
  bpm: number;
  bass: number[];
  lead: number[];
  kick: boolean[];
  snare: boolean[];
  hat: boolean[];
  drone: number;
  color: 'dark' | 'bright';
}

const NOTE = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

const PATTERNS: Record<Exclude<MusicName, 'none'>, MusicPattern> = {
  menu: {
    bpm: 84,
    bass: [36, 36, 39, 36, 36, 36, 41, 39],
    lead: [60, 0, 63, 0, 62, 0, 58, 0],
    kick: [true, false, false, false, true, false, false, false],
    snare: [false, false, false, false, false, false, false, false],
    hat: [false, true, false, true, false, true, false, true],
    drone: 36,
    color: 'dark',
  },
  battle: {
    bpm: 150,
    bass: [36, 36, 48, 36, 39, 39, 36, 41, 36, 36, 48, 36, 43, 41, 39, 38],
    lead: [0, 60, 0, 63, 0, 67, 65, 0, 0, 60, 0, 63, 0, 70, 67, 65],
    kick: [true, false, false, false, true, false, true, false, true, false, false, false, true, false, false, true],
    snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    hat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    drone: 24,
    color: 'dark',
  },
  'battle-boss': {
    bpm: 168,
    bass: [31, 31, 31, 34, 31, 31, 37, 36, 31, 31, 31, 34, 31, 38, 37, 36],
    lead: [67, 0, 67, 0, 70, 0, 72, 0, 67, 0, 74, 0, 70, 0, 68, 0],
    kick: [true, false, true, false, true, false, true, false, true, false, true, false, true, true, false, true],
    snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, true],
    hat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    drone: 19,
    color: 'bright',
  },
  victory: {
    bpm: 100,
    bass: [36, 0, 43, 0, 41, 0, 48, 0],
    lead: [60, 64, 67, 72, 71, 67, 64, 60],
    kick: [true, false, false, false, true, false, false, false],
    snare: [false, false, true, false, false, false, true, false],
    hat: [false, false, false, false, false, false, false, false],
    drone: 36,
    color: 'bright',
  },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private settings: AudioSettings = { master: 0.8, music: 0.6, sfx: 0.9 };
  private current: MusicName = 'none';
  private step = 0;
  private nextStepTime = 0;
  private timer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastPlay = new Map<string, number>();
  muted = false;

  /** Must be called from a user gesture to unlock the AudioContext. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applySettings(this.settings);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      if (this.current !== 'none') this.startSequencer();
    } catch (err) {
      console.error('Audio initialization failed; continuing silently', err);
      this.ctx = null;
    }
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  applySettings(s: AudioSettings): void {
    this.settings = s;
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    this.master.gain.value = this.muted ? 0 : s.master;
    this.musicGain.gain.value = s.music * 0.5;
    this.sfxGain.gain.value = s.sfx;
  }

  private noise(duration: number, gain: number, filterHz: number, type: BiquadFilterType = 'lowpass', when = 0): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterHz;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime + when;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  private tone(freq: number, duration: number, gain: number, type: OscillatorType = 'sine', slideTo?: number, when = 0, dest?: AudioNode): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    const t = this.ctx.currentTime + when;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(dest ?? this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  play(name: SoundName): void {
    if (!this.ctx || !this.ready) return;
    // Rate-limit identical sounds so multi-hits do not stack into a wall of noise.
    const now = this.ctx.currentTime;
    const last = this.lastPlay.get(name) ?? -1;
    if (now - last < 0.03) return;
    this.lastPlay.set(name, now);
    switch (name) {
      case 'menu-hover':
        this.tone(900, 0.06, 0.05, 'square', 1200);
        break;
      case 'menu-click':
        this.tone(500, 0.1, 0.12, 'square', 250);
        this.noise(0.08, 0.1, 3000, 'highpass');
        break;
      case 'menu-back':
        this.tone(400, 0.12, 0.1, 'square', 180);
        break;
      case 'select':
        this.tone(660, 0.12, 0.12, 'square', 990);
        this.noise(0.1, 0.1, 4000, 'highpass');
        break;
      case 'punch':
        this.noise(0.09, 0.5, 900);
        this.tone(180, 0.08, 0.35, 'triangle', 60);
        break;
      case 'kick':
        this.noise(0.12, 0.5, 600);
        this.tone(140, 0.1, 0.4, 'triangle', 50);
        break;
      case 'heavy-hit':
        this.noise(0.2, 0.8, 500);
        this.tone(120, 0.22, 0.6, 'triangle', 35);
        this.tone(60, 0.3, 0.4, 'sine', 30);
        break;
      case 'heavy-kick':
        this.noise(0.22, 0.8, 420);
        this.tone(100, 0.25, 0.6, 'triangle', 30);
        break;
      case 'block':
        this.noise(0.08, 0.3, 2500, 'bandpass');
        this.tone(320, 0.08, 0.2, 'square', 200);
        break;
      case 'perfect-block':
        this.tone(1200, 0.25, 0.25, 'sine', 2400);
        this.tone(1800, 0.3, 0.15, 'triangle', 3600, 0.02);
        this.noise(0.15, 0.3, 5000, 'highpass');
        break;
      case 'grab':
        this.noise(0.12, 0.4, 1200);
        this.tone(220, 0.15, 0.3, 'sawtooth', 110);
        break;
      case 'throw':
        this.noise(0.3, 0.7, 500);
        this.tone(90, 0.3, 0.5, 'triangle', 30);
        break;
      case 'special':
        this.tone(300, 0.3, 0.3, 'sawtooth', 900);
        this.noise(0.25, 0.4, 1500, 'bandpass');
        break;
      case 'projectile':
        this.tone(700, 0.25, 0.25, 'sawtooth', 200);
        this.noise(0.2, 0.3, 2500, 'highpass');
        break;
      case 'dash':
        this.noise(0.3, 0.5, 1800, 'bandpass');
        this.tone(200, 0.3, 0.25, 'sawtooth', 600);
        break;
      case 'teleport':
        this.tone(1400, 0.2, 0.2, 'sine', 200);
        this.tone(300, 0.25, 0.2, 'triangle', 1800, 0.05);
        this.noise(0.2, 0.25, 4000, 'highpass');
        break;
      case 'slam':
        this.noise(0.4, 0.9, 300);
        this.tone(70, 0.4, 0.7, 'sine', 25);
        break;
      case 'cannon':
        this.noise(0.35, 0.8, 700);
        this.tone(160, 0.35, 0.5, 'sawtooth', 40);
        break;
      case 'counter':
        this.tone(880, 0.15, 0.2, 'square', 440);
        this.tone(1320, 0.2, 0.15, 'square', 660, 0.05);
        break;
      case 'super':
        this.tone(100, 0.8, 0.5, 'sawtooth', 50);
        this.tone(400, 0.6, 0.3, 'square', 1600, 0.05);
        this.noise(0.6, 0.6, 1200, 'bandpass');
        break;
      case 'ko':
        this.noise(0.6, 0.9, 400);
        this.tone(80, 0.7, 0.7, 'triangle', 20);
        this.tone(55, 0.9, 0.5, 'sine', 20, 0.1);
        break;
      case 'victory':
        for (let i = 0; i < 4; i++) this.tone(NOTE(60 + [0, 4, 7, 12][i]!), 0.5, 0.18, 'square', undefined, i * 0.12);
        break;
      case 'countdown':
        this.tone(440, 0.15, 0.2, 'square');
        break;
      case 'round-start':
        this.tone(220, 0.4, 0.3, 'square', 110);
        this.noise(0.3, 0.3, 800);
        break;
      case 'fight':
        this.tone(330, 0.5, 0.35, 'sawtooth', 165);
        this.noise(0.5, 0.5, 1200, 'bandpass');
        this.tone(110, 0.6, 0.4, 'triangle', 40);
        break;
      case 'whoosh':
        this.noise(0.14, 0.18, 1500, 'bandpass');
        break;
      case 'jump':
        this.noise(0.1, 0.12, 1200, 'bandpass');
        this.tone(220, 0.1, 0.08, 'triangle', 440);
        break;
      case 'land':
        this.noise(0.08, 0.2, 500);
        break;
      case 'wall':
        this.noise(0.25, 0.6, 350);
        this.tone(90, 0.25, 0.4, 'triangle', 40);
        break;
      case 'finisher':
        this.tone(60, 1.2, 0.6, 'sawtooth', 30);
        this.noise(1, 0.7, 800, 'bandpass');
        this.tone(900, 0.8, 0.25, 'sine', 100, 0.1);
        break;
      case 'boss-phase':
        this.tone(55, 1.5, 0.6, 'sawtooth', 110);
        this.noise(1.2, 0.5, 600, 'bandpass');
        break;
      case 'armor':
        this.tone(500, 0.12, 0.3, 'square', 250);
        this.noise(0.1, 0.4, 3000, 'bandpass');
        break;
    }
  }

  playMusic(name: MusicName): void {
    if (this.current === name) return;
    this.current = name;
    this.step = 0;
    if (!this.ctx) return;
    if (name === 'none') {
      this.stopSequencer();
      return;
    }
    this.startSequencer();
  }

  private startSequencer(): void {
    if (!this.ctx) return;
    this.stopSequencer();
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  private stopSequencer(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    if (!this.ctx || !this.musicGain || this.current === 'none') return;
    const pattern = PATTERNS[this.current];
    const stepDur = 60 / pattern.bpm / 2;
    while (this.nextStepTime < this.ctx.currentTime + 0.2) {
      this.playStep(pattern, this.step % pattern.bass.length, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  private playStep(p: MusicPattern, i: number, t: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const when = t - this.ctx.currentTime;
    const bass = p.bass[i] ?? 0;
    if (bass) this.tone(NOTE(bass), dur * 0.9, 0.22, 'sawtooth', NOTE(bass) * 0.99, when, this.musicGain);
    const lead = p.lead[i] ?? 0;
    if (lead) this.tone(NOTE(lead), dur * 1.6, p.color === 'bright' ? 0.1 : 0.07, 'square', undefined, when, this.musicGain);
    if (p.kick[i]) this.tone(110, 0.18, 0.5, 'sine', 35, when, this.musicGain);
    if (p.snare[i]) this.noiseTo(0.12, 0.25, 1800, 'bandpass', when, this.musicGain);
    if (p.hat[i]) this.noiseTo(0.04, 0.07, 7000, 'highpass', when, this.musicGain);
    if (i === 0) this.tone(NOTE(p.drone), dur * p.bass.length, 0.08, 'triangle', undefined, when, this.musicGain);
  }

  private noiseTo(duration: number, gain: number, filterHz: number, type: BiquadFilterType, when: number, dest: AudioNode): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterHz;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime + when;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(g).connect(dest);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  dispose(): void {
    this.stopSequencer();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audio = new AudioManager();
