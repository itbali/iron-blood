import type { Box } from '../core/math';
import { boxesOverlap } from '../core/math';
import type { HitboxDef } from './AttackData';

export type HurtboxPart = 'head' | 'body' | 'legs';
export interface Hurtbox extends Box {
  part: HurtboxPart;
}

/** Converts a local (facing-right) box into world space for a fighter at (x, y) with the given facing. */
export const toWorldBox = (local: HitboxDef, x: number, y: number, facing: 1 | -1, scale: number): Box => {
  const w = local.w * scale;
  const h = local.h * scale;
  const lx = local.x * scale;
  return {
    x: facing === 1 ? x + lx : x - lx - w,
    y: y + local.y * scale,
    w,
    h,
  };
};

const STAND_HURT: { part: HurtboxPart; box: HitboxDef }[] = [
  { part: 'head', box: { x: -17, y: 148, w: 36, h: 34 } },
  { part: 'body', box: { x: -27, y: 76, w: 56, h: 76 } },
  { part: 'legs', box: { x: -29, y: 0, w: 60, h: 78 } },
];
const CROUCH_HURT: { part: HurtboxPart; box: HitboxDef }[] = [
  { part: 'head', box: { x: -4, y: 86, w: 34, h: 32 } },
  { part: 'body', box: { x: -28, y: 40, w: 60, h: 50 } },
  { part: 'legs', box: { x: -32, y: 0, w: 66, h: 42 } },
];
const AIR_HURT: { part: HurtboxPart; box: HitboxDef }[] = [
  { part: 'head', box: { x: -16, y: 120, w: 34, h: 34 } },
  { part: 'body', box: { x: -28, y: 50, w: 58, h: 74 } },
  { part: 'legs', box: { x: -24, y: 6, w: 52, h: 48 } },
];
const LYING_HURT: { part: HurtboxPart; box: HitboxDef }[] = [{ part: 'body', box: { x: -70, y: 0, w: 140, h: 34 } }];
/** Extended limb hurtbox while attacking: whiffed attacks can be punished on their extended hitbox. */
const LIMB_EXTENSION = 0.6;

export type HurtStance = 'stand' | 'crouch' | 'air' | 'lying';

const HURT_TABLE: Record<HurtStance, { part: HurtboxPart; box: HitboxDef }[]> = {
  stand: STAND_HURT,
  crouch: CROUCH_HURT,
  air: AIR_HURT,
  lying: LYING_HURT,
};

export const buildHurtboxes = (
  stance: HurtStance,
  x: number,
  y: number,
  facing: 1 | -1,
  scale: number,
  attackBoxes: HitboxDef[] = [],
): Hurtbox[] => {
  const out: Hurtbox[] = HURT_TABLE[stance].map((h) => ({ ...toWorldBox(h.box, x, y, facing, scale), part: h.part }));
  for (const a of attackBoxes) {
    if (a.x < 0) continue;
    const ext: HitboxDef = { x: a.x, y: a.y + a.h * 0.2, w: a.w * LIMB_EXTENSION, h: a.h * 0.6 };
    out.push({ ...toWorldBox(ext, x, y, facing, scale), part: 'body' });
  }
  return out;
};

/** Returns the overlap centre of the first hitbox/hurtbox pair that intersects, or null. */
export const findOverlap = (hitboxes: Box[], hurtboxes: Box[]): { x: number; y: number } | null => {
  for (const hit of hitboxes) {
    for (const hurt of hurtboxes) {
      if (boxesOverlap(hit, hurt)) {
        const x0 = Math.max(hit.x, hurt.x);
        const x1 = Math.min(hit.x + hit.w, hurt.x + hurt.w);
        const y0 = Math.max(hit.y, hurt.y);
        const y1 = Math.min(hit.y + hit.h, hurt.y + hurt.h);
        return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
      }
    }
  }
  return null;
};

export const isActiveFrame = (frame: number, startup: number, active: number): boolean =>
  frame >= startup && frame < startup + active;

export const hitboxActiveAt = (hb: HitboxDef, frame: number, startup: number, active: number): boolean => {
  if (!isActiveFrame(frame, startup, active)) return false;
  const offset = frame - startup;
  return (hb.from === undefined || offset >= hb.from) && (hb.to === undefined || offset <= hb.to);
};
