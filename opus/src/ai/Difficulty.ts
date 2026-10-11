import type { Difficulty } from '../game/GameState';

export interface DifficultyProfile {
  label: string;
  /** Frames between something happening and the AI being able to react to it (human-like delay). */
  reactionFrames: number;
  /** Frames between neutral decisions. */
  decisionInterval: number;
  blockChance: number;
  lowBlockAccuracy: number;
  antiAirChance: number;
  /** Probability of continuing a combo after each confirmed hit. */
  comboChance: number;
  maxComboLength: number;
  specialChance: number;
  punishChance: number;
  throwChance: number;
  aggression: number;
  /** How well the AI keeps the optimal distance for its pokes (0..1). */
  spacing: number;
  /** Chance per input of fumbling (dropping) a planned step. */
  mistakeChance: number;
  superChance: number;
  finisherChance: number;
  techChance: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    label: 'EASY',
    reactionFrames: 26,
    decisionInterval: 30,
    blockChance: 0.18,
    lowBlockAccuracy: 0.3,
    antiAirChance: 0.1,
    comboChance: 0.2,
    maxComboLength: 2,
    specialChance: 0.12,
    punishChance: 0.1,
    throwChance: 0.05,
    aggression: 0.35,
    spacing: 0.2,
    mistakeChance: 0.18,
    superChance: 0.2,
    finisherChance: 0.2,
    techChance: 0,
  },
  normal: {
    label: 'NORMAL',
    reactionFrames: 17,
    decisionInterval: 18,
    blockChance: 0.45,
    lowBlockAccuracy: 0.55,
    antiAirChance: 0.35,
    comboChance: 0.55,
    maxComboLength: 3,
    specialChance: 0.25,
    punishChance: 0.35,
    throwChance: 0.15,
    aggression: 0.5,
    spacing: 0.5,
    mistakeChance: 0.07,
    superChance: 0.5,
    finisherChance: 0.5,
    techChance: 0.15,
  },
  hard: {
    label: 'HARD',
    reactionFrames: 11,
    decisionInterval: 11,
    blockChance: 0.72,
    lowBlockAccuracy: 0.8,
    antiAirChance: 0.65,
    comboChance: 0.85,
    maxComboLength: 4,
    specialChance: 0.4,
    punishChance: 0.7,
    throwChance: 0.3,
    aggression: 0.6,
    spacing: 0.75,
    mistakeChance: 0.02,
    superChance: 0.8,
    finisherChance: 0.8,
    techChance: 0.4,
  },
  nightmare: {
    label: 'NIGHTMARE',
    reactionFrames: 7,
    decisionInterval: 6,
    blockChance: 0.88,
    lowBlockAccuracy: 0.95,
    antiAirChance: 0.88,
    comboChance: 0.97,
    maxComboLength: 5,
    specialChance: 0.5,
    punishChance: 0.95,
    throwChance: 0.45,
    aggression: 0.75,
    spacing: 0.95,
    mistakeChance: 0,
    superChance: 1,
    finisherChance: 1,
    techChance: 0.7,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'nightmare'];
