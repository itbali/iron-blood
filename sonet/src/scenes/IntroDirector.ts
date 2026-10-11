import { FighterState } from '../combat/types';
import { FIGHTER_START_X } from '../data/constants';
import type { FxContext } from '../effects/FxContext';
import { Camera } from './Camera';

const ease = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Scripted pre-fight cinematic: arena pan, fighters enter, face close-ups with one-liners. */
export class IntroDirector {
  private said = [false, false];
  private titled = false;
  private lines: [string, string] = ['', ''];

  constructor(private readonly c: FxContext, private readonly stageName: string, private readonly subtitles: () => boolean) {
    const pick = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)] ?? '';
    const [a, b] = c.sim.fighters;
    this.lines = [pick(a.def.dialogue.intro), pick(b.def.dialogue.intro)];
  }

  reset(): void {
    this.said = [false, false];
    this.titled = false;
  }

  step(frame: number, total: number): void {
    const { sim, camera, hud } = this.c;
    const [a, b] = sim.fighters;
    const headY = (f: typeof a): number => f.def.height * 0.86;

    if (!this.titled) {
      this.titled = true;
      hud.banner(this.stageName.toUpperCase(), { kind: 'info', sub: 'THE ARENA AWAITS', duration: 2200 });
    }

    // fighter entrances
    const enter = ease((frame - 55) / 95);
    const ax = lerp(-1050, -FIGHTER_START_X, enter);
    const bx = lerp(1050, FIGHTER_START_X, enter);
    a.x = ax;
    b.x = bx;
    for (const f of [a, b]) {
      if (frame < 150 && enter > 0 && enter < 1) {
        f.state = FighterState.WALK;
        f.walkDir = 1;
      } else {
        f.state = FighterState.IDLE;
      }
      f.vx = 0;
    }
    a.facing = 1;
    b.facing = -1;

    if (frame < 100) {
      const t = ease(frame / 100);
      camera.setOverride({ x: lerp(-420, 380, t), y: Camera.yFor(120, 0.84, 420), zoom: 0.84, strength: 1 });
    } else if (frame < 170) {
      const t = ease((frame - 100) / 70);
      camera.setOverride({ x: lerp(380, 0, t), y: Camera.yFor(120, lerp(0.84, 1.05, t), lerp(420, 410, t)), zoom: lerp(0.84, 1.05, t), strength: 1 });
    } else if (frame < 238) {
      const t = (frame - 170) / 68;
      const z = lerp(1.8, 2.05, t);
      camera.setOverride({ x: a.x + 46, y: Camera.yFor(headY(a), z, 300), zoom: z, strength: 1 });
      if (!this.said[0]) {
        this.said[0] = true;
        if (this.subtitles()) hud.subtitle(a.def.name, this.lines[0], 2100);
      }
    } else if (frame < 304) {
      const t = (frame - 238) / 66;
      const z = lerp(1.8, 2.05, t);
      camera.setOverride({ x: b.x - 46, y: Camera.yFor(headY(b), z, 300), zoom: z, strength: 1 });
      if (!this.said[1]) {
        this.said[1] = true;
        if (this.subtitles()) hud.subtitle(b.def.name, this.lines[1], 2100);
      }
    } else {
      const t = ease((frame - 304) / Math.max(1, total - 304));
      camera.setOverride({ x: 0, y: Camera.yFor(120, lerp(1.6, 1.05, t), 410), zoom: lerp(1.6, 1.05, t), strength: 1 - t });
    }
  }
}
