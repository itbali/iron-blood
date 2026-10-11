export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'nightmare'];

export interface AIProfile {
  /** Frames between something happening on screen and the AI being able to react to it. */
  reactionFrames: number;
  blockChance: number;
  /** Chance a correctly-read block starts inside the perfect-block window. */
  perfectBlock: number;
  comboChance: number;
  /** Longest chain length the AI will attempt. */
  comboLength: number;
  specialChance: number;
  aggression: number;
  punish: number;
  /** 0..1, how tightly it holds its ideal distance. */
  spacing: number;
  thinkInterval: number;
  tech: number;
  antiAir: number;
  useSuper: boolean;
  hesitation: number;
}

export const PROFILES: Record<Difficulty, AIProfile> = {
  easy: {
    reactionFrames: 26, blockChance: 0.14, perfectBlock: 0, comboChance: 0.12, comboLength: 2, specialChance: 0.1,
    aggression: 0.34, punish: 0.08, spacing: 0.25, thinkInterval: 20, tech: 0.05, antiAir: 0.15, useSuper: false, hesitation: 0.35,
  },
  normal: {
    reactionFrames: 17, blockChance: 0.4, perfectBlock: 0.02, comboChance: 0.5, comboLength: 3, specialChance: 0.24,
    aggression: 0.5, punish: 0.35, spacing: 0.55, thinkInterval: 13, tech: 0.3, antiAir: 0.45, useSuper: false, hesitation: 0.18,
  },
  hard: {
    reactionFrames: 10, blockChance: 0.72, perfectBlock: 0.16, comboChance: 0.82, comboLength: 4, specialChance: 0.4,
    aggression: 0.66, punish: 0.72, spacing: 0.8, thinkInterval: 8, tech: 0.6, antiAir: 0.75, useSuper: true, hesitation: 0.08,
  },
  nightmare: {
    reactionFrames: 5, blockChance: 0.92, perfectBlock: 0.5, comboChance: 1, comboLength: 5, specialChance: 0.55,
    aggression: 0.82, punish: 0.96, spacing: 1, thinkInterval: 5, tech: 0.92, antiAir: 0.95, useSuper: true, hesitation: 0.02,
  },
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'EASY', normal: 'NORMAL', hard: 'HARD', nightmare: 'NIGHTMARE',
};
