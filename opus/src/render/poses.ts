import type { CharacterVisual } from '../characters/CharacterDef';
import { easeInOutQuad, easeOutCubic, lerp } from '../core/math';

/**
 * Skeletal pose in degrees. Limb angle 0 points straight down, 90 points forward,
 * 180 points up. Elbow bend rotates the forearm further forward/up; knee bend rotates
 * the shin backward. `rot` rotates the whole body around the hip.
 */
export interface Pose {
  hipX: number;
  hipY: number;
  rot: number;
  lean: number;
  head: number;
  aF: [number, number];
  aB: [number, number];
  lF: [number, number];
  lB: [number, number];
  /** 0..1 energy blade / weapon glow intensity. */
  blade: number;
  /** Keep feet on the floor (disable for airborne / lying poses). */
  ground: boolean;
  alpha: number;
}

export type PartialPose = Partial<Pose>;

const BASE: Pose = {
  hipX: 0, hipY: 0, rot: 0, lean: 6, head: 0,
  aF: [30, 120], aB: [18, 125], lF: [16, 18], lB: [-16, 10],
  blade: 0, ground: true, alpha: 1,
};

export const GUARDS: Record<CharacterVisual['idleStyle'], Pose> = {
  boxer: { ...BASE },
  stalker: { ...BASE, lean: 10, aF: [55, 70], aB: [-20, 40], lF: [22, 30], lB: [-22, 18] },
  brute: { ...BASE, lean: 20, aF: [25, 60], aB: [10, 50], lF: [22, 26], lB: [-20, 16], head: 10 },
  monk: { ...BASE, lean: 4, aF: [70, 60], aB: [35, 110], lF: [26, 36], lB: [-22, 22] },
  phantom: { ...BASE, lean: 8, aF: [20, 20], aB: [8, 15], lF: [6, 12], lB: [-4, 10], ground: false, hipY: 10 },
  mech: { ...BASE, lean: 2, aF: [28, 95], aB: [14, 95], lF: [12, 8], lB: [-12, 6] },
  tyrant: { ...BASE, lean: -2, aF: [35, 40], aB: [-10, 30], lF: [12, 6], lB: [-12, 6], head: -4 },
};

const merge = (base: Pose, p: PartialPose): Pose => ({ ...base, ...p });

/** Keyframes: windup reached during startup, strike held through active frames. */
interface MoveAnim {
  wind: PartialPose;
  strike: PartialPose;
  /** Optional procedural override: t = frames since start. */
  custom?: (guard: Pose, phase: AnimPhase, p: number, t: number) => Pose;
}

export type AnimPhase = 'startup' | 'active' | 'recovery' | 'hold';

const CROUCH: PartialPose = { lean: 24, lF: [82, 92], lB: [22, 102], aF: [40, 115], aB: [20, 120], head: 6 };

export const ANIMS: Record<string, MoveAnim> = {
  punch_l: { wind: { aF: [38, 125], lean: 4 }, strike: { aF: [88, 2], lean: 14, head: 4 } },
  punch_h: {
    wind: { aB: [-10, 110], lean: -6, aF: [40, 120] },
    strike: { aB: [92, 0], lean: 26, aF: [25, 125], lF: [32, 24], lB: [-32, 6] },
  },
  kick_l: { wind: { lF: [70, 100], lean: -6 }, strike: { lF: [78, 4], lean: -14, aF: [45, 100], aB: [-20, 60] } },
  kick_h: {
    wind: { lF: [80, 120], lean: -14 },
    strike: { lF: [122, 4], lean: -34, lB: [-8, 0], aF: [20, 90], aB: [-40, 50] },
  },
  knee: { wind: { lF: [70, 120], lean: 10 }, strike: { lF: [100, 150], lean: 18, aF: [70, 40], aB: [60, 40] } },
  cpunch_l: { wind: { ...CROUCH, aF: [40, 120] }, strike: { ...CROUCH, aF: [86, 2], lean: 30 } },
  uppercut: {
    wind: { ...CROUCH, aF: [10, 60] },
    strike: { lean: 2, aF: [168, 12], aB: [10, 110], lF: [20, 10], lB: [-20, 10] },
  },
  ckick_l: { wind: { ...CROUCH, lF: [70, 110] }, strike: { ...CROUCH, lF: [86, 4], lean: 10 } },
  sweep: {
    wind: { ...CROUCH, lean: 40 },
    strike: { lean: 48, lF: [92, 0], lB: [40, 120], aF: [60, 40], aB: [40, 40], head: 10 },
  },
  jpunch: { wind: { aF: [60, 110], lF: [50, 110], lB: [10, 100], ground: false }, strike: { aF: [120, 10], lean: 18, lF: [50, 110], lB: [10, 100], ground: false } },
  jpunch_h: { wind: { aF: [170, 30], aB: [150, 30], lF: [50, 100], lB: [10, 100], ground: false }, strike: { aF: [70, 0], aB: [60, 0], lean: 30, lF: [50, 100], lB: [10, 100], ground: false } },
  jkick: { wind: { lF: [70, 130], lB: [10, 100], ground: false }, strike: { lF: [100, 140], lB: [0, 60], lean: 10, ground: false } },
  jkick_h: { wind: { lF: [60, 110], lB: [10, 90], ground: false }, strike: { lF: [62, 0], lB: [-10, 70], lean: -12, aF: [100, 20], aB: [-30, 30], ground: false } },
  dash: { wind: { lean: 30, lF: [40, 60], aF: [40, 90] }, strike: { lean: 46, aF: [90, 0], aB: [-50, 10], lF: [50, 20], lB: [-50, 10], blade: 1 } },
  slash: {
    wind: { aF: [160, 40], lean: -8, blade: 1 },
    strike: { aF: [55, 10], aB: [-20, 40], lean: 22, lF: [34, 20], lB: [-34, 6], blade: 1 },
  },
  slash_finish: {
    wind: { aF: [175, 20], aB: [170, 20], lean: -12, blade: 1 },
    strike: { aF: [40, 0], aB: [30, 0], lean: 40, lF: [40, 30], lB: [-40, 6], blade: 1, head: 15 },
  },
  blade_ready: { wind: { aF: [90, 60], blade: 1 }, strike: { aF: [100, 0], aB: [20, 120], lean: 4, blade: 1 } },
  lunge_grab: { wind: { lean: 20, aF: [40, 40], aB: [30, 40] }, strike: { lean: 34, aF: [86, 6], aB: [80, 10], lF: [40, 20], lB: [-40, 6] } },
  grab: { wind: { aF: [50, 40], aB: [45, 40] }, strike: { aF: [84, 10], aB: [80, 14], lean: 16 } },
  grab_hold: { wind: { aF: [80, 30], aB: [76, 30], lean: 10 }, strike: { aF: [82, 30], aB: [78, 30], lean: 12 } },
  lift: { wind: { aF: [120, 30], aB: [115, 30], lean: -6 }, strike: { aF: [165, 10], aB: [160, 10], lean: -12, lF: [20, 10], lB: [-20, 10] } },
  slam: { wind: { aF: [170, 10], aB: [165, 10], lean: -14 }, strike: { aF: [60, 10], aB: [55, 10], lean: 46, lF: [40, 50], lB: [-30, 20], head: 20 } },
  throw: { wind: { aF: [90, 40], aB: [80, 40], lean: 10 }, strike: { aF: [150, 10], aB: [140, 10], lean: -20, lF: [30, 10], lB: [-30, 10] } },
  rising: {
    wind: { ...CROUCH, aF: [10, 80], blade: 1 },
    strike: { lean: -4, aF: [175, 6], aB: [20, 90], lF: [30, 80], lB: [-10, 40], ground: false, blade: 1 },
  },
  spin_kick: {
    wind: { lF: [60, 110], lean: -10 },
    strike: { lF: [100, 0], lB: [-10, 0], lean: -30, aF: [100, 0], aB: [-80, 0] },
    custom: (g, phase, p, t) => {
      const base = phase === 'startup' ? merge(g, { lF: [60, 110], lean: -10 }) : merge(g, { lF: [100, 0], lB: [-10, 0], lean: -30, aF: [100, 0], aB: [-80, 0] });
      if (phase === 'active') return { ...base, rot: (t * 30) % 360 > 180 ? -8 : 8 };
      return phase === 'recovery' ? lerpPose(base, g, easeInOutQuad(p)) : base;
    },
  },
  whip: { wind: { aF: [150, 60], lean: -8 }, strike: { aF: [92, 0], lean: 18, aB: [-20, 30] } },
  cast: { wind: { aF: [40, 120], aB: [40, 130], lean: -6 }, strike: { aF: [90, 0], aB: [86, 4], lean: 16, lF: [30, 20], lB: [-30, 6] } },
  palm: { wind: { aF: [30, 140], lean: -4 }, strike: { aF: [90, 8], aB: [40, 120], lean: 20, lF: [34, 26], lB: [-30, 6] } },
  teleport_out: { wind: { lean: 10, aF: [30, 20], aB: [20, 20], alpha: 0.2 }, strike: { lean: 20, aF: [80, 10], aB: [-20, 20], alpha: 1 } },
  shoulder: { wind: { lean: 26, aF: [20, 120], aB: [10, 120] }, strike: { lean: 40, aF: [10, 140], aB: [5, 140], lF: [46, 30], lB: [-44, 8], head: 10 } },
  ground_pound: { wind: { aF: [170, 20], aB: [165, 20], lean: -10 }, strike: { ...CROUCH, aF: [60, 0], aB: [55, 0], lean: 50 } },
  overhead: { wind: { aF: [175, 30], aB: [170, 30], lean: -16 }, strike: { aF: [80, 0], aB: [75, 0], lean: 40, lF: [36, 30], lB: [-30, 10] } },
  toss: { wind: { aB: [-40, 60], aF: [30, 80], lean: -14 }, strike: { aB: [140, 10], aF: [60, 40], lean: 20 } },
  counter: { wind: { aF: [100, 80], aB: [60, 100], lean: -4 }, strike: { aF: [110, 70], aB: [70, 100], lean: -6, lF: [30, 50], lB: [-30, 30] } },
  burst: { wind: { ...CROUCH, aF: [30, 140], aB: [30, 140] }, strike: { aF: [140, 0], aB: [-60, 0], lean: -10, lF: [30, 6], lB: [-30, 6] } },
  rush_punches: {
    wind: { aF: [60, 90] },
    strike: { aF: [88, 0] },
    custom: (g, phase, p, t) => {
      if (phase === 'startup') return lerpPose(g, merge(g, { aF: [60, 90], lean: 12 }), p);
      if (phase === 'recovery') return lerpPose(merge(g, { aF: [88, 0], lean: 18 }), g, easeInOutQuad(p));
      const alt = Math.floor(t / 3) % 2 === 0;
      return merge(g, { lean: 18, aF: alt ? [88, 0] : [40, 120], aB: alt ? [30, 120] : [90, 0], lF: [32, 24], lB: [-32, 6] });
    },
  },
  claw: { wind: { aF: [150, 40], aB: [120, 40], lean: -6 }, strike: { aF: [50, 20], aB: [70, 30], lean: 30 } },
  summon: { wind: { aF: [20, 10], aB: [20, 10], lean: -4 }, strike: { aF: [140, 0], aB: [135, 0], lean: -10, head: -14 } },
  stomp: { wind: { lF: [90, 120], lean: -8, aF: [60, 60] }, strike: { lF: [20, 10], lB: [-20, 10], lean: 16, aF: [40, 30], aB: [30, 30] } },
  charge: {
    wind: { aF: [20, 120], aB: [10, 120], lean: -4 },
    strike: { aF: [30, 150], aB: [20, 150], lean: -10, head: -14, blade: 1 },
  },
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  hipX: lerp(a.hipX, b.hipX, t),
  hipY: lerp(a.hipY, b.hipY, t),
  rot: lerp(a.rot, b.rot, t),
  lean: lerp(a.lean, b.lean, t),
  head: lerp(a.head, b.head, t),
  aF: [lerp(a.aF[0], b.aF[0], t), lerp(a.aF[1], b.aF[1], t)],
  aB: [lerp(a.aB[0], b.aB[0], t), lerp(a.aB[1], b.aB[1], t)],
  lF: [lerp(a.lF[0], b.lF[0], t), lerp(a.lF[1], b.lF[1], t)],
  lB: [lerp(a.lB[0], b.lB[0], t), lerp(a.lB[1], b.lB[1], t)],
  blade: lerp(a.blade, b.blade, t),
  ground: t < 0.5 ? a.ground : b.ground,
  alpha: lerp(a.alpha, b.alpha, t),
});

/** Evaluate a move animation for the given phase and progress (0..1 within phase). */
export const evalMoveAnim = (anim: string, guard: Pose, phase: AnimPhase, p: number, t: number): Pose => {
  const a = ANIMS[anim] ?? ANIMS.punch_h;
  if (a.custom) return a.custom(guard, phase, p, t);
  const wind = merge(guard, a.wind);
  const strike = merge(guard, a.strike);
  switch (phase) {
    case 'startup':
      return p < 0.7 ? lerpPose(guard, wind, easeOutCubic(p / 0.7)) : lerpPose(wind, strike, easeOutCubic((p - 0.7) / 0.3));
    case 'active':
    case 'hold':
      return strike;
    case 'recovery':
      return lerpPose(strike, guard, easeInOutQuad(p));
  }
};

/** Lock-sequence anims play a short windup then hold the strike pose. */
export const evalLockAnim = (anim: string, guard: Pose, frame: number): Pose => {
  const special = REACTIONS[anim];
  if (special) return special(guard, frame);
  const p = Math.min(1, frame / 7);
  return evalMoveAnim(anim, guard, p < 1 ? 'startup' : 'hold', p, frame);
};

export const CROUCH_POSE = (g: Pose): Pose => merge(g, CROUCH);

/** Reaction and state poses that do not come from move keyframes. */
export const REACTIONS: Record<string, (g: Pose, t: number) => Pose> = {
  hit: (g, t) => {
    const k = Math.max(0, 1 - t / 14);
    return merge(g, { lean: -18 * k + g.lean * (1 - k), head: -24 * k, aF: [10, 40], aB: [-10, 30], lF: [20, 20], lB: [-24, 10] });
  },
  hit_air: (g) => merge(g, { lean: -30, head: -30, aF: [140, 20], aB: [-40, 20], lF: [40, 60], lB: [-10, 50], ground: false, rot: 20 }),
  grabbed: (g, t) => merge(g, { lean: -10 + Math.sin(t * 0.6) * 4, head: -12, aF: [30, 30], aB: [50, 40], lF: [10, 10], lB: [-14, 10] }),
  shock: (g, t) =>
    merge(g, {
      lean: Math.sin(t * 2.1) * 12,
      head: Math.cos(t * 1.7) * 20,
      aF: [90 + Math.sin(t * 2.6) * 50, 20],
      aB: [-60 + Math.cos(t * 2.3) * 40, 20],
      lF: [10, 10],
      lB: [-10, 10],
      ground: false,
    }),
  thrown_up: (g) => merge(g, { rot: 70, lean: -10, aF: [150, 20], aB: [120, 20], lF: [30, 40], lB: [0, 30], ground: false }),
  knockdown: (g) => lyingPose(g),
  dazed: (g, t) =>
    merge(g, {
      lean: 14 + Math.sin(t * 0.08) * 10,
      head: 24 + Math.sin(t * 0.11) * 12,
      aF: [8, 14],
      aB: [4, 10],
      lF: [14, 24],
      lB: [-10, 16],
      hipX: Math.sin(t * 0.08) * 6,
    }),
  collapse: (g, t) => {
    const p = Math.min(1, t / 30);
    if (p < 0.5) return lerpPose(REACTIONS.dazed(g, 0), merge(g, { ...CROUCH, lean: 50, head: 40, aF: [0, 10], aB: [0, 10] }), p * 2);
    return lerpPose(merge(g, { ...CROUCH, lean: 50, head: 40, aF: [0, 10], aB: [0, 10] }), lyingPose(g, true), (p - 0.5) * 2);
  },
  energy_lift: (g, t) =>
    merge(g, { rot: Math.sin(t * 0.2) * 6, lean: -20, head: -40, aF: [120, 10], aB: [100, 10], lF: [6, 10], lB: [-6, 10], ground: false }),
  dissolve: (g, t) => merge(REACTIONS.energy_lift(g, t), { alpha: Math.max(0, 1 - t / 30) }),
  teleport_out: (g, t) => merge(g, { alpha: Math.max(0.1, 1 - t / 8), lean: 20 }),
};

export const lyingPose = (g: Pose, faceDown = false): Pose =>
  merge(g, {
    rot: faceDown ? -88 : 88,
    lean: 0,
    head: faceDown ? 10 : -10,
    aF: faceDown ? [170, 10] : [150, 30],
    aB: faceDown ? [160, 20] : [200, 20],
    lF: [8, 14],
    lB: [-6, 10],
    ground: true,
  });

export const VICTORY_POSES: Record<string, (g: Pose, t: number) => Pose> = {
  blade_salute: (g, t) => merge(g, { aF: [158, 22 + Math.sin(t * 0.05) * 4], aB: [10, 40], lean: -4, head: -8, blade: 1, lF: [12, 6], lB: [-14, 6] }),
  hair_flip: (g, t) => merge(g, { aB: [165, 125], aF: [20, 30], lean: -6 + Math.sin(t * 0.06) * 3, head: -10, lF: [20, 10], lB: [-4, 20], hipX: 4 }),
  flex: (g, t) => merge(g, { aF: [110, 115 + Math.sin(t * 0.15) * 8], aB: [105, 115 + Math.cos(t * 0.15) * 8], lean: -4, head: -12, lF: [22, 10], lB: [-22, 10] }),
  bow: (g, t) => merge(g, { lean: Math.min(45, t * 1.5), head: 10, aF: [20, 130], aB: [15, 130], lF: [6, 4], lB: [-6, 4] }),
  float: (g, t) => merge(g, { hipY: 26 + Math.sin(t * 0.06) * 8, aF: [100, 10], aB: [80, 10], lF: [6, 20], lB: [-2, 26], head: -10, ground: false }),
  arms_crossed: (g) => merge(g, { aF: [45, 130], aB: [40, 135], lean: -2, head: -6, lF: [14, 4], lB: [-14, 4] }),
  throne: (g, t) => merge(g, { aF: [110, 30], aB: [100, 30], lean: -10, head: -14 + Math.sin(t * 0.04) * 3, lF: [16, 6], lB: [-16, 6] }),
};

export const DEFEAT_POSES: Record<string, (g: Pose) => Pose> = {
  kneel: (g) => merge(g, { lean: 40, head: 30, lF: [80, 90], lB: [-6, 84], aF: [10, 10], aB: [0, 10] }),
  collapse_side: (g) => lyingPose(g, true),
  faceplant: (g) => lyingPose(g, true),
  dissolve_kneel: (g) => merge(g, { lean: 50, head: 40, lF: [80, 90], lB: [-6, 84], aF: [0, 10], aB: [0, 10], alpha: 0.6 }),
  shutdown: (g) => merge(g, { lean: 30, head: 50, aF: [0, 0], aB: [0, 0], lF: [10, 6], lB: [-10, 6] }),
  shatter_kneel: (g) => merge(g, { lean: 30, head: 30, lF: [80, 90], lB: [-6, 84], aF: [40, 20], aB: [0, 10] }),
};
