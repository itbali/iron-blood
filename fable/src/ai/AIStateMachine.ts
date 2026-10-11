import type { InputFrame } from '@/input/InputFrame';

export type AIIntent = 'idle' | 'approach' | 'retreat' | 'attack' | 'block' | 'jump' | 'special' | 'grab' | 'combo' | 'punish' | 'antiAir' | 'super' | 'wait';

export interface PlanStep {
  input: InputFrame;
  frames: number;
}

/** A plan is a queue of timed input steps produced by one decision. */
export class AIPlan {
  readonly intent: AIIntent;
  private steps: PlanStep[];
  private stepFrame = 0;
  /** Set once the plan should be re-evaluated even before it ends. */
  interruptible: boolean;

  constructor(intent: AIIntent, steps: PlanStep[], interruptible = true) {
    this.intent = intent;
    this.steps = steps;
    this.interruptible = interruptible;
  }

  get done(): boolean {
    return this.steps.length === 0;
  }

  /** Returns the input for this tick and advances. */
  next(): InputFrame {
    const step = this.steps[0];
    if (!step) return { x: 0, y: 0, held: 0, pressed: 0 };
    const input = this.stepFrame === 0 ? step.input : { ...step.input, pressed: 0 };
    this.stepFrame++;
    if (this.stepFrame >= step.frames) {
      this.steps.shift();
      this.stepFrame = 0;
    }
    return input;
  }
}
