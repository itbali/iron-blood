import type { CharacterDef } from '../combat/types';
import { saveManager, type PlayerProgress } from './SaveManager';

export interface ArcadeReward {
  newSkin: string | null;
  nightmare: boolean;
  conceptArt: boolean;
  archon: boolean;
}

export function skinKey(charId: string, skinId: string): string {
  return `${charId}:${skinId}`;
}

export function isSkinUnlocked(p: PlayerProgress, def: CharacterDef, skinId: string): boolean {
  const skin = def.skins.find((s) => s.id === skinId);
  if (!skin) return false;
  return skin.unlock === 'default' || p.unlockedSkins.includes(skinKey(def.id, skinId));
}

export function recordFightResult(p: PlayerProgress, won: boolean, maxCombo: number): PlayerProgress {
  const next = { ...p };
  if (won) next.totalWins += 1;
  else next.totalLosses += 1;
  if (maxCombo > next.highestCombo) next.highestCombo = maxCombo;
  return next;
}

/** Applies Arcade completion unlocks and returns what was new. */
export function completeArcade(p: PlayerProgress, def: CharacterDef, timeSec: number): { progress: PlayerProgress; reward: ArcadeReward } {
  const next: PlayerProgress = { ...p, unlockedSkins: [...p.unlockedSkins], unlockedCharacters: [...p.unlockedCharacters] };
  const alt = def.skins.find((s) => s.unlock === 'arcade');
  const key = alt ? skinKey(def.id, alt.id) : null;
  const newSkin = key && !next.unlockedSkins.includes(key) ? alt?.name ?? null : null;
  if (key && !next.unlockedSkins.includes(key)) next.unlockedSkins.push(key);
  const reward: ArcadeReward = {
    newSkin,
    nightmare: !next.nightmareUnlocked,
    conceptArt: !next.conceptArtUnlocked,
    archon: !next.unlockedCharacters.includes('archon'),
  };
  next.completedArcade = true;
  next.nightmareUnlocked = true;
  next.conceptArtUnlocked = true;
  next.arcadeClears += 1;
  if (!next.unlockedCharacters.includes('archon')) next.unlockedCharacters.push('archon');
  if (next.bestArcadeTimeSec === null || timeSec < next.bestArcadeTimeSec) next.bestArcadeTimeSec = timeSec;
  return { progress: next, reward };
}

export function persist(p: PlayerProgress): void {
  saveManager.saveGame(p);
}
