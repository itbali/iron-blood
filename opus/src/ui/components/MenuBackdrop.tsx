import { useEffect, useRef } from 'react';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../core/constants';
import { BRUTE } from '../../characters/Brute';
import { RAVEN } from '../../characters/Raven';
import type { CharacterDef } from '../../characters/CharacterDef';
import { drawFighterAt } from './fighterCanvas';

interface Smoke {
  x: number;
  y: number;
  r: number;
  v: number;
  a: number;
}

const buildMetal = (): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d0f13';
  g.fillRect(0, 0, 640, 360);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * 360;
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
    g.fillRect(Math.random() * 640, y, 20 + Math.random() * 80, 1);
  }
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  for (let x = 0; x < 640; x += 160) {
    g.strokeRect(x + 0.5, 0.5, 160, 360);
    for (const y of [12, 348]) {
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.beginPath();
      g.arc(x + 12, y, 2.5, 0, Math.PI * 2);
      g.arc(x + 148, y, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
};

/** Animated menu background: brushed metal, smoke, embers, flashes and two fighter silhouettes. */
export function MenuBackdrop({ fighters = [RAVEN, BRUTE], intensity = 1 }: { fighters?: [CharacterDef, CharacterDef]; intensity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const metal = buildMetal();
    const smoke: Smoke[] = Array.from({ length: 14 }, () => ({
      x: Math.random() * VIEW_WIDTH,
      y: 300 + Math.random() * 500,
      r: 120 + Math.random() * 220,
      v: 0.1 + Math.random() * 0.3,
      a: 0.04 + Math.random() * 0.06,
    }));
    const embers = Array.from({ length: 80 }, () => ({ x: Math.random() * VIEW_WIDTH, y: Math.random() * VIEW_HEIGHT, v: 0.4 + Math.random() * 1.4, p: Math.random() * 10 }));
    let flash = 0;
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(metal, 0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      const amb = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT * 1.05, 40, VIEW_WIDTH / 2, VIEW_HEIGHT, VIEW_WIDTH * 0.75);
      amb.addColorStop(0, `rgba(213,31,43,${0.42 * intensity})`);
      amb.addColorStop(0.5, 'rgba(110,10,18,0.18)');
      amb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      // Fighter silhouettes with red rim glow.
      const t = now;
      fighters.forEach((def, i) => {
        const cx = i === 0 ? 250 : VIEW_WIDTH - 250;
        const glow = ctx.createRadialGradient(cx, 470, 20, cx, 470, 330);
        glow.addColorStop(0, `rgba(213,31,43,${0.28 * intensity})`);
        glow.addColorStop(1, 'rgba(213,31,43,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 330, 140, 660, 660);
        drawFighterAt(ctx, def, { cx, cy: 360, focusY: 120, zoom: 2.4 / def.physique.scale, facing: i === 0 ? 1 : -1, silhouette: '#5a0a12', time: t, alpha: 0.9 });
        drawFighterAt(ctx, def, { cx: cx + (i === 0 ? -3 : 3), cy: 362, focusY: 120, zoom: 2.4 / def.physique.scale, facing: i === 0 ? 1 : -1, silhouette: '#07080b', time: t });
      });

      for (const s of smoke) {
        s.x += s.v * dt;
        if (s.x - s.r > VIEW_WIDTH) s.x = -s.r;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(70,70,80,${s.a})`);
        g.addColorStop(1, 'rgba(70,70,80,0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        e.y -= e.v * dt;
        e.x += Math.sin(now * 0.001 + e.p) * 0.5 * dt;
        if (e.y < -10) {
          e.y = VIEW_HEIGHT + 10;
          e.x = Math.random() * VIEW_WIDTH;
        }
        ctx.fillStyle = `rgba(255,${90 + (e.p % 5) * 20},50,${0.4 + Math.sin(now * 0.008 + e.p) * 0.3})`;
        ctx.fillRect(e.x, e.y, 2, 2);
      }
      if (Math.random() < 0.004 * dt) flash = 1;
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,60,70,${flash * 0.12})`;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        flash -= 0.06 * dt;
      }
      ctx.globalCompositeOperation = 'source-over';
      const vig = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 200, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 780);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fighters, intensity]);
  return <canvas ref={ref} className="fill" width={VIEW_WIDTH} height={VIEW_HEIGHT} />;
}
