import { useEffect, useRef } from 'react';
import { Fighter } from '../characters/Fighter';
import { getCharacter } from '../data/characters';
import { FighterRenderer } from '../scenes/render/FighterRenderer';
import { FighterState } from '../combat/types';

let shared: FighterRenderer | null = null;
const dummies = new Map<string, Fighter>();

function fighterFor(charId: string, skin: string): Fighter {
  const key = `${charId}:${skin}`;
  let f = dummies.get(key);
  if (!f) {
    f = new Fighter(0, getCharacter(charId), skin);
    dummies.set(key, f);
  }
  return f;
}

interface Props {
  charId: string;
  skin?: string;
  width?: number;
  height?: number;
  /** 0..1 how much of the 820px render buffer height maps to the canvas. */
  zoom?: number;
  facing?: 1 | -1;
  silhouette?: boolean;
  state?: FighterState;
  className?: string;
  pulse?: boolean;
}

/** Small animated idle render of a fighter, used by menus. */
export function Portrait({ charId, skin = 'default', width = 240, height = 300, zoom = 1, facing = 1, silhouette = false, state = FighterState.IDLE, className, pulse = true }: Props): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (!shared) shared = new FighterRenderer();
    const f = fighterFor(charId, skin);
    let raf = 0;
    let t = 0;
    const draw = (): void => {
      t++;
      f.state = state;
      f.animTime = t * 2;
      f.facing = facing;
      f.kneel = false;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== width * dpr) {
        cv.width = width * dpr;
        cv.height = height * dpr;
      }
      const scale = zoom * ((height * 0.8) / 270) * dpr;
      const rf = shared!.render(f, null, scale, t, silhouette ? '#05060a' : null);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const cw = rf.canvas.width;
      const ch = rf.canvas.height;
      ctx.drawImage(rf.canvas, cv.width / 2 - rf.anchorX, cv.height - rf.anchorY - 8 * dpr, cw, ch);
      raf = pulse ? requestAnimationFrame(draw) : 0;
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [charId, skin, width, height, zoom, facing, silhouette, state, pulse]);
  return <canvas ref={ref} className={className} style={{ width, height }} />;
}
