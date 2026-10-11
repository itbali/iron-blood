export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlayerProgress {
  unlockedCharacters: string[];
  unlockedSkins: string[];
  completedArcade: boolean;
  highestCombo: number;
  totalWins: number;
  totalLosses: number;
  nightmareUnlocked: boolean;
  conceptArtUnlocked: boolean;
  bestArcadeTimeSec: number | null;
  arcadeClears: number;
}

export const SAVE_KEY = 'ironblood.save.v1';

export const DEFAULT_PROGRESS: PlayerProgress = {
  unlockedCharacters: ['raven', 'vera', 'brute', 'kai', 'wraith', 'titan'],
  unlockedSkins: [],
  completedArcade: false,
  highestCombo: 0,
  totalWins: 0,
  totalLosses: 0,
  nightmareUnlocked: false,
  conceptArtUnlocked: false,
  bestArcadeTimeSec: null,
  arcadeClears: 0,
};

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export function defaultStorage(): StorageLike {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__ib_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch (err) {
    console.error('localStorage unavailable, progress will not persist', err);
  }
  return memoryStorage();
}

const strArray = (v: unknown, fallback: string[]): string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : fallback;
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Validates untrusted JSON field by field so a partially corrupted save still yields usable data. */
export function sanitizeProgress(raw: unknown): PlayerProgress {
  if (!raw || typeof raw !== 'object') return cloneDefault();
  const o = raw as Record<string, unknown>;
  const d = DEFAULT_PROGRESS;
  const chars = strArray(o.unlockedCharacters, d.unlockedCharacters);
  for (const id of d.unlockedCharacters) if (!chars.includes(id)) chars.push(id);
  return {
    unlockedCharacters: chars,
    unlockedSkins: strArray(o.unlockedSkins, []),
    completedArcade: bool(o.completedArcade, false),
    highestCombo: num(o.highestCombo, 0),
    totalWins: num(o.totalWins, 0),
    totalLosses: num(o.totalLosses, 0),
    nightmareUnlocked: bool(o.nightmareUnlocked, false),
    conceptArtUnlocked: bool(o.conceptArtUnlocked, false),
    bestArcadeTimeSec: typeof o.bestArcadeTimeSec === 'number' && o.bestArcadeTimeSec > 0 ? o.bestArcadeTimeSec : null,
    arcadeClears: num(o.arcadeClears, 0),
  };
}

export function cloneDefault(): PlayerProgress {
  return JSON.parse(JSON.stringify(DEFAULT_PROGRESS)) as PlayerProgress;
}

export class SaveManager {
  private cache: PlayerProgress | null = null;

  constructor(private readonly storage: StorageLike = defaultStorage(), private readonly key = SAVE_KEY) {}

  loadGame(): PlayerProgress {
    try {
      const text = this.storage.getItem(this.key);
      if (!text) {
        this.cache = cloneDefault();
        return this.cache;
      }
      this.cache = sanitizeProgress(JSON.parse(text));
    } catch (err) {
      console.error('Save file unreadable, using defaults', err);
      this.cache = cloneDefault();
    }
    return this.cache;
  }

  get(): PlayerProgress {
    return this.cache ?? this.loadGame();
  }

  saveGame(progress: PlayerProgress = this.get()): void {
    this.cache = progress;
    try {
      this.storage.setItem(this.key, JSON.stringify(progress));
    } catch (err) {
      console.error('Could not write save', err);
    }
  }

  resetSave(): PlayerProgress {
    try {
      this.storage.removeItem(this.key);
    } catch (err) {
      console.error('Could not clear save', err);
    }
    this.cache = cloneDefault();
    return this.cache;
  }
}

export const saveManager = new SaveManager();
export const saveGame = (p?: PlayerProgress): void => saveManager.saveGame(p);
export const loadGame = (): PlayerProgress => saveManager.loadGame();
export const resetSave = (): PlayerProgress => saveManager.resetSave();
