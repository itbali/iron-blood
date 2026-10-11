import type { ButtonName } from './InputFrame';

export type Action = 'left' | 'right' | 'up' | 'down' | ButtonName;

export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'LP', 'HP', 'LK', 'HK', 'SP1', 'SP2', 'BLOCK', 'GRAB'];

export const ACTION_LABELS: Record<Action, string> = {
  left: 'Move Left',
  right: 'Move Right',
  up: 'Jump',
  down: 'Crouch',
  LP: 'Light Punch',
  HP: 'Heavy Punch',
  LK: 'Light Kick',
  HK: 'Heavy Kick',
  SP1: 'Special 1',
  SP2: 'Special 2',
  BLOCK: 'Block',
  GRAB: 'Grab',
};

/** Keyboard bindings keyed by KeyboardEvent.code. */
export type KeyBindings = Record<Action, string>;

export const DEFAULT_P1_BINDINGS: KeyBindings = {
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyW',
  down: 'KeyS',
  LP: 'KeyJ',
  HP: 'KeyK',
  LK: 'KeyL',
  HK: 'Semicolon',
  SP1: 'KeyI',
  SP2: 'KeyO',
  BLOCK: 'Space',
  GRAB: 'KeyE',
};

export const DEFAULT_P2_BINDINGS: KeyBindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  LP: 'Numpad1',
  HP: 'Numpad2',
  LK: 'Numpad3',
  HK: 'Numpad6',
  SP1: 'Numpad4',
  SP2: 'Numpad5',
  BLOCK: 'Numpad0',
  GRAB: 'NumpadEnter',
};

export const SYSTEM_KEYS = {
  pause: 'Escape',
  restart: 'KeyR',
  debug: 'F3',
  cheatHealth: 'F4',
  cheatMeter: 'F5',
  cheatRefill: 'F6',
  cheatReset: 'F7',
  cheatAi: 'F8',
} as const;

/** Human-readable key label from a KeyboardEvent.code. */
export const keyLabel = (code: string): string => {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  if (code.startsWith('Arrow')) return { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' }[code] ?? code;
  const map: Record<string, string> = {
    Space: 'SPACE',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    ShiftLeft: 'L SHIFT',
    ShiftRight: 'R SHIFT',
    ControlLeft: 'L CTRL',
    ControlRight: 'R CTRL',
    Enter: 'ENTER',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
  };
  return map[code] ?? code.toUpperCase();
};

export const isValidBindings = (value: unknown): value is KeyBindings => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ACTIONS.every((a) => typeof v[a] === 'string' && (v[a] as string).length > 0);
};
