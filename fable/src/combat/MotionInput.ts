import type { Motion } from './AttackData';

/** Direction codes relative to facing: f forward, b back, d down, df/db diagonals, n neutral, u up. */
export type DirCode = 'n' | 'f' | 'b' | 'd' | 'df' | 'db' | 'u';

export const dirCode = (fwd: -1 | 0 | 1, y: -1 | 0 | 1): DirCode => {
  if (y > 0) return 'u';
  if (y < 0) return fwd > 0 ? 'df' : fwd < 0 ? 'db' : 'd';
  return fwd > 0 ? 'f' : fwd < 0 ? 'b' : 'n';
};

/**
 * Checks a motion against a direction history (oldest first, already limited to the motion window).
 * Consecutive duplicates are collapsed so hold duration does not matter.
 */
export const matchesMotion = (history: readonly DirCode[], motion: Motion): boolean => {
  const seq: DirCode[] = [];
  for (const c of history) {
    if (seq[seq.length - 1] !== c) seq.push(c);
  }
  const n = seq.length;
  if (motion === 'ff') {
    // forward, something else, forward - with the final forward being the latest or second latest code
    for (let end = n - 1; end >= Math.max(0, n - 2); end--) {
      if (seq[end] !== 'f') continue;
      for (let i = end - 1; i >= 0; i--) {
        if (seq[i] === 'f') return i < end - 1;
        if (seq[i] === 'b' || seq[i] === 'db') return false;
      }
    }
    return false;
  }
  const last = seq[n - 1];
  const prev = seq[n - 2];
  if (motion === 'df') {
    const hasForward = last === 'f' || last === 'df' || (prev !== undefined && (prev === 'df' || prev === 'f'));
    if (!hasForward) return false;
    for (let i = n - 1; i >= Math.max(0, n - 4); i--) {
      if (seq[i] === 'd' || seq[i] === 'db' || seq[i] === 'df') return true;
    }
    return false;
  }
  const hasBack = last === 'b' || last === 'db' || (prev !== undefined && (prev === 'db' || prev === 'b'));
  if (!hasBack) return false;
  for (let i = n - 1; i >= Math.max(0, n - 4); i--) {
    if (seq[i] === 'd' || seq[i] === 'df' || seq[i] === 'db') return true;
  }
  return false;
};
