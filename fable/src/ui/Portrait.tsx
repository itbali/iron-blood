import { useEffect, useRef } from 'react';
import type { CharacterConfig, CharacterPalette } from '@/characters/CharacterConfig';
import { drawFighter, evaluatePose, hexAlpha } from '@/render/SpriteRenderer';

interface Props {
  config: CharacterConfig;
  anim?: string;
  t?: number;
  size?: number;
  className?: string;
  glow?: boolean;
  animate?: boolean;
  mirrored?: boolean;
  palette?: CharacterPalette;
}

/** Procedural character portrait rendered on a small canvas (used by menus and HUD). */
export const Portrait = ({ config, anim = 'idle', t = 0, size = 240, className, glow = true, animate = false, mirrored = false, palette }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let frame = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (glow) {
        const g = ctx.createRadialGradient(w / 2, h * 0.65, 10, w / 2, h * 0.65, w * 0.6);
        g.addColorStop(0, hexAlpha(config.palette.glow, 0.28));
        g.addColorStop(1, hexAlpha(config.palette.glow, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      const scale = (h * 0.82) / config.body.height;
      ctx.save();
      ctx.translate(w / 2 - 6 * scale, h * 0.93);
      ctx.scale(scale * (mirrored ? -1 : 1), -scale);
      const tt = animate ? ((frame % 70) / 70) : t;
      drawFighter(ctx, evaluatePose(anim, animate ? Math.sin(tt * Math.PI * 2) * 0.5 + 0.5 : tt), { palette: palette ?? config.palette, body: config.body });
      ctx.restore();
      if (animate) {
        frame++;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [config, anim, t, glow, animate, mirrored, palette]);
  return <canvas ref={ref} width={size} height={size * 1.25} className={className} />;
};
