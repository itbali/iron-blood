export enum Button {
  LP = 1 << 0,
  HP = 1 << 1,
  LK = 1 << 2,
  HK = 1 << 3,
  S1 = 1 << 4,
  S2 = 1 << 5,
  BLOCK = 1 << 6,
  GRAB = 1 << 7,
}

export const ATTACK_BUTTONS = Button.LP | Button.HP | Button.LK | Button.HK | Button.S1 | Button.S2 | Button.GRAB;

export type Axis = -1 | 0 | 1;

/**
 * One frame of player intent, completely independent from visual state.
 * x/y are absolute screen directions (y = 1 is up). This struct is what a
 * rollback implementation would serialize and exchange over the network.
 */
export interface FrameInput {
  x: Axis;
  y: Axis;
  held: number;
  pressed: number;
}

export const EMPTY_INPUT: Readonly<FrameInput> = Object.freeze({ x: 0, y: 0, held: 0, pressed: 0 });

export const makeInput = (x: Axis = 0, y: Axis = 0, held = 0, pressed = 0): FrameInput => ({ x, y, held, pressed });

/** Numpad notation (5 = neutral, 6 = forward, 2 = down, ...) relative to facing. */
export type NumpadDir = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const toNumpad = (x: Axis, y: Axis, facing: 1 | -1): NumpadDir => {
  const fx = x * facing;
  const row = y === 1 ? 6 : y === -1 ? 0 : 3;
  return (row + fx + 2) as NumpadDir;
};

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'lp'
  | 'hp'
  | 'lk'
  | 'hk'
  | 's1'
  | 's2'
  | 'block'
  | 'grab';

export const ACTIONS: readonly Action[] = ['left', 'right', 'up', 'down', 'lp', 'hp', 'lk', 'hk', 's1', 's2', 'block', 'grab'];

export const ACTION_LABELS: Record<Action, string> = {
  left: 'Move Left',
  right: 'Move Right',
  up: 'Jump',
  down: 'Crouch',
  lp: 'Light Punch',
  hp: 'Heavy Punch',
  lk: 'Light Kick',
  hk: 'Heavy Kick',
  s1: 'Special 1',
  s2: 'Special 2',
  block: 'Block',
  grab: 'Grab',
};

export const ACTION_BUTTON: Partial<Record<Action, Button>> = {
  lp: Button.LP,
  hp: Button.HP,
  lk: Button.LK,
  hk: Button.HK,
  s1: Button.S1,
  s2: Button.S2,
  block: Button.BLOCK,
  grab: Button.GRAB,
};
