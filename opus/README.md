# IRON BLOOD

Оригинальный браузерный 2D-файтинг в духе аркадных файтингов 90-х: мрачный киберпанк / dark fantasy, подпольный турнир. Все персонажи, арены, музыка и звуки — оригинальные и генерируются процедурно (без внешних ассетов).

## Запуск

```bash
npm install      # зависимости
npm run dev      # dev-сервер: http://localhost:5173
npm run build    # production-сборка в dist/
npm run preview  # предпросмотр production-сборки
npm test         # Vitest: бой, комбо, раунды, сохранения
npm run lint     # ESLint
```

Бэкенд не нужен. Прогресс и настройки хранятся в `localStorage` (ключ `ironblood.save`).

## Режимы

- **ARCADE** — выбор бойца и сложности → 4 соперника → босс **THE ARCHON** (2000 HP, броня, PHASE 2 на 50% HP) → концовка, статистика и разблокировки (альт-скин, сложность NIGHTMARE, concept art, играбельный Archon).
- **VERSUS** — два игрока на одной клавиатуре, выбор арены, Best of 3, реванш.
- **TRAINING** — манекен (стойка / присед / блок / прыжок / CPU), бесконечные HP и метр, сброс позиции, хитбоксы, frame data и frame advantage.
- **CHARACTERS** — досье, характеристики, сильные/слабые стороны, список приёмов, concept art.
- **SETTINGS** — графика, звук, переназначение клавиш, доступность, сброс сохранения.

## Управление

| Действие | Игрок 1 | Игрок 2 |
|---|---|---|
| Движение | A / D | ← / → |
| Прыжок / присед | W / S | ↑ / ↓ |
| Лёгкий / тяжёлый удар рукой | J / K | Num1 / Num2 |
| Лёгкий / тяжёлый удар ногой | L / ; | Num3 / Num4 |
| Спецприём 1 / 2 | I / O | Num5 / Num6 |
| Блок (с ↓ — нижний блок) | Space | Num0 |
| Захват (повтор — вырваться) | E | Num . |
| Супер (полный метр) | I + O | Num5 + Num6 |

Системные: `Esc` — пауза, `R` — рестарт (в тренировке — сброс позиции), `F3` — debug.
Клавиши привязаны к `KeyboardEvent.code`, поэтому работают на любой раскладке (в т.ч. русской). На сенсорных устройствах появляются виртуальный джойстик и кнопки.

Raven: `→ → I` Blood Dash, `↓ → I` Crimson Slash, `↓ ← O` Execution Grab, `I` Red Fang, `O` Ripper Kick, `I + O` Blood Rush. Комбо: `J → J → K → I`. Добивания в фазе END HIM: `↓ ↓ I` Crimson Execution, `← → O` Iron Verdict.

## Debug и читы

- `F3` — хитбоксы (красные), хёртбоксы (зелёные), push-боксы (синие), точка origin, счётчик кадров + панель: FPS, состояние игры, состояние/скорость/позиция бойцов, текущая атака и кадр, буфер ввода, состояние AI, frame advantage.
- Только в `npm run dev` (вырезаются из production через `import.meta.env.DEV`): `F4` бесконечное HP, `F5` бесконечный метр, `F6` восстановить HP, `F7` рестарт боя, `F8` вкл/выкл AI.
- Dev deep-link: `http://localhost:5173/?fight=raven,archon,temple` — сразу бой.

## Архитектура

Движок — собственный Canvas 2D с фиксированным шагом 60 Гц (`GameLoop`), а не Phaser: frame-based боёвка, hitstop, детерминизм и разделение ввода/визуала проще реализовать напрямую. React отвечает только за меню и HUD; игровой цикл от React не зависит (HUD получает снапшот раз за кадр, компоненты подписаны на отдельные поля).

```
src/
  core/        constants (все тайминги в кадрах), math, детерминированный Rng
  input/       InputManager (keydown/up, удержание, защёлкивание нажатий, touch), InputBuffer (буфер ~150 мс, распознавание движений), KeyBindings
  combat/      AttackData (типы), HitboxSystem, DamageSystem, ComboSystem, CombatSystem (контр → броня → блок/perfect block → попадание), LockSystem (броски, кинематографичные суперы, контры, добивания), Projectile
  characters/  CharacterDef, Fighter (state machine IDLE/WALK/CROUCH/JUMP/ATTACK/BLOCK/HIT/HURT/KNOCKDOWN/GETUP/GRAB/THROW/SPECIAL/DEAD/VICTORY…), Raven, Vera, Brute, Kai, Wraith, Titan, Archon
  ai/          AIController (задержанное наблюдение + план ввода), Difficulty (EASY/NORMAL/HARD/NIGHTMARE), DummyController
  game/        FightSession (порядок кадра INPUT→UPDATE→PHYSICS→COMBAT→AI→EFFECTS), MatchController (раунды, таймер, KO, END HIM), PhysicsSystem, IntroDirector, EventPresenter, HudStore, Arcade, GameState, Game (сервисы)
  effects/     ParticleSystem (пул), ScreenShake, ScreenFlash, HitEffects, DamageNumbers
  render/      Camera, FighterRenderer (процедурная скелетная анимация), poses, ProjectileRenderer, FightRenderer, stages/ (3 арены с параллаксом)
  audio/       AudioManager (процедурные SFX, замена сэмплами через registerSample), music (секвенсор, 5 оригинальных тем)
  progression/ SaveManager (saveGame/loadGame/resetSave, fallback при повреждении), Progression, Settings
  data/        characters, attacks (шаблоны frame data), finishers, stages
  ui/          App (маршрутизация), screens/, hud/, components/
```

Ключевые принципы:

- **Без fake gameplay:** Input → state machine → startup → active-кадры → hitbox → коллизия → урон → hitstun/knockback → recovery. AI использует тот же путь: он лишь генерирует `FrameInput` и реагирует на наблюдение с задержкой (не читает ввод игрока).
- **Детерминизм / rollback-ready:** симуляция на фиксированном шаге, игровая случайность через seed-`Rng`, ввод (`FrameInput`) хранится отдельно от визуала; частицы/камера не влияют на симуляцию.
- **Слои рендера отделены от боя:** `FighterRenderer` только читает состояние бойца; поле `visual.spriteSheet` предусмотрено для замены на спрайты без изменения CombatSystem.

## Как добавить персонажа

1. Создайте `src/characters/NewGuy.ts` по образцу `Raven.ts`: `stats` (1–10, реально используются через `derivePhysique`), `visual` (палитра, пропорции, стиль головы, extras, позы победы/поражения), `normals: buildNormals({ reach, speed, damage, overrides })`, `specials`, `specialInputs`, `superMove`, `throwMove`, `finishers`, `dialogue`.
2. Добавьте его в `ROSTER` в `src/data/characters.ts` (и в `unlockedCharacters` по умолчанию в `Progression.ts`, если он открыт сразу).

CombatSystem, AI и UI менять не нужно: AI строит комбо из `cancelInto` персонажа, экран выбора и галерея читают данные.

## Как добавить атаку

Атака — это `MoveDef` (расширение `AttackData`): `startup/active/recovery`, `damage`, `hitstun`, `blockstun`, `knockback`, `pushback`, `hitLevel`, `cancelInto`, массив `hitboxes` (локальные координаты, можно задать подокна `from/to`), плюс опции: `motion` (импульсы), `invuln`, `armor`, `launch`, `knockdown`, `hits/rehit` (мультихит), `projectile`, `teleport`, `lock` (кинематографичная последовательность), `counter`, `grab`, `superFreeze`, `trail`.
Добавьте её в `specials` персонажа и укажите ввод в `specialInputs` (`motion: ['D','F']`, `button: 's1'`, `notation: '↓ → I'`). Новую анимацию можно описать ключевыми позами в `src/render/poses.ts` (`ANIMS`).

## Звук

`audio.play('punch')`, `audio.play('heavy')`, `audio.play('special')`, `audio.play('ko')` и т.д. Сейчас все звуки и музыка синтезируются WebAudio. Чтобы подключить файл: `audio.registerSample('punch', '/sfx/punch.ogg')` — при ошибке загрузки остаётся процедурный вариант (ошибка уходит в `console.error`).
