/**
 * Procedural skeletal poses. Angles are radians measured from straight down,
 * positive toward the facing direction. Arms: [upper, elbow] (forearm = upper + elbow).
 * Legs: [thigh, knee] (shin = thigh - knee). Torso lean is measured from straight up.
 */
export interface Pose {
  rot: number;
  torso: number;
  head: number;
  armF: [number, number];
  armB: [number, number];
  legF: [number, number];
  legB: [number, number];
  dx: number;
  dy: number;
  air: boolean;
}

export const IDLE: Pose = {
  rot: 0, torso: 0.08, head: 0,
  armF: [0.45, 1.9], armB: [0.1, 2.1],
  legF: [0.35, 0.45], legB: [-0.4, 0.5],
  dx: 0, dy: 0, air: false,
};

const P = (o: Partial<Pose>): Pose => ({ ...IDLE, ...o });

const CROUCH_LEGS = { legF: [1.25, 2.2] as [number, number], legB: [0.7, 2.1] as [number, number] };

export const POSES: Record<string, Pose> = {
  idle: IDLE,
  walk: IDLE,
  crouch: P({ ...CROUCH_LEGS, torso: 0.25, armF: [0.55, 1.8], armB: [0.2, 2.0] }),
  jump: P({ air: true, torso: 0.05, armF: [0.9, 1.1], armB: [0.5, 1.5], legF: [0.9, 1.6], legB: [0.2, 1.3] }),
  blockHigh: P({ torso: 0.02, armF: [0.8, 2.5], armB: [0.55, 2.6], legF: [0.3, 0.5], legB: [-0.45, 0.6] }),
  blockLow: P({ ...CROUCH_LEGS, torso: 0.2, armF: [0.7, 1.4], armB: [0.5, 1.5] }),
  hitHigh: P({ torso: -0.38, head: -0.45, armF: [-0.3, 0.9], armB: [-0.5, 1.0], legF: [0.3, 0.6], legB: [-0.5, 0.4], dx: -6 }),
  hitLow: P({ torso: 0.55, head: 0.35, armF: [0.3, 0.9], armB: [0.2, 1.0], legF: [0.6, 1.0], legB: [-0.2, 0.9] }),
  hurtAir: P({ air: true, torso: -0.5, head: -0.5, armF: [-0.6, 0.6], armB: [-0.9, 0.7], legF: [0.6, 0.4], legB: [0.1, 0.6] }),
  lying: P({ rot: -Math.PI / 2, torso: 0, head: -0.15, armF: [0.35, 0.2], armB: [0.55, 0.15], legF: [0.18, 0.05], legB: [0.05, 0.1] }),
  lyingB: P({ rot: -Math.PI / 2, torso: 0.1, head: 0.2, armF: [-0.2, 0.2], armB: [1.9, 0.3], legF: [0.35, 0.2], legB: [-0.15, 0.1] }),
  lyingC: P({ rot: -Math.PI / 2, torso: 0, head: -0.3, armF: [1.6, 0.1], armB: [1.7, 0.2], legF: [0.5, 0.5], legB: [0.25, 0.9] }),
  kneel: P({ torso: 0.55, head: 0.6, armF: [0.15, 0.25], armB: [0.05, 0.3], legF: [1.45, 2.7], legB: [-0.55, 2.9] }),
  grabbed: P({ torso: 0.35, head: 0.5, armF: [0.15, 0.3], armB: [0.05, 0.35], legF: [0.2, 0.3], legB: [-0.2, 0.3], air: false }),

  jab_w: P({ torso: 0.02, armF: [0.2, 2.3], armB: [0.1, 2.2] }),
  jab_s: P({ torso: 0.22, armF: [1.48, 0.12], armB: [0.1, 2.2], legF: [0.55, 0.55], legB: [-0.55, 0.4], dx: 10 }),
  jab2_w: P({ torso: -0.05, armB: [0.05, 2.4], armF: [0.55, 1.9] }),
  jab2_s: P({ torso: 0.32, armB: [1.45, 0.12], armF: [0.5, 2.0], legF: [0.5, 0.5], legB: [-0.6, 0.45], dx: 12 }),
  cross_w: P({ torso: -0.18, armB: [-0.35, 1.6], armF: [0.5, 1.9], legF: [0.4, 0.55], legB: [-0.7, 0.8] }),
  cross_s: P({ torso: 0.5, armB: [1.5, 0.08], armF: [0.4, 2.1], legF: [0.65, 0.75], legB: [-0.85, 0.25], dx: 18 }),
  hammer_w: P({ torso: -0.3, armF: [2.7, 0.2], armB: [2.55, 0.3], legF: [0.3, 0.4], legB: [-0.5, 0.5] }),
  hammer_s: P({ torso: 0.85, head: 0.2, armF: [1.2, 0.15], armB: [1.1, 0.2], legF: [0.8, 0.9], legB: [-0.9, 0.4], dx: 16 }),
  front_w: P({ torso: -0.12, legF: [1.05, 1.8], legB: [-0.1, 0.25], armF: [0.5, 1.8], armB: [0.2, 2.0] }),
  front_s: P({ torso: -0.18, legF: [1.5, 0.05], legB: [-0.08, 0.2], armF: [0.2, 1.4], armB: [-0.2, 1.6] }),
  round_w: P({ torso: -0.22, legF: [1.0, 2.1], legB: [-0.1, 0.25], armF: [0.3, 1.5], armB: [0.7, 1.4] }),
  round_s: P({ torso: -0.6, head: -0.2, legF: [1.85, 0.12], legB: [-0.05, 0.2], armF: [-0.4, 0.9], armB: [0.9, 0.9] }),
  stomp_w: P({ torso: -0.2, legF: [1.25, 2.3], legB: [-0.05, 0.3], armF: [1.2, 1.6], armB: [1.0, 1.7] }),
  stomp_s: P({ torso: 0.45, legF: [0.55, 0.15], legB: [-0.35, 0.5], armF: [0.5, 0.5], armB: [0.2, 0.6] }),

  cjab_w: P({ ...CROUCH_LEGS, torso: 0.2, armF: [0.3, 2.2], armB: [0.2, 2.1] }),
  cjab_s: P({ ...CROUCH_LEGS, torso: 0.35, armF: [1.5, 0.1], armB: [0.2, 2.0], dx: 8 }),
  upper_w: P({ ...CROUCH_LEGS, torso: 0.3, armF: [0.35, 1.5], armB: [0.2, 1.8] }),
  upper_s: P({ legF: [0.6, 0.7], legB: [-0.55, 0.5], torso: 0.02, head: -0.2, armF: [2.95, 0.3], armB: [0.5, 2.0], dx: 8 }),
  clow_w: P({ ...CROUCH_LEGS, torso: 0.3, armF: [0.5, 1.7] }),
  clow_s: P({ legF: [1.3, 0.02], legB: [0.75, 2.2], torso: 0.3, armF: [0.55, 1.7], armB: [0.2, 1.9] }),
  sweep_w: P({ legF: [1.0, 1.9], legB: [0.8, 2.4], torso: 0.4, armF: [0.7, 0.9], armB: [0.5, 1.1] }),
  sweep_s: P({ legF: [1.4, 0.0], legB: [0.5, 2.5], torso: 0.55, armF: [0.55, 0.5], armB: [0.2, 0.6], dx: 6 }),

  airp_w: P({ air: true, armF: [0.6, 1.9], armB: [0.7, 1.7], legF: [0.8, 1.6], legB: [0.3, 1.4], torso: 0.1 }),
  airp_s: P({ air: true, armF: [1.55, 0.1], armB: [0.7, 1.7], legF: [0.8, 1.6], legB: [0.3, 1.4], torso: 0.3 }),
  airk_w: P({ air: true, legF: [0.8, 1.9], legB: [0.3, 1.5], torso: -0.15, armF: [0.5, 1.4], armB: [0.2, 1.6] }),
  airk_s: P({ air: true, legF: [1.25, 0.0], legB: [0.3, 1.9], torso: -0.35, armF: [0.0, 1.0], armB: [-0.4, 1.2] }),

  dash_w: P({ torso: 0.55, armF: [-0.4, 1.5], armB: [-0.6, 1.4], legF: [0.8, 1.6], legB: [-0.9, 1.1] }),
  dash_s: P({ torso: 1.05, head: 0.1, armF: [1.6, 0.1], armB: [-1.1, 0.4], legF: [1.0, 0.3], legB: [-1.3, 0.25], dx: 20 }),
  slash_w: P({ torso: -0.35, armF: [2.5, 0.7], armB: [2.3, 0.9], legF: [0.4, 0.5], legB: [-0.7, 0.7] }),
  slash_s: P({ torso: 0.55, armF: [1.05, 0.25], armB: [1.2, 0.2], legF: [0.85, 0.9], legB: [-0.95, 0.35], dx: 14 }),
  cast_w: P({ torso: -0.12, armF: [0.55, 2.0], armB: [0.45, 2.1] }),
  cast_s: P({ torso: 0.18, armF: [1.5, 0.08], armB: [1.45, 0.15], legF: [0.55, 0.6], legB: [-0.6, 0.4], dx: 6 }),
  palm_w: P({ torso: -0.1, armF: [0.4, 2.0], armB: [-0.3, 1.6], legF: [0.5, 0.6], legB: [-0.6, 0.7] }),
  palm_s: P({ torso: 0.35, armF: [1.55, 0.0], armB: [0.2, 1.8], legF: [0.7, 0.7], legB: [-0.7, 0.3], dx: 14 }),
  rise_w: P({ ...CROUCH_LEGS, torso: 0.25, armF: [0.3, 1.5], armB: [0.2, 1.7] }),
  rise_s: P({ air: true, torso: 0.0, head: -0.25, armF: [3.0, 0.1], armB: [0.9, 1.8], legF: [0.5, 1.2], legB: [0.0, 1.4] }),
  charge: P({ ...CROUCH_LEGS, torso: 0.15, head: 0.1, armF: [-0.3, 1.0], armB: [-0.5, 1.1] }),
  vanish: P({ ...CROUCH_LEGS, torso: 0.5, armF: [0.3, 1.0], armB: [0.2, 1.1] }),
  flurry_s: P({ torso: 0.4, armF: [1.5, 0.1], armB: [1.4, 0.2], legF: [0.7, 0.7], legB: [-0.8, 0.3], dx: 14 }),
  counter_w: P({ ...CROUCH_LEGS, legF: [0.7, 1.2], legB: [-0.1, 1.3], torso: 0.1, armF: [0.9, 2.1], armB: [0.7, 2.3] }),
  counter_s: P({ torso: 0.3, armF: [1.55, 0.0], armB: [0.6, 1.9], legF: [0.8, 0.8], legB: [-0.8, 0.3], dx: 14 }),
  grab_w: P({ torso: 0.28, armF: [1.5, 0.25], armB: [1.35, 0.35], legF: [0.55, 0.6], legB: [-0.55, 0.45], dx: 8 }),
  grab_hold: P({ torso: 0.2, armF: [1.2, 0.8], armB: [1.1, 0.9], legF: [0.5, 0.6], legB: [-0.5, 0.5], dx: 4 }),
  throw_s: P({ torso: 0.95, head: 0.2, armF: [1.0, 0.1], armB: [0.9, 0.2], legF: [0.8, 0.9], legB: [-0.9, 0.5], dx: 12 }),
  throw_w: P({ torso: -0.25, armF: [2.6, 0.2], armB: [2.5, 0.3], legF: [0.3, 0.5], legB: [-0.5, 0.5] }),

  victory_fist: P({ torso: -0.1, head: -0.2, armF: [2.9, 0.3], armB: [0.3, 1.9], legF: [0.3, 0.4], legB: [-0.35, 0.5] }),
  victory_cross: P({ torso: 0.02, head: -0.05, armF: [0.9, 2.5], armB: [0.8, 2.5], legF: [0.2, 0.3], legB: [-0.25, 0.3] }),
  victory_chest: P({ torso: -0.08, head: -0.25, armF: [0.7, 2.2], armB: [0.6, 2.3], legF: [0.45, 0.4], legB: [-0.5, 0.5] }),
  victory_bow: P({ torso: 0.5, head: 0.5, armF: [0.9, 2.2], armB: [0.8, 2.3], legF: [0.2, 0.2], legB: [-0.2, 0.2] }),
  victory_wide: P({ torso: -0.15, head: -0.3, armF: [2.4, 0.2], armB: [-2.4, 0.2], legF: [0.3, 0.3], legB: [-0.3, 0.3] }),
  victory_mech: P({ torso: -0.12, head: -0.3, armF: [0.3, 0.2], armB: [0.2, 0.2], legF: [0.2, 0.2], legB: [-0.2, 0.2] }),
};

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const l = (x: number, y: number): number => x + (y - x) * t;
  const l2 = (x: [number, number], y: [number, number]): [number, number] => [l(x[0], y[0]), l(x[1], y[1])];
  return {
    rot: l(a.rot, b.rot), torso: l(a.torso, b.torso), head: l(a.head, b.head),
    armF: l2(a.armF, b.armF), armB: l2(a.armB, b.armB), legF: l2(a.legF, b.legF), legB: l2(a.legB, b.legB),
    dx: l(a.dx, b.dx), dy: l(a.dy, b.dy), air: t < 0.5 ? a.air : b.air,
  };
}

export function getPoseDef(id: string): Pose {
  const p = POSES[id];
  if (!p) {
    console.error(`Missing pose "${id}", using idle`);
    return IDLE;
  }
  return p;
}

export function walkPose(time: number, dir: number): Pose {
  const phase = time * 0.22 * (dir >= 0 ? 1 : -1);
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const lift = (v: number): number => Math.max(0, v);
  return P({
    torso: 0.1 + 0.03 * c,
    legF: [0.3 + 0.55 * s, 0.35 + 0.9 * lift(c)],
    legB: [-0.3 - 0.55 * s, 0.35 + 0.9 * lift(-c)],
    armF: [0.45 - 0.2 * s, 1.9],
    armB: [0.1 + 0.2 * s, 2.1],
    dy: 0,
  });
}

export function idlePose(time: number): Pose {
  const b = Math.sin(time * 0.09);
  return P({
    torso: 0.08 + 0.02 * b,
    armF: [0.45 + 0.04 * b, 1.9 - 0.06 * b],
    armB: [0.1 - 0.03 * b, 2.1 + 0.05 * b],
    legF: [0.35, 0.45 + 0.04 * b],
    legB: [-0.4, 0.5 - 0.04 * b],
  });
}
