export interface LevelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color?: number;
}

export interface LevelSpawn {
  readonly x: number;
  readonly y: number;
  readonly rate: number; // ms between spawns
  readonly count: number; // total lemmings to spawn
}

export interface LevelExit {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface LevelToolConfig {
  readonly dig?: number;
  readonly stairs?: number;
  readonly wall?: number;
  readonly ramp?: number;
  readonly digger?: number;
  readonly basher?: number;
  readonly miner?: number;
  readonly builder?: number;
  readonly blocker?: number;
  readonly climber?: number;
  readonly floater?: number;
  readonly bomber?: number;
}

export interface LevelData {
  readonly id: number;
  readonly name: string;
  readonly difficulty: 'tutorial' | 'easy' | 'medium' | 'hard';
  readonly par: number; // minimum saves to pass (e.g., 8 out of 10)
  readonly terrain: readonly LevelRect[];
  readonly spawn: LevelSpawn;
  readonly exit: LevelExit;
  readonly tools: LevelToolConfig;
  readonly timeLimit?: number; // optional time limit in seconds
  readonly description?: string; // tutorial hint text
}
