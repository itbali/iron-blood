import type { Action } from './InputTypes';

/** Bindings use KeyboardEvent.code so they work on any keyboard layout (e.g. Cyrillic). */
export type Bindings = Record<Action, string[]>;

export const DEFAULT_P1_BINDINGS: Bindings = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  lp: ['KeyJ'],
  hp: ['KeyK'],
  lk: ['KeyL'],
  hk: ['Semicolon'],
  s1: ['KeyI'],
  s2: ['KeyO'],
  block: ['Space'],
  grab: ['KeyE'],
};

export const DEFAULT_P2_BINDINGS: Bindings = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  lp: ['Numpad1'],
  hp: ['Numpad2'],
  lk: ['Numpad3'],
  hk: ['Numpad4'],
  s1: ['Numpad5'],
  s2: ['Numpad6'],
  block: ['Numpad0'],
  grab: ['NumpadDecimal'],
};

export const SYSTEM_KEYS = {
  pause: 'Escape',
  restart: 'KeyR',
  debug: 'F3',
  cheatHealth: 'F4',
  cheatMeter: 'F5',
  cheatRefill: 'F6',
  cheatReset: 'F7',
  cheatAI: 'F8',
} as const;

export const cloneBindings = (b: Bindings): Bindings =>
  Object.fromEntries(Object.entries(b).map(([k, v]) => [k, [...v]])) as Bindings;

export const keyLabel = (code: string): string => {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6).replace('Decimal', '.').replace('Add', '+').replace('Subtract', '-')}`;
  if (code.startsWith('Arrow')) return { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' }[code] ?? code;
  const map: Record<string, string> = {
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Space: 'Space',
    ShiftLeft: 'L-Shift',
    ShiftRight: 'R-Shift',
    ControlLeft: 'L-Ctrl',
    ControlRight: 'R-Ctrl',
    AltLeft: 'L-Alt',
    AltRight: 'R-Alt',
    Enter: 'Enter',
    Minus: '-',
    Equal: '=',
    Backquote: '`',
  };
  return map[code] ?? code;
};

/** Removes a code from every action of the given bindings (used when rebinding to avoid duplicates). */
export const withoutCode = (b: Bindings, code: string): Bindings => {
  const next = cloneBindings(b);
  for (const key of Object.keys(next) as (keyof Bindings)[]) {
    next[key] = next[key].filter((c) => c !== code);
  }
  return next;
};
