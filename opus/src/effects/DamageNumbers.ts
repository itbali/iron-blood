interface DamageNumber {
  alive: boolean;
  x: number;
  y: number;
  text: string;
  sub: string;
  life: number;
  color: string;
}

const LIFE_FRAMES = 42;
const RISE_PER_FRAME = 1.1;

/** Pooled floating damage labels ("-84 CRITICAL") shown on strong hits only. */
export class DamageNumbers {
  private pool: DamageNumber[] = Array.from({ length: 24 }, () => ({ alive: false, x: 0, y: 0, text: '', sub: '', life: 0, color: '#fff' }));
  enabled = true;

  spawn(x: number, y: number, damage: number, sub: string, color: string): void {
    if (!this.enabled) return;
    const n = this.pool.find((p) => !p.alive) ?? this.pool[0];
    n.alive = true;
    n.x = x + (Math.random() - 0.5) * 30;
    n.y = y + 30;
    n.text = `-${Math.round(damage)}`;
    n.sub = sub;
    n.life = LIFE_FRAMES;
    n.color = color;
  }

  update(dt: number): void {
    for (const n of this.pool) {
      if (!n.alive) continue;
      n.life -= dt;
      n.y += RISE_PER_FRAME * dt;
      if (n.life <= 0) n.alive = false;
    }
  }

  clear(): void {
    for (const n of this.pool) n.alive = false;
  }

  render(ctx: CanvasRenderingContext2D, sx: (x: number) => number, sy: (y: number) => number, zoom: number): void {
    ctx.textAlign = 'center';
    for (const n of this.pool) {
      if (!n.alive) continue;
      const t = n.life / LIFE_FRAMES;
      const pop = t > 0.85 ? 1 + (t - 0.85) * 3 : 1;
      ctx.globalAlpha = Math.min(1, t * 2.5);
      const px = sx(n.x);
      const py = sy(n.y);
      ctx.font = `900 ${Math.round(34 * zoom * pop)}px "Barlow Condensed", Impact, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(n.text, px, py);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, px, py);
      if (n.sub) {
        ctx.font = `800 ${Math.round(16 * zoom)}px "Barlow Condensed", Impact, sans-serif`;
        ctx.strokeText(n.sub, px, py + 20 * zoom);
        ctx.fillStyle = '#ffd27a';
        ctx.fillText(n.sub, px, py + 20 * zoom);
      }
    }
    ctx.globalAlpha = 1;
  }
}
