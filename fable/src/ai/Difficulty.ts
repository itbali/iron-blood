import type { Difficulty } from '@/core/types';

export interface DifficultyProfile {
  label: string;
  /** Frames between an event and the AI being able to react to it. */
  reactionFrames: number;
  /** Frames between re-evaluations when nothing urgent happens. */
  decisionInterval: number;
  blockChance: number;
  punishChance: number;
  comboChance: number;
  specialChance: number;
  jumpChance: number;
  grabChance: number;
  /** Probability per decision of doing nothing useful. */
  mistakeChance: number;
  /** 0..1 how well the AI keeps its preferred range. */
  spacingSkill: number;
  superChance: number;
  /** Multiplier on the character's aggression. */
  aggression: number;
  /** Chance to react to a projectile by jumping over it. */
  projectileJumpChance: number;
  /** Max combo string length used. */
  maxComboLength: number;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    label: 'EASY',
    reactionFrames: 26,
    decisionInterval: 30,
    blockChance: 0.12,
    punishChance: 0.08,
    comboChance: 0.1,
    specialChance: 0.08,
    jumpChance: 0.08,
    grabChance: 0.08,
    mistakeChance: 0.45,
    spacingSkill: 0.2,
    superChance: 0.15,
    aggression: 0.55,
    projectileJumpChance: 0.1,
    maxComboLength: 2,
  },
  normal: {
    label: 'NORMAL',
    reactionFrames: 16,
    decisionInterval: 20,
    blockChance: 0.4,
    punishChance: 0.3,
    comboChance: 0.4,
    specialChance: 0.18,
    jumpChance: 0.12,
    grabChance: 0.18,
    mistakeChance: 0.25,
    spacingSkill: 0.5,
    superChance: 0.45,
    aggression: 0.75,
    projectileJumpChance: 0.3,
    maxComboLength: 3,
  },
  hard: {
    label: 'HARD',
    reactionFrames: 9,
    decisionInterval: 12,
    blockChance: 0.72,
    punishChance: 0.65,
    comboChance: 0.7,
    specialChance: 0.35,
    jumpChance: 0.15,
    grabChance: 0.3,
    mistakeChance: 0.07,
    spacingSkill: 0.8,
    superChance: 0.8,
    aggression: 1.05,
    projectileJumpChance: 0.55,
    maxComboLength: 4,
  },
  nightmare: {
    label: 'NIGHTMARE',
    reactionFrames: 4,
    decisionInterval: 6,
    blockChance: 0.92,
    punishChance: 0.95,
    comboChance: 0.95,
    specialChance: 0.6,
    jumpChance: 0.18,
    grabChance: 0.4,
    mistakeChance: 0.02,
    spacingSkill: 1,
    superChance: 1,
    aggression: 1.25,
    projectileJumpChance: 0.8,
    maxComboLength: 5,
  },
};
