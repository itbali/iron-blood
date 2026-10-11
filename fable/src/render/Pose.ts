/**
 * Procedural skeletal animation. A Pose is a small set of joint angles; animations are
 * keyframe lists interpolated by normalized time. Angles: 0 = limb hanging down,
 * positive = rotated forward (toward facing). Knee/elbow bends are relative to the parent bone.
 */
export interface Pose {
  /** Hip height as a fraction of the standing leg length. */
  hip: number;
  /** Torso lean, radians, positive forward. */
  lean: number;
  head: number;
  /** [shoulder angle, elbow bend] for the leading arm. */
  armF: [number, number];
  armB: [number, number];
  /** [hip angle, knee bend] for the leading leg. */
  legF: [number, number];
  legB: [number, number];
  /** Whole-body offset in local units (forward, up). */
  dx: number;
  dy: number;
  /** Extra glow intensity 0..1 (energy moves). */
  glow: number;
}

export type Keyframe = [number, Partial<Pose>];

const BASE: Pose = { hip: 1, lean: 0.05, head: 0, armF: [0.5, 1.9], armB: [0.35, 1.7], legF: [0.25, -0.2], legB: [-0.3, 0.25], dx: 0, dy: 0, glow: 0 };

const GUARD: Partial<Pose> = { armF: [0.6, 2.0], armB: [0.4, 1.8] };
const PUNCH_WIND: Partial<Pose> = { lean: -0.1, armF: [-0.3, 2.3], armB: [0.5, 2], legF: [0.3, -0.3], legB: [-0.35, 0.3] };
const PUNCH_HIT: Partial<Pose> = { lean: 0.25, armF: [1.65, 0.05], armB: [0.2, 2.1], legF: [0.55, -0.4], legB: [-0.45, 0.2], dx: 10 };
const HEAVY_WIND: Partial<Pose> = { lean: -0.2, armF: [-0.9, 2.6], armB: [0.6, 1.8], legF: [0.2, -0.2], legB: [-0.4, 0.4], dx: -8 };
const HEAVY_HIT: Partial<Pose> = { lean: 0.4, armF: [1.75, 0], armB: [-0.3, 1.6], legF: [0.7, -0.5], legB: [-0.5, 0.1], dx: 22 };
const KICK_WIND: Partial<Pose> = { lean: -0.15, legF: [-0.4, 1.5], legB: [0.05, 0], armF: [0.3, 2.2], armB: [-0.4, 1.5], hip: 1 };
const KICK_HIT: Partial<Pose> = { lean: -0.25, legF: [1.4, 0.05], legB: [0.1, 0.05], armF: [-0.2, 1.4], armB: [0.8, 1.6], hip: 1.02, dx: 6 };
const HKICK_HIT: Partial<Pose> = { lean: -0.45, legF: [1.9, 0.0], legB: [0.15, 0.1], armF: [-0.5, 1.2], armB: [1.0, 1.4], hip: 1.05, dx: 12 };
const CROUCH: Partial<Pose> = { hip: 0.55, lean: 0.35, armF: [0.7, 2.1], armB: [0.5, 1.9], legF: [1.3, -2.1], legB: [-0.2, 2.2] };
const BLOCK: Partial<Pose> = { lean: -0.05, armF: [1.0, 2.5], armB: [0.9, 2.4], legF: [0.2, -0.2], legB: [-0.4, 0.3], dx: -4 };
const HIT: Partial<Pose> = { lean: -0.35, head: -0.4, armF: [0.9, 1.2], armB: [-0.6, 1.0], legF: [0.3, -0.3], legB: [-0.5, 0.4], dx: -10 };
const HURT_AIR: Partial<Pose> = { lean: -0.9, head: -0.5, armF: [1.6, 0.6], armB: [-1.2, 0.5], legF: [0.9, -0.8], legB: [-0.6, 0.9], hip: 1 };
const DOWN: Partial<Pose> = { hip: 0.12, lean: -1.5, head: 0.2, armF: [1.8, 0.4], armB: [1.2, 0.2], legF: [1.65, -0.1], legB: [1.55, 0.2], dx: -30 };
const JUMP: Partial<Pose> = { lean: -0.05, armF: [0.9, 1.6], armB: [-0.5, 1.2], legF: [0.8, -1.3], legB: [-0.3, 1.2], hip: 1 };
const FALL: Partial<Pose> = { lean: 0.1, armF: [0.6, 1.3], armB: [-0.3, 1.1], legF: [0.5, -0.7], legB: [-0.1, 0.6], hip: 1 };
const VICTORY: Partial<Pose> = { lean: -0.1, armF: [3.0, 0.3], armB: [0.2, 1.6], legF: [0.2, -0.2], legB: [-0.3, 0.2] };
const DEFEAT: Partial<Pose> = { hip: 0.5, lean: 0.8, head: 0.5, armF: [0.8, 0.2], armB: [0.6, 0.2], legF: [1.3, -2.2], legB: [-0.3, 2.3] };

export const ANIMATIONS: Record<string, { loop: boolean; period?: number; frames: Keyframe[] }> = {
  idle: {
    loop: true,
    period: 70,
    frames: [
      [0, { ...GUARD, hip: 0.985 }],
      [0.5, { ...GUARD, hip: 1, armF: [0.55, 1.95], armB: [0.38, 1.75] }],
      [1, { ...GUARD, hip: 0.985 }],
    ],
  },
  walk: {
    loop: true,
    period: 36,
    frames: [
      [0, { ...GUARD, legF: [0.6, -0.4], legB: [-0.5, 0.5], hip: 0.98, lean: 0.1 }],
      [0.25, { ...GUARD, legF: [0.1, -0.7], legB: [-0.1, 0.1], hip: 1.0, lean: 0.12 }],
      [0.5, { ...GUARD, legF: [-0.5, -0.1], legB: [0.6, 0.6], hip: 0.98, lean: 0.1 }],
      [0.75, { ...GUARD, legF: [-0.1, -0.1], legB: [0.1, 0.9], hip: 1.0, lean: 0.12 }],
      [1, { ...GUARD, legF: [0.6, -0.4], legB: [-0.5, 0.5], hip: 0.98, lean: 0.1 }],
    ],
  },
  walkBack: {
    loop: true,
    period: 40,
    frames: [
      [0, { ...GUARD, legF: [-0.5, -0.2], legB: [0.5, 0.4], hip: 0.98, lean: -0.05 }],
      [0.5, { ...GUARD, legF: [0.5, -0.5], legB: [-0.5, 0.6], hip: 0.98, lean: -0.05 }],
      [1, { ...GUARD, legF: [-0.5, -0.2], legB: [0.5, 0.4], hip: 0.98, lean: -0.05 }],
    ],
  },
  crouch: { loop: true, period: 60, frames: [[0, CROUCH], [0.5, { ...CROUCH, hip: 0.57 }], [1, CROUCH]] },
  jump: { loop: false, frames: [[0, { ...JUMP, hip: 0.9 }], [0.3, JUMP], [0.6, FALL], [1, FALL]] },
  block: { loop: false, frames: [[0, BLOCK], [1, BLOCK]] },
  crouchBlock: { loop: false, frames: [[0, { ...CROUCH, armF: [1.1, 2.4], armB: [0.9, 2.3] }], [1, { ...CROUCH, armF: [1.1, 2.4], armB: [0.9, 2.3] }]] },
  blockstun: { loop: false, frames: [[0, { ...BLOCK, dx: -16, lean: -0.15 }], [1, BLOCK]] },
  hit: { loop: false, frames: [[0, HIT], [0.6, { ...HIT, dx: -14, lean: -0.45 }], [1, GUARD]] },
  crouchHit: { loop: false, frames: [[0, { ...CROUCH, lean: -0.2, head: -0.4, dx: -8 }], [1, CROUCH]] },
  hurt: { loop: false, frames: [[0, HURT_AIR], [1, { ...HURT_AIR, lean: -1.2 }]] },
  knockdown: { loop: false, frames: [[0, { ...DOWN, hip: 0.25 }], [0.3, DOWN], [1, DOWN]] },
  getup: { loop: false, frames: [[0, DOWN], [0.5, { ...CROUCH, lean: 0.5 }], [1, GUARD]] },
  dead: { loop: false, frames: [[0, DOWN], [1, DOWN]] },
  grabbed: { loop: false, frames: [[0, { ...HIT, hip: 0.95, dx: 0 }], [1, { ...HIT, hip: 0.95, dx: 0 }]] },
  victory: { loop: false, frames: [[0, GUARD], [0.3, { ...VICTORY, hip: 0.95 }], [0.5, { ...VICTORY, hip: 1.03 }], [1, VICTORY]] },
  defeat: { loop: false, frames: [[0, GUARD], [0.5, DEFEAT], [1, { ...DEFEAT, head: 0.7 }]] },
  intro: {
    loop: true,
    period: 44,
    frames: [
      [0, { armF: [0.2, 0.5], armB: [-0.2, 0.4], legF: [0.5, -0.4], legB: [-0.4, 0.5], hip: 0.98, lean: 0.08 }],
      [0.5, { armF: [-0.2, 0.4], armB: [0.2, 0.5], legF: [-0.4, -0.1], legB: [0.5, 0.7], hip: 0.98, lean: 0.08 }],
      [1, { armF: [0.2, 0.5], armB: [-0.2, 0.4], legF: [0.5, -0.4], legB: [-0.4, 0.5], hip: 0.98, lean: 0.08 }],
    ],
  },
  introStand: { loop: true, period: 90, frames: [[0, { ...GUARD, armF: [0.3, 0.7], armB: [0.2, 0.6] }], [0.5, { ...GUARD, armF: [0.35, 0.8], armB: [0.25, 0.65], hip: 0.99 }], [1, { ...GUARD, armF: [0.3, 0.7], armB: [0.2, 0.6] }]] },
  finished: { loop: true, period: 50, frames: [[0, { ...HIT, lean: -0.2, dx: 0, head: -0.5 }], [0.5, { ...HIT, lean: 0.1, dx: 0, head: -0.3 }], [1, { ...HIT, lean: -0.2, dx: 0, head: -0.5 }]] },
  finisher: {
    loop: false,
    frames: [
      [0, GUARD],
      [0.2, { ...HEAVY_WIND, dx: -16, glow: 0.6 }],
      [0.55, { ...HEAVY_WIND, dx: -10, glow: 1 }],
      [0.62, { ...HEAVY_HIT, dx: 30, glow: 1 }],
      [0.8, { ...HEAVY_HIT, dx: 24, glow: 0.4 }],
      [1, { ...VICTORY, glow: 0 }],
    ],
  },

  lightPunch: { loop: false, frames: [[0, GUARD], [0.3, PUNCH_WIND], [0.42, PUNCH_HIT], [0.7, PUNCH_HIT], [1, GUARD]] },
  heavyPunch: { loop: false, frames: [[0, GUARD], [0.35, HEAVY_WIND], [0.45, HEAVY_HIT], [0.7, HEAVY_HIT], [1, GUARD]] },
  lightKick: { loop: false, frames: [[0, GUARD], [0.3, KICK_WIND], [0.42, KICK_HIT], [0.7, KICK_HIT], [1, GUARD]] },
  heavyKick: { loop: false, frames: [[0, GUARD], [0.35, KICK_WIND], [0.46, HKICK_HIT], [0.7, HKICK_HIT], [1, GUARD]] },
  crouchLightPunch: { loop: false, frames: [[0, CROUCH], [0.3, { ...CROUCH, armF: [0.2, 2.4] }], [0.42, { ...CROUCH, armF: [1.5, 0.1], lean: 0.5, dx: 8 }], [0.7, { ...CROUCH, armF: [1.5, 0.1], lean: 0.5, dx: 8 }], [1, CROUCH]] },
  crouchHeavyPunch: {
    loop: false,
    frames: [
      [0, CROUCH],
      [0.3, { ...CROUCH, armF: [-0.6, 2.6], lean: 0.5 }],
      [0.42, { hip: 1.1, lean: -0.3, armF: [3.1, 0.1], armB: [0.3, 1.8], legF: [0.6, -0.5], legB: [-0.4, 0.6], dx: 6, glow: 0.5 }],
      [0.7, { hip: 1.05, lean: -0.25, armF: [3.0, 0.1], armB: [0.3, 1.8], legF: [0.5, -0.4], legB: [-0.4, 0.5], dx: 6 }],
      [1, CROUCH],
    ],
  },
  crouchLightKick: { loop: false, frames: [[0, CROUCH], [0.3, { ...CROUCH, legF: [0.4, -1.5] }], [0.42, { ...CROUCH, legF: [1.5, -0.1], dx: 6 }], [0.7, { ...CROUCH, legF: [1.5, -0.1], dx: 6 }], [1, CROUCH]] },
  crouchHeavyKick: { loop: false, frames: [[0, CROUCH], [0.3, { ...CROUCH, legF: [-0.6, -1.0], lean: 0.6 }], [0.44, { ...CROUCH, legF: [1.7, 0], lean: 0.2, dx: 14, hip: 0.4 }], [0.7, { ...CROUCH, legF: [1.7, 0], lean: 0.2, dx: 14, hip: 0.4 }], [1, CROUCH]] },
  airLightPunch: { loop: false, frames: [[0, JUMP], [0.3, { ...JUMP, armF: [-0.2, 2.4] }], [0.42, { ...JUMP, armF: [1.3, 0.2], lean: 0.3 }], [1, { ...JUMP, armF: [1.3, 0.2], lean: 0.3 }]] },
  airHeavyPunch: { loop: false, frames: [[0, JUMP], [0.3, { ...JUMP, armF: [-0.8, 2.6] }], [0.45, { ...JUMP, armF: [1.0, 0.1], lean: 0.6, legF: [0.4, -0.8] }], [1, { ...JUMP, armF: [1.0, 0.1], lean: 0.6 }]] },
  airLightKick: { loop: false, frames: [[0, JUMP], [0.3, { ...JUMP, legF: [-0.3, 1.5] }], [0.42, { ...JUMP, legF: [1.2, 0.1], lean: -0.2 }], [1, { ...JUMP, legF: [1.2, 0.1], lean: -0.2 }]] },
  airHeavyKick: { loop: false, frames: [[0, JUMP], [0.3, { ...JUMP, legF: [-0.5, 1.8] }], [0.46, { ...JUMP, legF: [1.6, 0.0], lean: -0.4, legB: [-0.6, 1.5] }], [1, { ...JUMP, legF: [1.6, 0.0], lean: -0.4 }]] },
  throw: {
    loop: false,
    frames: [
      [0, GUARD],
      [0.2, { lean: 0.3, armF: [1.4, 0.3], armB: [1.3, 0.4], dx: 10 }],
      [0.5, { lean: 0.1, armF: [1.2, 0.6], armB: [1.1, 0.7], dx: 6 }],
      [0.75, { lean: -0.3, armF: [2.6, 0.2], armB: [2.4, 0.3], dx: -4, hip: 1.03 }],
      [1, GUARD],
    ],
  },
  executionGrab: {
    loop: false,
    frames: [
      [0, GUARD],
      [0.2, { lean: 0.35, armF: [1.5, 0.2], armB: [1.3, 0.5], dx: 14, glow: 0.4 }],
      [0.5, { lean: 0.15, armF: [1.3, 0.5], armB: [-0.5, 2.4], dx: 8, glow: 0.9 }],
      [0.7, { lean: 0.5, armF: [1.3, 0.3], armB: [1.7, 0.1], dx: 18, glow: 1 }],
      [1, GUARD],
    ],
  },
  crimsonSlash: {
    loop: false,
    frames: [
      [0, GUARD],
      [0.3, { lean: -0.2, armF: [-1.2, 1.2], armB: [0.8, 2.2], legF: [0.2, -0.2], legB: [-0.5, 0.4], dx: -6, glow: 0.7 }],
      [0.42, { lean: 0.35, armF: [1.8, 0.1], armB: [0.2, 2.0], legF: [0.7, -0.5], legB: [-0.5, 0.2], dx: 16, glow: 1 }],
      [0.7, { lean: 0.3, armF: [1.6, 0.2], armB: [0.2, 2.0], legF: [0.6, -0.4], legB: [-0.5, 0.2], dx: 12, glow: 0.4 }],
      [1, GUARD],
    ],
  },
  bloodDash: {
    loop: false,
    frames: [
      [0, { ...GUARD, lean: 0.2, hip: 0.9 }],
      [0.25, { lean: 0.9, hip: 0.75, armF: [-0.6, 2.4], armB: [-0.8, 1.2], legF: [1.0, -0.8], legB: [-1.2, 1.2], glow: 1 }],
      [0.6, { lean: 0.6, hip: 0.85, armF: [1.9, 0.0], armB: [-0.8, 1.4], legF: [0.9, -0.7], legB: [-1.0, 1.0], dx: 10, glow: 1 }],
      [0.8, { lean: 0.4, hip: 0.95, armF: [1.7, 0.2], armB: [-0.3, 1.6], legF: [0.6, -0.4], legB: [-0.6, 0.6], dx: 6, glow: 0.4 }],
      [1, GUARD],
    ],
  },
  chargingShoulder: {
    loop: false,
    frames: [
      [0, { ...GUARD, lean: 0.2, hip: 0.92 }],
      [0.25, { lean: 1.0, hip: 0.8, armF: [-0.4, 1.6], armB: [-1.0, 1.0], legF: [1.0, -0.9], legB: [-1.2, 1.3], glow: 0.6 }],
      [0.7, { lean: 1.0, hip: 0.85, armF: [-0.4, 1.6], armB: [-1.0, 1.0], legF: [0.8, -0.6], legB: [-1.0, 1.1], dx: 8, glow: 0.8 }],
      [1, GUARD],
    ],
  },
  groundSlam: {
    loop: false,
    frames: [
      [0, GUARD],
      [0.3, { hip: 1.05, lean: -0.3, armF: [3.1, 0.2], armB: [3.0, 0.3], legF: [0.3, -0.2], legB: [-0.4, 0.3], glow: 0.5 }],
      [0.42, { hip: 0.5, lean: 0.7, armF: [1.3, 0.0], armB: [1.2, 0.1], legF: [1.4, -2.0], legB: [-0.3, 2.2], dx: 10, glow: 1 }],
      [0.7, { hip: 0.5, lean: 0.7, armF: [1.3, 0.0], armB: [1.2, 0.1], legF: [1.4, -2.0], legB: [-0.3, 2.2], dx: 10, glow: 0.6 }],
      [1, GUARD],
    ],
  },
  colossusFury: {
    loop: false,
    frames: [
      [0, { ...HEAVY_WIND, glow: 0.6 }],
      [0.2, { hip: 1.05, lean: -0.3, armF: [3.1, 0.2], armB: [0.3, 2.0], glow: 1 }],
      [0.32, { hip: 0.8, lean: 0.6, armF: [1.4, 0.0], armB: [0.3, 2.0], dx: 10, glow: 1 }],
      [0.44, { hip: 1.05, lean: -0.3, armB: [3.1, 0.2], armF: [0.3, 2.0], glow: 1 }],
      [0.56, { hip: 0.8, lean: 0.6, armB: [1.4, 0.0], armF: [0.3, 2.0], dx: 10, glow: 1 }],
      [0.68, { hip: 1.05, lean: -0.3, armF: [3.1, 0.2], armB: [3.0, 0.3], glow: 1 }],
      [0.8, { hip: 0.5, lean: 0.7, armF: [1.3, 0.0], armB: [1.2, 0.1], legF: [1.4, -2.0], legB: [-0.3, 2.2], dx: 14, glow: 1 }],
      [1, GUARD],
    ],
  },
  bloodRush: {
    loop: false,
    frames: [
      [0, { ...GUARD, glow: 0.5, hip: 0.95 }],
      [0.15, { lean: 0.4, armF: [-0.6, 2.4], armB: [-0.6, 2.2], hip: 0.85, glow: 1 }],
      [0.25, { ...PUNCH_HIT, glow: 1 }],
      [0.33, { ...PUNCH_HIT, armF: [0.2, 2.1], armB: [1.65, 0.05], glow: 1 }],
      [0.41, { ...PUNCH_HIT, glow: 1 }],
      [0.49, { ...PUNCH_HIT, armF: [0.2, 2.1], armB: [1.65, 0.05], glow: 1 }],
      [0.57, { ...KICK_HIT, glow: 1 }],
      [0.68, { ...HEAVY_HIT, glow: 1, dx: 30 }],
      [0.85, { ...HEAVY_HIT, glow: 0.5, dx: 24 }],
      [1, GUARD],
    ],
  },
  orbitalHammer: {
    loop: false,
    frames: [
      [0, { ...GUARD, hip: 0.85, glow: 0.4 }],
      [0.2, { hip: 1.0, lean: -0.3, armF: [3.1, 0.2], armB: [3.0, 0.3], legF: [0.6, -1.2], legB: [-0.4, 1.0], glow: 0.8 }],
      [0.5, { hip: 1.0, lean: 0.2, armF: [3.1, 0.2], armB: [3.0, 0.3], legF: [0.6, -1.2], legB: [-0.4, 1.0], glow: 1 }],
      [0.62, { hip: 0.5, lean: 0.8, armF: [1.2, 0.0], armB: [1.1, 0.1], legF: [1.4, -2.0], legB: [-0.3, 2.2], dx: 16, glow: 1 }],
      [0.8, { hip: 0.5, lean: 0.8, armF: [1.2, 0.0], armB: [1.1, 0.1], legF: [1.4, -2.0], legB: [-0.3, 2.2], dx: 16, glow: 0.5 }],
      [1, GUARD],
    ],
  },
  shadeStep: {
    loop: false,
    frames: [
      [0, { ...CROUCH, glow: 0.6 }],
      [0.4, { ...CROUCH, hip: 0.4, lean: 0.6, glow: 1 }],
      [0.7, { ...GUARD, glow: 0.8 }],
      [1, GUARD],
    ],
  },
};

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const mix = (a: Pose, b: Partial<Pose>, t: number): Pose => {
  const bb = { ...a, ...b };
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    hip: l(a.hip, bb.hip),
    lean: l(a.lean, bb.lean),
    head: l(a.head, bb.head),
    armF: [l(a.armF[0], bb.armF[0]), l(a.armF[1], bb.armF[1])],
    armB: [l(a.armB[0], bb.armB[0]), l(a.armB[1], bb.armB[1])],
    legF: [l(a.legF[0], bb.legF[0]), l(a.legF[1], bb.legF[1])],
    legB: [l(a.legB[0], bb.legB[0]), l(a.legB[1], bb.legB[1])],
    dx: l(a.dx, bb.dx),
    dy: l(a.dy, bb.dy),
    glow: l(a.glow, bb.glow),
  };
};

/** Evaluates an animation at normalized time t (0..1) or at an absolute frame for looping animations. */
export const evaluatePose = (anim: string, t: number): Pose => {
  const def = ANIMATIONS[anim] ?? ANIMATIONS.idle!;
  const frames = def.frames;
  const tt = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < frames.length - 1 && frames[i + 1]![0] <= tt) i++;
  const a = frames[i]!;
  const b = frames[Math.min(frames.length - 1, i + 1)]!;
  const poseA = { ...BASE, ...a[1] } as Pose;
  if (a === b || b[0] === a[0]) return poseA;
  const local = (tt - a[0]) / (b[0] - a[0]);
  return mix(poseA, b[1], easeInOut(local));
};

export const animTime = (anim: string, frame: number): number => {
  const def = ANIMATIONS[anim];
  if (!def || !def.loop) return 0;
  const period = def.period ?? 60;
  return (frame % period) / period;
};
