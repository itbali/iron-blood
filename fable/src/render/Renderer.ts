import type { Fighter } from '@/combat/Fighter';
import { FighterState } from '@/combat/FighterState';
import { collectDebugBoxes } from '@/combat/HitboxSystem';
import { DAMAGE_NUMBER_LIFETIME, STAGE_FLOOR_Y, VIEW_HEIGHT, VIEW_WIDTH } from '@/core/constants';
import type { StageConfig } from '@/data/stages';
import { Camera } from '@/effects/Camera';
import { ParticleSystem } from '@/effects/ParticleSystem';
import { ScreenShake } from '@/effects/ScreenShake';
import type { Simulation } from '@/game/Simulation';
import { drawFighter, evaluatePose, hexAlpha, resolveAnimation } from './SpriteRenderer';
import { StageRenderer } from './StageRenderer';
import type { Projectile } from '@/combat/Projectile';

export interface DamageNumber {
  x: number;
  y: number;
  text: string;
  sub: string;
  life: number;
  color: string;
  big: boolean;
}

export interface RenderSettings {
  particles: boolean;
  screenShake: boolean;
  motionBlur: boolean;
  effects: boolean;
  reducedMotion: boolean;
  reducedFlashes: boolean;
  colorblind: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface DebugInfo {
  fps: number;
  aiState: string;
  phase: string;
}

interface TrailSample {
  x: number;
  y: number;
  anim: string;
  t: number;
  facing: 1 | -1;
}

const MAX_DPR = 1.5;

/** Draws the whole fight: stage, fighters, projectiles, particles, post effects and debug overlays. */
export class Renderer {
  readonly camera = new Camera();
  readonly shake = new ScreenShake();
  readonly particles = new ParticleSystem();
  readonly stage: StageRenderer;
  readonly damageNumbers: DamageNumber[] = [];
  flash = 0;
  flashColor = '#ffffff';
  darken = 0;
  aberration = 0;
  debug = false;
  showHitboxes = false;
  settings: RenderSettings = { particles: true, screenShake: true, motionBlur: true, effects: true, reducedMotion: false, reducedFlashes: false, colorblind: false, quality: 'high' };
  private ctx: CanvasRenderingContext2D;
  private prev: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  private trails: [TrailSample[], TrailSample[]] = [[], []];
  private scale = 1;
  private time = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    stageConfig: StageConfig,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.stage = new StageRenderer(stageConfig);
  }

  resize(cssWidth: number, cssHeight: number): void {
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1) * (this.settings.quality === 'low' ? 0.6 : this.settings.quality === 'medium' ? 0.85 : 1);
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.scale = this.canvas.width / VIEW_WIDTH;
  }

  /** Call once per simulation tick so motion can be interpolated between ticks. */
  recordTick(sim: Simulation): void {
    for (let i = 0; i < 2; i++) {
      const f = sim.fighters[i]!;
      const p = this.prev[i as 0 | 1];
      p.x = f.x;
      p.y = f.y;
      const trail = this.trails[i as 0 | 1];
      if (f.visual.trail && this.settings.motionBlur && !this.settings.reducedMotion) {
        const a = resolveAnimation(f);
        trail.push({ x: f.x, y: f.y, anim: a.anim, t: a.t, facing: f.facing });
        if (trail.length > 5) trail.shift();
      } else if (trail.length) {
        trail.shift();
      }
    }
  }

  addDamageNumber(x: number, y: number, text: string, sub: string, color: string, big: boolean): void {
    this.damageNumbers.push({ x, y, text, sub, life: DAMAGE_NUMBER_LIFETIME + (big ? 14 : 0), color, big });
    if (this.damageNumbers.length > 10) this.damageNumbers.shift();
  }

  update(sim: Simulation, dtTicks: number): void {
    this.time += dtTicks;
    const [a, b] = sim.fighters;
    this.camera.reducedMotion = this.settings.reducedMotion;
    this.camera.update({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, dtTicks);
    this.shake.enabled = this.settings.screenShake && !this.settings.reducedMotion;
    this.shake.update(dtTicks);
    if (this.settings.particles) this.particles.update(dtTicks);
    this.stage.quality = this.settings.quality;
    this.stage.phase2 = a.phase2 || b.phase2;
    this.stage.update(dtTicks);
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i]!;
      d.life -= dtTicks;
      d.y += 1.2 * dtTicks;
      if (d.life <= 0) this.damageNumbers.splice(i, 1);
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dtTicks * 0.09);
    if (this.aberration > 0) this.aberration = Math.max(0, this.aberration - dtTicks * 0.12);
  }

  render(sim: Simulation, alpha: number, debugInfo: DebugInfo | null): void {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const cam = this.camera;
    const shakeX = this.shake.x;
    const shakeY = this.shake.y;
    const floorScreenY = STAGE_FLOOR_Y + cam.y * cam.zoom + shakeY * cam.zoom;

    this.stage.drawBackground(ctx, cam, floorScreenY, shakeX * cam.zoom, shakeY);

    const [p1, p2] = sim.fighters;
    const order = p1.isAttacking || p1.state === FighterState.THROW ? [p2, p1] : [p1, p2];
    for (const f of order) this.drawShadow(f, alpha, shakeX, floorScreenY);
    for (const f of order) this.drawTrail(f, shakeX, floorScreenY);
    for (const f of order) this.drawFighterWorld(f, alpha, shakeX, floorScreenY);
    for (const p of sim.projectiles) this.drawProjectile(p, shakeX, floorScreenY);
    if (this.settings.particles) this.drawParticles(shakeX, floorScreenY);
    this.drawDamageNumbers(shakeX, floorScreenY);
    this.stage.drawForeground(ctx, this.settings.reducedMotion);
    this.drawPost(sim);
    if (this.debug || this.showHitboxes) this.drawDebugBoxes(sim, shakeX, floorScreenY);
    if (this.debug && debugInfo) this.drawDebugText(sim, debugInfo);
  }

  private interp(f: Fighter, alpha: number): { x: number; y: number } {
    const p = this.prev[f.side];
    const k = this.settings.reducedMotion ? 1 : alpha;
    if (Math.abs(f.x - p.x) > 200) return { x: f.x, y: f.y };
    return { x: p.x + (f.x - p.x) * k, y: p.y + (f.y - p.y) * k };
  }

  private worldToScreen(wx: number, wy: number, shakeX: number, floorScreenY: number): { x: number; y: number } {
    const cam = this.camera;
    return { x: VIEW_WIDTH / 2 + (wx - cam.x + shakeX) * cam.zoom, y: floorScreenY - wy * cam.zoom };
  }

  private drawShadow(f: Fighter, alpha: number, shakeX: number, floorScreenY: number): void {
    const ctx = this.ctx;
    const pos = this.interp(f, alpha);
    const s = this.worldToScreen(pos.x, 0, shakeX, floorScreenY);
    const spread = 1 + pos.y / 400;
    const w = f.config.pushbox.w * 0.9 * this.camera.zoom * spread;
    ctx.fillStyle = `rgba(0,0,0,${0.45 / spread})`;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 4, w, w * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTrail(f: Fighter, shakeX: number, floorScreenY: number): void {
    const trail = this.trails[f.side];
    const ctx = this.ctx;
    const cam = this.camera;
    const draw = (sample: TrailSample, a: number) => {
      const s = this.worldToScreen(sample.x, sample.y, shakeX, floorScreenY);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(cam.zoom * sample.facing, -cam.zoom);
      drawFighter(ctx, evaluatePose(sample.anim, sample.t), { palette: f.palette, body: f.config.body, alpha: a, flat: f.palette.glow });
      ctx.restore();
    };
    for (let i = 0; i < trail.length; i++) draw(trail[i]!, 0.08 + (i / trail.length) * 0.2);
    for (const img of f.visual.afterimages) {
      draw({ x: img.x, y: img.y, anim: img.anim, t: 0.5, facing: img.facing }, Math.min(0.5, img.life / 18));
    }
  }

  private drawFighterWorld(f: Fighter, alpha: number, shakeX: number, floorScreenY: number): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const pos = this.interp(f, alpha);
    const s = this.worldToScreen(pos.x, pos.y, shakeX, floorScreenY);
    const anim = resolveAnimation(f);
    const pose = evaluatePose(anim.anim, anim.t);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(cam.zoom * f.facing, -cam.zoom);
    const flashing = f.visual.flash > 0 && !this.settings.reducedFlashes;
    const armorGlow = f.hasArmor ? 0.5 : 0;
    drawFighter(ctx, pose, {
      palette: f.palette,
      body: f.config.body,
      flat: flashing ? (f.visual.flash > 4 ? '#ffffff' : hexAlpha('#ffffff', 0.7)) : undefined,
      glow: armorGlow,
      phase2: f.phase2,
    });
    // Block shield.
    if ((f.state === FighterState.BLOCK || f.state === FighterState.BLOCKSTUN) && this.settings.effects) {
      const h = f.config.pushbox.h * (f.wasCrouching ? 0.6 : 1);
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 0.4) * 0.1;
      ctx.strokeStyle = this.settings.colorblind ? '#ffffff' : '#9fd8ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(f.config.pushbox.w * 0.6, 10);
      ctx.quadraticCurveTo(f.config.pushbox.w * 0.95, h * 0.5, f.config.pushbox.w * 0.6, h);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawProjectile(p: Projectile, shakeX: number, floorScreenY: number): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const s = this.worldToScreen(p.x, p.y, shakeX, floorScreenY);
    const w = p.spec.size.w * cam.zoom;
    const h = p.spec.size.h * cam.zoom;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(w, h));
    g.addColorStop(0, hexAlpha(p.spec.color, 0.9));
    g.addColorStop(0.4, hexAlpha(p.spec.color, 0.45));
    g.addColorStop(1, hexAlpha(p.spec.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(w, h), Math.max(w, h) * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Crescent / blade shape for slashes.
    ctx.strokeStyle = p.spec.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(-p.facing * w * 0.2, 0, w * 0.55, h * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (this.settings.particles && Math.random() < 0.6) {
      this.particles.emit({ x: p.x - p.facing * 10, y: p.y, count: 1, color: p.spec.color, shape: 'glow', speed: [0.5, 2], life: [8, 16], size: [6, 14], additive: true, drag: 0.9 });
    }
  }

  private drawParticles(shakeX: number, floorScreenY: number): void {
    const ctx = this.ctx;
    const cam = this.camera;
    let additive = false;
    ctx.save();
    for (const p of this.particles.pool) {
      if (!p.alive) continue;
      const s = this.worldToScreen(p.x, p.y, shakeX, floorScreenY);
      const t = p.life / p.maxLife;
      const size = (p.size * t + p.endSize * (1 - t)) * cam.zoom;
      if (p.additive !== additive) {
        additive = p.additive;
        ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
      }
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.fillStyle = p.color;
      switch (p.shape) {
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, size * 0.4);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - p.vx * 2 * cam.zoom, s.y + p.vy * 2 * cam.zoom);
          ctx.stroke();
          break;
        }
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, 6 * t);
          ctx.beginPath();
          ctx.arc(s.x, s.y, size * (2 - t) * 2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'smoke': {
          ctx.globalAlpha = t * 0.35;
          ctx.beginPath();
          ctx.arc(s.x, s.y, size * (1.5 - t), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shard':
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-size, -size * 0.3, size * 2, size * 0.6);
          ctx.restore();
          break;
        case 'glow': {
          ctx.globalAlpha = t * 0.6;
          ctx.beginPath();
          ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default:
          ctx.beginPath();
          ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawDamageNumbers(shakeX: number, floorScreenY: number): void {
    const ctx = this.ctx;
    for (const d of this.damageNumbers) {
      const s = this.worldToScreen(d.x, d.y, shakeX, floorScreenY);
      const t = Math.min(1, d.life / 12);
      const pop = d.big ? 1 + Math.max(0, (d.life - 40) / 10) * 0.6 : 1;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(s.x, s.y);
      ctx.scale(pop, pop);
      ctx.font = `700 ${d.big ? 54 : 38}px Oswald, Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(d.text, 0, 0);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, 0, 0);
      if (d.sub) {
        ctx.font = '600 22px Oswald, Impact, sans-serif';
        ctx.strokeText(d.sub, 0, 26);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(d.sub, 0, 26);
      }
      ctx.restore();
    }
  }

  private drawPost(sim: Simulation): void {
    const ctx = this.ctx;
    // Super / finisher darkening.
    const dark = Math.max(this.darken, sim.superFlash > 0 ? 0.55 : 0, sim.phase === 'finisher' ? 0.35 : 0);
    if (dark > 0) {
      ctx.fillStyle = `rgba(2,0,4,${dark})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      // Spotlight on fighters.
      if (sim.superFlash > 0 && sim.superFlashFighter !== null) {
        const f = sim.fighters[sim.superFlashFighter];
        const s = this.worldToScreen(f.x, f.y + 100, this.shake.x, STAGE_FLOOR_Y + this.camera.y * this.camera.zoom);
        const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, 420);
        g.addColorStop(0, hexAlpha(f.config.palette.glow, 0.35));
        g.addColorStop(1, hexAlpha(f.config.palette.glow, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      }
    }
    // Chromatic aberration imitation: offset tinted copies of the frame on big impacts.
    if (this.aberration > 0 && this.settings.effects && !this.settings.reducedFlashes && !this.settings.reducedMotion) {
      const off = this.aberration * 10;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.18 * this.aberration;
      ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, -off, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, off, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }
    // Vignette.
    const v = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.45, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(0,0,0,${this.stage.phase2 ? 0.75 : 0.6})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    if (this.stage.phase2) {
      const r = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.3, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT);
      r.addColorStop(0, 'rgba(255,40,20,0)');
      r.addColorStop(1, `rgba(255,40,20,${0.18 + Math.sin(this.time * 0.1) * 0.05})`);
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
    // Screen flash.
    if (this.flash > 0 && !this.settings.reducedFlashes) {
      ctx.fillStyle = hexAlpha(this.flashColor, Math.min(0.85, this.flash));
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
  }

  private drawDebugBoxes(sim: Simulation, shakeX: number, floorScreenY: number): void {
    const ctx = this.ctx;
    const cam = this.camera;
    ctx.save();
    ctx.lineWidth = 2;
    for (const f of sim.fighters) {
      for (const b of collectDebugBoxes(f)) {
        const tl = this.worldToScreen(b.left, b.top, shakeX, floorScreenY);
        const w = (b.right - b.left) * cam.zoom;
        const h = (b.top - b.bottom) * cam.zoom;
        const color = b.kind === 'hit' ? '255,40,40' : b.kind === 'hurt' ? '60,255,90' : '70,130,255';
        ctx.fillStyle = `rgba(${color},0.18)`;
        ctx.strokeStyle = `rgba(${color},0.9)`;
        ctx.fillRect(tl.x, tl.y, w, h);
        ctx.strokeRect(tl.x, tl.y, w, h);
      }
      const o = this.worldToScreen(f.x, f.y, shakeX, floorScreenY);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(o.x - 10, o.y);
      ctx.lineTo(o.x + 10, o.y);
      ctx.moveTo(o.x, o.y - 10);
      ctx.lineTo(o.x, o.y + 10);
      ctx.stroke();
    }
    for (const p of sim.projectiles) {
      const b = p.box;
      const tl = this.worldToScreen(b.left, b.top, shakeX, floorScreenY);
      ctx.strokeStyle = 'rgba(255,40,40,0.9)';
      ctx.strokeRect(tl.x, tl.y, (b.right - b.left) * cam.zoom, (b.top - b.bottom) * cam.zoom);
    }
    ctx.restore();
  }

  private drawDebugText(sim: Simulation, info: DebugInfo): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '600 20px Inter, monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(20, 200, 520, 330);
    ctx.fillRect(VIEW_WIDTH - 540, 200, 520, 330);
    ctx.fillStyle = '#e7e7e7';
    const head = [`FPS ${info.fps}   FRAME ${sim.frame}   PHASE ${sim.phase} (${sim.phaseFrame})   HITSTOP ${sim.hitStop}`, `PARTICLES ${this.particles.aliveCount}   AI ${info.aiState}`];
    head.forEach((l, i) => ctx.fillText(l, 20, 150 + i * 24));
    sim.fighters.forEach((f, i) => {
      const x = i === 0 ? 32 : VIEW_WIDTH - 528;
      const lines = [
        `${f.config.name.toUpperCase()}  (${f.state})`,
        `POS ${f.x.toFixed(1)}, ${f.y.toFixed(1)}   VEL ${f.vx.toFixed(2)}, ${f.vy.toFixed(2)}`,
        `HP ${f.hp}/${f.maxHp}   METER ${Math.round(f.meter)}   FACING ${f.facing > 0 ? 'R' : 'L'}`,
        `ATTACK ${f.currentAttack?.id ?? '-'}  FRAME ${f.attackFrame}  PHASE ${f.attackPhase ?? '-'}`,
        `LAST ${f.lastAttackId || '-'}   ADV ${f.lastFrameAdvantage >= 0 ? '+' : ''}${f.lastFrameAdvantage}`,
        `STUN ${f.stun}   INVULN ${f.invuln}   ARMOR ${f.hasArmor ? 'Y' : 'N'}`,
        `INPUT x${f.input.x} y${f.input.y} held ${f.input.held}  BUFFER [${f.bufferDebug}]`,
        `MOTION ${f.motionDebug}`,
        `STATE FRAME ${f.stateFrame}   COMBO ${sim.combos.tracks[f.side].hits}`,
      ];
      lines.forEach((l, j) => ctx.fillText(l, x, 232 + j * 30));
    });
    ctx.restore();
  }
}
