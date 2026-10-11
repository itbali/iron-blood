/** Decaying random offset in screen pixels. */
export class ScreenShake {
  private amp = 0;
  private decay = 0.86;
  x = 0;
  y = 0;
  /** Multiplier from settings (0 disables). */
  scale = 1;

  add(amplitude: number, decay = 0.86): void {
    if (amplitude > this.amp) {
      this.amp = amplitude;
      this.decay = decay;
    }
  }

  update(): void {
    if (this.amp < 0.15) {
      this.amp = 0;
      this.x = 0;
      this.y = 0;
      return;
    }
    const a = this.amp * this.scale;
    this.x = (Math.random() * 2 - 1) * a;
    this.y = (Math.random() * 2 - 1) * a;
    this.amp *= this.decay;
  }

  reset(): void {
    this.amp = 0;
    this.x = 0;
    this.y = 0;
  }
}
