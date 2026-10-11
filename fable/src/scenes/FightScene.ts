import type { CharacterId, Difficulty, StageId } from '@/core/types';
import type { MatchConfig, SkinId } from '@/game/GameState';

/** Match configuration builders for the non-arcade modes. */
export const versusMatch = (p1: CharacterId, p2: CharacterId, stage: StageId, skins: [SkinId, SkinId] = ['default', 'default'], seed = Date.now()): MatchConfig => ({
  mode: 'versus',
  p1,
  p2,
  stage,
  difficulty: 'normal',
  p2Human: true,
  seed,
  rounds: 2,
  timeLimit: 99,
  arcadeIndex: -1,
  skins,
});

export const trainingMatch = (p1: CharacterId, p2: CharacterId, stage: StageId, difficulty: Difficulty, skins: [SkinId, SkinId] = ['default', 'default'], seed = Date.now()): MatchConfig => ({
  mode: 'training',
  p1,
  p2,
  stage,
  difficulty,
  p2Human: false,
  seed,
  rounds: 99,
  timeLimit: 99,
  arcadeIndex: -1,
  skins,
  training: { infiniteHealth: true, infiniteMeter: true, aiEnabled: false, dummyBlock: false },
});

export const rematch = (config: MatchConfig): MatchConfig => ({ ...config, seed: config.seed + 1 });
