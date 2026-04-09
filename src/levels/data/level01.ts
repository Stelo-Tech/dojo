import { LevelData } from '@/levels/LevelTypes';

/**
 * Level 01 — "First Steps"
 *
 * Layout (960x540):
 *   - Full-width flat floor at y=450, height=90 (matches default TERRAIN_Y)
 *   - Spawn on the left (x=80, y=430) — stands on floor
 *   - Exit on the right (x=860, y=420) — sits on floor
 *
 * Goal: Lemmings walk right unassisted. Teaches the core concept.
 * No tools needed — just watch them walk.
 */
export const level01: LevelData = {
  id: 1,
  name: 'first-steps',
  difficulty: 'tutorial',
  par: 8,
  description: 'Guide the lemmings to the exit!',
  terrain: [
    // Full-width ground floor
    { x: 0, y: 450, w: 960, h: 90 },
  ],
  spawn: {
    x: 80,
    y: 430,
    rate: 1500,
    count: 10,
  },
  exit: {
    x: 860,
    y: 420,
    w: 40,
    h: 30,
  },
  tools: {},
};
