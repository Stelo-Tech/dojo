import { LevelData } from '@/levels/LevelTypes';

/**
 * Level 04 — "Wall Street"
 *
 * Layout (960x540):
 *   - Main floor: x=0,   y=450, w=960, h=90
 *   - Tall vertical wall: x=480, y=350, w=30, h=100
 *     (sits on main floor, too tall to auto-climb at 100px)
 *   - Spawn at x=80,  y=430 on the left of the wall
 *   - Exit at x=860, y=420 on the right of the wall
 *
 * Strategy options:
 *   1. Dig through the base of the wall (dig tool)
 *   2. Build stairs over the wall (stairs tool)
 *   3. Place wall to block lemmings then redirect with stairs
 *
 * Goal: Find a way past the tall wall. Teaches multi-tool thinking.
 */
export const level04: LevelData = {
  id: 4,
  name: 'wall-street',
  difficulty: 'easy',
  par: 10,
  description: 'Find a way past the wall',
  terrain: [
    // Main floor
    { x: 0, y: 450, w: 960, h: 90 },
    // Tall vertical wall obstacle
    { x: 480, y: 350, w: 30, h: 100 },
  ],
  spawn: {
    x: 80,
    y: 430,
    rate: 1200,
    count: 15,
  },
  exit: {
    x: 860,
    y: 420,
    w: 40,
    h: 30,
  },
  tools: {
    dig: 2,
    wall: 2,
    stairs: 2,
  },
};
