import { LevelData } from '@/levels/LevelTypes';

/**
 * Level 03 — "Dig Down"
 *
 * Layout (960x540):
 *   - Base floor: x=0,   y=480, w=960, h=60  (bottom)
 *   - Thick platform block: x=350, y=390, w=260, h=90
 *     (sits on base floor, blocks forward path at mid-height)
 *   - Spawn raised ledge: x=0,   y=390, w=300, h=90
 *     (same height as block — lemmings walk into the block)
 *   - Exit ledge: x=660,  y=390, w=300, h=90
 *   - Spawn at x=80,  y=370 on raised ledge
 *   - Exit at x=860, y=360 on exit ledge
 *
 * Gap at x=300..350 (50px) and x=610..660 (50px) is small enough for
 * auto-climb (STEP_CLIMB_MAX=6px does NOT apply across flat gaps).
 * Lemmings must dig through the thick middle block.
 *
 * Goal: Player must dig down through the thick obstacle block.
 * Teaches the dig tool.
 */
export const level03: LevelData = {
  id: 3,
  name: 'dig-down',
  difficulty: 'tutorial',
  par: 7,
  description: 'Sometimes the only way is down!',
  terrain: [
    // Base floor
    { x: 0, y: 480, w: 960, h: 60 },
    // Left raised ledge (spawn side)
    { x: 0, y: 390, w: 330, h: 90 },
    // Thick obstacle block in the middle
    { x: 380, y: 390, w: 220, h: 90 },
    // Right exit ledge
    { x: 650, y: 390, w: 310, h: 90 },
  ],
  spawn: {
    x: 80,
    y: 370,
    rate: 1500,
    count: 10,
  },
  exit: {
    x: 860,
    y: 360,
    w: 40,
    h: 30,
  },
  tools: {
    dig: 3,
  },
};
