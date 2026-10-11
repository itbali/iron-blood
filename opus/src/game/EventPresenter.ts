import type { AudioManager } from '../audio/AudioManager';
import type { ImpactStrength } from '../combat/AttackData';
import type { Fighter } from '../characters/Fighter';
import { SIM_DT_MS, VIEW_WIDTH } from '../core/constants';
import type { HitEffects } from '../effects/HitEffects';
import type { ScreenFlash } from '../effects/ScreenFlash';
import type { Camera } from '../render/Camera';
import type { GameEvent } from './events';
import type { HudCallout, HudStore } from './HudStore';

const HIT_SFX: Record<ImpactStrength, string> = { light: 'punch', medium: 'kick', heavy: 'heavy', special: 'heavy', super: 'superhit' };
const CRIT_SLOWMO_MS = 180;
const PERFECT_SLOWMO_MS = 140;

export interface PresenterHost {
  slowmo(ms: number): void;
  chroma(frames: number): void;
  onFrameAdvantage(e: Extract<GameEvent, { type: 'frame-advantage' }>): void;
}

/**
 * Turns simulation events into feedback (particles, sound, camera, HUD callouts).
 * Nothing here can influence gameplay, which keeps the simulation deterministic.
 */
export class EventPresenter {
  private comboIds: [number, number] = [0, 0];

  constructor(
    private readonly fighters: [Fighter, Fighter],
    private readonly fx: HitEffects,
    private readonly audio: AudioManager,
    private readonly hud: HudStore,
    private readonly camera: Camera,
    private readonly flash: ScreenFlash,
    private readonly host: PresenterHost,
  ) {}

  private pan(x: number): number {
    return Math.max(-0.8, Math.min(0.8, (this.camera.sx(x) - VIEW_WIDTH / 2) / (VIEW_WIDTH / 2)));
  }

  callout(text: string, kind: HudCallout['kind'], side: 0 | 1 | -1, sub?: string): void {
    this.hud.draft.callout = { id: this.hud.nextId(), text, kind, side, sub };
  }

  handle(events: GameEvent[]): void {
    for (const e of events) this.one(e);
  }

  private one(e: GameEvent): void {
    switch (e.type) {
      case 'hit': {
        this.fx.hit(e.x, e.y, e.dir, e.strength, e.effect, e.damage, e.crit, e.counter);
        this.audio.play(e.sfx ?? HIT_SFX[e.strength], { pan: this.pan(e.x), pitch: 0.9 + Math.random() * 0.2 });
        if (e.strength === 'heavy' || e.strength === 'special' || e.strength === 'super') this.host.chroma(e.strength === 'super' ? 8 : 4);
        if (e.crit && (e.strength === 'super' || e.counter || e.strength === 'special')) this.host.slowmo(CRIT_SLOWMO_MS);
        break;
      }
      case 'block':
        this.fx.block(e.x, e.y, e.dir, e.perfect);
        this.audio.play(e.perfect ? 'perfect' : 'block', { pan: this.pan(e.x) });
        break;
      case 'perfect-block':
        this.callout('PERFECT BLOCK', 'perfect', e.defender as 0 | 1);
        this.host.slowmo(PERFECT_SLOWMO_MS);
        break;
      case 'armor':
        this.fx.armor(e.x, e.y);
        this.audio.play('crush', { pan: this.pan(e.x), volume: 0.8 });
        this.callout('ARMOR', 'armor', e.defender as 0 | 1);
        break;
      case 'whiff':
        this.audio.play('whoosh', { volume: 0.5, pitch: 0.9 + Math.random() * 0.2 });
        break;
      case 'move-start':
        if (e.kind === 'special' || e.kind === 'grab') this.audio.play(e.sfx, { pan: this.pan(this.fighters[e.fighter].x) });
        else if (e.kind === 'normal') this.audio.play('whoosh', { volume: 0.35, pitch: 1.2 });
        break;
      case 'projectile':
        this.fx.muzzle(e.x, e.y, e.color);
        break;
      case 'projectile-clash':
        this.fx.clash(e.x, e.y);
        this.audio.play('clash', { pan: this.pan(e.x) });
        break;
      case 'teleport':
        this.fx.teleport(e.fromX, e.y, e.color);
        this.fx.teleport(e.toX, e.y, e.color);
        this.audio.play('teleport', { pan: this.pan(e.toX) });
        break;
      case 'land':
        this.fx.dust(e.x, e.heavy);
        if (e.heavy) this.audio.play('land', { pan: this.pan(e.x) });
        break;
      case 'knockdown':
        this.fx.dust(e.x, true);
        this.audio.play('slam', { pan: this.pan(e.x), volume: 0.6 });
        break;
      case 'wall':
        this.fx.wall(e.x, e.y);
        this.audio.play('wall', { pan: this.pan(e.x) });
        break;
      case 'jump':
        this.fx.dust(e.x, false);
        this.audio.play('jump', { volume: 0.4 });
        break;
      case 'super-freeze': {
        const f = this.fighters[e.fighter];
        this.fx.superCharge(f.x, f.y, e.color);
        this.camera.cinematic(f.x, 140 * f.scale, 1.45, e.frames * 1.2, f.facing * -0.02);
        this.flash.setDarken(0.6);
        this.audio.play('super');
        this.callout(e.name.toUpperCase(), 'super', e.fighter as 0 | 1, 'SUPER');
        break;
      }
      case 'lock-start':
        if (e.darken) this.flash.setDarken(0.55);
        break;
      case 'lock-step':
        if (e.sfx) this.audio.play(e.sfx, { pan: this.pan(e.x) });
        if (e.flash) this.flash.flash('#ffffff', 0.45);
        if (e.shake) this.fx.shakeScreen(e.shake);
        if (e.slowmo) this.host.slowmo(e.slowmo * SIM_DT_MS * 3);
        if (e.zoom) {
          const a = this.fighters[e.attacker];
          this.camera.cinematic((a.x + e.x) / 2, e.y, e.zoom, 50, e.zoom > 1.5 ? a.facing * 0.025 : 0);
        }
        if (e.blood) {
          this.fx.blood(e.x, e.y, 1, e.blood);
          this.fx.blood(e.x, e.y, -1, Math.round(e.blood / 2));
        }
        if (e.text) this.callout(e.text, 'finisher', e.attacker as 0 | 1);
        break;
      case 'lock-end':
        this.flash.setDarken(0);
        if (e.showSummary) this.callout(e.name.toUpperCase(), 'summary', e.attacker as 0 | 1, `${e.damage} DMG`);
        break;
      case 'throw-tech':
        this.fx.block(e.x, e.y, 1, true);
        this.audio.play('tech');
        this.callout('ESCAPE', 'escape', -1);
        break;
      case 'combo': {
        const draft = this.hud.draft;
        if (e.hits === 2) this.comboIds[e.attacker] = this.hud.nextId();
        draft.combo[e.attacker] = { id: this.comboIds[e.attacker], hits: e.hits, damage: e.damage, ended: false };
        draft.maxCombo[e.attacker] = Math.max(draft.maxCombo[e.attacker], e.hits);
        this.audio.play('combo', { pitch: 1 + Math.min(e.hits, 12) * 0.06, volume: 0.6 });
        break;
      }
      case 'combo-end': {
        const draft = this.hud.draft;
        const c = draft.combo[e.attacker];
        if (c) draft.combo[e.attacker] = { ...c, ended: true };
        break;
      }
      case 'combo-break':
        this.callout('COMBO BREAK', 'break', e.attacker as 0 | 1);
        break;
      case 'counter-hit':
        this.callout('COUNTER', 'counter', e.attacker as 0 | 1);
        break;
      case 'finisher-outcome':
        if (e.outcome === 'disintegrate') this.fx.disintegrate(e.x, this.fighters[1 - e.fighter].def.visual.palette.glow);
        else this.fx.shatter(e.x);
        this.audio.play('explosion', { volume: 0.7 });
        break;
      case 'frame-advantage':
        this.host.onFrameAdvantage(e);
        break;
      default:
        break;
    }
  }
}
