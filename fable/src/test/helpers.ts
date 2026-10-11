import { Simulation, type SimulationOptions } from '@/game/Simulation';
import { CHARACTERS } from '@/data/characters';
import type { CharacterId } from '@/core/types';
import { EMPTY_INPUT, makeInput, type InputFrame } from '@/input/InputFrame';
import { ROUND_ANNOUNCE_FRAMES, FIGHT_ANNOUNCE_FRAMES } from '@/core/constants';

export const makeSim = (p1: CharacterId = 'raven', p2: CharacterId = 'brute', opts: Partial<SimulationOptions> = {}): Simulation =>
  new Simulation(CHARACTERS[p1], CHARACTERS[p2], {
    seed: 1,
    rounds: 2,
    timeLimit: 99,
    training: false,
    finishers: false,
    skipIntro: true,
    ...opts,
  });

export type InputScript = (frame: number, sim: Simulation) => [InputFrame, InputFrame];

export const run = (sim: Simulation, frames: number, script: InputScript = () => [EMPTY_INPUT, EMPTY_INPUT]): void => {
  for (let i = 0; i < frames; i++) sim.tick(script(i, sim));
};

/** Advances past ROUND / FIGHT announcements so inputs are live. */
export const toFight = (sim: Simulation): void => {
  run(sim, ROUND_ANNOUNCE_FRAMES + FIGHT_ANNOUNCE_FRAMES + 1);
};

/** A press on one frame, then neutral. */
export const pressOnce = (button: number, x: -1 | 0 | 1 = 0, y: -1 | 0 | 1 = 0): InputFrame => makeInput(x, y, button, button);

export const hold = (x: -1 | 0 | 1, y: -1 | 0 | 1 = 0, held = 0): InputFrame => makeInput(x, y, held, 0);

export const idle = EMPTY_INPUT;

/** Walks P1 toward P2 until they are within `range` (both characters hold neutral otherwise). */
export const closeIn = (sim: Simulation, range = 150, maxFrames = 400): void => {
  for (let i = 0; i < maxFrames; i++) {
    if (Math.abs(sim.p2.x - sim.p1.x) <= range) {
      sim.tick([idle, idle]);
      sim.tick([idle, idle]);
      return;
    }
    sim.tick([hold(1), idle]);
  }
};
