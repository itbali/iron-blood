import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';
import { Rng } from '../../core/math';
import type { StageRenderContext } from './StageBase';
import { layerScale, layerScreenX, layerScreenY, makeCanvas, Stage } from './StageBase';

const BRAZIERS = [-860, -330, 330, 860];

/** Arena 3 — Ruined Temple: blood moon, broken colossus, braziers, embers, drifting fog. */
export class TempleStage extends Stage {
  readonly id = 'temple';
  readonly floorReflect = 0.08;
  private embers = Array.from({ length: 70 }, () => ({ x: Math.random() * VIEW_WIDTH, y: Math.random() * VIEW_HEIGHT, v: 0.3 + Math.random() * 0.8, p: Math.random() * 6 }));
  private lightning = 0;
  private clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 320 - 800, y: 80 + (i % 3) * 50, w: 260 + (i % 2) * 120 }));

  protected build(): void {
    const rng = new Rng(5);
    {
      const c = makeCanvas(1800, 760);
      const g = c.getContext('2d')!;
      const sky = g.createLinearGradient(0, 0, 0, 760);
      sky.addColorStop(0, '#0a0610');
      sky.addColorStop(0.5, '#2a0d18');
      sky.addColorStop(1, '#5c1b1a');
      g.fillStyle = sky;
      g.fillRect(0, 0, 1800, 760);
      const moon = g.createRadialGradient(1150, 220, 10, 1150, 220, 220);
      moon.addColorStop(0, 'rgba(255,190,160,0.95)');
      moon.addColorStop(0.35, 'rgba(220,80,60,0.75)');
      moon.addColorStop(0.36, 'rgba(160,40,40,0.25)');
      moon.addColorStop(1, 'rgba(160,40,40,0)');
      g.fillStyle = moon;
      g.fillRect(900, 0, 500, 460);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = `rgba(255,220,220,${rng.range(0.1, 0.5)})`;
        g.fillRect(rng.range(0, 1800), rng.range(0, 380), 1.5, 1.5);
      }
      // Mountains.
      g.fillStyle = '#12080e';
      g.beginPath();
      g.moveTo(0, 700);
      for (let x = 0; x <= 1800; x += 60) g.lineTo(x, 520 - Math.abs(Math.sin(x * 0.004)) * 160 - rng.range(0, 40));
      g.lineTo(1800, 760);
      g.lineTo(0, 760);
      g.fill();
      this.layers.push({ canvas: c, factor: 0.05, groundLine: 700 });
    }
    {
      const c = makeCanvas(2600, 700);
      const g = c.getContext('2d')!;
      g.fillStyle = '#0e070b';
      for (let i = 0; i < 9; i++) {
        const x = i * 300 + rng.range(-40, 40);
        const h = rng.range(220, 420);
        g.fillRect(x, 650 - h, 40, h);
        g.beginPath();
        g.moveTo(x - 10, 650 - h);
        g.lineTo(x + 20, 650 - h - 60);
        g.lineTo(x + 50, 650 - h);
        g.fill();
      }
      // Colossus silhouette.
      g.fillStyle = '#0a0508';
      g.beginPath();
      g.ellipse(1300, 230, 60, 70, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(1180, 290, 240, 360);
      g.fillRect(1120, 300, 60, 250);
      g.fillRect(1420, 300, 60, 160);
      this.layers.push({ canvas: c, factor: 0.22, groundLine: 650 });
    }
    {
      const c = makeCanvas(3200, 660);
      const g = c.getContext('2d')!;
      for (let i = 0; i < 12; i++) {
        const x = i * 270 + rng.range(-30, 30);
        const broken = rng.chance(0.5);
        const h = broken ? rng.range(160, 300) : 520;
        const cg = g.createLinearGradient(x, 0, x + 64, 0);
        cg.addColorStop(0, '#2a2026');
        cg.addColorStop(0.5, '#3b2f33');
        cg.addColorStop(1, '#1a1216');
        g.fillStyle = cg;
        g.fillRect(x, 620 - h, 64, h);
        g.fillStyle = '#1a1216';
        g.fillRect(x - 10, 620 - h, 84, 16);
        g.fillRect(x - 12, 600, 88, 20);
        if (broken) {
          g.fillStyle = '#2a2026';
          g.beginPath();
          g.moveTo(x, 620 - h);
          g.lineTo(x + 30, 620 - h - 30);
          g.lineTo(x + 64, 620 - h + 10);
          g.fill();
        }
      }
      g.fillStyle = '#20171b';
      g.fillRect(0, 100, 3200, 30);
      g.strokeStyle = '#120c0f';
      g.lineWidth = 3;
      for (let x = 200; x < 3200; x += 500) {
        g.beginPath();
        g.moveTo(x, 130);
        g.quadraticCurveTo(x + 40, 260, x + 10, 330);
        g.stroke();
      }
      for (let x = 450; x < 3200; x += 700) {
        g.fillStyle = '#4a0f16';
        g.fillRect(x, 130, 70, 200);
        g.beginPath();
        g.moveTo(x, 330);
        g.lineTo(x + 35, 300);
        g.lineTo(x + 70, 330);
        g.fill();
      }
      this.layers.push({ canvas: c, factor: 0.55, groundLine: 620 });
    }
  }

  renderBackground(r: StageRenderContext): void {
    const { ctx, cam, time, dt } = r;
    ctx.fillStyle = '#0a0610';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.drawLayers(r, 0, 0.1);
    for (const cl of this.clouds) {
      cl.x += 0.15 * dt;
      if (cl.x > 1300) cl.x = -1300;
      const sx = layerScreenX(cam, 0.08, cl.x);
      const sy = layerScreenY(cam, 0.08, 620 - cl.y);
      ctx.fillStyle = 'rgba(30,10,20,0.55)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, cl.w, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!r.reducedMotion && Math.random() < 0.002 * dt) this.lightning = 1;
    if (this.lightning > 0) {
      ctx.fillStyle = `rgba(255,200,220,${this.lightning * 0.18})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT * 0.7);
      this.lightning -= 0.08 * dt;
    }
    this.drawLayers(r, 0.1, 0.4);
    // Colossus eyes.
    const eyeX = layerScreenX(cam, 0.22, 0);
    const eyeY = layerScreenY(cam, 0.22, 650 - 225);
    const pulse = 0.6 + Math.sin(time * 0.002) * 0.4;
    ctx.fillStyle = `rgba(255,60,40,${0.8 * pulse})`;
    const s22 = layerScale(cam, 0.22);
    ctx.fillRect(eyeX - 22 * s22, eyeY, 12 * s22, 4 * s22);
    ctx.fillRect(eyeX + 10 * s22, eyeY, 12 * s22, 4 * s22);
    this.drawLayers(r, 0.4, 0.9);
    // Braziers.
    const s = layerScale(cam, 0.75);
    for (const bx of BRAZIERS) {
      const sx = layerScreenX(cam, 0.75, bx);
      const sy = layerScreenY(cam, 0.75, 0);
      ctx.fillStyle = '#1a1216';
      ctx.fillRect(sx - 8 * s, sy - 90 * s, 16 * s, 90 * s);
      ctx.fillStyle = '#2b2024';
      ctx.fillRect(sx - 26 * s, sy - 100 * s, 52 * s, 14 * s);
      const fl = 0.7 + Math.sin(time * 0.02 + bx) * 0.15 + Math.sin(time * 0.037 + bx) * 0.15;
      const g = ctx.createRadialGradient(sx, sy - 110 * s, 0, sx, sy - 110 * s, 140 * s);
      g.addColorStop(0, `rgba(255,150,60,${0.35 * fl})`);
      g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 140 * s, sy - 250 * s, 280 * s, 280 * s);
      ctx.fillStyle = `rgba(255,190,90,${0.9 * fl})`;
      ctx.beginPath();
      ctx.moveTo(sx - 20 * s, sy - 100 * s);
      ctx.quadraticCurveTo(sx - 10 * s, sy - (130 + fl * 20) * s, sx + Math.sin(time * 0.03 + bx) * 6 * s, sy - (150 + fl * 25) * s);
      ctx.quadraticCurveTo(sx + 10 * s, sy - 125 * s, sx + 20 * s, sy - 100 * s);
      ctx.fill();
    }
    if (r.danger > 0) {
      ctx.fillStyle = `rgba(160,10,10,${0.22 * r.danger})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
  }

  renderFloor(r: StageRenderContext): void {
    const { ctx, cam, time } = r;
    this.drawPerspectiveFloor(r, '#2a2024', '#0b0709', 'rgba(0,0,0,0.35)', 180);
    // Rune circle.
    const sx = cam.sx(0);
    const sy = cam.sy(0) + 50 * cam.zoom;
    const pulse = 0.4 + Math.sin(time * 0.0025) * 0.25;
    ctx.strokeStyle = `rgba(255,60,40,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 260 * cam.zoom, 34 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(sx, sy, 200 * cam.zoom, 25 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + time * 0.0002;
      ctx.fillStyle = `rgba(255,80,50,${pulse})`;
      ctx.fillRect(sx + Math.cos(a) * 230 * cam.zoom - 3, sy + Math.sin(a) * 29 * cam.zoom - 2, 6, 4);
    }
  }

  renderForeground(r: StageRenderContext): void {
    const { ctx, dt, time } = r;
    for (const e of this.embers) {
      e.y -= e.v * dt;
      e.x += Math.sin(time * 0.001 + e.p) * 0.4 * dt;
      if (e.y < -10) {
        e.y = VIEW_HEIGHT + 10;
        e.x = Math.random() * VIEW_WIDTH;
      }
      ctx.fillStyle = `rgba(255,${120 + Math.floor(e.p * 15)},60,${0.5 + Math.sin(time * 0.01 + e.p) * 0.3})`;
      ctx.fillRect(e.x, e.y, 2.5, 2.5);
    }
    const fogY = VIEW_HEIGHT - 190;
    const shift = (time * 0.02) % VIEW_WIDTH;
    ctx.fillStyle = 'rgba(80,40,50,0.12)';
    for (let i = -1; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 520 + shift, fogY + 120, 380, 70, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
