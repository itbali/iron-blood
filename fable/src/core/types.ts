export type Facing = 1 | -1;

/** Rect in fighter-local space: x is forward offset of the box center, y is the center height above the feet. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Axis-aligned world-space box (y grows upward from the floor). */
export interface WorldBox {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type PlayerSide = 0 | 1;

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'nightmare'];

export type CharacterId = 'raven' | 'vera' | 'brute' | 'kai' | 'wraith' | 'titan' | 'archon';

export type StageId = 'industrial' | 'station' | 'temple';

export type GameMode = 'arcade' | 'versus' | 'training';
