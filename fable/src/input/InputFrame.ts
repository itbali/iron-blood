/** Button bitmask. Direction is carried separately so motion inputs can be detected relative to facing. */
export const Btn = {
  LP: 1,
  HP: 2,
  LK: 4,
  HK: 8,
  SP1: 16,
  SP2: 32,
  BLOCK: 64,
  GRAB: 128,
} as const;

export type ButtonName = keyof typeof Btn;

export const BUTTON_NAMES = Object.keys(Btn) as ButtonName[];

/** One tick worth of input for a single fighter. Pure data: the simulation never reads the DOM. */
export interface InputFrame {
  /** -1 left, 0 neutral, 1 right (absolute screen direction). */
  x: -1 | 0 | 1;
  /** 1 up, 0 neutral, -1 down. */
  y: -1 | 0 | 1;
  /** Buttons currently held (bitmask of Btn). */
  held: number;
  /** Buttons that went down on this tick (bitmask of Btn). */
  pressed: number;
}

export const EMPTY_INPUT: InputFrame = Object.freeze({ x: 0, y: 0, held: 0, pressed: 0 });

export const makeInput = (x: -1 | 0 | 1 = 0, y: -1 | 0 | 1 = 0, held = 0, pressed = 0): InputFrame => ({
  x,
  y,
  held,
  pressed,
});

export const hasButton = (mask: number, btn: number): boolean => (mask & btn) !== 0;
