import { ARCADE_FIGHTS } from '@/core/constants';
import type { CharacterId, Difficulty, StageId } from '@/core/types';
import { BOSS_ID, ROSTER } from '@/data/characters';
import { STAGE_ORDER } from '@/data/stages';
import type { MatchConfig, MatchResult, SkinId } from '@/game/GameState';
import { Rng } from '@/core/rng';
import { CHARACTERS } from '@/data/characters';

const DIFFICULTY_RANK: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2, 'Very Hard': 3, Boss: 4 };
const rank = (id: CharacterId): number => DIFFICULTY_RANK[CHARACTERS[id].stats.difficulty] ?? 0;

export interface ArcadeFightRecord {
  opponent: CharacterId;
  result: MatchResult;
}

export interface ArcadeRun {
  character: CharacterId;
  difficulty: Difficulty;
  ladder: CharacterId[];
  stages: StageId[];
  index: number;
  history: ArcadeFightRecord[];
  seed: number;
  totalFrames: number;
  skin: SkinId;
}

/** Builds the arcade ladder: four roster opponents, then the boss. */
export const createArcadeRun = (character: CharacterId, difficulty: Difficulty, seed = Date.now(), skin: SkinId = 'default'): ArcadeRun => {
  const rng = new Rng(seed);
  const pool = ROSTER.filter((id) => id !== character).sort((a, b) => rank(a) - rank(b));
  // The easiest archetype always opens the ladder (Brute for most characters); the rest is random.
  const ladder: CharacterId[] = [pool.shift()!];
  while (ladder.length < ARCADE_FIGHTS - 1 && pool.length) {
    const i = rng.int(0, pool.length - 1);
    ladder.push(pool.splice(i, 1)[0]!);
  }
  // Easier archetypes first so the ladder ramps up; the boss always closes it.
  ladder.sort((a, b) => rank(a) - rank(b));
  ladder.push(BOSS_ID);
  const stages: StageId[] = ladder.map((_, i) => (i === ladder.length - 1 ? 'temple' : STAGE_ORDER[i % STAGE_ORDER.length]!));
  return { character, difficulty, ladder, stages, index: 0, history: [], seed, totalFrames: 0, skin };
};

export const arcadeMatchConfig = (run: ArcadeRun): MatchConfig => ({
  mode: 'arcade',
  p1: run.character,
  p2: run.ladder[run.index]!,
  stage: run.stages[run.index]!,
  difficulty: run.difficulty,
  p2Human: false,
  seed: run.seed + run.index * 7919,
  rounds: 2,
  timeLimit: 99,
  arcadeIndex: run.index,
  skins: [run.skin, 'default'],
});

export const isBossFight = (run: ArcadeRun): boolean => run.index === run.ladder.length - 1;

export const arcadeAdvance = (run: ArcadeRun, result: MatchResult): ArcadeRun => ({
  ...run,
  history: [...run.history, { opponent: run.ladder[run.index]!, result }],
  index: run.index + 1,
  totalFrames: run.totalFrames + result.durationFrames,
});

export const arcadeComplete = (run: ArcadeRun): boolean => run.index >= run.ladder.length;

export const arcadeStats = (run: ArcadeRun) => {
  const wins = run.history.filter((h) => h.result.winner === 0).length;
  const maxCombo = run.history.reduce((m, h) => Math.max(m, h.result.maxCombo), 0);
  const damage = run.history.reduce((d, h) => d + h.result.damageDealt, 0);
  return { wins, maxCombo, damage, frames: run.totalFrames };
};
