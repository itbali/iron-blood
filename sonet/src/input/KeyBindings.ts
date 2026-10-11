import { Btn } from './InputFrame';

export type ActionId =
  | 'left' | 'right' | 'up' | 'down'
  | 'lp' | 'hp' | 'lk' | 'hk' | 'sp1' | 'sp2' | 'block' | 'grab';

export const ACTIONS: { id: ActionId; label: string; bit: number }[] = [
  { id: 'left', label: 'Move Left', bit: Btn.LEFT },
  { id: 'right', label: 'Move Right', bit: Btn.RIGHT },
  { id: 'up', label: 'Jump', bit: Btn.UP },
  { id: 'down', label: 'Crouch', bit: Btn.DOWN },
  { id: 'lp', label: 'Light Punch', bit: Btn.LP },
  { id: 'hp', label: 'Heavy Punch', bit: Btn.HP },
  { id: 'lk', label: 'Light Kick', bit: Btn.LK },
  { id: 'hk', label: 'Heavy Kick', bit: Btn.HK },
  { id: 'sp1', label: 'Special 1', bit: Btn.SP1 },
  { id: 'sp2', label: 'Special 2', bit: Btn.SP2 },
  { id: 'block', label: 'Block', bit: Btn.BLOCK },
  { id: 'grab', label: 'Grab', bit: Btn.GRAB },
];

/** Each action maps to one or more KeyboardEvent.code values. */
export type Bindings = Record<ActionId, string[]>;

export interface BindingSet {
  p1: Bindings;
  p2: Bindings;
}

export const DEFAULT_BINDINGS: BindingSet = {
  p1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    lp: ['KeyJ'], hp: ['KeyK'], lk: ['KeyL'], hk: ['Semicolon'],
    sp1: ['KeyI'], sp2: ['KeyO'], block: ['Space'], grab: ['KeyE'],
  },
  p2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    lp: ['Numpad1', 'Digit1'], hp: ['Numpad2', 'Digit2'],
    lk: ['Numpad3', 'Digit3'], hk: ['Numpad4', 'Digit4'],
    sp1: ['Numpad5', 'Digit5'], sp2: ['Numpad6', 'Digit6'],
    block: ['Numpad0', 'Digit0'], grab: ['Numpad7', 'Digit7'],
  },
};

export function cloneBindings(b: BindingSet): BindingSet {
  return JSON.parse(JSON.stringify(b)) as BindingSet;
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  const names: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    Space: 'Space', Semicolon: ';', Comma: ',', Period: '.', Slash: '/',
    ShiftRight: 'R-Shift', ShiftLeft: 'L-Shift', Enter: 'Enter', Quote: "'",
  };
  return names[code] ?? code;
}
