import type { EffectStyle, ImpactStrength } from '../combat/AttackData';
import type { Camera } from '../render/Camera';
import type { DamageNumbers } from './DamageNumbers';
import type { ParticleSystem } from './ParticleSystem';
import type { ScreenFlash } from './ScreenFlash';
import type { ScreenShake } from './ScreenShake';

const STRENGTH_SCALE: Record<ImpactStrength, number> = { light: 1, medium: 1.35, heavy: 1.9, special: 2.3, super: 3 };
const STRENGTH_SHAKE: Record<ImpactStrength, number> = { light: 1.5, medium: 3, heavy: 7, special: 8, super: 10 };

export const STYLE_COLOR: Record<EffectStyle, { spark: string; glow: string }> = {
  strike: { spark: '#ffe9b0', glow: '#ffb347' },
  blade: { spark: '#ff4455', glow: '#ff2238' },
  energy: { spark: '#ffb36b', glow: '#ff6a1f' },
  blunt: { spark: '#e8d6b8', glow: '#ff9a3a' },
  shadow: { spark: '#cdb6ff', glow: '#9b6bff' },
  electric: { spark: '#bff6ff', glow: '#2fd9ff' },
  fire: { spark: '#ffe08a', glow: '#ffb02e' },
};

const BLOOD_COLORS = ['#8e1018', '#b3121f', '#6a0b12'];

/** Translates combat outcomes into layered feedback: sparks, blood, rings, smoke, flash, shake, zoom. */
export class HitEffects {
  constructor(
    private readonly particles: ParticleSystem,
    private readonly shake: ScreenShake,
    private readonly camera: Camera,
    private readonly flash: ScreenFlash,
    private readonly numbers: DamageNumbers,
  ) {}

  hit(x: number, y: number, dir: 1 | -1, strength: ImpactStrength, style: EffectStyle, damage: number, crit: boolean, counter: boolean): void {
    const s = STRENGTH_SCALE[strength];
    const c = STYLE_COLOR[style];
    const fwd = dir === 1 ? 0 : Math.PI;
    this.particles.emit({
      kind: 'spark', x, y, count: Math.round(8 * s), color: c.spark, speed: [5, 13 * Math.sqrt(s)],
      angle: [fwd - 1.1, fwd + 1.1], life: [8, 18], size: [1.5, 3.2], drag: 0.86, additive: true,
    });
    this.particles.emit({ kind: 'flare', x, y, count: 1, color: c.glow, speed: [0, 0], life: [6, 8], size: [10 * s, 14 * s], additive: true });
    this.particles.emit({ kind: 'ring', x, y, count: 1, color: c.glow, speed: [0, 0], life: [12, 14], size: [8, 10], grow: 3.2 * s, additive: true });
    if (strength !== 'light' || style === 'blade') this.blood(x, y, dir, Math.round(5 * s));
    if (strength === 'heavy' || strength === 'special' || strength === 'super') {
      this.particles.emit({ kind: 'smoke', x, y, count: Math.round(3 * s), color: '#5a5f6a', speed: [0.5, 2], life: [30, 50], size: [10, 18], grow: 0.5, drag: 0.94 });
      this.camera.hitZoom(strength === 'super' ? 0.08 : 0.04);
      this.flash.flash(strength === 'super' ? '#ffffff' : c.glow, strength === 'super' ? 0.35 : 0.12);
    }
    if (style === 'energy' || style === 'fire' || style === 'shadow' || style === 'electric') {
      this.particles.emit({
        kind: style === 'fire' ? 'ember' : 'energy', x, y, count: Math.round(6 * s), color: c.glow, speed: [1, 5], life: [16, 32],
        size: [2, 4], drag: 0.93, gravity: style === 'fire' ? -0.05 : 0, additive: true,
      });
    }
    if (style === 'blunt') {
      this.particles.emit({ kind: 'shard', x, y, count: Math.round(3 * s), color: '#9d8f7b', speed: [3, 8], angle: [fwd - 1.2, fwd + 1.2], life: [20, 34], size: [2, 4], gravity: 0.35, drag: 0.98 });
    }
    this.shake.add(STRENGTH_SHAKE[strength] * (counter ? 1.3 : 1));
    if (crit || damage >= 60) {
      this.numbers.spawn(x, y, damage, crit ? (counter ? 'COUNTER' : 'CRITICAL') : '', crit ? '#ff5a5a' : '#ffffff');
    }
  }

  shakeScreen(px: number): void {
    this.shake.add(px);
  }

  blood(x: number, y: number, dir: 1 | -1, count: number): void {
    const fwd = dir === 1 ? 0.35 : Math.PI - 0.35;
    for (const color of BLOOD_COLORS) {
      this.particles.emit({
        kind: 'blood', x, y, count: Math.ceil(count / 3), color, speed: [2, 8], angle: [fwd - 0.9, fwd + 0.9], life: [26, 46], size: [2, 4.5],
        gravity: 0.38, drag: 0.985,
      });
    }
  }

  block(x: number, y: number, dir: 1 | -1, perfect: boolean): void {
    const back = dir === 1 ? Math.PI : 0;
    this.particles.emit({
      kind: 'spark', x, y, count: perfect ? 22 : 9, color: perfect ? '#9ff3ff' : '#cfd6e6', speed: [4, perfect ? 12 : 8],
      angle: [back - 1.3, back + 1.3], life: [8, 16], size: [1.5, 2.5], drag: 0.86, additive: true,
    });
    this.particles.emit({ kind: 'ring', x, y, count: 1, color: perfect ? '#7fe9ff' : '#9aa6c0', speed: [0, 0], life: [12, 14], size: [10, 12], grow: perfect ? 6 : 2.5, additive: true });
    if (perfect) this.flash.flash('#bff6ff', 0.3);
    this.shake.add(perfect ? 4 : 1.5);
  }

  armor(x: number, y: number): void {
    this.particles.emit({ kind: 'spark', x, y, count: 12, color: '#ffd27a', speed: [3, 9], life: [10, 18], size: [2, 3], drag: 0.88, additive: true });
    this.particles.emit({ kind: 'ring', x, y, count: 1, color: '#ffb02e', speed: [0, 0], life: [12, 14], size: [14, 16], grow: 3, additive: true });
    this.shake.add(3);
  }

  dust(x: number, heavy: boolean): void {
    this.particles.emit({
      kind: 'dust', x, y: 6, count: heavy ? 14 : 5, color: '#6b6560', speed: [0.6, heavy ? 4 : 2], angle: [0.1, Math.PI - 0.1],
      life: [20, 40], size: [6, heavy ? 16 : 10], grow: 0.35, drag: 0.92, spreadX: 20,
    });
    if (heavy) this.shake.add(4);
  }

  wall(x: number, y: number): void {
    this.particles.emit({ kind: 'spark', x, y, count: 14, color: '#ffd9a0', speed: [3, 10], life: [10, 20], size: [1.5, 3], drag: 0.88, additive: true, spreadY: 40 });
    this.particles.emit({ kind: 'smoke', x, y, count: 5, color: '#4a4f58', speed: [0.5, 2], life: [30, 50], size: [12, 20], grow: 0.4, spreadY: 50 });
    this.shake.add(6);
  }

  teleport(x: number, y: number, color: string): void {
    this.particles.emit({ kind: 'energy', x, y: y + 90, count: 26, color, speed: [1, 6], life: [14, 30], size: [2, 4], drag: 0.9, additive: true, spreadY: 70, spreadX: 20 });
    this.particles.emit({ kind: 'smoke', x, y: y + 80, count: 6, color: '#1a1622', speed: [0.5, 2], life: [24, 40], size: [14, 24], grow: 0.5, spreadY: 60 });
  }

  superCharge(x: number, y: number, color: string): void {
    this.particles.emit({ kind: 'energy', x, y: y + 100, count: 40, color, speed: [2, 9], life: [20, 40], size: [2, 5], drag: 0.9, additive: true, spreadY: 60 });
    this.particles.emit({ kind: 'ring', x, y: y + 100, count: 1, color, speed: [0, 0], life: [20, 22], size: [10, 12], grow: 9, additive: true });
    this.flash.flash(color, 0.25);
  }

  muzzle(x: number, y: number, color: string): void {
    this.particles.emit({ kind: 'energy', x, y, count: 12, color, speed: [1, 5], life: [10, 20], size: [2, 4], drag: 0.9, additive: true });
  }

  clash(x: number, y: number): void {
    this.particles.emit({ kind: 'spark', x, y, count: 30, color: '#ffffff', speed: [4, 14], life: [10, 22], size: [1.5, 3], drag: 0.86, additive: true });
    this.particles.emit({ kind: 'ring', x, y, count: 1, color: '#ffffff', speed: [0, 0], life: [14, 16], size: [10, 12], grow: 6, additive: true });
    this.shake.add(5);
  }

  disintegrate(x: number, color: string): void {
    this.particles.emit({ kind: 'ash', x, y: 90, count: 120, color, speed: [0.5, 4], angle: [0.3, Math.PI - 0.3], life: [40, 90], size: [2, 5], gravity: -0.04, drag: 0.97, additive: true, spreadX: 30, spreadY: 80 });
    this.particles.emit({ kind: 'ember', x, y: 90, count: 60, color: '#ffb02e', speed: [1, 6], life: [30, 70], size: [1.5, 3], gravity: -0.06, drag: 0.96, additive: true, spreadX: 30, spreadY: 80 });
    this.flash.flash(color, 0.5);
    this.shake.add(10);
  }

  shatter(x: number): void {
    this.blood(x, 100, 1, 30);
    this.blood(x, 100, -1, 30);
    this.particles.emit({ kind: 'shard', x, y: 100, count: 30, color: '#4a1a1e', speed: [3, 10], life: [30, 50], size: [3, 6], gravity: 0.4, drag: 0.98, spreadY: 60 });
    this.shake.add(12);
  }
}
