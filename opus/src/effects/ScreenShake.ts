/** Trauma-style screen shake: intensity decays smoothly, offsets use layered sines (no jitter at 144 Hz). */
export class ScreenShake {
  private intensity = 0;
  private time = 0;
  enabled = true;
  scale = 1;
  x = 0;
  y = 0;

  add(px: number): void {
    if (!this.enabled) return;
    this.intensity = Math.min(18, Math.max(this.intensity, px * this.scale));
  }

  update(dtFrames: number): void {
    this.time += dtFrames;
    if (this.intensity <= 0.05) {
      this.intensity = 0;
      this.x = 0;
      this.y = 0;
      return;
    }
    const t = this.time;
    this.x = (Math.sin(t * 2.7) * 0.6 + Math.sin(t * 7.3) * 0.4) * this.intensity;
    this.y = (Math.cos(t * 3.1) * 0.6 + Math.sin(t * 5.9) * 0.4) * this.intensity;
    this.intensity *= Math.pow(0.86, dtFrames);
  }

  reset(): void {
    this.intensity = 0;
    this.x = 0;
    this.y = 0;
  }
}
