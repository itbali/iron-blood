import { DIFFICULTIES, type Difficulty } from '../ai/Difficulty';
import { ROSTER_IDS } from '../data/characters';
import type { StageId } from '../data/stages';
import { mulberry32 } from './rng';
import type { FightConfig, FightResult, FighterChoice } from './FightConfig';

export interface ArcadeStats {
  timeSec: number;
  wins: number;
  maxCombo: number;
  damage: number;
  continues: number;
}

export interface ArcadeRun {
  player: FighterChoice;
  difficulty: Difficulty;
  ladder: string[];
  index: number;
  stats: ArcadeStats;
}

const STAGE_CYCLE: StageId[] = ['industrial', 'station', 'temple', 'station', 'industrial'];
export const ARCADE_FIGHTS = 5;

/** Four distinct opponents (never the player's own character) followed by the boss. */
export function createRun(player: FighterChoice, difficulty: Difficulty, seed = Date.now()): ArcadeRun {
  const rng = mulberry32(seed);
  const pool = ROSTER_IDS.filter((id) => id !== player.charId);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    player,
    difficulty,
    ladder: [...pool.slice(0, 4), 'archon'],
    index: 0,
    stats: { timeSec: 0, wins: 0, maxCombo: 0, damage: 0, continues: 0 },
  };
}

export function isBossFight(run: ArcadeRun): boolean {
  return run.index === run.ladder.length - 1;
}

/** Difficulty ramps up through the ladder: fights 3 and later are one step above the chosen level. */
export function fightDifficulty(run: ArcadeRun): Difficulty {
  const base = DIFFICULTIES.indexOf(run.difficulty);
  const bump = run.index >= 2 ? 1 : 0;
  return DIFFICULTIES[Math.min(DIFFICULTIES.length - 1, base + bump)];
}

export function fightConfig(run: ArcadeRun): FightConfig {
  return {
    mode: 'arcade',
    p1: run.player,
    p2: { charId: run.ladder[run.index], skin: 'default' },
    humanSlots: [0],
    stage: STAGE_CYCLE[run.index % STAGE_CYCLE.length],
    difficulty: fightDifficulty(run),
    bossFight: isBossFight(run),
    finishers: true,
    arcade: { index: run.index + 1, total: run.ladder.length },
  };
}

export function recordWin(run: ArcadeRun, r: FightResult): ArcadeRun {
  return {
    ...run,
    stats: {
      ...run.stats,
      timeSec: run.stats.timeSec + r.timeSec,
      wins: run.stats.wins + r.p1Wins,
      maxCombo: Math.max(run.stats.maxCombo, r.maxCombo[0]),
      damage: run.stats.damage + r.damage[0],
    },
  };
}

export function advance(run: ArcadeRun): ArcadeRun {
  return { ...run, index: run.index + 1 };
}
