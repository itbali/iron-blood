import type { ButtonId, MotionDir } from '../combat/types';
import { BUFFER_FRAMES, MOTION_WINDOW } from '../data/constants';
import { BUTTON_BIT, Btn, DIR_BIT, Rel, type InputFrame } from './InputFrame';

interface Entry {
  rel: number;
  held: number;
  edges: number;
}

const CAPACITY = 40;

/**
 * Per-fighter history of facing-relative input. Serves three jobs:
 * buffered button presses, motion detection (→→, ↓→, ↓←) and super (I+O) detection.
 */
export class InputBuffer {
  private entries: Entry[] = [];
  private prevHeld = 0;

  clear(): void {
    this.entries.length = 0;
    this.prevHeld = 0;
  }

  push(frame: InputFrame, facing: 1 | -1): void {
    const forward = facing === 1 ? Btn.RIGHT : Btn.LEFT;
    const backward = facing === 1 ? Btn.LEFT : Btn.RIGHT;
    let rel = 0;
    if (frame & forward) rel |= Rel.FWD;
    if (frame & backward) rel |= Rel.BACK;
    if (frame & Btn.UP) rel |= Rel.UP;
    if (frame & Btn.DOWN) rel |= Rel.DOWN;
    const buttons = frame & ~(Btn.LEFT | Btn.RIGHT | Btn.UP | Btn.DOWN);
    const edges = buttons & ~this.prevHeld;
    this.prevHeld = buttons;
    this.entries.push({ rel, held: buttons, edges });
    if (this.entries.length > CAPACITY) this.entries.shift();
  }

  heldNow(bit: number): boolean {
    const e = this.entries[this.entries.length - 1];
    return !!e && (e.held & bit) !== 0;
  }

  relNow(bit: number): boolean {
    const e = this.entries[this.entries.length - 1];
    return !!e && (e.rel & bit) !== 0;
  }

  /** Was the button newly pressed within the last `window` frames and not yet consumed? */
  pressed(bit: number, window = BUFFER_FRAMES): boolean {
    const n = this.entries.length;
    for (let i = n - 1; i >= 0 && i >= n - window; i--) {
      if (this.entries[i].edges & bit) return true;
    }
    return false;
  }

  /** Frames since the newest unconsumed edge of this button, or -1. */
  pressAge(bit: number, window = BUFFER_FRAMES): number {
    const n = this.entries.length;
    for (let i = n - 1; i >= 0 && i >= n - window; i--) {
      if (this.entries[i].edges & bit) return n - 1 - i;
    }
    return -1;
  }

  consume(bit: number, window = CAPACITY): void {
    const n = this.entries.length;
    for (let i = n - 1; i >= 0 && i >= n - window; i--) {
      this.entries[i].edges &= ~bit;
    }
  }

  /** Both buttons pressed within SUPER_WINDOW frames of each other, both unconsumed. */
  chord(a: number, b: number, window: number): boolean {
    const ageA = this.pressAge(a, window);
    const ageB = this.pressAge(b, window);
    if (ageA < 0 || ageB < 0) return false;
    return true;
  }

  /**
   * Motion matcher. History is collapsed into runs of identical direction state;
   * each motion step must land on a distinct run, in order, with the last step still recent.
   * Two taps of the same direction therefore need a release in between (classic dash).
   */
  motion(seq: MotionDir[], window = MOTION_WINDOW): boolean {
    const n = this.entries.length;
    if (n === 0) return false;
    const start = Math.max(0, n - window);
    const runs: { dirs: number; end: number }[] = [];
    for (let i = start; i < n; i++) {
      const dirs = this.entries[i].rel;
      const last = runs[runs.length - 1];
      if (last && last.dirs === dirs) last.end = i;
      else runs.push({ dirs, end: i });
    }
    let r = 0;
    let lastEnd = -1;
    // a motion without ↓ must not be satisfied by frames that hold ↓ (keeps ↓→ from also reading as →→)
    const forbid = seq.includes('DOWN') ? 0 : Rel.DOWN;
    for (const step of seq) {
      const bit = DIR_BIT[step];
      while (r < runs.length && ((runs[r].dirs & bit) === 0 || (runs[r].dirs & forbid) !== 0)) r++;
      if (r >= runs.length) return false;
      lastEnd = runs[r].end;
      r++;
    }
    return n - 1 - lastEnd <= 10;
  }

  /** Motion followed by a fresh button press. */
  command(seq: MotionDir[], button: ButtonId, window = BUFFER_FRAMES): boolean {
    return this.pressed(BUTTON_BIT[button], window) && this.motion(seq);
  }

  snapshot(count = 12): { rel: number; held: number }[] {
    return this.entries.slice(-count).map((e) => ({ rel: e.rel, held: e.held }));
  }
}
