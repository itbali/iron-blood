import type { Action } from '../input/InputTypes';
import { ACTIONS } from '../input/InputTypes';
import type { Bindings } from '../input/KeyBindings';
import type { PlayerProgress } from './Progression';
import { defaultProgress } from './Progression';
import type { Settings } from './Settings';
import { defaultSettings } from './Settings';

export const SAVE_KEY = 'ironblood.save';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  progress: PlayerProgress;
  settings: Settings;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const defaultSave = (): SaveData => ({ version: SAVE_VERSION, progress: defaultProgress(), settings: defaultSettings() });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep-merges loaded data over defaults so older or partial saves keep working. */
const mergeDefaults = <T>(defaults: T, loaded: unknown): T => {
  if (!isObj(defaults) || !isObj(loaded)) {
    if (Array.isArray(defaults)) return (Array.isArray(loaded) ? loaded : defaults) as T;
    return (loaded !== undefined && typeof loaded === typeof defaults ? loaded : defaults) as T;
  }
  const out: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) out[key] = mergeDefaults((defaults as Record<string, unknown>)[key], loaded[key]);
  for (const key of Object.keys(loaded)) if (!(key in out)) out[key] = loaded[key];
  return out as T;
};

const sanitizeBindings = (b: Bindings, fallback: Bindings): Bindings => {
  const out = { ...fallback };
  for (const a of ACTIONS as Action[]) {
    const v = b[a];
    out[a] = Array.isArray(v) && v.every((c) => typeof c === 'string') ? v : fallback[a];
  }
  return out;
};

const resolveStorage = (s?: StorageLike): StorageLike | null => {
  if (s) return s;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

/** Loads the save; any parse error, wrong shape or unknown version falls back to defaults. */
export const loadGame = (storage?: StorageLike): SaveData => {
  const st = resolveStorage(storage);
  if (!st) return defaultSave();
  try {
    const raw = st.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed) || parsed.version !== SAVE_VERSION) {
      console.error('Save data has an unsupported format, using defaults');
      return defaultSave();
    }
    const merged = mergeDefaults(defaultSave(), parsed);
    const d = defaultSettings();
    merged.settings.controls.p1 = sanitizeBindings(merged.settings.controls.p1, d.controls.p1);
    merged.settings.controls.p2 = sanitizeBindings(merged.settings.controls.p2, d.controls.p2);
    return merged;
  } catch (err) {
    console.error('Failed to read save data, using defaults', err);
    return defaultSave();
  }
};

export const saveGame = (data: SaveData, storage?: StorageLike): boolean => {
  const st = resolveStorage(storage);
  if (!st) return false;
  try {
    st.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to write save data', err);
    return false;
  }
};

export const resetSave = (storage?: StorageLike): SaveData => {
  const st = resolveStorage(storage);
  try {
    st?.removeItem(SAVE_KEY);
  } catch (err) {
    console.error('Failed to reset save data', err);
  }
  return defaultSave();
};
