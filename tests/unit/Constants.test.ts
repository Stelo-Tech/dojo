import { describe, it, expect } from 'vitest';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
  HUD_BAR_Y,
  HUD_BAR_HEIGHT,
  SPAWN_Y,
  EXIT_X,
  EXIT_Y,
  EXIT_WIDTH,
  EXIT_HEIGHT,
  PLATFORM_LEFT,
  WALL_VERT,
  EXIT_PLATFORM,
  LEFT_CLIFF_GAP,
  FOSSE_GAP,
  TOOL_RAMP_HEIGHT,
  TOOL_RAMP_LENGTH,
  LEMMING_FALL_DISTANCE,
} from '@/utils/Constants';

describe('Level geometry coherence', () => {
  it('terrain fits above HUD bar — terrain bottom edge must not overlap the HUD', () => {
    // TERRAIN_Y + TERRAIN_HEIGHT (470) <= HUD_BAR_Y (470)
    expect(TERRAIN_Y + TERRAIN_HEIGHT).toBeLessThanOrEqual(HUD_BAR_Y);
  });

  it('HUD bar fills exact bottom strip — HUD_BAR_Y + HUD_BAR_HEIGHT must equal GAME_HEIGHT', () => {
    // 470 + 70 === 540
    expect(HUD_BAR_Y + HUD_BAR_HEIGHT).toBe(GAME_HEIGHT);
  });

  it('spawn point is above terrain — lemmings must enter from above ground level', () => {
    // SPAWN_Y (320) < TERRAIN_Y (400)
    expect(SPAWN_Y).toBeLessThan(TERRAIN_Y);
  });

  it('exit zone bottom touches terrain surface — within 2px tolerance', () => {
    // EXIT_Y + EXIT_HEIGHT (400) must be close to TERRAIN_Y (400)
    const exitBottom = EXIT_Y + EXIT_HEIGHT;
    expect(Math.abs(exitBottom - TERRAIN_Y)).toBeLessThanOrEqual(2);
  });

  it('exit zone is within horizontal game bounds — exit must not bleed off-screen', () => {
    // EXIT_X (850) >= 0 && EXIT_X + EXIT_WIDTH (880) <= GAME_WIDTH (960)
    expect(EXIT_X).toBeGreaterThanOrEqual(0);
    expect(EXIT_X + EXIT_WIDTH).toBeLessThanOrEqual(GAME_WIDTH);
  });

  it('platform left is above terrain — spawn platform must be elevated above ground', () => {
    // PLATFORM_LEFT.y (340) < TERRAIN_Y (400)
    expect(PLATFORM_LEFT.y).toBeLessThan(TERRAIN_Y);
  });

  it('wall extends above terrain surface and reaches terrain level — wall must act as an obstacle crossing the ground line', () => {
    // WALL_VERT.y (330) < TERRAIN_Y (400)
    expect(WALL_VERT.y).toBeLessThan(TERRAIN_Y);
    // WALL_VERT.y + WALL_VERT.h (400) >= TERRAIN_Y (400)
    expect(WALL_VERT.y + WALL_VERT.h).toBeGreaterThanOrEqual(TERRAIN_Y);
  });

  it('exit platform sits exactly at terrain level — lemmings must walk on it without gap or overlap', () => {
    // EXIT_PLATFORM.y (400) === TERRAIN_Y (400)
    expect(EXIT_PLATFORM.y).toBe(TERRAIN_Y);
  });

  it('gap heights match terrain height — gaps must cut through the full terrain block', () => {
    // LEFT_CLIFF_GAP.h (70) === TERRAIN_HEIGHT (70)
    expect(LEFT_CLIFF_GAP.h).toBe(TERRAIN_HEIGHT);
    // FOSSE_GAP.h (70) === TERRAIN_HEIGHT (70)
    expect(FOSSE_GAP.h).toBe(TERRAIN_HEIGHT);
  });

  it('tool ramp slope is not too steep — rise/run ratio must stay below 0.6', () => {
    // TOOL_RAMP_HEIGHT / TOOL_RAMP_LENGTH (0.4) < 0.6
    expect(TOOL_RAMP_HEIGHT / TOOL_RAMP_LENGTH).toBeLessThan(0.6);
  });

  it('lemming fatal fall distance is less than terrain height — a full terrain drop must be lethal', () => {
    // LEMMING_FALL_DISTANCE (60) < TERRAIN_HEIGHT (70)
    expect(LEMMING_FALL_DISTANCE).toBeLessThan(TERRAIN_HEIGHT);
  });
});
