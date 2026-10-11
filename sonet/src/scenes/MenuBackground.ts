import { Fighter } from '../characters/Fighter';
import { getCharacter } from '../data/characters';
import { FighterRenderer } from './render/FighterRenderer';

interface Blob {
  x: number;
  y: number;
  r: number;
  vx: number;
  a: number;
}

interface Ember {
  x: number;
  y: number;
  v: number;
  s: number;
  p: number;
}

const SILHOUETTES: { id: string; x: number; flip: 1 | -1; scale: number }[] = [
  { id: 'raven', x: 0.2, flip: 1, scale: 1.25 },
  { id: 'archon', x: 0.78, flip: -1, scale: 1.1 },
  { id: 'wraith', x: 0.9, flip: -1, scale: 0.9 },
  { id: 'brute', x: 0.07, flip: 1, scale: 0.85 },
];

/** Animated main-menu backdrop: drifting smoke, embers, red flashes and fighter silhouettes. */
export class MenuBackground {
  private blobs: Blob[] = [];
  private embers: Ember[] = [];
  private raf = 0;
  private t = 0;
  private flash = 0;
  private readonly fr = new FighterRenderer();
  private readonly fighters = SILHOUETTES.map((s) => new Fighter(0, getCharacter(s.id)));
  private sil: HTMLCanvasElement[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    for (let i = 0; i < 14; i++) this.blobs.push({ x: Math.random(), y: 0.35 + Math.random() * 0.65, r: 220 + Math.random() * 280, vx: (Math.random() - 0.5) * 0.00018, a: 0.05 + Math.random() * 0.1 });
    for (let i = 0; i < 70; i++) this.embers.push({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0012, s: 1 + Math.random() * 2.2, p: Math.random() * 6 });
    this.prepareSilhouettes();
  }

  private prepareSilhouettes(): void {
    this.sil = this.fighters.map((f, i) => {
      f.facing = SILHOUETTES[i].flip;
      f.animTime = 10;
      const rf = this.fr.render(f, null, 1.15 * SILHOUETTES[i].scale, 0, '#07080c');
      const c = document.createElement('canvas');
      c.width = rf.canvas.width;
      c.height = rf.canvas.height;
      c.getContext('2d')?.drawImage(rf.canvas, 0, 0);
      return c;
    });
  }

  start(): void {
    const loop = (): void => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private draw(): void {
    const cv = this.canvas;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth * dpr;
    const h = cv.clientHeight * dpr;
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    this.t++;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#050609');
    g.addColorStop(0.7, '#12090d');
    g.addColorStop(1, '#2a0a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // metal panel texture
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 90 * dpr) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 90 * dpr) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // red ambient light
    const pulse = 0.55 + 0.25 * Math.sin(this.t * 0.02);
    const amb = ctx.createRadialGradient(w / 2, h * 0.75, 0, w / 2, h * 0.75, h * 0.9);
    amb.addColorStop(0, `rgba(213,31,43,${0.28 * pulse})`);
    amb.addColorStop(1, 'rgba(213,31,43,0)');
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, w, h);

    // silhouettes
    SILHOUETTES.forEach((s, i) => {
      const c = this.sil[i];
      if (!c) return;
      const sc = (h / 900) * 1.3;
      const bob = Math.sin(this.t * 0.02 + i) * 3 * dpr;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(c, s.x * w - (c.width * sc) / 2, h - c.height * sc + 70 * sc * 1.2 + bob, c.width * sc, c.height * sc);
    });
    ctx.globalAlpha = 1;

    // smoke
    for (const b of this.blobs) {
      b.x += b.vx;
      if (b.x < -0.3) b.x = 1.3;
      if (b.x > 1.3) b.x = -0.3;
      const gr = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * dpr);
      gr.addColorStop(0, `rgba(120,110,125,${b.a})`);
      gr.addColorStop(1, 'rgba(120,110,125,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(b.x * w - b.r * dpr, b.y * h - b.r * dpr, b.r * 2 * dpr, b.r * 2 * dpr);
    }

    // embers
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.embers) {
      e.y -= e.v;
      e.x += Math.sin(this.t * 0.02 + e.p) * 0.0003;
      if (e.y < -0.05) {
        e.y = 1.05;
        e.x = Math.random();
      }
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(this.t * 0.05 + e.p);
      ctx.fillStyle = '#ff7a3a';
      ctx.fillRect(e.x * w, e.y * h, e.s * dpr, e.s * dpr);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // occasional lightning-like flash
    if (Math.random() < 0.003) this.flash = 1;
    if (this.flash > 0.02) {
      ctx.fillStyle = `rgba(255,70,70,${this.flash * 0.12})`;
      ctx.fillRect(0, 0, w, h);
      this.flash *= 0.9;
    }

    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 1.1);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
