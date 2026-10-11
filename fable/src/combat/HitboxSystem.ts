import type { Facing, Rect, WorldBox } from '@/core/types';
import type { Fighter } from './Fighter';
import { FighterState } from './FighterState';

export type BoxKind = 'hit' | 'hurt' | 'push';

export interface DebugBox extends WorldBox {
  kind: BoxKind;
}

/** Converts a local rect (center-based, facing right) to a world box. */
export const toWorldBox = (rect: Rect, x: number, y: number, facing: Facing): WorldBox => {
  const cx = x + rect.x * facing;
  const cy = y + rect.y;
  return {
    left: cx - rect.w / 2,
    right: cx + rect.w / 2,
    bottom: cy - rect.h / 2,
    top: cy + rect.h / 2,
  };
};

export const boxesOverlap = (a: WorldBox, b: WorldBox): boolean =>
  a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom;

export const overlapCenter = (a: WorldBox, b: WorldBox): { x: number; y: number } => ({
  x: (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2,
  y: (Math.max(a.bottom, b.bottom) + Math.min(a.top, b.top)) / 2,
});

export const getHurtboxes = (f: Fighter): WorldBox[] => {
  if (f.isInvulnerable && f.state !== FighterState.DEAD && f.state !== FighterState.FINISHED) return [];
  let rects: Rect[];
  if (f.state === FighterState.DEAD || f.state === FighterState.KNOCKDOWN || f.state === FighterState.FINISHED) rects = f.config.hurtboxes.down;
  else if (f.airborne || f.state === FighterState.HURT) rects = f.config.hurtboxes.air;
  else if (f.stance === 'crouch') rects = f.config.hurtboxes.crouch;
  else rects = f.config.hurtboxes.stand;
  return rects.map((r) => toWorldBox(r, f.x, f.y, f.facing));
};

export const getHitboxes = (f: Fighter): WorldBox[] => {
  if (!f.hitboxesActive || !f.currentAttack) return [];
  return f.currentAttack.hitboxes.map((r) => toWorldBox(r, f.x, f.y, f.facing));
};

export const getPushbox = (f: Fighter): WorldBox => {
  const { w, h } = f.config.pushbox;
  const height = f.stance === 'crouch' ? h * 0.6 : h;
  return { left: f.x - w / 2, right: f.x + w / 2, bottom: f.y, top: f.y + height };
};

export const collectDebugBoxes = (f: Fighter): DebugBox[] => [
  { ...getPushbox(f), kind: 'push' },
  ...getHurtboxes(f).map((b) => ({ ...b, kind: 'hurt' as const })),
  ...getHitboxes(f).map((b) => ({ ...b, kind: 'hit' as const })),
];
