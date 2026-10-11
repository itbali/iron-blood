import { Rng } from '../core/math';
import { BOSS, ROSTER } from '../data/characters';
import type { Difficulty, MatchConfig, MatchResult } from './GameState';

export const ARCADE_FIGHTS = 4;
const STAGE_ORDER = ['industrial', 'subway', 'temple', 'industrial'];
const BOSS_STAGE = 'temple';

export interface ArcadeRun {
  character: string;
  skin: 'default' | 'alt';
  difficulty: Difficulty;
  ladder: string[];
  index: number;
  stats: { timeSeconds: number; wins: number; maxCombo: number; damage: number; continues: number };
}

/** Four random challengers (never a mirror of the player), then the boss. */
export const createArcadeRun = (character: string, skin: 'default' | 'alt', difficulty: Difficulty, seed: number): ArcadeRun => {
  const rng = new Rng(seed);
  const pool = ROSTER.map((c) => c.id).filter((id) => id !== character);
  const picks: string[] = [];
  while (picks.length < ARCADE_FIGHTS && pool.length) picks.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return { character, skin, difficulty, ladder: [...picks, BOSS.id], index: 0, stats: { timeSeconds: 0, wins: 0, maxCombo: 0, damage: 0, continues: 0 } };
};

export const arcadeMatchConfig = (run: ArcadeRun): MatchConfig => {
  const isBoss = run.index >= ARCADE_FIGHTS;
  const difficultyLadder: Difficulty[] = ['easy', 'normal', 'hard', 'nightmare'];
  // Later rungs are one step harder than the chosen difficulty (capped).
  const base = difficultyLadder.indexOf(run.difficulty);
  const step = run.index >= 2 ? 1 : 0;
  const difficulty = difficultyLadder[Math.min(difficultyLadder.length - 1, base + step)];
  return {
    mode: 'arcade',
    p1: run.character,
    p2: run.ladder[run.index],
    stage: isBoss ? BOSS_STAGE : STAGE_ORDER[run.index % STAGE_ORDER.length],
    controllers: ['human1', 'cpu'],
    difficulty,
    p1Skin: run.skin,
    p2Skin: 'default',
    arcadeStage: run.index + 1,
    isBoss,
    skipIntro: false,
  };
};

/** Folds a match result into the run. Returns the new run state. */
export const advanceArcade = (run: ArcadeRun, result: MatchResult): ArcadeRun => {
  const won = result.winner === 0;
  return {
    ...run,
    index: won ? run.index + 1 : run.index,
    stats: {
      timeSeconds: run.stats.timeSeconds + result.timeSeconds,
      wins: run.stats.wins + (won ? 1 : 0),
      maxCombo: Math.max(run.stats.maxCombo, result.maxCombo[0]),
      damage: run.stats.damage + result.damageDealt[0],
      continues: run.stats.continues + (won ? 0 : 1),
    },
  };
};

export const arcadeComplete = (run: ArcadeRun): boolean => run.index > ARCADE_FIGHTS;
