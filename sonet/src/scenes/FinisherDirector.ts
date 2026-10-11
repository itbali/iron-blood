import { FighterState } from '../combat/types';
import type { FxContext } from '../effects/FxContext';
import { flashScale, shakeScale } from '../effects/FxContext';
import { Camera } from './Camera';

const ease = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** Cinematic timelines for the three finisher types. Purely presentational: the sim only tracks the clock. */
export class FinisherDirector {
  private fired = new Set<string>();

  constructor(private readonly c: FxContext) {}

  reset(): void {
    this.fired.clear();
    const { camera, slowmo, fx } = this.c;
    camera.setOverride(null);
    slowmo.release();
    fx.eclipse = 0;
    fx.dissolve = 0;
  }

  private once(key: string, fn: () => void): void {
    if (this.fired.has(key)) return;
    this.fired.add(key);
    fn();
  }

  /** `t` = progress 0..1 through the finisher. */
  step(frame: number, duration: number): void {
    const c = this.c;
    const run = c.sim.finisher;
    if (!run) return;
    const t = frame / duration;
    const w = c.sim.fighters[run.winner];
    const l = c.sim.fighters[run.loser];
    const color = run.def.color;
    const midX = (w.x + l.x) / 2;
    const handX = w.x + w.facing * 70;
    const handY = w.def.height * 0.6;

    this.once('start', () => {
      c.slowmo.hold(0.5);
      c.audio.play('finisher');
      c.hud.finisherPrompt(false);
      c.hud.banner(run.def.name.toUpperCase(), { kind: 'phase', sub: run.def.kind.toUpperCase() + ' FINISHER', duration: 1800 });
      c.hud.skipHint(true, 'PRESS ENTER TO SKIP');
    });

    const zoom = 1.45 + 0.25 * ease(t);
    c.camera.setOverride({ x: midX, y: Camera.yFor(125, zoom, 410), zoom, strength: 0.95 });

    if (run.def.kind === 'energy') this.energy(t, color, w.facing, midX, handX, handY, l.x, l.def.height);
    else if (run.def.kind === 'physical') this.physical(t, color, w.facing, l.x, l.def.height);
    else this.cinematic(t, color, midX, l.x, l.def.height);

    if (t >= 0.97) this.once('end', () => {
      c.slowmo.release();
      c.camera.setOverride(null);
      c.fx.eclipse = 0;
    });
    void FighterState;
  }

  private burstBlow(x: number, y: number, dir: number, color: string, power: number): void {
    const c = this.c;
    c.particles.sparks(x, y, dir, 26, '#ffe9c0', 1.8);
    c.particles.sparks(x, y, -dir, 14, color, 1.4);
    c.particles.blood(x, y, dir, 16);
    c.particles.ring(x, y, color, 180, 20);
    c.particles.shards(x, y, 14, color, 1.4);
    c.shake.add(power * shakeScale(c), 0.9);
    c.fx.flash = Math.max(c.fx.flash, flashScale(c, 0.8));
    c.fx.flashColor = color === '#ffffff' ? '#ffffff' : '#ffeceb';
    c.fx.aberration = 6;
    c.audio.play('heavy-hit', { pitch: 0.7 });
  }

  private energy(t: number, color: string, dir: number, midX: number, handX: number, handY: number, lx: number, lh: number): void {
    const c = this.c;
    c.fx.eclipse = Math.min(0.55, t * 1.2);
    if (t < 0.5 && Math.random() < 0.9) {
      const a = Math.random() * Math.PI * 2;
      const r = 90 + Math.random() * 70;
      c.particles.trail(handX + Math.cos(a) * r, handY + Math.sin(a) * r, color, 8);
      c.particles.embers(handX, handY - 20, 1, color, 60);
    }
    if (t > 0.1 && t < 0.5) c.shake.add((1 + t * 4) * shakeScale(c));
    if (t > 0.35 && t < 0.58 && Math.floor(t * 100) % 6 === 0) c.particles.ring(handX, handY, color, 80 + (t - 0.35) * 400, 12);
    if (t >= 0.58) {
      this.once('strike', () => {
        c.slowmo.hold(0.12);
        this.burstBlow(lx, lh * 0.55, dir, color, 16);
        c.audio.play('ko');
      });
    }
    if (t >= 0.66) this.once('slow-release', () => c.slowmo.hold(0.4));
    if (t >= 0.6) {
      c.fx.dissolve = Math.min(1, (t - 0.6) / 0.3);
      c.fx.dissolveSlot = c.sim.finisher?.loser ?? 0;
      if (Math.random() < 0.7) c.particles.shards(lx + (Math.random() - 0.5) * 60, Math.random() * lh, 1, color, 0.6);
      if (Math.random() < 0.4) c.particles.embers(lx, lh * 0.4, 1, '#ffb347', 60);
    }
    if (t > 0.8) c.fx.eclipse = Math.max(0, c.fx.eclipse - 0.02);
    void midX;
  }

  private physical(t: number, color: string, dir: number, lx: number, lh: number): void {
    const c = this.c;
    c.fx.eclipse = Math.min(0.25, t);
    const marks = [0.12, 0.26, 0.4, 0.54];
    marks.forEach((m, i) => {
      if (t >= m) {
        this.once(`hit${i}`, () => {
          c.particles.sparks(lx, lh * (0.45 + i * 0.1), dir, 14, '#ffe9c0', 1.4);
          c.particles.blood(lx, lh * 0.5, dir, 8);
          c.particles.ring(lx, lh * 0.5, color, 90, 12);
          c.shake.add((5 + i * 2) * shakeScale(c));
          c.camera.hitZoom(0.05);
          c.audio.play(i % 2 ? 'heavy-hit' : 'punch', { pitch: 0.85 + i * 0.1 });
          c.slowmo.hold(0.35);
        });
      }
    });
    if (t >= 0.68) {
      this.once('final', () => {
        c.slowmo.hold(0.12);
        this.burstBlow(lx, lh * 0.55, dir, color, 18);
        c.audio.play('ko');
      });
      c.fx.dissolve = Math.min(1, (t - 0.68) / 0.26);
      c.fx.dissolveSlot = c.sim.finisher?.loser ?? 0;
      if (Math.random() < 0.6) c.particles.shards(lx, Math.random() * lh, 1, color, 0.8);
    }
    if (t >= 0.74) this.once('release', () => c.slowmo.hold(0.45));
  }

  private cinematic(t: number, color: string, midX: number, lx: number, lh: number): void {
    const c = this.c;
    c.fx.eclipse = t < 0.65 ? Math.min(0.85, t * 1.6) : Math.max(0, 0.85 - (t - 0.65) * 3);
    if (t < 0.6 && Math.floor(t * 100) % 8 === 0) {
      c.particles.ring(midX, 140, color, 60 + t * 500, 22);
    }
    if (t > 0.15 && t < 0.6 && Math.random() < 0.8) {
      c.particles.embers(lx, 20, 2, color, 200);
    }
    if (t > 0.2 && t < 0.62) c.shake.add((1.5 + t * 6) * shakeScale(c));
    if (t >= 0.64) {
      this.once('slam', () => {
        c.slowmo.hold(0.1);
        this.burstBlow(lx, lh * 0.5, 1, color, 20);
        c.particles.ring(lx, 10, color, 320, 28);
        c.particles.ring(lx, 10, '#ffffff', 220, 22);
        c.audio.play('finisher');
      });
      c.fx.dissolve = Math.min(1, (t - 0.64) / 0.28);
      c.fx.dissolveSlot = c.sim.finisher?.loser ?? 0;
      if (Math.random() < 0.7) c.particles.shards(lx + (Math.random() - 0.5) * 80, Math.random() * lh, 1, color, 1);
    }
    if (t >= 0.72) this.once('release', () => c.slowmo.hold(0.45));
  }
}
