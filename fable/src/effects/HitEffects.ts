import type { HitEffect } from '@/combat/AttackData';
import type { Fighter } from '@/combat/Fighter';
import { HITSTOP_FINISHER, SHAKE_FINISHER, SHAKE_HEAVY, SHAKE_LIGHT, SHAKE_SPECIAL } from '@/core/constants';
import type { AudioManager, SoundName } from '@/audio/AudioManager';
import type { Simulation } from '@/game/Simulation';
import type { Renderer } from '@/render/Renderer';
import type { GameLoop } from '@/game/GameLoop';

export interface BannerSink {
  banner(text: string, side: 0 | 1, kind: 'perfect' | 'break' | 'counter' | 'armor' | 'critical' | 'phase'): void;
}

const EFFECT_COLORS: Record<HitEffect, string[]> = {
  spark: ['#ffd27a', '#ffffff', '#ffb347'],
  blood: ['#d51f2b', '#8e1018', '#ff5a5a'],
  energy: ['#ff2a3c', '#ffffff', '#ff7a7a'],
  smoke: ['#6b6b6b', '#3a3a3a', '#9a9a9a'],
  shock: ['#ffb347', '#ffffff', '#ff8c1a'],
  void: ['#a56bff', '#4b1f8f', '#ffffff'],
};

/**
 * Bridges simulation events to presentation: particles, shake, hit zoom, slow motion, sounds and banners.
 * It never feeds anything back into the simulation.
 */
export class HitEffects {
  private unsubscribe: (() => void)[] = [];
  reducedFlashes = false;

  constructor(
    private sim: Simulation,
    private renderer: Renderer,
    private loop: GameLoop,
    private audio: AudioManager,
    private banners: BannerSink,
  ) {
    const ev = sim.events;
    this.unsubscribe.push(
      ev.on('hit', (e) => this.onHit(e)),
      ev.on('wall', (e) => {
        this.renderer.shake.shake(SHAKE_HEAVY * Math.min(1, e.impact / 14), 8);
        this.burst(e.fighter.x + (e.fighter.x < 0 ? -40 : 40), e.fighter.y + 100, 'smoke', 10, 3);
        this.audio.play('wall');
      }),
      ev.on('attackStart', (e) => {
        if (e.attack.category === 'light') this.audio.play('whoosh');
        else if (e.attack.category === 'heavy') this.audio.play('whoosh');
        else if (e.attack.category === 'grab') this.audio.play('whoosh');
        else if (e.attack.category === 'special') this.audio.play(e.attack.sound as SoundName);
        if (e.attack.trail) this.burst(e.fighter.x, e.fighter.y + 90, e.attack.effect, 10, 6);
      }),
      ev.on('jump', (e) => {
        this.audio.play('jump');
        this.renderer.particles.emit({ x: e.fighter.x, y: 4, count: 6, color: ['#555', '#333'], shape: 'smoke', speed: [1, 3], angle: [Math.PI * 1.1, Math.PI * 1.9], life: [12, 24], size: [6, 12], drag: 0.9 });
      }),
      ev.on('land', (e) => {
        this.audio.play('land');
        this.renderer.particles.emit({ x: e.fighter.x, y: 4, count: 8, color: ['#444', '#2a2a2a'], shape: 'smoke', speed: [1, 4], angle: [Math.PI * 1.05, Math.PI * 1.95], life: [12, 26], size: [8, 16], drag: 0.9 });
      }),
      ev.on('grab', (e) => {
        this.audio.play('grab');
        this.renderer.shake.shake(SHAKE_LIGHT, 6);
        this.burst(e.defender.x, e.defender.y + 100, 'smoke', 8, 3);
      }),
      ev.on('teleport', (e) => {
        this.audio.play('teleport');
        this.burst(e.fromX, e.fighter.y + 90, 'void', 16, 5);
        this.burst(e.toX, e.fighter.y + 90, 'void', 16, 5);
      }),
      ev.on('projectileSpawn', (e) => {
        this.audio.play('projectile');
        this.burst(e.projectile.x, e.projectile.y, 'energy', 10, 6, e.projectile.spec.color);
      }),
      ev.on('projectileClash', (e) => {
        this.audio.play('special');
        this.burst(e.x, e.y, 'energy', 24, 10);
        this.renderer.shake.shake(SHAKE_LIGHT, 8);
      }),
      ev.on('counter', (e) => {
        this.audio.play('counter');
        this.banners.banner('COUNTER', e.fighter.side, 'counter');
        this.loop.slowmo(16, 0.3);
        this.renderer.flash = 0.4;
        this.renderer.flashColor = '#ffd166';
      }),
      ev.on('armorHit', (e) => {
        this.audio.play('armor');
        this.banners.banner('ARMOR', e.fighter.side, 'armor');
        this.burst(e.fighter.x, e.fighter.y + 120, 'shock', 10, 5);
      }),
      ev.on('superStart', (e) => {
        this.audio.play('super');
        this.loop.slowmo(30, 0.35);
        this.renderer.flash = 0.5;
        this.renderer.flashColor = e.fighter.config.palette.glow;
        this.renderer.camera.hitZoom(0.12, 40);
        this.burst(e.fighter.x, e.fighter.y + 100, e.attack.effect, 40, 10);
      }),
      ev.on('comboEnd', (e) => {
        if (e.dropped) this.banners.banner('COMBO BREAK', e.side, 'break');
      }),
      ev.on('ko', (e) => {
        this.audio.play('ko');
        this.renderer.shake.shake(SHAKE_SPECIAL, 20);
        this.renderer.camera.hitZoom(0.1, 60);
        this.renderer.flash = 0.6;
        this.renderer.flashColor = '#ffffff';
        this.renderer.aberration = 1;
        const loser = this.sim.fighters[e.loser];
        this.burst(loser.x, loser.y + 100, 'blood', 30, 10);
      }),
      ev.on('slowmo', (e) => this.loop.slowmo(e.ticks, e.scale)),
      ev.on('bossPhase2', (e) => {
        this.audio.play('boss-phase');
        this.banners.banner('PHASE 2', e.fighter.side, 'phase');
        this.renderer.flash = 0.7;
        this.renderer.flashColor = '#ff3a1a';
        this.renderer.shake.shake(SHAKE_SPECIAL, 30);
        this.burst(e.fighter.x, e.fighter.y + 120, 'shock', 60, 12);
      }),
      ev.on('finisherStart', (e) => {
        this.audio.play('finisher');
        const w = this.sim.fighters[e.winner];
        this.renderer.camera.setCinematic((w.x + this.sim.fighters[e.loser].x) / 2, 140, 1.55, 1);
        this.renderer.darken = 0.25;
        this.loop.slowmo(70, 0.45);
      }),
      ev.on('dialogue', (e) => {
        // Intro close-up on whoever is speaking.
        const speaker = this.sim.fighters[e.side];
        if (!this.renderer.settings.reducedMotion) this.renderer.camera.setCinematic(speaker.x + speaker.facing * 120, speaker.config.body.height * 0.55, 1.6, 0.85);
      }),
      ev.on('phase', (e) => {
        if (e.phase !== 'finisher' && e.phase !== 'intro') {
          this.renderer.camera.clearCinematic();
          this.renderer.darken = 0;
        }
        if (e.phase === 'round-start') this.audio.play('round-start');
      }),
      ev.on('announce', (e) => {
        if (e.text === 'FIGHT') this.audio.play('fight');
        else if (e.text.startsWith('ROUND')) this.audio.play('round-start');
      }),
      ev.on('roundEnd', (e) => {
        if (e.winner !== null) this.audio.play('victory');
      }),
    );
  }

  /** Called every presentation tick for frame-driven cinematics (finisher). */
  update(): void {
    const sim = this.sim;
    if (sim.phase === 'finisher' && sim.roundWinner !== null) {
      const w = sim.fighters[sim.roundWinner];
      const l = sim.fighters[(1 - sim.roundWinner) as 0 | 1];
      const t = sim.phaseFrame;
      const color = w.config.finisher.color;
      if (t % 6 === 0 && t < 120) this.burst(w.x + w.facing * 40, w.y + 100, w.config.finisher.type === 'physical' ? 'smoke' : w.config.finisher.type === 'cinematic' ? 'void' : 'energy', 6, 4, color);
      if (t === 124) {
        this.renderer.flash = 0.9;
        this.renderer.flashColor = color;
        this.renderer.shake.shake(SHAKE_FINISHER, 30);
        this.renderer.aberration = 1;
        this.renderer.camera.hitZoom(0.15, 50);
        this.burst(l.x, l.y + 110, 'blood', 70, 14, color);
        this.renderer.particles.emit({ x: l.x, y: l.y + 110, count: 3, color, shape: 'ring', speed: [0, 0], life: [20, 30], size: [20, 30], additive: true });
        this.renderer.addDamageNumber(l.x, l.y + 220, w.config.finisher.name.toUpperCase(), '', color, true);
        this.audio.play('ko');
        this.sim.hitStop = Math.max(this.sim.hitStop, HITSTOP_FINISHER);
      }
      if (t > 124 && t % 8 === 0) this.burst(l.x, Math.max(20, l.y + 60), 'blood', 6, 6, color);
    }
  }

  private onHit(e: { attacker: Fighter; defender: Fighter; damage: number; blocked: boolean; perfect: boolean; armored: boolean; critical: boolean; counterHit: boolean; x: number; y: number; attack: { category: string; effect: HitEffect; color?: string; sound: string; hitStop: number } }): void {
    const cat = e.attack.category;
    const x = e.x;
    const y = e.y;
    if (e.perfect) {
      this.audio.play('perfect-block');
      this.banners.banner('PERFECT BLOCK', e.defender.side, 'perfect');
      this.loop.slowmo(14, 0.3);
      this.renderer.flash = 0.35;
      this.renderer.flashColor = '#9fd8ff';
      this.renderer.particles.emit({ x, y, count: 3, color: '#9fd8ff', shape: 'ring', speed: [0, 0], life: [14, 20], size: [8, 14], additive: true });
      this.burst(x, y, 'spark', 14, 8, '#9fd8ff');
      return;
    }
    if (e.blocked) {
      this.audio.play('block');
      this.renderer.shake.shake(SHAKE_LIGHT * 0.6, 5);
      this.burst(x, y, 'spark', 8, 5, '#9fd8ff');
      return;
    }
    if (e.armored) {
      this.burst(x, y, 'shock', 10, 5);
      this.audio.play('armor');
      return;
    }
    const sound = e.attack.sound as SoundName;
    this.audio.play(sound);
    const heavy = cat === 'heavy';
    const special = cat === 'special' || cat === 'super' || cat === 'grab';
    const color = e.attack.color;
    if (special) {
      this.renderer.shake.shake(SHAKE_SPECIAL, 14);
      this.renderer.camera.hitZoom(0.06, 14);
      this.burst(x, y, e.attack.effect, 36, 12, color);
      this.renderer.particles.emit({ x, y, count: 2, color: color ?? '#ffffff', shape: 'ring', speed: [0, 0], life: [12, 18], size: [10, 16], additive: true });
      this.renderer.aberration = Math.max(this.renderer.aberration, 0.6);
      this.renderer.flash = Math.max(this.renderer.flash, 0.18);
      this.renderer.flashColor = color ?? '#ffffff';
    } else if (heavy) {
      this.renderer.shake.shake(SHAKE_HEAVY, 10);
      this.renderer.camera.hitZoom(0.04, 10);
      this.burst(x, y, e.attack.effect, 24, 10, color);
      this.renderer.particles.emit({ x, y, count: 1, color: '#ffffff', shape: 'ring', speed: [0, 0], life: [10, 14], size: [8, 12], additive: true });
      this.renderer.aberration = Math.max(this.renderer.aberration, 0.35);
    } else {
      this.renderer.shake.shake(SHAKE_LIGHT, 6);
      this.burst(x, y, e.attack.effect, 12, 7, color);
    }
    // Blood/smoke lingering particles for feel.
    this.renderer.particles.emit({ x, y: y - 10, count: heavy || special ? 6 : 3, color: ['#8e1018', '#d51f2b'], shape: 'dot', speed: [2, 7], angle: [-Math.PI * 0.2, Math.PI * 0.6], life: [20, 40], size: [3, 7], gravity: 0.5, drag: 0.94 });
    if (e.damage >= 60 || e.critical) {
      const sub = e.counterHit ? 'COUNTER' : e.critical ? 'CRITICAL' : '';
      this.renderer.addDamageNumber(e.defender.x + (e.defender.x < e.attacker.x ? -40 : 40), e.defender.y + e.defender.config.body.height + 30, `-${e.damage}`, sub, e.critical ? '#ff4d5a' : '#e7e7e7', e.critical);
      if (e.critical && !e.attack.sound.includes('super')) this.banners.banner('CRITICAL', e.attacker.side, 'critical');
    }
  }

  private burst(x: number, y: number, effect: HitEffect, count: number, speed: number, colorOverride?: string): void {
    const colors = colorOverride ? [colorOverride, '#ffffff'] : EFFECT_COLORS[effect];
    const r = this.renderer.particles;
    switch (effect) {
      case 'spark':
        r.emit({ x, y, count, color: colors, shape: 'spark', speed: [speed * 0.5, speed * 1.6], life: [8, 20], size: [2, 5], gravity: 0.4, drag: 0.92, additive: true });
        break;
      case 'blood':
        r.emit({ x, y, count, color: colors, shape: 'dot', speed: [speed * 0.3, speed * 1.4], life: [18, 40], size: [3, 9], gravity: 0.6, drag: 0.95 });
        r.emit({ x, y, count: Math.ceil(count / 3), color: colors, shape: 'shard', speed: [speed * 0.5, speed], life: [14, 26], size: [5, 10], gravity: 0.5, drag: 0.94 });
        break;
      case 'energy':
        r.emit({ x, y, count, color: colors, shape: 'glow', speed: [speed * 0.3, speed * 1.5], life: [10, 26], size: [6, 16], drag: 0.9, additive: true });
        r.emit({ x, y, count: Math.ceil(count / 2), color: colors, shape: 'spark', speed: [speed, speed * 2], life: [8, 16], size: [2, 4], drag: 0.9, additive: true });
        break;
      case 'smoke':
        r.emit({ x, y, count, color: colors, shape: 'smoke', speed: [speed * 0.2, speed * 0.8], life: [20, 45], size: [10, 26], endSize: 40, drag: 0.93 });
        break;
      case 'shock':
        r.emit({ x, y, count, color: colors, shape: 'spark', speed: [speed * 0.5, speed * 1.8], life: [8, 18], size: [3, 6], gravity: 0.3, drag: 0.9, additive: true });
        r.emit({ x, y, count: Math.ceil(count / 2), color: ['#ffb347', '#6b4a22'], shape: 'smoke', speed: [speed * 0.2, speed * 0.6], life: [18, 36], size: [8, 20], endSize: 30, drag: 0.93 });
        break;
      case 'void':
        r.emit({ x, y, count, color: colors, shape: 'glow', speed: [speed * 0.2, speed * 1.2], life: [14, 34], size: [6, 18], drag: 0.9, additive: true });
        r.emit({ x, y, count: Math.ceil(count / 2), color: ['#1a0a2e', '#4b1f8f'], shape: 'smoke', speed: [speed * 0.2, speed * 0.6], life: [20, 40], size: [10, 24], endSize: 36, drag: 0.93 });
        break;
    }
  }

  dispose(): void {
    for (const u of this.unsubscribe) u();
    this.unsubscribe = [];
  }
}
