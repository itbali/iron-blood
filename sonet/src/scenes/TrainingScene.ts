import type { DummyMode } from '../ai/AIController';
import type { FightConfig } from '../game/FightConfig';
import { FightScene, type SceneDeps } from './FightScene';

export interface TrainingState {
  infiniteHealth: boolean;
  infiniteMeter: boolean;
  hitboxes: boolean;
  frameData: boolean;
  dummy: DummyMode;
}

/** Training mode: perpetual fight, a configurable dummy, and a live read-out of frame data. */
export class TrainingScene extends FightScene {
  readonly state: TrainingState = { infiniteHealth: true, infiniteMeter: true, hitboxes: false, frameData: true, dummy: 'stand' };

  constructor(deps: SceneDeps, cfg: FightConfig) {
    super(deps, cfg);
    this.apply();
  }

  private apply(): void {
    const [a, b] = this.sim.fighters;
    a.infiniteHealth = this.state.infiniteHealth;
    b.infiniteHealth = this.state.infiniteHealth;
    this.sim.infiniteMeter = [this.state.infiniteMeter, this.state.infiniteMeter];
    this.debug = this.state.hitboxes;
    const ai = this.ai[1];
    if (ai) {
      ai.mode = this.state.dummy;
      ai.enabled = true;
    }
  }

  set(patch: Partial<TrainingState>): void {
    Object.assign(this.state, patch);
    this.apply();
  }

  resetPosition(): void {
    this.sim.resetPositions();
    this.sim.fighters.forEach((f) => (f.hp = f.maxHp));
  }

  protected override afterStep(): void {
    this.debug = this.state.hitboxes || this.debug;
  }

  toggleDebug(): void {
    this.debug = !this.debug;
    this.state.hitboxes = this.debug;
  }

  info(): string {
    const sim = this.sim;
    const [a, b] = sim.fighters;
    const m = a.lastMove;
    const lines = [
      `FPS ${this.fps}   FRAME ${sim.frame}`,
      `STATE ${a.state}   VEL ${a.vx.toFixed(1)}, ${a.vy.toFixed(1)}`,
      `HP ${Math.ceil(a.hp)}   METER ${a.meter.toFixed(0)}   DUMMY ${Math.ceil(b.hp)}`,
    ];
    if (this.state.frameData && m) {
      const at = m.attack;
      lines.push(
        '',
        `LAST ATTACK  ${m.name}`,
        `STARTUP ${at.startup}  ACTIVE ${at.active}  RECOVERY ${at.recovery}`,
        `DAMAGE ${at.damage}  LEVEL ${at.hitLevel.toUpperCase()}`,
        `FRAME ADV ${a.lastAdvantage === null ? '-' : (a.lastAdvantage >= 0 ? '+' : '') + a.lastAdvantage}${a.lastResult ? ' (' + a.lastResult.toUpperCase() + ')' : ''}`,
      );
    }
    const c = sim.combo.info[0];
    lines.push('', `COMBO ${c.active ? c.hits : 0}   DAMAGE ${c.damage}   MAX ${sim.combo.maxCombo[0]}`);
    return lines.join('\n');
  }
}
