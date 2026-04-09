import { TerrainSystem } from '@/systems/TerrainSystem';
import { LevelData } from '@/levels/LevelData';
import { THEME_COLORS } from '@/utils/Constants';

/**
 * Thin bridge between generated LevelData and TerrainSystem.
 *
 * Responsibilities:
 *   1. Apply terrain geometry (fills then erases) to TerrainSystem
 *   2. Pass the level's theme colors to TerrainSystem so terrain is
 *      rendered in the correct visual palette
 */
export class LevelLoader {
  load(levelData: LevelData, terrain: TerrainSystem): void {
    // Resolve theme colors for the level's visual biome
    const themeColors = THEME_COLORS[levelData.theme];

    // Apply fills first (base ground, platforms, walls)
    for (const rect of levelData.terrainFills) {
      // Use the theme's terrain color when filling — TerrainSystem.fillRect
      // accepts an optional color override to bypass its default palette
      terrain.fillRect(rect.x, rect.y, rect.w, rect.h, themeColors.terrain);
    }

    // Then apply erases (gaps, pits, hazard zones)
    for (const rect of levelData.terrainErases) {
      terrain.eraseRect(rect.x, rect.y, rect.w, rect.h);
    }

    // Hazards (water, lava, crusher) are visual overlays registered separately.
    // The GameScene is responsible for drawing them using themeColors.hazard_primary
    // from THEME_COLORS[levelData.theme].
  }

  /**
   * Returns the theme colors for the given level so the scene can apply
   * background gradients and hazard visuals without re-importing Constants.
   */
  getThemeColors(levelData: LevelData): (typeof THEME_COLORS)[keyof typeof THEME_COLORS] {
    return THEME_COLORS[levelData.theme];
  }
}
