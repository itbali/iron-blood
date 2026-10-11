import type { AudioManager } from './AudioManager';

export type ThemeId = 'menu' | 'battle' | 'boss' | 'boss2' | 'victory';

export interface MusicTheme {
  id: ThemeId;
  bpm: number;
  render: (a: AudioManager, out: AudioNode, t: number, step: number, stepDur: number) => void;
}

interface ThemeSpec {
  id: ThemeId;
  bpm: number;
  /** One root (MIDI) and chord per bar. */
  bars: { root: number; chord: number[] }[];
  kick: number[];
  snare: number[];
  hat: 0 | 8 | 16;
  /** 0 = rest, 1 = root, 2 = octave up, 3 = fifth. */
  bass: number[];
  bassType: OscillatorType;
  bassVol: number;
  padVol: number;
  padType: OscillatorType;
  lead?: { every: number; type: OscillatorType; vol: number; octave: number; bars?: number[]; pattern?: number[] };
  metal?: number[];
  alarm?: boolean;
}

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

const kickDrum = (a: AudioManager, out: AudioNode, t: number, vol = 0.9) => {
  a.tone(out, t, 'sine', 150, 42, 0.22, vol);
  a.noise(out, t, 'lowpass', 900, 100, 0.04, vol * 0.4);
};
const snareDrum = (a: AudioManager, out: AudioNode, t: number) => {
  a.noise(out, t, 'bandpass', 1800, 900, 0.16, 0.5, 0.8);
  a.tone(out, t, 'triangle', 220, 160, 0.08, 0.25);
};
const hat = (a: AudioManager, out: AudioNode, t: number, open: boolean) =>
  a.noise(out, t, 'highpass', 8000, 7000, open ? 0.12 : 0.035, open ? 0.12 : 0.08);
const metalHit = (a: AudioManager, out: AudioNode, t: number) => {
  a.noise(out, t, 'bandpass', 2200, 1600, 0.5, 0.18, 9);
  a.tone(out, t, 'square', 311, 305, 0.5, 0.04);
};

const build = (s: ThemeSpec): MusicTheme => ({
  id: s.id,
  bpm: s.bpm,
  render: (a, out, t, step, dur) => {
    const barIdx = Math.floor(step / 16) % s.bars.length;
    const bar = s.bars[barIdx];
    const st = step % 16;
    if (s.kick.includes(st)) kickDrum(a, out, t);
    if (s.snare.includes(st)) snareDrum(a, out, t);
    if (s.hat === 16 || (s.hat === 8 && st % 2 === 0)) hat(a, out, t, st % 4 === 2);
    if (s.metal?.includes(st)) metalHit(a, out, t);
    const b = s.bass[st];
    if (b) {
      const n = bar.root + (b === 2 ? 12 : b === 3 ? 7 : 0);
      a.tone(out, t, s.bassType, midi(n), midi(n), dur * 1.6, s.bassVol, 0.005);
    }
    if (st === 0 && s.padVol > 0) {
      for (const iv of bar.chord) a.tone(out, t, s.padType, midi(bar.root + 24 + iv), midi(bar.root + 24 + iv) * 1.003, dur * 15, s.padVol, dur * 4);
    }
    const l = s.lead;
    if (l && st % l.every === 0 && (!l.bars || l.bars.includes(barIdx))) {
      const pattern = l.pattern ?? [0, 1, 2, 1];
      const idx = pattern[(st / l.every) % pattern.length];
      const iv = bar.chord[idx % bar.chord.length] + (idx >= bar.chord.length ? 12 : 0);
      const f = midi(bar.root + 12 * l.octave + iv);
      a.tone(out, t, l.type, f, f, dur * l.every * 0.9, l.vol, 0.004);
    }
    if (s.alarm && st % 8 === 0) a.tone(out, t, 'sawtooth', midi(bar.root + 36), midi(bar.root + 37), dur * 4, 0.05, 0.01);
  },
});

const MINOR = [0, 3, 7];
const MAJOR = [0, 4, 7];

export const MUSIC_THEMES: Record<ThemeId, MusicTheme> = {
  menu: build({
    id: 'menu',
    bpm: 72,
    bars: [
      { root: 38, chord: MINOR },
      { root: 34, chord: MAJOR },
      { root: 31, chord: MINOR },
      { root: 33, chord: MAJOR },
    ],
    kick: [0],
    snare: [],
    hat: 0,
    metal: [8],
    bass: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
    bassType: 'sawtooth',
    bassVol: 0.18,
    padVol: 0.05,
    padType: 'sawtooth',
    lead: { every: 4, type: 'triangle', vol: 0.06, octave: 3, pattern: [0, 2, 1, 3] },
  }),
  battle: build({
    id: 'battle',
    bpm: 140,
    bars: [
      { root: 40, chord: MINOR },
      { root: 36, chord: MAJOR },
      { root: 38, chord: MAJOR },
      { root: 35, chord: MINOR },
    ],
    kick: [0, 4, 8, 12, 14],
    snare: [4, 12],
    hat: 16,
    metal: [10],
    bass: [1, 0, 2, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1, 2, 1],
    bassType: 'sawtooth',
    bassVol: 0.2,
    padVol: 0.025,
    padType: 'sawtooth',
    lead: { every: 2, type: 'square', vol: 0.035, octave: 2, bars: [2, 3], pattern: [0, 1, 2, 3, 2, 1] },
  }),
  boss: build({
    id: 'boss',
    bpm: 146,
    bars: [
      { root: 40, chord: [0, 1, 7] },
      { root: 41, chord: MAJOR },
      { root: 40, chord: [0, 1, 7] },
      { root: 43, chord: MAJOR },
    ],
    kick: [0, 3, 6, 8, 11, 14],
    snare: [4, 12],
    hat: 8,
    metal: [7, 15],
    bass: [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
    bassType: 'sawtooth',
    bassVol: 0.17,
    padVol: 0.04,
    padType: 'sawtooth',
    lead: { every: 4, type: 'sawtooth', vol: 0.04, octave: 2, pattern: [0, 1, 0, 2] },
  }),
  boss2: build({
    id: 'boss2',
    bpm: 164,
    bars: [
      { root: 40, chord: [0, 1, 7] },
      { root: 41, chord: [0, 1, 7] },
      { root: 43, chord: MINOR },
      { root: 41, chord: [0, 1, 7] },
    ],
    kick: [0, 2, 4, 6, 8, 10, 12, 13, 14, 15],
    snare: [4, 12],
    hat: 16,
    metal: [3, 11],
    bass: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 3, 2, 1],
    bassType: 'square',
    bassVol: 0.14,
    padVol: 0.04,
    padType: 'sawtooth',
    lead: { every: 2, type: 'sawtooth', vol: 0.035, octave: 2, pattern: [0, 1, 2, 1] },
    alarm: true,
  }),
  victory: build({
    id: 'victory',
    bpm: 108,
    bars: [
      { root: 48, chord: MAJOR },
      { root: 43, chord: MAJOR },
      { root: 45, chord: MINOR },
      { root: 41, chord: MAJOR },
    ],
    kick: [0, 8],
    snare: [4, 12],
    hat: 8,
    bass: [1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 0, 2, 0, 3, 0, 0],
    bassType: 'triangle',
    bassVol: 0.25,
    padVol: 0.05,
    padType: 'triangle',
    lead: { every: 2, type: 'triangle', vol: 0.07, octave: 3, pattern: [0, 1, 2, 3, 2, 1, 0, 2] },
  }),
};
