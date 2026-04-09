import { LevelData } from '@/levels/LevelTypes';

/**
 * Level 05 — "Combo Meal"
 *
 * Layout (960x540):
 *   - Lower floor:  x=0,   y=480, w=960, h=60  (bottom safety floor)
 *   - Left ledge:   x=0,   y=380, w=280, h=100 (spawn platform)
 *   - Middle shelf: x=360, y=410, w=200, h=70  (intermediate platform, 30px drop from left)
 *     - Middle shelf has a wall on it: x=500, y=350, w=20, h=60
 *   - Right ledge:  x=650, y=370, w=310, h=110 (exit platform, 40px above middle)
 *   - Gap left→middle:  x=280..360 (80px)  — needs ramp or stairs
 *   - Wall on middle:   x=500..520           — needs dig or go over with stairs
 *   - Gap middle→right: x=560..650 (90px)  — needs stairs after clearing wall
 *
 * Goal: Combine ramp/stairs to cross gap, then dig/stairs to pass wall,
 *       then stairs again to reach upper right ledge.
 * Tests: 2+ tool types required together.
 */
export const level05: LevelData = {
  id: 5,
  name: 'combo-meal',
  difficulty: 'easy',
  par: 10,
  description: 'Combine your tools wisely!',
  terrain: [
    // Lower safety floor
    { x: 0, y: 480, w: 960, h: 60 },
    // Left spawn ledge
    { x: 0, y: 380, w: 280, h: 100 },
    // Middle shelf
    { x: 360, y: 410, w: 200, h: 70 },
    // Wall on middle shelf
    { x: 500, y: 350, w: 20, h: 60 },
    // Right exit ledge
    { x: 650, y: 370, w: 310, h: 110 },
  ],
  spawn: {
    x: 80,
    y: 360,
    rate: 1200,
    count: 15,
  },
  exit: {
    x: 860,
    y: 340,
    w: 40,
    h: 30,
  },
  tools: {
    dig: 2,
    stairs: 3,
    wall: 2,
    ramp: 1,
  },
};
