import type { Action, Axis, FrameInput } from './InputTypes';
import { ACTION_BUTTON, ACTIONS } from './InputTypes';
import type { Bindings } from './KeyBindings';

type KeyListener = (code: string, event: KeyboardEvent) => void;

/**
 * Collects raw keyboard (and virtual touch) state and turns it into per-frame FrameInput.
 * Presses are latched until the next sample so a tap shorter than one frame is never lost.
 */
export class InputManager {
  private held = new Set<string>();
  private pressedSinceSample = new Set<string>();
  private virtualHeld = new Set<Action>();
  private virtualPressed = new Set<Action>();
  private keyDownListeners = new Set<KeyListener>();
  private attached = false;
  private gameKeys = new Set<string>();

  constructor(private bindings: [Bindings, Bindings]) {
    this.rebuildGameKeys();
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
    this.held.clear();
    this.pressedSinceSample.clear();
  }

  setBindings(bindings: [Bindings, Bindings]): void {
    this.bindings = bindings;
    this.rebuildGameKeys();
  }

  onKey(listener: KeyListener): () => void {
    this.keyDownListeners.add(listener);
    return () => this.keyDownListeners.delete(listener);
  }

  /** Used by touch controls; always maps to player 1. */
  setVirtual(action: Action, down: boolean): void {
    if (down) {
      if (!this.virtualHeld.has(action)) this.virtualPressed.add(action);
      this.virtualHeld.add(action);
    } else {
      this.virtualHeld.delete(action);
    }
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  /** Samples both players for this simulation frame and clears latched presses. */
  sample(): [FrameInput, FrameInput] {
    const p1 = this.build(0, true);
    const p2 = this.build(1, false);
    this.pressedSinceSample.clear();
    this.virtualPressed.clear();
    return [p1, p2];
  }

  /** Clear latched presses without producing input (e.g. while paused). */
  flush(): void {
    this.pressedSinceSample.clear();
    this.virtualPressed.clear();
  }

  private build(player: 0 | 1, includeVirtual: boolean): FrameInput {
    const b = this.bindings[player];
    const isHeld = (a: Action) => b[a].some((c) => this.held.has(c)) || (includeVirtual && this.virtualHeld.has(a));
    const isPressed = (a: Action) =>
      b[a].some((c) => this.pressedSinceSample.has(c)) || (includeVirtual && this.virtualPressed.has(a));
    const x = ((isHeld('right') ? 1 : 0) - (isHeld('left') ? 1 : 0)) as Axis;
    const y = ((isHeld('up') ? 1 : 0) - (isHeld('down') ? 1 : 0)) as Axis;
    let held = 0;
    let pressed = 0;
    for (const a of ACTIONS) {
      const bit = ACTION_BUTTON[a];
      if (!bit) continue;
      if (isHeld(a)) held |= bit;
      if (isPressed(a)) pressed |= bit;
    }
    return { x, y, held: held | pressed, pressed };
  }

  private rebuildGameKeys(): void {
    this.gameKeys.clear();
    for (const b of this.bindings) for (const a of ACTIONS) for (const c of b[a]) this.gameKeys.add(c);
    ['F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach((c) =>
      this.gameKeys.add(c),
    );
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    if (!typing && this.gameKeys.has(e.code)) e.preventDefault();
    if (!e.repeat) {
      this.held.add(e.code);
      this.pressedSinceSample.add(e.code);
      this.keyDownListeners.forEach((l) => l(e.code, e));
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onBlur = (): void => {
    this.held.clear();
    this.virtualHeld.clear();
  };
}
