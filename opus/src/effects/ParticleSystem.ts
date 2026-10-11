export type ParticleKind = 'spark' | 'blood' | 'smoke' | 'dust' | 'energy' | 'ember' | 'shard' | 'ring' | 'flare' | 'ash';

/** Plain mutable record reused from the pool — no allocations during gameplay. */
export interface Particle {
  alive: boolean;
  kind: ParticleKind;
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
  rot: number;
  additive: boolean;
}

export interface EmitOptions {
  kind: ParticleKind;
  x: number;
  y: number;
  count: number;
  color: string;
  speed: [number, number];
  angle?: [number, number];
  life: [number, number];
  size: [number, number];
  grow?: number;
  gravity?: number;
  drag?: number;
  additive?: boolean;
  spreadX?: number;
  spreadY?: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Fixed-size particle pool in world space. Visual-only, so it may use Math.random
 * without affecting simulation determinism. `density` scales emission from settings.
 */
export class ParticleSystem {
  readonly pool: Particle[] = [];
  private cursor = 0;
  density = 1;

  constructor(readonly capacity = 1600) {
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        alive: false, kind: 'spark', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, grow: 0, gravity: 0, drag: 1,
        color: '#fff', rot: 0, additive: false,
      });
    }
  }

  emit(o: EmitOptions): void {
    const n = Math.round(o.count * this.density);
    const [a0, a1] = o.angle ?? [0, Math.PI * 2];
    for (let i = 0; i < n; i++) {
      const p = this.acquire();
      const ang = rand(a0, a1);
      const spd = rand(o.speed[0], o.speed[1]);
      p.alive = true;
      p.kind = o.kind;
      p.x = o.x + (o.spreadX ? rand(-o.spreadX, o.spreadX) : 0);
      p.y = o.y + (o.spreadY ? rand(-o.spreadY, o.spreadY) : 0);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.maxLife = p.life = rand(o.life[0], o.life[1]);
      p.size = rand(o.size[0], o.size[1]);
      p.grow = o.grow ?? 0;
      p.gravity = o.gravity ?? 0;
      p.drag = o.drag ?? 0.96;
      p.color = o.color;
      p.rot = ang;
      p.additive = o.additive ?? false;
    }
  }

  private acquire(): Particle {
    for (let i = 0; i < this.capacity; i++) {
      const idx = (this.cursor + i) % this.capacity;
      if (!this.pool[idx].alive) {
        this.cursor = (idx + 1) % this.capacity;
        return this.pool[idx];
      }
    }
    // Pool exhausted: recycle the oldest slot rather than allocating.
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;
    return p;
  }

  /** dt in 60 Hz frame units (1 = one frame). */
  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      const drag = Math.pow(p.drag, dt);
      p.vx *= drag;
      p.vy = p.vy * drag - p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
      if (p.kind === 'blood' && p.y < 0) {
        p.y = 0;
        p.vy = 0;
        p.vx *= 0.3;
      }
    }
  }

  clear(): void {
    for (const p of this.pool) p.alive = false;
  }

  /** Render with a world→screen mapper. Batched by blend mode to limit state changes. */
  render(ctx: CanvasRenderingContext2D, toScreenX: (x: number) => number, toScreenY: (y: number) => number, zoom: number): void {
    for (let pass = 0; pass < 2; pass++) {
      const additive = pass === 1;
      ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
      for (const p of this.pool) {
        if (!p.alive || p.additive !== additive) continue;
        const t = p.life / p.maxLife;
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        const size = Math.max(0.5, p.size * zoom);
        ctx.globalAlpha = Math.min(1, t * 1.6);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        switch (p.kind) {
          case 'spark':
          case 'flare': {
            const len = Math.hypot(p.vx, p.vy) * 2.2 * zoom + size;
            const a = Math.atan2(-p.vy, p.vx);
            ctx.lineWidth = size;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - Math.cos(a) * len, sy - Math.sin(a) * len);
            ctx.stroke();
            break;
          }
          case 'ring': {
            ctx.globalAlpha = t;
            ctx.lineWidth = Math.max(1, 6 * t * zoom);
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
          case 'smoke':
          case 'dust': {
            ctx.globalAlpha = t * (p.kind === 'smoke' ? 0.35 : 0.5);
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'shard': {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(p.rot + (1 - t) * 6);
            ctx.fillRect(-size, -size * 0.4, size * 2, size * 0.8);
            ctx.restore();
            break;
          }
          default: {
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
