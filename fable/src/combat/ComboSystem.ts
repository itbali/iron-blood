import { COMBO_DROP_FRAMES } from '@/core/constants';
import type { Emitter } from '@/core/events';
import type { PlayerSide } from '@/core/types';
import type { SimEvents } from './SimContext';

export interface ComboTrack {
  hits: number;
  damage: number;
  /** Frames since the last hit while the victim is still in stun. */
  idle: number;
  active: boolean;
  maxHits: number;
  maxDamage: number;
}

/**
 * Tracks combos per attacker. A combo continues as long as the next hit lands
 * while the victim is still in hitstun/juggle; otherwise it ends (naturally or dropped).
 */
export class ComboSystem {
  readonly tracks: [ComboTrack, ComboTrack] = [newTrack(), newTrack()];

  constructor(private events: Emitter<SimEvents>) {}

  reset(): void {
    for (const t of this.tracks) {
      t.hits = 0;
      t.damage = 0;
      t.idle = 0;
      t.active = false;
    }
  }

  registerHit(side: PlayerSide, damage: number, victimInStun: boolean): void {
    const t = this.tracks[side];
    if (!t.active || !victimInStun) {
      t.hits = 0;
      t.damage = 0;
    }
    t.active = true;
    t.hits++;
    t.damage += damage;
    t.idle = 0;
    if (t.hits > t.maxHits) t.maxHits = t.hits;
    if (t.damage > t.maxDamage) t.maxDamage = t.damage;
    this.events.emit('combo', { side, hits: t.hits, damage: t.damage });
  }

  /** Called every tick with whether the victim of each side is still in stun. */
  update(victimInStun: [boolean, boolean], attackerWhiffed: [boolean, boolean]): void {
    for (let side = 0 as PlayerSide; side < 2; side = (side + 1) as PlayerSide) {
      const t = this.tracks[side];
      if (!t.active) continue;
      if (victimInStun[side]) {
        t.idle = 0;
        continue;
      }
      t.idle++;
      if (t.idle >= COMBO_DROP_FRAMES || attackerWhiffed[side]) {
        const dropped = attackerWhiffed[side] && t.hits >= 2;
        this.events.emit('comboEnd', { side, hits: t.hits, damage: t.damage, dropped });
        t.active = false;
        t.hits = 0;
        t.damage = 0;
        t.idle = 0;
      }
    }
  }
}

const newTrack = (): ComboTrack => ({ hits: 0, damage: 0, idle: 0, active: false, maxHits: 0, maxDamage: 0 });
