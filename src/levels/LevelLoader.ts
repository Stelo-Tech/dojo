import { LevelData } from '@/levels/LevelTypes';
import { LevelValidator } from '@/levels/LevelValidator';

export class LevelLoader {
  private static readonly levels: Map<number, LevelData> = new Map();

  static registerLevel(level: LevelData): void {
    const result = LevelValidator.validate(level);
    if (!result.valid) {
      throw new Error(
        `Level ${level.id} ("${level.name}") failed validation:\n${result.errors.join('\n')}`,
      );
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => {
        console.warn(`[LevelLoader] Level ${level.id} warning: ${w}`);
      });
    }
    if (LevelLoader.levels.has(level.id)) {
      throw new Error(`Level with id ${level.id} is already registered`);
    }
    LevelLoader.levels.set(level.id, level);
  }

  static getLevel(id: number): LevelData | undefined {
    return LevelLoader.levels.get(id);
  }

  static getAllLevels(): readonly LevelData[] {
    return Array.from(LevelLoader.levels.values()).sort((a, b) => a.id - b.id);
  }

  static getLevelCount(): number {
    return LevelLoader.levels.size;
  }

  static getLevelsByDifficulty(difficulty: string): readonly LevelData[] {
    return Array.from(LevelLoader.levels.values())
      .filter((l) => l.difficulty === difficulty)
      .sort((a, b) => a.id - b.id);
  }

  /** Clear all registered levels — useful for testing */
  static clearAll(): void {
    LevelLoader.levels.clear();
  }
}
