import { ToolType } from '@/utils/Constants';

/** A rectangle in world coordinates */
export interface TerrainRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Visual theme applied to a generated level */
export type LevelTheme = 'prairie' | 'cave' | 'factory' | 'volcano' | 'space';

/** High-level path shape for the level */
export type LayoutType = 'linear' | 'u-shape' | 'vertical' | 'split' | 'zigzag' | 'island';

/** Obstacle types the generator can place in a segment */
export type ObstacleType =
  | 'gap'
  | 'wall'
  | 'pit'
  | 'elevated_platform'
  | 'water_zone'
  | 'lava_zone'
  | 'crusher_zone'
  | 'multi_platform'
  | 'narrow_tunnel'
  | 'crumbling_platform'
  | 'none';

/** A runtime hazard drawn on top of terrain (water, lava, crusher) */
export interface Hazard {
  readonly type: 'water' | 'lava' | 'crusher';
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A single obstacle within a segment */
export interface Obstacle {
  readonly type: ObstacleType;
  /** Which tool solves this obstacle (null if no tool needed) */
  readonly requiredTool: ToolType | null;
  /** World rect of the obstacle itself */
  readonly rect: TerrainRect;
}

/** A segment of the level between spawn and exit */
export interface Segment {
  readonly startX: number;
  readonly endX: number;
  readonly obstacle: Obstacle;
  readonly fills: readonly TerrainRect[];
  readonly erases: readonly TerrainRect[];
}

/** Difficulty configuration for procedural generation */
export interface DifficultyConfig {
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly segmentCount: number;
  readonly allowedObstacles: readonly ObstacleType[];
  readonly lemmingCount: number;
  readonly requiredSaves: number;
  readonly spawnInterval: number;
  /** Extra tools beyond the exact minimum required (0 = tight, 3 = generous) */
  readonly toolSlack: number;
  /** Available layout patterns for this tier */
  readonly availableLayouts: readonly LayoutType[];
}

/** Complete output of the procedural generator */
export interface LevelData {
  readonly name: string;
  readonly seed: number;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly theme: LevelTheme;
  readonly layoutType: LayoutType;
  readonly spawn: Readonly<{ x: number; y: number }>;
  readonly exit: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly terrainFills: readonly TerrainRect[];
  readonly terrainErases: readonly TerrainRect[];
  readonly hazards: readonly Hazard[];
  readonly segments: readonly Segment[];
  readonly toolBudget: Readonly<Record<ToolType, number>>;
  readonly lemmingCount: number;
  readonly requiredSaves: number;
  readonly spawnInterval: number;
}
