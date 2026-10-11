import type { CharacterDef, CharacterVisual } from '../characters/CharacterDef';
import type { Fighter } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { GETUP_FRAMES } from '../core/constants';
import { clamp, lerp } from '../core/math';
import type { ViewTransform as Camera } from './Camera';
import { shade } from './color';
import type { AnimPhase, Pose } from './poses';
import {
  CROUCH_POSE,
  DEFEAT_POSES,
  evalLockAnim,
  evalMoveAnim,
  GUARDS,
  lerpPose,
  lyingPose,
  REACTIONS,
  VICTORY_POSES,
} from './poses';

const DEG = Math.PI / 180;

interface P {
  x: number;
  y: number;
}

interface Skeleton {
  hip: P;
  chest: P;
  neck: P;
  head: P;
  shF: P;
  shB: P;
  elF: P;
  haF: P;
  elB: P;
  haB: P;
  hipF: P;
  hipB: P;
  knF: P;
  ftF: P;
  knB: P;
  ftB: P;
  torsoAngle: number;
  headAngle: number;
}

export interface DrawOptions {
  alpha: number;
  /** Solid colour silhouette (afterimages, phantom projectile). */
  silhouette?: string;
  quality: 'low' | 'medium' | 'high';
  time: number;
  /** 0..1 interpolation factor between previous and current simulation frame. */
  interp: number;
}

const dirOf = (deg: number): P => ({ x: Math.sin(deg * DEG), y: -Math.cos(deg * DEG) });

/**
 * Procedural skeletal renderer. Builds a pose from the fighter's state machine and
 * draws a stylised character from its CharacterVisual. It only *reads* fighter state,
 * so it can be replaced by a sprite-sheet renderer without touching combat code.
 */
export class FighterRenderer {
  computePose(f: Fighter, time: number): Pose {
    const v = f.def.visual;
    const g = GUARDS[v.idleStyle];
    if (f.lockAnim) return evalLockAnim(f.lockAnim, g, f.lockAnimFrame);
    const t = f.stateFrame;
    switch (f.state) {
      case FighterState.INTRO:
        return Math.abs(f.vx) > 0.3 ? this.walkPose(g, f) : this.idlePose(g, f, time);
      case FighterState.IDLE:
        return this.idlePose(g, f, time);
      case FighterState.WALK:
        return this.walkPose(g, f);
      case FighterState.CROUCH:
        return CROUCH_POSE(g);
      case FighterState.JUMP: {
        const tuck = clamp(1 - Math.abs(f.vy) / 14, 0, 1);
        return { ...g, aF: [60, 100], aB: [40, 110], lF: [40 + tuck * 50, 40 + tuck * 90], lB: [0 + tuck * 30, 30 + tuck * 80], ground: false, lean: 10 };
      }
      case FighterState.BLOCK:
        return f.crouching
          ? { ...CROUCH_POSE(g), aF: [70, 120], aB: [60, 125], lean: 20, head: 14 }
          : { ...g, aF: [55, 125], aB: [45, 128], lean: -4, head: 10, hipX: f.stun > 0 ? -3 : 0 };
      case FighterState.ATTACK:
      case FighterState.SPECIAL:
      case FighterState.GRAB:
      case FighterState.THROW: {
        const m = f.move;
        if (!m) return g;
        const fr = f.moveFrame;
        let phase: AnimPhase;
        let p: number;
        if (fr < m.startup) {
          phase = 'startup';
          p = fr / Math.max(1, m.startup);
        } else if (fr < m.startup + m.active) {
          phase = 'active';
          p = (fr - m.startup) / Math.max(1, m.active);
        } else {
          phase = 'recovery';
          p = (fr - m.startup - m.active) / Math.max(1, m.recovery);
        }
        const base = m.stance === 'crouch' && !['uppercut', 'sweep'].includes(m.anim) ? CROUCH_POSE(g) : g;
        const pose = evalMoveAnim(m.anim, base, phase, p, fr);
        if (m.stance === 'air' || f.y > 2) pose.ground = false;
        return pose;
      }
      case FighterState.HIT:
        return f.crouching ? { ...REACTIONS.hit(CROUCH_POSE(g), t) } : REACTIONS.hit(g, t);
      case FighterState.HURT: {
        const spin = clamp(-f.vy * 3 + 30, -20, 80);
        return { ...g, rot: spin, lean: -20, head: -30, aF: [140, 20], aB: [-30, 30], lF: [40, 50], lB: [-10, 40], ground: false };
      }
      case FighterState.KNOCKDOWN:
        return lyingPose(g);
      case FighterState.GETUP: {
        const p = Math.min(1, t / GETUP_FRAMES);
        return p < 0.5 ? lerpPose(lyingPose(g), CROUCH_POSE(g), p * 2) : lerpPose(CROUCH_POSE(g), g, (p - 0.5) * 2);
      }
      case FighterState.THROWN:
        return REACTIONS.grabbed(g, t);
      case FighterState.DAZED:
        return REACTIONS.dazed(g, t);
      case FighterState.DEAD: {
        if (f.finisherOutcome === 'disintegrate') return REACTIONS.dissolve(g, f.outcomeFrame);
        if (f.defeatPose) return (DEFEAT_POSES[v.defeatPose] ?? DEFEAT_POSES.kneel)(g);
        return lyingPose(g, f.finisherOutcome === 'collapse');
      }
      case FighterState.VICTORY:
        return (VICTORY_POSES[v.victoryPose] ?? VICTORY_POSES.arms_crossed)(g, t);
      default:
        return g;
    }
  }

  private idlePose(g: Pose, f: Fighter, time: number): Pose {
    const b = Math.sin(time * 0.0035 + f.index * 1.7);
    const style = f.def.visual.idleStyle;
    const amp = style === 'brute' ? 2.2 : style === 'mech' ? 0.6 : 1.2;
    return {
      ...g,
      lean: g.lean + b * amp,
      hipY: g.hipY + (style === 'phantom' ? 6 + b * 6 : b * amp),
      aF: [g.aF[0] + b * 3 * amp, g.aF[1] - b * 4],
      aB: [g.aB[0] - b * 2 * amp, g.aB[1] + b * 3],
    };
  }

  private walkPose(g: Pose, f: Fighter): Pose {
    const style = f.def.visual.idleStyle;
    const stride = style === 'brute' || style === 'mech' || style === 'tyrant' ? 0.03 : 0.045;
    const ph = f.x * stride * f.facing;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    if (style === 'phantom') return { ...g, lean: g.lean + 6 * Math.sign(f.vx * f.facing), hipY: g.hipY + 8 + s * 3 };
    const sw = style === 'mech' ? 18 : 26;
    return {
      ...g,
      hipY: g.hipY + Math.abs(c) * 3,
      lean: g.lean + (style === 'brute' ? s * 4 : 2),
      lF: [s * sw + 4, 14 + Math.max(0, c) * 34],
      lB: [-s * sw - 4, 14 + Math.max(0, -c) * 34],
      aF: [g.aF[0] - s * 6, g.aF[1]],
      aB: [g.aB[0] + s * 6, g.aB[1]],
    };
  }

  /** Forward kinematics with optional floor lock so crouches never float or sink. */
  solve(pose: Pose, def: CharacterDef): Skeleton {
    const b = def.visual.build;
    const legLen = b.thigh + b.shin;
    const hip: P = { x: pose.hipX, y: legLen + pose.hipY };
    const tDir = { x: Math.sin(pose.lean * DEG), y: Math.cos(pose.lean * DEG) };
    const chest: P = { x: hip.x + tDir.x * b.torso, y: hip.y + tDir.y * b.torso };
    const neck: P = { x: chest.x + tDir.x * 6, y: chest.y + tDir.y * 6 };
    const hd = { x: Math.sin((pose.lean + pose.head * 0.6) * DEG), y: Math.cos((pose.lean + pose.head * 0.6) * DEG) };
    const head: P = { x: neck.x + hd.x * b.headR * 1.05, y: neck.y + hd.y * b.headR * 1.05 };
    const shoulderOff = b.shoulderW * 0.35;
    const shF: P = { x: chest.x + tDir.y * shoulderOff * 0.4, y: chest.y - 4 };
    const shB: P = { x: chest.x - tDir.y * shoulderOff * 0.4, y: chest.y - 2 };
    const limb = (start: P, a: [number, number], l1: number, l2: number, knee: boolean): [P, P] => {
      const d1 = dirOf(a[0]);
      const j: P = { x: start.x + d1.x * l1, y: start.y + d1.y * l1 };
      const d2 = dirOf(knee ? a[0] - a[1] : a[0] + a[1]);
      return [j, { x: j.x + d2.x * l2, y: j.y + d2.y * l2 }];
    };
    const [elF, haF] = limb(shF, pose.aF, b.upperArm, b.foreArm, false);
    const [elB, haB] = limb(shB, pose.aB, b.upperArm, b.foreArm, false);
    const hipF: P = { x: hip.x + 3, y: hip.y };
    const hipB: P = { x: hip.x - 3, y: hip.y };
    const [knF, ftF] = limb(hipF, pose.lF, b.thigh, b.shin, true);
    const [knB, ftB] = limb(hipB, pose.lB, b.thigh, b.shin, true);

    const sk: Skeleton = { hip, chest, neck, head, shF, shB, elF, haF, elB, haB, hipF, hipB, knF, ftF, knB, ftB, torsoAngle: pose.lean, headAngle: pose.head };
    const pts = [sk.hip, sk.chest, sk.neck, sk.head, sk.shF, sk.shB, sk.elF, sk.haF, sk.elB, sk.haB, sk.hipF, sk.hipB, sk.knF, sk.ftF, sk.knB, sk.ftB];
    if (pose.rot) {
      const r = -pose.rot * DEG;
      const cs = Math.cos(r);
      const sn = Math.sin(r);
      for (const p of pts) {
        const dx = p.x - hip.x;
        const dy = p.y - hip.y;
        p.x = hip.x + dx * cs - dy * sn;
        p.y = hip.y + dx * sn + dy * cs;
      }
      sk.torsoAngle += pose.rot;
    }
    if (pose.ground) {
      const lying = Math.abs(pose.rot) > 45;
      const cands = lying ? pts : [sk.ftF, sk.ftB, sk.knF, sk.knB];
      let minY = Infinity;
      for (const p of cands) minY = Math.min(minY, p.y);
      const shift = lying ? -minY + b.headR * 0.6 : -minY;
      for (const p of pts) p.y += shift;
    }
    return sk;
  }

  drawShadow(ctx: CanvasRenderingContext2D, f: Fighter, cam: Camera, interp: number): void {
    const x = lerp(f.prevX, f.x, interp);
    const y = lerp(f.prevY, f.y, interp);
    const s = f.scale * cam.zoom;
    const h = clamp(1 - y / 300, 0.3, 1);
    const lying = f.state === FighterState.KNOCKDOWN || f.state === FighterState.DEAD;
    ctx.fillStyle = `rgba(0,0,0,${0.45 * h})`;
    ctx.beginPath();
    ctx.ellipse(cam.sx(x), cam.sy(0) + 2, (lying ? 90 : 48) * s * h, 9 * s * h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx: CanvasRenderingContext2D, f: Fighter, cam: Camera, o: DrawOptions, poseOverride?: Pose, at?: { x: number; y: number; facing: 1 | -1 }): void {
    const pose = poseOverride ?? this.computePose(f, o.time);
    const alpha = o.alpha * pose.alpha;
    if (alpha <= 0.01) return;
    const x = at ? at.x : lerp(f.prevX, f.x, o.interp);
    const y = at ? at.y : lerp(f.prevY, f.y, o.interp);
    const facing = at ? at.facing : f.facing;
    const sk = this.solve({ ...pose }, f.def);
    const scale = f.scale * cam.zoom;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cam.sx(x), cam.sy(y));
    ctx.scale(facing * scale, -scale);
    const flashing = !o.silhouette && f.flash > 0 && f.flash % 4 < 2;
    const pal = this.palette(f.def.visual, f.skin, f.phase2 ? f.def.boss?.phase2Glow : undefined);
    const col = (c: string, dark = 0): string => (o.silhouette ? o.silhouette : flashing ? (f.flash > 4 ? '#ffffff' : '#ffb3b3') : dark ? shade(c, dark) : c);
    this.drawBody(ctx, f.def, sk, pose, pal, col, o, f.state === FighterState.DEAD && f.finisherOutcome === 'shatter');
    ctx.restore();
  }

  private palette(v: CharacterVisual, skin: 'default' | 'alt', glowOverride?: string): CharacterVisual['palette'] {
    const p = skin === 'alt' ? { ...v.palette, ...v.altPalette } : v.palette;
    return glowOverride ? { ...p, glow: glowOverride } : p;
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    def: CharacterDef,
    sk: Skeleton,
    pose: Pose,
    pal: CharacterVisual['palette'],
    col: (c: string, dark?: number) => string,
    o: DrawOptions,
    wounded: boolean,
  ): void {
    const v = def.visual;
    const b = v.build;
    const ex = new Set(v.extras);
    const bareArms = v.head === 'bald' || v.head === 'topknot';
    const metal = ex.has('mechPlates');
    const armColor = metal ? pal.secondary : bareArms ? pal.skin : pal.primary;
    const foreColor = metal ? pal.secondary : bareArms ? pal.skin : pal.secondary;
    const legColor = pal.primary;
    const bootColor = pal.secondary;
    const glowOn = !o.silhouette;
    const t = o.time;

    // Cape / tatters behind everything.
    if (ex.has('cape') || ex.has('tatters')) {
      const wave = Math.sin(t * 0.004) * 6;
      ctx.fillStyle = col(ex.has('tatters') ? pal.primary : pal.secondary, -0.25);
      ctx.beginPath();
      ctx.moveTo(sk.shB.x - 6, sk.shB.y + 4);
      ctx.lineTo(sk.shF.x + 2, sk.shF.y + 4);
      ctx.lineTo(sk.hip.x - 10 + wave, sk.knB.y - 10);
      const tips = 5;
      for (let i = 0; i <= tips; i++) {
        const px = sk.hip.x - 14 - i * 9 + wave * (1 + i * 0.3);
        const py = Math.max(4, Math.min(sk.knB.y, sk.knF.y) - 18 + (i % 2 ? 14 : 0));
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Back limbs (darker).
    this.limb(ctx, sk.shB, sk.elB, b.armW * 1.05, b.armW * 0.9, col(armColor, -0.35));
    this.limb(ctx, sk.elB, sk.haB, b.armW * 0.95, b.armW * 0.85, col(ex.has('cyberArm') ? pal.trim : foreColor, -0.35));
    this.fist(ctx, sk.haB, b.armW * 0.5, col(bareArms ? pal.skin : pal.secondary, -0.35));
    this.limb(ctx, sk.hipB, sk.knB, b.legW * 1.15, b.legW * 0.95, col(legColor, -0.35));
    this.limb(ctx, sk.knB, sk.ftB, b.legW * 0.95, b.legW * 0.8, col(bootColor, -0.35));
    this.foot(ctx, sk.knB, sk.ftB, b.legW, col(bootColor, -0.45));

    // Torso.
    this.torso(ctx, sk, b, col, pal, ex, glowOn);

    // Head.
    this.head(ctx, sk, b.headR, v.head, pal, col, ex, glowOn, t);

    // Front leg.
    this.limb(ctx, sk.hipF, sk.knF, b.legW * 1.15, b.legW * 0.95, col(legColor));
    this.limb(ctx, sk.knF, sk.ftF, b.legW * 0.95, b.legW * 0.8, col(bootColor));
    this.foot(ctx, sk.knF, sk.ftF, b.legW, col(bootColor, -0.1));
    if (metal) this.plate(ctx, sk.knF, b.legW * 0.7, col(pal.trim));

    // Front arm.
    this.limb(ctx, sk.shF, sk.elF, b.armW * 1.1, b.armW * 0.95, col(armColor));
    if (ex.has('shoulderPads') || ex.has('mechPlates') || ex.has('mutant')) {
      ctx.fillStyle = col(ex.has('mutant') ? pal.skin : pal.secondary, ex.has('mutant') ? 0.05 : 0.08);
      ctx.beginPath();
      ctx.ellipse(sk.shF.x, sk.shF.y + 2, b.shoulderW * 0.42, b.armW * 0.7, -0.2, 0, Math.PI * 2);
      ctx.fill();
      if (!ex.has('mutant')) {
        ctx.strokeStyle = col(pal.trim, -0.1);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    this.limb(ctx, sk.elF, sk.haF, b.armW * 1.0, b.armW * 0.9, col(foreColor));
    this.fist(ctx, sk.haF, b.armW * 0.55, col(bareArms ? pal.skin : pal.secondary, 0.1));
    if (ex.has('spikes')) this.spikes(ctx, sk.elF, sk.haF, col(pal.trim));

    // Energy glow lines on forearms.
    if (glowOn && (ex.has('forearmBlades') || ex.has('cyberArm') || metal || ex.has('core'))) {
      this.glowLine(ctx, sk.elF, sk.haF, pal.glow, o.quality, 2.2);
    }

    // Blade / energy in hand.
    if (pose.blade > 0.05 && glowOn) {
      if (ex.has('forearmBlades')) this.blade(ctx, sk.elF, sk.haF, pal.glow, pose.blade, o.quality);
      else this.handAura(ctx, sk.haF, pal.glow, pose.blade, b.armW);
    }

    if (wounded && glowOn) {
      ctx.fillStyle = 'rgba(120,10,18,0.8)';
      ctx.beginPath();
      ctx.ellipse(sk.chest.x, sk.chest.y - 10, 10, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private limb(ctx: CanvasRenderingContext2D, a: P, b: P, w1: number, w2: number, color: string): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x + nx * w1 * 0.5, a.y + ny * w1 * 0.5);
    ctx.lineTo(b.x + nx * w2 * 0.5, b.y + ny * w2 * 0.5);
    ctx.lineTo(b.x - nx * w2 * 0.5, b.y - ny * w2 * 0.5);
    ctx.lineTo(a.x - nx * w1 * 0.5, a.y - ny * w1 * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(a.x, a.y, w1 * 0.5, 0, Math.PI * 2);
    ctx.arc(b.x, b.y, w2 * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private fist(ctx: CanvasRenderingContext2D, p: P, r: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private foot(ctx: CanvasRenderingContext2D, knee: P, ankle: P, w: number, color: string): void {
    const dx = ankle.x - knee.x;
    const dy = ankle.y - knee.y;
    const len = Math.hypot(dx, dy) || 1;
    // Foot points forward, perpendicular to the shin.
    const fx = -dy / len;
    const fy = dx / len;
    const dirx = fx > 0 ? fx : -fx;
    const diry = fx > 0 ? fy : -fy;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(ankle.x - dirx * w * 0.3, ankle.y - diry * w * 0.3 + 3);
    ctx.lineTo(ankle.x + dirx * w * 1.1, ankle.y + diry * w * 1.1 - 2);
    ctx.lineTo(ankle.x + dirx * w * 1.0, ankle.y + diry * w * 1.0 - 7);
    ctx.lineTo(ankle.x - dirx * w * 0.3, ankle.y - diry * w * 0.3 - 6);
    ctx.closePath();
    ctx.fill();
  }

  private plate(ctx: CanvasRenderingContext2D, p: P, r: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(p.x - r, p.y - r * 0.7, r * 2, r * 1.4);
  }

  private spikes(ctx: CanvasRenderingContext2D, a: P, b: P, color: string): void {
    ctx.fillStyle = color;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x + 3, y);
      ctx.fill();
    }
  }

  private torso(
    ctx: CanvasRenderingContext2D,
    sk: Skeleton,
    b: CharacterVisual['build'],
    col: (c: string, dark?: number) => string,
    pal: CharacterVisual['palette'],
    ex: Set<string>,
    glowOn: boolean,
  ): void {
    const dx = sk.chest.x - sk.hip.x;
    const dy = sk.chest.y - sk.hip.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    const hw = b.torsoW * 0.42;
    const cw = (b.torsoW * 0.5 + b.shoulderW * 0.25);
    ctx.fillStyle = col(pal.primary);
    ctx.beginPath();
    ctx.moveTo(sk.hip.x + nx * hw, sk.hip.y + ny * hw);
    ctx.lineTo(sk.chest.x + nx * cw, sk.chest.y + ny * cw);
    ctx.quadraticCurveTo(sk.neck.x, sk.neck.y + 8, sk.chest.x - nx * cw, sk.chest.y - ny * cw);
    ctx.lineTo(sk.hip.x - nx * hw, sk.hip.y - ny * hw);
    ctx.closePath();
    ctx.fill();
    // Chest armor plate.
    const mx = sk.hip.x + dx * 0.62;
    const my = sk.hip.y + dy * 0.62;
    ctx.fillStyle = col(ex.has('mutant') ? pal.skin : pal.secondary);
    ctx.beginPath();
    ctx.ellipse(mx + nx * cw * 0.25, my + ny * cw * 0.25, cw * 0.62, len * 0.26, Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.fill();
    // Belt.
    ctx.strokeStyle = col(pal.trim, -0.2);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sk.hip.x + nx * hw * 1.05 + dx * 0.08, sk.hip.y + ny * hw * 1.05 + dy * 0.08);
    ctx.lineTo(sk.hip.x - nx * hw * 1.05 + dx * 0.08, sk.hip.y - ny * hw * 1.05 + dy * 0.08);
    ctx.stroke();
    if (ex.has('sash')) {
      ctx.strokeStyle = col(pal.secondary);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sk.hip.x - nx * hw, sk.hip.y - ny * hw + 6);
      ctx.quadraticCurveTo(sk.hip.x - nx * hw - 14, sk.hip.y - 20, sk.hip.x - nx * hw - 22 + Math.sin(performance.now() * 0.005) * 4, sk.hip.y - 40);
      ctx.stroke();
    }
    if (ex.has('beads')) {
      ctx.fillStyle = col('#3a2a1a');
      for (let i = 0; i < 7; i++) {
        const a = (i / 6) * Math.PI;
        ctx.beginPath();
        ctx.arc(sk.chest.x + Math.cos(a) * 9 + nx * 4, sk.chest.y - Math.sin(a) * 9 - 4, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (ex.has('mechPlates')) {
      ctx.fillStyle = col(pal.trim, -0.15);
      ctx.fillRect(mx - 8, my - 10, 16, 20);
    }
    if (ex.has('exhaust')) {
      ctx.fillStyle = col('#2a2d33');
      ctx.fillRect(sk.chest.x - nx * cw - 6, sk.chest.y - 6, 7, 26);
      ctx.fillRect(sk.chest.x - nx * cw - 15, sk.chest.y - 2, 7, 22);
    }
    if (glowOn) {
      if (ex.has('core')) {
        const pulse = 0.6 + Math.sin(performance.now() * 0.006) * 0.4;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(mx, my, 1, mx, my, 22);
        g.addColorStop(0, pal.glow);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha *= pulse;
        ctx.beginPath();
        ctx.arc(mx, my, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha /= pulse;
        ctx.globalCompositeOperation = 'source-over';
      } else {
        // Energy seam down the chest.
        ctx.strokeStyle = pal.glow;
        ctx.globalAlpha *= 0.85;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sk.hip.x + nx * hw * 0.4 + dx * 0.2, sk.hip.y + ny * hw * 0.4 + dy * 0.2);
        ctx.lineTo(sk.chest.x + nx * cw * 0.5 - dx * 0.1, sk.chest.y + ny * cw * 0.5 - dy * 0.1);
        ctx.stroke();
        ctx.globalAlpha /= 0.85;
      }
    }
  }

  private head(
    ctx: CanvasRenderingContext2D,
    sk: Skeleton,
    r: number,
    style: CharacterVisual['head'],
    pal: CharacterVisual['palette'],
    col: (c: string, dark?: number) => string,
    ex: Set<string>,
    glowOn: boolean,
    t: number,
  ): void {
    const h = sk.head;
    const ang = -(sk.torsoAngle + sk.headAngle * 0.6) * DEG;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(ang);
    // Neck.
    ctx.fillStyle = col(pal.skin, -0.2);
    ctx.fillRect(-r * 0.35, -r * 1.3, r * 0.7, r * 0.7);
    const skull = style === 'helmet' || style === 'crown' ? pal.secondary : style === 'hood' ? pal.primary : pal.skin;
    ctx.fillStyle = col(skull);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r, 0, 0, Math.PI * 2);
    ctx.fill();
    // Jaw / face forward.
    if (style !== 'hood' && style !== 'helmet') {
      ctx.fillStyle = col(pal.skin, -0.05);
      ctx.beginPath();
      ctx.ellipse(r * 0.35, -r * 0.35, r * 0.6, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    switch (style) {
      case 'short':
        ctx.fillStyle = col(pal.hair);
        ctx.beginPath();
        ctx.ellipse(-r * 0.15, r * 0.35, r * 0.95, r * 0.7, -0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'topknot':
        ctx.fillStyle = col(pal.hair);
        ctx.beginPath();
        ctx.arc(-r * 0.4, r * 1.0, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'visor':
        ctx.fillStyle = col(pal.hair);
        ctx.beginPath();
        ctx.ellipse(-r * 0.2, r * 0.3, r * 0.95, r * 0.75, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, r * 0.2);
        ctx.quadraticCurveTo(-r * 2.2, -r * 0.2 + Math.sin(t * 0.005) * 3, -r * 2.0, -r * 1.6);
        ctx.lineTo(-r * 1.5, -r * 1.2);
        ctx.quadraticCurveTo(-r * 1.6, -r * 0.2, -r * 0.6, -r * 0.2);
        ctx.fill();
        break;
      case 'hood':
        ctx.fillStyle = col(pal.primary, -0.1);
        ctx.beginPath();
        ctx.moveTo(-r * 1.2, -r * 1.2);
        ctx.quadraticCurveTo(-r * 1.4, r * 1.2, -r * 0.6, r * 1.6);
        ctx.quadraticCurveTo(r * 0.8, r * 1.4, r * 1.1, -r * 0.2);
        ctx.lineTo(r * 0.7, -r * 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = col('#05040a');
        ctx.beginPath();
        ctx.ellipse(r * 0.45, -r * 0.1, r * 0.5, r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'helmet':
        ctx.fillStyle = col(pal.trim, -0.1);
        ctx.fillRect(-r * 0.9, r * 0.2, r * 1.8, r * 0.5);
        ctx.fillStyle = col(pal.secondary, -0.2);
        ctx.fillRect(r * 0.1, -r * 0.9, r * 0.8, r * 0.7);
        break;
      case 'crown':
        ctx.fillStyle = col(pal.trim);
        for (let i = 0; i < 5; i++) {
          const x = -r * 0.9 + i * r * 0.45;
          ctx.beginPath();
          ctx.moveTo(x - r * 0.15, r * 0.7);
          ctx.lineTo(x, r * (1.5 + (i % 2) * 0.5));
          ctx.lineTo(x + r * 0.15, r * 0.7);
          ctx.fill();
        }
        ctx.fillRect(-r * 0.95, r * 0.45, r * 1.9, r * 0.32);
        break;
      default:
        break;
    }
    if (ex.has('scars') && !glowOn) {
      // silhouettes skip details
    } else if (ex.has('scars')) {
      ctx.strokeStyle = col('#6e3b33');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.3, r * 0.2);
      ctx.lineTo(r * 0.75, -r * 0.5);
      ctx.stroke();
    }
    // Eyes.
    if (glowOn) {
      const glowEyes = style === 'hood' || style === 'helmet' || style === 'crown' || style === 'visor';
      ctx.fillStyle = glowEyes ? pal.eye : col('#1a1414');
      if (style === 'visor' || style === 'helmet') {
        ctx.fillStyle = pal.eye;
        ctx.fillRect(r * 0.05, -r * 0.05, r * 0.95, r * 0.22);
      } else {
        ctx.beginPath();
        ctx.ellipse(r * 0.62, r * 0.05, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private glowLine(ctx: CanvasRenderingContext2D, a: P, b: P, color: string, q: DrawOptions['quality'], w: number): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    if (q === 'high') {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(a.x + (b.x - a.x) * 0.15, a.y + (b.y - a.y) * 0.15);
    ctx.lineTo(a.x + (b.x - a.x) * 0.85, a.y + (b.y - a.y) * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  private blade(ctx: CanvasRenderingContext2D, elbow: P, hand: P, color: string, k: number, q: DrawOptions['quality']): void {
    const dx = hand.x - elbow.x;
    const dy = hand.y - elbow.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const L = 78 * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (q !== 'low') {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(hand.x - uy * 4, hand.y + ux * 4);
    ctx.lineTo(hand.x + ux * L, hand.y + uy * L);
    ctx.lineTo(hand.x + uy * 4, hand.y - ux * 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe6e9';
    ctx.beginPath();
    ctx.moveTo(hand.x - uy * 1.5, hand.y + ux * 1.5);
    ctx.lineTo(hand.x + ux * L * 0.9, hand.y + uy * L * 0.9);
    ctx.lineTo(hand.x + uy * 1.5, hand.y - ux * 1.5);
    ctx.fill();
    ctx.restore();
  }

  private handAura(ctx: CanvasRenderingContext2D, hand: P, color: string, k: number, r: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(hand.x, hand.y, 1, hand.x, hand.y, r * 2.2 * (0.6 + k));
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, r * 2.2 * (0.6 + k), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
