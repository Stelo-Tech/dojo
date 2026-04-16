/**
 * TutorialConfig — Progressive skill introduction flow.
 *
 * Each tutorial step maps to a level ID and defines what new tool
 * or skill is introduced, along with a player-facing message.
 * The tutorial flow is ordered by level progression.
 */

export interface TutorialStep {
  readonly levelId: number;
  readonly newSkillIntroduced: string | null; // null for no new skill
  readonly tutorialMessage: string;
  readonly highlightTool: string | null; // tool to highlight in HUD
}

export const TUTORIAL_FLOW: readonly TutorialStep[] = [
  {
    levelId: 1,
    newSkillIntroduced: null,
    tutorialMessage:
      'Guide the lemmings to the exit! They walk automatically.',
    highlightTool: null,
  },
  {
    levelId: 2,
    newSkillIntroduced: 'stairs',
    tutorialMessage:
      'Use STAIRS to bridge gaps. Tap the tool, then tap the terrain.',
    highlightTool: 'stairs',
  },
  {
    levelId: 3,
    newSkillIntroduced: 'dig',
    tutorialMessage:
      'Use DIG to break through obstacles below.',
    highlightTool: 'dig',
  },
  {
    levelId: 4,
    newSkillIntroduced: 'wall',
    tutorialMessage:
      'Place WALLS to redirect lemmings or block hazards.',
    highlightTool: 'wall',
  },
  {
    levelId: 5,
    newSkillIntroduced: 'ramp',
    tutorialMessage:
      'RAMPS let lemmings climb slopes. Combine tools for complex solutions!',
    highlightTool: 'ramp',
  },
];

/** Get tutorial step for a level, or null if no tutorial exists. */
export function getTutorialStep(
  levelId: number,
): TutorialStep | null {
  return (
    TUTORIAL_FLOW.find((step) => step.levelId === levelId) ?? null
  );
}
