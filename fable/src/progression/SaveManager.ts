import { SAVE_KEY, GAME_VERSION } from '@/core/constants';
import type { CharacterId, Difficulty } from '@/core/types';
import { safeStorage } from './Settings';

export interface PlayerProgress {
  version: string;
  unlockedCharacters: string[];
  unlockedSkins: string[];
  unlockedDifficulties: Difficulty[];
  completedArcade: boolean;
  arcadeClears: number;
  highestCombo: number;
  totalWins: number;
  totalLosses: number;
  totalDamage: number;
  finishers: number;
  perfectBlocks: number;
  bestArcadeTimeFrames: number;
  galleryUnlocked: boolean;
  lastCharacter: CharacterId;
}

export const DEFAULT_PROGRESS: PlayerProgress = {
  version: GAME_VERSION,
  unlockedCharacters: ['raven', 'vera', 'brute', 'kai', 'wraith', 'titan'],
  unlockedSkins: ['raven:default'],
  unlockedDifficulties: ['easy', 'normal', 'hard'],
  completedArcade: false,
  arcadeClears: 0,
  highestCombo: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDamage: 0,
  finishers: 0,
  perfectBlocks: 0,
  bestArcadeTimeFrames: 0,
  galleryUnlocked: false,
  lastCharacter: 'raven',
};

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
const strArray = (v: unknown, fallback: string[]): string[] => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? [...new Set([...fallback, ...v])] : [...fallback]);

/** Repairs any partially valid save object into a complete one; never throws. */
export const sanitizeProgress = (raw: unknown): PlayerProgress => {
  const d = DEFAULT_PROGRESS;
  if (!raw || typeof raw !== 'object') return structuredClone(d);
  const r = raw as Record<string, unknown>;
  const difficulties = strArray(r.unlockedDifficulties, d.unlockedDifficulties).filter((x): x is Difficulty => ['easy', 'normal', 'hard', 'nightmare'].includes(x));
  return {
    version: GAME_VERSION,
    unlockedCharacters: strArray(r.unlockedCharacters, d.unlockedCharacters),
    unlockedSkins: strArray(r.unlockedSkins, d.unlockedSkins),
    unlockedDifficulties: difficulties,
    completedArcade: r.completedArcade === true,
    arcadeClears: num(r.arcadeClears, 0),
    highestCombo: num(r.highestCombo, 0),
    totalWins: num(r.totalWins, 0),
    totalLosses: num(r.totalLosses, 0),
    totalDamage: num(r.totalDamage, 0),
    finishers: num(r.finishers, 0),
    perfectBlocks: num(r.perfectBlocks, 0),
    bestArcadeTimeFrames: num(r.bestArcadeTimeFrames, 0),
    galleryUnlocked: r.galleryUnlocked === true,
    lastCharacter: typeof r.lastCharacter === 'string' && ['raven', 'vera', 'brute', 'kai', 'wraith', 'titan', 'archon'].includes(r.lastCharacter) ? (r.lastCharacter as CharacterId) : 'raven',
  };
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveManager {
  constructor(private storage: StorageLike | null = safeStorage()) {}

  loadGame(): PlayerProgress {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return structuredClone(DEFAULT_PROGRESS);
      return sanitizeProgress(JSON.parse(raw));
    } catch (err) {
      console.error('Save file corrupted; starting from defaults', err);
      return structuredClone(DEFAULT_PROGRESS);
    }
  }

  saveGame(progress: PlayerProgress): boolean {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(progress));
      return true;
    } catch (err) {
      console.error('Progress could not be saved', err);
      return false;
    }
  }

  resetSave(): PlayerProgress {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch (err) {
      console.error('Save could not be removed', err);
    }
    return structuredClone(DEFAULT_PROGRESS);
  }
}
