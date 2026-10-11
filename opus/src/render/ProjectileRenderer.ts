import type { Projectile } from '../combat/Projectile';
import type { ViewTransform as Camera } from './Camera';
import type { FighterRenderer } from './FighterRenderer';
import { GUARDS, evalMoveAnim } from './poses';
import { withAlpha } from './color';

/** Draws projectiles in world space. Purely visual: reads Projectile state only. */
export class ProjectileRenderer {
  constructor(private readonly fighters: FighterRenderer) {}

  draw(ctx: CanvasRenderingContext2D, p: Projectile, cam: Camera, time: number, interp: number, quality: 'low' | 'medium' | 'high'): void {
    const d = p.def;
    const x = cam.sx(p.x - (1 - interp) * (p.telegraph > 0 ? 0 : p.vx));
    const y = cam.sy(p.def.grounded || p.def.targeted ? 0 : p.y);
    const z = cam.zoom;
    const f = p.facing;
    ctx.save();
    switch (d.visual) {
      case 'crescent': {
        ctx.translate(x, y);
        ctx.scale(f * z, z);
        ctx.globalCompositeOperation = 'lighter';
        if (quality !== 'low') {
          ctx.shadowColor = d.color;
          ctx.shadowBlur = 22;
        }
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.moveTo(-6, -52);
        ctx.quadraticCurveTo(40, 0, -6, 52);
        ctx.quadraticCurveTo(18, 0, -6, -52);
        ctx.fill();
        ctx.fillStyle = '#ffe2e6';
        ctx.beginPath();
        ctx.moveTo(4, -38);
        ctx.quadraticCurveTo(32, 0, 4, 38);
        ctx.quadraticCurveTo(18, 0, 4, -38);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = d.color;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-6 - i * 16, -46);
          ctx.quadraticCurveTo(30 - i * 16, 0, -6 - i * 16, 46);
          ctx.quadraticCurveTo(12 - i * 16, 0, -6 - i * 16, -46);
          ctx.fill();
        }
        break;
      }
      case 'bolt':
      case 'needle':
      case 'lance': {
        const len = d.visual === 'needle' ? 40 : d.visual === 'lance' ? 110 : 60;
        const th = d.visual === 'needle' ? 3 : d.visual === 'lance' ? 10 : 16;
        ctx.translate(x, y);
        ctx.scale(f * z, z);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(-len, 0, len * 0.5, 0);
        g.addColorStop(0, withAlpha(d.color, 0));
        g.addColorStop(0.7, d.color);
        g.addColorStop(1, '#ffffff');
        ctx.fillStyle = g;
        if (quality !== 'low') {
          ctx.shadowColor = d.color;
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len * 0.1, -th);
        ctx.lineTo(len * 0.5, 0);
        ctx.lineTo(len * 0.1, th);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'orb': {
        if (d.id === 'brute-boulder') {
          ctx.translate(x, y);
          ctx.rotate(time * 0.01 * f);
          ctx.fillStyle = '#4e4236';
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const r = (26 + (i % 3) * 4) * z;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.fill();
          ctx.fillStyle = '#6b5a48';
          ctx.fillRect(-8 * z, -10 * z, 12 * z, 8 * z);
          break;
        }
        const r = 30 * z * (1 + Math.sin(time * 0.02) * 0.08);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, d.color);
        g.addColorStop(1, withAlpha(d.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'wave': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = d.color;
        for (let i = 0; i < 5; i++) {
          const ox = (i - 2) * 14 * z;
          const h = (30 + Math.sin(time * 0.05 + i * 1.3) * 14) * z;
          ctx.globalAlpha = 0.8 - Math.abs(i - 2) * 0.15;
          ctx.beginPath();
          ctx.moveTo(x + ox - 9 * z, y);
          ctx.lineTo(x + ox, y - h);
          ctx.lineTo(x + ox + 9 * z, y);
          ctx.fill();
        }
        break;
      }
      case 'pillar': {
        const w = d.w * z;
        if (p.telegraph > 0) {
          const k = 1 - p.telegraph / (d.telegraph ?? 1);
          ctx.strokeStyle = withAlpha(d.color, 0.4 + k * 0.5);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(x, y, w * (0.3 + k * 0.7), 10 * z, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = withAlpha(d.color, 0.15 * k);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          const h = d.h * z;
          const fade = 1 - p.frame / ((d.telegraph ?? 0) + d.lifetime);
          const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
          g.addColorStop(0, withAlpha(d.color, 0));
          g.addColorStop(0.5, '#ffffff');
          g.addColorStop(1, withAlpha(d.color, 0));
          ctx.globalAlpha = Math.max(0, fade);
          ctx.fillStyle = g;
          ctx.fillRect(x - w / 2, y - h, w, h);
          ctx.fillStyle = withAlpha(d.color, 0.5);
          ctx.fillRect(x - w, y - h, w * 2, h);
        }
        break;
      }
      case 'phantom': {
        const owner = p.owner;
        const g = GUARDS[owner.def.visual.idleStyle];
        const pose = evalMoveAnim('claw', g, 'active', 0, 0);
        ctx.restore();
        this.fighters.draw(
          ctx,
          owner,
          cam,
          { alpha: 0.55 + Math.sin(time * 0.03) * 0.1, silhouette: d.color, quality, time, interp },
          pose,
          { x: p.x, y: 0, facing: p.facing },
        );
        return;
      }
      case 'fist': {
        ctx.translate(x, y);
        ctx.scale(f * z, z);
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(-26, -16, 44, 32);
        ctx.fillStyle = '#b9a46a';
        ctx.fillRect(14, -18, 16, 36);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(-34, 0, 0, -34, 0, 40);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, d.color);
        g.addColorStop(1, withAlpha(d.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(-44, 0, 40 + Math.random() * 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}
