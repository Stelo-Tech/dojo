import { TerrainSystem } from '@/systems/TerrainSystem';
import { LevelData } from '@/levels/LevelData';

/**
 * Thin bridge between LevelData and TerrainSystem.
 * Applies terrain geometry from a generated/loaded level.
 */
export class LevelLoader {
  load(levelData: LevelData, terrain: TerrainSystem): void {
    // Apply fills first (base ground, platforms, walls)
    for (const rect of levelData.terrainFills) {
      terrain.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    // Then apply erases (gaps, pits)
    for (const rect of levelData.terrainErases) {
      terrain.eraseRect(rect.x, rect.y, rect.w, rect.h);
    }
  }
}
