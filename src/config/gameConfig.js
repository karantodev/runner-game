import { ASSET_TYPES, LANE_BANDS, SCENE_ZONES } from './sceneSchema.js';

export const GAME_CONFIG = Object.freeze({
  canvas: {
    width: 1536,
    height: 864,
    viewportPadding: 0,
  },

  projection: {
    horizonRatio: 0.33,
    roadVanishOffsetRatio: 0.068,
    groundRatio: 0.975,
    focal: 68,
    laneWidth: 214,
    roadHalfLaneUnits: 2.32,
    maxDistance: 420,
  },

  player: {
    minLane: -1,
    maxLane: 1,
    laneLerp: 0.20,
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
      minHoldFrames: 26,
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
    scoreTiers: [50, 100, 150],
    hazardScorePenalty: 5,
    localStorageBestKey: 'orchidQuest.bestScore.v1',
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
  },

  spawn: {
    obstacleStartDistance: 92,
    flowerStartDistance: 34,
    decorStartDistance: 12,
    sideDecorSpacing: 5.65,
    sideDecorJitter: 0.95,
    sideDecorNearCullDistance: -5.5,
    lifePickupMinDistance: 940,
    lifePickupMaxDistance: 1480,
    powerUpMinDistance: 780,
    powerUpMaxDistance: 1220,
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
    uiScorePanel: './assets/ui/panels/score_panel_bg.png',
    uiLivesPanel: './assets/ui/panels/lives_panel_bg.png',
    uiToolPanel: './assets/ui/panels/tool_panel_bg.png',
    uiPanelLongBlue: './assets/ui/panels/panel_long_blue.png',

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

    // Terrain blocks (direct keys)
    grassBlockCube01: './assets/terrain/blocks/grass_block_cube_01.png',
    grassBlockCube02: './assets/terrain/blocks/grass_block_cube_02.png',
    grassBlockFrontRect: './assets/terrain/blocks/grass_block_front_rect.png',
    grassBlockColumnTall: './assets/terrain/blocks/grass_block_column_tall.png',

    // Terrain modules
    terrainBlockLeftFlower: './assets/terrain/blocks/grass_block_cube_01.png',
    terrainBlockFront: './assets/terrain/blocks/grass_block_front_rect.png',
    terrainBlockRightFlower: './assets/terrain/blocks/grass_block_cube_02.png',
    terrainStepLeft: './assets/terrain/blocks/grass_block_cube_02.png',
    terrainPlatformSmall: './assets/terrain/blocks/grass_block_front_rect.png',
    terrainPlatformLong: './assets/terrain/blocks/grass_block_front_rect.png',
    terrainWallTallFlower: './assets/terrain/blocks/grass_block_column_tall.png',
    roadLaneTileA: './assets/terrain/road/lane_tiles/road_lane_left.svg',
    roadLaneTileB: './assets/terrain/road/lane_tiles/road_lane_center.svg',
    roadLaneTileC: './assets/terrain/road/lane_tiles/road_lane_right.svg',
    roadDividerYellow: './assets/terrain/road/dividers/road_divider_yellow.svg',
    roadShoulderLeftGrass: './assets/terrain/road/shoulders/road_shoulder_left.svg',
    roadShoulderRightGrass: './assets/terrain/road/shoulders/road_shoulder_right.svg',
  },
});
