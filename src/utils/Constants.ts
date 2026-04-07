/** Base game resolution (16:9 landscape) */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Physics */
export const GRAVITY = 300;

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
export const BUILD_INTERVAL = 300;
export const BUILD_MAX_STEPS = 12;
export const BUILD_STEP_WIDTH = 12;
export const BUILD_STEP_HEIGHT = 2;
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
export const EXIT_Y = 438;
export const EXIT_WIDTH = 30;
export const EXIT_HEIGHT = 30;
