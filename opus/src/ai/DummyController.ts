import type { Fighter } from '../characters/Fighter';
import type { FrameInput } from '../input/InputTypes';
import { Button } from '../input/InputTypes';

export type DummyMode = 'stand' | 'crouch' | 'block' | 'block-low' | 'jump' | 'cpu';

export const DUMMY_MODES: { id: DummyMode; label: string }[] = [
  { id: 'stand', label: 'Stand' },
  { id: 'crouch', label: 'Crouch' },
  { id: 'block', label: 'Block High' },
  { id: 'block-low', label: 'Block Low' },
  { id: 'jump', label: 'Jump' },
  { id: 'cpu', label: 'CPU' },
];

/** Training dummy: produces fixed postures through the normal input path. */
export class DummyController {
  mode: DummyMode = 'stand';
  private t = 0;

  update(self: Fighter): FrameInput {
    this.t++;
    void self;
    switch (this.mode) {
      case 'crouch':
        return { x: 0, y: -1, held: 0, pressed: 0 };
      case 'block':
        return { x: 0, y: 0, held: Button.BLOCK, pressed: 0 };
      case 'block-low':
        return { x: 0, y: -1, held: Button.BLOCK, pressed: 0 };
      case 'jump':
        return { x: 0, y: this.t % 50 < 3 ? 1 : 0, held: 0, pressed: 0 };
      default:
        return { x: 0, y: 0, held: 0, pressed: 0 };
    }
  }
}
