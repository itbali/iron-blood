# Создай полноценную браузерную игру — жестокий 2D-файтинг в духе классических arcade fighting games

Создай полностью функциональную браузерную игру в жанре **2D fighting game / arcade fighting**, вдохновлённую атмосферой и механиками классических аркадных файтингов 90-х и современных cinematic fighting games.

Игра должна быть **полностью оригинальной**: не использовать персонажей, названия, изображения, музыку, звуки, фоны, логотипы или другие защищённые элементы Mortal Kombat или других существующих франшиз. Можно использовать общие жанровые идеи: раунды, полоски здоровья, комбо, special moves, блок, добивание проигравшего, арену, arcade mode и cinematic presentation.

Главный приоритет:

1. Игра должна реально запускаться в браузере.
2. Игровой процесс должен быть интересным уже в первой минуте.
3. Управление должно ощущаться отзывчивым.
4. Бой должен выглядеть динамично и зрелищно.
5. UI должен выглядеть как законченная коммерческая игра.
6. Архитектура должна позволять добавлять новых персонажей, атаки, арены и режимы.
7. Код должен быть чистым, модульным и поддерживаемым.
8. Не создавать просто mockup или статическую демонстрацию — необходим именно playable prototype / vertical slice.

---

# 1. Общая концепция

Название игры:

**IRON BLOOD**

Жанр:

**2D cinematic fighting game**

Сеттинг:

Мрачный футуристический мир, в котором бойцы из разных фракций участвуют в подпольном турнире.

Атмосфера:

* мрачная;
* жестокая;
* кинематографичная;
* неоновая;
* индустриальная;
* постапокалиптическая;
* смесь cyberpunk и dark fantasy.

Визуальный стиль:

* dark cinematic;
* gritty;
* high contrast;
* красные и оранжевые акценты;
* глубокие тени;
* металлические поверхности;
* дым;
* искры;
* кровь;
* частицы;
* динамическое освещение.

Игра должна восприниматься как смесь:

* классического arcade fighting;
* современного cinematic UI;
* dark cyberpunk;
* brutal underground tournament.

---

# 2. Формат игры

Игра работает непосредственно в браузере.

Целевые платформы:

* Desktop Chrome
* Desktop Firefox
* Desktop Edge
* Safari
* mobile browser как дополнительная возможность

Основной режим:

**16:9 landscape**

На мобильных устройствах необходимо поддержать responsive layout.

Игра не должна требовать backend для основного gameplay loop.

Сохранение прогресса:

**localStorage / IndexedDB**

---

# 3. Технологический стек

Используй:

* TypeScript
* React
* Vite
* HTML5
* CSS
* Canvas API

React используй преимущественно для:

* меню;
* HUD;
* экранов;
* модальных окон;
* character select;
* settings;
* progression UI.

Canvas используй для:

* игрового поля;
* персонажей;
* эффектов;
* частиц;
* ударов;
* projectile effects;
* background animation.

Если необходима библиотека для game loop / rendering, можно использовать Phaser.

Предпочтительный вариант:

**Phaser + React + TypeScript**

Архитектура должна разделять:

```text
UI
Game Engine
Combat System
Characters
AI
Input
Audio
Particles
Progression
Persistence
```

---

# 4. Главный экран

Создай эффектный стартовый экран.

На фоне:

* медленно движущийся дым;
* частицы;
* металлическая текстура;
* слабые вспышки;
* силуэты бойцов;
* красный ambient light.

В центре:

# IRON BLOOD

Под логотипом:

**ENTER THE ARENA**

Главное меню:

* ARCADE
* VERSUS
* TRAINING
* CHARACTERS
* SETTINGS

Дополнительные элементы:

* версия игры;
* подсказка управления;
* небольшой animated background.

При наведении пункты меню должны иметь:

* glow;
* sound effect;
* небольшую анимацию;
* изменение цвета.

---

# 5. Character Select

Создай отдельный экран выбора персонажа.

Сетка:

**6 персонажей**

Первый playable character должен быть полностью реализован.

Остальные могут быть skeleton / placeholder characters, но архитектура должна позволять легко добавлять их позже.

Персонажи:

### 1. RAVEN

Бывший военный наёмник.

Оружие:

* боевые перчатки;
* энергетические клинки.

Стиль:

* быстрый;
* агрессивный;
* ближний бой.

### 2. VERA

Кибернетический убийца.

Стиль:

* быстрые атаки;
* teleport;
* ranged projectile.

### 3. BRUTE

Огромный мутант.

Стиль:

* медленный;
* очень сильный;
* grabs;
* armor.

### 4. KAI

Боевой монах.

Стиль:

* counter attacks;
* быстрые комбо;
* energy attacks.

### 5. WRAITH

Сверхъестественный персонаж.

Стиль:

* teleport;
* illusion;
* projectile.

### 6. TITAN

Тяжёлый механический боец.

Стиль:

* armor;
* powerful attacks;
* slow movement.

---

# 6. Первый полностью реализованный персонаж

Основной персонаж:

**RAVEN**

Внешность:

* мужчина;
* примерно 30–35 лет;
* короткие тёмные волосы;
* шрамы;
* чёрная тактическая одежда;
* металлические элементы брони;
* красные энергетические линии;
* боевые перчатки.

Силуэт должен быть хорошо читаемым.

Анимации:

* idle;
* walk;
* walk backward;
* crouch;
* jump;
* jump forward;
* jump backward;
* light punch;
* heavy punch;
* light kick;
* heavy kick;
* crouching attacks;
* jumping attacks;
* block;
* hit;
* knockback;
* knockdown;
* get up;
* special 1;
* special 2;
* projectile;
* grab;
* throw;
* victory;
* defeat.

Если полноценные sprite animations невозможно получить автоматически, используй procedural animation / skeletal animation / animated shapes, но персонаж должен визуально двигаться, а не быть статичной картинкой.

---

# 7. Управление

Desktop:

```text
A / D — движение
W — прыжок
S — приседание

J — лёгкий удар рукой
K — тяжёлый удар рукой
L — лёгкий удар ногой
; — тяжёлый удар ногой

I — специальная атака
O — вторая специальная атака

Space — block
E — grab
```

Дополнительно:

```text
Esc — pause
R — restart
```

Управление должно иметь configurable key bindings.

Создай отдельный InputManager.

Он должен поддерживать:

* key down;
* key up;
* held keys;
* key combinations;
* input buffering.

---

# 8. Боевая система

Создай полноценную fighting-game combat system.

Каждая атака должна иметь:

```typescript
AttackData {
  startup: number
  active: number
  recovery: number
  damage: number
  hitstun: number
  blockstun: number
  knockback: number
  pushback: number
  hitLevel: "high" | "mid" | "low"
  cancelInto?: string[]
}
```

Не делай систему просто через:

```text
if button === "J"
then damage -= 10
```

Используй state machine.

Состояния персонажа:

```text
IDLE
WALK
CROUCH
JUMP
ATTACK
BLOCK
HIT
HURT
KNOCKDOWN
GETUP
GRAB
THROW
SPECIAL
DEAD
VICTORY
```

---

# 9. Hitboxes

Создай отдельную систему hitbox / hurtbox.

Каждая атака может иметь несколько hitboxes.

Пример:

```text
head
body
legs
attack zone
```

Hitbox должна существовать только в активных frames атаки.

Покажи debug mode:

```text
F3 — toggle hitboxes
```

При включении debug mode:

* hitboxes отображаются красным;
* hurtboxes зелёным;
* collision boxes синим;
* player origin point;
* frame counter.

---

# 10. Frame-based combat

Боевая система должна быть frame-based.

Каждая атака имеет:

```text
Startup
Active
Recovery
```

Например:

Light Punch:

```text
Startup: 5 frames
Active: 3 frames
Recovery: 9 frames
Damage: 5
```

Heavy Punch:

```text
Startup: 10 frames
Active: 4 frames
Recovery: 18 frames
Damage: 12
```

Это позволит в дальнейшем реализовать:

* frame advantage;
* punish;
* combos;
* cancels;
* perfect block.

---

# 11. Комбо

Создай combo system.

Игрок должен иметь возможность выполнять последовательности:

```text
J → J → K
```

или

```text
J → K → I
```

или

```text
J → J → K → I
```

Добавь input buffer примерно 100–200 ms.

Комбо должны отображаться на экране:

```text
7 HIT COMBO
```

Также отображать:

```text
DAMAGE
```

и:

```text
MAX COMBO
```

Если игрок ошибся:

```text
COMBO BREAK
```

---

# 12. Special Moves

Raven должен иметь минимум 3 special moves.

### Blood Dash

Быстрый рывок вперёд.

Команда:

```text
→ → I
```

Особенности:

* короткая invulnerability;
* красный trail;
* сильный impact.

### Crimson Slash

Энергетический slash.

Команда:

```text
↓ → I
```

Создаёт projectile.

### Execution Grab

Команда:

```text
↓ ← O
```

Персонаж хватает противника.

После успешного grab запускается cinematic animation.

---

# 13. Blocking

Добавь:

### High Block

Защищает от:

* high;
* mid.

### Low Block

Защищает от:

* low.

### Perfect Block

Если блок активирован непосредственно перед попаданием:

* короткий flash;
* особый звук;
* slow motion на несколько кадров;
* преимущество игрока;
* специальная надпись:

**PERFECT BLOCK**

---

# 14. Grab / Throw

Добавь grab mechanics.

При успешном grab:

1. противники сближаются;
2. запускается короткая animation;
3. наносится damage;
4. противник получает knockback.

Обычные удары не должны проходить через grab animation.

---

# 15. Health

У каждого игрока:

```text
1000 HP
```

HUD:

```text
PLAYER 1
████████████████████
```

При получении damage:

* полоска плавно уменьшается;
* основной damage отображается;
* появляется небольшой screen shake;
* персонаж flash'ится.

---

# 16. Round system

Каждый бой состоит из раундов.

Лучший вариант:

**Best of 3**

То есть:

```text
ROUND 1
ROUND 2
ROUND 3
```

После победы в раунде:

```text
RAVEN WINS
```

Перед началом:

```text
ROUND 1
```

Затем:

# FIGHT!

Не начинать бой мгновенно.

Использовать короткую cinematic transition.

---

# 17. Timer

В центре HUD:

```text
99
```

Timer уменьшается каждую секунду.

Если timer достигает 0:

побеждает персонаж с большим количеством HP.

Если HP одинаковые:

draw.

---

# 18. Knockout

Если HP достигает 0:

```text
FINISH HIM
```

или оригинальный вариант:

# END HIM

Персонаж проигравшего становится vulnerable.

Игрок получает несколько секунд для выполнения special finisher.

---

# 19. Finisher system

Создай систему cinematic finishers.

Важно:

финisher должен быть оригинальным и не копировать конкретные fatalities из Mortal Kombat.

Пример:

### Crimson Execution

Raven создаёт энергетический клинок.

Камера:

* приближает персонажей;
* слегка меняет угол;
* запускает slow motion;
* появляется красный flash;
* particles;
* screen shake;
* затем возвращается normal speed.

Использовать стилизованную кровь и визуальные эффекты без чрезмерно реалистичной медицинской детализации.

В конце:

# RAVEN WINS

---

# 20. AI противника

Создай AI opponent.

AI должен иметь несколько уровней:

```text
EASY
NORMAL
HARD
NIGHTMARE
```

AI не должен жульничать.

Он должен использовать ту же систему:

* movement;
* attacks;
* block;
* specials;
* combos.

AI Decision System:

```text
distance
enemyState
ownHealth
enemyHealth
cooldowns
danger
```

На основе этого AI выбирает:

```text
approach
retreat
attack
block
jump
special
grab
combo
```

Easy:

* медленная реакция;
* редко блокирует;
* редко использует combo.

Normal:

* базовая реакция;
* простые combos.

Hard:

* активно блокирует;
* punish;
* использует specials.

Nightmare:

* быстрый reaction time;
* сложные combos;
* aggressive punish;
* грамотное spacing.

Но даже Nightmare не должен получать информацию, недоступную игроку.

---

# 21. Арена

Создай первую арену:

# ABANDONED INDUSTRIAL DISTRICT

Фон:

* огромные металлические здания;
* трубы;
* неон;
* дождь;
* дым;
* электрические провода;
* красные сигнальные лампы;
* лужи;
* пар.

На заднем плане:

* медленно движущиеся NPC silhouettes;
* машины;
* мигающие lights.

Foreground:

* мокрый металлический пол;
* отражения;
* частицы дождя.

Фон должен иметь несколько layers для parallax.

---

# 22. Stage Boundaries

Игроки не могут бесконечно уходить в стороны.

Создай invisible walls.

При столкновении:

* pushback;
* screen shake;
* специальный sound effect.

Позже можно добавить wall bounce.

---

# 23. Camera

Камера должна автоматически следить за обоими персонажами.

Если персонажи далеко:

камера немного zoom out.

Если близко:

zoom in.

Добавить:

* camera shake;
* hit zoom;
* cinematic zoom;
* slow motion.

При сильной атаке:

```text
camera shake 5–10 px
```

---

# 24. Hit Effects

При каждом сильном попадании:

* flash;
* particles;
* sparks;
* smoke;
* impact ring;
* небольшой screen shake.

Для heavy attacks:

более сильный эффект.

Для special attacks:

уникальные particles.

---

# 25. Slow Motion

При критическом попадании:

замедление на:

```text
100–250 ms
```

После чего возвращение к нормальной скорости.

Использовать:

```text
timeScale
```

а не блокировать rendering.

---

# 26. Sound Design

Добавь систему AudioManager.

Звуки:

* menu hover;
* menu click;
* punch;
* kick;
* heavy hit;
* block;
* perfect block;
* grab;
* throw;
* special;
* projectile;
* knockout;
* victory;
* countdown;
* round start.

Музыка:

* menu theme;
* battle theme;
* victory theme.

Музыка должна быть оригинальной.

Если настоящие аудиофайлы недоступны, создай временные procedural sounds / placeholders с правильной архитектурой для последующей замены.

---

# 27. HUD

HUD должен выглядеть как современный arcade fighting game.

Сверху:

```text
PLAYER 1                  PLAYER 2
RAVEN                     VERA

███████████               ███████████
███████████               ███████████

              78

        ROUND 1
```

Добавить:

* health;
* timer;
* round indicators;
* character names;
* combo counter;
* damage;
* special meter.

---

# 28. Super Meter

Добавь Energy Meter.

Игрок получает meter за:

* damage dealt;
* damage received;
* blocking;
* successful attacks.

Когда meter заполнен:

```text
SUPER READY
```

Special attack:

```text
I + O
```

Запускает мощную cinematic ability.

---

# 29. Super Ability

Raven:

# BLOOD RUSH

Короткая cinematic attack.

Последовательность:

1. Raven заряжается энергией.
2. Экран слегка темнеет.
3. Красные particles.
4. Raven мгновенно приближается.
5. Серия быстрых атак.
6. Camera shake.
7. Последний удар.
8. Экран flash.
9. Damage summary.

---

# 30. Training Mode

Добавь Training Mode.

Игрок может:

* выбрать персонажа;
* выбрать противника;
* включить infinite health;
* включить infinite meter;
* reset position;
* показать hitboxes;
* показать frame data.

Debug panel:

```text
FPS
Frame
State
Velocity
HP
Meter
Last Attack
Frame Advantage
```

---

# 31. Versus Mode

Добавь:

# VERSUS

Игрок выбирает:

```text
PLAYER 1
VS
PLAYER 2
```

Поддержка двух игроков на одной клавиатуре.

Player 2 controls:

```text
Arrow Keys
Numpad 1
Numpad 2
Numpad 3
Numpad 4
Numpad 5
Numpad 6
```

Сделай настройки переназначения клавиш.

---

# 32. Arcade Mode

Главный режим.

Последовательность:

```text
Character Select
↓
Opponent 1
↓
Opponent 2
↓
Opponent 3
↓
Opponent 4
↓
Boss
↓
Victory
```

После каждой победы:

* небольшая transition;
* статистика;
* heal;
* next opponent.

---

# 33. Boss

Создай отдельного босса:

# THE ARCHON

Огромный кибернетический воин.

Особенности:

* 2000 HP;
* armor;
* powerful attacks;
* unique specials;
* second phase.

На 50% HP:

### PHASE 2

Изменяется:

* музыка;
* lighting;
* particles;
* AI aggression;
* attack patterns.

---

# 34. Victory Screen

После прохождения Arcade:

Затемнить фон.

Показать:

# RAVEN WINS

Под ним:

```text
TIME
WINS
MAX COMBO
DAMAGE DEALT
```

После этого:

# ARCADE COMPLETE

Разблокировать:

* new skin;
* new difficulty;
* concept art;
* character information.

---

# 35. Progression

Используй localStorage.

Сохранять:

```typescript
PlayerProgress {
  unlockedCharacters: string[]
  unlockedSkins: string[]
  completedArcade: boolean
  highestCombo: number
  totalWins: number
  totalLosses: number
}
```

---

# 36. Settings

Создай полноценный settings menu.

Настройки:

### Graphics

* Quality
* Particles
* Screen Shake
* Motion Blur
* Effects

### Audio

* Master Volume
* Music Volume
* SFX Volume

### Controls

* Rebind controls

### Accessibility

* Colorblind mode
* Reduced motion
* Screen shake toggle
* Flash effects toggle

---

# 37. Responsive Design

Игра должна работать на:

```text
1920x1080
1600x900
1440x900
1280x720
1024x768
```

Минимально приемлемое desktop resolution:

```text
1024x576
```

На маленьком экране:

* масштабировать canvas;
* сохранять aspect ratio;
* не ломать HUD.

---

# 38. Mobile

Если возможно, добавить mobile controls.

Virtual joystick:

левая часть экрана.

Кнопки:

```text
ATTACK
HEAVY
SPECIAL
BLOCK
JUMP
```

Кнопки должны быть достаточно большими для touch interaction.

Но desktop gameplay остаётся главным приоритетом.

---

# 39. Performance

Цель:

**60 FPS**

Не создавать огромное количество React re-renders во время боя.

Game loop должен быть независим от React rendering.

Использовать:

```text
requestAnimationFrame
```

или Phaser game loop.

Particles должны иметь object pooling.

Не создавать тысячи новых объектов каждый frame.

---

# 40. Architecture

Предлагаемая структура:

```text
src/
  game/
    Game.ts
    GameLoop.ts
    GameState.ts

  combat/
    CombatSystem.ts
    HitboxSystem.ts
    ComboSystem.ts
    DamageSystem.ts
    AttackData.ts

  characters/
    Character.ts
    Raven.ts
    Vera.ts
    Brute.ts
    Kai.ts
    Wraith.ts
    Titan.ts
    Archon.ts

  ai/
    AIController.ts
    AIStateMachine.ts
    Difficulty.ts

  input/
    InputManager.ts
    KeyBindings.ts

  effects/
    ParticleSystem.ts
    ScreenShake.ts
    HitEffects.ts

  audio/
    AudioManager.ts

  scenes/
    MainMenu.ts
    CharacterSelect.ts
    FightScene.ts
    TrainingScene.ts
    VictoryScene.ts

  ui/
    HUD.tsx
    MainMenu.tsx
    CharacterSelect.tsx
    Settings.tsx
    PauseMenu.tsx

  progression/
    SaveManager.ts
    Progression.ts

  data/
    characters.ts
    attacks.ts
    stages.ts
```

Не смешивать gameplay logic с React UI.

---

# 41. Data-driven design

Персонажи, атаки и specials должны описываться через data/config.

Например:

```typescript
const raven = {
  id: "raven",
  name: "Raven",
  maxHealth: 1000,

  attacks: {
    lightPunch: {...},
    heavyPunch: {...},
    lightKick: {...},
    heavyKick: {...}
  },

  specials: {
    bloodDash: {...},
    crimsonSlash: {...},
    executionGrab: {...}
  }
}
```

Это должно позволять создать нового персонажа без переписывания CombatSystem.

---

# 42. Game State

Создай центральный GameState:

```typescript
GameState {
  phase:
    | "menu"
    | "character-select"
    | "intro"
    | "fight"
    | "round-end"
    | "ko"
    | "finisher"
    | "victory"
    | "pause"

  round: number

  timer: number

  player1: FighterState
  player2: FighterState

  winner?: string
}
```

---

# 43. Pause

При нажатии Escape:

```text
PAUSED
```

Меню:

* Resume
* Restart
* Settings
* Exit

Game simulation должна полностью останавливаться.

---

# 44. Loading

Создай loading screen.

Показывать:

```text
LOADING ARENA...
```

Progress bar:

```text
████████████████░░░
```

Загружать:

* assets;
* audio;
* character data;
* stage.

---

# 45. Error handling

Если asset не загрузился:

игра не должна полностью падать.

Использовать fallback.

Например:

```text
Missing sprite
→ procedural placeholder
```

Ошибки логировать через:

```text
console.error
```

но production UI не должен показывать технический stack trace пользователю.

---

# 46. Debug Mode

Добавь:

```text
F3
```

Debug mode должен отображать:

```text
FPS
Game State
Player State
Velocity
Position
Current Attack
Current Frame
Hitboxes
Hurtboxes
Input Buffer
AI State
```

Это должно очень сильно упростить дальнейшую разработку fighting mechanics.

---

# 47. Developer cheats

Только в development mode:

```text
F4 — infinite health
F5 — infinite meter
F6 — refill health
F7 — reset fight
F8 — toggle AI
```

Не включать эти возможности в production build.

---

# 48. Visual Effects

Добавить:

* particles;
* sparks;
* smoke;
* dust;
* blood particles;
* energy trails;
* impact rings;
* screen flash;
* chromatic aberration imitation;
* vignette;
* dynamic lighting.

Не перегружать экран постоянными эффектами.

Особенно важно, чтобы hit effects подчёркивали момент удара.

---

# 49. Animation Feel

Главное требование:

**game feel важнее количества контента.**

Удары должны ощущаться тяжёлыми.

При сильном ударе:

```text
hit pause
+
screen shake
+
impact particles
+
sound
+
camera zoom
```

Hit stop:

```text
50–100 ms
```

для сильных атак.

---

# 50. Character movement

Movement должен быть плавным.

Поддержать:

* acceleration;
* deceleration;
* facing direction;
* jump arc;
* air control;
* pushback.

Персонажи всегда должны автоматически смотреть друг на друга.

Если Raven находится слева от противника:

```text
facing = right
```

Если справа:

```text
facing = left
```

---

# 51. Collision

Игроки не должны проходить друг сквозь друга.

Создать player collision capsules / boxes.

При приближении:

```text
push apart
```

Но атаки должны иметь собственную hitbox system.

Не использовать одну collision box для всего.

---

# 52. Intro перед боем

Перед каждым боем:

Камера показывает арену.

Затем:

Raven входит в сцену.

Противник входит с другой стороны.

Крупный план лиц.

Короткая реплика:

**RAVEN: "Let's end this."**

Противник отвечает своей фразой.

Затем:

# ROUND 1

# FIGHT!

---

# 53. Dialogue system

Создай небольшую систему диалогов.

Персонажи могут иметь:

```typescript
introLines
victoryLines
defeatLines
taunts
```

Например:

```text
Raven:
"You picked the wrong fight."

Archon:
"Your blood will power this city."
```

Диалоги должны быть короткими.

---

# 54. Character personality

Каждый персонаж должен ощущаться уникальным.

Не делать просто разные sprites поверх одинаковой механики.

У каждого:

* свой speed;
* damage;
* health;
* jump;
* specials;
* combo routes;
* strengths;
* weaknesses.

---

# 55. Balance

Пример:

| Character | Speed | Damage | Health | Difficulty |
| --------- | ----: | -----: | -----: | ---------- |
| Raven     |     8 |      7 |      7 | Medium     |
| Vera      |    10 |      5 |      5 | Hard       |
| Brute     |     3 |     10 |     10 | Easy       |
| Kai       |     8 |      6 |      6 | Hard       |
| Wraith    |     9 |      6 |      5 | Very Hard  |
| Titan     |     4 |     10 |      9 | Medium     |

Значения должны использоваться реально в gameplay.

---

# 56. Visual hierarchy

Во время боя игрок должен мгновенно понимать:

1. Где мой персонаж.
2. Где противник.
3. Сколько HP.
4. Какой сейчас round.
5. Сколько времени.
6. Готов ли special.
7. Происходит ли hit.
8. Кто выиграл.

Не допускай, чтобы красивые эффекты ухудшали читаемость gameplay.

---

# 57. UI Style

UI:

* angular;
* industrial;
* metallic;
* dark;
* futuristic.

Основная палитра:

```text
#08090C
#12151B
#242832
#8E1018
#D51F2B
#E7E7E7
```

Использовать красный только как accent.

Не превращать весь интерфейс в красную кашу.

---

# 58. Typography

Использовать современный condensed display font.

Заголовки:

bold uppercase.

Пример:

```text
ROUND 1
FIGHT
KNOCKOUT
RAVEN WINS
```

Body text:

читаемый sans-serif.

---

# 59. Menus animation

Все UI transition:

```text
150–300ms
```

Использовать:

* fade;
* slide;
* scale;
* glow.

Никаких мгновенных переключений между экранами.

---

# 60. Accessibility

Добавить:

* reduced motion;
* reduced flashes;
* subtitles;
* configurable volume;
* colorblind-friendly indicators;
* keyboard navigation.

---

# 61. Save system

Использовать:

```text
localStorage
```

Добавить:

```typescript
saveGame()
loadGame()
resetSave()
```

При ошибке parsing:

использовать default save.

---

# 62. No backend requirement

На первом этапе:

**не создавать backend.**

Всё должно работать локально.

Позже архитектура должна позволять добавить:

* online multiplayer;
* accounts;
* leaderboards;
* cloud saves.

---

# 63. Future multiplayer architecture

Не реализовывать сейчас полноценный multiplayer, но не делать архитектуру несовместимой с ним.

Combat state должен быть достаточно детерминированным, чтобы в будущем можно было использовать:

```text
rollback netcode
```

Input должен храниться отдельно от visual state.

---

# 64. Game loop

Основной loop:

```text
INPUT
↓
UPDATE
↓
PHYSICS
↓
COMBAT
↓
AI
↓
ANIMATION
↓
EFFECTS
↓
RENDER
```

Не смешивать эти этапы.

---

# 65. Fixed timestep

Для gameplay желательно использовать fixed timestep.

Например:

```text
60 updates per second
```

Rendering может происходить независимо.

Это необходимо для стабильного combat timing.

---

# 66. Hit pause

При попадании:

```typescript
hitStop(duration)
```

Например:

Light:

```text
30ms
```

Heavy:

```text
70ms
```

Special:

```text
100ms
```

Finisher:

```text
250ms
```

---

# 67. Damage numbers

Необязательно показывать обычный damage постоянно.

Для сильных атак можно показать:

```text
-84
CRITICAL
```

Damage numbers должны:

* появляться рядом с противником;
* немного подниматься;
* исчезать через 500–800ms.

---

# 68. Combo UI

При combo:

```text
7
HITS
```

При большом combo:

```text
12 HIT COMBO
```

Animation:

* scale up;
* flash;
* settle.

---

# 69. Round transition

После победы:

```text
ROUND 1
RAVEN WINS
```

Короткая задержка.

Затем:

```text
ROUND 2
```

Health reset.

Meter частично сохраняется.

---

# 70. Victory / defeat

Victory:

```text
RAVEN WINS
```

Defeat:

```text
DEFEATED
```

Добавить unique victory pose.

---

# 71. Code quality

Код должен быть:

* TypeScript strict;
* modular;
* typed;
* без огромных компонентов;
* без giant Game.ts;
* без global mutable state;
* без magic numbers.

Использовать:

```text
interfaces
types
enums
constants
data-driven configs
```

---

# 72. Comments

Комментировать только сложные места:

* combat frame timing;
* collision;
* AI decisions;
* state transitions;
* input buffering.

Не писать комментарии вида:

```text
// subtract health
health -= damage;
```

---

# 73. README

Создай README.md с:

* запуском проекта;
* npm install;
* npm run dev;
* npm run build;
* npm run preview;
* архитектурой;
* управлением;
* добавлением персонажей;
* добавлением атак;
* debug controls.

---

# 74. Acceptance criteria

Игра считается готовой, если:

### Boot

* приложение запускается;
* нет runtime errors;
* появляется main menu.

### Character Select

* можно выбрать Raven;
* можно выбрать противника.

### Fight

* оба персонажа появляются;
* можно двигаться;
* можно прыгать;
* можно атаковать;
* можно блокировать;
* можно использовать special;
* HP уменьшается;
* timer работает;
* combo работает;
* round system работает.

### AI

* противник двигается;
* атакует;
* блокирует;
* получает damage;
* может проиграть.

### KO

* при HP = 0 бой заканчивается;
* отображается победитель.

### Arcade

* после победы появляется следующий противник.

### Persistence

* настройки сохраняются;
* progression сохраняется.

### Performance

* gameplay работает около 60 FPS на обычном современном компьютере.

---

# 75. Приоритеты разработки

Если невозможно реализовать всё сразу, соблюдать следующий порядок.

## PRIORITY 1 — CORE

1. Canvas
2. Game loop
3. Input
4. Player movement
5. Collision
6. Attacks
7. Hitboxes
8. Damage
9. Health
10. Round
11. KO

## PRIORITY 2 — GAME FEEL

12. Hit stop
13. Screen shake
14. Particles
15. Sound
16. Camera
17. Combo system

## PRIORITY 3 — AI

18. AI movement
19. AI attacks
20. AI blocking
21. Difficulty

## PRIORITY 4 — UI

22. Main menu
23. Character select
24. HUD
25. Pause
26. Victory

## PRIORITY 5 — CONTENT

27. Additional characters
28. Boss
29. Additional arena
30. Arcade progression

## PRIORITY 6 — POLISH

31. Advanced particles
32. Cinematic camera
33. Finishers
34. Advanced animations
35. Accessibility
36. Mobile controls

---

# 76. Очень важное требование

Не пытайся сразу сделать огромное количество контента.

Сначала создай **один идеально работающий бой Raven vs Brute на одной арене**.

Этот бой должен иметь:

* movement;
* jump;
* attacks;
* block;
* hitboxes;
* damage;
* combo;
* special;
* AI;
* camera;
* particles;
* sound;
* health bars;
* timer;
* rounds;
* KO;
* victory screen.

После того как этот vertical slice работает стабильно, масштабируй архитектуру на остальных персонажей и режимы.

---

# 77. Если отсутствуют графические ассеты

Не останавливай разработку.

Используй временные procedural assets:

* геометрические shapes;
* silhouettes;
* gradients;
* particles;
* generated placeholder sprites.

Но структура кода должна позволять позже заменить их на настоящие sprite sheets без переписывания combat system.

Например:

```typescript
SpriteRenderer
```

должен быть отделён от:

```typescript
CombatSystem
```

---

# 78. Если отсутствует звук

Создай AudioManager с placeholder implementation.

Например:

```typescript
audio.play("punch")
audio.play("heavy-hit")
audio.play("special")
audio.play("ko")
```

Даже если реальных файлов пока нет.

Позже assets можно заменить без изменения gameplay code.

---

# 79. Не делай fake gameplay

Критически важно:

НЕ делать:

```text
кнопка → случайная анимация → уменьшить HP
```

Нужна настоящая игровая логика:

```text
Input
→ State Machine
→ Attack Startup
→ Active Frames
→ Hitbox
→ Collision
→ Damage
→ Hitstun
→ Knockback
→ Recovery
```

То же самое должно использоваться AI.

---

# 80. Итоговый результат

В результате я хочу получить **законченную небольшую браузерную fighting game**, которую можно открыть в браузере и реально играть.

Она должна ощущаться как настоящий vertical slice коммерческого arcade fighting game, а не как UI-концепт.

Минимальный playable experience:

```text
OPEN GAME
↓
MAIN MENU
↓
ARCADE
↓
CHARACTER SELECT
↓
RAVEN
↓
ARENA
↓
INTRO
↓
ROUND 1
↓
FIGHT
↓
COMBAT
↓
COMBO
↓
SPECIAL
↓
KO
↓
ROUND 2
↓
KO
↓
VICTORY
↓
NEXT OPPONENT
```

Главный критерий качества:

**Если пользователь открывает страницу впервые, он должен уже через 10–20 секунд понимать игру и хотеть провести ещё один бой.**

Сначала реализуй стабильный playable vertical slice, затем расширяй контент.

Не жертвуй рабочим gameplay ради количества функций.


# 81. AUTONOMOUS DEVELOPMENT MODE — НЕ ОСТАНАВЛИВАЙСЯ

Работай в режиме **полностью автономного coding agent**.

Твоя задача — не просто написать часть проекта или создать начальный prototype.

Твоя задача:

> **самостоятельно довести проект до максимально полного, рабочего и отполированного состояния, описанного в этом задании.**

Не останавливайся после создания базовой версии.

Не заканчивай работу на этапе:

* "основная механика готова";
* "осталось добавить UI";
* "можно продолжить позже";
* "TODO";
* "placeholder";
* "здесь можно добавить";
* "дальше разработчик может...";
* "для полноценной версии потребуется...";
* "я создал основу".

Если следующий этап предусмотрен этим заданием — **сам переходи к нему.**

---

# 82. НИКАКИХ ЛИШНИХ ВОПРОСОВ

Не спрашивай у пользователя разрешение на очевидные следующие действия.

НЕ задавай вопросы вида:

> "Хотите, чтобы я добавил AI?"

если AI уже указан в этом задании.

НЕ спрашивай:

> "Продолжить разработку?"

НЕ спрашивай:

> "Добавить эффекты?"

НЕ спрашивай:

> "Исправить найденные ошибки?"

НЕ спрашивай:

> "Перейти к следующему этапу?"

Вместо этого:

**сам делай следующий этап.**

---

# 83. ЕСЛИ НЕОБХОДИМО ПРИНЯТЬ РЕШЕНИЕ

Если в процессе разработки возникает неоднозначность, выбирай наиболее разумный вариант самостоятельно.

Приоритет:

1. Требования этого задания.
2. Работоспособность игры.
3. Игровой UX.
4. Производительность.
5. Архитектура.
6. Визуальное качество.
7. Дополнительные улучшения.

Не блокируй разработку из-за мелкой неоднозначности.

---

# 84. НЕЛЬЗЯ ОСТАВЛЯТЬ TODO

Не оставляй в production-коде:

```text
TODO
FIXME
IMPLEMENT LATER
PLACEHOLDER
TEMP
COMING SOON
```

если соответствующая функция описана в этом задании.

Если функция слишком сложная для первоначальной реализации:

1. создай рабочую упрощённую версию;
2. интегрируй её в игру;
3. протестируй;
4. затем улучши её.

Не оставляй функцию полностью нереализованной.

---

# 85. ПОЭТАПНАЯ РАЗРАБОТКА

Разрабатывай игру последовательно.

Используй следующие milestones.

## MILESTONE 0 — PROJECT BOOTSTRAP

Создать:

* package.json;
* TypeScript;
* Vite;
* React;
* Phaser / Canvas;
* ESLint;
* необходимые configuration files.

Проверить:

```text
npm install
npm run dev
npm run build
```

Убедиться, что проект запускается.

После успешной проверки переходить дальше.

---

# MILESTONE 1 — GAME SHELL

Создать:

* Main Menu;
* Game Scene;
* routing / scene switching;
* basic HUD;
* pause system;
* loading screen.

Проверить:

* переходы между экранами;
* отсутствие runtime errors;
* build.

Если обнаружены ошибки — исправить самостоятельно.

---

# MILESTONE 2 — CORE COMBAT

Реализовать:

* player movement;
* jumping;
* crouching;
* facing;
* collision;
* attack states;
* hitboxes;
* hurtboxes;
* damage;
* knockback;
* hitstun;
* block;
* KO.

Создать минимальный playable:

**Raven vs Brute**

Не переходить дальше, пока этот бой нельзя реально сыграть.

---

# MILESTONE 3 — GAME FEEL

Добавить:

* hit stop;
* screen shake;
* camera movement;
* impact effects;
* particles;
* sound effects;
* hit flashes;
* damage feedback;
* combo feedback.

После этого снова провести gameplay test.

Если gameplay ощущается плохо:

* уменьшить/увеличить hit stop;
* изменить knockback;
* изменить timing;
* улучшить camera;
* изменить effects.

Не просто считать milestone завершённым по наличию кода.

Проверять именно **ощущение игры**.

---

# MILESTONE 4 — COMBO SYSTEM

Реализовать:

* input buffer;
* attack chaining;
* combo detection;
* combo counter;
* combo damage;
* combo reset;
* attack cancels.

Проверить реальные последовательности:

```text
J → J
J → K
J → J → K
J → J → K → I
```

Убедиться, что они действительно работают.

---

# MILESTONE 5 — SPECIAL MOVES

Реализовать все Raven specials:

* Blood Dash;
* Crimson Slash;
* Execution Grab;
* Super Ability.

Каждый special должен иметь:

* input;
* animation;
* hitbox;
* damage;
* effects;
* sound;
* cooldown / meter requirements;
* correct interaction with block.

---

# MILESTONE 6 — AI

Создать AIController.

Сначала:

```text
Easy
```

Потом:

```text
Normal
```

Потом:

```text
Hard
```

Потом:

```text
Nightmare
```

Каждый уровень должен реально отличаться.

Проверить:

* movement;
* attacks;
* defense;
* combos;
* specials;
* spacing;
* reaction time.

AI не должен просто случайно нажимать кнопки.

---

# MILESTONE 7 — ROUND SYSTEM

Реализовать:

* Best of 3;
* countdown;
* timer;
* round transitions;
* round wins;
* draw;
* KO;
* victory;
* defeat.

Проверить полный цикл:

```text
Round 1
→ win
→ Round 2
→ win
→ match victory
```

---

# MILESTONE 8 — HUD

Полностью реализовать:

* health bars;
* timer;
* round indicators;
* names;
* meter;
* combo counter;
* damage;
* special ready;
* victory messages.

Проверить HUD на разных разрешениях.

---

# MILESTONE 9 — CHARACTER SELECT

Создать Character Select.

Добавить всех персонажей:

* Raven;
* Vera;
* Brute;
* Kai;
* Wraith;
* Titan.

Если некоторые персонажи ещё не имеют полноценного moveset:

создать для них рабочую базовую боевую модель, чтобы они не были просто кнопками без результата.

В дальнейшем постепенно довести каждого персонажа до полноценного состояния.

---

# MILESTONE 10 — ADDITIONAL CHARACTERS

Каждый персонаж должен получить:

* уникальные характеристики;
* уникальный movement;
* unique attacks;
* unique specials;
* unique combo routes;
* unique victory animation;
* unique defeat animation.

Не делать шесть одинаковых персонажей с изменённым цветом.

---

# MILESTONE 11 — ARENAS

Создать минимум:

### Arena 1

Abandoned Industrial District.

### Arena 2

Cyberpunk Underground Station.

### Arena 3

Ruined Temple / Dark Fantasy Arena.

Каждая арена должна иметь:

* background;
* foreground;
* lighting;
* particles;
* ambient animation;
* parallax;
* уникальный mood.

---

# MILESTONE 12 — BOSS

Реализовать:

**The Archon**

Добавить:

* boss intro;
* unique attacks;
* armor;
* special moves;
* phase 1;
* phase 2;
* unique music;
* unique effects;
* boss victory/defeat.

Проверить boss fight отдельно.

---

# MILESTONE 13 — FINISHERS

Реализовать оригинальную finisher system.

Не копировать существующие fatalities.

Создать несколько различных типов:

```text
Energy finisher
Physical finisher
Cinematic finisher
```

Finisher должен быть:

* optional;
* visually spectacular;
* mechanically integrated;
* skippable.

Добавить:

```text
SKIP
```

---

# MILESTONE 14 — ARCADE MODE

Полностью реализовать:

```text
Character Select
↓
Fight 1
↓
Fight 2
↓
Fight 3
↓
Fight 4
↓
Boss
↓
Ending
```

Добавить:

* progression;
* healing;
* opponent selection;
* difficulty;
* victory screens;
* ending.

---

# MILESTONE 15 — TRAINING MODE

Полностью реализовать:

* dummy;
* infinite health;
* infinite meter;
* reset position;
* hitbox display;
* hurtbox display;
* frame data;
* combo testing;
* AI toggle.

Training Mode должен быть реально полезным для изучения боевой системы.

---

# MILESTONE 16 — VERSUS MODE

Реализовать:

**Player vs Player**

На одной клавиатуре.

Добавить:

* separate key bindings;
* character select;
* stage select;
* best of 3;
* rematch.

---

# MILESTONE 17 — SETTINGS

Реализовать:

### Graphics

* quality;
* particles;
* effects;
* screen shake;
* motion effects.

### Audio

* master;
* music;
* SFX.

### Controls

* key rebinding.

### Accessibility

* reduced motion;
* reduced flashes;
* subtitles;
* colorblind mode.

---

# MILESTONE 18 — SAVE SYSTEM

Реализовать localStorage persistence.

Сохранять:

* settings;
* unlocked characters;
* skins;
* arcade progress;
* statistics;
* highest combo;
* wins/losses.

Проверить:

1. изменить setting;
2. reload page;
3. убедиться, что setting сохранился.

---

# MILESTONE 19 — MOBILE

После завершения desktop версии:

добавить responsive layout.

Если возможно:

* touch controls;
* virtual joystick;
* attack buttons;
* block;
* special;
* pause.

Не ломать desktop experience ради mobile.

---

# MILESTONE 20 — POLISH

После того как все основные функции работают, провести отдельный polish pass.

Проверить:

### Combat

* responsiveness;
* hit timing;
* hitboxes;
* blocking;
* combo consistency;
* specials;
* grabs.

### UI

* animations;
* transitions;
* readability;
* responsive layout.

### Visuals

* particles;
* lighting;
* camera;
* effects;
* backgrounds.

### Audio

* volume;
* timing;
* feedback;
* music transitions.

### AI

* fairness;
* difficulty;
* behavior.

---

# 86. TEST AFTER EVERY MILESTONE

После каждого milestone обязательно:

1. Запустить проект.
2. Проверить основной сценарий.
3. Проверить console errors.
4. Проверить TypeScript errors.
5. Выполнить production build.
6. Исправить ошибки.
7. Повторить проверку.

Не переходить дальше с очевидными runtime/build errors.

---

# 87. АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ ОШИБОК

Если во время проверки обнаружена ошибка:

НЕ останавливайся и не сообщай:

> "Обнаружена ошибка X. Хотите, чтобы я исправил?"

Вместо этого:

```text
найти причину
→ исправить
→ запустить снова
→ проверить
→ продолжить
```

Если первая попытка исправления не сработала:

```text
проанализировать проблему
→ изменить подход
→ повторить
```

Продолжать до тех пор, пока ошибка не устранена или не достигнут разумный технический предел.

---

# 88. SELF-TESTING

Создай автоматические тесты для критических систем.

Минимально:

### Combat

* damage calculation;
* hitbox collision;
* block;
* hitstun;
* knockback.

### Combo

* input buffer;
* combo detection;
* combo reset.

### Game State

* round transition;
* KO;
* victory;
* defeat.

### Save

* save;
* load;
* corrupted save fallback.

Используй подходящую testing library, например Vitest.

---

# 89. PLAYTEST LOOP

После каждого крупного изменения используй цикл:

```text
IMPLEMENT
↓
RUN
↓
PLAY
↓
OBSERVE
↓
IDENTIFY PROBLEMS
↓
FIX
↓
PLAY AGAIN
```

Не считать функцию готовой только потому, что TypeScript компилируется.

---

# 90. НЕ ДОПУСКАЙ ТЕХНИЧЕСКОГО ДОЛГА В КОНЦЕ

Перед завершением проекта выполни:

### Code audit

Проверить:

* unused imports;
* dead code;
* duplicated logic;
* giant components;
* unnecessary state;
* magic numbers;
* broken types;
* console errors.

### Gameplay audit

Проверить:

* можно ли начать бой;
* можно ли победить;
* можно ли проиграть;
* можно ли сыграть несколько раундов;
* работает ли restart;
* работает ли pause;
* работает ли rematch.

### UX audit

Проверить:

* можно ли понять управление;
* понятно ли состояние персонажа;
* понятен ли победитель;
* не перекрывает ли UI gameplay.

---

# 91. ФИНАЛЬНАЯ ПРОВЕРКА

Перед тем как считать работу завершённой, самостоятельно пройти полный сценарий:

```text
OPEN
↓
MAIN MENU
↓
ARCADE
↓
CHARACTER SELECT
↓
RAVEN
↓
OPPONENT
↓
ARENA
↓
INTRO
↓
ROUND 1
↓
FIGHT
↓
COMBO
↓
SPECIAL
↓
ROUND WIN
↓
ROUND 2
↓
KO
↓
NEXT FIGHT
↓
BOSS
↓
BOSS PHASE 2
↓
BOSS DEFEAT
↓
ENDING
↓
SAVE PROGRESS
↓
RELOAD PAGE
↓
VERIFY SAVE
```

Если какой-либо этап не работает:

**исправить его до завершения проекта.**

---

# 92. ФИНАЛЬНЫЙ QUALITY BAR

Не считать проект завершённым, если:

* игра запускается, но нельзя нормально играть;
* есть неработающие кнопки;
* есть очевидные runtime errors;
* AI не работает;
* combat является mockup;
* персонажи являются статичными картинками без нормального gameplay;
* отсутствуют основные режимы;
* есть очевидные TODO;
* есть незаконченные экраны;
* после reload теряются настройки;
* основной arcade loop не проходит от начала до конца.

---

# 93. ЕСЛИ ВРЕМЯ ИЛИ РЕСУРСЫ ОГРАНИЧЕНЫ

Если невозможно реализовать всё с одинаковым уровнем детализации, используй следующую стратегию:

**лучше полностью рабочие 2 персонажа, чем 6 сломанных.**

Но:

архитектура должна предусматривать всех шесть.

Приоритет:

```text
WORKING GAMEPLAY
>
GAME FEEL
>
AI
>
UI
>
CONTENT QUANTITY
>
COSMETIC POLISH
```

---

# 94. НЕ ЗАВЕРШАЙ РАБОТУ СООБЩЕНИЕМ "ГОТОВО", ЕСЛИ ПРОЕКТ НЕ ГОТОВ

Фраза:

> "Проект готов"

допустима только после прохождения финальной проверки.

Если какая-либо основная функция не реализована, продолжай разработку.

---

# 95. КОНЕЧНАЯ ЦЕЛЬ

Не создавай "демо интерфейса".

Не создавай "концепт игры".

Не создавай "proof of concept".

Создай **реально играемый browser fighting game vertical slice**, который выглядит и ощущается как маленькая законченная коммерческая игра.

Работай автономно.

Принимай разумные решения самостоятельно.

Тестируй свою работу.

Исправляй собственные ошибки.

Улучшай уже работающие механики.

Переходи к следующему milestone автоматически.

**Не останавливайся, пока весь заявленный основной функционал не будет реализован, интегрирован, протестирован и доведён до рабочего состояния.**

