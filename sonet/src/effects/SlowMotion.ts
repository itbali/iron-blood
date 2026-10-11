/** Time-scale controller: the loop multiplies elapsed time by `scale`; rendering never stops. */
export class SlowMotion {
  scale = 1;
  private target = 1;
  private remainingMs = 0;
  private holdScale = 1;

  trigger(scale: number, durationMs: number): void {
    if (scale < this.holdScale || this.remainingMs <= 0) {
      this.holdScale = scale;
      this.remainingMs = durationMs;
    } else {
      this.remainingMs = Math.max(this.remainingMs, durationMs);
    }
  }

  /** Holds a scale until `release()` (used by cinematic finishers). */
  hold(scale: number): void {
    this.holdScale = scale;
    this.remainingMs = Number.POSITIVE_INFINITY;
  }

  release(): void {
    this.remainingMs = 0;
  }

  update(realMs: number): void {
    if (this.remainingMs > 0) {
      this.remainingMs -= realMs;
      this.target = this.holdScale;
    } else {
      this.target = 1;
    }
    const k = this.target < this.scale ? 0.35 : 0.08;
    this.scale += (this.target - this.scale) * k;
    if (Math.abs(this.scale - 1) < 0.01 && this.target === 1) this.scale = 1;
  }

  reset(): void {
    this.scale = 1;
    this.target = 1;
    this.remainingMs = 0;
  }
}
