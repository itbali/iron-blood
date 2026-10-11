import { PARTICLE_POOL_SIZE } from '@/core/constants';

export type ParticleShape = 'dot' | 'spark' | 'smoke' | 'ring' | 'shard' | 'glow';

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  endSize: number;
  color: string;
  shape: ParticleShape;
  gravity: number;
  drag: number;
  rotation: number;
  spin: number;
  additive: boolean;
}

export interface EmitOptions {
  x: number;
  y: number;
  count: number;
  color: string | string[];
  shape?: ParticleShape;
  speed?: [number, number];
  angle?: [number, number];
  life?: [number, number];
  size?: [number, number];
  endSize?: number;
  gravity?: number;
  drag?: number;
  additive?: boolean;
  spread?: number;
}

/** Fixed-size particle pool: no allocation during gameplay. */
export class ParticleSystem {
  readonly pool: Particle[] = [];
  private cursor = 0;
  /** 0..1 global density multiplier from settings. */
  density = 1;

  constructor(size = PARTICLE_POOL_SIZE) {
    for (let i = 0; i < size; i++) {
      this.pool.push({
        alive: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        endSize: 0,
        color: '#fff',
        shape: 'dot',
        gravity: 0,
        drag: 1,
        rotation: 0,
        spin: 0,
        additive: false,
      });
    }
  }

  private take(): Particle {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[this.cursor]!;
      this.cursor = (this.cursor + 1) % this.pool.length;
      if (!p.alive) return p;
    }
    const p = this.pool[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.pool.length;
    return p;
  }

  emit(o: EmitOptions): void {
    const count = Math.round(o.count * this.density);
    const colors = Array.isArray(o.color) ? o.color : [o.color];
    const [smin, smax] = o.speed ?? [2, 8];
    const [amin, amax] = o.angle ?? [0, Math.PI * 2];
    const [lmin, lmax] = o.life ?? [20, 40];
    const [zmin, zmax] = o.size ?? [2, 6];
    const spread = o.spread ?? 0;
    for (let i = 0; i < count; i++) {
      const p = this.take();
      const angle = amin + Math.random() * (amax - amin);
      const speed = smin + Math.random() * (smax - smin);
      p.alive = true;
      p.x = o.x + (Math.random() - 0.5) * spread;
      p.y = o.y + (Math.random() - 0.5) * spread;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = lmin + Math.random() * (lmax - lmin);
      p.life = p.maxLife;
      p.size = zmin + Math.random() * (zmax - zmin);
      p.endSize = o.endSize ?? 0;
      p.color = colors[Math.floor(Math.random() * colors.length)]!;
      p.shape = o.shape ?? 'dot';
      p.gravity = o.gravity ?? 0;
      p.drag = o.drag ?? 0.96;
      p.rotation = Math.random() * Math.PI * 2;
      p.spin = (Math.random() - 0.5) * 0.3;
      p.additive = o.additive ?? false;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy -= p.gravity * dt;
      p.vx *= Math.pow(p.drag, dt);
      p.vy *= Math.pow(p.drag, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
  }

  clear(): void {
    for (const p of this.pool) p.alive = false;
  }

  get aliveCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.alive) n++;
    return n;
  }
}
