import type { Fighter } from '@/combat/Fighter';
import { FighterState } from '@/combat/FighterState';
import { attackTotalFrames } from '@/combat/AttackData';
import type { BodyShape, CharacterPalette } from '@/characters/CharacterConfig';
import { KNOCKDOWN_FRAMES, GETUP_FRAMES, FINISHER_FRAMES } from '@/core/constants';
import { animTime, evaluatePose, type Pose } from './Pose';

export interface AnimState {
  anim: string;
  t: number;
}

/** Picks the animation and normalized time for a fighter's current simulation state. */
export const resolveAnimation = (f: Fighter): AnimState => {
  const a = f.currentAttack;
  switch (f.state) {
    case FighterState.ATTACK:
    case FighterState.SPECIAL:
    case FighterState.GRAB: {
      if (!a) return { anim: 'idle', t: 0 };
      const total = attackTotalFrames(a);
      const frame = f.attackFrame;
      const stanceAir = (a.input.stance ?? 'stand') === 'air';
      // Map startup/active/recovery onto the 0-0.4 / 0.4-0.7 / 0.7-1 pose segments.
      let t: number;
      if (frame < a.startup) t = (frame / Math.max(1, a.startup)) * 0.4;
      else if (frame < a.startup + a.active) t = 0.4 + ((frame - a.startup) / Math.max(1, a.active)) * 0.3;
      else t = 0.7 + ((frame - a.startup - a.active) / Math.max(1, total - a.startup - a.active)) * 0.3;
      if (stanceAir) t = Math.min(1, t);
      return { anim: a.anim, t: Math.min(1, t) };
    }
    case FighterState.THROW: {
      const hold = a?.grab?.holdFrames ?? 30;
      return { anim: a?.anim ?? 'throw', t: 0.2 + Math.min(1, f.grabFrame / hold) * 0.55 };
    }
    case FighterState.WALK: {
      const forward = f.input.x === f.facing;
      const anim = forward ? 'walk' : 'walkBack';
      return { anim, t: animTime(anim, f.stateFrame) };
    }
    case FighterState.CROUCH:
      return { anim: 'crouch', t: animTime('crouch', f.stateFrame) };
    case FighterState.JUMP: {
      const t = f.vy > 6 ? 0.1 : f.vy > 0 ? 0.3 : f.vy > -6 ? 0.6 : 0.9;
      return { anim: 'jump', t };
    }
    case FighterState.BLOCK:
      return { anim: f.wasCrouching ? 'crouchBlock' : 'block', t: 0 };
    case FighterState.BLOCKSTUN:
      return f.wasCrouching ? { anim: 'crouchBlock', t: 0 } : { anim: 'blockstun', t: Math.min(1, f.stateFrame / 10) };
    case FighterState.HIT:
      return f.wasCrouching ? { anim: 'crouchHit', t: Math.min(1, f.stateFrame / Math.max(1, f.stun + f.stateFrame)) } : { anim: 'hit', t: Math.min(1, f.stateFrame / Math.max(6, f.stun + f.stateFrame)) };
    case FighterState.HURT:
      return { anim: 'hurt', t: Math.min(1, f.stateFrame / 30) };
    case FighterState.KNOCKDOWN:
      return { anim: 'knockdown', t: Math.min(1, f.stateFrame / KNOCKDOWN_FRAMES) };
    case FighterState.GETUP:
      return { anim: 'getup', t: Math.min(1, f.stateFrame / GETUP_FRAMES) };
    case FighterState.GRABBED:
      return { anim: 'grabbed', t: 0 };
    case FighterState.DEAD:
      return { anim: 'dead', t: 1 };
    case FighterState.VICTORY:
      return { anim: 'victory', t: Math.min(1, f.stateFrame / 50) };
    case FighterState.DEFEAT:
      return { anim: 'defeat', t: Math.min(1, f.stateFrame / 60) };
    case FighterState.INTRO:
      return Math.abs(f.vx) > 0.5 || f.stateFrame < 110 ? { anim: 'intro', t: animTime('intro', f.stateFrame) } : { anim: 'introStand', t: animTime('introStand', f.stateFrame) };
    case FighterState.FINISHER:
      return { anim: 'finisher', t: Math.min(1, f.stateFrame / FINISHER_FRAMES) };
    case FighterState.FINISHED:
      return { anim: 'finished', t: animTime('finished', f.stateFrame) };
    default:
      return { anim: 'idle', t: animTime('idle', f.stateFrame) };
  }
};

interface Joints {
  hip: [number, number];
  neck: [number, number];
  head: [number, number];
  shoulderF: [number, number];
  elbowF: [number, number];
  handF: [number, number];
  shoulderB: [number, number];
  elbowB: [number, number];
  handB: [number, number];
  kneeF: [number, number];
  footF: [number, number];
  kneeB: [number, number];
  footB: [number, number];
}

/** Computes joint positions (local space: x forward, y up) from a pose and body proportions. */
export const computeJoints = (pose: Pose, body: BodyShape): Joints => {
  const legLen = body.height * 0.47;
  const torsoLen = body.height * 0.34;
  const upperArm = body.height * 0.17;
  const foreArm = body.height * 0.16;
  const thigh = legLen * 0.52;
  const shin = legLen * 0.48;

  const hipY = legLen * pose.hip + pose.dy;
  const hip: [number, number] = [pose.dx, hipY];
  const neck: [number, number] = [hip[0] + Math.sin(pose.lean) * torsoLen, hip[1] + Math.cos(pose.lean) * torsoLen];
  const headDist = body.headRadius * 1.15;
  const headAngle = pose.lean + pose.head;
  const head: [number, number] = [neck[0] + Math.sin(headAngle) * headDist, neck[1] + Math.cos(headAngle) * headDist];

  const limb = (origin: [number, number], a0: number, bend: number, l1: number, l2: number, down: boolean): [[number, number], [number, number]] => {
    // Angles are measured from straight down; forward is +x.
    const ang1 = a0;
    const mid: [number, number] = [origin[0] + Math.sin(ang1) * l1, origin[1] - Math.cos(ang1) * l1];
    const ang2 = ang1 + bend * (down ? -1 : 1);
    const end: [number, number] = [mid[0] + Math.sin(ang2) * l1 * 0 + Math.sin(ang2) * l2, mid[1] - Math.cos(ang2) * l2];
    return [mid, end];
  };

  const shoulderF: [number, number] = [neck[0] + 6, neck[1] - 8];
  const shoulderB: [number, number] = [neck[0] - 6, neck[1] - 6];
  const [elbowF, handF] = limb(shoulderF, pose.armF[0] + pose.lean, pose.armF[1], upperArm, foreArm, false);
  const [elbowB, handB] = limb(shoulderB, pose.armB[0] + pose.lean, pose.armB[1], upperArm, foreArm, false);
  const [kneeF, footF] = limb(hip, pose.legF[0], pose.legF[1], thigh, shin, true);
  const [kneeB, footB] = limb(hip, pose.legB[0], pose.legB[1], thigh, shin, true);
  return { hip, neck, head, shoulderF, elbowF, handF, shoulderB, elbowB, handB, kneeF, footF, kneeB, footB };
};

export interface DrawOptions {
  palette: CharacterPalette;
  body: BodyShape;
  alpha?: number;
  /** Replace all colors with this one (hit flash / afterimage). */
  flat?: string;
  glow?: number;
  phase2?: boolean;
}

const darken = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) * (1 - amount));
  const g = Math.max(0, ((n >> 8) & 255) * (1 - amount));
  const b = Math.max(0, (n & 255) * (1 - amount));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};

/**
 * Draws a fighter in local space. The caller sets the transform so that
 * local (0,0) is the fighter origin, +x faces the opponent and +y points up.
 */
export const drawFighter = (ctx: CanvasRenderingContext2D, pose: Pose, o: DrawOptions): void => {
  const j = computeJoints(pose, o.body);
  const { palette, body } = o;
  const flat = o.flat;
  const lw = body.limbWidth;
  const glow = Math.max(o.glow ?? 0, pose.glow);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const stroke = (a: [number, number], b: [number, number], c: [number, number] | null, width: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    if (c) ctx.lineTo(c[0], c[1]);
    ctx.lineWidth = width + 5;
    ctx.strokeStyle = flat ?? darken(color, 0.55);
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = flat ?? color;
    ctx.stroke();
  };

  const skinOrFlat = flat ?? palette.skin;
  const primary = flat ?? palette.primary;
  const secondary = flat ?? palette.secondary;

  // Back limbs.
  stroke(j.hip, j.kneeB, j.footB, lw * 1.1, darken(palette.primary, 0.25));
  stroke(j.shoulderB, j.elbowB, j.handB, lw, darken(palette.secondary, 0.25));
  // Back hand / foot pads.
  pad(ctx, j.handB, lw * 0.75, flat ?? darken(palette.skin, 0.3));
  boot(ctx, j.footB, lw, flat ?? darken(palette.primary, 0.4));

  // Torso: a tapered quad from hips to shoulders.
  const torsoW = body.torsoWidth * (0.5 + body.bulk * 0.5);
  const hipW = torsoW * 0.72;
  const dir = [j.neck[0] - j.hip[0], j.neck[1] - j.hip[1]];
  const len = Math.hypot(dir[0]!, dir[1]!) || 1;
  const nx = -dir[1]! / len;
  const ny = dir[0]! / len;
  ctx.beginPath();
  ctx.moveTo(j.hip[0] + nx * hipW * 0.5, j.hip[1] + ny * hipW * 0.5);
  ctx.lineTo(j.neck[0] + nx * torsoW * 0.5, j.neck[1] + ny * torsoW * 0.5);
  ctx.lineTo(j.neck[0] - nx * torsoW * 0.5, j.neck[1] - ny * torsoW * 0.5);
  ctx.lineTo(j.hip[0] - nx * hipW * 0.5, j.hip[1] - ny * hipW * 0.5);
  ctx.closePath();
  const grad = ctx.createLinearGradient(j.hip[0] - nx * torsoW, j.hip[1], j.neck[0] + nx * torsoW, j.neck[1]);
  grad.addColorStop(0, flat ?? darken(palette.primary, 0.3));
  grad.addColorStop(0.5, primary);
  grad.addColorStop(1, flat ?? darken(palette.primary, 0.15));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = flat ?? darken(palette.primary, 0.6);
  ctx.stroke();
  // Chest plate / secondary color panel.
  ctx.beginPath();
  ctx.moveTo(j.neck[0] + nx * torsoW * 0.36, j.neck[1] + ny * torsoW * 0.36 - 6);
  ctx.lineTo(j.neck[0] - nx * torsoW * 0.36, j.neck[1] - ny * torsoW * 0.36 - 6);
  ctx.lineTo(j.hip[0] - nx * hipW * 0.3 + dir[0]! * 0.4, j.hip[1] - ny * hipW * 0.3 + dir[1]! * 0.4);
  ctx.lineTo(j.hip[0] + nx * hipW * 0.3 + dir[0]! * 0.4, j.hip[1] + ny * hipW * 0.3 + dir[1]! * 0.4);
  ctx.closePath();
  ctx.fillStyle = secondary;
  ctx.fill();
  // Energy lines.
  if (!flat) {
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = (o.alpha ?? 1) * (0.55 + glow * 0.45);
    ctx.beginPath();
    ctx.moveTo(j.neck[0] + nx * torsoW * 0.2, j.neck[1] - 10);
    ctx.lineTo(j.hip[0] + dir[0]! * 0.5 + nx * 4, j.hip[1] + dir[1]! * 0.5);
    ctx.lineTo(j.hip[0] - nx * hipW * 0.2, j.hip[1] + 4);
    ctx.stroke();
    ctx.globalAlpha = o.alpha ?? 1;
  }
  // Belt.
  ctx.beginPath();
  ctx.moveTo(j.hip[0] + nx * hipW * 0.55, j.hip[1] + ny * hipW * 0.55 + 4);
  ctx.lineTo(j.hip[0] - nx * hipW * 0.55, j.hip[1] - ny * hipW * 0.55 + 4);
  ctx.lineWidth = 6;
  ctx.strokeStyle = flat ?? darken(palette.secondary, 0.4);
  ctx.stroke();

  // Front limbs.
  stroke(j.hip, j.kneeF, j.footF, lw * 1.15, palette.primary);
  boot(ctx, j.footF, lw, flat ?? darken(palette.primary, 0.3));
  // Shoulder pad.
  ctx.beginPath();
  ctx.arc(j.shoulderF[0], j.shoulderF[1], lw * 0.95 * body.bulk, 0, Math.PI * 2);
  ctx.fillStyle = flat ?? palette.secondary;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = flat ?? darken(palette.secondary, 0.5);
  ctx.stroke();
  stroke(j.shoulderF, j.elbowF, j.handF, lw, palette.secondary);
  pad(ctx, j.handF, lw * 0.8, skinOrFlat);
  // Glove accent on the front hand.
  if (!flat) {
    ctx.beginPath();
    ctx.arc(j.handF[0], j.handF[1], lw * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = (o.alpha ?? 1) * (0.5 + glow * 0.5);
    ctx.fill();
    ctx.globalAlpha = o.alpha ?? 1;
  }

  // Head.
  drawHead(ctx, j.head, j.neck, body, palette, flat, pose.lean + pose.head);

  // Glow aura for energy moves.
  if (!flat && glow > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(j.hip[0], j.hip[1] + 30, 10, j.hip[0], j.hip[1] + 30, body.height * 0.7);
    g.addColorStop(0, hexAlpha(palette.glow, 0.28 * glow));
    g.addColorStop(1, hexAlpha(palette.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(j.hip[0], j.hip[1] + 30, body.height * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.phase2 && !flat) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexAlpha(palette.glow, 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(j.head[0], j.head[1], body.headRadius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
};

const pad = (ctx: CanvasRenderingContext2D, p: [number, number], r: number, color: string) => {
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

const boot = (ctx: CanvasRenderingContext2D, p: [number, number], w: number, color: string) => {
  ctx.beginPath();
  ctx.ellipse(p[0] + w * 0.4, p[1] - 2, w * 1.1, w * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

export const hexAlpha = (hex: string, a: number): string => {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const drawHead = (ctx: CanvasRenderingContext2D, head: [number, number], neck: [number, number], body: BodyShape, palette: CharacterPalette, flat: string | undefined, tilt: number) => {
  const r = body.headRadius;
  // Neck.
  ctx.beginPath();
  ctx.moveTo(neck[0], neck[1]);
  ctx.lineTo(head[0], head[1]);
  ctx.lineWidth = r * 0.7;
  ctx.strokeStyle = flat ?? darken(palette.skin, 0.25);
  ctx.stroke();
  ctx.save();
  ctx.translate(head[0], head[1]);
  ctx.rotate(-tilt);
  // The fighter transform flips y (world up = screen up); flip back so head shapes use screen-style y-down coordinates.
  ctx.scale(1, -1);
  switch (body.headStyle) {
    case 'helmet':
    case 'mech':
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.6);
      ctx.lineTo(-r * 0.9, r * 0.9);
      ctx.lineTo(r * 0.9, r * 0.9);
      ctx.lineTo(r * 1.05, -r * 0.5);
      ctx.lineTo(r * 0.6, -r);
      ctx.lineTo(-r * 0.6, -r);
      ctx.closePath();
      ctx.fillStyle = flat ?? palette.secondary;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = flat ?? darken(palette.secondary, 0.6);
      ctx.stroke();
      if (!flat) {
        ctx.fillStyle = palette.accent;
        ctx.fillRect(r * 0.1, -r * 0.1, r * 0.85, r * 0.28);
      }
      break;
    case 'crown':
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = flat ?? palette.skin;
      ctx.fill();
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(i * r * 0.4, -r * 0.6);
        ctx.lineTo(i * r * 0.45, -r * 1.9);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = flat ?? palette.accent;
      ctx.stroke();
      if (!flat) {
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.ellipse(r * 0.35, r * 0.1, r * 0.5, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'hood':
      ctx.beginPath();
      ctx.moveTo(-r * 1.2, -r * 1.1);
      ctx.quadraticCurveTo(-r * 1.3, r * 1.3, 0, r * 1.25);
      ctx.quadraticCurveTo(r * 1.3, r * 1.3, r * 1.1, -r * 1.0);
      ctx.closePath();
      ctx.fillStyle = flat ?? palette.primary;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.15, -r * 0.05, r * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = flat ?? '#07050a';
      ctx.fill();
      if (!flat) {
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.arc(r * 0.35, 0, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'visor':
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = flat ?? palette.skin;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r * 1.02, Math.PI, Math.PI * 2);
      ctx.fillStyle = flat ?? palette.hair;
      ctx.fill();
      if (!flat) {
        ctx.fillStyle = palette.accent;
        ctx.fillRect(-r * 0.2, -r * 0.2, r * 1.2, r * 0.26);
      }
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = flat ?? palette.skin;
      ctx.fill();
      // Short hair cap.
      ctx.beginPath();
      ctx.arc(-r * 0.05, -r * 0.1, r * 1.0, Math.PI * 0.98, Math.PI * 2.02);
      ctx.lineTo(r * 0.9, -r * 0.3);
      ctx.lineTo(-r * 1.0, -r * 0.05);
      ctx.closePath();
      ctx.fillStyle = flat ?? palette.hair;
      ctx.fill();
      if (!flat) {
        // Eyes and a scar across the cheek.
        ctx.fillStyle = '#1a0d0d';
        ctx.fillRect(r * 0.25, -r * 0.1, r * 0.5, r * 0.14);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(r * 0.15, r * 0.15);
        ctx.lineTo(r * 0.5, r * 0.55);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
};

export { evaluatePose };
