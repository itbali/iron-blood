import { FighterState, type GameEvent } from '../../combat/types';
import type { Projectile } from '../../combat/Projectile';
import type { Fighter } from '../../characters/Fighter';
import type { FightSim } from '../../game/FightSim';
import type { ParticleSystem } from '../../effects/ParticleSystem';
import { VIEW_H, VIEW_W } from '../../data/constants';
import type { Camera } from '../Camera';
import { FighterRenderer, type RenderedFighter, type Vec } from './FighterRenderer';
import type { StageRenderer } from './StageRenderer';
import { resetTransform, view } from './view';

export interface DamageNumber {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  sub: string;
  color: string;
  size: number;
}

export interface Ghost {
  x: number;
  y: number;
  facing: 1 | -1;
  age: number;
}

export interface RenderFx {
  flash: number;
  flashColor: string;
  dim: number;
  aberration: number;
  hitLights: { x: number; y: number; life: number; color: string; r: number }[];
  vignette: number;
  quality: number;
  reduced: boolean;
  motion: boolean;
  phase2: boolean;
  colorblind: boolean;
  dissolve: number;
  dissolveSlot: number;
  eclipse: number;
}

export interface DebugView {
  on: boolean;
  frame: number;
}

interface Trail {
  pts: { x: number; y: number }[];
  color: string;
}

const MAX_TRAIL = 9;

/** All canvas drawing for a fight. Reads sim state; never mutates it. */
export class FightRenderer {
  private readonly fr = new FighterRenderer();
  private trails: Trail[] = [{ pts: [], color: '#fff' }, { pts: [], color: '#fff' }];
  private vignetteCanvas: HTMLCanvasElement | null = null;
  private vignetteKey = '';
  ghosts: [Ghost[], Ghost[]] = [[], []];
  private lastRendered: (RenderedFighter | null)[] = [null, null];

  draw(
    ctx: CanvasRenderingContext2D, sim: FightSim, cam: Camera, stage: StageRenderer, particles: ParticleSystem,
    numbers: DamageNumber[], fx: RenderFx, debug: DebugView, shake: Vec, time: number,
  ): void {
    const k = view.scale;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // screen-space shake offset applied to everything except HUD
    ctx.save();
    resetTransform(ctx);
    ctx.translate(shake.x, shake.y);
    const stageFx = { reduced: fx.reduced, quality: fx.quality, flash: fx.flash, phase2: fx.phase2, dim: fx.dim };
    stage.drawBackground(ctx, cam, time, stageFx);

    this.drawShadowsAndReflections(ctx, sim, cam, fx, time);

    // world-space layer
    cam.apply(ctx, shake.x, shake.y);
    for (const p of sim.projectiles) this.drawProjectile(ctx, p, time);
    this.drawTrails(ctx);
    particles.draw(ctx);
    if (debug.on) this.drawDebug(ctx, sim);

    // screen-space overlays
    resetTransform(ctx);
    ctx.translate(shake.x, shake.y);
    this.drawNumbers(ctx, cam, numbers);
    stage.drawForeground(ctx, cam, time, stageFx);
    ctx.restore();

    this.drawLights(ctx, cam, fx);
    this.drawPost(ctx, fx);
    if (debug.on) this.drawDebugText(ctx, sim, cam, debug);
    void k;
    void h;
  }

  private order(sim: FightSim): Fighter[] {
    const [a, b] = sim.fighters;
    if (sim.finisher) return sim.finisher.winner === 0 ? [b, a] : [a, b];
    const aTop = a.isAttacking || a.state === FighterState.THROW;
    const bTop = b.isAttacking || b.state === FighterState.THROW;
    if (aTop && !bTop) return [b, a];
    return [a, b];
  }

  private drawShadowsAndReflections(ctx: CanvasRenderingContext2D, sim: FightSim, cam: Camera, fx: RenderFx, time: number): void {
    const k = view.scale;
    const gy = cam.groundY;
    for (const f of this.order(sim)) {
      const pos = cam.worldToScreen(f.x, 0);
      const height = Math.min(1, f.y / 260);
      const sw = f.def.pushWidth * 1.25 * cam.zoom * (1 - height * 0.4);
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - height * 0.6);
      const g = ctx.createRadialGradient(pos.x, gy, 0, pos.x, gy, sw);
      g.addColorStop(0, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(pos.x, gy + 4, sw, sw * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const f of this.order(sim)) {
      const flashColor = f.flash > 0 && fx.flashColor ? fx.flashColor : null;
      const run = sim.finisher;
      const rf = this.fr.render(f, run, cam.zoom * k, time, flashColor);
      this.lastRendered[f.slot] = rf;
      const pos = cam.worldToScreen(f.x, f.y);
      const dx = pos.x - rf.anchorX / k;
      const dy = pos.y - rf.anchorY / k;
      const cw = rf.canvas.width / k;
      const ch = rf.canvas.height / k;

      // wet floor reflection
      if (fx.quality >= 0.7) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, gy, VIEW_W, VIEW_H - gy);
        ctx.clip();
        ctx.globalAlpha = 0.2 * rf.alpha;
        const ground = cam.worldToScreen(f.x, 0).y;
        ctx.translate(0, 2 * ground + 0);
        ctx.scale(1, -1);
        ctx.drawImage(rf.canvas, dx, dy - (f.y * cam.zoom) * 2 * 0, cw, ch);
        ctx.restore();
      }

      // afterimages
      const gh = this.ghosts[f.slot];
      for (const g of gh) {
        const gp = cam.worldToScreen(g.x, g.y);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.34 - g.age * 0.028) * rf.alpha;
        if (g.facing !== f.facing) {
          ctx.translate(gp.x * 2, 0);
          ctx.scale(-1, 1);
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(rf.canvas, gp.x - rf.anchorX / k, gp.y - rf.anchorY / k, cw, ch);
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = rf.alpha;
      if (fx.aberration > 0.2 && fx.quality >= 0.7 && (f.flash > 0 || f.inStun)) {
        const off = fx.aberration;
        ctx.globalAlpha = 0.45 * rf.alpha;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(rf.canvas, dx - off, dy, cw, ch);
        ctx.drawImage(rf.canvas, dx + off, dy, cw, ch);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = rf.alpha;
      }
      if (fx.dissolve > 0 && fx.dissolveSlot === f.slot) {
        this.drawDissolve(ctx, rf, dx, dy, cw, ch, fx.dissolve);
      } else {
        ctx.drawImage(rf.canvas, dx, dy, cw, ch);
      }
      ctx.restore();

      this.recordTrail(f, rf);
    }
  }

  private drawDissolve(ctx: CanvasRenderingContext2D, rf: RenderedFighter, dx: number, dy: number, cw: number, ch: number, t: number): void {
    const k = view.scale;
    const strips = 46;
    const sh = rf.canvas.height / strips;
    for (let i = 0; i < strips; i++) {
      const phase = Math.sin(i * 12.9898) * 43758.5453;
      const rnd = phase - Math.floor(phase);
      const local = Math.max(0, Math.min(1, t * 1.6 - rnd * 0.6));
      ctx.globalAlpha = (1 - local) * rf.alpha;
      const off = (rnd - 0.5) * 160 * local;
      ctx.drawImage(rf.canvas, 0, i * sh, rf.canvas.width, sh, dx + off, dy + (i * sh) / k - local * 20, cw, ch / strips);
    }
    ctx.globalAlpha = 1;
  }

  private recordTrail(f: Fighter, rf: RenderedFighter): void {
    const t = this.trails[f.slot];
    const m = f.move;
    const striking = !!m && f.isAttacking && f.curFrame >= m.attack.startup - 3 && f.curFrame < m.attack.startup + m.attack.active + 5 &&
      (m.hitboxes.length > 0);
    if (!striking || !m) {
      if (t.pts.length > 0) t.pts.shift();
      if (t.pts.length > 0) t.pts.shift();
      return;
    }
    const sk = rf.skeleton;
    const kick = m.button === 'lk' || m.button === 'hk';
    const tip: Vec = kick ? sk.toeF : sk.handF;
    let lx = tip.x;
    let ly = tip.y;
    if (!kick) {
      const dx = sk.handF.x - sk.elbowF.x;
      const dy = sk.handF.y - sk.elbowF.y;
      const len = Math.hypot(dx, dy) || 1;
      const ext = f.def.style.body === 'tactical' ? 50 : 22;
      lx += (dx / len) * ext * f.def.style.scale;
      ly += (dy / len) * ext * f.def.style.scale;
    }
    t.color = m.trail ?? f.def.style.trail;
    t.pts.push({ x: f.x + f.facing * lx, y: f.y + ly });
    if (t.pts.length > MAX_TRAIL) t.pts.shift();
  }

  private drawTrails(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const t of this.trails) {
      const n = t.pts.length;
      if (n < 2) continue;
      for (let i = 1; i < n; i++) {
        const a = i / n;
        ctx.strokeStyle = t.color;
        ctx.globalAlpha = a * 0.75;
        ctx.lineWidth = 3 + a * 16;
        ctx.beginPath();
        ctx.moveTo(t.pts[i - 1].x, t.pts[i - 1].y);
        ctx.lineTo(t.pts[i].x, t.pts[i].y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(t.pts[Math.max(0, n - 4)].x, t.pts[Math.max(0, n - 4)].y);
      ctx.lineTo(t.pts[n - 1].x, t.pts[n - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, time: number): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.facing, 1);
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 1 + Math.sin(time * 0.5 + p.id) * 0.06;
    if (p.kind === 'orb') {
      const r = (p.w / 2) * pulse;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, p.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(-r * 3.4, 0);
      ctx.stroke();
    } else if (p.kind === 'slash') {
      const r = p.h * 0.62;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-r * 0.55, 0, r, -1.05, 1.05);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(-r * 0.55, 0, r, -0.9, 0.9);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(-r * 1.1, 0, r * 0.9, -0.8, 0.8);
      ctx.stroke();
    } else {
      const hh = p.h;
      for (let i = 0; i < 6; i++) {
        const fx = -i * (p.w / 7);
        const fh = hh * (1 - i * 0.12) * (0.8 + Math.sin(time * 0.6 + i) * 0.2);
        const g = ctx.createLinearGradient(fx, -fh / 2, fx, fh / 2);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(fx + 20, 0);
        ctx.lineTo(fx - 8, fh * 0.5);
        ctx.lineTo(fx - 12, -fh * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawNumbers(ctx: CanvasRenderingContext2D, cam: Camera, list: DamageNumber[]): void {
    ctx.textAlign = 'center';
    for (const n of list) {
      const p = cam.worldToScreen(n.x, n.y);
      const t = n.life / n.max;
      ctx.globalAlpha = Math.min(1, t * 2.2);
      ctx.font = `700 ${n.size}px Oswald, Impact, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(n.text, p.x, p.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, p.x, p.y);
      if (n.sub) {
        ctx.font = `700 ${Math.round(n.size * 0.5)}px Oswald, Impact, sans-serif`;
        ctx.strokeText(n.sub, p.x, p.y + n.size * 0.55);
        ctx.fillStyle = '#fff';
        ctx.fillText(n.sub, p.x, p.y + n.size * 0.55);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawLights(ctx: CanvasRenderingContext2D, cam: Camera, fx: RenderFx): void {
    resetTransform(ctx);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of fx.hitLights) {
      const p = cam.worldToScreen(l.x, l.y);
      const a = Math.max(0, l.life / 10);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, l.r * cam.zoom);
      g.addColorStop(0, l.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = g;
      ctx.fillRect(p.x - l.r * cam.zoom, p.y - l.r * cam.zoom, l.r * 2 * cam.zoom, l.r * 2 * cam.zoom);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private vignette(w: number, h: number, strength: number): HTMLCanvasElement {
    const key = `${w}x${h}:${strength.toFixed(2)}`;
    if (this.vignetteCanvas && this.vignetteKey === key) return this.vignetteCanvas;
    const cv = this.vignetteCanvas ?? document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    if (c) {
      c.clearRect(0, 0, w, h);
      const g = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 1.05);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${0.78 * strength})`);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    this.vignetteCanvas = cv;
    this.vignetteKey = key;
    return cv;
  }

  private drawPost(ctx: CanvasRenderingContext2D, fx: RenderFx): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const base = fx.vignette + (fx.phase2 ? 0.25 : 0);
    ctx.drawImage(this.vignette(w, h, base), 0, 0);
    if (fx.dim > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, fx.dim)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (fx.eclipse > 0.01) {
      ctx.fillStyle = `rgba(30,0,6,${Math.min(0.9, fx.eclipse)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (fx.flash > 0.01) {
      ctx.globalAlpha = Math.min(1, fx.flash);
      ctx.fillStyle = fx.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  private drawDebug(ctx: CanvasRenderingContext2D, sim: FightSim): void {
    const rects = (list: { x1: number; y1: number; x2: number; y2: number }[], stroke: string, fill: string): void => {
      ctx.strokeStyle = stroke;
      ctx.fillStyle = fill;
      ctx.lineWidth = 2;
      for (const r of list) {
        ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
        ctx.strokeRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      }
    };
    for (const f of sim.fighters) {
      rects(f.hurtRects(), '#31ff6a', 'rgba(49,255,106,0.16)');
      rects([f.pushRect()], '#3a8dff', 'rgba(58,141,255,0.12)');
      rects(f.hitRects(), '#ff2a2a', 'rgba(255,42,42,0.38)');
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x - 10, f.y);
      ctx.lineTo(f.x + 10, f.y);
      ctx.moveTo(f.x, f.y - 10);
      ctx.lineTo(f.x, f.y + 10);
      ctx.stroke();
    }
    for (const p of sim.projectiles) {
      rects([{ x1: p.x - p.w / 2, x2: p.x + p.w / 2, y1: p.y - p.h / 2, y2: p.y + p.h / 2 }], '#ff2a2a', 'rgba(255,42,42,0.38)');
    }
  }

  private drawDebugText(ctx: CanvasRenderingContext2D, sim: FightSim, cam: Camera, debug: DebugView): void {
    resetTransform(ctx);
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'center';
    for (const f of sim.fighters) {
      const p = cam.worldToScreen(f.x, f.y + f.def.height + 24);
      const txt = `${f.state}${f.move ? ' ' + f.move.id + ' f' + f.curFrame : ''}`;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(p.x - 90, p.y - 14, 180, 18);
      ctx.fillStyle = '#ffe14a';
      ctx.fillText(txt, p.x, p.y);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe14a';
    ctx.fillText(`SIM FRAME ${debug.frame}`, 12, VIEW_H - 14);
    void sim;
  }

  /** Gather afterimage positions each sim tick. */
  pushGhosts(sim: FightSim): void {
    for (const f of sim.fighters) {
      const list = this.ghosts[f.slot];
      for (const g of list) g.age++;
      while (list.length > 0 && list[0].age > 10) list.shift();
      if (f.afterimage > 0 && sim.frame % 2 === 0) list.push({ x: f.x, y: f.y, facing: f.facing, age: 0 });
    }
  }

  clearGhosts(): void {
    this.ghosts = [[], []];
    this.trails.forEach((t) => (t.pts.length = 0));
  }

  /** Sink for GameEvent consumers that want a light flash at a spot (debug / unit tests). */
  lastFrame(slot: number): RenderedFighter | null {
    return this.lastRendered[slot];
  }
}

export type { GameEvent };
