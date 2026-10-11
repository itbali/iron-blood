export interface ComboInfo {
  hits: number;
  damage: number;
  active: boolean;
}

export interface ComboEnd {
  slot: number;
  hits: number;
  damage: number;
  dropped: boolean;
}

/** Tracks the combo each fighter is currently landing; the victim's stun state decides when it ends. */
export class ComboSystem {
  readonly info: ComboInfo[] = [
    { hits: 0, damage: 0, active: false },
    { hits: 0, damage: 0, active: false },
  ];
  readonly maxCombo = [0, 0];
  readonly maxComboDamage = [0, 0];

  reset(): void {
    for (const c of this.info) {
      c.hits = 0;
      c.damage = 0;
      c.active = false;
    }
  }

  hitsSoFar(slot: number): number {
    return this.info[slot].active ? this.info[slot].hits : 0;
  }

  register(slot: number, damage: number): number {
    const c = this.info[slot];
    if (!c.active) {
      c.active = true;
      c.hits = 0;
      c.damage = 0;
    }
    c.hits += 1;
    c.damage += damage;
    if (c.hits > this.maxCombo[slot]) this.maxCombo[slot] = c.hits;
    if (c.damage > this.maxComboDamage[slot]) this.maxComboDamage[slot] = c.damage;
    return c.hits;
  }

  /** Call once per tick with whether each victim is still locked in stun and whether they recovered into a free state. */
  update(victimStunned: [boolean, boolean], victimFree: [boolean, boolean]): ComboEnd[] {
    const ended: ComboEnd[] = [];
    for (let slot = 0; slot < 2; slot++) {
      const c = this.info[slot];
      if (!c.active) continue;
      const victim = 1 - slot;
      if (!victimStunned[victim]) {
        ended.push({ slot, hits: c.hits, damage: c.damage, dropped: c.hits >= 2 && victimFree[victim] });
        c.active = false;
      }
    }
    return ended;
  }

  /** The victim hit back or blocked: whoever was comboing loses it. */
  breakCombo(slot: number): ComboEnd | null {
    const c = this.info[slot];
    if (!c.active) return null;
    c.active = false;
    return { slot, hits: c.hits, damage: c.damage, dropped: c.hits >= 2 };
  }
}
