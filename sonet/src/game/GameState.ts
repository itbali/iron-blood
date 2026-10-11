import type { FighterState } from '../combat/types';

export type Phase =
  | 'menu' | 'character-select' | 'intro' | 'round-announce' | 'fight' | 'round-end' | 'ko' | 'finisher' | 'victory' | 'pause';

export interface FighterSnapshot {
  charId: string;
  name: string;
  hp: number;
  maxHp: number;
  meter: number;
  state: FighterState;
  roundWins: number;
}

/** Central snapshot consumed by HUD and debug tooling. The authoritative state lives in the sim. */
export interface GameState {
  phase: Phase;
  round: number;
  timer: number;
  player1: FighterSnapshot;
  player2: FighterSnapshot;
  winner?: string;
}
