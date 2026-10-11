import type { Fighter } from '../characters/Fighter';
import { FighterState } from '../characters/FighterState';
import { START_OFFSET } from '../core/constants';
import { easeInOutQuad } from '../core/math';
import type { Camera } from '../render/Camera';
import type { HudStore } from './HudStore';

const WALK_FROM = 560;
const WALK_START = 20;
const WALK_END = 115;
const CLOSEUP_1 = 125;
const CLOSEUP_2 = 210;
const WIDE = 295;

/**
 * Pre-fight cinematic: establishing shot, both fighters walk in, face close-ups with
 * one line of dialogue each, then a wide shot before ROUND 1.
 */
export class IntroDirector {
  constructor(
    private readonly fighters: [Fighter, Fighter],
    private readonly camera: Camera,
    private readonly hud: HudStore,
    private readonly lines: [string, string],
  ) {}

  start(): void {
    const [a, b] = this.fighters;
    a.x = a.prevX = -START_OFFSET - WALK_FROM;
    b.x = b.prevX = START_OFFSET + WALK_FROM;
    a.facing = 1;
    b.facing = -1;
    for (const f of this.fighters) f.setState(FighterState.INTRO);
    this.camera.reset(-500);
    this.camera.cinematic(0, 200, 0.92, 60);
  }

  /** Called after physics so it can override positions while walking in. */
  tick(frame: number): void {
    const [a, b] = this.fighters;
    if (frame >= WALK_START && frame <= WALK_END) {
      const p = easeInOutQuad((frame - WALK_START) / (WALK_END - WALK_START));
      const prevA = a.x;
      const prevB = b.x;
      a.x = -START_OFFSET - WALK_FROM * (1 - p);
      b.x = START_OFFSET + WALK_FROM * (1 - p);
      a.vx = a.x - prevA;
      b.vx = b.x - prevB;
    } else if (frame > WALK_END) {
      a.vx = 0;
      b.vx = 0;
    }
    if (frame === CLOSEUP_1) this.closeUp(0);
    if (frame === CLOSEUP_2) this.closeUp(1);
    if (frame === WIDE) {
      this.camera.cinematic(0, 150, 1.0, 40);
      this.hud.draft.subtitle = null;
    }
  }

  private closeUp(i: 0 | 1): void {
    const f = this.fighters[i];
    const headY = (f.def.visual.build.thigh + f.def.visual.build.shin + f.def.visual.build.torso + 10) * f.scale;
    this.camera.cinematic(f.x + f.facing * 30, headY, 2.3 / Math.max(1, f.scale * 0.9), 85, i === 0 ? -0.03 : 0.03);
    this.hud.draft.subtitle = { id: this.hud.nextId(), speaker: f.def.name.toUpperCase(), text: this.lines[i], side: i };
  }

  finish(): void {
    const [a, b] = this.fighters;
    a.x = a.prevX = -START_OFFSET;
    b.x = b.prevX = START_OFFSET;
    a.vx = b.vx = 0;
    for (const f of this.fighters) f.setState(FighterState.IDLE);
    this.camera.clearCinematic();
    this.hud.draft.subtitle = null;
  }
}
