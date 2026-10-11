import type { CharacterId, Difficulty, GameMode, PlayerSide, StageId } from '@/core/types';

export type SkinId = 'default' | 'crimson';

export type SimPhase = 'intro' | 'round-start' | 'fight' | 'ko' | 'finisher-window' | 'finisher' | 'round-end' | 'match-end';

export interface FighterSnapshot {
  id: CharacterId;
  name: string;
  hp: number;
  maxHp: number;
  meter: number;
  meterMax: number;
  roundsWon: number;
  state: string;
  comboHits: number;
  comboDamage: number;
  maxCombo: number;
  phase2: boolean;
}

/** Plain data pushed to the React HUD; produced by the simulation, never mutated by UI. */
export interface HudSnapshot {
  phase: SimPhase;
  phaseFrame: number;
  round: number;
  timer: number;
  timerEnabled: boolean;
  p1: FighterSnapshot;
  p2: FighterSnapshot;
  winner: PlayerSide | null;
  roundWinner: PlayerSide | null;
  matchWinner: PlayerSide | null;
  draw: boolean;
  announcement: string;
  subtitle: string;
  dialogue: { speaker: string; text: string; side: PlayerSide } | null;
  finisherAvailable: boolean;
  finisherName: string;
  superReady: [boolean, boolean];
}

export interface MatchConfig {
  mode: GameMode;
  p1: CharacterId;
  p2: CharacterId;
  stage: StageId;
  difficulty: Difficulty;
  /** true when P2 is controlled by a human (versus). */
  p2Human: boolean;
  seed: number;
  rounds: number;
  timeLimit: number;
  /** Arcade ladder index (0-based), -1 outside arcade. */
  arcadeIndex: number;
  /** Skin ids per side. */
  skins: [SkinId, SkinId];
  training?: {
    infiniteHealth: boolean;
    infiniteMeter: boolean;
    aiEnabled: boolean;
    dummyBlock: boolean;
  };
}

export interface MatchResult {
  winner: PlayerSide | null;
  draw: boolean;
  rounds: (PlayerSide | null)[];
  maxCombo: number;
  damageDealt: number;
  durationFrames: number;
  finisherUsed: boolean;
}
