export type AIState = 'neutral' | 'pressure' | 'defend' | 'recover' | 'zone';

export interface AIWeights {
  approach: number;
  retreat: number;
  attack: number;
  block: number;
  jump: number;
  special: number;
  grab: number;
  combo: number;
}

export interface StateInput {
  dist: number;
  idealDist: number;
  enemyAttacking: boolean;
  enemyBlocking: boolean;
  enemyAirborne: boolean;
  enemyStunned: boolean;
  ownStunned: boolean;
  ownHpRatio: number;
  enemyHpRatio: number;
  projectileThreat: boolean;
  zoner: boolean;
  ownMeterFull: boolean;
}

/** High-level behaviour state. Pure function of what the AI can observe, so it stays fair and testable. */
export class AIStateMachine {
  state: AIState = 'neutral';
  private lock = 0;

  update(i: StateInput, aggression: number): AIState {
    if (this.lock > 0) {
      this.lock--;
      return this.state;
    }
    let next: AIState = 'neutral';
    if (i.ownStunned) next = 'recover';
    else if (i.enemyAttacking && i.dist < 420) next = 'defend';
    else if (i.enemyStunned || (i.enemyBlocking && i.dist < 220)) next = 'pressure';
    else if (i.zoner && i.dist > 320 && aggression < 0.8) next = 'zone';
    if (next !== this.state) {
      this.state = next;
      this.lock = 4;
    }
    return this.state;
  }

  weights(i: StateInput, aggression: number): AIWeights {
    const w: AIWeights = { approach: 1, retreat: 0.2, attack: 0.4, block: 0.2, jump: 0.1, special: 0.2, grab: 0.1, combo: 0.4 };
    const lowHp = i.ownHpRatio < 0.3 ? 1 : 0;
    switch (this.state) {
      case 'neutral':
        w.approach = 1.2 * aggression + 0.3;
        w.attack = i.dist < i.idealDist + 60 ? 1.1 * aggression + 0.2 : 0.1;
        w.retreat = i.dist < i.idealDist - 80 ? 0.9 : 0.15;
        w.special = 0.3;
        break;
      case 'pressure':
        w.approach = 0.5;
        w.attack = 1.4 * aggression + 0.3;
        w.grab = i.enemyBlocking ? 1.0 : 0.15;
        w.combo = 1.0;
        w.special = 0.4;
        break;
      case 'defend':
        w.block = 1.4 + lowHp;
        w.retreat = 0.7;
        w.attack = 0.2;
        w.jump = 0.2;
        break;
      case 'recover':
        w.block = 0.9;
        w.retreat = 0.8;
        w.attack = 0.1;
        break;
      case 'zone':
        w.special = 1.2;
        w.retreat = 0.5;
        w.approach = 0.3;
        w.attack = 0.1;
        break;
    }
    if (i.projectileThreat) {
      w.jump += 0.7;
      w.block += 0.5;
    }
    if (i.enemyAirborne) w.attack += 0.4;
    return w;
  }
}
