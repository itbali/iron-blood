import { CHARACTERS } from '../data/characters';
import { FightSim, type SimConfig } from './FightSim';
import { Btn, type InputFrame } from '../input/InputFrame';

export function makeSim(p1 = 'raven', p2 = 'brute', over: Partial<SimConfig> = {}): FightSim {
  const sim = new FightSim({
    p1: { def: CHARACTERS[p1], skin: 'default' },
    p2: { def: CHARACTERS[p2], skin: 'default' },
    mode: 'versus',
    humanSlots: [0, 1],
    bossFight: false,
    finishers: false,
    round: { introFrames: 0 },
    ...over,
  });
  return sim;
}

/** Runs the sim until the round-announce phase is over and fighters are live. */
export function toFight(sim: FightSim): void {
  for (let i = 0; i < 400 && sim.rounds.phase !== 'fight'; i++) sim.step([0, 0]);
}

export function run(sim: FightSim, frames: number, a: InputFrame | ((f: number) => InputFrame) = 0, b: InputFrame | ((f: number) => InputFrame) = 0): void {
  for (let f = 0; f < frames; f++) {
    sim.step([typeof a === 'function' ? a(f) : a, typeof b === 'function' ? b(f) : b]);
  }
}

/** Holds a sequence of input frames, one entry per tick. */
export function script(seq: InputFrame[]): (f: number) => InputFrame {
  return (f) => seq[f] ?? 0;
}

export function tap(...bits: number[]): InputFrame[] {
  return [bits.reduce((m, b) => m | b, 0), 0];
}

export function place(sim: FightSim, gap: number): void {
  sim.fighters[0].x = -gap / 2;
  sim.fighters[1].x = gap / 2;
}

export { Btn };
