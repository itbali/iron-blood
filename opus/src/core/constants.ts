/** Simulation runs at a fixed 60 Hz; every gameplay timing value is expressed in frames. */
export const SIM_FPS = 60;
export const SIM_DT_MS = 1000 / SIM_FPS;
/** Upper bound of catch-up steps per rendered frame, prevents a spiral of death after a tab switch. */
export const MAX_STEPS_PER_FRAME = 5;

export const msToFrames = (ms: number): number => Math.max(1, Math.round(ms / SIM_DT_MS));

/** Logical render resolution; the canvas is scaled to fit while keeping 16:9. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

/** World space: x grows right, y grows up from the floor (y = 0). */
export const STAGE_HALF_WIDTH = 1100;
export const MAX_SEPARATION = 900;
export const START_OFFSET = 230;

export const GRAVITY = 0.85;
export const GROUND_FRICTION = 0.82;
export const AIR_DRAG = 0.99;
export const WALK_ACCEL = 0.6;
export const WALK_DECEL = 0.7;

export const BASE_HEALTH = 1000;
export const MAX_METER = 100;
export const SUPER_COST = 100;
export const ROUND_METER_CARRY = 0.5;

export const ROUND_TIME_SECONDS = 99;
export const ROUNDS_TO_WIN = 2;
export const MAX_ROUNDS = 5;

/** Input buffer: presses are remembered for ~150 ms (spec asks for 100–200 ms). */
export const INPUT_BUFFER_FRAMES = 9;
export const MOTION_WINDOW_FRAMES = 16;
export const DASH_WINDOW_FRAMES = 12;
export const SUPER_SIMULTANEOUS_FRAMES = 4;
export const INPUT_HISTORY_FRAMES = 40;

export const PERFECT_BLOCK_WINDOW = 5;
export const THROW_TECH_WINDOW = 8;
export const COMBO_BREAK_WINDOW = 24;
export const MAX_CHAIN = 5;

/** Combo damage scaling: from the 3rd hit each hit is scaled down, never below the floor. */
export const COMBO_SCALING_STEP = 0.9;
export const COMBO_SCALING_FLOOR = 0.4;
export const CHIP_DAMAGE_RATIO = 0.15;
export const COUNTER_HIT_MULT = 1.2;

export const METER_PER_DAMAGE_DEALT = 0.12;
export const METER_PER_DAMAGE_TAKEN = 0.08;
export const METER_PER_BLOCK = 2;

export const KNOCKDOWN_FRAMES = 40;
export const GETUP_FRAMES = 22;
export const WAKEUP_INVULN = true;

/** Hit stop durations from the design spec. */
export const HITSTOP = {
  light: msToFrames(30),
  heavy: msToFrames(70),
  special: msToFrames(100),
  finisher: msToFrames(250),
} as const;

export const SLOWMO_SCALE = 0.3;
