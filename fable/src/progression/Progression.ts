import type { CharacterId } from '@/core/types';
import type { MatchResult } from '@/game/GameState';
import { Store } from '@/state/store';
import { DEFAULT_PROGRESS, SaveManager, type PlayerProgress } from './SaveManager';

export interface ArcadeRewards {
  newCharacters: CharacterId[];
  newSkins: string[];
  newDifficulty: string | null;
  gallery: boolean;
}

/** Owns the persisted player progress and applies unlock rules. */
export class Progression {
  readonly store: Store<PlayerProgress>;

  constructor(private saves: SaveManager = new SaveManager()) {
    this.store = new Store<PlayerProgress>(saves.loadGame());
  }

  get progress(): PlayerProgress {
    return this.store.get();
  }

  private commit(next: PlayerProgress): void {
    this.store.set(next);
    this.saves.saveGame(next);
  }

  recordMatch(result: MatchResult, playerSide: 0 | 1, versus: boolean): void {
    const p = { ...this.progress };
    if (!versus) {
      if (result.winner === playerSide) p.totalWins++;
      else p.totalLosses++;
    }
    p.highestCombo = Math.max(p.highestCombo, result.maxCombo);
    p.totalDamage += result.damageDealt;
    if (result.finisherUsed && result.winner === playerSide) p.finishers++;
    this.commit(p);
  }

  recordPerfectBlock(): void {
    const p = { ...this.progress, perfectBlocks: this.progress.perfectBlocks + 1 };
    this.commit(p);
  }

  setLastCharacter(id: CharacterId): void {
    if (this.progress.lastCharacter === id) return;
    this.commit({ ...this.progress, lastCharacter: id });
  }

  /** Applies arcade completion rewards; returns what was newly unlocked. */
  completeArcade(character: CharacterId, totalFrames: number): ArcadeRewards {
    const p = { ...this.progress, unlockedCharacters: [...this.progress.unlockedCharacters], unlockedSkins: [...this.progress.unlockedSkins], unlockedDifficulties: [...this.progress.unlockedDifficulties] };
    const rewards: ArcadeRewards = { newCharacters: [], newSkins: [], newDifficulty: null, gallery: false };
    p.completedArcade = true;
    p.arcadeClears++;
    if (p.bestArcadeTimeFrames === 0 || totalFrames < p.bestArcadeTimeFrames) p.bestArcadeTimeFrames = totalFrames;
    const skin = `${character}:crimson`;
    if (!p.unlockedSkins.includes(skin)) {
      p.unlockedSkins.push(skin);
      rewards.newSkins.push(skin);
    }
    if (!p.unlockedDifficulties.includes('nightmare')) {
      p.unlockedDifficulties.push('nightmare');
      rewards.newDifficulty = 'NIGHTMARE';
    }
    if (!p.unlockedCharacters.includes('archon')) {
      p.unlockedCharacters.push('archon');
      rewards.newCharacters.push('archon');
    }
    if (!p.galleryUnlocked) {
      p.galleryUnlocked = true;
      rewards.gallery = true;
    }
    this.commit(p);
    return rewards;
  }

  reset(): void {
    this.commit(this.saves.resetSave());
  }

  static defaults(): PlayerProgress {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export const progression = new Progression();
