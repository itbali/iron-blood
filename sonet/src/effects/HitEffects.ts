import type { GameEvent, SfxId } from '../combat/types';
import { flashScale, kickScale, shakeScale, type FxContext } from './FxContext';

const STRENGTH = {
  light: { sparks: 7, shake: 2.6, zoom: 0, smoke: 0, blood: 0, ring: 0, aberr: 0, light: 120 },
  heavy: { sparks: 14, shake: 6.5, zoom: 0.03, smoke: 3, blood: 5, ring: 70, aberr: 3, light: 190 },
  special: { sparks: 20, shake: 8.5, zoom: 0.05, smoke: 4, blood: 9, ring: 100, aberr: 4, light: 240 },
  super: { sparks: 26, shake: 10, zoom: 0.06, smoke: 5, blood: 12, ring: 130, aberr: 5, light: 280 },
};

/** Turns sim events into particles, shake, camera kicks, sound and HUD feedback. */
export class HitEffects {
  constructor(private readonly c: FxContext) {}

  handle(ev: GameEvent): void {
    const c = this.c;
    switch (ev.type) {
      case 'hit': this.onHit(ev); break;
      case 'block': this.onBlock(ev); break;
      case 'perfect-block': this.onPerfect(ev); break;
      case 'armor': this.onArmor(ev); break;
      case 'counter': this.onCounter(ev); break;
      case 'wall':
        c.shake.add(5 * shakeScale(c));
        c.particles.dust(ev.x, ev.y - 100, 8, ev.x > 0 ? -1 : 1);
        c.audio.play('wall');
        break;
      case 'knockdown':
        c.shake.add(4.5 * shakeScale(c));
        c.particles.dust(ev.x, 4, 10);
        c.particles.ring(ev.x, 8, 'rgba(200,200,210,0.6)', 70, 12);
        c.audio.play('land', { vol: 1.2 });
        break;
      case 'land':
        c.particles.dust(ev.x, 2, 3);
        c.audio.play('land', { vol: 0.5 });
        break;
      case 'jump':
        c.particles.dust(ev.x, 2, 3);
        c.audio.play('jump', { vol: 0.5 });
        break;
      case 'dash':
        c.audio.play('whoosh', { pitch: 0.8, vol: 0.8 });
        c.particles.dust(ev.x, 4, 5, -ev.facing);
        break;
      case 'swing': {
        const f = c.sim.fighters[ev.slot];
        const m = ev.moveId ? f.def.moves[ev.moveId] : undefined;
        if (m && m.attack.damage >= 60) c.audio.play('whoosh', { vol: 0.6, pitch: 0.9 + Math.random() * 0.2 });
        break;
      }
      case 'special':
        c.audio.play('special');
        c.particles.burst(ev.x, ev.y, 12, ev.color ?? '#ff4a4a', 1.2);
        c.particles.ring(ev.x, ev.y, ev.color ?? '#ff4a4a', 90, 16);
        break;
      case 'projectile':
        c.audio.play('projectile');
        break;
      case 'teleport':
        c.audio.play('teleport');
        c.particles.burst(ev.x, ev.y + 20, 16, ev.color ?? '#a35bff', 1.4);
        c.particles.ring(ev.x, ev.y, ev.color ?? '#a35bff', 80, 14);
        break;
      case 'grab':
        c.audio.play('grab');
        c.shake.add(3 * shakeScale(c));
        break;
      case 'tech':
        c.audio.play('block');
        c.particles.ring(ev.x, ev.y, '#ffffff', 90, 12);
        c.hud.banner('TECH!', { kind: 'info', duration: 600 });
        break;
      case 'throw-hit': this.onThrowHit(ev); break;
      case 'ko': this.onKo(ev); break;
      case 'super-start':
        c.audio.play('super');
        c.shake.add(3 * shakeScale(c));
        c.particles.burst(ev.x, ev.y, 30, ev.color ?? '#ff3a46', 1.8);
        c.particles.ring(ev.x, ev.y, ev.color ?? '#ff3a46', 170, 26);
        c.hud.banner(c.sim.fighters[ev.slot].def.moves[ev.moveId ?? '']?.name?.toUpperCase() ?? 'SUPER', { kind: 'phase', duration: 1100 });
        break;
      case 'phase2':
        c.audio.play('phase');
        c.shake.add(10 * shakeScale(c));
        c.fx.flash = Math.max(c.fx.flash, flashScale(c, 0.6));
        c.fx.flashColor = '#d51f2b';
        c.hud.banner('PHASE 2', { kind: 'phase', sub: 'THE ARCHON UNLEASHED', duration: 2000 });
        break;
      default:
        break;
    }
  }

  private color(ev: GameEvent): string {
    return ev.color ?? '#ffb347';
  }

  private onHit(ev: GameEvent): void {
    const c = this.c;
    const att = c.sim.fighters[ev.slot];
    const m = ev.moveId ? att.def.moves[ev.moveId] : undefined;
    const s = STRENGTH[ev.strength];
    const dir = ev.facing;
    const col = this.color(ev);
    const multiMid = !!m?.multiHit && ev.strength === 'super' && (ev.damage ?? 0) < 40;
    const k = multiMid ? 0.5 : 1;
    c.particles.sparks(ev.x, ev.y, dir, Math.round(s.sparks * k), '#ffe9c0', 1 + (ev.strength === 'light' ? 0 : 0.4));
    c.particles.sparks(ev.x, ev.y, dir, Math.round(s.sparks * 0.5 * k), col, 1.1);
    if (s.ring > 0 && c.settings().effects) c.particles.ring(ev.x, ev.y, col, s.ring * (multiMid ? 0.6 : 1), 12);
    if (s.smoke > 0) c.particles.smoke(ev.x, ev.y - 20, s.smoke, 'rgba(110,110,120,0.5)', 18);
    if (s.blood > 0) c.particles.blood(ev.x, ev.y, dir, Math.round(s.blood * k));
    c.shake.add(s.shake * k * shakeScale(c));
    c.camera.hitZoom(s.zoom * kickScale(c) * k);
    c.fx.aberration = Math.max(c.fx.aberration, s.aberr * k);
    c.fx.hitLights.push({ x: ev.x, y: ev.y, life: 10, color: col, r: s.light });
    if (c.fx.hitLights.length > 6) c.fx.hitLights.shift();
    if (ev.strength !== 'light' && !multiMid) {
      c.fx.flash = Math.max(c.fx.flash, flashScale(c, ev.strength === 'heavy' ? 0.12 : 0.22));
      c.fx.flashColor = '#ffffff';
    }
    const sfx: SfxId = m?.sfx === 'kick' ? 'kick' : ev.strength === 'light' ? (m?.sfx === 'heavy-hit' ? 'heavy-hit' : 'punch') : 'heavy-hit';
    c.audio.play(sfx, { pitch: 0.92 + Math.random() * 0.16, vol: multiMid ? 0.6 : 1 });

    const dmg = ev.damage ?? 0;
    if (dmg >= 60 && !multiMid) {
      const victim = c.sim.fighters[ev.victim ?? 1 - ev.slot];
      c.numbers.push({
        x: victim.x + (Math.random() - 0.5) * 40, y: ev.y + 50, vy: 1.4, life: 46, max: 46, text: `-${dmg}`,
        sub: dmg >= 100 ? 'CRITICAL' : '', color: dmg >= 100 ? '#ff4a3a' : '#ffd24a', size: dmg >= 100 ? 50 : 38,
      });
      if (c.numbers.length > 8) c.numbers.shift();
    }
    const critical = dmg >= 90 && !multiMid && (ev.strength === 'heavy' || ev.strength === 'special');
    if (critical) c.slowmo.trigger(0.35, 150);
    if (ev.strength === 'super' && !multiMid) c.slowmo.trigger(0.3, 220);

    if (ev.combo && ev.combo >= 2) {
      c.hud.combo(ev.slot, ev.combo, c.sim.combo.info[ev.slot].damage, c.sim.combo.maxCombo[ev.slot]);
    }
  }

  private onBlock(ev: GameEvent): void {
    const c = this.c;
    c.particles.sparks(ev.x, ev.y, ev.facing, 6, '#cfe8ff', 0.8);
    c.particles.ring(ev.x, ev.y, '#9fd0ff', 46, 9);
    c.shake.add(1.3 * shakeScale(c));
    c.audio.play('block', { pitch: 0.9 + Math.random() * 0.2 });
  }

  private onArmor(ev: GameEvent): void {
    const c = this.c;
    c.particles.sparks(ev.x, ev.y, ev.facing, 10, '#d8d8e0', 1);
    c.shake.add(3 * shakeScale(c));
    c.audio.play('block', { pitch: 0.7 });
    c.fx.hitLights.push({ x: ev.x, y: ev.y, life: 8, color: '#cfd6e4', r: 140 });
  }

  private onCounter(ev: GameEvent): void {
    const c = this.c;
    c.particles.ring(ev.x, ev.y, '#ffd24a', 140, 16);
    c.particles.burst(ev.x, ev.y, 20, '#ffd24a', 1.5);
    c.fx.flash = Math.max(c.fx.flash, flashScale(c, 0.35));
    c.fx.flashColor = '#ffe9a0';
    c.shake.add(5 * shakeScale(c));
    c.audio.play('perfect-block', { pitch: 0.8 });
    c.hud.banner('COUNTER!', { kind: 'perfect', duration: 800 });
  }

  private onPerfect(ev: GameEvent): void {
    const c = this.c;
    c.particles.ring(ev.x, ev.y, '#ffffff', 150, 16);
    c.particles.sparks(ev.x, ev.y, ev.facing, 18, '#ffffff', 1.3);
    c.fx.flash = Math.max(c.fx.flash, flashScale(c, 0.5));
    c.fx.flashColor = '#ffffff';
    c.camera.hitZoom(0.06 * kickScale(c));
    c.shake.add(3 * shakeScale(c));
    c.audio.play('perfect-block');
    c.slowmo.trigger(0.25, 220);
    c.hud.banner('PERFECT BLOCK', { kind: 'perfect', duration: 900 });
  }

  private onThrowHit(ev: GameEvent): void {
    const c = this.c;
    const slam = ev.moveId === 'slam';
    const col = c.sim.fighters[ev.slot].def.style.trail;
    c.particles.sparks(ev.x, ev.y, ev.facing, slam ? 24 : 12, '#ffe9c0', 1.2);
    c.particles.blood(ev.x, ev.y, ev.facing, slam ? 12 : 6);
    c.shake.add((slam ? 11 : 6) * shakeScale(c));
    c.fx.aberration = Math.max(c.fx.aberration, slam ? 5 : 3);
    c.audio.play(slam ? 'throw' : 'heavy-hit');
    c.camera.hitZoom((slam ? 0.08 : 0.04) * kickScale(c));
    if (slam) {
      c.particles.ring(ev.x, 10, col, 160, 18);
      c.particles.dust(ev.x, 4, 14);
      c.fx.flash = Math.max(c.fx.flash, flashScale(c, 0.3));
      c.fx.flashColor = '#ffffff';
      c.slowmo.trigger(0.3, 200);
    }
    if (ev.damage) {
      c.numbers.push({
        x: ev.x, y: ev.y + 60, vy: 1.4, life: 50, max: 50, text: `-${ev.damage}`, sub: slam ? 'EXECUTION' : '', color: '#ffd24a', size: slam ? 52 : 36,
      });
    }
    if (c.sim.combo.info[ev.slot].active) {
      c.hud.combo(ev.slot, c.sim.combo.info[ev.slot].hits, c.sim.combo.info[ev.slot].damage, c.sim.combo.maxCombo[ev.slot]);
    }
  }

  private onKo(ev: GameEvent): void {
    const c = this.c;
    c.audio.play('ko');
    c.shake.add(12 * shakeScale(c), 0.9);
    c.camera.hitZoom(0.1 * kickScale(c));
    c.fx.flash = Math.max(c.fx.flash, flashScale(c, 0.75));
    c.fx.flashColor = '#ffffff';
    c.slowmo.trigger(0.2, 1000);
    c.particles.blood(ev.x, ev.y, ev.facing, 18);
    c.particles.sparks(ev.x, ev.y, ev.facing, 30, '#ffe9c0', 1.6);
    c.particles.ring(ev.x, ev.y, '#ff4a3a', 200, 22);
  }
}
