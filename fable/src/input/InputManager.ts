import { Btn, makeInput, type InputFrame } from './InputFrame';
import { ACTIONS, type Action, type KeyBindings } from './KeyBindings';

export type SystemAction = 'pause' | 'restart' | 'debug' | 'cheatHealth' | 'cheatMeter' | 'cheatRefill' | 'cheatReset' | 'cheatAi' | 'any';

const ACTION_TO_BUTTON: Partial<Record<Action, number>> = {
  LP: Btn.LP,
  HP: Btn.HP,
  LK: Btn.LK,
  HK: Btn.HK,
  SP1: Btn.SP1,
  SP2: Btn.SP2,
  BLOCK: Btn.BLOCK,
  GRAB: Btn.GRAB,
};

/** Virtual (touch / on-screen) input state merged into a player's frame. */
export interface VirtualInput {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  held: number;
  /** Buttons pressed since the last sample (edge-triggered). */
  pressedQueue: number;
}

/**
 * Translates DOM keyboard events (and virtual touch state) into per-tick InputFrames.
 * Presses are latched between samples so a key tapped between two ticks is never lost.
 */
export class InputManager {
  private down = new Set<string>();
  private pressedSinceSample = new Set<string>();
  private bindings: [KeyBindings, KeyBindings];
  private systemListeners = new Set<(action: SystemAction, code: string) => void>();
  private previousHeld: [number, number] = [0, 0];
  readonly virtual: [VirtualInput, VirtualInput] = [
    { x: 0, y: 0, held: 0, pressedQueue: 0 },
    { x: 0, y: 0, held: 0, pressedQueue: 0 },
  ];
  private attached = false;
  /** When true, gameplay keys are ignored (menus). */
  capture = true;

  constructor(p1: KeyBindings, p2: KeyBindings) {
    this.bindings = [p1, p2];
  }

  setBindings(side: 0 | 1, bindings: KeyBindings): void {
    this.bindings[side] = bindings;
  }

  attach(target: Window = window): void {
    if (this.attached) return;
    this.attached = true;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  detach(target: Window = window): void {
    if (!this.attached) return;
    this.attached = false;
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    target.removeEventListener('blur', this.onBlur);
  }

  onSystem(fn: (action: SystemAction, code: string) => void): () => void {
    this.systemListeners.add(fn);
    return () => this.systemListeners.delete(fn);
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const code = e.code;
    this.down.add(code);
    this.pressedSinceSample.add(code);
    const system = systemActionFor(code);
    if (system) {
      e.preventDefault();
      for (const fn of this.systemListeners) fn(system, code);
    }
    for (const fn of this.systemListeners) fn('any', code);
    if (this.capture && this.isGameplayKey(code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private onBlur = (): void => {
    this.down.clear();
  };

  private isGameplayKey(code: string): boolean {
    for (const b of this.bindings) for (const a of ACTIONS) if (b[a] === code) return true;
    return false;
  }

  /** Samples the current state into an InputFrame for the given player. Call once per simulation tick. */
  sample(side: 0 | 1): InputFrame {
    const b = this.bindings[side];
    const v = this.virtual[side];
    let x = (b.right && this.down.has(b.right) ? 1 : 0) - (b.left && this.down.has(b.left) ? 1 : 0);
    let y = (b.up && this.down.has(b.up) ? 1 : 0) - (b.down && this.down.has(b.down) ? 1 : 0);
    if (x === 0) x = v.x;
    if (y === 0) y = v.y;
    let held = v.held;
    let pressed = v.pressedQueue;
    v.pressedQueue = 0;
    for (const action of ACTIONS) {
      const bit = ACTION_TO_BUTTON[action];
      if (!bit) continue;
      const code = b[action];
      if (this.down.has(code)) held |= bit;
      if (this.pressedSinceSample.has(code)) pressed |= bit;
    }
    // Edge detection on virtual held buttons (a touch that started and is still held).
    const newlyHeld = held & ~this.previousHeld[side];
    pressed |= newlyHeld & v.held;
    this.previousHeld[side] = held;
    if (side === 1) this.pressedSinceSample.clear();
    return makeInput(x as -1 | 0 | 1, y as -1 | 0 | 1, held, pressed);
  }

  /** Clears latched presses; call after sampling all players for a tick. */
  endTick(): void {
    this.pressedSinceSample.clear();
  }

  clear(): void {
    this.down.clear();
    this.pressedSinceSample.clear();
  }
}

const systemActionFor = (code: string): SystemAction | null => {
  switch (code) {
    case 'Escape':
      return 'pause';
    case 'KeyR':
      return 'restart';
    case 'F3':
      return 'debug';
    case 'F4':
      return 'cheatHealth';
    case 'F5':
      return 'cheatMeter';
    case 'F6':
      return 'cheatRefill';
    case 'F7':
      return 'cheatReset';
    case 'F8':
      return 'cheatAi';
    default:
      return null;
  }
};
