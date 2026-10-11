import type { Fighter } from '../characters/Fighter';
import {
  CHIP_DAMAGE_RATIO,
  COMBO_SCALING_FLOOR,
  COMBO_SCALING_STEP,
  COUNTER_HIT_MULT,
  METER_PER_DAMAGE_DEALT,
  METER_PER_DAMAGE_TAKEN,
} from '../core/constants';
import type { HitLevel } from './AttackData';

/** Combo scaling: the first two hits deal full damage, later hits are scaled down to a floor. */
export const comboScale = (hitsSoFar: number): number =>
  hitsSoFar < 2 ? 1 : Math.max(COMBO_SCALING_FLOOR, Math.pow(COMBO_SCALING_STEP, hitsSoFar - 1));

export interface DamageInput {
  base: number;
  attackerMult: number;
  defenderMult: number;
  comboHits: number;
  counterHit: boolean;
}

export const computeDamage = (d: DamageInput): number => {
  const raw = d.base * d.attackerMult * d.defenderMult * comboScale(d.comboHits) * (d.counterHit ? COUNTER_HIT_MULT : 1);
  return Math.max(1, Math.round(raw));
};

export const chipDamage = (base: number, isSpecial: boolean): number => (isSpecial ? Math.round(base * CHIP_DAMAGE_RATIO) : 0);

/** High/mid are blocked standing, low (and high, which whiffs anyway) crouching — per the design doc. */
export const canBlockLevel = (level: HitLevel, crouching: boolean): boolean => {
  if (level === 'unblockable') return false;
  if (crouching) return level === 'low' || level === 'high';
  return level === 'high' || level === 'mid';
};

/** High attacks pass over crouching opponents. */
export const whiffsOnCrouch = (level: HitLevel, defenderCrouching: boolean, attackerAirborne: boolean): boolean =>
  level === 'high' && defenderCrouching && !attackerAirborne;

/** Applies damage, meter gain and stats. Returns the damage actually dealt. */
export const applyDamage = (attacker: Fighter | null, defender: Fighter, amount: number): number => {
  const floor = defender.infiniteHealth ? 1 : 0;
  const dealt = Math.max(0, Math.min(amount, defender.hp - floor));
  defender.hp -= dealt;
  if (attacker) {
    attacker.stats.damageDealt += dealt;
    attacker.addMeter(dealt * METER_PER_DAMAGE_DEALT);
  }
  defender.addMeter(dealt * METER_PER_DAMAGE_TAKEN);
  return dealt;
};
