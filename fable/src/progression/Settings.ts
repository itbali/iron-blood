import { SETTINGS_KEY } from '@/core/constants';
import { DEFAULT_P1_BINDINGS, DEFAULT_P2_BINDINGS, isValidBindings, type KeyBindings } from '@/input/KeyBindings';
import { Store } from '@/state/store';

export type Quality = 'low' | 'medium' | 'high';

export interface GameSettings {
  graphics: {
    quality: Quality;
    particles: boolean;
    screenShake: boolean;
    motionBlur: boolean;
    effects: boolean;
  };
  audio: {
    master: number;
    music: number;
    sfx: number;
  };
  controls: {
    p1: KeyBindings;
    p2: KeyBindings;
  };
  accessibility: {
    colorblind: boolean;
    reducedMotion: boolean;
    reducedFlashes: boolean;
    subtitles: boolean;
  };
  gameplay: {
    difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
    finishers: boolean;
  };
}

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: { quality: 'high', particles: true, screenShake: true, motionBlur: true, effects: true },
  audio: { master: 0.8, music: 0.6, sfx: 0.9 },
  controls: { p1: { ...DEFAULT_P1_BINDINGS }, p2: { ...DEFAULT_P2_BINDINGS } },
  accessibility: { colorblind: false, reducedMotion: false, reducedFlashes: false, subtitles: true },
  gameplay: { difficulty: 'normal', finishers: true },
};

const clamp01 = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Validates an arbitrary parsed object into a complete settings object, falling back per field. */
export const sanitizeSettings = (raw: unknown): GameSettings => {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== 'object') return structuredClone(d);
  const r = raw as Record<string, Record<string, unknown>>;
  const g = r.graphics ?? {};
  const a = r.audio ?? {};
  const c = r.controls ?? {};
  const acc = r.accessibility ?? {};
  const gp = r.gameplay ?? {};
  const quality = (['low', 'medium', 'high'] as const).includes(g.quality as Quality) ? (g.quality as Quality) : d.graphics.quality;
  const difficulty = (['easy', 'normal', 'hard', 'nightmare'] as const).includes(gp.difficulty as GameSettings['gameplay']['difficulty'])
    ? (gp.difficulty as GameSettings['gameplay']['difficulty'])
    : d.gameplay.difficulty;
  return {
    graphics: {
      quality,
      particles: bool(g.particles, d.graphics.particles),
      screenShake: bool(g.screenShake, d.graphics.screenShake),
      motionBlur: bool(g.motionBlur, d.graphics.motionBlur),
      effects: bool(g.effects, d.graphics.effects),
    },
    audio: { master: clamp01(a.master, d.audio.master), music: clamp01(a.music, d.audio.music), sfx: clamp01(a.sfx, d.audio.sfx) },
    controls: {
      p1: isValidBindings(c.p1) ? { ...c.p1 } : { ...d.controls.p1 },
      p2: isValidBindings(c.p2) ? { ...c.p2 } : { ...d.controls.p2 },
    },
    accessibility: {
      colorblind: bool(acc.colorblind, d.accessibility.colorblind),
      reducedMotion: bool(acc.reducedMotion, d.accessibility.reducedMotion),
      reducedFlashes: bool(acc.reducedFlashes, d.accessibility.reducedFlashes),
      subtitles: bool(acc.subtitles, d.accessibility.subtitles),
    },
    gameplay: { difficulty, finishers: bool(gp.finishers, d.gameplay.finishers) },
  };
};

export const loadSettings = (storage: Pick<Storage, 'getItem'> | null = safeStorage()): GameSettings => {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    return sanitizeSettings(JSON.parse(raw));
  } catch (err) {
    console.error('Settings could not be parsed; using defaults', err);
    return structuredClone(DEFAULT_SETTINGS);
  }
};

export const saveSettings = (settings: GameSettings, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void => {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Settings could not be saved', err);
  }
};

export const safeStorage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

export const settingsStore = new Store<GameSettings>(loadSettings());
settingsStore.subscribe(() => saveSettings(settingsStore.get()));
