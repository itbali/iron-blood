import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';
import { Rng } from '../../core/math';
import type { StageRenderContext } from './StageBase';
import { layerScale, layerScreenX, layerScreenY, makeCanvas, Stage } from './StageBase';

const ADS = [
  { x: -820, text: 'KAIJU NOODLE', hue: 330 },
  { x: -180, text: 'BLOOD MARKET', hue: 0 },
  { x: 520, text: 'NEURAL BOOST', hue: 190 },
  { x: 1150, text: 'THE PIT ▸ 24/7', hue: 20 },
];
const TUBES = [-1100, -700, -300, 100, 500, 900, 1300];

/** Arena 2 — Cyberpunk Underground Station: passing trains, flickering tubes, holo ads. */
export class SubwayStage extends Stage {
  readonly id = 'subway';
  readonly floorReflect = 0.16;
  private trainX = -4000;
  private trainCooldown = 200;
  private motes = Array.from({ length: 60 }, () => ({ x: Math.random() * VIEW_WIDTH, y: Math.random() * VIEW_HEIGHT, v: 0.1 + Math.random() * 0.3 }));

  protected build(): void {
    const rng = new Rng(19);
    // Tunnel depth.
    {
      const c = makeCanvas(2200, 700);
      const g = c.getContext('2d')!;
      const grad = g.createLinearGradient(0, 0, 0, 700);
      grad.addColorStop(0, '#06070a');
      grad.addColorStop(1, '#10131a');
      g.fillStyle = grad;
      g.fillRect(0, 0, 2200, 700);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(80,140,200,${rng.range(0.05, 0.2)})`;
        g.fillRect(rng.range(0, 2200), rng.range(200, 520), rng.range(2, 6), rng.range(2, 4));
      }
      this.layers.push({ canvas: c, factor: 0.12, groundLine: 600 });
    }
    // Track wall with tunnel opening (train passes in front of this layer).
    {
      const c = makeCanvas(2800, 640);
      const g = c.getContext('2d')!;
      g.fillStyle = '#14171e';
      g.fillRect(0, 0, 2800, 640);
      g.fillStyle = '#07080b';
      g.fillRect(0, 300, 2800, 230);
      g.strokeStyle = '#2a2f3a';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, 528);
      g.lineTo(2800, 528);
      g.moveTo(0, 520);
      g.lineTo(2800, 520);
      g.stroke();
      for (let x = 0; x < 2800; x += 220) {
        g.fillStyle = '#1b1f28';
        g.fillRect(x, 0, 40, 300);
        g.fillRect(x, 530, 40, 110);
      }
      this.layers.push({ canvas: c, factor: 0.38, groundLine: 600 });
    }
    // Platform back wall (tiles, pillars) — drawn above the train.
    {
      const c = makeCanvas(3200, 640);
      const g = c.getContext('2d')!;
      g.fillStyle = '#1a1e26';
      g.fillRect(0, 0, 3200, 250);
      g.strokeStyle = 'rgba(255,255,255,0.05)';
      g.lineWidth = 1;
      for (let y = 0; y < 250; y += 18) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(3200, y);
        g.stroke();
      }
      for (let x = 0; x < 3200; x += 26) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, 250);
        g.stroke();
      }
      g.fillStyle = '#0d0f14';
      g.fillRect(0, 250, 3200, 16);
      for (let x = 100; x < 3200; x += 400) {
        const pg = g.createLinearGradient(x, 0, x + 70, 0);
        pg.addColorStop(0, '#2a2f3a');
        pg.addColorStop(0.5, '#3a404d');
        pg.addColorStop(1, '#1a1e26');
        g.fillStyle = pg;
        g.fillRect(x, 0, 70, 640);
        g.fillStyle = '#d51f2b';
        g.fillRect(x, 470, 70, 6);
      }
      g.fillStyle = '#e8c21a';
      g.fillRect(0, 590, 3200, 6);
      this.layers.push({ canvas: c, factor: 0.62, groundLine: 600 });
    }
  }

  renderBackground(r: StageRenderContext): void {
    const { ctx, cam, time, dt } = r;
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.drawLayers(r, 0, 0.3);
    this.drawLayers(r, 0.3, 0.5);
    // Train.
    this.trainCooldown -= dt;
    if (this.trainCooldown <= 0 && this.trainX < -3500) {
      this.trainX = -3400;
    }
    if (this.trainX > -3500) {
      this.trainX += 34 * dt;
      if (this.trainX > 3600) {
        this.trainX = -4000;
        this.trainCooldown = 420 + Math.random() * 300;
      }
      const s = layerScale(cam, 0.38);
      const y0 = layerScreenY(cam, 0.38, 300);
      const len = 2400;
      const sx = layerScreenX(cam, 0.38, this.trainX - len / 2);
      ctx.fillStyle = '#20252f';
      ctx.fillRect(sx, y0, len * s, 220 * s);
      for (let wx = 0; wx < len; wx += 90) {
        ctx.fillStyle = 'rgba(255,230,180,0.75)';
        ctx.fillRect(sx + (wx + 14) * s, y0 + 40 * s, 60 * s, 50 * s);
      }
      ctx.fillStyle = '#d51f2b';
      ctx.fillRect(sx, y0 + 120 * s, len * s, 8 * s);
      const hx = sx + len * s;
      const hg = ctx.createRadialGradient(hx, y0 + 110 * s, 0, hx, y0 + 110 * s, 220 * s);
      hg.addColorStop(0, 'rgba(255,240,200,0.6)');
      hg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(hx - 220 * s, y0 - 110 * s, 440 * s, 440 * s);
    } else if (this.trainCooldown < 90) {
      // Approaching headlight glow in the tunnel.
      const k = 1 - this.trainCooldown / 90;
      ctx.fillStyle = `rgba(255,240,200,${0.12 * k})`;
      ctx.fillRect(0, layerScreenY(cam, 0.38, 300), VIEW_WIDTH, 230 * layerScale(cam, 0.38));
    }
    this.drawLayers(r, 0.5, 0.9);
    // Holo ads.
    const s = layerScale(cam, 0.62);
    ctx.textAlign = 'center';
    for (const ad of ADS) {
      const sx = layerScreenX(cam, 0.62, ad.x);
      const sy = layerScreenY(cam, 0.62, 500);
      const hue = (ad.hue + Math.sin(time * 0.0007 + ad.x) * 20 + 360) % 360;
      const glitch = Math.sin(time * 0.01 + ad.x) > 0.96 ? 6 : 0;
      ctx.fillStyle = `hsla(${hue},90%,55%,0.12)`;
      ctx.fillRect(sx - 120 * s, sy - 50 * s, 240 * s, 100 * s);
      ctx.strokeStyle = `hsla(${hue},90%,60%,0.7)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 120 * s + glitch, sy - 50 * s, 240 * s, 100 * s);
      ctx.font = `800 ${Math.round(26 * s)}px "Barlow Condensed", Impact, sans-serif`;
      ctx.fillStyle = `hsla(${hue},95%,65%,0.9)`;
      ctx.fillText(ad.text, sx + glitch, sy + 8 * s);
      for (let ly = -46; ly < 50; ly += 6) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(sx - 120 * s, sy + ly * s, 240 * s, 2 * s);
      }
    }
    // Fluorescent tubes.
    for (const tx of TUBES) {
      const flick = !(Math.sin(time * 0.017 + tx * 0.7) > 0.93) || r.reducedMotion;
      const sx = layerScreenX(cam, 0.62, tx);
      const sy = layerScreenY(cam, 0.62, 610);
      ctx.fillStyle = flick ? '#e8f4ff' : '#4a5260';
      ctx.fillRect(sx - 70 * s, sy, 140 * s, 6 * s);
      if (flick) {
        const g = ctx.createLinearGradient(0, sy, 0, sy + 260 * s);
        g.addColorStop(0, 'rgba(200,230,255,0.12)');
        g.addColorStop(1, 'rgba(200,230,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - 70 * s, sy);
        ctx.lineTo(sx + 70 * s, sy);
        ctx.lineTo(sx + 200 * s, sy + 260 * s);
        ctx.lineTo(sx - 200 * s, sy + 260 * s);
        ctx.fill();
      }
    }
    if (r.danger > 0) {
      ctx.fillStyle = `rgba(160,10,10,${0.22 * r.danger})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
  }

  renderFloor(r: StageRenderContext): void {
    this.drawPerspectiveFloor(r, '#22262f', '#0a0b0f', 'rgba(255,255,255,0.06)', 120);
    const { ctx, cam } = r;
    const gy = cam.sy(0);
    ctx.fillStyle = 'rgba(232,194,26,0.5)';
    ctx.fillRect(0, gy - 2, VIEW_WIDTH, 3);
  }

  renderForeground(r: StageRenderContext): void {
    const { ctx, cam, dt } = r;
    const s = layerScale(cam, 1.35);
    for (const fx of [-1150, -200, 900]) {
      const sx = layerScreenX(cam, 1.35, fx);
      if (sx < -200 || sx > VIEW_WIDTH + 200) continue;
      const g = ctx.createLinearGradient(sx - 50 * s, 0, sx + 50 * s, 0);
      g.addColorStop(0, '#040507');
      g.addColorStop(0.5, '#0d0f14');
      g.addColorStop(1, '#040507');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 50 * s, 0, 100 * s, VIEW_HEIGHT);
    }
    ctx.fillStyle = 'rgba(220,230,255,0.25)';
    for (const m of this.motes) {
      m.y += m.v * dt;
      m.x += Math.sin(m.y * 0.02) * 0.2 * dt;
      if (m.y > VIEW_HEIGHT) {
        m.y = -5;
        m.x = Math.random() * VIEW_WIDTH;
      }
      ctx.fillRect(m.x, m.y, 2, 2);
    }
  }
}
