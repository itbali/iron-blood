import type { CharacterDef } from '../../characters/CharacterDef';
import { Fighter } from '../../characters/Fighter';
import { FighterState } from '../../characters/FighterState';
import type { ViewTransform } from '../../render/Camera';
import { FighterRenderer } from '../../render/FighterRenderer';
import type { Pose } from '../../render/poses';

const renderer = new FighterRenderer();
const cache = new Map<string, Fighter>();

const fighterFor = (def: CharacterDef, skin: 'default' | 'alt'): Fighter => {
  const key = `${def.id}:${skin}`;
  let f = cache.get(key);
  if (!f) {
    f = new Fighter(def, 0);
    f.skin = skin;
    cache.set(key, f);
  }
  return f;
};

export interface PortraitOptions {
  /** World x/y that should appear at screen (cx, cy). */
  focusY: number;
  zoom: number;
  cx: number;
  cy: number;
  facing?: 1 | -1;
  skin?: 'default' | 'alt';
  silhouette?: string;
  time: number;
  state?: FighterState;
  stateFrame?: number;
  pose?: Pose;
  alpha?: number;
}

/** Draws a character outside of a fight (menus, select screen, gallery) using the same renderer. */
export const drawFighterAt = (ctx: CanvasRenderingContext2D, def: CharacterDef, o: PortraitOptions): void => {
  const f = fighterFor(def, o.skin ?? 'default');
  f.x = f.prevX = 0;
  f.y = f.prevY = 0;
  f.facing = o.facing ?? 1;
  f.state = o.state ?? FighterState.IDLE;
  f.stateFrame = o.stateFrame ?? Math.floor(o.time / 16);
  f.flash = 0;
  const z = o.zoom;
  const view: ViewTransform = {
    zoom: z,
    sx: (x) => o.cx + x * z,
    sy: (y) => o.cy - (y - o.focusY) * z,
  };
  renderer.draw(ctx, f, view, { alpha: o.alpha ?? 1, quality: 'high', time: o.time, interp: 1, silhouette: o.silhouette }, o.pose);
};
