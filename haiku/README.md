# IRON BLOOD - 2D Fighting Game

A cinematic 2D fighting game built with React, TypeScript, and Canvas API.

## Features

- **Core Combat System**: Frame-based fighting mechanics with startup, active, and recovery frames
- **Character Roster**: Raven (Soldier), Brute (Tank), and more
- **AI Opponents**: Multiple difficulty levels (Easy, Normal, Hard, Nightmare)
- **Game Modes**: 
  - Arcade: Single-player story mode
  - Versus: Player vs Player on single keyboard
  - Training: Practice combos and moves
- **Combat Features**:
  - Combo system with input buffering
  - Special moves with meter requirements
  - Grab mechanics
  - Block and perfect block
  - Cinematic hit effects and particle system
- **Progression**: Save system with localStorage
- **Settings**: Audio, graphics, and gameplay options

## Project Setup

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
```
Opens game at `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

## Controls

### Player 1 (WASD)
- **A/D** - Move Left/Right
- **W** - Jump
- **S** - Crouch
- **J** - Light Punch
- **K** - Heavy Punch  
- **L** - Light Kick
- **;** - Heavy Kick
- **I** - Special Attack 1
- **O** - Special Attack 2
- **Space** - Block
- **Esc** - Pause

### Player 2 (Arrow Keys + Numpad)
- **Arrow Keys** - Move
- **Numpad 1-6** - Attacks
- **+** - Special

## Architecture

### Core Systems
- `CombatSystem`: Hitbox detection, damage calculation, state transitions
- `InputManager`: Keyboard input buffering and special move detection
- `AIController`: Opponent behavior with difficulty scaling
- `ParticleSystem`: Visual effects pooling
- `AudioManager`: Sound effects and music (Web Audio API)
- `SaveManager`: Progression persistence (localStorage)

### Game Loop
1. Input capture and buffering
2. Fighter state update (position, velocity, animation frame)
3. Combat resolution (hitbox collision, damage)
4. AI decision making
5. Particle system update
6. Canvas rendering
7. HUD display

## Character Stats

| Character | Speed | Damage | Health | Style |
|-----------|-------|--------|--------|-------|
| Raven | 8 | 7 | 1000 | Balanced fighter |
| Brute | 3 | 10 | 1200 | Power-based tank |

## File Structure

```
src/
├── components/       # React UI components
├── scenes/          # Game screens (Menu, Fight, etc)
├── systems/         # Core game systems
├── data/            # Character and attack data
├── types/           # TypeScript definitions
└── App.tsx          # Main app component
```

## Development Roadmap

### Milestone 0: ✅ Bootstrap
- Project structure
- TypeScript setup
- Build configuration

### Milestone 1: In Progress - Core Combat
- Player movement and jumping
- Basic attacks and hitboxes
- Damage system
- AI opponent

### Milestone 2: Game Feel
- Hit stop and screen shake
- Particle effects
- Sound effects
- Camera dynamics

### Milestone 3+: Expansion
- More characters
- Additional arenas
- Cinematic finishers
- Complete arcade mode

## Performance Notes

- Targets 60 FPS on modern browsers
- Canvas rendering for optimal performance
- Particle pooling to reduce GC pressure
- Separate React state from game loop

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires ES2020 support

## Version

v1.0.0 - Vertical Slice / MVP
