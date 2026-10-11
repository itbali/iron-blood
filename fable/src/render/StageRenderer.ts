import { STAGE_HALF_WIDTH, VIEW_HEIGHT, VIEW_WIDTH } from '@/core/constants';
import type { StageConfig } from '@/data/stages';
import type { Camera } from '@/effects/Camera';

interface Silhouette {
  x: number;
  speed: number;
  height: number;
  width: number;
  depth: number;
}

interface Lamp {
  x: number;
  y: number;
  phase: number;
  color: string;
  size: number;
}

interface Drop {
  x: number;
  y: number;
  speed: number;
  len: number;
}

/**
 * Procedural multi-layer parallax stage: sky, far buildings, mid structures, floor, foreground weather.
 * Static layers are cached into offscreen canvases; only animated elements are redrawn per frame.
 */
export class StageRenderer {
  private far: HTMLCanvasElement | null = null;
  private mid: HTMLCanvasElement | null = null;
  private silhouettes: Silhouette[] = [];
  private lamps: Lamp[] = [];
  private drops: Drop[] = [];
  private embers: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private time = 0;
  private lightningTimer = 0;
  lightning = 0;
  quality: 'low' | 'medium' | 'high' = 'high';
  phase2 = false;

  constructor(readonly stage: StageConfig) {
    const seed = stage.id.length * 17;
    for (let i = 0; i < 7; i++) {
      this.silhouettes.push({ x: -1400 + i * 420 + (seed % 100), speed: 0.15 + (i % 3) * 0.1, height: 150 + (i % 4) * 30, width: 60 + (i % 3) * 20, depth: 0.35 + (i % 3) * 0.1 });
    }
    for (let i = 0; i < 14; i++) {
      this.lamps.push({ x: -1500 + i * 230, y: 220 + ((i * 37) % 300), phase: i * 0.7, color: i % 3 === 0 ? stage.accent2 : stage.accent, size: 6 + (i % 3) * 3 });
    }
    for (let i = 0; i < (stage.rain ? 160 : stage.snow ? 70 : 0); i++) {
      this.drops.push({ x: Math.random() * (VIEW_WIDTH + 400) - 200, y: Math.random() * VIEW_HEIGHT, speed: stage.rain ? 22 + Math.random() * 10 : 1.2 + Math.random(), len: stage.rain ? 18 + Math.random() * 14 : 2 + Math.random() * 2 });
    }
  }

  private ensureLayers(): void {
    if (this.far && this.mid) return;
    this.far = document.createElement('canvas');
    this.far.width = 2600;
    this.far.height = 700;
    this.mid = document.createElement('canvas');
    this.mid.width = 3200;
    this.mid.height = 900;
    this.paintFar(this.far.getContext('2d')!);
    this.paintMid(this.mid.getContext('2d')!);
  }

  private paintFar(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const s = this.stage;
    ctx.clearRect(0, 0, w, h);
    let x = 0;
    let i = 0;
    while (x < w) {
      const bw = 90 + ((i * 53) % 140);
      const bh = 200 + ((i * 97) % 380);
      const shade = 10 + ((i * 7) % 12);
      ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
      ctx.fillRect(x, h - bh, bw, bh);
      if (s.id === 'temple') {
        ctx.beginPath();
        ctx.moveTo(x, h - bh);
        ctx.lineTo(x + bw / 2, h - bh - 60 - (i % 3) * 30);
        ctx.lineTo(x + bw, h - bh);
        ctx.fill();
      }
      // Windows.
      for (let wy = h - bh + 18; wy < h - 20; wy += 26) {
        for (let wx = x + 10; wx < x + bw - 12; wx += 22) {
          const lit = ((wx * 31 + wy * 17 + i) % 11) < 3;
          if (!lit) continue;
          ctx.fillStyle = ((wx + wy) % 5 === 0) ? s.accent : 'rgba(255,200,150,0.35)';
          ctx.globalAlpha = 0.5;
          ctx.fillRect(wx, wy, 8, 12);
          ctx.globalAlpha = 1;
        }
      }
      x += bw + 14 + ((i * 13) % 40);
      i++;
    }
  }

  private paintMid(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const s = this.stage;
    ctx.clearRect(0, 0, w, h);
    if (s.id === 'industrial') {
      // Pipes and gantries.
      for (let i = 0; i < 9; i++) {
        const px = i * 360 + 40;
        ctx.fillStyle = '#15171d';
        ctx.fillRect(px, 120, 70, h - 120);
        ctx.fillStyle = '#1f222a';
        ctx.fillRect(px + 10, 120, 12, h - 120);
        ctx.fillRect(px + 48, 120, 12, h - 120);
        for (let y = 160; y < h; y += 90) {
          ctx.fillStyle = '#0d0f13';
          ctx.fillRect(px - 6, y, 82, 10);
        }
      }
      ctx.fillStyle = '#1b1d24';
      ctx.fillRect(0, 300, w, 34);
      ctx.fillStyle = '#23262e';
      ctx.fillRect(0, 300, w, 6);
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = '#0c0d10';
        ctx.fillRect(i * 140, 334, 8, 60);
      }
      // Hanging wires.
      ctx.strokeStyle = '#0a0b0e';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 420, 80);
        ctx.quadraticCurveTo(i * 420 + 210, 260, i * 420 + 420, 90);
        ctx.stroke();
      }
    } else if (s.id === 'station') {
      // Pillars, platform edge and neon signs.
      for (let i = 0; i < 12; i++) {
        const px = i * 280 + 30;
        const g = ctx.createLinearGradient(px, 0, px + 60, 0);
        g.addColorStop(0, '#10131f');
        g.addColorStop(0.5, '#1c2135');
        g.addColorStop(1, '#0d0f19');
        ctx.fillStyle = g;
        ctx.fillRect(px, 60, 60, h - 60);
        ctx.fillStyle = i % 2 ? s.accent : s.accent2;
        ctx.globalAlpha = 0.65;
        ctx.fillRect(px + 26, 160, 8, 200);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#0b0d16';
      ctx.fillRect(0, 60, w, 40);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(56,214,255,0.12)';
        ctx.fillRect(i * 560 + 120, 120, 300, 110);
        ctx.strokeStyle = s.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(i * 560 + 120, 120, 300, 110);
      }
      // Train car silhouette in the back.
      ctx.fillStyle = '#0d1020';
      ctx.fillRect(0, h - 330, w, 220);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = (i % 7 === 0) ? 'rgba(255,63,167,0.5)' : 'rgba(120,180,255,0.18)';
        ctx.fillRect(i * 80 + 20, h - 290, 46, 60);
      }
    } else {
      // Temple: broken columns, arches, hanging banners.
      for (let i = 0; i < 10; i++) {
        const px = i * 330 + 60;
        const colH = 420 + ((i * 71) % 220);
        ctx.fillStyle = '#1a141c';
        ctx.fillRect(px, h - colH, 70, colH);
        ctx.fillStyle = '#24192a';
        ctx.fillRect(px + 8, h - colH, 12, colH);
        ctx.fillStyle = '#120c14';
        ctx.fillRect(px - 10, h - colH - 24, 90, 26);
        if (i % 3 === 0) {
          ctx.fillStyle = s.accent;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(px + 20, h - colH + 40, 30, 180);
          ctx.globalAlpha = 1;
        }
      }
      ctx.strokeStyle = '#2a1f30';
      ctx.lineWidth = 18;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(i * 660 + 330, 300, 300, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  update(dt: number): void {
    this.time += dt;
    for (const sil of this.silhouettes) {
      sil.x += sil.speed * dt;
      if (sil.x > STAGE_HALF_WIDTH + 400) sil.x = -STAGE_HALF_WIDTH - 400;
    }
    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x += (this.stage.rain ? -3 : Math.sin(this.time * 0.02 + d.y * 0.01)) * dt;
      if (d.y > VIEW_HEIGHT) {
        d.y = -20;
        d.x = Math.random() * (VIEW_WIDTH + 400) - 200;
      }
    }
    if (this.stage.embers) {
      if (this.embers.length < (this.quality === 'low' ? 20 : 60) && Math.random() < 0.3) {
        this.embers.push({ x: Math.random() * VIEW_WIDTH, y: VIEW_HEIGHT + 10, vx: (Math.random() - 0.5) * 0.6, vy: -(0.6 + Math.random() * 1.2), life: 200 + Math.random() * 200 });
      }
      for (let i = this.embers.length - 1; i >= 0; i--) {
        const e = this.embers[i]!;
        e.x += e.vx * dt + Math.sin(this.time * 0.05 + i) * 0.3;
        e.y += e.vy * dt;
        e.life -= dt;
        if (e.life <= 0) this.embers.splice(i, 1);
      }
    }
    this.lightningTimer -= dt;
    if (this.lightning > 0) this.lightning = Math.max(0, this.lightning - dt * 0.08);
    if (this.lightningTimer <= 0 && this.stage.rain) {
      this.lightningTimer = 300 + Math.random() * 500;
      this.lightning = 0.6;
    }
  }

  /** Draws the background layers in screen space (parallax derived from the camera). */
  drawBackground(ctx: CanvasRenderingContext2D, cam: Camera, floorScreenY: number, shakeX: number, shakeY: number): void {
    this.ensureLayers();
    const s = this.stage;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    sky.addColorStop(0, s.sky[0]);
    sky.addColorStop(1, s.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    if (this.lightning > 0) {
      ctx.fillStyle = `rgba(200,210,255,${this.lightning * 0.35})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }

    // Far layer (slow parallax).
    const farX = -cam.x * 0.12 * cam.zoom + shakeX * 0.2;
    const farY = floorScreenY - 700 * cam.zoom + 60 + (cam.y * 0.1 + shakeY * 0.2) * cam.zoom;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(this.far!, farX + VIEW_WIDTH / 2 - 1300 * cam.zoom, farY, 2600 * cam.zoom, 700 * cam.zoom);
    ctx.restore();

    // Fog band.
    ctx.fillStyle = s.fog;
    ctx.fillRect(0, floorScreenY - 420 * cam.zoom, VIEW_WIDTH, 420 * cam.zoom);

    // Mid layer.
    const midX = -cam.x * 0.45 * cam.zoom + shakeX * 0.5;
    const midY = floorScreenY - 880 * cam.zoom + (cam.y * 0.4 + shakeY * 0.5) * cam.zoom;
    ctx.drawImage(this.mid!, midX + VIEW_WIDTH / 2 - 1600 * cam.zoom, midY, 3200 * cam.zoom, 900 * cam.zoom);

    // Blinking lamps.
    for (const l of this.lamps) {
      const blink = 0.55 + 0.45 * Math.sin(this.time * 0.08 + l.phase);
      const sx = VIEW_WIDTH / 2 + (l.x - cam.x * 0.45) * cam.zoom + shakeX * 0.5;
      const sy = floorScreenY - (l.y + 320) * cam.zoom + cam.y * 0.4 * cam.zoom;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, l.size * 6);
      grad.addColorStop(0, hexA(l.color, 0.8 * blink));
      grad.addColorStop(1, hexA(l.color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(sx - l.size * 6, sy - l.size * 6, l.size * 12, l.size * 12);
      ctx.fillStyle = l.color;
      ctx.globalAlpha = blink;
      ctx.fillRect(sx - l.size / 2, sy - l.size / 2, l.size, l.size);
      ctx.globalAlpha = 1;
    }

    // NPC silhouettes shuffling in the background.
    for (const sil of this.silhouettes) {
      const sx = VIEW_WIDTH / 2 + (sil.x - cam.x * sil.depth) * cam.zoom + shakeX * 0.5;
      const sy = floorScreenY - 140 * cam.zoom + cam.y * 0.4 * cam.zoom;
      const bob = Math.sin(this.time * 0.15 + sil.x) * 3;
      ctx.fillStyle = 'rgba(4,5,8,0.9)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - sil.height * cam.zoom + bob, sil.width * 0.22 * cam.zoom, sil.width * 0.25 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(sx - (sil.width / 2) * cam.zoom, sy - (sil.height - 20) * cam.zoom + bob, sil.width * cam.zoom, (sil.height - 20) * cam.zoom);
    }

    // Floor.
    const floorGrad = ctx.createLinearGradient(0, floorScreenY, 0, VIEW_HEIGHT);
    floorGrad.addColorStop(0, s.floor[0]);
    floorGrad.addColorStop(1, s.floor[1]);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorScreenY, VIEW_WIDTH, VIEW_HEIGHT - floorScreenY);
    // Floor plates / puddles with reflections of the accent lights.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, floorScreenY, VIEW_WIDTH, VIEW_HEIGHT - floorScreenY);
    ctx.clip();
    for (let i = -8; i < 9; i++) {
      const px = VIEW_WIDTH / 2 + (i * 300 - cam.x) * cam.zoom + shakeX;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, floorScreenY);
      ctx.lineTo(px + 40, VIEW_HEIGHT);
      ctx.stroke();
    }
    for (const l of this.lamps) {
      const sx = VIEW_WIDTH / 2 + (l.x - cam.x * 0.45) * cam.zoom + shakeX * 0.5;
      const g = ctx.createLinearGradient(0, floorScreenY, 0, floorScreenY + 120);
      g.addColorStop(0, hexA(l.color, 0.16));
      g.addColorStop(1, hexA(l.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(sx - 30, floorScreenY, 60, 120);
    }
    ctx.restore();
    // Stage edge markers.
    const edgeL = VIEW_WIDTH / 2 + (-STAGE_HALF_WIDTH - cam.x) * cam.zoom + shakeX;
    const edgeR = VIEW_WIDTH / 2 + (STAGE_HALF_WIDTH - cam.x) * cam.zoom + shakeX;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(edgeL - 4000, 0, 4000, VIEW_HEIGHT);
    ctx.fillRect(edgeR, 0, 4000, VIEW_HEIGHT);
    ctx.fillStyle = s.accent;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(edgeL - 6, floorScreenY - 600 * cam.zoom, 6, 600 * cam.zoom);
    ctx.fillRect(edgeR, floorScreenY - 600 * cam.zoom, 6, 600 * cam.zoom);
    ctx.globalAlpha = 1;
  }

  /** Foreground weather and vignette drawn after fighters. */
  drawForeground(ctx: CanvasRenderingContext2D, reducedMotion: boolean): void {
    const s = this.stage;
    if (s.rain && !reducedMotion) {
      ctx.strokeStyle = 'rgba(180,200,230,0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const d of this.drops) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 3, d.y + d.len);
      }
      ctx.stroke();
    } else if (s.snow && !reducedMotion) {
      ctx.fillStyle = 'rgba(220,210,240,0.5)';
      for (const d of this.drops) {
        ctx.fillRect(d.x, d.y, d.len, d.len);
      }
    }
    if (s.embers && !reducedMotion) {
      ctx.globalCompositeOperation = 'lighter';
      for (const e of this.embers) {
        const a = Math.min(1, e.life / 120) * 0.8;
        ctx.fillStyle = hexA(s.accent2, a);
        ctx.fillRect(e.x, e.y, 3, 3);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Steam / smoke drifting at floor level.
    ctx.fillStyle = this.phase2 ? 'rgba(255,60,30,0.07)' : 'rgba(200,200,220,0.04)';
    for (let i = 0; i < 4; i++) {
      const x = ((this.time * (0.4 + i * 0.2) + i * 500) % (VIEW_WIDTH + 600)) - 300;
      ctx.beginPath();
      ctx.ellipse(x, VIEW_HEIGHT - 120 + i * 30, 260, 60, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const hexA = (hex: string, a: number): string => {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
