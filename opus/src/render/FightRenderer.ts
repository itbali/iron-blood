import type { Projectile } from '../combat/Projectile';
import type { Fighter } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../core/constants';
import { lerp } from '../core/math';
import type { DamageNumbers } from '../effects/DamageNumbers';
import type { ParticleSystem } from '../effects/ParticleSystem';
import type { ScreenFlash } from '../effects/ScreenFlash';
import type { Camera } from './Camera';
import { withAlpha } from './color';
import { FighterRenderer } from './FighterRenderer';
import type { Pose } from './poses';
import { ProjectileRenderer } from './ProjectileRenderer';
import type { Quality, Stage } from './stages/StageBase';

interface Ghost {
  x: number;
  y: number;
  facing: 1 | -1;
  pose: Pose;
  life: number;
  color: string;
  fighter: 0 | 1;
}

export interface RenderScene {
  fighters: [Fighter, Fighter];
  projectiles: Projectile[];
  stage: Stage;
  camera: Camera;
  particles: ParticleSystem;
  numbers: DamageNumbers;
  flash: ScreenFlash;
  danger: number;
  chroma: number;
  debug: boolean;
  frame: number;
  colorblind: boolean;
}

export interface RenderSettings {
  quality: Quality;
  motionBlur: boolean;
  effects: boolean;
  reducedMotion: boolean;
}

const GHOST_LIFE = 14;
const P1_MARK = '#e7e7e7';
const P2_MARK = '#d51f2b';
const P2_MARK_CB = '#2f8cff';

/** Composes the fight frame: stage layers → floor → reflections → fighters → effects → overlays. */
export class FightRenderer {
  readonly fighterRenderer = new FighterRenderer();
  private readonly projectileRenderer = new ProjectileRenderer(this.fighterRenderer);
  private ghosts: Ghost[] = [];
  private ghostTick = 0;
  private vignette: HTMLCanvasElement | null = null;

  render(ctx: CanvasRenderingContext2D, scene: RenderScene, s: RenderSettings, interp: number, time: number, dt: number): void {
    const { camera: cam, fighters } = scene;
    const k = ctx.canvas.width / VIEW_WIDTH;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.save();
    if (cam.tilt) {
      ctx.translate(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
      ctx.rotate(cam.tilt);
      ctx.scale(1.06, 1.06);
      ctx.translate(-VIEW_WIDTH / 2, -VIEW_HEIGHT / 2);
    }
    const r = { ctx, cam, time, dt, quality: s.quality, danger: scene.danger, reducedMotion: s.reducedMotion };
    scene.stage.renderBackground(r);
    scene.stage.renderFloor(r);

    if (scene.flash.darken > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${scene.flash.darken})`;
      ctx.fillRect(-50, -50, VIEW_WIDTH + 100, VIEW_HEIGHT + 100);
    }

    const order = this.drawOrder(fighters);
    const opts = (alpha: number) => ({ alpha, quality: s.quality, time, interp });

    // Wet-floor reflections.
    if (scene.stage.floorReflect > 0 && s.quality !== 'low') {
      const gy = cam.sy(0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, gy, VIEW_WIDTH, VIEW_HEIGHT - gy);
      ctx.clip();
      ctx.translate(0, gy * 2);
      ctx.scale(1, -1);
      for (const f of order) this.fighterRenderer.draw(ctx, f, cam, opts(scene.stage.floorReflect));
      ctx.restore();
    }

    for (const f of fighters) this.fighterRenderer.drawShadow(ctx, f, cam, interp);
    this.drawSideMarkers(ctx, scene, interp);

    if (s.motionBlur) this.updateGhosts(fighters, time, dt);
    for (const g of this.ghosts) {
      this.fighterRenderer.draw(ctx, fighters[g.fighter], cam, { ...opts((g.life / GHOST_LIFE) * 0.35), silhouette: g.color }, g.pose, g);
    }

    for (const f of order) {
      if (f.phase2) this.drawAura(ctx, f, cam, interp, time, f.def.boss?.phase2Glow ?? '#ff2a12');
      this.fighterRenderer.draw(ctx, f, cam, opts(1));
    }

    for (const p of scene.projectiles) if (!p.dead) this.projectileRenderer.draw(ctx, p, cam, time, interp, s.quality);

    scene.particles.render(ctx, (x) => cam.sx(x), (y) => cam.sy(y), cam.zoom);
    scene.numbers.render(ctx, (x) => cam.sx(x), (y) => cam.sy(y), cam.zoom);
    scene.stage.renderForeground(r);
    ctx.restore();

    if (scene.flash.alpha > 0.01) {
      ctx.fillStyle = withAlpha(scene.flash.color.length === 7 ? scene.flash.color : '#ffffff', Math.min(0.85, scene.flash.alpha));
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }

    if (s.effects && scene.chroma > 0 && s.quality !== 'low') {
      const off = 3 + scene.chroma * 0.5;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12;
      ctx.drawImage(ctx.canvas, off * k, 0);
      ctx.drawImage(ctx.canvas, -off * k, 0);
      ctx.restore();
    }

    if (s.effects) this.drawVignette(ctx, scene.danger);
    if (scene.debug) this.drawDebug(ctx, scene);
  }

  private drawOrder(fighters: [Fighter, Fighter]): Fighter[] {
    const [a, b] = fighters;
    const aFront = !!a.move || !!a.lock || a.state === FighterState.VICTORY;
    const bFront = !!b.move || !!b.lock || b.state === FighterState.VICTORY;
    if (aFront && !bFront) return [b, a];
    return [a, b];
  }

  private updateGhosts(fighters: [Fighter, Fighter], time: number, dt: number): void {
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    this.ghostTick += dt;
    if (this.ghostTick < 2) return;
    this.ghostTick = 0;
    for (const f of fighters) {
      const trail = f.move?.trail ?? (f.lock?.def.cinematic && f.lock.attackerSide === -1 ? f.def.visual.palette.glow : undefined);
      const flying = f.state === FighterState.HURT && Math.abs(f.vx) > 8;
      if (!trail && !flying) continue;
      if (this.ghosts.length > 24) this.ghosts.shift();
      this.ghosts.push({
        x: f.x,
        y: f.y,
        facing: f.facing,
        pose: this.fighterRenderer.computePose(f, time),
        life: GHOST_LIFE,
        color: trail ?? f.def.visual.palette.glow,
        fighter: f.index,
      });
    }
  }

  private drawAura(ctx: CanvasRenderingContext2D, f: Fighter, cam: Camera, interp: number, time: number, color: string): void {
    const x = cam.sx(lerp(f.prevX, f.x, interp));
    const y = cam.sy(lerp(f.prevY, f.y, interp) + 110 * f.scale);
    const r = (150 + Math.sin(time * 0.01) * 12) * f.scale * cam.zoom;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 10, x, y, r);
    g.addColorStop(0, withAlpha(color, 0.35));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /** Small P1/P2 chevrons under each fighter — readability first (and colour-blind safe shapes). */
  private drawSideMarkers(ctx: CanvasRenderingContext2D, scene: RenderScene, interp: number): void {
    const cam = scene.camera;
    scene.fighters.forEach((f, i) => {
      const x = cam.sx(lerp(f.prevX, f.x, interp));
      const y = cam.sy(0) + 14;
      ctx.fillStyle = i === 0 ? P1_MARK : scene.colorblind ? P2_MARK_CB : P2_MARK;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      if (i === 0) {
        ctx.moveTo(x - 8, y + 8);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 8, y + 8);
      } else {
        ctx.rect(x - 6, y, 12, 8);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  private drawVignette(ctx: CanvasRenderingContext2D, danger: number): void {
    if (!this.vignette) {
      const c = document.createElement('canvas');
      c.width = VIEW_WIDTH;
      c.height = VIEW_HEIGHT;
      const g = c.getContext('2d')!;
      const grad = g.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.35, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.72);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = grad;
      g.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      this.vignette = c;
    }
    ctx.drawImage(this.vignette, 0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    if (danger > 0) {
      ctx.globalAlpha = danger * 0.6;
      ctx.globalCompositeOperation = 'source-over';
      const grad = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.4, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.7);
      grad.addColorStop(0, 'rgba(120,0,0,0)');
      grad.addColorStop(1, 'rgba(150,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.globalAlpha = 1;
    }
  }

  private drawDebug(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
    const cam = scene.camera;
    const rect = (b: { x: number; y: number; w: number; h: number }, stroke: string, fill: string) => {
      const x = cam.sx(b.x);
      const y = cam.sy(b.y + b.h);
      const w = b.w * cam.zoom;
      const h = b.h * cam.zoom;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
    };
    for (const f of scene.fighters) {
      const inv = f.isInvulnerable();
      for (const h of f.getHurtboxes()) rect(h, inv ? 'rgba(80,255,120,0.35)' : '#3dff6e', inv ? 'rgba(61,255,110,0.04)' : 'rgba(61,255,110,0.12)');
      rect(f.getPushbox(), '#3d8bff', 'rgba(61,139,255,0.08)');
      for (const h of f.getActiveHitboxes()) rect(h, '#ff2a2a', 'rgba(255,42,42,0.3)');
      const ox = cam.sx(f.x);
      const oy = cam.sy(f.y);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(ox - 8, oy);
      ctx.lineTo(ox + 8, oy);
      ctx.moveTo(ox, oy - 8);
      ctx.lineTo(ox, oy + 8);
      ctx.stroke();
      ctx.font = '12px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const label = f.move ? `${f.move.id} ${f.moveFrame}/${f.moveTotalFrames}` : f.state;
      ctx.fillText(label, ox, cam.sy(f.y + 200 * f.scale));
    }
    for (const p of scene.projectiles) if (p.active) rect(p.hitbox(), '#ff2a2a', 'rgba(255,42,42,0.25)');
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd27a';
    ctx.fillText(`FRAME ${scene.frame}`, 12, VIEW_HEIGHT - 12);
  }
}
