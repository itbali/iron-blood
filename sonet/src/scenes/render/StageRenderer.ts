import { GROUND_SCREEN_Y, VIEW_H, VIEW_W } from '../../data/constants';
import type { StageDef, StageId } from '../../data/stages';
import { mulberry32 } from '../../game/rng';
import type { Camera } from '../Camera';
import { resetTransform } from './view';

const LW = 2700;
const LH = 720;
const GY = GROUND_SCREEN_Y;

type Painter = (c: CanvasRenderingContext2D, rng: () => number) => void;

interface Layer {
  canvas: HTMLCanvasElement;
  factor: number;
}

export interface StageFx {
  reduced: boolean;
  quality: number;
  flash: number;
  phase2: boolean;
  dim: number;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  if (!c) throw new Error('2D canvas unavailable');
  return [cv, c];
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 1): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.globalAlpha = a;
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

function vgrad(c: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

// ───────────────────────── Industrial ─────────────────────────
const industrial: Painter[] = [
  (c, rng) => {
    c.fillStyle = vgrad(c, 0, GY, [[0, '#050609'], [0.55, '#130a10'], [0.85, '#3a0e14'], [1, '#5a1418']]);
    c.fillRect(0, 0, LW, LH);
    glow(c, LW / 2, GY - 120, 900, 'rgba(213,31,43,0.35)');
    for (let i = 0; i < 120; i++) {
      c.fillStyle = `rgba(200,200,220,${0.05 + rng() * 0.15})`;
      c.fillRect(rng() * LW, rng() * 300, 1.4, 1.4);
    }
    for (let i = 0; i < 9; i++) {
      c.fillStyle = `rgba(20,12,18,${0.2 + rng() * 0.25})`;
      c.beginPath();
      c.ellipse(rng() * LW, 120 + rng() * 260, 300 + rng() * 300, 40 + rng() * 40, 0, 0, Math.PI * 2);
      c.fill();
    }
  },
  (c, rng) => {
    let x = 0;
    while (x < LW) {
      const w = 90 + rng() * 150;
      const h = 220 + rng() * 360;
      c.fillStyle = `rgb(${14 + rng() * 10},${10 + rng() * 8},${16 + rng() * 10})`;
      c.fillRect(x, GY - h, w, h + 50);
      for (let wy = GY - h + 16; wy < GY - 10; wy += 20) {
        for (let wx = x + 8; wx < x + w - 10; wx += 16) {
          if (rng() < 0.12) {
            c.fillStyle = rng() < 0.7 ? 'rgba(255,90,60,0.7)' : 'rgba(255,200,120,0.6)';
            c.fillRect(wx, wy, 6, 8);
          }
        }
      }
      if (rng() < 0.4) {
        c.fillStyle = '#0c0a10';
        c.fillRect(x + w * 0.45, GY - h - 80, 6, 80);
      }
      x += w + rng() * 14;
    }
    for (let i = 0; i < 6; i++) {
      const sx = 200 + rng() * (LW - 400);
      c.fillStyle = '#0a090d';
      c.fillRect(sx, GY - 560, 40, 560);
      c.fillRect(sx - 8, GY - 580, 56, 28);
    }
  },
  (c, rng) => {
    // mid: big industrial blocks, pipes, neon
    let x = -100;
    while (x < LW) {
      const w = 220 + rng() * 260;
      const h = 260 + rng() * 280;
      const base = 24 + rng() * 10;
      c.fillStyle = vgrad(c, GY - h, GY, [[0, `rgb(${base + 8},${base + 8},${base + 18})`], [1, `rgb(${base},${base},${base + 8})`]]);
      c.fillRect(x, GY - h, w, h + 40);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < w; k += 36) c.fillRect(x + k, GY - h, 3, h + 40);
      c.strokeStyle = '#1b1d24';
      c.lineWidth = 9;
      for (let p = 0; p < 3; p++) {
        const py = GY - h + 40 + p * 46 + rng() * 20;
        c.beginPath();
        c.moveTo(x - 20, py);
        c.lineTo(x + w + 20, py);
        c.stroke();
      }
      if (rng() < 0.8) {
        const col = ['#ff3b3b', '#ff8a2a', '#35e0ff', '#ff3bd4'][Math.floor(rng() * 4)];
        const nx = x + 24 + rng() * (w - 100);
        const ny = GY - h + 70 + rng() * (h * 0.4);
        glow(c, nx + 30, ny + 40, 150, col, 0.35);
        c.strokeStyle = col;
        c.lineWidth = 4;
        c.strokeRect(nx, ny, 60, 80);
        c.beginPath();
        c.moveTo(nx + 12, ny + 20);
        c.lineTo(nx + 48, ny + 20);
        c.moveTo(nx + 12, ny + 40);
        c.lineTo(nx + 36, ny + 40);
        c.moveTo(nx + 12, ny + 60);
        c.lineTo(nx + 48, ny + 60);
        c.stroke();
      }
      x += w + 30 + rng() * 40;
    }
    // catwalk
    c.fillStyle = '#101218';
    c.fillRect(0, GY - 190, LW, 8);
    c.fillRect(0, GY - 150, LW, 4);
    for (let k = 0; k < LW; k += 60) c.fillRect(k, GY - 190, 4, 40);
    // hanging wires
    c.strokeStyle = '#0b0c10';
    c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const wx = rng() * LW;
      c.beginPath();
      c.moveTo(wx, 0);
      c.quadraticCurveTo(wx + 120, 160 + rng() * 80, wx + 280, 40 + rng() * 40);
      c.stroke();
    }
  },
  (c, rng) => {
    // near: scaffolding, containers, pipes + vents
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 290 + rng() * 80;
      const w = 120 + rng() * 100;
      const h = 70 + rng() * 120;
      c.fillStyle = `rgb(${26 + rng() * 12},${22 + rng() * 10},${28 + rng() * 10})`;
      c.fillRect(x, GY - h, w, h);
      c.fillStyle = 'rgba(0,0,0,0.4)';
      for (let k = 6; k < w; k += 14) c.fillRect(x + k, GY - h, 3, h);
      if (rng() < 0.5) {
        c.fillStyle = '#c33';
        c.fillRect(x + 10, GY - h + 10, 26, 8);
      }
    }
    c.strokeStyle = '#15161c';
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(0, GY - 260);
    c.lineTo(LW, GY - 260);
    c.stroke();
    c.lineWidth = 6;
    for (let x = 100; x < LW; x += 260) {
      c.beginPath();
      c.moveTo(x, GY - 260);
      c.lineTo(x, GY - 20);
      c.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const lx = 120 + i * 380;
      c.fillStyle = '#2a0a0e';
      c.fillRect(lx - 7, GY - 300, 14, 20);
      glow(c, lx, GY - 290, 70, 'rgba(255,40,40,0.5)');
    }
  },
];

// ───────────────────────── Station ─────────────────────────
const station: Painter[] = [
  (c, rng) => {
    c.fillStyle = vgrad(c, 0, GY, [[0, '#04080c'], [1, '#0a1820']]);
    c.fillRect(0, 0, LW, LH);
    c.fillStyle = 'rgba(20,50,60,0.35)';
    for (let i = 0; i < 20; i++) c.fillRect(rng() * LW, 0, 2 + rng() * 6, GY);
  },
  (c, rng) => {
    // far tunnel mouth with track lights
    c.fillStyle = '#02050a';
    c.beginPath();
    c.ellipse(LW / 2, GY - 160, 520, 260, 0, 0, Math.PI * 2);
    c.fill();
    glow(c, LW / 2, GY - 160, 400, 'rgba(53,224,255,0.18)');
    c.strokeStyle = '#1b3640';
    c.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.moveTo(LW / 2 - 40 + i * 80, GY - 50);
      c.lineTo(LW / 2 - 400 + i * 800, GY + 20);
      c.stroke();
    }
    for (let i = 0; i < 18; i++) {
      const x = rng() * LW;
      c.fillStyle = 'rgba(53,224,255,0.4)';
      c.fillRect(x, 60 + rng() * 100, 40, 4);
    }
  },
  (c, rng) => {
    // mid: back wall of platform, tiles, pillars, signs
    c.fillStyle = vgrad(c, GY - 420, GY, [[0, '#0e2128'], [1, '#13303a']]);
    c.fillRect(0, GY - 420, LW, 420);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    for (let x = 0; x < LW; x += 56) {
      c.beginPath();
      c.moveTo(x, GY - 420);
      c.lineTo(x, GY);
      c.stroke();
    }
    for (let y = GY - 420; y < GY; y += 56) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(LW, y);
      c.stroke();
    }
    for (let i = 0; i < 14; i++) {
      c.fillStyle = `rgba(0,0,0,${0.1 + rng() * 0.15})`;
      c.fillRect(rng() * LW, GY - 420 + rng() * 380, 80 + rng() * 160, 20 + rng() * 60);
    }
    for (let i = 0; i < 5; i++) {
      const gx = 150 + i * 520 + rng() * 120;
      const col = ['#ff3bd4', '#35e0ff', '#ffd23a'][i % 3];
      c.strokeStyle = col;
      c.globalAlpha = 0.5;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(gx, GY - 340);
      c.bezierCurveTo(gx + 40, GY - 400, gx + 90, GY - 280, gx + 150, GY - 330);
      c.stroke();
      c.globalAlpha = 1;
    }
    // exit sign + board
    c.fillStyle = '#04130e';
    c.fillRect(420, GY - 380, 220, 60);
    c.fillStyle = '#35ff8a';
    c.font = 'bold 34px Oswald, sans-serif';
    c.fillText('EXIT ▶', 450, GY - 336);
    c.fillStyle = '#0a0f12';
    c.fillRect(1500, GY - 380, 380, 70);
    c.fillStyle = '#ffb13b';
    c.font = 'bold 24px monospace';
    c.fillText('LINE 7  —  NO SERVICE', 1516, GY - 338);
    for (let i = 0; i < 7; i++) {
      const px = 180 + i * 400;
      c.fillStyle = '#16282e';
      c.fillRect(px, GY - 440, 60, 440);
      c.fillStyle = '#0a1418';
      c.fillRect(px + 44, GY - 440, 16, 440);
    }
  },
  (c, rng) => {
    // near: benches, vending, bins, light tubes
    for (let i = 0; i < 6; i++) {
      const x = 120 + i * 420 + rng() * 80;
      const t = rng();
      if (t < 0.35) {
        c.fillStyle = '#1a2a30';
        c.fillRect(x, GY - 150, 90, 150);
        glow(c, x + 45, GY - 90, 120, 'rgba(255,60,60,0.35)');
        c.fillStyle = '#ff4a4a';
        c.fillRect(x + 12, GY - 130, 66, 70);
      } else if (t < 0.7) {
        c.fillStyle = '#0c1519';
        c.fillRect(x, GY - 44, 150, 8);
        c.fillRect(x + 8, GY - 36, 6, 36);
        c.fillRect(x + 136, GY - 36, 6, 36);
      } else {
        c.fillStyle = '#0f1c20';
        c.fillRect(x, GY - 70, 40, 70);
      }
    }
    c.fillStyle = '#e4d84a';
    c.fillRect(0, GY - 6, LW, 6);
  },
];

// ───────────────────────── Temple ─────────────────────────
const temple: Painter[] = [
  (c, rng) => {
    c.fillStyle = vgrad(c, 0, GY, [[0, '#07040f'], [0.6, '#1a0a22'], [1, '#3a1022']]);
    c.fillRect(0, 0, LW, LH);
    glow(c, LW / 2 + 260, 190, 520, 'rgba(255,90,60,0.35)');
    c.fillStyle = '#f2b8a0';
    c.beginPath();
    c.arc(LW / 2 + 260, 190, 92, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(80,20,30,0.45)';
    c.beginPath();
    c.arc(LW / 2 + 232, 170, 22, 0, Math.PI * 2);
    c.arc(LW / 2 + 292, 220, 14, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 200; i++) {
      c.fillStyle = `rgba(255,230,230,${rng() * 0.5})`;
      c.fillRect(rng() * LW, rng() * 360, 1.5, 1.5);
    }
    for (let i = 0; i < 8; i++) {
      c.fillStyle = `rgba(40,12,40,${0.35 + rng() * 0.3})`;
      c.beginPath();
      c.ellipse(rng() * LW, 100 + rng() * 280, 280 + rng() * 260, 28 + rng() * 30, 0, 0, Math.PI * 2);
      c.fill();
    }
  },
  (c, rng) => {
    c.fillStyle = '#0a0612';
    c.beginPath();
    c.moveTo(0, GY);
    let y = GY - 220;
    for (let x = 0; x <= LW; x += 60) {
      y += (rng() - 0.5) * 70;
      y = Math.max(GY - 380, Math.min(GY - 120, y));
      c.lineTo(x, y);
    }
    c.lineTo(LW, GY);
    c.fill();
    // giant statue
    const sx = LW / 2 - 40;
    c.fillStyle = '#0d0716';
    c.fillRect(sx - 90, GY - 520, 180, 520);
    c.beginPath();
    c.moveTo(sx - 90, GY - 520);
    c.lineTo(sx - 220, GY - 600);
    c.lineTo(sx - 120, GY - 440);
    c.fill();
    c.beginPath();
    c.moveTo(sx + 90, GY - 520);
    c.lineTo(sx + 220, GY - 600);
    c.lineTo(sx + 120, GY - 440);
    c.fill();
    c.beginPath();
    c.arc(sx, GY - 560, 52, 0, Math.PI * 2);
    c.fill();
    glow(c, sx - 20, GY - 565, 28, 'rgba(255,90,40,0.8)');
    glow(c, sx + 20, GY - 565, 28, 'rgba(255,90,40,0.8)');
  },
  (c, rng) => {
    // mid: broken columns and arches
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 300 + rng() * 60;
      const h = 300 + rng() * 260;
      const w = 70 + rng() * 24;
      c.fillStyle = vgrad(c, GY - h, GY, [[0, '#1c1226'], [1, '#2a1a30']]);
      c.fillRect(x, GY - h, w, h);
      c.fillStyle = '#150e1c';
      c.fillRect(x - 12, GY - h - 14, w + 24, 18);
      c.fillRect(x - 12, GY - 20, w + 24, 20);
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.lineWidth = 3;
      for (let k = 14; k < w; k += 18) {
        c.beginPath();
        c.moveTo(x + k, GY - h + 10);
        c.lineTo(x + k, GY - 20);
        c.stroke();
      }
      if (rng() < 0.4) {
        c.fillStyle = '#0a0612';
        c.beginPath();
        c.moveTo(x - 14, GY - h - 14);
        c.lineTo(x + w * 0.5, GY - h - 14 - 40 * rng());
        c.lineTo(x + w + 14, GY - h - 14);
        c.fill();
      }
    }
    c.strokeStyle = '#201428';
    c.lineWidth = 8;
    for (let i = 0; i < 8; i++) {
      const x = 130 + i * 340;
      c.beginPath();
      c.moveTo(x, GY - 380);
      c.quadraticCurveTo(x + 150, GY - 520, x + 300, GY - 380);
      c.stroke();
    }
  },
  (c, rng) => {
    // near: rubble, hanging chains, braziers (flames are dynamic)
    for (let i = 0; i < 11; i++) {
      const x = 60 + i * 240 + rng() * 80;
      const w = 50 + rng() * 120;
      const h = 20 + rng() * 60;
      c.fillStyle = `rgb(${24 + rng() * 14},${16 + rng() * 10},${30 + rng() * 14})`;
      c.beginPath();
      c.moveTo(x, GY);
      c.lineTo(x + w * 0.2, GY - h);
      c.lineTo(x + w * 0.7, GY - h * 0.8);
      c.lineTo(x + w, GY);
      c.fill();
    }
    c.strokeStyle = '#120a18';
    c.lineWidth = 5;
    for (let i = 0; i < 7; i++) {
      const x = 150 + i * 380;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 170 + rng() * 150);
      c.stroke();
      for (let k = 0; k < 8; k++) {
        c.beginPath();
        c.ellipse(x, 14 + k * 18, 5, 8, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    for (const bx of [LW / 2 - 700, LW / 2 + 700]) {
      c.fillStyle = '#171020';
      c.fillRect(bx - 22, GY - 120, 44, 120);
      c.fillRect(bx - 38, GY - 140, 76, 24);
      c.fillStyle = '#251830';
      c.fillRect(bx - 44, GY - 148, 88, 10);
    }
  },
];

const PAINTERS: Record<StageId, Painter[]> = { industrial, station, temple };
const FACTORS = [0.03, 0.12, 0.3, 0.62];

interface Npc {
  x: number;
  speed: number;
  hue: number;
}

export class StageRenderer {
  private layers: Layer[] = [];
  private floor: HTMLCanvasElement | null = null;
  private npcs: Npc[] = [];
  private rain: { x: number; y: number; v: number; l: number }[] = [];
  private cars: { x: number; speed: number }[] = [];
  private trainX = -4000;
  private nextTrain = 200;
  private lightning = 0;
  ready = false;

  constructor(readonly def: StageDef) {
    const rng = mulberry32(def.id.length * 977);
    for (let i = 0; i < 9; i++) this.npcs.push({ x: rng() * LW, speed: (0.15 + rng() * 0.3) * (rng() < 0.5 ? -1 : 1), hue: rng() });
    for (let i = 0; i < 160; i++) this.rain.push({ x: rng() * VIEW_W, y: rng() * VIEW_H, v: 18 + rng() * 14, l: 14 + rng() * 22 });
    for (let i = 0; i < 3; i++) this.cars.push({ x: rng() * LW, speed: (2 + rng() * 2) * (rng() < 0.5 ? 1 : -1) });
  }

  /** Builds parallax layers one at a time so the loading screen can show real progress. */
  async build(onProgress: (p: number) => void): Promise<void> {
    const painters = PAINTERS[this.def.id];
    const rng = mulberry32(this.def.id.charCodeAt(0) * 31 + 7);
    this.layers = [];
    for (let i = 0; i < painters.length; i++) {
      await new Promise<void>((r) => setTimeout(r, 0));
      try {
        const [cv, c] = makeCanvas(LW, LH);
        painters[i](c, rng);
        this.layers.push({ canvas: cv, factor: FACTORS[i] });
      } catch (err) {
        console.error(`Stage layer ${i} failed, using fallback`, err);
        const [cv, c] = makeCanvas(LW, LH);
        c.fillStyle = '#0a0b10';
        c.fillRect(0, 0, LW, LH);
        this.layers.push({ canvas: cv, factor: FACTORS[i] });
      }
      onProgress((i + 1) / (painters.length + 1));
    }
    await new Promise<void>((r) => setTimeout(r, 0));
    this.floor = this.buildFloor();
    onProgress(1);
    this.ready = true;
  }

  private buildFloor(): HTMLCanvasElement {
    const [cv, c] = makeCanvas(LW, VIEW_H - GY + 40);
    const h = cv.height;
    const id = this.def.id;
    const top = id === 'industrial' ? '#1b1e26' : id === 'station' ? '#1c2a30' : '#241a2c';
    const bot = id === 'industrial' ? '#07080b' : id === 'station' ? '#071014' : '#0d0814';
    c.fillStyle = vgrad(c, 0, h, [[0, top], [1, bot]]);
    c.fillRect(0, 0, LW, h);
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 2;
    for (let x = 0; x < LW; x += 120) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x - 30, h);
      c.stroke();
    }
    for (let y = 18; y < h; y += 26) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(LW, y);
      c.stroke();
    }
    const rng = mulberry32(99);
    for (let i = 0; i < 26; i++) {
      const px = rng() * LW;
      const col = id === 'industrial' ? 'rgba(255,60,50,0.16)' : id === 'station' ? 'rgba(53,224,255,0.16)' : 'rgba(255,130,40,0.16)';
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(px, 12 + rng() * (h - 24), 40 + rng() * 90, 5 + rng() * 8, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (id === 'temple') {
      c.strokeStyle = 'rgba(255,120,60,0.35)';
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(LW / 2, 60, 80 + i * 40, 0, Math.PI);
        c.stroke();
      }
    }
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(0, 0, LW, 3);
    return cv;
  }

  update(): void {
    for (const n of this.npcs) {
      n.x += n.speed;
      if (n.x < 0) n.x = LW;
      if (n.x > LW) n.x = 0;
    }
    for (const car of this.cars) {
      car.x += car.speed;
      if (car.x < -200) car.x = LW + 100;
      if (car.x > LW + 200) car.x = -100;
    }
    if (this.def.id === 'station') {
      this.nextTrain--;
      if (this.nextTrain <= 0 && this.trainX < -3000) {
        this.trainX = -3200;
        this.nextTrain = 60 * 16;
      }
      if (this.trainX > -3100) {
        this.trainX += 34;
        if (this.trainX > LW + 3300) this.trainX = -4000;
      }
    }
    if (this.def.id === 'industrial' && Math.random() < 0.0016) this.lightning = 1;
    this.lightning *= 0.9;
  }

  private drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, cam: Camera): void {
    const s = 1 + (cam.zoom - 1) * layer.factor * 0.9;
    const cx = VIEW_W / 2 - cam.x * layer.factor * cam.zoom;
    ctx.drawImage(layer.canvas, cx - (LW * s) / 2, cam.groundY - GY * s, LW * s, LH * s);
  }

  private toScreenX(lx: number, factor: number, cam: Camera): number {
    const s = 1 + (cam.zoom - 1) * factor * 0.9;
    const cx = VIEW_W / 2 - cam.x * factor * cam.zoom;
    return cx - (LW * s) / 2 + lx * s;
  }

  drawBackground(ctx: CanvasRenderingContext2D, cam: Camera, t: number, fx: StageFx): void {
    resetTransform(ctx);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!this.ready) return;
    const id = this.def.id;
    this.drawLayer(ctx, this.layers[0], cam);
    this.drawLayer(ctx, this.layers[1], cam);
    if (id === 'industrial') this.drawFarDynamic(ctx, cam, t, fx);
    if (id === 'station') this.drawTrain(ctx, cam, t);
    this.drawLayer(ctx, this.layers[2], cam);
    this.drawMidDynamic(ctx, cam, t, fx);
    this.drawLayer(ctx, this.layers[3], cam);
    this.drawNearDynamic(ctx, cam, t, fx);
    // floor
    if (this.floor) {
      const gy = cam.groundY;
      const s = cam.zoom;
      const fh = this.floor.height * s;
      const fx0 = VIEW_W / 2 - cam.x * s - (LW * s) / 2;
      ctx.drawImage(this.floor, fx0, gy, LW * s, fh);
      if (gy + fh < VIEW_H) {
        ctx.fillStyle = '#05060a';
        ctx.fillRect(0, gy + fh, VIEW_W, VIEW_H - gy - fh);
      }
    }
    if (fx.phase2) {
      ctx.fillStyle = 'rgba(160,10,20,0.16)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.lightning > 0.05) {
      ctx.fillStyle = `rgba(200,210,255,${this.lightning * 0.25})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawFarDynamic(ctx: CanvasRenderingContext2D, cam: Camera, t: number, fx: StageFx): void {
    const f = FACTORS[1];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const lx = 160 + i * 190;
      const on = Math.sin(t * 0.05 + i * 1.7) > 0.2;
      if (!on) continue;
      const sx = this.toScreenX(lx, f, cam);
      const sy = cam.groundY - 560 * (1 + (cam.zoom - 1) * f * 0.9) + (i % 3) * 40;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 24);
      g.addColorStop(0, 'rgba(255,50,50,0.85)');
      g.addColorStop(1, 'rgba(255,50,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 24, sy - 24, 48, 48);
    }
    ctx.restore();
    void fx;
  }

  private drawTrain(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
    if (this.trainX < -3100) return;
    const f = FACTORS[1];
    const sx = this.toScreenX(this.trainX, f, cam);
    const gy = cam.groundY - 10;
    const s = 1 + (cam.zoom - 1) * f * 0.9;
    ctx.fillStyle = '#0c1418';
    ctx.fillRect(sx, gy - 170 * s, 3000 * s, 150 * s);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 9 === 0 ? 'rgba(255,200,120,0.1)' : 'rgba(210,255,255,0.8)';
      ctx.fillRect(sx + (40 + i * 74) * s, gy - 140 * s, 50 * s, 40 * s);
    }
    ctx.fillStyle = 'rgba(53,224,255,0.1)';
    ctx.fillRect(sx, gy - 175 * s, 3000 * s, 6);
    void t;
  }

  private drawMidDynamic(ctx: CanvasRenderingContext2D, cam: Camera, t: number, fx: StageFx): void {
    const id = this.def.id;
    const f = FACTORS[2];
    const s = 1 + (cam.zoom - 1) * f * 0.9;
    if (id === 'industrial') {
      // NPC silhouettes on catwalk
      for (const n of this.npcs) {
        const sx = this.toScreenX(n.x, f, cam);
        const sy = cam.groundY - 190 * s;
        ctx.fillStyle = 'rgba(8,8,12,0.95)';
        const bob = Math.sin(t * 0.2 + n.hue * 10) * 1.5;
        ctx.fillRect(sx - 4 * s, sy - 38 * s + bob, 8 * s, 28 * s);
        ctx.beginPath();
        ctx.arc(sx, sy - 44 * s + bob, 5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(sx - 4 * s, sy - 12 * s, 3 * s, 12 * s);
        ctx.fillRect(sx + 1 * s, sy - 12 * s, 3 * s, 12 * s);
      }
      // cars on far road
      for (const car of this.cars) {
        const sx = this.toScreenX(car.x, f, cam);
        const sy = cam.groundY - 28 * s;
        ctx.fillStyle = '#07080b';
        ctx.fillRect(sx, sy - 14 * s, 60 * s, 14 * s);
        ctx.fillRect(sx + 10 * s, sy - 24 * s, 34 * s, 12 * s);
        ctx.fillStyle = car.speed > 0 ? 'rgba(255,240,200,0.95)' : 'rgba(255,40,40,0.95)';
        ctx.fillRect(car.speed > 0 ? sx + 56 * s : sx, sy - 10 * s, 5 * s, 4 * s);
      }
    } else if (id === 'station') {
      const flick = (Math.sin(t * 0.7) * Math.sin(t * 0.31) > 0.82) ? 0.2 : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const sx = this.toScreenX(180 + i * 400 + 30, f, cam);
        ctx.fillStyle = `rgba(160,255,255,${0.12 * (i === 3 ? flick : 1)})`;
        ctx.fillRect(sx - 80 * s, cam.groundY - 450 * s, 160 * s, 420 * s);
      }
      ctx.restore();
    } else {
      for (let i = 0; i < 2; i++) {
        const bx = (i === 0 ? -700 : 700) + LW / 2;
        const sx = this.toScreenX(bx, FACTORS[3], cam);
        const fs = 1 + (cam.zoom - 1) * FACTORS[3] * 0.9;
        const fl = 0.7 + 0.3 * Math.sin(t * 0.3 + i * 2) + Math.random() * 0.1;
        const gy = cam.groundY - 150 * fs;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(sx, gy, 0, sx, gy, 260 * fs);
        g.addColorStop(0, `rgba(255,150,60,${0.35 * fl})`);
        g.addColorStop(1, 'rgba(255,100,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - 260 * fs, gy - 260 * fs, 520 * fs, 520 * fs);
        ctx.fillStyle = `rgba(255,${160 + 60 * fl},60,0.9)`;
        ctx.beginPath();
        ctx.moveTo(sx - 20 * fs, gy);
        ctx.quadraticCurveTo(sx - 12 * fs, gy - (40 + 20 * fl) * fs, sx, gy - (70 + 30 * fl) * fs);
        ctx.quadraticCurveTo(sx + 14 * fs, gy - 30 * fs, sx + 20 * fs, gy);
        ctx.fill();
        ctx.restore();
      }
    }
    void fx;
  }

  private drawNearDynamic(ctx: CanvasRenderingContext2D, cam: Camera, t: number, fx: StageFx): void {
    if (this.def.id === 'industrial') {
      const f = FACTORS[3];
      const s = 1 + (cam.zoom - 1) * f * 0.9;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const lx = 120 + i * 380;
        const on = Math.sin(t * 0.08 + i * 2.1) > -0.2;
        if (!on) continue;
        const sx = this.toScreenX(lx, f, cam);
        const sy = cam.groundY - 290 * s;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 80 * s);
        g.addColorStop(0, 'rgba(255,50,50,0.7)');
        g.addColorStop(1, 'rgba(255,50,50,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - 80 * s, sy - 80 * s, 160 * s, 160 * s);
      }
      ctx.restore();
    }
    void fx;
  }

  /** Atmospheric overlay (rain, dust, embers) drawn after fighters in screen space. */
  drawForeground(ctx: CanvasRenderingContext2D, cam: Camera, t: number, fx: StageFx): void {
    resetTransform(ctx);
    const id = this.def.id;
    const density = fx.reduced ? 0.4 : fx.quality;
    if (id === 'industrial') {
      ctx.strokeStyle = 'rgba(190,200,230,0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const n = Math.floor(this.rain.length * density);
      for (let i = 0; i < n; i++) {
        const r = this.rain[i];
        if (!fx.reduced) {
          r.y += r.v;
          r.x -= 3;
        }
        if (r.y > VIEW_H) {
          r.y = -20;
          r.x = Math.random() * (VIEW_W + 60);
        }
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2.5, r.y + r.l);
      }
      ctx.stroke();
      // ground splashes
      ctx.fillStyle = 'rgba(190,200,230,0.18)';
      for (let i = 0; i < 14 * density; i++) {
        const px = (i * 97 + t * 7) % VIEW_W;
        ctx.fillRect(px, cam.groundY + 6 + ((i * 53) % 70), 6, 1.5);
      }
    } else if (id === 'station') {
      ctx.fillStyle = 'rgba(200,255,255,0.14)';
      for (let i = 0; i < 40 * density; i++) {
        const px = (i * 131 + t * 0.4 * (1 + (i % 3))) % VIEW_W;
        const py = (i * 71 + Math.sin(t * 0.02 + i) * 20 + 200) % (cam.groundY);
        ctx.fillRect(px, py, 2, 2);
      }
      if (this.trainX > -3100 && this.trainX < LW + 300) {
        ctx.fillStyle = 'rgba(200,255,255,0.05)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    } else {
      ctx.fillStyle = 'rgba(255,140,60,0.7)';
      for (let i = 0; i < 46 * density; i++) {
        const phase = (t * (0.4 + (i % 5) * 0.2) + i * 53) % 700;
        const px = (i * 173 + Math.sin(phase * 0.02 + i) * 30) % VIEW_W;
        const py = VIEW_H - phase;
        ctx.globalAlpha = Math.max(0, 1 - phase / 700) * 0.8;
        ctx.fillRect(px, py, 2.2, 2.2);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Reflection tint colour for the wet-floor effect. */
  get floorAccent(): string {
    return this.def.accent;
  }
}
