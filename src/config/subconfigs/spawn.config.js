export const SPAWN_CONFIG = {
  obstacleStartDistance: 92,
  flowerStartDistance: 34,
  decorStartDistance: 2,
  sideDecorSpacing: 11.0,
  sideDecorJitter: 0.45,
  sideDecorNearCullDistance: -5.5,
  sideDecorHeroMaxGap: 16,
  scatterSpacing: 3.2,
  scatterPatchSpacing: 9.2,
  scatterPatchBands: 2,
  scatterPatchBandSpacing: 1.35,
  scatterClusterLaneRadius: 0.22,
  scatterPerBand: 6,
  scatterLaneRange: [1.34, 1.90],
  scatterMaxDistance: 120,
  scatterMeadowFraction: 0.60,
  lifePickupMinDistance: 940,
  lifePickupMaxDistance: 1480,
  powerUpMinDistance: 780,
  powerUpMaxDistance: 1220,
  rareOrchidMinDistance: 1800,
  rareOrchidMaxDistance: 3600,
  rareOrchidBaseScore: 25,

  // ── Pickup chance curves ─────────────────────────────────────────────────────
  //
  // lifePickupBaseChance  — probability to spawn a life when the cadence fires,
  //   before missing-life compensation. 0.55 by default.
  // lifePickupMissingLifeBonus — added per life the player is below startLives.
  //   E.g. if startLives = 3 and the player has 1 life, +0.40 is added.
  //   Fairness: hurt players see hearts sooner.
  // lifePickupMaxChance — hard ceiling so it never becomes a certainty. 0.95.
  // lifePickupHighChance — probability that a validated life pickup is placed
  //   at high offset (requires validator.isCollectible to confirm reachability).
  // lifePickupRetryDistance — short cadence re-roll when the chance draw fails
  //   or validation rejects the placement. ~180 units.
  //
  // powerUpBaseChance — probability to spawn a power-up when the cadence fires.
  //   Roughly flat; rare enough to feel special. 0.85 by default.
  // powerUpRetryDistance — short re-roll cadence on failure. ~200 units.
  //
  // powerUpTypes / powerUpWeights — the weighted table (previously inline in
  //   SpawnSystem #tickPowerUp). Centralised here so tweaking one file is enough.
  lifePickupBaseChance: 0.55,
  lifePickupMissingLifeBonus: 0.20,
  lifePickupMaxChance: 0.95,
  lifePickupHighChance: 0.20,
  lifePickupRetryDistance: 180,

  powerUpBaseChance: 0.85,
  powerUpRetryDistance: 200,

  // power-tree (speed) w=4, power-mushroom (split) w=3,
  // power-magnet w=3, power-shield w=3, power-double (x2) w=3  — total 16
  powerUpTypes:   ['power-tree', 'power-mushroom', 'power-magnet', 'power-shield', 'power-double'],
  powerUpWeights: [4, 3, 3, 3, 3],

  density: {
    centerTrailYieldsToFigures: true,
    orchidFillerYieldsToFigures: true,
    figureWindow: 4,
    orchidTickMaxIntensity: 0.35,
  },

  // ── Orchid-filler pattern tuning ─────────────────────────────────────────────
  //
  // orchidPattern weights (line/zigzag/arc/step) — thresholds over rng.next()
  // [0,1). Values form cumulative buckets: line < zigzag < arc, rest = step.
  orchidLineThreshold:   0.40,
  orchidZigzagThreshold: 0.60,
  orchidArcThreshold:    0.80,

  // Per-filler-pattern inter-flower distance (world units). Each sub-pattern
  // has its own "feel": arc and step are wider-spaced reads, line the tightest.
  orchidArcSpacing:     12,
  orchidStepSpacing:    13,
  orchidLineSpacing:    14,
  orchidZigzagSpacing:  10,

  // Probability that an orchid line spawns its flowers at high (jump) offset.
  // 0.26 ≈ one-in-four lines: enough variety without demanding constant jumps.
  orchidLineHighChance: 0.26,

  // Direction-pick probability for filler patterns: 50/50 left-vs-right sweep.
  // Separate keys so each pattern can be biased independently.
  orchidArcRightChance:    0.5,
  orchidZigzagRightChance: 0.5,
  orchidStepRightChance:   0.5,

  // ── Rare-orchid pickup tuning ─────────────────────────────────────────────────
  //
  // rareOrchidDistanceOffset — placed this many units past projection.maxDistance
  // so it enters from just below the horizon rather than exactly at the edge.
  rareOrchidDistanceOffset: 10,

  // rareOrchidHighChance — 50% of rare orchids are elevated (high=true),
  // requiring a jump from a clear path. Adds hunt variety.
  rareOrchidHighChance: 0.5,

  // rareOrchidPatternGuard — minimum advance for nextPattern after a rare spawn,
  // ensuring the rare orchid has a clear window before the next obstacle pattern.
  rareOrchidPatternGuard: 28,

  // ── Spawn-cursor tuning ───────────────────────────────────────────────────────
  //
  // All values lifted from SpawnSystem inline literals — one definition here,
  // consumed at the call sites.  Zero behavior change.
  tuning: {
    // ── Cursors — reset() initial values ────────────────────────────────────
    // nextPattern start: first procedural obstacle fires ~44 world-units in
    // on a cold reset (no prepopulate).
    resetNextPattern: 44,
    // nextOrchid start: first filler orchid fires ~22 world-units in.
    resetNextOrchid: 22,

    // ── Prepopulate cursors ──────────────────────────────────────────────────
    // nextPattern after prepopulate: procedural patterns start ~60 units
    // into the run so they don't collide with the opening hero cycle.
    prepopulateNextPattern: 60,
    // nextOrchid after prepopulate: hero cycles carry the first orchid duty;
    // the filler cadence resumes at 200 so it doesn't double-pile early.
    prepopulateNextOrchid: 200,

    // ── Power-up / life cursor early-start multipliers ───────────────────────
    // On reset(), nextPowerUp is seeded at [powerUpMin × lo, powerUpMax × hi]
    // so power-ups arrive earlier in the first run than the full cadence would.
    powerUpEarlyLo: 0.55,
    powerUpEarlyHi: 0.75,
    // Rare orchid is seeded at [rareMin × factor, rareMax × factor] so the
    // first rare also arrives ahead of its full cadence distance.
    rareOrchidEarlyFactor: 0.6,

    // ── Reward-trail offsets (hero-road + procedural vine/overhang beats) ────
    // Three flowers placed this many units BEFORE the vine/overhang entry cue.
    rewardApproachOffsets: [26, 18, 10],
    // One flower placed this many units AFTER the vine/overhang (exit reward).
    rewardExitOffset: 8,

    // ── Jump-obstacle telegraph offsets (hero-road 'jump-obstacle' entry) ────
    // Two flowers placed before the ground hazard at these offsets (negative =
    // before the obstacle distance), guiding the player into the hazard lane.
    jumpObstacleTelegraphFar: -16,
    jumpObstacleTelegraphNear: -9,

    // ── Orchid cadence guards (after vine / overhang) ────────────────────────
    // nextOrchid floor after a vine pattern — holds the filler back so the
    // vine approach + exit trail has breathing room before the next orchid line.
    orchidAfterVine: 68,
    // nextOrchid floor when there is no vine in the current pattern.
    orchidAfterNoVine: 30,

    // ── Post-vine pattern spacing ─────────────────────────────────────────────
    // nextPattern minimum after a vine pattern. 96 → 140 in v3.8.8 so a
    // subsequent obstacle doesn't enter the visible field during vine recovery.
    postVinePatternSpacing: 140,

    // ── Cross-seam neighbor margin (world units) ─────────────────────────────
    // Window around the current pattern's obstacle span searched for neighbor
    // hazards already reserved on the road. Scaled by speed at the call site.
    crossSeamMargin: 60,

    // ── Hero-entry hero-road flower spacings ─────────────────────────────────
    // Per-flower distance increments inside hero-road entry sub-patterns.
    // flower-arc: each successive flower is 7 world-units further.
    heroFlowerArcSpacing: 7,
    // flower-zigzag: each successive flower is 8 world-units further.
    heroFlowerZigzagSpacing: 8,
    // reward-cluster: each successive flower is 4 world-units further.
    heroRewardClusterSpacing: 4,
    // reward-cluster lane jitter: alternate flowers nudge this far off-center
    // so the cluster doesn't read as a perfect vertical column.
    heroRewardClusterJitter: 0.12,

    // ── Orchid-line count bounds ──────────────────────────────────────────────
    // rng.integer(lo, hi) range for the number of flowers in an orchid line.
    orchidLineCountLo: 2,
    orchidLineCountHi: 3,

    // ── Pattern guard after life / power-up spawn ─────────────────────────────
    // Minimum nextPattern advance applied when a life pickup successfully
    // spawns, preventing the next obstacle pattern from colliding with the
    // heart window.
    lifePatternGuard: 32,
    // Same guard applied after a power-up successfully spawns.
    powerUpPatternGuard: 40,
  },
};
