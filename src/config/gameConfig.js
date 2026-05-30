import { ASSET_TYPES, LANE_BANDS, SCENE_ZONES } from './sceneSchema.js';

export const GAME_CONFIG = Object.freeze({
  canvas: {
    width: 1536,
    height: 864,
    viewportPadding: 0,
    // Backing-store pixel-ratio multiplier. Default `1` keeps the
    // pixel-art aesthetic on mobile (matches CSS image-rendering: pixelated)
    // AND avoids 4-9× fill on Retina/Hi-DPI screens. Set to `auto` (or
    // pass `?hidpi=1` on the URL) to render at full window.devicePixelRatio
    // — crisper on desktop, much heavier on mobile.
    pixelRatio: 1,
  },

  projection: {
    horizonRatio: 0.33,
    roadVanishOffsetRatio: 0.068,
    // v3.8.3 — perspective overhaul:
    //   groundRatio 0.975 — road reaches bottom of canvas
    //   focal 58       — same dramatic perspective as v3.7.2
    //   laneWidth 214  — playable lane geometry preserved (collision
    //                    + player positions unchanged)
    // Wider visual road comes from roadHalfLaneUnits 1.85 → 2.30 (see
    // below). Vines + overhangs are pinned to ±1.4 by the renderers so
    // they don't grow with the wider visual road.
    groundRatio: 0.975,
    focal: 58,
    laneWidth: 214,
    /**
     * v3.8.7 — visual / gameplay split. `laneWidth` stays as the canonical
     * lane→pixel conversion for the gameplay model. `visualLaneScale`
     * multiplies it for every renderer (road, decor, player, obstacles).
     * Setting < 1 tightens the entire visual scene (longer corridor feel
     * toward the castle); > 1 widens it. Collision math is in lane units
     * and is unaffected. See `Projection.projectVisual()` for the API.
     *
     * 0.86 chosen so the road + decor read as the reference's tight
     * fantasy corridor without compressing the player or obstacles out
     * of useful screen real-estate.
     */
    visualLaneScale: 0.86,
    // v3.7 — explicit zone boundaries in lane units. Math derived from
    // user spec: lane=35 px, divider=1 px, road total 109 px / lane=35 →
    // half-road=1.56 lu (yellow at ±1.5 + small tail), buffer 0.25 lu,
    // decor 1.85 lu (~2× lane width), nature 1.65 lu beyond decor.
    //
    // Zones (numbers are absolute lane units from the road centerline):
    //   ±0…±1.5    = playable corridor (3 lanes, yellow dividers at edges)
    //   ±1.5…±1.6  = road tail (same road colour, post-yellow visual ramp)
    //   ±1.6…±1.85 = buffer / shoulder (tiny flowers + grass only)
    //   ±1.85…±3.7 = decor zone (blocks, mushrooms, fences, large bushes)
    //   ±3.7…±5.4  = nature (trees, hedges)
    //   ±5.4+      = far background (forest treeline, mountains, sky)
    //
    // Lanes stay at -1 / 0 / +1 — collision unchanged.
    // v3.8.3 — wider visual road for the "fans out to bottom" reference
    // feel. roadHalfLaneUnits 1.85 → 2.30 (+24% near-road width). Decor
    // zones shifted outward so blocks sit JUST past the road shoulder
    // instead of inside it; tree zone follows.
    roadHalfLaneUnits: 2.30,      // visual road extent (collisions ignore this)
    bufferOuterLaneUnits: 2.55,   // small flora hugging the road edge
    decorOuterLaneUnits: 3.70,    // blocks / mushrooms / fences
    natureOuterLaneUnits: 4.80,   // trees / hedges
    maxDistance: 420,
  },

  player: {
    minLane: -1,
    maxLane: 1,
    laneLerp: 0.20,
    /**
     * v3.8.6 Tier-2 — lowered 70 → 50 so the smaller farmer (-13%) sits
     * closer to the road surface, leaving the lower foreground band free
     * for decorative cluster props.
     */
    bottomMargin: 50,
    gravity: 0.95,
    jumpVelocity: -16.5,
    jumpHoldBoost: -0.8,
    maxJumpHoldFrames: 10,
    // Input-buffer windows (frames at 60Hz). A tapped action that can't fire
    // immediately (e.g. jump while airborne) stays queued for this many
    // frames; the moment the gate opens (player lands / crouch dwell elapses),
    // the queued action fires automatically. Standard runner game-feel.
    jumpBufferFrames: 6,    // ~100 ms
    crouchBufferFrames: 6,
    crouch: {
      // Tap-to-crouch minimum dwell (frames). Holding ↓/S keeps you crouched
      // past this; releasing earlier still keeps the crouch until this expires
      // so swipe-down on touch produces a usable duck.
      // v3.1: tightened from 26 (≈430 ms) → 14 (≈230 ms) per game-feel audit.
      // 26 felt sluggish in dense overhang sections; 14 still leaves room for
      // the overhang to clear at base speed (overhang lifetime in collision
      // zone ≈ 22 frames at speed=0.9) and the jumpBuffer can take over for
      // chained inputs.
      minHoldFrames: 14,
      // Visual squash (Y scale) applied to the crouch sprite so the silhouette
      // unmistakably reads as ducking — the source art is only mildly lower.
      spriteYScale: 0.78,
    },
  },

  gameplay: {
    startSpeed: 0.90,
    maxSpeedBonus: 1.65,
    speedRampFrames: 2200,
    distanceScale: 0.20,
    startLives: 3,
    maxLives: 5,
    invulnerabilityFrames: 82,
    // v3.1: open-ended tiers. After tier 6 the gameplay difficulty pool
    // saturates but score keeps milestones flowing for late-run dopamine.
    scoreTiers: [50, 100, 175, 280, 420, 600, 850, 1200, 1700, 2400],
    /**
     * v3.4: independent "milestone" thresholds for big celebration
     * popups. Distinct from scoreTiers so we can keep small early
     * milestones (every 50) without conflating them with the difficulty
     * curve. Empty slots are skipped automatically.
     */
    scoreMilestones: [50, 100, 250, 500, 1000, 2000, 5000, 10000],
    // v3.1: hit no longer subtracts score. Life loss is punishment enough;
    // the double-hit reduced combos AND points, which felt punitive.
    hazardScorePenalty: 0,
    // v3.1: baseline score from distance — every N world-units of travel
    // grant +1 score so even poor-collection runs feel rewarded.
    distanceScoreEvery: 100,
    // v3.1: combo system. After collecting an orchid the player has a
    // grace window to keep the streak going; once it lapses (or a hit
    // happens) the multiplier resets. Multiplier caps at maxComboMult.
    combo: {
      graceFrames: 150,        // ~2.5s after last orchid
      stepEvery: 5,            // every 5 orchids → +1 multiplier
      maxMultiplier: 8,
    },
    // v3.1: near-miss tuning. A vine clears via jump or an overhang via
    // crouch is "near" if the player's vertical clearance was ≤ a window.
    nearMiss: {
      verticalWindow: 36,      // px from threshold
      bonusScore: 3,
      shakeAmount: 4.0,
      focalImpulse: 7,
    },
    localStorageBestKey: 'orchidQuest.bestScore.v1',
    leaderboardKey: 'orchidQuest.leaderboard.v1',
    leaderboardCapacity: 10,
    // v3.1: lifetime persistence keys. Aggregate stats across all sessions
    // for retention surfaces (game over screen, future achievement system).
    /**
     * v3.5 dying state: number of frames spent in slow-mo after the final
     * hit before transitioning to 'dead' / showing the score screen.
     * Gives the death its weight — Crossy Road / Subway Surfers do this.
     */
    dyingFrames: 50,
    dyingSpeedScale: 0.25,
    statsKey: 'orchidQuest.stats.v1',
    tutorialSeenKey: 'orchidQuest.tutorial.v1',
    settingsKey: 'orchidQuest.settings.v1',
    achievementsKey: 'orchidQuest.achievements.v1',
    dailyLeaderboardKey: 'orchidQuest.dailyLeaderboard.v1',
  },

  gameFeel: {
    particles: true,
    cameraShake: true,
    ambientMotion: true,
    scorePopups: true,
  },

  debug: {
    allowLocalTools: true,
    allowRemoteTools: false,
    // v3.8.11 — toggled via ?debugAxis=1 URL param in main.js. Renders
    // 5 reference markers in LandmarksRenderer to verify road→door
    // alignment: central axis, road vanish dot, door bottom dot,
    // castle base dot, gateY tick.
    showAxis: false,
    // v3.8.16 — toggled via ?debugSides=1. Draws a label over every
    // side-aware structural prop showing type, side, dx from road
    // centre, and whether the per-side variant or a fallback was used.
    showSides: false,
    // v3.8.17 — toggled via ?debugSideMatrix=1. Replaces dynamic
    // scenery with a 4-cell test grid per side-aware type so a QA
    // observer can pick the visually-correct variant per side.
    showSideMatrix: false,
    // v3.8.24 — toggled via ?debugPlayer=1. Draws the player's visual
    // bounds, foot anchor, collision capsule, and state label over the
    // sprite so size / anchor / state consistency is verifiable at a
    // glance.
    showPlayer: false,
    // v3.8.27 — toggled via ?debugPlayerStates=1. Freezes the world,
    // centres the player, exposes keyboard 1-9 to force RUN / JUMP_*/
    // DUCK / HIT / INVULNERABLE / DEATH / REPLAY, and adds
    // __ORCHID_DEBUG__.capturePlayerStates() to grab dataURLs of every
    // state in one call. Implies showPlayer = true so the overlay
    // labels are visible. Wired in main.js.
    showPlayerStates: false,
    // v3.8.30 — Sprite Lab mode. When on, RenderSystem skips the entire
    // gameplay pipeline (sky / background / landmarks / road / scenery /
    // gameplay / effects) and renders ONLY: neutral background + ground
    // baseline + player (incl. debug overlay). Isolates the farmer for
    // pure pixel-scale QA without noisy scene context.
    // Toggled from the on-screen QA panel.
    spriteLabMode: false,
    // v3.8.30 — Disable full-screen effects. When on, EffectsRenderer
    // skips the power-up vignettes, combo pulse, dying chromatic +
    // REPLAY pill, hit-flash full-screen overlay. Particles, score
    // popups, and the multiplier badge above the player still render.
    // Use for pose QA without losing the farmer to red fade on HIT or
    // dark vignette on DEATH.
    disableFullScreenEffects: false,
    // v3.8.37 — Phase 2 placement enforcement. When OFF (default), the
    // PlacementValidator logs a one-shot console.warn for every
    // assetType that violates a zone or adjacency rule but the spawn
    // still happens. When ON, the validator returns false on violation
    // and the calling system (SpawnSystem / DecorationSystem) skips the
    // spawn. Toggle via ?enforcePlacement=1.
    enforcePlacementRules: false,
    // v3.8.50 — Phase 8 canonical composition overlay. When ON,
    // SceneryRenderer + GameplayRenderer draw a 5-line semantic
    // badge per entity (assetType / role / zone / side / coll+sup).
    // Colour matches the spec scheme:
    //   red    = GAMEPLAY_OBSTACLE
    //   yellow = COLLECTIBLE
    //   green  = BONUS_POWERUP
    //   blue   = SIDE_STRUCTURE / PLATFORM
    //   gray   = SIDE_DECOR_* / ROAD_DECOR / BACKGROUND_ONLY
    //   purple = SUPPORT_FOUNDATION / STACKABLE_TOP
    //   pink   = LANDMARK
    //   orange = no semantic registry entry (INVALID)
    // Toggle via ?debugComposition=1.
    showComposition: false,
    // v3.8.38 — composition filter mode. 'all' (default), 'obstacles',
    // 'pickups', 'decor', 'invalid'. Set via ?compositionFilter=...
    compositionFilter: 'all',
  },

  scene: {
    zones: SCENE_ZONES,
    laneBands: LANE_BANDS,
    assetTypes: ASSET_TYPES,
  },

  powerUps: {
    speedBurst: {
      durationFrames: 360,
      speedMultiplier: 1.58,
    },
    splitClones: {
      durationFrames: 420,
    },
    // v3.1 — three new pickups added to round out the loop:
    //   magnet  — orchids bend toward player from up to magnetRadius units
    //   shield  — first hit during window is absorbed and consumed
    //   scoreX2 — every score gain (orchid + distance baseline) doubled
    magnet: {
      durationFrames: 480,    // 8s
      radius: 1.7,            // lane units of pull radius
      pullStrength: 0.12,     // lane-distance per frame at max pull
    },
    shield: {
      durationFrames: 600,    // 10s, but consumed on first hit
      hits: 1,
    },
    scoreX2: {
      durationFrames: 480,    // 8s
      multiplier: 2,
    },
  },

  spawn: {
    obstacleStartDistance: 92,
    flowerStartDistance: 34,
    // v3.8.6 Tier-2 — pulled even closer (was 4 → now 2). With the
    // SHOULDER close-fade floor raised to 0.55 in SceneryRenderer the
    // bottom-corner props are now actually visible at distance 2-4 instead
    // of vanishing to alpha 0.
    decorStartDistance: 2,
    // v3.8.3 — denser side environment. Decor now lives outside the
    // wider road (lanes 2.4-3.5) where it doesn't crowd gameplay, so
    // bring spacing back down 48 → 30 to actually populate the visible
    // corridor. Reference image shows continuous side props — current
    // empty fields were the consequence of v3.8.1 over-sparsing.
    // v3.8.6 Tier-2 — tightened further 22 → 18 to flood the corridor.
    // Combined with the +7 new cluster prefabs (pipe-with-flowers,
    // pipe-mushroom-platform, dense-platform-trio, fence-bush-corner,
    // brick-corridor-segment, qblock-floating-cluster, wall-and-mushroom),
    // every spawn slot now lands a richly-composed group instead of a
    // single prop. 18 is about as dense as it can go before adjacent
    // clusters start to z-fight at mid depth.
    sideDecorSpacing: 18.0,
    sideDecorJitter: 0.45,
    sideDecorNearCullDistance: -5.5,
    lifePickupMinDistance: 940,
    lifePickupMaxDistance: 1480,
    powerUpMinDistance: 780,
    powerUpMaxDistance: 1220,
    // v3.1: rare blue orchid — high-value collectible to add a "hunt"
    // dimension to each run. Worth 25 base score (before combo / x2).
    rareOrchidMinDistance: 1800,
    rareOrchidMaxDistance: 3600,
    rareOrchidBaseScore: 25,
  },

  assets: {
    // Collectibles and small flora
    collectibleFlower: './assets/collectibles/flower-golden-orchid.png',
    flowerPurpleCluster: './assets/collectibles/flower-purple-cluster.png',
    flowerYellowSmall: './assets/collectibles/flower-yellow-small.png',
    lifeHeart: './assets/collectibles/life-heart.png',
    sprout: './assets/collectibles/sprout.png',

    // Layered static/parallax background — new E assets
    backgroundSkyGradient: './assets/background/sky/sky_gradient.png',
    backgroundSun: './assets/background/sun-glow.png',
    backgroundCastle: './assets/background/castle-distant.png',
    backgroundCastleFar: './assets/background/castle/castle_far.png',
    backgroundCloudLarge: './assets/background/clouds/cloud_large.png',
    backgroundCloudMedium: './assets/background/clouds/cloud_medium.png',
    backgroundCloudSmall: './assets/background/clouds/cloud_small.png',
    backgroundMountainsFar: './assets/background/mountains/mountains_far.png',
    backgroundMountainsMid: './assets/background/mountains/mountains_mid.png',
    backgroundMountainsNear: './assets/background/mountains/mountains-near.png',
    backgroundForestFar: './assets/background/forest/forest_far.png',
    backgroundForestTreeline: './assets/background/landscape/forest-treeline.png',
    backgroundMeadowRolling: './assets/background/landscape/meadow-rolling.png',
    // Legacy individual cloud frames (kept as fallback pool)
    backgroundCloud01: './assets/background/clouds/cloud-01.png',
    backgroundCloud02: './assets/background/clouds/cloud-02.png',
    backgroundCloud03: './assets/background/clouds/cloud-03.png',
    backgroundCloud04: './assets/background/clouds/cloud-04.png',
    backgroundCloud05: './assets/background/clouds/cloud-05.png',
    backgroundCloud06: './assets/background/clouds/cloud-06.png',
    // Environment props
    cloudLarge: './assets/environment/cloud-large.png',
    mushroomRed: './assets/environment/mushroom-red.png',
    mushroomPurple: './assets/environment/mushroom-purple.png',
    mushroomBlue: './assets/environment/mushroom-blue.png',
    treeRound: './assets/environment/tree-round.png',
    leafClusterLow: './assets/environment/leaf-cluster-low.png',
    leafClusterCompact: './assets/environment/leaf-cluster-compact.png',
    grassTuft: './assets/environment/grass-tuft.png',
    dryGrass: './assets/environment/dry-grass.png',
    fenceWoodShort: './assets/environment/fence-wood-short.png',
    wheatTuft: './assets/environment/wheat-tuft.png',

    // Blocks and obstacles
    questionBlock: './assets/blocks/question-block-yellow.png',
    brickPurpleSingle: './assets/blocks/brick-purple-single.png',
    brickPurplePlatform3: './assets/blocks/brick-purple-platform-3.png',
    pipeGreen: './assets/blocks/pipe-green.png',
    vineCoiled: './assets/blocks/vine-coiled.png',
    bushSpiky: './assets/blocks/bush-spiky.png',

    // Structures (new high-quality sprites)
    purpleBrick01: './assets/structures/bricks/purple_brick_01.png',
    purplePlatformRow04: './assets/structures/platforms/purple_platform_row_04.png',
    hangingPlatformVines: './assets/structures/platforms/hanging_platform_vines.png',
    purpleWallLow: './assets/structures/walls/purple_wall_low.png',
    purpleWallStairs: './assets/structures/walls/purple_wall_stairs.png',
    questionBlockSprite: './assets/structures/question_block/question_block.png',
    pipeGreenSprite: './assets/structures/pipe/green_pipe.png',

    // Large decor (new high-quality sprites)
    mushroomRedBig: './assets/decor_large/mushrooms/mushroom_red_big.png',
    treeRoundSprite: './assets/decor_large/trees/tree_round.png',
    fenceWoodSprite: './assets/decor_large/fence/fence_wood_short.png',
    bushLarge: './assets/decor_large/bushes/bush_large.png',
    bushLargeFlower: './assets/decor_large/bushes/bush_large_with_purple_flowers.png',

    // Small decor (new high-quality sprites)
    purpleFlowerCluster: './assets/decor_small/flowers/purple_flower_cluster.png',
    yellowFlowerSmall: './assets/decor_small/flowers/yellow_flower_small.png',
    grassTuftSmall: './assets/decor_small/grass/grass_tuft_small.png',
    grassTuftLarge: './assets/decor_small/grass/grass_tuft_large.png',
    leafClumpRound: './assets/decor_small/bushes/leaf_clump_round.png',
    bushWithFlowers: './assets/decor_small/bushes/bush_with_purple_flowers.png',
    sproutSoil: './assets/decor_small/plants/sprout_soil.png',

    // Overhead obstacles — player must crouch to pass under these
    lowBranchOverhang: './assets/obstacles/overhangs/low_branch_overhang.png',
    spiderWebOverhang: './assets/obstacles/overhangs/spider_web_overhang.png',

    // Player sprite (8-frame run cycle)
    playerFarmerRun01: './assets/player/farmer_run/player_farmer_run_01.png',
    playerFarmerRun02: './assets/player/farmer_run/player_farmer_run_02.png',
    playerFarmerRun03: './assets/player/farmer_run/player_farmer_run_03.png',
    playerFarmerRun04: './assets/player/farmer_run/player_farmer_run_04.png',
    playerFarmerRun05: './assets/player/farmer_run/player_farmer_run_05.png',
    playerFarmerRun06: './assets/player/farmer_run/player_farmer_run_06.png',
    playerFarmerRun07: './assets/player/farmer_run/player_farmer_run_07.png',
    playerFarmerRun08: './assets/player/farmer_run/player_farmer_run_08.png',

    // Player sprite (4-frame crouch-run cycle)
    playerFarmerCrouch01: './assets/player/farmer_crouch/player_farmer_crouch_01.png',
    playerFarmerCrouch02: './assets/player/farmer_crouch/player_farmer_crouch_02.png',
    playerFarmerCrouch03: './assets/player/farmer_crouch/player_farmer_crouch_03.png',
    playerFarmerCrouch04: './assets/player/farmer_crouch/player_farmer_crouch_04.png',

    // UI — buttons
    uiPauseButton: './assets/ui/buttons/pause_button.png',
    uiPlayButton: './assets/ui/buttons/play_button.png',

    // UI — icons
    uiHeartFull: './assets/ui/icons/heart_full.png',
    uiHeartEmpty: './assets/ui/icons/heart_empty.png',
    uiEnergyFull: './assets/ui/icons/energy_segment_full.png',
    uiEnergyEmpty: './assets/ui/icons/energy_segment_empty.png',
    uiFlowerIcon: './assets/ui/icons/flower_currency_icon.png',

    // UI — panels
    // v3.8.48 — removed uiScorePanel and uiPanelLongBlue: both files
    // are SHA-256 identical to lives_panel_bg.png (Group #15 in the
    // duplicate cleanup proposal). No src/ consumer for either key.
    // The duplicate PNGs are archived to _source/rejected_2026_05_30/.
    uiLivesPanel: './assets/ui/panels/lives_panel_bg.png',
    uiToolPanel: './assets/ui/panels/tool_panel_bg.png',

    // UI — tools
    uiShovelFull: './assets/ui/tools/shovel_full.png',
    uiShovelBlade: './assets/ui/tools/shovel_blade.png',
    uiShovelHandle: './assets/ui/tools/shovel_handle.png',

    // Pickup sprites
    goldenFlowerBig: './assets/pickups/golden_flower/golden_flower_big.png',
    goldenFlowerSmall: './assets/pickups/golden_flower/golden_flower_small.png',

    // Obstacle sprites
    vineBarrierFull: './assets/obstacles/vines/vine_barrier_full.png',
    dryGrassObstacle: './assets/obstacles/dry_grass/dry_grass_obstacle.png',
    mushroomSmallRed: './assets/obstacles/mushrooms/mushroom_small_red.png',

    // Legacy road tiles — restored after the kit was added. These now
    // back the "tiles" road-style mode (RoadRenderer.#imageTileGrid)
    // and the shoulder + yellow-divider passes. File extension changed
    // from SVG → PNG; same content.
    roadLaneTileA: './assets/terrain/road/lane_tiles/road_lane_left.png',
    roadLaneTileB: './assets/terrain/road/lane_tiles/road_lane_center.png',
    roadLaneTileC: './assets/terrain/road/lane_tiles/road_lane_right.png',
    roadDividerYellow: './assets/terrain/road/dividers/road_divider_yellow.png',
    roadShoulderLeftGrass: './assets/terrain/road/shoulders/road_shoulder_left.png',
    roadShoulderRightGrass: './assets/terrain/road/shoulders/road_shoulder_right.png',

    // Road kit (v2) — third "kit" mode. 14 hand-crafted PNGs.
    // See docs/road-kit-brief.md for the full designer spec.
    roadKitForegroundLeft:       './assets/terrain/road/kit/road_foreground_left.png',
    roadKitForegroundCenter:     './assets/terrain/road/kit/road_foreground_center.png',
    roadKitForegroundRight:      './assets/terrain/road/kit/road_foreground_right.png',
    roadKitMidLeft:              './assets/terrain/road/kit/road_mid_left.png',
    roadKitMidCenter:            './assets/terrain/road/kit/road_mid_center.png',
    roadKitMidRight:             './assets/terrain/road/kit/road_mid_right.png',
    roadKitFarStrip:             './assets/terrain/road/kit/road_far_strip.png',
    roadKitShoulderInnerLeft:    './assets/terrain/road/kit/shoulder_inner_left.png',
    roadKitShoulderInnerRight:   './assets/terrain/road/kit/shoulder_inner_right.png',
    roadKitLaneDividerLeftCenter:  './assets/terrain/road/kit/lane_divider_left_center.png',
    roadKitLaneDividerCenterRight: './assets/terrain/road/kit/lane_divider_center_right.png',
    roadKitEdgeFlowerPatch01:    './assets/terrain/road/kit/road_edge_flower_patch_01.png',
    roadKitEdgeGrassPatch01:     './assets/terrain/road/kit/road_edge_grass_patch_01.png',
    roadKitEdgeDarkPatch01:      './assets/terrain/road/kit/road_edge_dark_patch_01.png',

    // ═══════════════════════════════════════════════════════════════════════
    //  v3 REFRESH — registered ahead of designer delivery.
    //  All keys below point at the paths designer will write PNGs into per
    //  docs/designer-asset-brief.md. Until the files land, AssetManager
    //  silently records `null` and renderers fall back to legacy art via
    //  the dual-key lookup pattern (see PlayerRenderer / SceneryRenderer /
    //  EffectsRenderer). When the artist ships a batch, the matching
    //  legacy keys can be deleted from this file (cleanup steps in
    //  docs/developer-integration-guide.md § 2.4).
    // ═══════════════════════════════════════════════════════════════════════

    // ── Player — new states (jump 6f, hit 4f, idle 4f) ───────────────────
    playerFarmerJump01: './assets/player/farmer_jump/player_farmer_jump_01.png',
    playerFarmerJump02: './assets/player/farmer_jump/player_farmer_jump_02.png',
    playerFarmerJump03: './assets/player/farmer_jump/player_farmer_jump_03.png',
    playerFarmerJump04: './assets/player/farmer_jump/player_farmer_jump_04.png',
    playerFarmerJump05: './assets/player/farmer_jump/player_farmer_jump_05.png',
    playerFarmerJump06: './assets/player/farmer_jump/player_farmer_jump_06.png',
    playerFarmerHit01: './assets/player/farmer_hit/player_farmer_hit_01.png',
    playerFarmerHit02: './assets/player/farmer_hit/player_farmer_hit_02.png',
    playerFarmerHit03: './assets/player/farmer_hit/player_farmer_hit_03.png',
    playerFarmerHit04: './assets/player/farmer_hit/player_farmer_hit_04.png',
    playerFarmerIdle01: './assets/player/farmer_idle/player_farmer_idle_01.png',
    playerFarmerIdle02: './assets/player/farmer_idle/player_farmer_idle_02.png',
    playerFarmerIdle03: './assets/player/farmer_idle/player_farmer_idle_03.png',
    playerFarmerIdle04: './assets/player/farmer_idle/player_farmer_idle_04.png',

    // ── Collectible — golden orchid + halo + sparkle + collect burst ─────
    orchidGoldMain:      './assets/collectibles/orchid_gold/orchid_gold_main.png',
    orchidGoldBig:       './assets/collectibles/orchid_gold/orchid_gold_big.png',
    orchidGoldHalo:      './assets/collectibles/orchid_gold/orchid_gold_halo.png',
    // v3.6 designer-delivered alt collectible sprites (gold/ folder).
    // emblem = flat icon for HUD; glow = halo fallback; star = bonus spark.
    orchidGoldEmblem:    './assets/collectibles/gold/gold_flower_emblem_01.png',
    orchidGoldGlow1:     './assets/collectibles/gold/gold_flower_glow_01.png',
    orchidGoldGlow2:     './assets/collectibles/gold/gold_flower_glow_02.png',
    orchidGoldStar:      './assets/collectibles/gold/gold_star_01.png',
    // v3.1: rare blue orchid — high-value pickup (~25 base score). Designer
    // delivers a single high-detail PNG; renderer auto-scales by depth.
    // v3.8.47 — Phase 7f engine bridge. Previous paths expected nested
    // `orchid_blue_rare/` folder; designer shipped the files flat under
    // `collectibles/` (rare top-level) and beside the orchid_blue
    // sequence (halo). Pointing the keys at the on-disk locations is
    // a one-line fix vs asking designer to relocate two files.
    orchidBlueRare:      './assets/collectibles/orchid_blue_rare.png',
    orchidBlueRareHalo:  './assets/collectibles/orchid_blue/orchid_blue_rare_halo.png',
    orchidGoldSparkle01: './assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png',
    orchidGoldSparkle02: './assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png',
    orchidGoldSparkle03: './assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png',
    orchidGoldSparkle04: './assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png',
    // v3.8.48 — removed orchidGoldCollect01: SHA-256 identical to
    // orchid_gold_main.png (Group #3 in the duplicate cleanup
    // proposal). No src/ consumer for any orchidGoldCollect key.
    // The duplicate PNG is archived to _source/rejected_2026_05_30/.
    orchidGoldCollect02: './assets/collectibles/orchid_gold/orchid_gold_collect_02.png',
    orchidGoldCollect03: './assets/collectibles/orchid_gold/orchid_gold_collect_03.png',
    orchidGoldCollect04: './assets/collectibles/orchid_gold/orchid_gold_collect_04.png',
    orchidGoldCollect05: './assets/collectibles/orchid_gold/orchid_gold_collect_05.png',
    orchidGoldCollect06: './assets/collectibles/orchid_gold/orchid_gold_collect_06.png',
    orchidGoldCollect07: './assets/collectibles/orchid_gold/orchid_gold_collect_07.png',
    orchidGoldCollect08: './assets/collectibles/orchid_gold/orchid_gold_collect_08.png',

    // v3.6 designer-delivered new decor variants under /decor (separate
    // from legacy decor_small/decor_large hierarchies).
    decorBranchFlowers01: './assets/decor/branches/decorative_branch_flowers_01.png',
    decorBushBright01:    './assets/decor/bush_bright_small_01.png',
    decorBushFlower01:    './assets/decor/bush_flower_small_01.png',
    decorGrassMedium01:   './assets/decor/grass_tuft_medium_01.png',
    decorGrassSmall01:    './assets/decor/grass_tuft_small_01.png',
    decorLeafClump01:     './assets/decor/leaf_clump_small_01.png',
    // v3.6 designer-delivered terrain block variants (alt path under
    // terrain/blocks/ alongside the legacy grass_block_* set).
    grassDirtBlock01:        './assets/terrain/blocks/grass_dirt_block_01.png',
    grassDirtBlock02:        './assets/terrain/blocks/grass_dirt_block_02.png',
    grassDirtBlockFlower01:  './assets/terrain/blocks/grass_dirt_block_flower_01.png',
    grassDirtBlockFlower02:  './assets/terrain/blocks/grass_dirt_block_flower_02.png',
    // v3.8.15 — designer-delivered per-side 3/4-view block variants.
    // Lit consistently with the global sun (upper-right), so the LEFT
    // variant has its right face lit (facing the road), and the RIGHT
    // variant has its left face lit. Selecting per side at dispatch
    // time avoids the canvas mirror-flip that reversed lighting.
    grassDirtBlockLeft:      './assets/terrain/blocks/grass_dirt_block_left.png',
    grassDirtBlockRight:     './assets/terrain/blocks/grass_dirt_block_right.png',
    grassDirtPlatformLong2:  './assets/terrain/blocks/grass_dirt_platform_long.png',
    grassDirtStepLeft:       './assets/terrain/blocks/grass_dirt_step_left.png',
    // v3.6 designer-delivered dry bush obstacle (alt path).
    dryBushObstacle:         './assets/obstacles/bushes/dry_bush_01.png',

    // ── Obstacles — animated vine, planter_pot (replaces pipe) ───────────
    vineBarrier01:       './assets/obstacles/vine_barrier/vine_barrier_01.png',
    vineBarrier02:       './assets/obstacles/vine_barrier/vine_barrier_02.png',
    vineBarrier03:       './assets/obstacles/vine_barrier/vine_barrier_03.png',
    vineBarrier04:       './assets/obstacles/vine_barrier/vine_barrier_04.png',
    vineBarrierSingle01: './assets/obstacles/vine_barrier/vine_barrier_single_01.png',
    vineBarrierSingle02: './assets/obstacles/vine_barrier/vine_barrier_single_02.png',
    vineBarrierSingle03: './assets/obstacles/vine_barrier/vine_barrier_single_03.png',
    vineBarrierSingle04: './assets/obstacles/vine_barrier/vine_barrier_single_04.png',
    planterPot:          './assets/obstacles/planter_pot/planter_pot.png',
    // v3.8.34 — Golden Rule P1 pair. Designer delivered the _left /
    // _right variants alongside the stone_brick batch. SIDE_MAPPING_
    // BY_TYPE default is 'swapped' (visible-face convention) to match.
    planterPotLeft:      './assets/obstacles/planter_pot/planter_pot_left.png',
    planterPotRight:     './assets/obstacles/planter_pot/planter_pot_right.png',

    // ── Structures — animated question block, stone (replaces purple) ────
    questionBlockAnim01:  './assets/structures/question_block/question_block_01.png',
    questionBlockAnim02:  './assets/structures/question_block/question_block_02.png',
    questionBlockAnim03:  './assets/structures/question_block/question_block_03.png',
    questionBlockAnim04:  './assets/structures/question_block/question_block_04.png',
    questionBlockBonus:   './assets/structures/question_block/question_block_bonus.png',
    stoneBrickSingle:     './assets/structures/stone_brick/stone_brick_single.png',
    stoneWallLow:         './assets/structures/stone_brick/stone_wall_low.png',
    stoneWallStairs:      './assets/structures/stone_brick/stone_wall_stairs.png',
    // v3.8.34 — Golden Rule P1 pair completion. Designer delivered the
    // _left / _right variants matching the existing v3.8.27 batch
    // (visible-face / SWAPPED convention — see sceneryDispatch.js).
    // Mapping defaults to 'swapped' in SIDE_MAPPING_BY_TYPE so the
    // engine picks the correct file per shoulder.
    stoneBrickSingleLeft:  './assets/structures/stone_brick/stone_brick_single_left.png',
    stoneBrickSingleRight: './assets/structures/stone_brick/stone_brick_single_right.png',
    stoneWallLowLeft:      './assets/structures/stone_brick/stone_wall_low_left.png',
    stoneWallLowRight:     './assets/structures/stone_brick/stone_wall_low_right.png',
    stoneWallStairsLeft:   './assets/structures/stone_brick/stone_wall_stairs_left.png',
    stoneWallStairsRight:  './assets/structures/stone_brick/stone_wall_stairs_right.png',
    platformFloating:     './assets/structures/platforms/platform_floating.png',
    // v3.8.15 — designer-delivered per-side platform variants.
    platformFloatingLeft:  './assets/structures/platforms/platform_floating_left.png',
    platformFloatingRight: './assets/structures/platforms/platform_floating_right.png',
    platformHangingVines: './assets/structures/platforms/platform_hanging_vines.png',
    // v3.6 designer-delivered alternates.
    fenceWebbed:          './assets/structures/fences/wooden_fence_webbed_01.png',
    grassDirtPlatformLong:'./assets/structures/platforms/grass_dirt_platform_long.png',
    goldQuestionBlock01:  './assets/blocks/question/gold_question_block_01.png',
    goldQuestionBlock02:  './assets/blocks/question/gold_question_block_02.png',

    // ── Background — greenhouse (replaces castle), midground LOD ─────────
    greenhouseFar:       './assets/background/greenhouse/greenhouse_far.png',
    greenhouseMid:       './assets/background/greenhouse/greenhouse_mid.png',
    greenhouseNear:      './assets/background/greenhouse/greenhouse_near.png',
    midgroundHills:      './assets/background/midground/rolling_hills.png',
    midgroundTreeline:   './assets/background/midground/treeline_far.png',
    // v3.6 designer-delivered alternates (top-level filenames). Used as
    // preferred-key fallbacks in renderers; legacy /clouds/ /mountains/
    // subdirs remain as backups.
    cloudLargeAlt:       './assets/background/cloud_large_01.png',
    cloudMediumAlt:      './assets/background/cloud_medium_01.png',
    cloudSmallAlt:       './assets/background/cloud_small_01.png',
    mountainsFarAlt:     './assets/background/mountains_far_01.png',
    castleFarAlt:        './assets/background/castle_far_01.png',

    // ── Effects (NEW category) — sprite-based particles + overlays ───────
    dustPuff01:    './assets/effects/dust_puff/dust_puff_01.png',
    dustPuff02:    './assets/effects/dust_puff/dust_puff_02.png',
    dustPuff03:    './assets/effects/dust_puff/dust_puff_03.png',
    dustPuff04:    './assets/effects/dust_puff/dust_puff_04.png',
    jumpDust01:    './assets/effects/jump_dust/jump_dust_01.png',
    jumpDust02:    './assets/effects/jump_dust/jump_dust_02.png',
    jumpDust03:    './assets/effects/jump_dust/jump_dust_03.png',
    jumpDust04:    './assets/effects/jump_dust/jump_dust_04.png',
    sparkle01:     './assets/effects/sparkle/sparkle_01.png',
    sparkle02:     './assets/effects/sparkle/sparkle_02.png',
    sparkle03:     './assets/effects/sparkle/sparkle_03.png',
    sparkle04:     './assets/effects/sparkle/sparkle_04.png',
    speedLine:     './assets/effects/speed_line/speed_line.png',
    hitFlash01:    './assets/effects/hit_flash/hit_flash_01.png',
    hitFlash02:    './assets/effects/hit_flash/hit_flash_02.png',
    hitFlash03:    './assets/effects/hit_flash/hit_flash_03.png',
    hitFlash04:    './assets/effects/hit_flash/hit_flash_04.png',
    laneSwoosh01:  './assets/effects/lane_swoosh/lane_swoosh_01.png',
    laneSwoosh02:  './assets/effects/lane_swoosh/lane_swoosh_02.png',
    laneSwoosh03:  './assets/effects/lane_swoosh/lane_swoosh_03.png',
    laneSwoosh04:  './assets/effects/lane_swoosh/lane_swoosh_04.png',
    collectBurst01: './assets/effects/collect_burst/collect_burst_01.png',
    collectBurst02: './assets/effects/collect_burst/collect_burst_02.png',
    collectBurst03: './assets/effects/collect_burst/collect_burst_03.png',
    collectBurst04: './assets/effects/collect_burst/collect_burst_04.png',
    collectBurst05: './assets/effects/collect_burst/collect_burst_05.png',
    collectBurst06: './assets/effects/collect_burst/collect_burst_06.png',
    collectBurst07: './assets/effects/collect_burst/collect_burst_07.png',
    collectBurst08: './assets/effects/collect_burst/collect_burst_08.png',
    // v3.6 designer-delivered single-frame fallbacks for the effect sheets.
    // Renderers prefer the framed versions above; when the artist ships
    // them in batch, drop these aliases or repoint to the new sheet.
    collectOrchidBurstSingle:  './assets/effects/collect_orchid_burst.png',
    goldenFlowerBurstSingle:   './assets/effects/golden_flower_burst.png',
    goldenFlowerSparkleSingle: './assets/effects/golden_flower_sparkle.png',
    dustPuffSingle:            './assets/effects/dust_puff_small.png',
    hitSparkSingle:            './assets/effects/hit_spark.png',
    goldSparkSingle:           './assets/effects/gold/gold_spark_01.png',

    // ── Pickup sprites — new v3.1 power-ups ──────────────────────────────
    // v3.8.47 — Phase 7f engine bridge. Designer shipped the three
    // power-up icons as `assets/pickups/pickup_<feature>.png` (flat).
    // The previous nested-folder paths produced PATH_MISMATCH dead
    // keys. Updating the keys is safer than moving the files (no
    // directory churn, no risk to other tooling).
    pickupMagnet:     './assets/pickups/pickup_magnet.png',
    pickupShield:     './assets/pickups/pickup_shield.png',
    pickupScoreX2:    './assets/pickups/pickup_score_x2.png',
    // v3.6 designer-delivered misc props re-purposed as power-up icons /
    // bonus decor. Renderers consult the canonical pickupX key first and
    // fall back to these when the v3 sheets aren't shipped.
    miscShieldSign:   './assets/misc/sign_wooden_shield.png',   // ← Shield
    miscHourglass:    './assets/misc/artifact_hourglass.png',   // ← x2 Score
    miscPotionEmerald:'./assets/misc/potion_emerald.png',       // ← Magnet (green pull)
    miscSpikeBall:    './assets/misc/spike_ball.png',           // ← Speed Burst alt
    miscChestWooden:  './assets/misc/chest_wooden.png',         // ← bonus crate
    miscHeartRed:     './assets/misc/heart_red.png',            // ← life pickup alt
    miscCoinSingle:   './assets/misc/coin_gold_single.png',     // ← orchid alt icon
    miscCoinStack:    './assets/misc/coin_gold_stack.png',
    miscBarrelWooden: './assets/misc/barrel_wooden.png',
    miscCampfire:     './assets/misc/campfire.png',

    // ── HUD / UI — wooden plank panels + buttons + combo + orchid icon ───
    hudPanelScore:      './assets/ui/panels/hud_panel_score.png',
    hudPanelLives:      './assets/ui/panels/hud_panel_lives.png',
    hudPanelTool:       './assets/ui/panels/hud_panel_tool.png',
    hudPanelLong:       './assets/ui/panels/hud_panel_long.png',
    panelGameOver:      './assets/ui/panels/panel_game_over.png',
    iconOrchidCurrency: './assets/ui/icons/icon_orchid_currency.png',
    // v3.8.47 — Phase 7f. Removed three iconComboX2/X3/X5 keys: the
    // combo HUD migrated to a procedural badge in EffectsRenderer (the
    // ×N popup above the player) v3.8.25, leaving these icon PNGs
    // dead. No src/ consumer remained — audit flagged them DEPRECATED.
    buttonRetry:        './assets/ui/buttons/button_retry.png',
    buttonMenuBack:     './assets/ui/buttons/button_menu_back.png',
    // v3.8 designer delivery — HUD pixel icons, multiplier banners,
    // button variants, currency icons, status indicators, shovel pieces.
    iconHeartFull:      './assets/ui/icons/icon_heart_full.png',
    iconHeartEmpty:     './assets/ui/icons/icon_heart_empty.png',
    iconEnergyFull:     './assets/ui/icons/icon_energy_full.png',
    iconEnergyEmpty:    './assets/ui/icons/icon_energy_empty.png',
    buttonPauseAlt:     './assets/ui/buttons/button_pause.png',
    buttonPlay:         './assets/ui/buttons/ui_button_play.png',
    buttonRestart:      './assets/ui/buttons/ui_button_restart.png',
    currencyFlowerBasic:'./assets/ui/currency/ui_flower_icon_basic.png',
    currencyFlowerGold: './assets/ui/currency/ui_flower_icon_gold.png',
    multiplierX2:       './assets/ui/multipliers/ui_multiplier_x2.png',
    multiplierX3:       './assets/ui/multipliers/ui_multiplier_x3.png',
    multiplierX5Banner: './assets/ui/multipliers/ui_multiplier_x5_banner.png',
    statusBatteryGreen: './assets/ui/status/ui_battery_green.png',
    statusHeartEmpty:   './assets/ui/status/ui_heart_empty_dark.png',
    statusHeartRed1:    './assets/ui/status/ui_heart_red_01.png',
    statusHeartRed2:    './assets/ui/status/ui_heart_red_02.png',
    toolShovelFullAlt:  './assets/ui/tools/tool_shovel_full.png',
    toolShovelBladeAlt: './assets/ui/tools/tool_shovel_blade.png',
    toolShovelHandleAlt:'./assets/ui/tools/tool_shovel_handle.png',
    // v3.8 — life_heart alt path (designer used underscore filename).
    lifeHeartAlt:       './assets/collectibles/life_heart.png',
  },
});
