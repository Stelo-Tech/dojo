import { LevelLoader } from '@/levels/LevelLoader';
import { level01 } from './level01';
import { level02 } from './level02';
import { level03 } from './level03';
import { level04 } from './level04';
import { level05 } from './level05';

export function registerAllLevels(): void {
  LevelLoader.registerLevel(level01);
  LevelLoader.registerLevel(level02);
  LevelLoader.registerLevel(level03);
  LevelLoader.registerLevel(level04);
  LevelLoader.registerLevel(level05);
}

export { level01, level02, level03, level04, level05 };
