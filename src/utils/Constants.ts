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

/** Terrain */
export const TERRAIN_Y = 450;
export const TERRAIN_HEIGHT = 90;
export const TERRAIN_COLOR = 0x8b4513;

/** Skills */
export const DIG_SPEED = 20;
export const BUILD_INTERVAL = 400;
export const BUILD_MAX_STEPS = 10;
export const BUILD_STEP_WIDTH = 18;
export const BUILD_STEP_HEIGHT = 4;

/** Maximum step height a walker can auto-climb (pixels) */
export const STEP_CLIMB_MAX = 6;
export const CLIMB_SPEED = 20;
export const CLIMB_MAX_HEIGHT = 60;

/** Skill availability per level */
export const SKILLS_AVAILABLE: Readonly<Record<SkillType, number>> = {
  digger: 5,
  builder: 5,
  blocker: 3,
  climber: 3,
};

/** Skill type union */
export type SkillType = 'digger' | 'builder' | 'blocker' | 'climber';

/** Exit zone */
export const EXIT_X = 850;
export const EXIT_Y = 420;
export const EXIT_WIDTH = 30;
export const EXIT_HEIGHT = 30;

/** Spawn point */
export const SPAWN_X = 100;
export const SPAWN_Y = 370;

/** Visual colors per state */
export const STATE_COLORS: Readonly<Record<string, number>> = {
  walker: 0x00ff00,
  digger: 0xcd853f,
  builder: 0x00ffff,
  blocker: 0xff4444,
  climber: 0xff00ff,
  faller: 0xffff00,
  dead: 0x666666,
  saved: 0xffffff,
};

/** Hair color for lemmings (distinguishing feature) */
export const HAIR_COLOR = 0x4488ff;

/** Direction indicator color */
export const DIRECTION_COLOR = 0xffaa00;

/** Flash durations in ms */
export const FLASH_DURATION_DEATH = 200;
export const FLASH_DURATION_SAVED = 200;
export const FLASH_DURATION_SKILL = 150;

/** Background colors */
export const BG_COLOR_TOP = 0x0a0a1e;
export const BG_COLOR_MID = 0x12122e;
export const BG_COLOR_BOTTOM = 0x1a1a3e;

/** Star count for background decoration */
export const BG_STAR_COUNT = 30;

/** HUD button dimensions */
export const HUD_BUTTON_WIDTH = 100;
export const HUD_BUTTON_HEIGHT = 50;
export const HUD_BUTTON_GAP = 12;

/** Skill color mapping (matches STATE_COLORS for skill types) */
export const SKILL_ICON_COLORS: Readonly<Record<SkillType, number>> = {
  digger: 0xcd853f,
  builder: 0x00ffff,
  blocker: 0xff4444,
  climber: 0xff00ff,
};

/** Level geometry rect definition */
interface LevelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Spawn platform */
export const PLATFORM_LEFT: LevelRect = { x: 50, y: 390, w: 200, h: 15 };

/** Danger ledge */
export const LEFT_CLIFF_GAP: LevelRect = { x: 0, y: TERRAIN_Y, w: 120, h: 90 };

/** Wide gap requiring Builder (80px = exact builder range) */
export const FOSSE_GAP: LevelRect = { x: 300, y: TERRAIN_Y, w: 80, h: 90 };

/** Vertical wall — needs Climber */
export const WALL_VERT: LevelRect = { x: 550, y: 380, w: 20, h: 70 };

/** Platform behind wall leading to exit */
export const EXIT_PLATFORM: LevelRect = { x: 570, y: TERRAIN_Y, w: 350, h: 20 };

/** Removed */
export const STAIR_1: LevelRect = { x: 0, y: 0, w: 0, h: 0 };
export const STAIR_2: LevelRect = { x: 0, y: 0, w: 0, h: 0 };
export const STAIR_3: LevelRect = { x: 0, y: 0, w: 0, h: 0 };
export const PRE_EXIT_GAP: LevelRect = { x: 0, y: 0, w: 0, h: 0 };

/** Blocker collision detection */
export const BLOCKER_DETECTION_RADIUS = 14;
export const BLOCKER_VERTICAL_RANGE = 16;

/** Spawn portal visual */
export const SPAWN_PORTAL_WIDTH = 30;
export const SPAWN_PORTAL_HEIGHT = 20;
export const SPAWN_PORTAL_COLOR = 0x4488ff;

/** Exit pulse speed (radians per second) */
export const EXIT_PULSE_SPEED = 4;
