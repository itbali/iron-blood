/** Fixed simulation rate. Combat timing is expressed in these ticks. */
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;
export const MAX_TICKS_PER_FRAME = 4;

/** Virtual resolution; the canvas is letterboxed to keep 16:9. */
export const VIEW_WIDTH = 1920;
export const VIEW_HEIGHT = 1080;

/** World/stage geometry (world units are virtual pixels at zoom 1). */
export const STAGE_HALF_WIDTH = 1250;
export const STAGE_FLOOR_Y = 920;
export const WALL_PUSHBACK = 14;
export const WALL_SHAKE = 6;

/** Camera */
export const CAMERA_MIN_ZOOM = 0.82;
export const CAMERA_MAX_ZOOM = 1.12;
export const CAMERA_ZOOM_NEAR_DISTANCE = 300;
export const CAMERA_ZOOM_FAR_DISTANCE = 1300;
export const CAMERA_LERP = 0.08;
export const CAMERA_ZOOM_LERP = 0.05;
export const CAMERA_LOOK_UP = 0;
export const SHAKE_LIGHT = 3;
export const SHAKE_HEAVY = 8;
export const SHAKE_SPECIAL = 11;
export const SHAKE_FINISHER = 18;

/** Physics */
export const GRAVITY = 1.05;
export const GROUND_FRICTION = 0.82;
export const AIR_DRAG = 0.985;
export const MAX_FALL_SPEED = 28;
export const WALK_ACCEL = 1.6;
export const PUSH_APART_SPEED = 3;

/** Combat */
export const DEFAULT_MAX_HEALTH = 1000;
export const ROUND_TIME = 99;
export const ROUNDS_TO_WIN = 2;
export const MAX_ROUNDS = 5;
export const INPUT_BUFFER_FRAMES = 10;
export const MOTION_WINDOW_FRAMES = 18;
export const PERFECT_BLOCK_WINDOW = 6;
export const PERFECT_BLOCK_ADVANTAGE = 6;
export const PERFECT_BLOCK_METER = 60;
export const BLOCK_METER_GAIN = 8;
export const DAMAGE_TAKEN_METER_RATIO = 0.35;
export const METER_MAX = 1000;
export const METER_ROUND_CARRY = 0.5;
export const COMBO_SCALING_STEP = 0.1;
export const COMBO_SCALING_MIN = 0.35;
export const COMBO_DROP_FRAMES = 28;
export const CHIP_RATIO = 0.12;
export const KNOCKDOWN_FRAMES = 44;
export const GETUP_FRAMES = 20;
export const GETUP_INVULN_FRAMES = 12;
export const HITSTUN_AIR_BONUS = 10;
export const ARMOR_DAMAGE_RATIO = 0.6;
export const CRITICAL_DAMAGE_THRESHOLD = 150;

/** Hit stop / slow motion (ticks) */
export const HITSTOP_LIGHT = 2;
export const HITSTOP_HEAVY = 4;
export const HITSTOP_SPECIAL = 6;
export const HITSTOP_FINISHER = 15;
export const PERFECT_BLOCK_SLOWMO_TICKS = 14;
export const PERFECT_BLOCK_TIMESCALE = 0.3;
export const KO_SLOWMO_TICKS = 70;
export const KO_TIMESCALE = 0.3;

/** Phase durations (ticks) */
export const INTRO_FRAMES = 240;
export const ROUND_ANNOUNCE_FRAMES = 80;
export const FIGHT_ANNOUNCE_FRAMES = 45;
export const KO_FRAMES = 110;
export const FINISHER_WINDOW_FRAMES = 240;
export const FINISHER_FRAMES = 200;
export const ROUND_END_FRAMES = 150;
export const FINISHER_RANGE = 240;
export const SUPER_FLASH_FRAMES = 30;

/** Projectiles */
export const PROJECTILE_MAX = 8;
export const PROJECTILE_HITSTOP = 3;

/** HUD */
export const HUD_PUSH_INTERVAL_MS = 50;
export const DAMAGE_NUMBER_LIFETIME = 42;
export const COMBO_DISPLAY_MIN_HITS = 2;

/** Particles */
export const PARTICLE_POOL_SIZE = 900;

/** Arcade */
export const ARCADE_FIGHTS = 5;

/** Boss */
export const BOSS_PHASE2_RATIO = 0.5;

/** AI */

/** Persistence */
export const SAVE_KEY = 'ironblood.save.v1';
export const SETTINGS_KEY = 'ironblood.settings.v1';
export const GAME_VERSION = '1.0.0';
