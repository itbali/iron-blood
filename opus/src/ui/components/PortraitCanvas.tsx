import { useEffect, useRef } from 'react';
import type { CharacterDef } from '../../characters/CharacterDef';
import { FighterState } from '../../characters/FighterState';
import { drawFighterAt } from './fighterCanvas';

export interface PortraitCanvasProps {
  def: CharacterDef;
  width: number;
  height: number;
  /** World height (from feet) placed at the vertical centre. */
  focusY: number;
  zoom: number;
  facing?: 1 | -1;
  skin?: 'default' | 'alt';
  animate?: boolean;
  silhouette?: string;
  background?: 'none' | 'glow' | 'dark';
  glow?: string;
  state?: FighterState;
  className?: string;
  /** Horizontal position of the character as a fraction of the width. */
  cxRatio?: number;
}

/** Canvas that renders a character with the in-game procedural renderer (static or animated). */
export function PortraitCanvas(p: PortraitCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      ctx.clearRect(0, 0, p.width, p.height);
      if (p.background === 'dark' || p.background === 'glow') {
        const g = ctx.createRadialGradient(p.width / 2, p.height * 0.7, 10, p.width / 2, p.height * 0.6, p.width * 0.8);
        g.addColorStop(0, p.glow ?? 'rgba(213,31,43,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, p.width, p.height);
      }
      const scale = p.def.physique.scale;
      try {
        drawFighterAt(ctx, p.def, {
          cx: p.width * (p.cxRatio ?? 0.5),
          cy: p.height / 2,
          focusY: p.focusY * scale,
          zoom: p.zoom / Math.sqrt(scale),
          facing: p.facing ?? 1,
          skin: p.skin,
          silhouette: p.silhouette,
          time: p.animate ? now : 0,
          state: p.state ?? FighterState.IDLE,
          stateFrame: Math.floor((now - start) / 16.67),
        });
      } catch (err) {
        console.error('Portrait render failed', err);
      }
      if (p.animate) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [p.def, p.width, p.height, p.focusY, p.zoom, p.facing, p.skin, p.animate, p.silhouette, p.background, p.glow, p.state, p.cxRatio]);
  return <canvas ref={ref} width={p.width} height={p.height} className={p.className} />;
}
