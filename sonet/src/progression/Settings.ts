import { DEFAULT_BINDINGS, cloneBindings, type BindingSet } from '../input/KeyBindings';
import type { Difficulty } from '../ai/Difficulty';
import { defaultStorage, type StorageLike } from './SaveManager';

export type Quality = 'low' | 'medium' | 'high';
export type ParticleLevel = 'off' | 'low' | 'normal' | 'high';
export type Colorblind = 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export interface Settings {
  quality: Quality;
  particles: ParticleLevel;
  screenShake: boolean;
  motionBlur: boolean;
  effects: boolean;
  master: number;
  music: number;
  sfx: number;
  bindings: BindingSet;
  colorblind: Colorblind;
  reducedMotion: boolean;
  flashEffects: boolean;
  subtitles: boolean;
  difficulty: Difficulty;
  touchControls: 'auto' | 'on' | 'off';
}

export const SETTINGS_KEY = 'ironblood.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  quality: 'high',
  particles: 'normal',
  screenShake: true,
  motionBlur: true,
  effects: true,
  master: 0.8,
  music: 0.6,
  sfx: 0.9,
  bindings: cloneBindings(DEFAULT_BINDINGS),
  colorblind: 'off',
  reducedMotion: false,
  flashEffects: true,
  subtitles: true,
  difficulty: 'normal',
  touchControls: 'auto',
};

const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const vol = (v: unknown, d: number): number => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d);

function sanitizeBindings(raw: unknown): BindingSet {
  const out = cloneBindings(DEFAULT_BINDINGS);
  if (!raw || typeof raw !== 'object') return out;
  for (const slot of ['p1', 'p2'] as const) {
    const s = (raw as Record<string, unknown>)[slot];
    if (!s || typeof s !== 'object') continue;
    for (const action of Object.keys(out[slot]) as (keyof BindingSet['p1'])[]) {
      const v = (s as Record<string, unknown>)[action];
      if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string')) out[slot][action] = v as string[];
    }
  }
  return out;
}

export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== 'object') return { ...d, bindings: cloneBindings(d.bindings) };
  const o = raw as Record<string, unknown>;
  return {
    quality: oneOf(o.quality, ['low', 'medium', 'high'] as const, d.quality),
    particles: oneOf(o.particles, ['off', 'low', 'normal', 'high'] as const, d.particles),
    screenShake: bool(o.screenShake, d.screenShake),
    motionBlur: bool(o.motionBlur, d.motionBlur),
    effects: bool(o.effects, d.effects),
    master: vol(o.master, d.master),
    music: vol(o.music, d.music),
    sfx: vol(o.sfx, d.sfx),
    bindings: sanitizeBindings(o.bindings),
    colorblind: oneOf(o.colorblind, ['off', 'deuteranopia', 'protanopia', 'tritanopia'] as const, d.colorblind),
    reducedMotion: bool(o.reducedMotion, d.reducedMotion),
    flashEffects: bool(o.flashEffects, d.flashEffects),
    subtitles: bool(o.subtitles, d.subtitles),
    difficulty: oneOf(o.difficulty, ['easy', 'normal', 'hard', 'nightmare'] as const, d.difficulty),
    touchControls: oneOf(o.touchControls, ['auto', 'on', 'off'] as const, d.touchControls),
  };
}

type Listener = (s: Settings) => void;

export class SettingsStore {
  private value: Settings;
  private listeners = new Set<Listener>();

  constructor(private readonly storage: StorageLike = defaultStorage(), private readonly key = SETTINGS_KEY) {
    this.value = this.read();
  }

  private read(): Settings {
    try {
      const text = this.storage.getItem(this.key);
      return text ? sanitizeSettings(JSON.parse(text)) : sanitizeSettings(null);
    } catch (err) {
      console.error('Settings unreadable, using defaults', err);
      return sanitizeSettings(null);
    }
  }

  get(): Settings {
    return this.value;
  }

  set(patch: Partial<Settings>): void {
    this.value = { ...this.value, ...patch };
    this.persist();
    this.listeners.forEach((l) => l(this.value));
  }

  reset(): void {
    this.value = sanitizeSettings(null);
    this.persist();
    this.listeners.forEach((l) => l(this.value));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private persist(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.value));
    } catch (err) {
      console.error('Could not persist settings', err);
    }
  }
}

export const settingsStore = new SettingsStore();
