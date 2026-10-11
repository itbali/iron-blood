import { STEP_MS } from '../data/constants';

export interface LoopHandlers {
  /** Fixed-step simulation tick (60 Hz). */
  update(): void;
  /** Variable-rate render, called once per animation frame. */
  render(realDtMs: number): void;
  /** Multiplies elapsed time fed to the simulation (slow motion). */
  timeScale(): number;
}

const MAX_STEPS_PER_FRAME = 6;

/** requestAnimationFrame driver with a fixed-timestep accumulator. Rendering never waits for the simulation. */
export class GameLoop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  running = false;
  fps = 60;
  private fpsFrames = 0;
  private fpsStart = 0;

  constructor(private readonly h: LoopHandlers) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.fpsStart = this.last;
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(100, now - this.last);
    this.last = now;
    this.acc += dt * this.h.timeScale();
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.h.update();
      this.acc -= STEP_MS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.h.render(dt);
    this.fpsFrames++;
    if (now - this.fpsStart >= 500) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsStart));
      this.fpsFrames = 0;
      this.fpsStart = now;
    }
    this.raf = requestAnimationFrame(this.frame);
  };
}
