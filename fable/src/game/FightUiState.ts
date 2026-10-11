import type { HudSnapshot, MatchResult } from './GameState';

export type BannerKind = 'perfect' | 'break' | 'counter' | 'armor' | 'critical' | 'phase';

export interface Banner {
  id: number;
  text: string;
  side: 0 | 1;
  kind: BannerKind;
}

export interface TrainingState {
  infiniteHealth: boolean;
  infiniteMeter: boolean;
  aiEnabled: boolean;
  dummyBlock: boolean;
  showHitboxes: boolean;
  showFrameData: boolean;
}

export interface FrameDataInfo {
  p1: { state: string; attack: string; frame: number; phase: string; advantage: number; velocity: string; hp: number; meter: number };
  p2: { state: string; attack: string; frame: number; phase: string; advantage: number; velocity: string; hp: number; meter: number };
  fps: number;
  frame: number;
}

/** Everything the React fight screen reads. Written by Game at a throttled rate. */
export interface FightUiState {
  hud: HudSnapshot | null;
  banners: Banner[];
  paused: boolean;
  debug: boolean;
  training: TrainingState;
  frameData: FrameDataInfo | null;
  result: MatchResult | null;
  cheats: { infiniteHealth: boolean; infiniteMeter: boolean; aiDisabled: boolean };
  superSummary: { side: 0 | 1; damage: number; hits: number } | null;
}

export const DEFAULT_TRAINING: TrainingState = { infiniteHealth: true, infiniteMeter: true, aiEnabled: false, dummyBlock: false, showHitboxes: false, showFrameData: true };

export const initialFightUiState = (): FightUiState => ({
  hud: null,
  banners: [],
  paused: false,
  debug: false,
  training: { ...DEFAULT_TRAINING },
  frameData: null,
  result: null,
  cheats: { infiniteHealth: false, infiniteMeter: false, aiDisabled: false },
  superSummary: null,
});
