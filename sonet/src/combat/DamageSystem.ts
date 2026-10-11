import { CHIP_RATIO, COMBO_SCALING_MIN, COMBO_SCALING_STEP } from '../data/constants';

/** Damage multiplier for the Nth hit (0-based) of a combo. */
export function comboScale(hitIndex: number): number {
  return Math.max(COMBO_SCALING_MIN, 1 - COMBO_SCALING_STEP * hitIndex);
}

export function computeDamage(base: number, attackerMult: number, hitIndex: number, bonus = 1): number {
  return Math.max(1, Math.round(base * attackerMult * comboScale(hitIndex) * bonus));
}

export function chipDamage(damage: number): number {
  return Math.max(1, Math.round(damage * CHIP_RATIO));
}

/** Chip damage may never finish a fighter. */
export function applyChip(hp: number, chip: number): number {
  return Math.max(1, hp - chip);
}
