export class ScreenFlash {
  alpha = 0;
  color = '#ffffff';
  enabled = true;
  /** Darkening overlay for supers and finishers. */
  darken = 0;
  private darkenTarget = 0;

  flash(color: string, strength: number): void {
    if (!this.enabled) return;
    this.color = color;
    this.alpha = Math.max(this.alpha, strength);
  }

  setDarken(v: number): void {
    this.darkenTarget = v;
  }

  update(dt: number): void {
    this.alpha *= Math.pow(0.8, dt);
    if (this.alpha < 0.01) this.alpha = 0;
    this.darken += (this.darkenTarget - this.darken) * (1 - Math.pow(0.85, dt));
  }

  reset(): void {
    this.alpha = 0;
    this.darken = 0;
    this.darkenTarget = 0;
  }
}
