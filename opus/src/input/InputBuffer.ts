import { INPUT_HISTORY_FRAMES } from '../core/constants';
import type { FrameInput, NumpadDir } from './InputTypes';
import { toNumpad } from './InputTypes';

/** Direction tokens used to describe special-move motions, relative to facing. */
export type MotionToken = 'F' | 'B' | 'D' | 'U' | 'DF' | 'DB' | 'N';

const TOKEN_DIRS: Record<MotionToken, readonly NumpadDir[]> = {
  F: [6],
  B: [4],
  D: [2, 1, 3],
  U: [8, 7, 9],
  DF: [3],
  DB: [1],
  N: [5, 2, 8, 1, 7, 3, 9],
};

interface Entry {
  dir: NumpadDir;
  pressed: number;
  held: number;
  frame: number;
  consumed: number;
}

/**
 * Ring buffer of recent inputs for one fighter. Directions are stored relative to the
 * facing at the moment of input so motions keep working when sides switch mid-motion.
 */
export class InputBuffer {
  private entries: Entry[] = [];
  private head = 0;
  private count = 0;
  private frame = 0;

  constructor(private readonly capacity = INPUT_HISTORY_FRAMES) {
    for (let i = 0; i < capacity; i++) this.entries.push({ dir: 5, pressed: 0, held: 0, frame: -1, consumed: 0 });
  }

  push(input: FrameInput, facing: 1 | -1): void {
    this.frame++;
    const e = this.entries[this.head];
    e.dir = toNumpad(input.x, input.y, facing);
    e.pressed = input.pressed;
    e.held = input.held;
    e.frame = this.frame;
    e.consumed = 0;
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }

  clear(): void {
    this.count = 0;
  }

  get currentFrame(): number {
    return this.frame;
  }

  /** i = 0 is the most recent frame. */
  private at(i: number): Entry | undefined {
    if (i >= this.count) return undefined;
    return this.entries[(this.head - 1 - i + this.capacity * 2) % this.capacity];
  }

  latestDir(): NumpadDir {
    return this.at(0)?.dir ?? 5;
  }

  /**
   * Index (age in frames) of the most recent unconsumed press of `mask` within `window` frames, or -1.
   * For multi-bit masks every bit must have been pressed within the window (e.g. I+O for the super).
   */
  findPress(mask: number, window: number): number {
    let remaining = mask;
    let oldest = -1;
    for (let i = 0; i < Math.min(window, this.count); i++) {
      const e = this.at(i)!;
      const fresh = e.pressed & ~e.consumed & remaining;
      if (fresh) {
        remaining &= ~fresh;
        oldest = i;
        if (!remaining) return oldest;
      }
    }
    return -1;
  }

  consume(mask: number, window: number): void {
    let remaining = mask;
    for (let i = 0; i < Math.min(window, this.count) && remaining; i++) {
      const e = this.at(i)!;
      const hit = e.pressed & ~e.consumed & remaining;
      e.consumed |= hit;
      remaining &= ~hit;
    }
  }

  /**
   * Checks that `motion` tokens appear in order, ending no earlier than `endAge` frames ago
   * and starting within `window` frames of that. Intermediate frames are ignored, which makes
   * motions lenient the way arcade fighters are.
   */
  matchMotion(motion: readonly MotionToken[], window: number, endAge = 0): boolean {
    if (motion.length === 0) return true;
    let tokenIndex = motion.length - 1;
    const limit = Math.min(this.count, endAge + window);
    for (let i = endAge; i < limit; i++) {
      const e = this.at(i)!;
      if (TOKEN_DIRS[motion[tokenIndex]].includes(e.dir)) {
        tokenIndex--;
        if (tokenIndex < 0) return true;
      }
    }
    return false;
  }

  /** Recent directions, newest first — used by the debug overlay. */
  recentDirs(n: number): NumpadDir[] {
    const out: NumpadDir[] = [];
    for (let i = 0; i < Math.min(n, this.count); i++) out.push(this.at(i)!.dir);
    return out;
  }

  /** Presses since `age` frames ago, newest first — for the debug overlay. */
  recentPresses(n: number): { age: number; pressed: number }[] {
    const out: { age: number; pressed: number }[] = [];
    for (let i = 0; i < Math.min(n, this.count); i++) {
      const e = this.at(i)!;
      if (e.pressed) out.push({ age: i, pressed: e.pressed });
    }
    return out;
  }
}
