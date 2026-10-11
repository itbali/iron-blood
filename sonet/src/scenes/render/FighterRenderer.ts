import type { CharacterDef, Palette } from '../../combat/types';
import type { Fighter } from '../../characters/Fighter';
import type { FinisherRun } from '../../game/FightSim';
import { poseFor } from './PoseSystem';
import type { Pose } from './poses';

export interface Vec {
  x: number;
  y: number;
}

export interface Skeleton {
  hip: Vec;
  shoulder: Vec;
  neck: Vec;
  head: Vec;
  elbowF: Vec;
  handF: Vec;
  elbowB: Vec;
  handB: Vec;
  kneeF: Vec;
  footF: Vec;
  toeF: Vec;
  kneeB: Vec;
  footB: Vec;
  toeB: Vec;
  torsoAngle: number;
  headR: number;
}

export interface Dims {
  thigh: number;
  shin: number;
  torso: number;
  neck: number;
  headR: number;
  upper: number;
  fore: number;
  foot: number;
  s: number;
  bulk: number;
}

export function dimsFor(def: CharacterDef): Dims {
  const s = def.style.scale;
  return { thigh: 60 * s, shin: 58 * s, torso: 74 * s, neck: 8 * s, headR: 17 * s, upper: 40 * s, fore: 38 * s, foot: 22 * s, s, bulk: def.style.bulk };
}

const rot = (p: Vec, c: Vec, a: number): Vec => {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return { x: c.x + dx * cs + dy * sn, y: c.y - dx * sn + dy * cs };
};

export function computeSkeleton(pose: Pose, d: Dims): Skeleton {
  const hip: Vec = { x: 0, y: 0 };
  const t = pose.torso;
  const shoulder: Vec = { x: hip.x + d.torso * Math.sin(t), y: hip.y + d.torso * Math.cos(t) };
  const neck: Vec = { x: shoulder.x + d.neck * Math.sin(t + pose.head * 0.5), y: shoulder.y + d.neck * Math.cos(t + pose.head * 0.5) };
  const ha = t + pose.head;
  const head: Vec = { x: neck.x + d.headR * 0.9 * Math.sin(ha), y: neck.y + d.headR * 0.9 * Math.cos(ha) };
  const arm = (a: [number, number]): [Vec, Vec] => {
    const e: Vec = { x: shoulder.x + d.upper * Math.sin(a[0]), y: shoulder.y - d.upper * Math.cos(a[0]) };
    const f = a[0] + a[1];
    return [e, { x: e.x + d.fore * Math.sin(f), y: e.y - d.fore * Math.cos(f) }];
  };
  const leg = (l: [number, number], off: number): [Vec, Vec, Vec] => {
    const h: Vec = { x: hip.x + off, y: hip.y };
    const k: Vec = { x: h.x + d.thigh * Math.sin(l[0]), y: h.y - d.thigh * Math.cos(l[0]) };
    const sa = l[0] - l[1];
    const foot: Vec = { x: k.x + d.shin * Math.sin(sa), y: k.y - d.shin * Math.cos(sa) };
    return [k, foot, { x: foot.x + d.foot * 0.85, y: foot.y - 2 }];
  };
  const [elbowF, handF] = arm(pose.armF);
  const [elbowB, handB] = arm(pose.armB);
  const [kneeF, footF, toeF] = leg(pose.legF, 3 * d.s);
  const [kneeB, footB, toeB] = leg(pose.legB, -3 * d.s);
  const pts = { hip, shoulder, neck, head, elbowF, handF, elbowB, handB, kneeF, footF, toeF, kneeB, footB, toeB };
  const sk = { ...pts, torsoAngle: t, headR: d.headR } as Skeleton;
  if (pose.rot !== 0) {
    for (const k of Object.keys(pts) as (keyof typeof pts)[]) sk[k] = rot(sk[k], hip, pose.rot);
    sk.torsoAngle = t - pose.rot;
  }
  let shiftY: number;
  if (pose.air) {
    shiftY = (d.thigh + d.shin) * 0.93 - sk.hip.y;
  } else {
    const pad = 6 * d.s;
    const low = Math.min(
      sk.footF.y - pad, sk.toeF.y - pad, sk.footB.y - pad, sk.toeB.y - pad, sk.handF.y - pad, sk.handB.y - pad,
      sk.head.y - d.headR, sk.kneeF.y - pad, sk.kneeB.y - pad, sk.hip.y - 10 * d.s, sk.shoulder.y - 10 * d.s,
    );
    shiftY = -low;
  }
  for (const k of Object.keys(pts) as (keyof typeof pts)[]) {
    sk[k] = { x: sk[k].x + pose.dx, y: sk[k].y + shiftY + pose.dy };
  }
  return sk;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export function resolvePalette(def: CharacterDef, skinId: string): Palette {
  const skin = def.skins.find((s) => s.id === skinId);
  return { ...def.style.palette, ...(skin?.palette ?? {}) };
}

export interface RenderedFighter {
  canvas: HTMLCanvasElement;
  anchorX: number;
  anchorY: number;
  scale: number;
  skeleton: Skeleton;
  alpha: number;
}

const MIN_SIZE = 512;
const MAX_SIZE = 4096;

/** Draws fighters procedurally into an offscreen canvas. Knows nothing about combat rules. */
export class FighterRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private size = MIN_SIZE;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = MIN_SIZE;
    this.canvas.height = MIN_SIZE;
    const c = this.canvas.getContext('2d');
    if (!c) throw new Error('2D canvas unavailable');
    this.ctx = c;
  }

  /** The buffer must hold the whole figure at the current zoom, or close-ups on large screens crop the upper body. */
  private ensureSize(height: number, zoom: number): void {
    const need = Math.ceil(((height * 1.6 + 120) * zoom) / 128) * 128;
    const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, need));
    if (size > this.size || size < this.size / 2) {
      this.size = size;
      this.canvas.width = size;
      this.canvas.height = size;
    }
  }

  render(f: Fighter, run: FinisherRun | null, zoom: number, time: number, flashColor: string | null): RenderedFighter {
    const { pose, alpha, shake } = poseFor(f, run);
    this.ensureSize(f.def.height, zoom);
    const SIZE = this.size;
    const d = dimsFor(f.def);
    const sk = computeSkeleton(pose, d);
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const anchorX = SIZE / 2;
    const anchorY = SIZE - Math.round(60 * Math.max(1, zoom));
    const jx = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    ctx.setTransform(zoom * f.facing, 0, 0, -zoom, anchorX + jx * zoom, anchorY);
    const pal = resolvePalette(f.def, f.skin);
    drawBody(ctx, f, sk, pose, d, pal, time);
    if (flashColor) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    return { canvas: this.canvas, anchorX, anchorY, scale: zoom, skeleton: sk, alpha };
  }
}

function limb(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, w: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function glowLine(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, w: number, color: string): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.28;
  limb(ctx, a, b, w * 3.2, color);
  ctx.globalAlpha = 0.95;
  ctx.globalCompositeOperation = 'source-over';
  limb(ctx, a, b, w, color);
  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, p: Vec, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx: CanvasRenderingContext2D, pts: Vec[], color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

const lerpV = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function drawBody(ctx: CanvasRenderingContext2D, f: Fighter, sk: Skeleton, pose: Pose, d: Dims, pal: Palette, time: number): void {
  const body = f.def.style.body;
  const s = d.s;
  const bulk = d.bulk;
  const thick = (v: number): number => v * s * bulk;
  const bare = body === 'brute';
  const legColor = bare ? shade(pal.cloth, 1.0) : pal.cloth;
  const legDark = shade(pal.cloth, 0.62);
  const skinDark = shade(pal.skin, 0.72);

  if (f.def.style.cape) drawCape(ctx, f, sk, pal, d, time);

  // back arm + back leg
  const armBCol = bare ? skinDark : shade(pal.cloth, 0.7);
  limb(ctx, sk.shoulder, sk.elbowB, thick(11), armBCol);
  limb(ctx, sk.elbowB, sk.handB, thick(11.5), body === 'brute' ? skinDark : shade(pal.armor, 0.7));
  circle(ctx, sk.handB, thick(8), shade(pal.armorLight, 0.7));
  limb(ctx, { x: sk.hip.x - 3 * s, y: sk.hip.y }, sk.kneeB, thick(15), legDark);
  limb(ctx, sk.kneeB, sk.footB, thick(13), legDark);
  limb(ctx, sk.footB, sk.toeB, thick(9), shade(pal.armor, 0.6));

  drawTorso(ctx, f, sk, pal, d, time);

  // head
  drawHead(ctx, f, sk, pal, d, time);

  // front leg
  const hipF: Vec = { x: sk.hip.x + 3 * s, y: sk.hip.y };
  limb(ctx, hipF, sk.kneeF, thick(16), legColor);
  limb(ctx, sk.kneeF, sk.footF, thick(14), legColor);
  circle(ctx, sk.kneeF, thick(8.5), pal.armor);
  limb(ctx, lerpV(sk.kneeF, sk.footF, 0.55), sk.footF, thick(15), pal.armor);
  limb(ctx, sk.footF, sk.toeF, thick(10), pal.armorLight);
  if (body === 'tactical' || body === 'cyber' || body === 'monk') {
    glowLine(ctx, lerpV(hipF, sk.kneeF, 0.2), lerpV(hipF, sk.kneeF, 0.8), 1.8 * s, pal.glow);
  }

  // front arm
  limb(ctx, sk.shoulder, sk.elbowF, thick(12), bare ? pal.skin : pal.cloth);
  circle(ctx, sk.shoulder, thick(11), pal.armor);
  limb(ctx, sk.elbowF, sk.handF, thick(13), bare ? pal.skin : pal.armor);
  limb(ctx, lerpV(sk.elbowF, sk.handF, 0.5), sk.handF, thick(14.5), body === 'monk' ? pal.accent : pal.armorLight);
  circle(ctx, sk.handF, thick(9), pal.armorLight);
  glowLine(ctx, lerpV(sk.elbowF, sk.handF, 0.15), lerpV(sk.elbowF, sk.handF, 0.8), 1.8 * s, pal.glow);

  drawWeapon(ctx, f, sk, pal, d, pose);
}

function drawWeapon(ctx: CanvasRenderingContext2D, f: Fighter, sk: Skeleton, pal: Palette, d: Dims, pose: Pose): void {
  const m = f.move;
  const striking = !!m && f.isAttacking && f.curFrame >= m.attack.startup - 3 && f.curFrame < m.attack.startup + m.attack.active + 4;
  const body = f.def.style.body;
  void pose;
  if (body === 'tactical' && f.isAttacking) {
    const dirx = sk.handF.x - sk.elbowF.x;
    const diry = sk.handF.y - sk.elbowF.y;
    const len = Math.hypot(dirx, diry) || 1;
    const bl = (striking ? 52 : 26) * d.s;
    const tip = { x: sk.handF.x + (dirx / len) * bl, y: sk.handF.y + (diry / len) * bl };
    glowLine(ctx, sk.handF, tip, 3.2 * d.s, pal.glow);
    const dirxB = sk.handB.x - sk.elbowB.x;
    const diryB = sk.handB.y - sk.elbowB.y;
    const lenB = Math.hypot(dirxB, diryB) || 1;
    glowLine(ctx, sk.handB, { x: sk.handB.x + (dirxB / lenB) * bl * 0.8, y: sk.handB.y + (diryB / lenB) * bl * 0.8 }, 2.6 * d.s, pal.glow);
  } else if (body === 'wraith' && f.isAttacking && striking) {
    const dirx = sk.handF.x - sk.elbowF.x;
    const diry = sk.handF.y - sk.elbowF.y;
    const len = Math.hypot(dirx, diry) || 1;
    const tip = { x: sk.handF.x + (dirx / len) * 60 * d.s, y: sk.handF.y + (diry / len) * 60 * d.s };
    glowLine(ctx, sk.handF, tip, 3 * d.s, pal.glow);
    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 3 * d.s;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 20 * d.s, Math.atan2(diry, dirx) - 1.2, Math.atan2(diry, dirx) + 1.2);
    ctx.stroke();
  } else if (body === 'cyber' && f.isAttacking && striking) {
    glowLine(ctx, sk.handF, { x: sk.handF.x + (sk.handF.x - sk.elbowF.x) * 1.6, y: sk.handF.y + (sk.handF.y - sk.elbowF.y) * 1.6 }, 1.6 * d.s, pal.glow);
  } else if ((body === 'mech' || body === 'archon' || body === 'monk') && f.isAttacking && striking) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    circle(ctx, sk.handF, 20 * d.s, pal.glow);
    ctx.restore();
  }
}

function drawCape(ctx: CanvasRenderingContext2D, f: Fighter, sk: Skeleton, pal: Palette, d: Dims, time: number): void {
  const wave = Math.sin(time * 0.08 + f.slot) * 6 * d.s;
  const drift = -f.vx * 3 * f.facing;
  const base = sk.shoulder;
  const len = (f.def.style.body === 'archon' ? 150 : 120) * d.s;
  const back = { x: base.x - 18 * d.s, y: base.y + 4 * d.s };
  const tipY = Math.max(6, base.y - len);
  const pts: Vec[] = [
    { x: base.x + 2 * d.s, y: base.y + 2 },
    back,
    { x: back.x - 12 * d.s + wave + drift, y: (back.y + tipY) / 2 },
    { x: back.x - 26 * d.s + wave * 1.5 + drift * 1.5, y: tipY },
    { x: back.x + 10 * d.s + wave * 0.6 + drift, y: tipY + 10 },
    { x: base.x - 4 * d.s, y: sk.hip.y + 6 },
  ];
  poly(ctx, pts, shade(pal.clothDark, 0.9));
  ctx.strokeStyle = shade(pal.accent, 0.5);
  ctx.lineWidth = 1.5 * d.s;
  ctx.beginPath();
  ctx.moveTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.stroke();
}

function drawTorso(ctx: CanvasRenderingContext2D, f: Fighter, sk: Skeleton, pal: Palette, d: Dims, time: number): void {
  const body = f.def.style.body;
  const s = d.s;
  const bulk = d.bulk;
  const ang = sk.torsoAngle + (0);
  // torso axis from hip to shoulder, using actual points to honor body rotation
  const ax = sk.shoulder.x - sk.hip.x;
  const ay = sk.shoulder.y - sk.hip.y;
  const len = Math.hypot(ax, ay) || 1;
  const ux = ax / len;
  const uy = ay / len;
  const nx = uy;
  const ny = -ux;
  void ang;
  const wf = (body === 'brute' ? 34 : body === 'mech' || body === 'archon' ? 32 : body === 'cyber' ? 15 : 20) * s * (body === 'brute' ? 1 : Math.min(1.2, bulk));
  const wb = wf * 0.75;
  const ww = wf * 0.62;
  const P = (t: number, side: number, w: number): Vec => ({
    x: sk.hip.x + ax * t + nx * side * w,
    y: sk.hip.y + ay * t + ny * side * w,
  });
  const shoulderWF = wf * 1.05;
  const shoulderWB = wb;
  const torso: Vec[] = [P(0, 1, ww), P(0.55, 1, wf * 0.9), P(1, 1, shoulderWF), P(1, -1, shoulderWB), P(0.55, -1, wb * 0.9), P(0, -1, ww * 0.9)];
  const torsoColor = body === 'brute' ? pal.skin : body === 'monk' ? pal.cloth : pal.cloth;
  poly(ctx, torso, torsoColor);
  // shading
  ctx.save();
  ctx.globalAlpha = 0.28;
  poly(ctx, [P(0, -1, ww * 0.9), P(0.55, -1, wb * 0.9), P(1, -1, shoulderWB), P(1, -0.1, shoulderWB * 0.2), P(0, -0.1, ww * 0.2)], '#000');
  ctx.restore();

  switch (body) {
    case 'tactical': {
      poly(ctx, [P(0.3, 1, wf * 0.95), P(1, 1, shoulderWF * 1.02), P(1, -0.2, shoulderWF * 0.6), P(0.3, -0.2, wf * 0.5)], pal.armor);
      glowLine(ctx, P(0.4, 0.55, wf), P(0.92, 0.45, wf), 2 * s, pal.glow);
      glowLine(ctx, P(0.3, 0.1, wf), P(0.85, 0.1, wf), 1.5 * s, pal.glow);
      poly(ctx, [P(0.02, 1, ww * 1.05), P(0.14, 1, ww * 1.05), P(0.14, -1, ww * 0.9), P(0.02, -1, ww * 0.9)], pal.armorLight);
      break;
    }
    case 'cyber': {
      glowLine(ctx, P(0.2, 0.6, wf), P(0.9, 0.5, wf), 1.6 * s, pal.glow);
      glowLine(ctx, P(0.15, -0.5, wb), P(0.85, -0.4, wb), 1.2 * s, pal.glow);
      poly(ctx, [P(0.55, 1, wf * 0.92), P(1, 1, shoulderWF), P(1, 0.1, shoulderWF * 0.3), P(0.55, 0.1, wf * 0.3)], pal.armor);
      break;
    }
    case 'brute': {
      poly(ctx, [P(0.05, 1, ww), P(0.5, 1, wf * 0.95), P(0.5, -0.3, wf * 0.2), P(0.05, -0.3, ww * 0.2)], shade(pal.skin, 0.9));
      ctx.strokeStyle = shade(pal.cloth, 0.8);
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(P(1, 0.9, wf).x, P(1, 0.9, wf).y);
      ctx.lineTo(P(0.15, -0.6, wf).x, P(0.15, -0.6, wf).y);
      ctx.stroke();
      poly(ctx, [P(0, 1, ww), P(0.18, 1, ww), P(0.18, -1, ww * 0.9), P(0, -1, ww * 0.9)], pal.armor);
      circle(ctx, P(0.7, 0.2, wf), 3 * s, shade(pal.skin, 0.55));
      circle(ctx, P(0.45, 0.6, wf), 2.5 * s, shade(pal.skin, 0.55));
      glowLine(ctx, P(0.4, 0.3, wf), P(0.65, 0.35, wf), 1.4 * s, pal.glow);
      break;
    }
    case 'monk': {
      poly(ctx, [P(0, 1, ww * 1.4), P(0.08, 1, ww * 1.4), P(0.08, -1, ww * 1.2), P(0, -1, ww * 1.2)], pal.accent);
      poly(ctx, [P(0.55, 1, wf), P(1, 1, shoulderWF), P(1, -0.05, shoulderWF * 0.3), P(0.55, -0.05, wf * 0.35)], shade(pal.cloth, 1.18));
      glowLine(ctx, P(0.3, 0.75, wf), P(0.95, 0.62, wf), 1.4 * s, pal.glow);
      break;
    }
    case 'wraith': {
      const hem = [P(0, 1, ww * 1.4), P(-0.3, 0.9, wf * 1.2 + Math.sin(time * 0.1) * 3), P(-0.35, -0.8, wf), P(0, -1, ww)];
      poly(ctx, hem, pal.clothDark);
      glowLine(ctx, P(0.2, 0.5, wf), P(0.85, 0.4, wf), 1.6 * s, pal.glow);
      break;
    }
    case 'mech': {
      poly(ctx, [P(0.1, 1, wf * 0.98), P(1, 1, shoulderWF), P(1, -1, shoulderWB), P(0.1, -1, wb)], pal.armor);
      poly(ctx, [P(0.35, 0.9, wf), P(0.9, 0.9, shoulderWF * 0.95), P(0.9, -0.2, shoulderWF * 0.3), P(0.35, -0.2, wf * 0.3)], pal.armorLight);
      glowLine(ctx, P(0.15, 0.95, wf), P(0.15, -0.95, wf), 2.2 * s, pal.glow);
      circle(ctx, P(0.62, 0.4, wf), 5 * s, pal.glow);
      break;
    }
    case 'archon': {
      poly(ctx, [P(0.05, 1, wf), P(1, 1, shoulderWF * 1.05), P(1, -1, shoulderWB), P(0.05, -1, wb)], pal.armor);
      poly(ctx, [P(0.3, 0.95, wf), P(0.95, 0.95, shoulderWF), P(0.95, -0.1, shoulderWF * 0.3), P(0.3, -0.1, wf * 0.3)], pal.armorLight);
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.15);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.globalCompositeOperation = 'lighter';
      circle(ctx, P(0.58, 0.35, wf), 12 * s, pal.glow);
      ctx.restore();
      circle(ctx, P(0.58, 0.35, wf), 5 * s, '#fff');
      poly(ctx, [P(1, 1, shoulderWF * 1.25), P(1.18, 1.2, shoulderWF * 1.4), P(0.9, 0.7, shoulderWF)], pal.accent);
      break;
    }
  }
  // shoulder pad back
  circle(ctx, sk.shoulder, 10 * s * bulk * 0.9, shade(pal.armor, 0.8));
}

function drawHead(ctx: CanvasRenderingContext2D, f: Fighter, sk: Skeleton, pal: Palette, d: Dims, time: number): void {
  const style = f.def.style;
  const s = d.s;
  const r = d.headR;
  const h = sk.head;
  // neck
  limb(ctx, sk.shoulder, sk.neck, 9 * s * Math.min(1.5, d.bulk), shade(pal.skin, 0.85));
  const headAng = Math.atan2(h.y - sk.neck.y, h.x - sk.neck.x);
  const tilt = headAng - Math.PI / 2; // 0 when upright
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(tilt);
  const faceColor = style.head === 'helmet' ? shade(pal.armor, 1.0) : style.head === 'hood' ? shade(pal.clothDark, 1) : pal.skin;
  // head shape
  ctx.fillStyle = faceColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2);
  ctx.fill();
  switch (style.head) {
    case 'short-hair': {
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.ellipse(-r * 0.05, r * 0.25, r * 1.0, r * 0.85, 0, Math.PI * 1.02, Math.PI * 2.0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.2);
      ctx.lineTo(-r * 0.4, -r * 0.1);
      ctx.lineTo(-r * 0.5, r * 0.7);
      ctx.fill();
      break;
    }
    case 'bald':
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, r * 0.45, r * 0.4, r * 0.25, -0.4, 0, Math.PI * 2);
      ctx.fill();
      if (f.def.style.body === 'monk') {
        ctx.fillStyle = pal.accent;
        ctx.fillRect(-r * 0.98, r * 0.12, r * 1.96, r * 0.28);
      }
      break;
    case 'visor': {
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, r * 0.2, r * 1.05, r * 0.95, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.1);
      ctx.quadraticCurveTo(-r * 2.2 + Math.sin(time * 0.1) * 3, -r * 0.2, -r * 1.7, -r * 1.2);
      ctx.lineTo(-r * 0.6, -r * 0.3);
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.globalAlpha = 0.95;
      ctx.fillRect(-r * 0.15, r * 0.02, r * 1.2, r * 0.32);
      ctx.globalAlpha = 1;
      break;
    }
    case 'mask': {
      ctx.fillStyle = pal.armorLight;
      ctx.fillRect(-r * 0.2, -r * 0.7, r * 1.2, r * 1.3);
      break;
    }
    case 'hood': {
      ctx.fillStyle = pal.clothDark;
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, 0, r * 1.2, r * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.ellipse(r * 0.25, 0, r * 0.7, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.eye;
      ctx.globalAlpha = 0.95;
      ctx.fillRect(r * 0.25, r * 0.12, r * 0.3, r * 0.16);
      ctx.fillRect(r * 0.62, r * 0.12, r * 0.22, r * 0.16);
      ctx.globalAlpha = 1;
      break;
    }
    case 'helmet': {
      ctx.fillStyle = pal.armor;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0b0e';
      ctx.fillRect(-r * 0.05, r * 0.05, r * 1.1, r * 0.34);
      ctx.fillStyle = pal.eye;
      ctx.fillRect(r * 0.2, r * 0.12, r * 0.8, r * 0.16);
      ctx.fillStyle = pal.armorLight;
      ctx.fillRect(-r * 0.6, r * 0.7, r * 1.0, r * 0.2);
      break;
    }
    case 'crown': {
      ctx.fillStyle = pal.armor;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.accent;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.4 - r * 0.15, r * 0.8);
        ctx.lineTo(i * r * 0.4, r * (1.7 - Math.abs(i) * 0.2));
        ctx.lineTo(i * r * 0.4 + r * 0.15, r * 0.8);
        ctx.fill();
      }
      ctx.fillStyle = '#0a0508';
      ctx.fillRect(-r * 0.05, r * 0.0, r * 1.1, r * 0.3);
      ctx.fillStyle = pal.eye;
      ctx.fillRect(r * 0.2, r * 0.07, r * 0.8, r * 0.14);
      break;
    }
  }
  // face details
  if (style.head === 'short-hair' || style.head === 'bald') {
    ctx.fillStyle = shade(pal.skin, 0.55);
    ctx.fillRect(r * 0.12, r * 0.0, r * 0.62, r * 0.1);
    ctx.fillStyle = pal.eye;
    ctx.fillRect(r * 0.32, r * 0.04, r * 0.36, r * 0.1);
    ctx.fillStyle = shade(pal.skin, 0.6);
    ctx.fillRect(r * 0.2, -r * 0.45, r * 0.55, r * 0.07);
    if (style.scar) {
      ctx.strokeStyle = '#8a1c1c';
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, r * 0.45);
      ctx.lineTo(r * 0.3, -r * 0.35);
      ctx.stroke();
    }
    if (f.def.style.body === 'brute') {
      ctx.fillStyle = shade(pal.skin, 0.7);
      ctx.fillRect(r * 0.1, -r * 0.7, r * 0.9, r * 0.35);
    }
  }
  ctx.restore();
}
