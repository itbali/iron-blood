import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';
import { Rng } from '../../core/math';
import { withAlpha } from '../color';
import type { StageRenderContext } from './StageBase';
import { layerScale, layerScreenX, layerScreenY, makeCanvas, Stage } from './StageBase';

interface Drop {
  x: number;
  y: number;
  v: number;
  l: number;
}

interface Puff {
  x: number;
  y: number;
  r: number;
  life: number;
}

const NEON = [
  { x: -620, y: 330, w: 150, h: 46, text: 'FORGE 9', color: '#ff2238' },
  { x: 240, y: 360, w: 170, h: 40, text: 'NO EXIT', color: '#29d3ff' },
  { x: 860, y: 320, w: 120, h: 44, text: 'BLOOD', color: '#ff7a1a' },
  { x: -1180, y: 350, w: 140, h: 40, text: 'PIT', color: '#ff2238' },
];

const BEACONS = [-900, -420, 120, 650, 1040];
const VENTS = [-760, -60, 520, 1120];

/** Arena 1 — Abandoned Industrial District: rain, neon, steam, catwalk silhouettes, wet metal. */
export class IndustrialStage extends Stage {
  readonly id = 'industrial';
  readonly floorReflect = 0.22;
  private drops: Drop[] = [];
  private puffs: Puff[] = [];
  private walkers = [
    { x: -500, v: 0.25, h: 34 },
    { x: 300, v: -0.18, h: 30 },
    { x: 900, v: 0.12, h: 32 },
  ];
  private cars: { x: number; v: number; color: string }[] = [
    { x: -900, v: 3.2, color: '#ffe9b0' },
    { x: 400, v: -2.6, color: '#ff4455' },
  ];

  protected build(): void {
    const rng = new Rng(77);
    // Sky + distant skyline.
    {
      const c = makeCanvas(1700, 760);
      const g = c.getContext('2d')!;
      const sky = g.createLinearGradient(0, 0, 0, 760);
      sky.addColorStop(0, '#05060a');
      sky.addColorStop(0.55, '#141019');
      sky.addColorStop(0.85, '#3a1214');
      sky.addColorStop(1, '#5a1a14');
      g.fillStyle = sky;
      g.fillRect(0, 0, 1700, 760);
      for (let x = 0; x < 1700; ) {
        const w = rng.range(30, 90);
        const h = rng.range(120, 380);
        g.fillStyle = '#0c0d12';
        g.fillRect(x, 700 - h, w, h + 60);
        for (let wy = 700 - h + 10; wy < 690; wy += 12) {
          for (let wx = x + 5; wx < x + w - 5; wx += 9) {
            if (rng.chance(0.08)) {
              g.fillStyle = rng.chance(0.7) ? 'rgba(255,170,90,0.6)' : 'rgba(90,200,255,0.5)';
              g.fillRect(wx, wy, 3, 4);
            }
          }
        }
        x += w + rng.range(2, 20);
      }
      // Smog band.
      const smog = g.createLinearGradient(0, 520, 0, 760);
      smog.addColorStop(0, 'rgba(120,40,30,0)');
      smog.addColorStop(1, 'rgba(120,40,30,0.55)');
      g.fillStyle = smog;
      g.fillRect(0, 520, 1700, 240);
      this.layers.push({ canvas: c, factor: 0.06, groundLine: 700 });
    }
    // Far industrial silhouettes: chimneys, tanks.
    {
      const c = makeCanvas(2600, 700);
      const g = c.getContext('2d')!;
      for (let i = 0; i < 18; i++) {
        const x = i * 150 + rng.range(-30, 30);
        const kind = rng.int(0, 2);
        g.fillStyle = '#101218';
        if (kind === 0) {
          const h = rng.range(300, 520);
          g.fillRect(x, 650 - h, 26, h);
          g.fillRect(x - 6, 650 - h, 38, 14);
        } else if (kind === 1) {
          const r = rng.range(50, 80);
          g.beginPath();
          g.ellipse(x, 650 - r, r, r * 0.9, 0, 0, Math.PI * 2);
          g.fill();
          g.fillRect(x - r, 650 - r, r * 2, r);
        } else {
          const h = rng.range(160, 280);
          g.fillRect(x - 60, 650 - h, 120, h);
          for (let wy = 650 - h + 14; wy < 640; wy += 22) {
            g.fillStyle = rng.chance(0.3) ? 'rgba(255,120,60,0.35)' : 'rgba(30,34,44,1)';
            g.fillRect(x - 50, wy, 100, 6);
          }
        }
      }
      g.strokeStyle = '#151820';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(0, 520);
      g.bezierCurveTo(700, 500, 1400, 560, 2600, 510);
      g.stroke();
      g.fillStyle = '#0d0f14';
      g.fillRect(0, 640, 2600, 60);
      this.layers.push({ canvas: c, factor: 0.25, groundLine: 650 });
    }
    // Mid layer: warehouses, catwalk, pipes, wires.
    {
      const c = makeCanvas(3200, 640);
      const g = c.getContext('2d')!;
      for (let i = 0; i < 9; i++) {
        const x = i * 360 + rng.range(-40, 40);
        const w = rng.range(260, 340);
        const h = rng.range(330, 470);
        const grad = g.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, '#191c24');
        grad.addColorStop(1, '#12151b');
        g.fillStyle = grad;
        g.fillRect(x, 600 - h, w, h + 40);
        g.strokeStyle = 'rgba(255,255,255,0.04)';
        g.lineWidth = 2;
        for (let sx = x + 20; sx < x + w; sx += 24) {
          g.beginPath();
          g.moveTo(sx, 600 - h);
          g.lineTo(sx, 640);
          g.stroke();
        }
        g.fillStyle = '#0b0c10';
        g.fillRect(x + w * 0.3, 600 - 150, w * 0.4, 150);
        g.fillStyle = 'rgba(213,31,43,0.08)';
        g.fillRect(x + w * 0.3, 600 - 150, w * 0.4, 6);
      }
      // Catwalk.
      g.fillStyle = '#1f232c';
      g.fillRect(0, 300, 3200, 10);
      g.strokeStyle = '#262a33';
      g.lineWidth = 2;
      for (let x = 0; x < 3200; x += 26) {
        g.beginPath();
        g.moveTo(x, 300);
        g.lineTo(x, 270);
        g.stroke();
      }
      g.fillRect(0, 268, 3200, 4);
      // Pipes.
      for (let k = 0; k < 3; k++) {
        const y = 420 + k * 34;
        const pg = g.createLinearGradient(0, y - 10, 0, y + 10);
        pg.addColorStop(0, '#3a3f4a');
        pg.addColorStop(0.5, '#242832');
        pg.addColorStop(1, '#101217');
        g.fillStyle = pg;
        g.fillRect(0, y - 9 + k, 3200, 18 - k * 3);
        for (let x = rng.range(0, 200); x < 3200; x += rng.range(180, 320)) {
          g.fillStyle = '#4a505c';
          g.fillRect(x, y - 12, 10, 24);
        }
      }
      // Wires.
      g.strokeStyle = '#08090c';
      g.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        for (let x = 0; x <= 3200; x += 400) {
          const y0 = 120 + k * 22;
          if (x === 0) g.moveTo(x, y0);
          else g.quadraticCurveTo(x - 200, y0 + 60 + k * 8, x, y0);
        }
        g.stroke();
      }
      this.layers.push({ canvas: c, factor: 0.55, groundLine: 600 });
    }
    this.drops = Array.from({ length: 260 }, () => ({
      x: Math.random() * VIEW_WIDTH,
      y: Math.random() * VIEW_HEIGHT,
      v: 14 + Math.random() * 10,
      l: 10 + Math.random() * 16,
    }));
  }

  renderBackground(r: StageRenderContext): void {
    const { ctx, cam, time, dt } = r;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.drawLayers(r, 0, 0.1);
    // Cars with headlights on the far road.
    for (const car of this.cars) {
      car.x += car.v * dt;
      if (car.x > 1400) car.x = -1400;
      if (car.x < -1400) car.x = 1400;
      const sx = layerScreenX(cam, 0.25, car.x);
      const sy = layerScreenY(cam, 0.25, 12);
      const s = layerScale(cam, 0.25);
      ctx.fillStyle = '#07080b';
      ctx.fillRect(sx - 22 * s, sy - 10 * s, 44 * s, 10 * s);
      ctx.fillStyle = withAlpha(car.color, 0.9);
      ctx.fillRect(sx + (car.v > 0 ? 20 : -24) * s, sy - 8 * s, 4 * s, 3 * s);
    }
    this.drawLayers(r, 0.1, 0.4);
    // Beacons on chimneys.
    for (const bx of BEACONS) {
      const on = Math.sin(time * 0.004 + bx) > 0.2;
      if (!on) continue;
      const sx = layerScreenX(cam, 0.25, bx);
      const sy = layerScreenY(cam, 0.25, 420 + (bx % 3) * 30);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
      g.addColorStop(0, 'rgba(255,40,50,0.9)');
      g.addColorStop(1, 'rgba(255,40,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 26, sy - 26, 52, 52);
    }
    this.drawLayers(r, 0.4, 0.9);
    // Neon signs with flicker.
    const s = layerScale(cam, 0.55);
    ctx.textAlign = 'center';
    for (const n of NEON) {
      const flick = Math.sin(time * 0.013 + n.x) > -0.85 && !(Math.sin(time * 0.002 + n.x * 3) > 0.97);
      const sx = layerScreenX(cam, 0.55, n.x);
      const sy = layerScreenY(cam, 0.55, n.y);
      ctx.fillStyle = '#0a0b0f';
      ctx.fillRect(sx - (n.w / 2) * s, sy - n.h * s, n.w * s, n.h * s);
      ctx.font = `800 ${Math.round(n.h * 0.7 * s)}px "Barlow Condensed", Impact, sans-serif`;
      ctx.fillStyle = flick ? n.color : withAlpha(n.color, 0.15);
      if (flick && r.quality === 'high') {
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 16;
      }
      ctx.fillText(n.text, sx, sy - n.h * 0.22 * s);
      ctx.shadowBlur = 0;
      if (flick) {
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, n.w * s);
        glow.addColorStop(0, withAlpha(n.color, 0.12));
        glow.addColorStop(1, withAlpha(n.color, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(sx - n.w * s, sy - n.w * s, n.w * 2 * s, n.w * 2 * s);
      }
    }
    // Catwalk silhouettes.
    for (const w of this.walkers) {
      w.x += w.v * dt;
      if (w.x > 1500) w.x = -1500;
      if (w.x < -1500) w.x = 1500;
      const sx = layerScreenX(cam, 0.55, w.x);
      const sy = layerScreenY(cam, 0.55, 300);
      const step = Math.sin(time * 0.006 + w.x) * 3;
      ctx.fillStyle = '#07080b';
      ctx.fillRect(sx - 5 * s, sy - w.h * s, 10 * s, w.h * 0.6 * s);
      ctx.beginPath();
      ctx.arc(sx, sy - w.h * s - 5 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(sx - 4 * s + step * s, sy - w.h * 0.42 * s, 3 * s, w.h * 0.42 * s);
      ctx.fillRect(sx + 1 * s - step * s, sy - w.h * 0.42 * s, 3 * s, w.h * 0.42 * s);
    }
    // Steam vents.
    if (!r.reducedMotion) {
      for (const vx of VENTS) {
        if (Math.random() < 0.08 * dt) this.puffs.push({ x: vx + Math.random() * 20, y: 40, r: 14, life: 1 });
      }
    }
    for (const p of this.puffs) {
      p.y += 0.8 * dt;
      p.r += 0.5 * dt;
      p.life -= 0.012 * dt;
      const sx = layerScreenX(cam, 0.55, p.x);
      const sy = layerScreenY(cam, 0.55, p.y);
      ctx.fillStyle = `rgba(160,160,175,${Math.max(0, p.life) * 0.18})`;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    this.puffs = this.puffs.filter((p) => p.life > 0);
    // Danger tint (boss phase 2).
    if (r.danger > 0) {
      ctx.fillStyle = `rgba(160,10,10,${0.22 * r.danger})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
  }

  renderFloor(r: StageRenderContext): void {
    const { ctx, cam, time } = r;
    this.drawPerspectiveFloor(r, '#1a1d24', '#07080b', 'rgba(255,255,255,0.045)', 160);
    const gy = cam.sy(0);
    // Puddles reflecting neon.
    for (const px of [-700, -150, 380, 900]) {
      const sx = cam.sx(px);
      const sy = gy + 40 * cam.zoom + (px % 3) * 6;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120 * cam.zoom);
      const hue = Math.sin(time * 0.001 + px) > 0 ? '255,34,56' : '41,211,255';
      g.addColorStop(0, `rgba(${hue},0.16)`);
      g.addColorStop(1, `rgba(${hue},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 140 * cam.zoom, 16 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderForeground(r: StageRenderContext): void {
    const { ctx, dt, cam } = r;
    // Foreground pipe silhouettes at screen edges (parallax > 1).
    const s = layerScale(cam, 1.3);
    for (const fx of [-1300, 1250]) {
      const sx = layerScreenX(cam, 1.3, fx);
      ctx.fillStyle = '#040406';
      ctx.fillRect(sx - 30 * s, 0, 60 * s, VIEW_HEIGHT);
      ctx.fillStyle = 'rgba(213,31,43,0.25)';
      ctx.fillRect(sx + 26 * s, 0, 3 * s, VIEW_HEIGHT);
    }
    // Rain.
    const count = r.quality === 'low' ? 90 : r.quality === 'medium' ? 170 : 260;
    ctx.strokeStyle = 'rgba(170,190,220,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const d = this.drops[i];
      d.y += d.v * dt;
      d.x -= d.v * 0.18 * dt;
      if (d.y > VIEW_HEIGHT) {
        d.y = -20;
        d.x = Math.random() * (VIEW_WIDTH + 100);
      }
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.l * 0.18, d.y - d.l);
    }
    ctx.stroke();
    // Low fog.
    const fog = ctx.createLinearGradient(0, VIEW_HEIGHT - 160, 0, VIEW_HEIGHT);
    fog.addColorStop(0, 'rgba(60,40,45,0)');
    fog.addColorStop(1, 'rgba(60,40,45,0.25)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, VIEW_HEIGHT - 160, VIEW_WIDTH, 160);
  }
}
