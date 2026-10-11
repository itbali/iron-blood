import { MAX_STEPS_PER_FRAME, SIM_DT_MS } from '../core/constants';

export interface LoopTarget {
  /** One fixed simulation step (1/60 s of game time). */
  step(): void;
  /** Render with interpolation factor and real elapsed time in 60 Hz frame units. */
  render(interp: number, now: number, dtFrames: number): void;
  /** Current time scale (slow motion < 1). */
  readonly timeScale: number;
}

/**
 * Fixed-timestep loop on requestAnimationFrame: simulation advances in exact 60 Hz
 * steps (scaled by timeScale for slow motion) while rendering runs at display rate.
 * Pausing stops simulation entirely but keeps rendering the frozen frame.
 */
export class GameLoop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  paused = false;
  fps = 60;
  private fpsAcc = 0;
  private fpsFrames = 0;

  constructor(private readonly target: LoopTarget) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const elapsed = Math.min(250, now - this.last);
    this.last = now;
    this.fpsAcc += elapsed;
    this.fpsFrames++;
    if (this.fpsAcc >= 500) {
      this.fps = (this.fpsFrames * 1000) / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    let dtFrames = elapsed / SIM_DT_MS;
    if (!this.paused) {
      this.acc += elapsed * this.target.timeScale;
      let steps = 0;
      while (this.acc >= SIM_DT_MS && steps < MAX_STEPS_PER_FRAME) {
        this.target.step();
        this.acc -= SIM_DT_MS;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    } else {
      dtFrames = 0;
    }
    this.target.render(this.paused ? 1 : this.acc / SIM_DT_MS, now, dtFrames);
    this.raf = requestAnimationFrame(this.tick);
  };
}
