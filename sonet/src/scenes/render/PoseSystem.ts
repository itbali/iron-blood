import { FighterState } from '../../combat/types';
import type { Fighter } from '../../characters/Fighter';
import type { FinisherRun } from '../../game/FightSim';
import { GETUP_FRAMES } from '../../data/constants';
import { getPoseDef, idlePose, lerpPose, walkPose, POSES, type Pose } from './poses';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const easeIn = (t: number): number => t * t;

const VICTORY_BY_BODY: Record<string, string> = {
  tactical: 'victory_fist', cyber: 'victory_cross', brute: 'victory_chest', monk: 'victory_bow',
  wraith: 'victory_wide', mech: 'victory_mech', archon: 'victory_wide',
};
const LYING_BY_BODY: Record<string, string> = {
  tactical: 'lying', cyber: 'lyingB', brute: 'lyingC', monk: 'lying', wraith: 'lyingB', mech: 'lyingC', archon: 'lyingC',
};

function movePose(f: Fighter): Pose {
  const m = f.move;
  if (!m) return idlePose(f.animTime);
  const a = m.attack;
  const frame = f.curFrame;
  let strikeId = m.anim.strike;
  let windId = m.anim.wind;
  if (m.multiHit && frame >= a.startup) {
    const idx = Math.floor((frame - a.startup) / m.multiHit.interval);
    const last = frame >= a.startup + a.active - m.multiHit.interval;
    strikeId = last ? 'cross_s' : idx % 2 === 0 ? 'jab_s' : 'jab2_s';
    windId = 'cross_w';
  }
  const idle = idlePose(f.animTime);
  const wind = getPoseDef(windId);
  const strike = getPoseDef(strikeId);
  const recoverTo = m.anim.recover ? getPoseDef(m.anim.recover) : f.airborne ? getPoseDef('jump') : idle;

  if (frame < a.startup) {
    const p = a.startup <= 1 ? 1 : frame / (a.startup - 1);
    if (p < 0.55) return lerpPose(idle, wind, easeOut(clamp01(p / 0.55)));
    return lerpPose(wind, strike, easeIn(clamp01((p - 0.55) / 0.45)));
  }
  if (frame < a.startup + a.active) return strike;
  const r = clamp01((frame - a.startup - a.active) / Math.max(1, a.recovery));
  return lerpPose(strike, recoverTo, easeOut(r));
}

function throwPose(f: Fighter): Pose {
  const g = f.throwData;
  if (!g) return idlePose(f.animTime);
  const t = f.throwFrame;
  const last = g.hits[g.hits.length - 1]?.frame ?? g.duration;
  if (t < 8) return lerpPose(getPoseDef('grab_w'), getPoseDef('grab_hold'), t / 8);
  if (t >= last - 6) {
    const k = clamp01((t - (last - 12)) / 12);
    return lerpPose(getPoseDef('throw_w'), getPoseDef('throw_s'), easeIn(k));
  }
  const hit = g.hits.findIndex((h) => Math.abs(h.frame - t) < 4);
  if (hit >= 0 && g.hits[hit].fx !== 'slam') {
    return getPoseDef(hit % 2 === 0 ? 'jab_s' : 'cross_s');
  }
  return getPoseDef('grab_hold');
}

function finisherWinnerPose(f: Fighter, run: FinisherRun): Pose {
  const t = run.frame / run.def.duration;
  const idle = idlePose(f.animTime);
  switch (run.def.kind) {
    case 'energy':
      if (t < 0.4) return lerpPose(idle, getPoseDef('charge'), easeOut(clamp01(t / 0.3)));
      if (t < 0.55) return lerpPose(getPoseDef('charge'), getPoseDef('slash_w'), (t - 0.4) / 0.15);
      if (t < 0.75) return lerpPose(getPoseDef('slash_w'), getPoseDef('slash_s'), easeIn(clamp01((t - 0.55) / 0.1)));
      return lerpPose(getPoseDef('slash_s'), getPoseDef(VICTORY_BY_BODY[f.def.style.body] ?? 'victory_fist'), clamp01((t - 0.75) / 0.2));
    case 'physical': {
      const seq = ['jab_s', 'cross_s', 'round_s', 'hammer_s'];
      if (t < 0.7) {
        const k = Math.floor(t / 0.7 * seq.length);
        const inner = (t / 0.7 * seq.length) % 1;
        return lerpPose(getPoseDef(seq[Math.max(0, k - 1)]), getPoseDef(seq[Math.min(seq.length - 1, k)]), easeOut(clamp01(inner * 2)));
      }
      return lerpPose(getPoseDef('hammer_s'), getPoseDef(VICTORY_BY_BODY[f.def.style.body] ?? 'victory_fist'), clamp01((t - 0.7) / 0.25));
    }
    default:
      if (t < 0.3) return lerpPose(idle, getPoseDef('throw_w'), easeOut(clamp01(t / 0.3)));
      if (t < 0.6) return getPoseDef('throw_w');
      if (t < 0.7) return lerpPose(getPoseDef('throw_w'), getPoseDef('throw_s'), easeIn((t - 0.6) / 0.1));
      return lerpPose(getPoseDef('throw_s'), getPoseDef(VICTORY_BY_BODY[f.def.style.body] ?? 'victory_fist'), clamp01((t - 0.75) / 0.2));
  }
}

export interface PoseResult {
  pose: Pose;
  alpha: number;
  shake: number;
}

export function poseFor(f: Fighter, finisher: FinisherRun | null): PoseResult {
  const alpha = 1;
  let shake = 0;
  const body = f.def.style.body;
  const lying = POSES[LYING_BY_BODY[body] ?? 'lying'];

  if (finisher && finisher.winner === f.slot) {
    return { pose: finisherWinnerPose(f, finisher), alpha, shake };
  }

  switch (f.state) {
    case FighterState.IDLE:
      return { pose: idlePose(f.animTime), alpha, shake };
    case FighterState.WALK:
      return { pose: walkPose(f.animTime, f.walkDir), alpha, shake };
    case FighterState.CROUCH:
      return { pose: POSES.crouch, alpha, shake };
    case FighterState.JUMP: {
      const up = clamp01((f.vy + 12) / 24);
      const base = lerpPose(POSES.jump, { ...POSES.jump, legF: [0.45, 0.5], legB: [-0.15, 0.55], armF: [1.2, 0.9], armB: [0.8, 1.2] }, 1 - up);
      const lean = f.jumpDir * 0.18;
      return { pose: { ...base, torso: base.torso + lean, rot: lean * 0.6 }, alpha, shake };
    }
    case FighterState.ATTACK:
    case FighterState.SPECIAL:
    case FighterState.GRAB: {
      const m = f.move;
      let a = 1;
      if (m?.teleport && f.curFrame < m.teleport.frame) {
        const k = f.curFrame / Math.max(1, m.teleport.frame);
        a = Math.max(0.12, 1 - k * 1.2);
      } else if (m?.teleport && f.curFrame - m.teleport.frame < 6) {
        a = 0.4 + (f.curFrame - m.teleport.frame) / 6 * 0.6;
      }
      if (m?.charge && f.curFrame <= m.charge[1]) {
        shake = 2.5;
        return { pose: lerpPose(idlePose(f.animTime), POSES.charge, easeOut(clamp01(f.curFrame / 10))), alpha: a, shake };
      }
      if (f.state === FighterState.GRAB) {
        const p = clamp01(f.curFrame / Math.max(1, (m?.attack.startup ?? 6)));
        return { pose: lerpPose(idlePose(f.animTime), POSES.grab_w, easeOut(p)), alpha: a, shake };
      }
      return { pose: movePose(f), alpha: a, shake };
    }
    case FighterState.THROW:
      return { pose: throwPose(f), alpha, shake };
    case FighterState.BLOCK: {
      const base = f.blockLow ? POSES.blockLow : POSES.blockHigh;
      shake = f.blockstun > 0 ? Math.min(2.5, f.blockstun * 0.25) : 0;
      return { pose: base, alpha, shake };
    }
    case FighterState.HIT: {
      if (f.grabbedBy) {
        const g = f.grabbedBy;
        const t = g.throwFrame;
        const wob = Math.sin(t * 0.8) * 0.12;
        return { pose: { ...POSES.grabbed, torso: POSES.grabbed.torso + wob, rot: g.throwFrame > (g.throwData?.duration ?? 40) - 12 ? -0.4 : 0 }, alpha, shake: 1.5 };
      }
      shake = f.stateFrame < 6 ? 2 : 0;
      return { pose: f.hitCrouch ? POSES.hitLow : POSES.hitHigh, alpha, shake };
    }
    case FighterState.HURT: {
      const k = clamp01(1 - (f.vy + 12) / 24);
      return { pose: { ...POSES.hurtAir, rot: -0.35 - k * 0.9 }, alpha, shake };
    }
    case FighterState.KNOCKDOWN:
      return { pose: lying, alpha, shake };
    case FighterState.GETUP: {
      const k = clamp01(f.stateFrame / GETUP_FRAMES);
      if (k < 0.5) return { pose: lerpPose(lying, POSES.kneel, easeOut(k * 2)), alpha, shake };
      return { pose: lerpPose(POSES.kneel, idlePose(f.animTime), easeOut((k - 0.5) * 2)), alpha, shake };
    }
    case FighterState.DEAD:
      if (f.kneel) {
        const k = clamp01(f.stateFrame / 30);
        return { pose: lerpPose(lying, POSES.kneel, easeOut(k)), alpha, shake: 0 };
      }
      return { pose: lying, alpha, shake };
    case FighterState.VICTORY: {
      const base = POSES[VICTORY_BY_BODY[body] ?? 'victory_fist'];
      const k = clamp01(f.stateFrame / 14);
      return { pose: lerpPose(idlePose(f.animTime), base, easeOut(k)), alpha, shake };
    }
  }
  return { pose: idlePose(f.animTime), alpha, shake };
}
