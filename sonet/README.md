# IRON BLOOD

A dark, cinematic 2D arcade fighting game that runs entirely in the browser.
TypeScript + React + Vite, rendered on the Canvas API with a custom fixed-timestep engine. No backend.

## Run

```bash
npm install
npm run dev       # development server (http://localhost:5173), dev cheats enabled
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
npm test          # Vitest suite (combat, combos, AI, rounds, saves)
npm run lint
```

## Modes

- **Arcade** – pick a fighter and difficulty, beat four opponents and the boss **The Archon** (2 phases). Completing it unlocks alternate skins, Nightmare difficulty, concept art/dossiers and The Archon as a playable fighter.
- **Versus** – two players on one keyboard, best of 3, rematch, arena select.
- **Training** – infinite health/meter, selectable dummy (stand/crouch/block/jump/AI), hitbox display, live frame data.
- **Characters** – roster, move lists, skins, concept art.

## Controls (rebindable in Settings)

| Action | P1 | P2 |
| --- | --- | --- |
| Move / Jump / Crouch | A D / W / S | Arrow keys |
| Light / Heavy punch | J / K | Num 1 / Num 2 (or 1 / 2) |
| Light / Heavy kick | L / ; | Num 3 / Num 4 (or 3 / 4) |
| Special 1 / Special 2 | I / O | Num 5 / Num 6 (or 5 / 6) |
| Block / Grab | Space / E | Num 0 / Num 7 (or 0 / 7) |
| Pause / Restart / Skip | Esc / R / Enter | |

Raven specials: **Blood Dash** `→ → I`, **Crimson Slash** `↓ → I`, **Execution Grab** `↓ ← O`, **Blood Rush** (super, full meter) `I + O`. Chains: `J → J → K`, `J → K → I`, `J → J → K → I`. Block just before a hit for a **Perfect Block**. After the deciding KO in Arcade/Versus, enter a finisher command shown on screen (or press Enter to skip).

Touch devices get an on-screen joystick and buttons (Settings → Game → Touch Controls).

## Debug

- `F3` – debug overlay: hitboxes (red), hurtboxes (green), push boxes (blue), origin, states, buffer, AI state, frame counters.
- Dev server only: `F4` infinite health, `F5` infinite meter, `F6` refill health, `F7` reset fight, `F8` toggle AI. These are stripped from production builds (`import.meta.env.DEV`).
- Dev server only: `/?fight=1&p1=raven&p2=brute&mode=arcade&stage=temple&ai=hard` jumps straight into a fight and exposes `window.__ib`.

## Architecture

```
src/
  combat/      types, hitboxes, damage, combo tracking, combat resolution
  characters/  Fighter state machine + data files per character (Raven … Archon)
  data/        constants, move factories, character registry, stages
  game/        FightSim (deterministic 60 Hz tick), RoundManager, GameLoop, arcade ladder
  input/       InputManager, InputBuffer (motions, buffering), key bindings
  ai/          AIController, AIStateMachine, difficulty profiles
  effects/     pooled ParticleSystem, shake, slow motion, hit effects
  scenes/      FightScene/TrainingScene orchestration, camera, renderers, cinematic directors
  audio/       procedural Web Audio SFX and music
  progression/ save manager, settings store, unlock logic
  ui/          React screens, HUD markup, menus
```

Key rules:

- **Simulation is separate from rendering and React.** `FightSim.step()` consumes one `InputFrame` bitmask per player and emits events; it never touches DOM, audio or storage. Rendering, effects and sound subscribe to those events. The HUD is updated imperatively by `HudController`, so there are no React re-renders during a fight.
- **Frame-based combat.** Every attack has startup/active/recovery frames, damage, hitstun, blockstun, knockback, pushback and hit level. Hitboxes exist only on active frames. Hit-stop freezes the sim but keeps buffering input; slow motion scales loop time (`timeScale`).
- **AI uses the same input path.** `AIController` outputs `InputFrame`s (including motion inputs), reads only visible information, and reacts after a difficulty-dependent delay.
- **Procedural art and sound.** Fighters are skeletal poses drawn by `FighterRenderer`; replacing it with sprite sheets does not touch the combat system. Audio is synthesised by `AudioManager`; swap `play()` internals for samples later.

## Adding a character

1. Create `src/characters/MyFighter.ts` using `buildCharacter({...})`. Provide stats, `tune` (reach/speed), `specials` (use `projectileMove`, `lungeMove`, `riseMove`, `teleportMove`, `counterMove`, `commandGrab`, `superMove`), palette/style, skins, dialogue and finisher names.
2. Register it in `src/data/characters.ts` (and add the id to `ROSTER_IDS` to put it on the select screen).
3. Optional: add new poses to `src/scenes/render/poses.ts` and reference them from `anim: { wind, strike }`.

## Adding or tuning an attack

Normals come from `standardMoves(tune)` in `src/data/moveFactory.ts`; override individual fields with `overrides: { heavyPunch: { attack: { damage: 90 } } }` in the builder call. A custom move is a plain `MoveDef` (`attack` frame data, `hitboxes`, `anim`, optional `lunge`, `invuln`, `armor`, `projectile`, `teleport`, `counter`, `grab`, `multiHit`, `launch`). Put its id in another move's `attack.cancelInto` to make it chainable. Combat code does not need to change.

## Saving

Progress (`ironblood.save.v1`) and settings (`ironblood.settings.v1`) use `localStorage`. Corrupted data falls back to defaults field by field.
