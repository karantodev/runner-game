import { createCollectible, createObstacle } from '../ecs/factories.js';
import { HERO_ROAD_CYCLE_LENGTH, HERO_ROAD_SEQUENCE } from '../config/sceneSchema.data.js';
// v4.2 — P2 reference-match: import the three hero cycle templates so each
// stamp can rotate to a different rhythm, eliminating autopilot repetition.
import { HERO_ROAD_CYCLES } from './spawn/heroCycles.data.js';
import { DifficultyDirector } from './spawn/DifficultyDirector.js';
import { PatternLibrary } from './spawn/PatternLibrary.js';
import { PathValidator } from './spawn/PathValidator.js';
import { RoadSpawnLedger } from './spawn/RoadSpawnLedger.js';

const SPAWN_LOG_CAPACITY = 24;
const LANE_TRIPLET = Object.freeze([-1, 0, 1]);

/**
 * v3.8.37 — mirrors of factories.js' type→assetType maps. Used by the
 * placement-validation wrappers below so we can compute the assetType
 * BEFORE delegating to the factory (the factory does its own resolution
 * but the validator needs it up front to consult ASSET_SEMANTICS).
 * Keep in sync with `OBSTACLE_DEFAULT_ASSET` / `COLLECTIBLE_DEFAULT_ASSET`
 * in src/ecs/factories.js.
 */
const OBSTACLE_DEFAULT_ASSET_MIRROR = {
  vine: 'vine_barrier',
  bush: 'spiky_bush_obstacle',
  wheat: 'dry_grass_obstacle',
  wall: 'purple_brick_single',
  mushroom: 'small_center_mushroom',
  stone: 'stone_obstacle',
  overhang: 'low_branch_overhang',
};
const COLLECTIBLE_DEFAULT_ASSET_MIRROR = {
  life: 'heart_full',
  'power-tree': 'speed_tree_pickup',
  'power-mushroom': 'power_mushroom_pickup',
  'power-magnet': 'power_magnet_pickup',
  'power-shield': 'power_shield_pickup',
  'power-double': 'power_double_pickup',
  'rare-orchid': 'rare_orchid_pickup',
  flower: 'golden_flower',
};

export class SpawnSystem {
  /**
   * @param {object} config
   * @param {import('../world/Projection.js').Projection} projection
   * @param {import('../utils/rng.js').Rng} rng — shared world RNG
   */
  constructor(config, projection, rng, skill = null, placement = null) {
    this.config = config;
    this.projection = projection;
    this.rng = rng;
    this.director = new DifficultyDirector(rng, skill);
    this.library = new PatternLibrary(rng);
    this.validator = new PathValidator(config);
    this.roadLedger = new RoadSpawnLedger();
    // v3.8.37 — Phase 2 placement enforcement. Optional so legacy
    // unit-test paths constructing SpawnSystem standalone don't break.
    this.placement = placement;
    this.spawnLog = []; // ring-buffer exposed to the debug API
    this.reset();
  }

  /**
   * v3.8.37 — central validation wrapper. Routes through
   * world.placement when present; otherwise allows the spawn.
   */
  #allowed(assetType, ctx) {
    if (!this.placement) return true;
    return this.placement.shouldSpawn(assetType, ctx);
  }

  /**
   * v3.8.37 — placement-validated wrappers around the ECS factories.
   * SpawnSystem callsites use these instead of createObstacle /
   * createCollectible directly so adjacency + zone rules apply
   * uniformly to every spawn (hero cycle + procedural ticks).
   */
  #spawnObstacle(world, opts) {
    const assetType = opts.assetType ?? OBSTACLE_DEFAULT_ASSET_MIRROR[opts.type] ?? 'stone_obstacle';
    const worldDistance = world.worldDistanceTotal ?? 0;
    const absoluteDistance = opts.absoluteDistance
      ?? (worldDistance + opts.distance);
    if (!this.#allowed(assetType, { zone: 'road', distance: absoluteDistance })) return null;
    if (!this.roadLedger.reserveObstacle({
      ...opts,
      distance: absoluteDistance,
    })) return null;
    const { absoluteDistance: _absoluteDistance, sourceId: _sourceId, ...factoryOpts } = opts;
    return createObstacle(world.registry, {
      ...factoryOpts,
      distance: absoluteDistance - worldDistance,
    });
  }
  #spawnCollectible(world, opts) {
    const assetType = opts.assetType ?? COLLECTIBLE_DEFAULT_ASSET_MIRROR[opts.type] ?? 'golden_flower';
    const worldDistance = world.worldDistanceTotal ?? 0;
    const absoluteDistance = opts.absoluteDistance
      ?? (worldDistance + opts.distance);
    if (!this.#allowed(assetType, { zone: 'road', distance: absoluteDistance })) return null;
    const reservation = this.roadLedger.reserveCollectible({
      ...opts,
      distance: absoluteDistance,
    });
    if (!reservation) return null;
    const { absoluteDistance: _absoluteDistance, sourceId: _sourceId, ...factoryOpts } = opts;
    const entity = createCollectible(world.registry, {
      ...factoryOpts,
      distance: absoluteDistance - worldDistance,
    });
    this.roadLedger.attachCollectible(reservation, entity);
    return entity;
  }

  reset() {
    /**
     * v3.5: keep the last difficulty snapshot so PerformanceHUD can
     * display it without re-calling director.get(), which would consume
     * seeded RNG state and break deterministic-replay tests.
     */
    this.lastDifficulty = null;
    const tuning = this.config.spawn.tuning;
    this.nextPattern = tuning.resetNextPattern;
    this.nextOrchid = tuning.resetNextOrchid;
    this.nextLife = this.rng.range(this.config.spawn.lifePickupMinDistance, this.config.spawn.lifePickupMaxDistance);
    this.nextPowerUp = this.rng.range(
      this.config.spawn.powerUpMinDistance * tuning.powerUpEarlyLo,
      this.config.spawn.powerUpMaxDistance * tuning.powerUpEarlyHi,
    );
    // v3.1: rare blue orchid spawns rarely as a "hunt" target.
    this.nextRare = this.rng.range(
      this.config.spawn.rareOrchidMinDistance * tuning.rareOrchidEarlyFactor,
      this.config.spawn.rareOrchidMaxDistance * tuning.rareOrchidEarlyFactor,
    );
    // v3.8.23 — origin of the NEXT hero-road cycle to stamp. Bumped by
    // CYCLE_LENGTH every time a cycle goes off-camera so the rhythm is
    // continuous.
    this.heroCycleOrigin = 0;

    // v4.2 — P2 reference-match: tracks which of the three HERO_ROAD_CYCLES
    // templates is stamped next. Incremented per stamp so the player never
    // sees the same 105-unit rhythm back-to-back.
    this._heroCycleIndex = 0;

    // v4.0 — center-trail breadcrumb cursor. Tracks the next world-distance
    // at which a center-lane orchid should be emitted. Initialised to 0
    // so the very first frame can fill the visible corridor.
    this._centerTrailNext = 0;
    this._patternSerial = 0;
    // Debug metrics for the cross-seam fairness check (observe over-rejection).
    this._patternPicks = 0;
    this._crossSeamRejects = 0;
    this.roadLedger.reset();
    this.spawnLog.length = 0;
  }

  /**
   * v3.8.23 — REPEATING hero road rhythm.
   *
   * Pre-stamps 4 cycles of HERO_ROAD_SEQUENCE so the visible window
   * (~120 worldspace units) is full from frame 1, and the next cycle
   * is already past the horizon ready to slide in. Procedural cursors
   * are pushed out — heroes carry the rhythm; procedural patterns
   * add ambient noise much later.
   */
  prepopulate(world) {
    const cycles = 4;  // covers projection.maxDistance (~420)
    // v4.2 — P2 reference-match: reset cycle index so every run starts at
    // Template A (familiar opening), then rotates through B and C.
    this._heroCycleIndex = 0;
    for (let i = 0; i < cycles; i += 1) {
      this.#stampHeroCycle(world, i * HERO_ROAD_CYCLE_LENGTH, i === 0);
    }
    this.heroCycleOrigin = cycles * HERO_ROAD_CYCLE_LENGTH;
    // Procedural patterns kept on the legacy cadence (fires ~60 travel
    // units in) so they add ambient extras between hero beats. Hero
    // cycle is the BASELINE; procedural is variation.
    const tuning = this.config.spawn.tuning;
    this.nextPattern = tuning.prepopulateNextPattern;
    this.nextOrchid  = tuning.prepopulateNextOrchid;  // orchid duty carried by hero cycles

    // v4.0 — fill the visible corridor with the center breadcrumb trail
    // on startup so the player immediately sees the leading line of orchids.
    // #fillCenterTrail caps each call at runLength flowers, so loop until
    // the cursor reaches the spawn horizon — guarantees a full line on
    // frame 1 (the per-frame top-up in update() only matters thereafter).
    const startHorizon = this.projection.maxDistance;
    let guard = 0;
    while (this._centerTrailNext < startHorizon && guard < 200) {
      this.#fillCenterTrail(world, this._centerTrailNext, startHorizon);
      guard += 1;
    }
  }

  /**
   * Stamp one hero-road cycle at the given origin distance.
   *
   * v3.8.35 — `firstCycle` skips all-lane vines in the opening cycle so
   * the player doesn't see perspective-stacked vines before first input.
   * The vine slot is replaced with a flower-arc; vines kick in on cycle 2
   * (distance ≥ HERO_ROAD_CYCLE_LENGTH) when the player knows the controls.
   *
   * v4.2 — P2 reference-match: selects from HERO_ROAD_CYCLES[_heroCycleIndex
   * % 3] so the three templates rotate A → B → C → A, preventing the player
   * from memorising one fixed sequence. _heroCycleIndex is incremented after
   * each stamp.
   *
   * v4.2 — P2 reference-match: FIX 5 — also pushes nextPattern out by at
   * least HERO_ROAD_CYCLE_LENGTH / 2 so procedural patterns cannot
   * double-stack a second vine into the hero window.
   */
  #stampHeroCycle(world, originDistance, firstCycle = false) {
    const sourceId = `hero:${originDistance}`;
    // v4.2 — P2 reference-match: FIX 5 — first hazard guard. The very
    // first stamp originates at distance 0; ensure no obstacle from the
    // hero sequence fires before obstacleStartDistance (≈92 from config).
    const startGuard = firstCycle
      ? (this.config.spawn.obstacleStartDistance ?? 92)
      : 0;

    // v4.2 — P2 reference-match: rotate templates so each stamp uses a
    // different cycle rhythm.
    const sequence = HERO_ROAD_CYCLES[this._heroCycleIndex % HERO_ROAD_CYCLES.length];
    this._heroCycleIndex += 1;

    for (const entry of sequence) {
      const absoluteDist = originDistance + entry.offsetInCycle;

      if (firstCycle) {
        // v3.8.35 — vines replaced by flower-arc on the opening cycle so
        // the player doesn't face a perspective-stacked wall of vines.
        if (entry.kind === 'vine-with-rewards') {
          this.#spawnHeroRoadEntry(world, {
            kind: 'flower-arc',
            fromLane: -1,
            toLane: 1,
            count: 5,
            distance: absoluteDist,
            sourceId,
          });
          continue;
        }

        // v4.2 — P2 reference-match: FIX 5 — any ground hazard whose
        // absolute position falls before obstacleStartDistance is replaced
        // with a reward cluster so the opening run has time to breathe.
        const isGroundHazard = entry.kind === 'jump-obstacle'
          || entry.kind === 'overhang-duck';
        if (isGroundHazard && absoluteDist < startGuard) {
          this.#spawnHeroRoadEntry(world, {
            kind: 'reward-cluster',
            lane: 0,
            count: 3,
            distance: absoluteDist,
            sourceId,
          });
          continue;
        }
      }

      this.#spawnHeroRoadEntry(world, {
        ...entry,
        distance: absoluteDist,
        sourceId,
      });
    }
  }

  /** Dispatcher for HERO_ROAD_LAYOUT entries. */
  #spawnHeroRoadEntry(world, entry) {
    const dist = entry.distance - (world.worldDistanceTotal ?? 0);
    const sourceId = entry.sourceId;
    switch (entry.kind) {
      case 'flower-line': {
        const count = entry.count ?? 3;
        const spacing = entry.spacing ?? 6;
        for (let i = 0; i < count; i += 1) {
          this.#spawnCollectible(world, {
            type: 'flower', lane: entry.lane ?? 0,
            distance: dist + i * spacing, high: false, sourceId,
          });
        }
        return;
      }
      case 'flower-arc': {
        const count = entry.count ?? 4;
        const from = entry.fromLane;
        const to = entry.toLane;
        const arcSpacing = this.config.spawn.tuning.heroFlowerArcSpacing;
        for (let i = 0; i < count; i += 1) {
          const t = i / (count - 1);
          const lane = from + t * (to - from);
          this.#spawnCollectible(world, {
            type: 'flower', lane,
            distance: dist + i * arcSpacing, high: false, sourceId,
          });
        }
        return;
      }
      case 'flower-zigzag': {
        const zigzagSpacing = this.config.spawn.tuning.heroFlowerZigzagSpacing;
        entry.lanes.forEach((lane, i) => {
          this.#spawnCollectible(world, {
            type: 'flower', lane,
            distance: dist + i * zigzagSpacing, high: false, sourceId,
          });
        });
        return;
      }
      case 'reward-cluster': {
        // Dense cluster of N orchids spread tight at one lane — the
        // visible reward after an obstacle. Spread 3 units depth per
        // orchid + slight lane jitter via lane index parity so it
        // doesn't read as a perfect column.
        const count = entry.count ?? 4;
        const lane = entry.lane ?? 0;
        const clusterSpacing = this.config.spawn.tuning.heroRewardClusterSpacing;
        const clusterJitter = this.config.spawn.tuning.heroRewardClusterJitter;
        for (let i = 0; i < count; i += 1) {
          const laneJitter = (i % 2 === 0) ? 0 : clusterJitter;
          this.#spawnCollectible(world, {
            type: 'flower', lane: lane + laneJitter,
            distance: dist + i * clusterSpacing, high: false, sourceId,
          });
        }
        return;
      }
      case 'jump-obstacle': {
        const hazardLane = entry.lane ?? 0;
        // v4.2 — P2 reference-match: telegraph two flowers in the SAME lane
        // ≈16 and ≈9 units ahead of the obstacle (mirroring the vine approach
        // trail) so the player is guided to the hazard lane before they must
        // react. Keeps solvability: flowers mark the jump path, not a wall.
        this.#spawnCollectible(world, {
          type: 'flower', lane: hazardLane,
          distance: dist + this.config.spawn.tuning.jumpObstacleTelegraphFar, high: false, sourceId,
        });
        this.#spawnCollectible(world, {
          type: 'flower', lane: hazardLane,
          distance: dist + this.config.spawn.tuning.jumpObstacleTelegraphNear, high: false, sourceId,
        });
        this.#spawnObstacle(world, {
          type: 'wheat', lane: hazardLane,
          distance: dist, sourceId,
        });
        return;
      }
      case 'overhang-duck': {
        // v4.2 — P2 reference-match: Template C duck beat. Spawn an overhang
        // (allLanes) and emit the same approach-trail + exit-reward pattern
        // used by vine-with-rewards so the duck cue is readable.
        this.#spawnObstacle(world, {
          type: 'overhang',
          assetType: 'low_branch_overhang',
          distance: dist,
          allLanes: true,
          sourceId,
        });
        // Approach: 3 flowers before the overhang (same offsets as vine).
        this.config.spawn.tuning.rewardApproachOffsets.forEach((offset) => {
          this.#spawnCollectible(world, {
            type: 'flower', lane: 0,
            distance: dist - offset, high: false, sourceId,
          });
        });
        // Exit: one flower after the player clears the duck window.
        this.#spawnCollectible(world, {
          type: 'flower', lane: 0,
          distance: dist + this.config.spawn.tuning.rewardExitOffset, high: false, sourceId,
        });
        return;
      }
      case 'vine-with-rewards': {
        const lane = entry.lane ?? 0;
        this.#spawnObstacle(world, {
          type: 'vine', lane, distance: dist,
          allLanes: true, sourceId,
        });
        this.#spawnRewardApproach(world, dist, lane, sourceId);
        this.#spawnRewardExit(world, dist, lane, sourceId);
        return;
      }
      default:
        // unknown kind — silently skip
    }
  }

  update(world, delta) {
    if (world.state !== 'playing') return;
    const travel = world.speed * delta;
    const worldDistance = world.worldDistanceTotal ?? 0;
    this.roadLedger.advance(worldDistance);
    this.nextPattern -= travel;
    this.nextOrchid  -= travel;
    this.nextLife    -= travel;
    this.nextPowerUp -= travel;
    this.nextRare    -= travel;

    // v3.8.23 — keep the hero cycle ahead of the player. Compare the
    // next cycle's origin to the player's monotonic road distance.
    // Stamp hero content before procedural content so it owns its
    // authored rhythm when two producers would otherwise overlap.
    while (this.heroCycleOrigin - worldDistance < this.projection.maxDistance) {
      this.#stampHeroCycle(world, this.heroCycleOrigin);
      this.heroCycleOrigin += HERO_ROAD_CYCLE_LENGTH;
      // v4.2 — P2 reference-match: FIX 5 coordination — push nextPattern
      // out so procedural patterns cannot inject a second vine into the hero
      // cycle window. Half a cycle is the minimum safe gap.
      this.nextPattern = Math.max(this.nextPattern, HERO_ROAD_CYCLE_LENGTH / 2);
    }

    if (this.nextPattern <= 0) this.#tickPattern(world);
    if (this.nextOrchid <= 0) this.#tickOrchid(world);
    if (this.nextLife <= 0) this.#tickLife(world);
    if (this.nextPowerUp <= 0) this.#tickPowerUp(world);
    if (this.nextRare <= 0) this.#tickRare(world);

    // v4.0 — continuously extend the center breadcrumb trail so it always
    // reaches the spawn horizon. _centerTrailNext is a world-distance
    // absolute value; spawn ahead of the current scroll horizon.
    const horizon = worldDistance + this.projection.maxDistance;
    // v4.2 — P2 reference-match: FIX 4 — changed if → while so a high
    // player speed that outruns the per-call runLength cap still fills
    // the full horizon in one update tick rather than leaving gaps.
    while (this._centerTrailNext < horizon) {
      this.#fillCenterTrail(world, this._centerTrailNext, horizon);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /**
   * v4.0 — center breadcrumb trail.
   *
   * Emits a straight line of golden orchids on lane 0 from `fromDist` to
   * `toDist` at fixed world-distance intervals (spacing from config).
   * Advances `_centerTrailNext` so subsequent calls never duplicate.
   *
   * Design intent:
   *   - Visual "conveyor belt" of gold — leads the player's eye toward the
   *     horizon, exactly as in the reference (breadcrumb line).
   *   - Only fires when GAME_CONFIG.visual.collectibles.centerTrail.enabled.
   *   - runLength throttle: emits at most `runLength` flowers per call so
   *     we never flood the registry in one tick.
   *   - Skips obstacle windows and duplicate collectible slots through the
   *     shared road ledger. PathValidator is not involved because center
   *     orchids do not affect solvability.
   *   - Determinism: no RNG consumed — step is constant — so replay is safe.
   */
  #fillCenterTrail(world, fromDist, toDist) {
    const trailCfg = world.config?.visual?.collectibles?.centerTrail;
    if (!trailCfg?.enabled) {
      // Still advance cursor so we don't loop forever when disabled.
      this._centerTrailNext = toDist;
      return;
    }
    const spacing   = trailCfg.spacing   ?? 7;
    const runLength = trailCfg.runLength  ?? 6;

    // Align start to next grid step from fromDist.
    let cursor = Math.ceil(fromDist / spacing) * spacing;
    let emitted = 0;

    const density = world.config?.spawn?.density;
    const yieldToFigures = density?.centerTrailYieldsToFigures ?? false;
    const figureWindow = density?.figureWindow ?? 4;
    while (cursor <= toDist && emitted < runLength) {
      // Skip a breadcrumb dot when a hero-cycle/pattern flower already fills this
      // window so the center line opens up around figures instead of clumping.
      const busy = yieldToFigures && this.roadLedger.collectibleDensityAround(cursor, 0, figureWindow) > 0;
      if (!busy) {
        this.#spawnCollectible(world, {
          type: 'flower',
          lane: 0,
          distance: cursor - (world.worldDistanceTotal ?? 0),
          absoluteDistance: cursor,
          sourceId: 'center-trail',
          high: false,
        });
      }
      cursor += spacing;
      emitted += 1;
    }
    // Advance to where the next call should start (even if runLength capped us).
    this._centerTrailNext = cursor;
  }

  #tickPattern(world) {
    const diff = this.director.get(world);
    this.lastDifficulty = diff;
    const snap = world.powerUpSystem.snapshot();
    const sourceId = `pattern:${this._patternSerial++}`;
    const baseDistance = this.projection.maxDistance;
    const absoluteBaseDistance = (world.worldDistanceTotal ?? 0) + baseDistance;

    let pattern;
    if (snap.splitClonesActive) {
      pattern = this.library.pickSplitBonus();
    } else {
      // v4.22 — Milestone 4: pick from `diff.bucket` (distance-band-gated) so the
      // eligible difficulty is governed by DISTANCE first, time+score second.
      // Speed-burst still caps the pick at 2 so a burst never throws a hard
      // pattern at the accelerated player.
      const libraryLevel = Math.min(6, snap.speedBurstActive ? Math.min(diff.bucket, 2) : diff.bucket);
      pattern = this.library.pick(libraryLevel);
      this._patternPicks += 1;
      // Reject if the pattern is unsolvable on its own OR forms an unclearable
      // seam with the hero/earlier-pattern obstacles already on the road.
      const isolatedOk = this.validator.isSolvable(pattern, { speed: world.speed });
      if (!isolatedOk || !this.#isSolvableWithNeighbors(world, pattern, absoluteBaseDistance)) {
        if (isolatedOk) this._crossSeamRejects += 1; // seam-specific rejection (debug metric)
        pattern = this.library.pickFallback();
      } else if (diff.bucket >= 2 && !this.validator.survivesOneHit(pattern, { speed: world.speed })) {
        // One-hit-recovery gate for difficulty bucket 2+. Tutorial bucket (1)
        // passes trivially — its patterns are designed to be learned by dying.
        // Bucket 2+ patterns that fail this gate are caught by the safe-fallback;
        // their authored ids are listed in the task risks for human review.
        pattern = this.library.pickFallback();
      }
    }

    if (!this.roadLedger.canReservePattern(pattern.items, absoluteBaseDistance, sourceId)) {
      pattern = this.library.pickFallback();
    }

    this.#spawnPattern(world, pattern, baseDistance, sourceId);
    this.#logSpawn(pattern, diff, world);

    const hasVine = pattern.items.some(i => i.kind === 'obstacle' && i.type === 'vine');
    if (hasVine) {
      // v3.8.4 — visual reward lane that LEADS into the vine, signalling
      // "jump here". Three orchids placed at increasing height ahead of
      // the vine in the same lane it will land in. After the vine we
      // also drop a continuation trail so the player sees the reward
      // exit. Uses the pattern's mid lane (or center) for placement.
      const vineLane = this.#patternVineLane(pattern) ?? 0;
      this.#spawnRewardApproach(world, baseDistance, vineLane, sourceId);
      this.#spawnRewardExit(world, baseDistance, vineLane, sourceId);
    }
    const tuning = this.config.spawn.tuning;
    this.nextOrchid = Math.max(this.nextOrchid, hasVine ? tuning.orchidAfterVine : tuning.orchidAfterNoVine);
    // v3.8.8 Tier-3 — post-vine spacing 96 → 140 so the next obstacle
    // doesn't enter the visible field until the player is well past
    // the vine landing. User reported two vines still reading as a
    // "double barrier" at 96 distance-units of separation.
    const minSpacing = hasVine ? tuning.postVinePatternSpacing : diff.patternSpacing;
    this.nextPattern = Math.max(diff.patternSpacing, minSpacing);
  }

  /**
   * Cross-seam fairness: the per-pattern validator only sees ONE pattern, but a
   * just-spawned pattern shares the road with hero-cycle and earlier procedural
   * obstacles. Merge this pattern's obstacles with the neighbours already
   * reserved in a speed-scaled window and run the full lane simulation over the
   * union, so a hero hazard followed by a pattern hazard can't force an
   * impossible double-switch that the gap heuristic alone would allow.
   *
   * RNG-neutral (pure filter + simulation) — does not perturb the seeded stream.
   */
  #isSolvableWithNeighbors(world, pattern, absoluteBaseDistance) {
    const obstacleOffsets = pattern.items
      .filter((i) => i.kind === 'obstacle')
      .map((i) => i.offset);
    if (obstacleOffsets.length === 0) return true; // collectible-only pattern

    // Window scales with speed: at higher speed a jump / lane-switch reaches
    // further, so obstacles further out can still interact across the seam.
    const margin = this.config.spawn.tuning.crossSeamMargin * Math.max(1, world.speed / this.config.gameplay.startSpeed);
    const from = absoluteBaseDistance + Math.min(...obstacleOffsets) - margin;
    const to = absoluteBaseDistance + Math.max(...obstacleOffsets) + margin;

    const neighbors = this.roadLedger.obstaclesInSpan(from, to);
    if (neighbors.length === 0) return true; // isolated — per-pattern check suffices

    const merged = {
      items: [
        ...neighbors.map((o) => ({
          kind: 'obstacle', type: o.type, lane: o.lane, allLanes: o.allLanes,
          offset: o.distance - absoluteBaseDistance,
        })),
        ...pattern.items.filter((i) => i.kind === 'obstacle'),
      ],
    };
    return this.validator.isSolvable(merged, { speed: world.speed });
  }

  /** Read the lane the vine sits in (or 0 if it spans all lanes). */
  #patternVineLane(pattern) {
    const vine = pattern.items.find(i => i.kind === 'obstacle' && i.type === 'vine');
    return vine && !vine.allLanes ? (vine.lane ?? 0) : 0;
  }

  /**
   * "Approach trail" — 3 orchids in the lane the vine will land in,
   * at increasing height so the visual path slopes up to a jump cue.
   * Distances: rewardApproachOffsets BEFORE the vine.
   */
  #spawnRewardApproach(world, vineDist, lane, sourceId = 'reward') {
    this.config.spawn.tuning.rewardApproachOffsets.forEach((offset) => {
      this.#spawnCollectible(world, {
        type: 'flower',
        lane,
        distance: vineDist - offset,
        sourceId,
        high: false,
      });
    });
  }

  /**
   * "Exit trail" — a single orchid right after the vine in the same
   * lane, so the player sees their landing rewarded.
   */
  #spawnRewardExit(world, vineDist, lane, sourceId = 'reward') {
    this.#spawnCollectible(world, {
      type: 'flower',
      lane,
      distance: vineDist + this.config.spawn.tuning.rewardExitOffset,
      sourceId,
      high: false,
    });
  }

  #tickOrchid(world) {
    const diff = this.director.get(world);
    // v4.x — the orchid filler is the THIRD flower producer. Hero cycles + the
    // center trail already saturate the lane at speed, so let this one fire only
    // in low-intensity rest windows; otherwise it just rebuilds the gold blob.
    // Cadence still advances so it resumes naturally during the next breather.
    const maxIntensity = this.config.spawn.density?.orchidTickMaxIntensity ?? 0.35;
    if (diff.intensity <= maxIntensity) {
      this.#spawnOrchidPattern(world, this.projection.maxDistance);
    }
    this.nextOrchid = diff.orchidSpacing;
  }

  /**
   * Life-pickup tick — difficulty-driven, pattern-validated.
   *
   * Flow:
   *   1. Ask DifficultyDirector for lifePickupChance; draw from seeded RNG.
   *      On miss, reschedule with the short retry distance and return.
   *   2. Roll a lane via the existing lane-mirroring draw.
   *   3. Build a shifted view of LIFE_PICKUP_SPECIAL at that lane.
   *   4. Merge neighbor obstacles (same helper as #tickPattern) and require:
   *        a) isSolvable  — the shifted pattern must be clearable, AND
   *        b) isCollectible — the life item must be reachable.
   *   5. If validation fails, try the mirrored lane (flip sign).
   *      If that also fails, defer with the retry distance.
   *   6. On success, spawn via #spawnPattern with the validated laneShift.
   */
  #tickLife(world) {
    const diff = this.director.get(world);
    const retryDist = this.config.spawn.lifePickupRetryDistance ?? 180;

    // Chance gate — draw from seeded RNG. Failing here is intentional; it
    // avoids over-spawning hearts when the player is at full health.
    if (!this.rng.chance(diff.lifePickupChance)) {
      this.nextLife = retryDist;
      return;
    }

    const baseDistance = this.projection.maxDistance;
    const absoluteBaseDistance = (world.worldDistanceTotal ?? 0) + baseDistance;

    // Lane roll — mirrors the existing lane-mirroring pattern used by #tickRare.
    const laneRoll = this.rng.choice(LANE_TRIPLET); // -1, 0, or +1

    // High-pickup: apply only when validated reachability confirms it.
    // The rng draw happens here unconditionally so the seeded stream is stable
    // regardless of the validation outcome.
    const wantsHigh = this.rng.chance(this.config.spawn.lifePickupHighChance ?? 0.20);

    const pattern = this.library.pickLifePickup();

    // Find the life item in the pattern to validate its exact position.
    const lifeItem = pattern.items.find(i => i.kind === 'flower' && i.collectible === 'life');

    const tryLane = (laneShift) => {
      // Build the shifted view.  Items whose shifted lane falls outside [-1,+1]
      // are NOT clamped here — #spawnPattern will skip them at spawn time.
      // The validator treats an out-of-range lane as trivially dodgeable (no
      // reachable lane equals the obstacle lane), so the shifted pattern is
      // still a valid input; isSolvable reflects the actual playable geometry.
      const shiftedPattern = {
        ...pattern,
        items: pattern.items.map(i => ({ ...i, lane: (i.lane ?? 0) + laneShift })),
      };
      if (!this.validator.isSolvable(shiftedPattern, { speed: world.speed })) return false;
      if (!this.#isSolvableWithNeighbors(world, shiftedPattern, absoluteBaseDistance)) return false;

      // Validate that the life pickup itself is reachable.
      if (lifeItem) {
        const pickupLane  = (lifeItem.lane ?? 0) + laneShift;
        const pickupOffset = lifeItem.offset;
        // Only attempt high placement when the validator confirms reachability.
        const useHigh = wantsHigh && this.validator.isCollectible(
          shiftedPattern,
          { lane: pickupLane, offset: pickupOffset, high: true },
          { speed: world.speed },
        );
        if (!this.validator.isCollectible(
          shiftedPattern,
          { lane: pickupLane, offset: pickupOffset, high: false },
          { speed: world.speed },
        )) return false;

        // Spawn with confirmed laneShift and resolved high flag.
        const sourceId = `life:${this._patternSerial++}`;
        this.#spawnPattern(world, {
          ...pattern,
          items: pattern.items.map(i =>
            (i.kind === 'flower' && i.collectible === 'life')
              ? { ...i, high: useHigh }
              : i,
          ),
        }, baseDistance, sourceId, laneShift);
        return true;
      }

      // No explicit life item found (shouldn't happen with the authored pattern,
      // but handle gracefully by spawning without extra high logic).
      const sourceId = `life:${this._patternSerial++}`;
      this.#spawnPattern(world, pattern, baseDistance, sourceId, laneShift);
      return true;
    };

    const spawned = tryLane(laneRoll) || tryLane(-laneRoll);

    if (spawned) {
      // Keep the next obstacle pattern from colliding with the heart window.
      this.nextPattern = Math.max(this.nextPattern, this.config.spawn.tuning.lifePatternGuard);
    }
    this.nextLife = spawned
      ? this.rng.range(this.config.spawn.lifePickupMinDistance, this.config.spawn.lifePickupMaxDistance)
      : retryDist;
  }

  /**
   * Power-up tick — difficulty-driven, pattern-validated.
   *
   * The weighted type-roll is now inside #resolveCollectibleToken (called by
   * #spawnPattern when it encounters the 'powerup-roll' token), so the RNG
   * draw happens exactly once in the proven spawn path rather than ad-hoc here.
   *
   * Flow mirrors #tickLife:
   *   1. Chance gate — draw from seeded RNG; on miss defer with retry distance.
   *   2. Lane roll via seeded rng.choice.
   *   3. Validate POWERUP_INTRO_SPECIAL shifted to the chosen lane:
   *        isSolvable + neighbor-merge check.
   *   4. Retry mirrored lane on failure; defer on double-failure.
   *   5. Spawn via #spawnPattern — the 'powerup-roll' token is resolved inside.
   */
  #tickPowerUp(world) {
    const diff = this.director.get(world);
    const retryDist = this.config.spawn.powerUpRetryDistance ?? 200;

    if (!this.rng.chance(diff.powerUpChance)) {
      this.nextPowerUp = retryDist;
      return;
    }

    const baseDistance = this.projection.maxDistance;
    const absoluteBaseDistance = (world.worldDistanceTotal ?? 0) + baseDistance;
    const laneRoll = this.rng.choice(LANE_TRIPLET);

    const pattern = this.library.pickPowerUpIntro();

    // Locate the power-up token item so we can validate its reachability.
    // The token's collectible field is 'powerup-roll'; the type is resolved
    // at spawn time and does not affect the path-validator lane/height check.
    const powerUpItem = pattern.items.find(
      i => i.kind === 'flower' && i.collectible === 'powerup-roll',
    );

    const tryLane = (laneShift) => {
      const shiftedPattern = {
        ...pattern,
        items: pattern.items.map(i => ({ ...i, lane: (i.lane ?? 0) + laneShift })),
      };
      if (!this.validator.isSolvable(shiftedPattern, { speed: world.speed })) return false;
      if (!this.#isSolvableWithNeighbors(world, shiftedPattern, absoluteBaseDistance)) return false;
      // Validate that the power-up token itself is reachable given any
      // neighbor obstacles already reserved on the road.  Without this,
      // a hero/procedural obstacle near the pickup lane can make it
      // unreachable — the isSolvable check above only covers the pattern's
      // own items (POWERUP_INTRO_SPECIAL has zero obstacles, so isSolvable
      // is trivially true for every call).
      if (powerUpItem) {
        const pickupLane   = (powerUpItem.lane ?? 0) + laneShift;
        const pickupOffset = powerUpItem.offset;
        if (!this.validator.isCollectible(
          shiftedPattern,
          { lane: pickupLane, offset: pickupOffset, high: powerUpItem.high ?? false },
          { speed: world.speed },
        )) return false;
      }
      const sourceId = `powerup:${this._patternSerial++}`;
      // #spawnPattern will call #resolveCollectibleToken which draws the power-up
      // type from the config weighted table using the seeded RNG.
      this.#spawnPattern(world, pattern, baseDistance, sourceId, laneShift);
      return true;
    };

    const spawned = tryLane(laneRoll) || tryLane(-laneRoll);

    if (spawned) {
      // Keep the next obstacle pattern from colliding with the power-up window.
      this.nextPattern = Math.max(this.nextPattern, this.config.spawn.tuning.powerUpPatternGuard);
    }
    this.nextPowerUp = spawned
      ? this.rng.range(this.config.spawn.powerUpMinDistance, this.config.spawn.powerUpMaxDistance)
      : retryDist;
  }

  /**
   * v3.1: rare blue orchid — high-value lone pickup. Placed in a random
   * lane, slightly elevated (high=true 50% of the time so it sometimes
   * demands a jump even from a clear path).
   */
  #tickRare(world) {
    const cfg = this.config.spawn;
    const lane = this.rng.choice(LANE_TRIPLET);
    this.#spawnCollectible(world, {
      type: 'rare-orchid',
      lane,
      distance: this.projection.maxDistance + cfg.rareOrchidDistanceOffset,
      high: this.rng.chance(cfg.rareOrchidHighChance),
    });
    this.nextPattern = Math.max(this.nextPattern, cfg.rareOrchidPatternGuard);
    this.nextRare = this.rng.range(
      cfg.rareOrchidMinDistance,
      cfg.rareOrchidMaxDistance,
    );
  }

  /**
   * Resolves the `collectible` token on a pattern flower item.
   *
   * Known tokens beyond normal type strings:
   *   'life'         → 'life' (heart pickup) — passed through directly.
   *   'powerup-roll' → one of the weighted power-up types drawn from the
   *                    config table via the seeded RNG. This moves the
   *                    weighted-roll logic out of #tickPowerUp and into the
   *                    single resolution point so all callers share one path.
   *
   * Any other string is passed through unchanged (covers 'flower', 'flower-rich',
   * and future variants without special-casing every one here).
   *
   * @param {string} token
   * @returns {string}
   */
  #resolveCollectibleToken(token) {
    if (token !== 'powerup-roll') return token;
    // Draw a power-up type from the config weighted table using the seeded RNG.
    const types   = this.config.spawn.powerUpTypes   ?? ['power-tree', 'power-mushroom', 'power-magnet', 'power-shield', 'power-double'];
    const weights = this.config.spawn.powerUpWeights ?? [4, 3, 3, 3, 3];
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = this.rng.range(0, total);
    for (let i = 0; i < types.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return types[i];
    }
    return types[types.length - 1]; // guard against floating-point edge
  }

  /**
   * Spawns all items in `pattern` at `baseDistance`, applying an optional
   * `laneShift` so pickup specials can be mirrored to any validated lane.
   *
   * @param {object} world
   * @param {object} pattern
   * @param {number} baseDistance
   * @param {string} sourceId
   * @param {number} [laneShift=0] — added to every item's lane (integer: -1, 0, +1)
   */
  #spawnPattern(world, pattern, baseDistance, sourceId, laneShift = 0) {
    const minLane = this.config.player.minLane;
    const maxLane = this.config.player.maxLane;
    for (const item of pattern.items) {
      const distance = baseDistance + item.offset;
      const lane = (item.lane ?? 0) + laneShift;
      // Skip items whose shifted lane falls outside the playable road boundary.
      // A lane shift of ±1 applied to an edge-lane item (e.g. mushroom at +1
      // in LIFE_PICKUP_SPECIAL with laneShift=+1 → lane 2) would otherwise
      // produce an off-road entity that renders past the road edge, can never
      // be collided, and makes the validator's prior solvability check vacuous.
      // allLanes obstacles span the full road regardless of their lane value
      // so they are never skipped.
      if (!item.allLanes && (lane < minLane || lane > maxLane)) continue;
      if (item.kind === 'obstacle') {
        this.#spawnObstacle(world, {
          type: item.type,
          assetType: item.assetType,
          lane,
          allLanes: item.allLanes ?? false,
          distance,
          sourceId,
          variant: item.variant ?? null,
        });
      } else if (item.kind === 'flower') {
        // Resolve the collectible token: 'powerup-roll' draws from the weighted
        // table; 'life' and regular flower types pass through unchanged.
        const collectibleType = this.#resolveCollectibleToken(item.collectible ?? 'flower');
        this.#spawnCollectible(world, {
          type: collectibleType,
          lane,
          distance,
          sourceId,
          high: item.high ?? false,
        });
      }
    }
  }

  // ── Orchid-only filler patterns ──────────────────────────────────────────────

  /**
   * v3.8.4 collectible patterns — each pattern guides the player along a
   * readable route instead of just "orchids appear somewhere":
   *   line      — straight trail down one lane (40%)
   *   zigzag    — across-lane jog forcing 1-2 lane switches (20%)
   *   arc       — smooth diagonal from lane A → lane B (20%)
   *   step      — paired pickups that signal "switch now, then back" (20%)
   * All four play out over similar lengths so spawn pacing is unchanged.
   */
  #spawnOrchidPattern(world, baseDistance) {
    const cfg = this.config.spawn;
    const roll = this.rng.next();
    if (roll < cfg.orchidLineThreshold) {
      this.#spawnOrchidLine(world, baseDistance, this.rng.choice(LANE_TRIPLET));
    } else if (roll < cfg.orchidZigzagThreshold) {
      this.#spawnOrchidZigZag(world, baseDistance);
    } else if (roll < cfg.orchidArcThreshold) {
      this.#spawnOrchidArc(world, baseDistance);
    } else {
      this.#spawnOrchidStep(world, baseDistance);
    }
  }

  /**
   * v4.x — orchid-filler spawn that yields to existing collectible density the
   * same way the center trail does. The filler is the THIRD flower producer;
   * when its line/arc lands on a lane already carrying the breadcrumb trail or
   * a hero figure it just rebuilds the early-run "gold blob" (the filler fires
   * at low intensity, so #tickOrchid's gate doesn't cover the opening seconds).
   * Skipping the spawn draws no RNG — each sub-pattern's rolls happen before its
   * spawn loop — so seeded determinism is preserved.
   */
  #spawnFillerFlower(world, opts) {
    const density = world.config?.spawn?.density;
    if (density?.orchidFillerYieldsToFigures) {
      const worldDistance = world.worldDistanceTotal ?? 0;
      const absolute = opts.absoluteDistance ?? (worldDistance + opts.distance);
      const figureWindow = density.figureWindow ?? 4;
      if (this.roadLedger.collectibleDensityAround(absolute, opts.lane ?? 0, figureWindow) > 0) {
        return null;
      }
    }
    return this.#spawnCollectible(world, opts);
  }

  /**
   * Diagonal sweep from lane A to lane B. Player must lane-switch midway
   * to collect the full trail. 4 orchids spaced 12 apart, transitioning
   * smoothly across two adjacent lanes (e.g. -1 → 0 or 0 → 1).
   */
  #spawnOrchidArc(world, baseDistance) {
    const cfg = this.config.spawn;
    const fromIdx = this.rng.integer(0, 2);
    let toIdx = fromIdx + (this.rng.chance(cfg.orchidArcRightChance) ? 1 : -1);
    if (toIdx < 0 || toIdx > 2) toIdx = fromIdx - (toIdx - fromIdx);
    const fromLane = LANE_TRIPLET[fromIdx];
    const toLane = LANE_TRIPLET[toIdx];
    const count = 4;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      const lane = fromLane + (toLane - fromLane) * t;
      this.#spawnFillerFlower(world, {
        type: 'flower',
        lane,
        distance: baseDistance + i * cfg.orchidArcSpacing,
      });
    }
  }

  /**
   * "Step" pattern — 2 orchids on lane A, then 2 on adjacent lane B.
   * Reads as: "grab these, switch, grab these". Easier than zigzag,
   * good for low-difficulty rotations.
   */
  #spawnOrchidStep(world, baseDistance) {
    const cfg = this.config.spawn;
    const fromIdx = this.rng.integer(0, 2);
    let toIdx = fromIdx + (this.rng.chance(cfg.orchidStepRightChance) ? 1 : -1);
    if (toIdx < 0 || toIdx > 2) toIdx = fromIdx - (toIdx - fromIdx);
    const fromLane = LANE_TRIPLET[fromIdx];
    const toLane = LANE_TRIPLET[toIdx];
    [fromLane, fromLane, toLane, toLane].forEach((lane, i) => {
      this.#spawnFillerFlower(world, {
        type: 'flower',
        lane,
        distance: baseDistance + i * cfg.orchidStepSpacing,
      });
    });
  }

  #spawnOrchidLine(world, baseDistance, lane) {
    // v3.8.1 — orchids per line shrunk 3-4 → 2-3 and inter-orchid
    // distance grown 9 → 14. New orchidGoldMain sprite is bigger; tight
    // 9-unit spacing made each column read as a "wall of gold". 14
    // breathing units = single readable trail.
    const cfg = this.config.spawn;
    const count = this.rng.integer(cfg.tuning.orchidLineCountLo, cfg.tuning.orchidLineCountHi);
    const high = this.rng.chance(cfg.orchidLineHighChance);
    for (let i = 0; i < count; i++) {
      this.#spawnFillerFlower(world, {
        type: 'flower',
        lane,
        distance: baseDistance + i * cfg.orchidLineSpacing,
        high,
      });
    }
  }

  #spawnOrchidZigZag(world, baseDistance) {
    // v3.8.1 — shorter zigzag (5 → 3 nodes) so it doesn't span half a screen.
    const cfg = this.config.spawn;
    const lanes = this.rng.chance(cfg.orchidZigzagRightChance) ? [-1, 0, 1] : [1, 0, -1];
    lanes.forEach((lane, i) => {
      this.#spawnFillerFlower(world, {
        type: 'flower',
        lane,
        distance: baseDistance + i * cfg.orchidZigzagSpacing,
      });
    });
  }

  #logSpawn(pattern, diff, world) {
    if (!this.config.debug.allowLocalTools) return;
    const analysis = this.validator.analyze(pattern, { speed: world.speed });
    const entry = {
      id:       pattern.id,
      d:        diff.level,
      bucket:   diff.bucket,                          // distance-band-gated difficulty bucket
      band:     diff.band,                            // current distance band label
      dist:     Math.round(world.distanceRun ?? 0),   // player-facing metres
      action:   requiredAction(pattern),              // lane-switch / jump / crouch / combo / rest
      score:    world.score,
      speed:    Number(world.speed.toFixed(3)),
      solvable: analysis.solvable,                    // validator verdict for this pattern
      reason:   analysis.rejectionReason,
    };
    this.spawnLog.push(entry);
    if (this.spawnLog.length > SPAWN_LOG_CAPACITY) this.spawnLog.shift();
    // v4.22 — ?patternLog=1: compact live timeline line per spawn (display only).
    if (this.config.debug.patternLog) {
      console.log(`[pat] ${entry.dist}m · ${entry.band} · b${entry.bucket} · ${entry.id} · ${entry.action} · ${entry.solvable ? 'OK' : 'FAIL:' + entry.reason}`);
    }
  }
}

/**
 * v4.22 — coarse "what must the player DO" label for a pattern, for the debug
 * timeline only. Derived from the pattern's obstacles — no gameplay effect.
 */
function requiredAction(pattern) {
  const obs = (pattern.items ?? []).filter((i) => i.kind === 'obstacle');
  if (obs.length === 0) return 'rest';
  const crouch = obs.some((o) => o.type === 'overhang');                 // duck-under
  const jump = obs.some((o) => o.allLanes && o.type !== 'overhang');     // vine = jump-over
  const lane = obs.some((o) => !o.allLanes);                            // single-lane = dodge
  // 'combo' = the genuinely-mixed / long beats; otherwise the headline action,
  // with crouch surfaced first (the duck is the defining skill of the beat).
  if (obs.length >= 4 || (crouch && jump) || (jump && lane)) return 'combo';
  if (crouch) return 'crouch';
  if (jump) return 'jump';
  return 'lane-switch';   // one or more same-lane dodges
}
