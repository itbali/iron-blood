/** Decaying random screen offset; intensity in world pixels. */
export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  x = 0;
  y = 0;
  enabled = true;
  scale = 1;

  shake(intensity: number, durationTicks = 12): void {
    if (!this.enabled) return;
    if (intensity * this.scale > this.intensity) {
      this.intensity = intensity * this.scale;
      this.duration = durationTicks;
      this.elapsed = 0;
    }
  }

  update(dt: number): void {
    if (this.intensity <= 0) {
      this.x = 0;
      this.y = 0;
      return;
    }
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const amp = this.intensity * (1 - t) * (1 - t);
    this.x = (Math.random() * 2 - 1) * amp;
    this.y = (Math.random() * 2 - 1) * amp * 0.7;
    if (t >= 1) {
      this.intensity = 0;
      this.x = 0;
      this.y = 0;
    }
  }
}
