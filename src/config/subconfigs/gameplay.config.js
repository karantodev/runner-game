export const GAMEPLAY_CONFIG = {
  startSpeed: 0.90,
  maxSpeedBonus: 1.65,
  speedRampFrames: 2200,
  distanceScale: 0.20,
  startLives: 3,
  // Reference HUD spec shows a 4-heart panel — maxLives must match that
  // visual capacity or the fifth slot overflows the designed layout.
  maxLives: 4,
  invulnerabilityFrames: 82,
  collect: { laneWindow: 0.55 },
  difficulty: {
    warmupFrames: 1200,
    timeToFullFrames: 6000,
    scoreToFull: 700,
    timeWeight: 0.55,
    scoreWeight: 0.55,
    waveAmplitude: 0.14,
    wavePeriodFrames: 520,
    distanceBands: [
      { untilDistance: 150,     label: 'onboarding',   minBucket: 1, maxBucket: 1 },
      { untilDistance: 400,     label: 'early-medium', minBucket: 1, maxBucket: 3 },
      { untilDistance: 800,     label: 'medium',       minBucket: 2, maxBucket: 4 },
      { untilDistance: 1000000, label: 'hard',         minBucket: 3, maxBucket: 6 },
    ],
  },
  scoreTiers: [50, 100, 175, 280, 420, 600, 850, 1200, 1700, 2400],
  scoreMilestones: [50, 100, 250, 500, 1000, 2000, 5000, 10000],
  hazardScorePenalty: 0,
  distanceScoreEvery: 100,
  combo: {
    graceFrames: 150,
    stepEvery: 5,
    maxMultiplier: 8,
  },
  nearMiss: {
    verticalWindow: 36,
    bonusScore: 3,
    shakeAmount: 4.0,
  },
  // Lane-overlap thresholds for hazard hit detection.
  // laneOverlap (0.56): the original threshold — a hazard counts as "in the
  //   player's lane" when their lane centres are within 0.56 units.  Adjacent
  //   lanes are 1 unit apart, so this creates a 0.12-unit overlap region on
  //   each side — intentional; clones always use this value.
  // laneOverlapWhileChanging (0.28): a SMALLER threshold applied to the PLAYER
  //   only while their FSM state is `laneChanging`, providing a genuine grace
  //   period mid-swap.  Because hit detection is `|playerLaneX - hazardLane| <
  //   threshold`, a smaller value means the player must be further into the
  //   hazard's lane before a hit registers (threshold ≈ 1 − 0.72 = 0.28 maps
  //   to "must be ~3/4 into the hazard's lane"), which is the intended behaviour.
  //   Clones always use the base threshold.
  collision: {
    laneOverlap: 0.56,
    laneOverlapWhileChanging: 0.28,
  },
  localStorageBestKey: 'orchidQuest.bestScore.v1',
  leaderboardKey: 'orchidQuest.leaderboard.v1',
  leaderboardCapacity: 10,
  dyingFrames: 50,
  dyingSpeedScale: 0.25,
  statsKey: 'orchidQuest.stats.v1',
  tutorialSeenKey: 'orchidQuest.tutorial.v1',
  settingsKey: 'orchidQuest.settings.v1',
  achievementsKey: 'orchidQuest.achievements.v1',
  dailyLeaderboardKey: 'orchidQuest.dailyLeaderboard.v1',
};
