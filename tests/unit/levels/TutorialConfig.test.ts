import { describe, it, expect } from 'vitest';
import {
  TUTORIAL_FLOW,
  getTutorialStep,
} from '@/levels/TutorialConfig';

// ---------------------------------------------------------------------------
// TUTORIAL_FLOW structure
// ---------------------------------------------------------------------------

describe('TUTORIAL_FLOW', () => {
  it('has exactly 5 tutorial steps', () => {
    expect(TUTORIAL_FLOW).toHaveLength(5);
  });

  it('has unique level IDs', () => {
    const ids = TUTORIAL_FLOW.map((step) => step.levelId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('level IDs are in ascending order', () => {
    for (let i = 1; i < TUTORIAL_FLOW.length; i++) {
      expect(TUTORIAL_FLOW[i].levelId).toBeGreaterThan(
        TUTORIAL_FLOW[i - 1].levelId,
      );
    }
  });

  it('each step has a non-empty tutorial message', () => {
    for (const step of TUTORIAL_FLOW) {
      expect(step.tutorialMessage.length).toBeGreaterThan(0);
    }
  });

  it('first level introduces no new skill', () => {
    expect(TUTORIAL_FLOW[0].newSkillIntroduced).toBeNull();
    expect(TUTORIAL_FLOW[0].highlightTool).toBeNull();
  });

  it('subsequent levels each introduce a new skill', () => {
    for (let i = 1; i < TUTORIAL_FLOW.length; i++) {
      expect(TUTORIAL_FLOW[i].newSkillIntroduced).not.toBeNull();
      expect(
        typeof TUTORIAL_FLOW[i].newSkillIntroduced === 'string' &&
          TUTORIAL_FLOW[i].newSkillIntroduced!.length > 0,
      ).toBe(true);
    }
  });

  it('highlightTool matches newSkillIntroduced when present', () => {
    for (const step of TUTORIAL_FLOW) {
      if (step.newSkillIntroduced !== null) {
        expect(step.highlightTool).toBe(step.newSkillIntroduced);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getTutorialStep
// ---------------------------------------------------------------------------

describe('getTutorialStep', () => {
  it('returns the correct step for level 1', () => {
    const step = getTutorialStep(1);
    expect(step).not.toBeNull();
    expect(step?.levelId).toBe(1);
    expect(step?.newSkillIntroduced).toBeNull();
  });

  it('returns the correct step for level 2', () => {
    const step = getTutorialStep(2);
    expect(step).not.toBeNull();
    expect(step?.newSkillIntroduced).toBe('stairs');
  });

  it('returns the correct step for level 3', () => {
    const step = getTutorialStep(3);
    expect(step).not.toBeNull();
    expect(step?.newSkillIntroduced).toBe('dig');
  });

  it('returns the correct step for level 4', () => {
    const step = getTutorialStep(4);
    expect(step).not.toBeNull();
    expect(step?.newSkillIntroduced).toBe('wall');
  });

  it('returns the correct step for level 5', () => {
    const step = getTutorialStep(5);
    expect(step).not.toBeNull();
    expect(step?.newSkillIntroduced).toBe('ramp');
  });

  it('returns null for a non-tutorial level', () => {
    expect(getTutorialStep(99)).toBeNull();
  });

  it('returns null for level 0', () => {
    expect(getTutorialStep(0)).toBeNull();
  });

  it('returns null for negative level IDs', () => {
    expect(getTutorialStep(-1)).toBeNull();
  });
});
