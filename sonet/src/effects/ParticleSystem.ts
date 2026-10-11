type Kind = 'dot' | 'streak' | 'smoke' | 'ring' | 'ember' | 'shard';

interface Particle {
  active: boolean;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  gravity: number;
  drag: number;
  color: string;
  additive: boolean;
  rot: number;
}

const POOL_SIZE = 1800;

/** Pooled world-space particles (y up). Nothing is allocated after construction. */
export class ParticleSystem {
  private readonly pool: Particle[] = [];
  private cursor = 0;
  /** 0 disables spawning, 1 is normal density. */
  density = 1;
  active = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        active: false, kind: 'dot', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, grow: 0,
        gravity: 0, drag: 1, color: '#fff', additive: false, rot: 0,
      });
    }
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
    this.active = 0;
  }

  private spawn(kind: Kind): Particle | null {
    if (this.density <= 0) return null;
    for (let i = 0; i < POOL_SIZE; i++) {
      const idx = (this.cursor + i) % POOL_SIZE;
      const p = this.pool[idx];
      if (!p.active) {
        this.cursor = idx + 1;
        p.active = true;
        p.kind = kind;
        p.rot = 0;
        return p;
      }
    }
    return null;
  }

  private count(n: number): number {
    return Math.max(this.density > 0 ? 1 : 0, Math.round(n * this.density));
  }

  private set(
    p: Particle, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string,
    opts: { grow?: number; gravity?: number; drag?: number; additive?: boolean } = {},
  ): void {
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life; p.size = size; p.color = color;
    p.grow = opts.grow ?? 0; p.gravity = opts.gravity ?? 0; p.drag = opts.drag ?? 0.98; p.additive = opts.additive ?? false;
  }

  sparks(x: number, y: number, dir: number, n: number, color: string, power = 1): void {
    const c = this.count(n);
    for (let i = 0; i < c; i++) {
      const p = this.spawn('streak');
      if (!p) return;
      const a = (Math.random() - 0.5) * 2.4;
      const sp = (5 + Math.random() * 9) * power;
      this.set(p, x, y, Math.cos(a) * sp * dir + (Math.random() - 0.5) * 3, Math.sin(a) * sp + 2, 14 + Math.random() * 14, 2 + Math.random() * 2, color,
        { gravity: -0.35, drag: 0.93, additive: true });
    }
  }

  burst(x: number, y: number, n: number, color: string, power = 1, additive = true): void {
    const c = this.count(n);
    for (let i = 0; i < c; i++) {
      const p = this.spawn('dot');
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const sp = (1 + Math.random() * 7) * power;
      this.set(p, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 16 + Math.random() * 18, 3 + Math.random() * 4, color,
        { gravity: -0.12, drag: 0.92, additive, grow: -0.08 });
    }
  }

  blood(x: number, y: number, dir: number, n: number): void {
    const c = this.count(n);
    for (let i = 0; i < c; i++) {
      const p = this.spawn('dot');
      if (!p) return;
      const a = (Math.random() - 0.35) * 1.8;
      const sp = 3 + Math.random() * 8;
      this.set(p, x, y, Math.cos(a) * sp * dir, Math.sin(a) * sp + 1, 26 + Math.random() * 24, 2.5 + Math.random() * 3.2, Math.random() < 0.5 ? '#a0121c' : '#d51f2b',
        { gravity: -0.5, drag: 0.97 });
    }
  }

  smoke(x: number, y: number, n: number, color = 'rgba(120,120,130,0.5)', size = 22): void {
    const c = this.count(n);
    for (let i = 0; i < c; i++) {
      const p = this.spawn('smoke');
      if (!p) return;
      this.set(p, x + (Math.random() - 0.5) * 20, y, (Math.random() - 0.5) * 2, 0.5 + Math.random() * 1.4, 40 + Math.random() * 30, size * (0.6 + Math.random() * 0.8), color,
        { grow: 0.5, drag: 0.97 });
    }
  }

  dust(x: number, y: number, n: number, dir = 0): void {
    const c = this.count(n);
    for (let i = 0; i < c; i++) {
      const p = this.spawn('smoke');
      if (!p) return;
      const side = dir !== 0 ? dir : Math.random() < 0.5 ? -1 : 1;
      this.set(p, x, y + 2, side * (1 + Math.random() * 4), 0.4 + Math.random() * 1.2, 22 + Math.random() * 18, 10 + Math.random() * 10, 'rgba(150,150,160,0.35)',
        { grow: 0.45, drag: 0.93 });
    }
  }

  ring(x: number, y: number, color: string, size = 60, life = 14): void {
    const p = this.spawn('ring');
    if (!p) return;
    this.set(p, x, y, 0, 0, life, size * 0.2, color, { grow: size / life, additive: true, drag: 1 });
  }

  embers(x: number, y: number, n: number, color: string, spread = 120): void {
    const c = this.count(n);
    for (let i = 0; i < c; i++) {
      const p = this.spawn('ember');
      if (!p) return;
      this.set(p, x + (Math.random() - 0.5) * spread, y + Math.random() * 40, (Math.random() - 0.5) * 1.5, 1 + Math.random() * 2.5, 50 + Math.random() * 40, 2 + Math.random() * 2.4, color,
        { gravity: 0.015, drag: 0.99, additive: true });
    }
  }

  trail(x: number, y: number, color: string, size = 10): void {
    const p = this.spawn('dot');
    if (!p) return;
    this.set(p, x, y, 0, 0, 12, size, color, { grow: -0.6, additive: true, drag: 1 });
  }

  shards(x: number, y: number, n: number, color: string, power = 1): void {
    const c = this.count(n);
    for (let i = 0; i < c; i++) {
      const p = this.spawn('shard');
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const sp = (3 + Math.random() * 10) * power;
      this.set(p, x, y, Math.cos(a) * sp, Math.sin(a) * sp + 3, 30 + Math.random() * 25, 4 + Math.random() * 5, color, { gravity: -0.4, drag: 0.97 });
      p.rot = Math.random() * 6;
    }
  }

  update(): void {
    let n = 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life--;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      n++;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.size = Math.max(0.1, p.size + p.grow);
      p.rot += 0.2;
    }
    this.active = n;
  }

  /** Draw under a y-up world transform. */
  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
      switch (p.kind) {
        case 'dot':
        case 'ember':
          ctx.globalAlpha = Math.min(1, t * 1.6);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'smoke':
          ctx.globalAlpha = t * 0.7;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'streak':
          ctx.globalAlpha = Math.min(1, t * 1.5);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * Math.min(1, t * 2);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
          ctx.stroke();
          break;
        case 'ring':
          ctx.globalAlpha = t;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 + 5 * t;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'shard':
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size * 0.3, p.size * 2, p.size * 0.6);
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
