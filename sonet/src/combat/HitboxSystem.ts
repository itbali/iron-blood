import type { Box } from './types';

/** World-space rectangle (y up). */
export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function toWorld(box: Box, x: number, y: number, facing: 1 | -1): Rect {
  const left = facing === 1 ? x + box.x : x - (box.x + box.w);
  return { x1: left, y1: y + box.y, x2: left + box.w, y2: y + box.y + box.h };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

export function anyOverlap(hit: Rect[], hurt: Rect[]): boolean {
  for (let i = 0; i < hit.length; i++) {
    for (let j = 0; j < hurt.length; j++) {
      if (overlaps(hit[i], hurt[j])) return true;
    }
  }
  return false;
}

export function contactPoint(hit: Rect[], hurt: Rect[]): { x: number; y: number } {
  for (let i = 0; i < hit.length; i++) {
    for (let j = 0; j < hurt.length; j++) {
      const a = hit[i];
      const b = hurt[j];
      if (overlaps(a, b)) {
        return {
          x: (Math.max(a.x1, b.x1) + Math.min(a.x2, b.x2)) / 2,
          y: (Math.max(a.y1, b.y1) + Math.min(a.y2, b.y2)) / 2,
        };
      }
    }
  }
  return { x: hit[0] ? (hit[0].x1 + hit[0].x2) / 2 : 0, y: hit[0] ? (hit[0].y1 + hit[0].y2) / 2 : 0 };
}
