# IRON BLOOD

A dark cyberpunk 2D fighting game that runs in the browser. Frame-based combat, combos, specials, perfect blocks, throws, an AI opponent with four difficulty levels, six fighters plus a two-phase boss, three arenas, Arcade / Versus / Training modes, cinematic finishers, settings and persistent progression.

Everything is procedural: fighters, stages, particles and sound are generated at runtime, so the game has no binary assets and loads instantly.

## Running

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle in dist/
npm run preview    # serve the production build
npm test           # Vitest: combat, combos, specials, AI, rounds, finishers, saves
npm run lint       # ESLint
```

Node 18+ is required. The production build is static and can be hosted from any file server (`base: './'`).

## Controls

| Action | Player 1 | Player 2 (Versus) |
| --- | --- | --- |
| Move | A / D | ← / → |
| Jump | W | ↑ |
| Crouch | S | ↓ |
| Light punch | J | Numpad 1 |
| Heavy punch | K | Numpad 2 |
| Light kick | L | Numpad 3 |
| Heavy kick | ; | Numpad 6 |
| Special 1 | I | Numpad 4 |
| Special 2 | O | Numpad 5 |
| Block | Space | Numpad 0 |
| Grab | E | Numpad Enter |
| Pause | Esc | |
| Restart (paused / after match) or reset position (training) | R | |

All keys can be rebound in Settings → Controls. Menus use W/S or the arrows plus Enter, Esc goes back.

Raven's moves: `I` Crimson Slash (projectile), `→ → I` Blood Dash, `O` Execution Grab, `I + O` with a full meter Blood Rush. After the final KO walk up to the dazed opponent and press a special to perform the finisher. Standing block covers highs and mids, crouching block covers lows and mids, throws beat blocks, blocking right before impact is a Perfect Block.

### Debug and developer keys

| Key | Effect |
| --- | --- |
| F3 | Debug overlay: hitboxes (red), hurtboxes (green), push boxes (blue), origin, FPS, states, velocities, input buffer, AI state, frame advantage |
| F4 | Infinite health for P1 (dev build only) |
| F5 | Infinite meter for P1 (dev build only) |
| F6 | Refill both health bars (dev build only) |
| F7 | Reset positions (dev build only) |
| F8 | Toggle the AI (dev build only) |

The F4–F8 cheats are compiled out of production builds (`import.meta.env.DEV`). In dev builds `window.__ironblood` exposes the running `Game` instance for scripting.

## Architecture

The simulation is headless and deterministic: it consumes one `InputFrame` per fighter per tick and never touches the DOM. Rendering, audio, particles and the React HUD subscribe to its events. This keeps combat timing stable (fixed 60 Hz step with an accumulator) and leaves the door open for rollback netcode: inputs are plain data, AI decisions use a seeded PRNG, and a match can be replayed from its input stream.

```
src/
  core/          constants (all tunables), types, seeded RNG, event emitter, math
  input/         InputFrame (pure input data), InputManager (keyboard + touch -> frames), KeyBindings
  combat/        Fighter state machine, AttackData, HitboxSystem, CombatSystem, DamageSystem,
                 ComboSystem, MotionInput (→→ / ↓→ / ↓←), Projectile
  characters/    CharacterConfig type (stats, attacks, lines, palette, body shape, AI profile)
  data/          characters/*.ts (one config per fighter), attacks.ts (normals builder), stages.ts
  ai/            AIController (perception with reaction delay -> plans -> inputs), Difficulty profiles
  game/          Simulation (rounds, timer, KO, finisher window, boss phase), Game (wires systems),
                 GameLoop (fixed step, slow motion), GameState / FightUiState (HUD data)
  render/        Renderer (stage, fighters, projectiles, particles, post effects, debug),
                 SpriteRenderer + Pose (procedural skeletal animation), StageRenderer (parallax layers)
  effects/       ParticleSystem (pooled), ScreenShake, Camera, HitEffects (events -> feedback)
  audio/         AudioManager (procedural WebAudio SFX + sequenced music)
  scenes/        SceneManager (screen routing), ArcadeMode (ladder), FightScene (match configs)
  ui/            React screens: MainMenu, CharacterSelect, FightScreen, HUD, PauseMenu, Settings,
                 ResultOverlay, ArcadeComplete, CharactersScreen, TrainingPanel, TouchControls
  progression/   SaveManager (saveGame / loadGame / resetSave with corruption fallback),
                 Progression (unlock rules), Settings (validated persisted settings)
  state/         tiny external store consumed through useSyncExternalStore
```

Game loop order per tick: input → fighter update (state machine + physics) → projectiles → combat resolution → push apart → phase/timer. AI runs before the tick and only produces an `InputFrame`, so it obeys the same rules as a player. Rendering runs on `requestAnimationFrame` independently of the simulation; the HUD store is updated at most every 50 ms or on important events, so React never re-renders per frame.

### Combat model

Every attack is data (`AttackData`): startup / active / recovery frames, damage, hitstun, blockstun, knockback, pushback, hit level, cancel list, hitboxes active only during the active frames, plus optional movement, invulnerability, armor, projectile, grab, teleport, counter and multi-hit descriptors. The fighter state machine (`IDLE WALK CROUCH JUMP ATTACK SPECIAL BLOCK BLOCKSTUN HIT HURT KNOCKDOWN GETUP GRAB GRABBED THROW DEAD VICTORY DEFEAT INTRO FINISHER FINISHED`) owns an input buffer (10 frames ≈ 166 ms) and a direction history for motion inputs. Combos chain through `cancelInto` once a hit connects; damage scales down with combo length.

## Adding a character

1. Create `src/data/characters/<id>.ts` exporting a `CharacterConfig`. Use `buildNormals()` for the twelve normals and the throw, then add specials and a super with `baseAttack()`.
2. Give it lines, a palette, a body shape (height, bulk, head style) for the procedural renderer, a finisher descriptor and an `ai` profile (combos, specials by range, aggression).
3. Register it in `src/data/characters/index.ts` (`CHARACTERS`, and `ROSTER` to show it in the grid) and add the id to `CharacterId` in `src/core/types.ts`.

No combat code changes are needed: `CombatSystem`, `Fighter` and `AIController` only read configs.

## Adding an attack

Add an entry to the character's `attacks` map:

```ts
myMove: baseAttack({
  id: 'myMove', name: 'My Move', anim: 'heavyPunch',
  input: { button: Btn.SP1, motion: 'df' },      // ↓ → I ; omit motion for a plain button
  category: 'special',
  startup: 10, active: 4, recovery: 20,
  damage: 120, hitstun: 22, blockstun: 14, knockback: 10, pushback: 8, hitLevel: 'mid',
  hitboxes: [box(80, 110, 100, 80)],              // x forward, y up, w, h (local space)
  movement: { active: 12 }, invuln: [0, 8], knockdown: true,
  hitStop: HITSTOP_SPECIAL, effect: 'energy', sound: 'special', meterGain: 80,
}),
```

Reference it from other attacks' `cancelInto` lists to make it part of combo routes, and from the character's `ai` profile so the AI uses it. Animations are named poses in `src/render/Pose.ts`; reuse an existing `anim` or add a keyframe list.

## Adding a stage

Add a `StageConfig` to `src/data/stages.ts` (palette, weather flags) and, for unique architecture, a branch in `StageRenderer.paintMid()`.

## Persistence

Settings and progress live in `localStorage` (`ironblood.settings.v1`, `ironblood.save.v1`). Both are validated field by field on load; corrupted or partial data falls back to defaults without crashing.

## Technology

TypeScript (strict), React 19, Vite 7, Canvas 2D, WebAudio, Vitest. Phaser was deliberately not used: a hand-rolled fixed-step loop keeps the simulation headless and deterministic, which is what frame-accurate combat and future rollback need.
