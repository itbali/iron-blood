import type { ButtonId, MotionDir } from '../combat/types';

/** Raw (world-space) input bits produced by keyboards, touch and AI. */
export const Btn = {
  LEFT: 1,
  RIGHT: 2,
  UP: 4,
  DOWN: 8,
  LP: 16,
  HP: 32,
  LK: 64,
  HK: 128,
  SP1: 256,
  SP2: 512,
  BLOCK: 1024,
  GRAB: 2048,
} as const;

/** Facing-relative direction bits stored inside the buffer. */
export const Rel = {
  FWD: 1,
  BACK: 2,
  UP: 4,
  DOWN: 8,
} as const;

export type InputFrame = number;

export const BUTTON_BIT: Record<ButtonId, number> = {
  lp: Btn.LP,
  hp: Btn.HP,
  lk: Btn.LK,
  hk: Btn.HK,
  sp1: Btn.SP1,
  sp2: Btn.SP2,
};

export const DIR_BIT: Record<MotionDir, number> = {
  FWD: Rel.FWD,
  BACK: Rel.BACK,
  UP: Rel.UP,
  DOWN: Rel.DOWN,
};

export const ATTACK_BUTTONS = Btn.LP | Btn.HP | Btn.LK | Btn.HK | Btn.SP1 | Btn.SP2 | Btn.GRAB;

export interface InputSource {
  poll(slot: number): InputFrame;
}

export const NEUTRAL: InputFrame = 0;
