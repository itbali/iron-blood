import { ACTIONS, DEFAULT_BINDINGS, cloneBindings, type ActionId, type BindingSet } from './KeyBindings';
import type { InputFrame, InputSource } from './InputFrame';

type KeyListener = (code: string, e: KeyboardEvent) => void;

/**
 * Keyboard + touch → per-slot InputFrame bitmasks. Pure state; the sim only ever polls it,
 * so input stays separate from visual state.
 */
export class InputManager {
  private bindings: BindingSet = cloneBindings(DEFAULT_BINDINGS);
  private down = new Set<string>();
  private virtual: [number, number] = [0, 0];
  private keyDownListeners = new Set<KeyListener>();
  private attached = false;
  private capture: ((code: string) => void) | null = null;

  setBindings(b: BindingSet): void {
    this.bindings = cloneBindings(b);
  }

  getBindings(): BindingSet {
    return this.bindings;
  }

  attach(target: Window = window): void {
    if (this.attached) return;
    this.attached = true;
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
    target.addEventListener('blur', this.onBlur);
  }

  detach(target: Window = window): void {
    if (!this.attached) return;
    this.attached = false;
    target.removeEventListener('keydown', this.onDown);
    target.removeEventListener('keyup', this.onUp);
    target.removeEventListener('blur', this.onBlur);
    this.down.clear();
  }

  onKeyDown(fn: KeyListener): () => void {
    this.keyDownListeners.add(fn);
    return () => this.keyDownListeners.delete(fn);
  }

  /** Next physical key press is delivered to `fn` instead of the game (used by the rebind UI). */
  captureNextKey(fn: (code: string) => void): void {
    this.capture = fn;
  }

  cancelCapture(): void {
    this.capture = null;
  }

  setVirtual(slot: number, mask: number): void {
    this.virtual[slot] = mask;
  }

  poll(slot: number): InputFrame {
    const set = slot === 0 ? this.bindings.p1 : this.bindings.p2;
    let mask = this.virtual[slot] ?? 0;
    for (const a of ACTIONS) {
      const codes = set[a.id];
      for (let i = 0; i < codes.length; i++) {
        if (this.down.has(codes[i])) {
          mask |= a.bit;
          break;
        }
      }
    }
    return mask;
  }

  source(slot: number): InputSource {
    return { poll: () => this.poll(slot) };
  }

  isHeld(code: string): boolean {
    return this.down.has(code);
  }

  actionForCode(slot: number, code: string): ActionId | null {
    const set = slot === 0 ? this.bindings.p1 : this.bindings.p2;
    for (const a of ACTIONS) if (set[a.id].includes(code)) return a.id;
    return null;
  }

  private onDown = (e: KeyboardEvent): void => {
    if (this.capture) {
      e.preventDefault();
      const fn = this.capture;
      this.capture = null;
      fn(e.code);
      return;
    }
    if (this.isGameKey(e.code)) e.preventDefault();
    if (!e.repeat) {
      this.down.add(e.code);
      this.keyDownListeners.forEach((fn) => fn(e.code, e));
    }
  };

  private onUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private onBlur = (): void => {
    this.down.clear();
  };

  private isGameKey(code: string): boolean {
    if (/^F[3-8]$/.test(code)) return code === 'F3' || import.meta.env.DEV;
    for (const set of [this.bindings.p1, this.bindings.p2]) {
      for (const a of ACTIONS) if (set[a.id].includes(code)) return true;
    }
    return code === 'Escape';
  }
}
