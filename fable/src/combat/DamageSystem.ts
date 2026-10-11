import { ARMOR_DAMAGE_RATIO, CHIP_RATIO, COMBO_SCALING_MIN, COMBO_SCALING_STEP, CRITICAL_DAMAGE_THRESHOLD } from '@/core/constants';
import type { AttackData } from './AttackData';

export interface DamageInput {
  baseDamage: number;
  attackerScale: number;
  comboHits: number;
  blocked: boolean;
  perfectBlock: boolean;
  armored: boolean;
  chipRatio: number;
  counterHit: boolean;
}

export interface DamageResult {
  damage: number;
  critical: boolean;
}

/** Combo scaling: each hit after the first reduces damage by a fixed step down to a floor. */
export const comboScale = (comboHits: number): number => Math.max(COMBO_SCALING_MIN, 1 - Math.max(0, comboHits - 1) * COMBO_SCALING_STEP);

export const calculateDamage = (input: DamageInput): DamageResult => {
  if (input.perfectBlock) return { damage: 0, critical: false };
  let dmg = input.baseDamage * input.attackerScale;
  if (input.blocked) {
    dmg = Math.round(dmg * (input.chipRatio > 0 ? input.chipRatio : 0));
    return { damage: dmg, critical: false };
  }
  dmg *= comboScale(input.comboHits);
  if (input.counterHit) dmg *= 1.2;
  if (input.armored) dmg *= ARMOR_DAMAGE_RATIO;
  const damage = Math.max(1, Math.round(dmg));
  return { damage, critical: damage >= CRITICAL_DAMAGE_THRESHOLD || input.counterHit };
};

export const chipRatioFor = (attack: AttackData): number => (attack.chip > 0 ? attack.chip : attack.category === 'special' || attack.category === 'super' ? CHIP_RATIO : 0);
