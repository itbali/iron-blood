import { useEffect, useRef } from 'react';
import { CHARACTERS } from '@/data/characters';
import { drawFighter, evaluatePose } from '@/render/SpriteRenderer';

interface Puff {
  x: number;
  y: number;
  r: number;
  vx: number;
  a: number;
}

interface Spark {
  x: number;
  y: number;
  vy: number;
  vx: number;
  life: number;
}

/** Animated main-menu backdrop: drifting smoke, embers, metal texture, flickering red light and fighter silhouettes. */
export const MenuBackground = ({ reducedMotion }: { reducedMotion: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const puffs: Puff[] = Array.from({ length: 14 }, (_, i) => ({ x: Math.random() * 1920, y: 700 + Math.random() * 500, r: 200 + Math.random() * 260, vx: 0.15 + (i % 3) * 0.1, a: 0.05 + Math.random() * 0.05 }));
    const sparks: Spark[] = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    const silhouettes = [CHARACTERS.raven, CHARACTERS.brute, CHARACTERS.vera, CHARACTERS.titan];
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const s = w / 1920;
      t += reducedMotion ? 0 : 1;
      const flicker = 0.75 + Math.sin(t * 0.07) * 0.1 + (Math.random() < 0.02 ? 0.3 : 0);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#06070a');
      bg.addColorStop(1, '#14090c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      // Metal texture: subtle plates.
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 160 * s) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 40 * s, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 120 * s) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + 10 * s);
        ctx.stroke();
      }
      // Red ambient light from below.
      const light = ctx.createRadialGradient(w / 2, h * 1.05, 10, w / 2, h * 1.05, h * 0.9);
      light.addColorStop(0, `rgba(213,31,43,${0.35 * flicker})`);
      light.addColorStop(1, 'rgba(213,31,43,0)');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, w, h);
      // Fighter silhouettes.
      silhouettes.forEach((c, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const sx = w / 2 + side * (w * (0.3 + (i > 1 ? 0.14 : 0)));
        const sy = h * 0.96;
        const scale = (h * 0.75) / c.body.height;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(scale * -side, -scale);
        ctx.globalAlpha = i > 1 ? 0.35 : 0.6;
        drawFighter(ctx, evaluatePose('introStand', ((t + i * 20) % 90) / 90), { palette: c.palette, body: c.body, flat: '#05060a' });
        ctx.restore();
      });
      // Smoke.
      for (const p of puffs) {
        p.x += p.vx * s * (reducedMotion ? 0 : 1);
        if (p.x - p.r > 1920) p.x = -p.r;
        const g = ctx.createRadialGradient(p.x * s, p.y * s, 0, p.x * s, p.y * s, p.r * s);
        g.addColorStop(0, `rgba(120,110,120,${p.a})`);
        g.addColorStop(1, 'rgba(120,110,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect((p.x - p.r) * s, (p.y - p.r) * s, p.r * 2 * s, p.r * 2 * s);
      }
      // Embers.
      if (!reducedMotion && sparks.length < 70 && Math.random() < 0.5) sparks.push({ x: Math.random() * w, y: h + 10, vy: -(0.8 + Math.random() * 1.5) * s, vx: (Math.random() - 0.5) * 0.5 * s, life: 300 });
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i]!;
        sp.x += sp.vx + Math.sin((t + i) * 0.05) * 0.4;
        sp.y += sp.vy;
        sp.life--;
        if (sp.life <= 0 || sp.y < -10) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(255,120,60,${Math.min(1, sp.life / 100) * 0.8})`;
        ctx.fillRect(sp.x, sp.y, 2.5 * s, 2.5 * s);
      }
      ctx.globalCompositeOperation = 'source-over';
      // Vignette.
      const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);
  return <canvas ref={ref} className="menu-bg" />;
};
