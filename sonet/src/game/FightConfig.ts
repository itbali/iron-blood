import type { Difficulty } from '../ai/Difficulty';
import type { StageId } from '../data/stages';
import type { SimMode } from './FightSim';

export interface FighterChoice {
  charId: string;
  skin: string;
}

export interface FightConfig {
  mode: SimMode;
  p1: FighterChoice;
  p2: FighterChoice;
  humanSlots: number[];
  stage: StageId;
  difficulty: Difficulty;
  bossFight: boolean;
  finishers: boolean;
  /** 1-based fight index in Arcade, for the HUD label. */
  arcade?: { index: number; total: number };
}

export interface FightResult {
  winnerSlot: 0 | 1;
  p1Wins: number;
  p2Wins: number;
  timeSec: number;
  maxCombo: [number, number];
  damage: [number, number];
  finisher: boolean;
  humanWon: boolean;
}
