/** Phases from the design document. Menu phases live in React, fight phases in MatchController. */
export type GamePhase =
  | 'menu'
  | 'character-select'
  | 'intro'
  | 'round-start'
  | 'fight'
  | 'round-end'
  | 'ko'
  | 'finisher'
  | 'victory'
  | 'pause';

export type MatchPhase = Extract<GamePhase, 'intro' | 'round-start' | 'fight' | 'ko' | 'finisher' | 'round-end' | 'victory'>;

export interface FighterSummary {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  meter: number;
  state: string;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  timer: number;
  player1: FighterSummary;
  player2: FighterSummary;
  winner?: string;
}

export type GameMode = 'arcade' | 'versus' | 'training';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';
export type ControllerKind = 'human1' | 'human2' | 'cpu' | 'dummy';

export interface MatchConfig {
  mode: GameMode;
  p1: string;
  p2: string;
  stage: string;
  controllers: [ControllerKind, ControllerKind];
  difficulty: Difficulty;
  p1Skin?: 'default' | 'alt';
  p2Skin?: 'default' | 'alt';
  /** Arcade ladder position (1-based) for presentation. */
  arcadeStage?: number;
  isBoss?: boolean;
  skipIntro?: boolean;
}

export interface MatchResult {
  winner: 0 | 1 | -1;
  roundsWon: [number, number];
  timeSeconds: number;
  maxCombo: [number, number];
  damageDealt: [number, number];
  finisher: string | null;
  perfect: boolean;
}
