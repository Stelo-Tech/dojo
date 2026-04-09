/** Base game resolution (16:9 landscape) */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Physics */
export const GRAVITY = 300;

/** Lemming dimensions */
export const LEMMING_WIDTH = 12;
export const LEMMING_HEIGHT = 18;

/** Lemming movement */
export const LEMMING_SPEED = 40;
export const LEMMING_FALL_DISTANCE = 60;

/** Spawn config */
export const MAX_LEMMINGS = 100;
export const SPAWN_INTERVAL = 1000;

/** Terrain — sits flush above HUD bar (y=400..470) */
export const TERRAIN_Y = 400;
export const TERRAIN_HEIGHT = 70;
export const TERRAIN_COLOR = 0x8b5e2a;

/** Maximum step height a walker can auto-climb (pixels) */
export const STEP_CLIMB_MAX = 6;

/** Tool type union — terrain placement tools */
export type ToolType = 'dig' | 'stairs' | 'wall' | 'ramp';

/** Tool: Stairs (place a staircase on terrain) */
export const TOOL_STAIR_STEPS = 10;
export const TOOL_STAIR_STEP_W = 18;
export const TOOL_STAIR_STEP_H = 4;

/** Tool: Dig (punch a hole in terrain) */
export const TOOL_DIG_WIDTH = 20;
export const TOOL_DIG_DEPTH = 40;

/** Tool: Wall (place a vertical wall on terrain) */
export const TOOL_WALL_WIDTH = 6;
export const TOOL_WALL_HEIGHT = 20;

/** Tool: Ramp (place a smooth slope on terrain) */
export const TOOL_RAMP_LENGTH = 50;
export const TOOL_RAMP_HEIGHT = 20;

/** Tool availability per level */
export const TOOLS_AVAILABLE: Readonly<Record<ToolType, number>> = {
  dig: 5,
  stairs: 5,
  wall: 3,
  ramp: 3,
};

/** Exit zone */
export const EXIT_X = 850;
export const EXIT_Y = 370;
export const EXIT_WIDTH = 30;
export const EXIT_HEIGHT = 30;

/** Spawn point */
export const SPAWN_X = 100;
export const SPAWN_Y = 320;

/** Skill types — assignable abilities */
export type SkillType =
  | 'digger'
  | 'basher'
  | 'miner'
  | 'builder'
  | 'blocker'
  | 'climber'
  | 'floater'
  | 'bomber';

/** Builder config */
export const BUILDER_MAX_STEPS = 12;
export const BUILDER_STEP_WIDTH = 6;
export const BUILDER_STEP_HEIGHT = 2;
export const BUILDER_STEP_INTERVAL = 0.3;

/** Bomber countdown in seconds */
export const BOMBER_COUNTDOWN = 3;

/** Skill speed multipliers (relative to LEMMING_SPEED or GRAVITY) */
export const DIGGER_SPEED_MULT = 0.5;
export const BASHER_SPEED_MULT = 0.3;
export const MINER_SPEED_MULT_X = 0.4;
export const MINER_SPEED_MULT_Y = 0.3;
export const CLIMBER_SPEED_MULT = 0.5;
export const FLOATER_GRAVITY_MULT = 0.2;

/** Skills available per level (default) */
export const SKILLS_AVAILABLE: Readonly<Record<SkillType, number>> = {
  digger: 5,
  basher: 3,
  miner: 3,
  builder: 5,
  blocker: 3,
  climber: 3,
  floater: 3,
  bomber: 2,
};

/** Visual colors per state */
export const STATE_COLORS: Readonly<Record<string, number>> = {
  walker: 0x44dd66,
  faller: 0xffcc22,
  dead: 0x556677,
  saved: 0xeef8ff,
  digger: 0xff8800,
  basher: 0xff4400,
  miner: 0xcc6600,
  builder: 0x00ccff,
  blocker: 0xff0000,
  climber: 0x8800ff,
  floater: 0x88ffff,
  bomber: 0xff0044,
};

/** Lemming body base color (torso/limbs) */
export const LEMMING_BODY_COLOR = 0x3399ff;

/** Lemming skin tone (face/hands) */
export const LEMMING_SKIN_COLOR = 0xffcc99;

/** Hair color for lemmings (distinguishing feature) */
export const HAIR_COLOR = 0x2266ee;

/** Direction indicator color */
export const DIRECTION_COLOR = 0xffaa00;

/** Flash durations in ms */
export const FLASH_DURATION_DEATH = 200;
export const FLASH_DURATION_SAVED = 200;
export const FLASH_DURATION_PLACEMENT = 150;

/** Background gradient stops (deep-space night sky) */
export const BG_COLOR_TOP = 0x06061a;
export const BG_COLOR_MID = 0x0d1230;
export const BG_COLOR_BOTTOM = 0x182050;

/** Star count for background decoration */
export const BG_STAR_COUNT = 60;

/** Terrain earth biome palette */
export const TERRAIN_SURFACE_COLOR = 0x5a9e3a;  // grass top strip
export const TERRAIN_MID_COLOR = 0x8b5e2a;      // dirt body
export const TERRAIN_DEEP_COLOR = 0x5c3510;     // deep shadow
export const TERRAIN_HIGHLIGHT_COLOR = 0xa06b30; // upper highlight

/** HUD bar at bottom of screen */
export const HUD_BAR_HEIGHT = 70;
export const HUD_BAR_Y = GAME_HEIGHT - HUD_BAR_HEIGHT;

/** HUD button dimensions */
export const HUD_BUTTON_WIDTH = 90;
export const HUD_BUTTON_HEIGHT = 46;
export const HUD_BUTTON_GAP = 14;

/** Tool icon color mapping */
export const TOOL_ICON_COLORS: Readonly<Record<ToolType, number>> = {
  dig: 0xcd853f,
  stairs: 0x00ffff,
  wall: 0xff4444,
  ramp: 0xff00ff,
};

/** Tool display labels (French) */
export const TOOL_LABELS: Readonly<Record<ToolType, string>> = {
  dig: 'Creuser',
  stairs: 'Escalier',
  wall: 'Mur',
  ramp: 'Rampe',
};

/** Tool descriptions for tooltip (French) */
export const TOOL_DESCRIPTIONS: Readonly<Record<ToolType, string>> = {
  dig: 'Creuse un trou',
  stairs: 'Pose un escalier',
  wall: 'Place un mur',
  ramp: 'Construit une pente',
};

/** Wall terrain color (darker than normal terrain) */
export const WALL_TERRAIN_COLOR = 0x5a2d0a;

/** Level geometry rect definition */
interface LevelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Spawn platform */
export const PLATFORM_LEFT: LevelRect = { x: 50, y: 340, w: 200, h: 15 };

/** Danger ledge */
export const LEFT_CLIFF_GAP: LevelRect = { x: 0, y: TERRAIN_Y, w: 120, h: TERRAIN_HEIGHT };

/** Wide gap requiring Stairs (80px = exact stair range) */
export const FOSSE_GAP: LevelRect = { x: 300, y: TERRAIN_Y, w: 80, h: TERRAIN_HEIGHT };

/** Vertical wall — needs Ramp or Dig */
export const WALL_VERT: LevelRect = { x: 550, y: 330, w: 20, h: 70 };

/** Platform behind wall leading to exit */
export const EXIT_PLATFORM: LevelRect = { x: 570, y: TERRAIN_Y, w: 350, h: 20 };

/** Removed */
export const STAIR_1: LevelRect = { x: 0, y: 0, w: 0, h: 0 };
export const STAIR_2: LevelRect = { x: 0, y: 0, w: 0, h: 0 };
export const STAIR_3: LevelRect = { x: 0, y: 0, w: 0, h: 0 };
export const PRE_EXIT_GAP: LevelRect = { x: 0, y: 0, w: 0, h: 0 };

/** Spawn portal visual */
export const SPAWN_PORTAL_WIDTH = 30;
export const SPAWN_PORTAL_HEIGHT = 20;
export const SPAWN_PORTAL_COLOR = 0x4488ff;

/** Exit pulse speed (radians per second) */
export const EXIT_PULSE_SPEED = 4;

/** Save system */
export const SAVE_AUTO_SAVE_INTERVAL_MS = 30_000;
export const SAVE_MAX_STARS_PER_LEVEL = 3;
export const STAR_THRESHOLD_GOLD = 1.0; // 100% saved -> 3 stars
export const STAR_THRESHOLD_SILVER = 0.75; // 75%+ saved -> 2 stars

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

/** Audio categories for volume grouping */
export type AudioCategory = 'sfx' | 'music' | 'ui';

/** Default volumes per category (0–1) */
export const AUDIO_VOLUMES: Readonly<Record<AudioCategory, number>> = {
  sfx: 0.7,
  music: 0.4,
  ui: 0.6,
};

/** Audio asset keys — all sound identifiers used across the game */
export const AUDIO_KEYS = {
  // SFX — gameplay actions
  SFX_ASSIGN_SKILL: 'sfx_assign_skill',
  SFX_DIG: 'sfx_dig',
  SFX_BUILD: 'sfx_build',
  SFX_BLOCK: 'sfx_block',
  SFX_EXPLODE: 'sfx_explode',
  SFX_SAVE: 'sfx_save',
  SFX_DEATH: 'sfx_death',
  SFX_SPLAT: 'sfx_splat',
  // UI — menus and feedback
  UI_CLICK: 'ui_click',
  UI_LEVEL_COMPLETE: 'ui_level_complete',
  UI_LEVEL_FAIL: 'ui_level_fail',
  // Music — background tracks
  MUSIC_MENU: 'music_menu',
  MUSIC_GAMEPLAY: 'music_gameplay',
} as const;
