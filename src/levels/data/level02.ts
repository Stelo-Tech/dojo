import { LevelData } from '@/levels/LevelTypes';

/**
 * Level 02 — "Mind the Gap"
 *
 * Layout (960x540):
 *   - Left platform: x=0,   y=450, w=380, h=90  (spawn side)
 *   - Gap:           x=380, y=450, w=120, h=90  (80px gap to cross)
 *   - Right platform: x=500, y=450, w=460, h=90 (exit side)
 *   - Spawn at x=80, y=430 on left platform
 *   - Exit at x=860, y=420 on right platform
 *
 * Goal: Player must use stairs or ramp to bridge the 120px gap.
 * Teaches tool usage for bridging gaps.
 */
export const level02: LevelData = {
  id: 2,
  name: 'mind-the-gap',
  difficulty: 'tutorial',
  par: 7,
  description: 'Use stairs or ramps to cross the gap',
  terrain: [
    // Left platform
    { x: 0, y: 450, w: 380, h: 90 },
    // Right platform
    { x: 500, y: 450, w: 460, h: 90 },
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
  tools: {
    stairs: 2,
    ramp: 2,
  },
};
