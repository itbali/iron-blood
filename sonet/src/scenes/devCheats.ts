import type { FightScene } from './FightScene';

/** Development-only cheats. Only reachable through a dynamic import guarded by import.meta.env.DEV. */
export function devKey(scene: FightScene, code: string): void {
  const { sim, ai } = scene.internals;
  const [a, b] = sim.fighters;
  if (code === 'F4') a.infiniteHealth = !a.infiniteHealth;
  if (code === 'F5') sim.infiniteMeter[0] = !sim.infiniteMeter[0];
  if (code === 'F6') {
    a.hp = a.maxHp;
    b.hp = b.maxHp;
  }
  if (code === 'F7') scene.restart();
  if (code === 'F8') for (const c of ai) if (c) c.enabled = !c.enabled;
}
