import { MAX_TICKS_PER_FRAME, TICK_MS } from '@/core/constants';

export interface LoopCallbacks {
  /** Fixed-step simulation update. */
  tick(): void;
  /** Rendering; `alpha` is the interpolation fraction, `dtTicks` the real elapsed time in ticks. */
  render(alpha: number, dtTicks: number): void;
}

/**
 * requestAnimationFrame loop with a fixed 60 Hz simulation step and an accumulator.
 * `timeScale` slows the simulation (slow motion) without touching rendering.
 */
export class GameLoop {
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  running = false;
  paused = false;
  timeScale = 1;
  fps = 0;
  private fpsAccum = 0;
  private fpsCount = 0;
  private slowmoTicks = 0;
  private slowmoScale = 1;

  constructor(private callbacks: LoopCallbacks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Temporary slow motion measured in real-time ticks. */
  slowmo(ticks: number, scale: number): void {
    if (ticks <= 0) return;
    if (this.slowmoTicks > 0 && this.slowmoScale < scale) return;
    this.slowmoTicks = ticks;
    this.slowmoScale = scale;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let dt = now - this.last;
    this.last = now;
    if (dt > 250) dt = 250;
    this.fpsAccum += dt;
    this.fpsCount++;
    if (this.fpsAccum >= 500) {
      this.fps = Math.round((this.fpsCount * 1000) / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsCount = 0;
    }
    const realTicks = dt / TICK_MS;
    const scale = this.slowmoTicks > 0 ? this.slowmoScale : this.timeScale;
    if (this.slowmoTicks > 0) this.slowmoTicks -= realTicks;
    if (!this.paused) {
      this.accumulator += dt * scale;
      let ticks = 0;
      while (this.accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
        this.callbacks.tick();
        this.accumulator -= TICK_MS;
        ticks++;
      }
      if (ticks >= MAX_TICKS_PER_FRAME) this.accumulator = 0;
    }
    this.callbacks.render(this.accumulator / TICK_MS, realTicks * (this.paused ? 0 : scale));
    this.raf = requestAnimationFrame(this.frame);
  };
}
