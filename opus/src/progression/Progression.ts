import type { Difficulty } from '../game/GameState';

/** Persistent player progress (shape requested by the design doc, plus statistics). */
export interface PlayerProgress {
  unlockedCharacters: string[];
  unlockedSkins: string[];
  completedArcade: boolean;
  highestCombo: number;
  totalWins: number;
  totalLosses: number;
  unlockedDifficulties: Difficulty[];
  unlockedArt: string[];
  arcadeClears: Record<string, number>;
  bestArcadeTimeSeconds: number | null;
  totalDamage: number;
  matchesPlayed: number;
  finishersPerformed: number;
}

export const defaultProgress = (): PlayerProgress => ({
  unlockedCharacters: ['raven', 'vera', 'brute', 'kai', 'wraith', 'titan'],
  unlockedSkins: [],
  completedArcade: false,
  highestCombo: 0,
  totalWins: 0,
  totalLosses: 0,
  unlockedDifficulties: ['easy', 'normal', 'hard'],
  unlockedArt: [],
  arcadeClears: {},
  bestArcadeTimeSeconds: null,
  totalDamage: 0,
  matchesPlayed: 0,
  finishersPerformed: 0,
});

export interface ArcadeUnlocks {
  skin: string | null;
  difficulty: Difficulty | null;
  art: string | null;
  character: string | null;
}

/** Applies arcade completion rewards; returns what was newly unlocked for the ending screen. */
export const applyArcadeClear = (p: PlayerProgress, characterId: string, timeSeconds: number): ArcadeUnlocks => {
  const out: ArcadeUnlocks = { skin: null, difficulty: null, art: null, character: null };
  const skin = `${characterId}:alt`;
  if (!p.unlockedSkins.includes(skin)) {
    p.unlockedSkins.push(skin);
    out.skin = skin;
  }
  if (!p.unlockedDifficulties.includes('nightmare')) {
    p.unlockedDifficulties.push('nightmare');
    out.difficulty = 'nightmare';
  }
  const art = `art:${characterId}`;
  if (!p.unlockedArt.includes(art)) {
    p.unlockedArt.push(art);
    out.art = art;
  }
  if (!p.unlockedCharacters.includes('archon')) {
    p.unlockedCharacters.push('archon');
    out.character = 'archon';
  }
  p.completedArcade = true;
  p.arcadeClears[characterId] = (p.arcadeClears[characterId] ?? 0) + 1;
  if (p.bestArcadeTimeSeconds === null || timeSeconds < p.bestArcadeTimeSeconds) p.bestArcadeTimeSeconds = timeSeconds;
  return out;
};

export const recordMatch = (p: PlayerProgress, won: boolean, maxCombo: number, damage: number, finisher: boolean): void => {
  p.matchesPlayed++;
  if (won) p.totalWins++;
  else p.totalLosses++;
  p.highestCombo = Math.max(p.highestCombo, maxCombo);
  p.totalDamage += Math.round(damage);
  if (finisher) p.finishersPerformed++;
};
