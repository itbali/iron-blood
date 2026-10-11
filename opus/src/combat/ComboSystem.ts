import { COMBO_BREAK_WINDOW } from '../core/constants';
import type { GameEvent } from '../game/events';

interface ComboTrack {
  hits: number;
  damage: number;
  active: boolean;
  endedAtFrame: number;
  lastEndedHits: number;
  max: number;
}

/**
 * Tracks combos per attacker. A combo continues while the defender stays in hit/juggle stun;
 * it ends the frame the defender becomes actionable. If the attacker tries to continue right
 * after a combo of 2+ hits but the attack whiffs or is blocked, a COMBO BREAK is reported.
 */
export class ComboSystem {
  private tracks: [ComboTrack, ComboTrack] = [this.fresh(), this.fresh()];

  private fresh(): ComboTrack {
    return { hits: 0, damage: 0, active: false, endedAtFrame: -999, lastEndedHits: 0, max: 0 };
  }

  reset(): void {
    const maxes = [this.tracks[0].max, this.tracks[1].max];
    this.tracks = [this.fresh(), this.fresh()];
    this.tracks[0].max = maxes[0];
    this.tracks[1].max = maxes[1];
  }

  /** Hits already in the current combo (before this one) — used for damage scaling. */
  currentHits(attacker: number): number {
    return this.tracks[attacker].active ? this.tracks[attacker].hits : 0;
  }

  get(attacker: number): Readonly<ComboTrack> {
    return this.tracks[attacker];
  }

  maxCombo(attacker: number): number {
    return this.tracks[attacker].max;
  }

  registerHit(attacker: number, damage: number, defenderWasStunned: boolean, events: GameEvent[]): void {
    const t = this.tracks[attacker];
    if (!t.active || !defenderWasStunned) {
      t.hits = 0;
      t.damage = 0;
      t.active = true;
    }
    t.hits++;
    t.damage += damage;
    if (t.hits > t.max) t.max = t.hits;
    if (t.hits >= 2) events.push({ type: 'combo', attacker, hits: t.hits, damage: t.damage });
  }

  /** Adds damage from lock sequences (throw hits) without counting extra hits twice. */
  addLockHit(attacker: number, damage: number, events: GameEvent[]): void {
    this.registerHit(attacker, damage, true, events);
  }

  /** Called every frame with whether each defender can act; ends combos when they recover. */
  update(frame: number, defenderActionable: [boolean, boolean], events: GameEvent[]): void {
    for (let attacker = 0; attacker < 2; attacker++) {
      const t = this.tracks[attacker];
      const defender = 1 - attacker;
      if (t.active && defenderActionable[defender]) {
        if (t.hits >= 2) events.push({ type: 'combo-end', attacker, hits: t.hits, damage: t.damage });
        t.active = false;
        t.endedAtFrame = frame;
        t.lastEndedHits = t.hits;
        t.hits = 0;
        t.damage = 0;
      }
    }
  }

  /** The attacker's follow-up attack missed or was blocked. */
  onFailedFollowUp(attacker: number, frame: number, events: GameEvent[]): void {
    const t = this.tracks[attacker];
    if (!t.active && t.lastEndedHits >= 2 && frame - t.endedAtFrame <= COMBO_BREAK_WINDOW) {
      events.push({ type: 'combo-break', attacker });
      t.lastEndedHits = 0;
    }
  }
}
