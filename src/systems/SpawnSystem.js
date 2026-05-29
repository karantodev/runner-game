import { createCollectible, createObstacle } from '../ecs/factories.js';
import { HERO_ROAD_CYCLE_LENGTH, HERO_ROAD_SEQUENCE } from '../config/sceneSchema.data.js';
import { DifficultyDirector } from './spawn/DifficultyDirector.js';
import { PatternLibrary } from './spawn/PatternLibrary.js';
import { PathValidator } from './spawn/PathValidator.js';

const SPAWN_LOG_CAPACITY = 24;
const LANE_TRIPLET = Object.freeze([-1, 0, 1]);

export class SpawnSystem {
  /**
   * @param {object} config
   * @param {import('../world/Projection.js').Projection} projection
   * @param {import('../utils/rng.js').Rng} rng — shared world RNG
   */
  constructor(config, projection, rng, skill = null) {
    this.config = config;
    this.projection = projection;
    this.rng = rng;
    this.director = new DifficultyDirector(rng, skill);
    this.library = new PatternLibrary(rng);
    this.validator = new PathValidator();
    this.spawnLog = []; // ring-buffer exposed to the debug API
    this.reset();
  }

  reset() {
    /**
     * v3.5: keep the last difficulty snapshot so PerformanceHUD can
     * display it without re-calling director.get(), which would consume
     * seeded RNG state and break deterministic-replay tests.
     */
    this.lastDifficulty = null;
    this.nextPattern = 44;
    this.nextOrchid = 22;
    this.nextLife = this.rng.range(this.config.spawn.lifePickupMinDistance, this.config.spawn.lifePickupMaxDistance);
    this.nextPowerUp = this.rng.range(
      this.config.spawn.powerUpMinDistance * 0.55,
      this.config.spawn.powerUpMaxDistance * 0.75,
    );
    // v3.1: rare blue orchid spawns rarely as a "hunt" target.
    this.nextRare = this.rng.range(
      this.config.spawn.rareOrchidMinDistance * 0.6,
      this.config.spawn.rareOrchidMaxDistance * 0.6,
    );
    // v3.8.23 — origin of the NEXT hero-road cycle to stamp. Bumped by
    // CYCLE_LENGTH every time a cycle goes off-camera so the rhythm is
    // continuous.
    this.heroCycleOrigin = 0;
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
    for (let i = 0; i < cycles; i += 1) {
      this.#stampHeroCycle(world, i * HERO_ROAD_CYCLE_LENGTH);
    }
    this.heroCycleOrigin = cycles * HERO_ROAD_CYCLE_LENGTH;
    // Procedural patterns kept on the legacy cadence (fires ~60 travel
    // units in) so they add ambient extras between hero beats. Hero
    // cycle is the BASELINE; procedural is variation.
    this.nextPattern = 60;
    this.nextOrchid  = 200;  // orchid duty carried by hero cycles
  }

  /** Stamp one full HERO_ROAD_SEQUENCE cycle at the given origin distance. */
  #stampHeroCycle(world, originDistance) {
    for (const entry of HERO_ROAD_SEQUENCE) {
      this.#spawnHeroRoadEntry(world, {
        ...entry,
        distance: originDistance + entry.offsetInCycle,
      });
    }
  }

  /** Dispatcher for HERO_ROAD_LAYOUT entries. */
  #spawnHeroRoadEntry(world, entry) {
    const dist = entry.distance;
    switch (entry.kind) {
      case 'flower-line': {
        const count = entry.count ?? 3;
        const spacing = entry.spacing ?? 6;
        for (let i = 0; i < count; i += 1) {
          createCollectible(world.registry, {
            type: 'flower', lane: entry.lane ?? 0,
            distance: dist + i * spacing, high: false,
          });
        }
        return;
      }
      case 'flower-arc': {
        const count = entry.count ?? 4;
        const from = entry.fromLane;
        const to = entry.toLane;
        for (let i = 0; i < count; i += 1) {
          const t = i / (count - 1);
          const lane = from + t * (to - from);
          createCollectible(world.registry, {
            type: 'flower', lane,
            distance: dist + i * 7, high: false,
          });
        }
        return;
      }
      case 'flower-zigzag': {
        entry.lanes.forEach((lane, i) => {
          createCollectible(world.registry, {
            type: 'flower', lane,
            distance: dist + i * 8, high: false,
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
        for (let i = 0; i < count; i += 1) {
          const laneJitter = (i % 2 === 0) ? 0 : 0.12;
          createCollectible(world.registry, {
            type: 'flower', lane: lane + laneJitter,
            distance: dist + i * 4, high: false,
          });
        }
        return;
      }
      case 'jump-obstacle': {
        createObstacle(world.registry, {
          type: 'wheat', lane: entry.lane ?? 0,
          distance: dist,
        });
        return;
      }
      case 'vine-with-rewards': {
        const lane = entry.lane ?? 0;
        createObstacle(world.registry, {
          type: 'vine', lane, distance: dist,
          allLanes: true,
        });
        this.#spawnRewardApproach(world, dist, lane);
        this.#spawnRewardExit(world, dist, lane);
        return;
      }
      default:
        // unknown kind — silently skip
    }
  }

  update(world, delta) {
    if (world.state !== 'playing') return;
    const travel = world.speed * delta;
    this.nextPattern -= travel;
    this.nextOrchid  -= travel;
    this.nextLife    -= travel;
    this.nextPowerUp -= travel;
    this.nextRare    -= travel;

    if (this.nextPattern <= 0) this.#tickPattern(world);
    if (this.nextOrchid <= 0) this.#tickOrchid(world);
    if (this.nextLife <= 0) this.#tickLife(world);
    if (this.nextPowerUp <= 0) this.#tickPowerUp(world);
    if (this.nextRare <= 0) this.#tickRare(world);

    // v3.8.23 — keep the hero cycle ahead of the player. Compare the
    // next cycle's origin to the player's accumulated scrollOffset
    // (world progress in distance units). When the player closes in
    // on it (within maxDistance), stamp a fresh cycle further out.
    if (this.heroCycleOrigin - world.scrollOffset < this.projection.maxDistance) {
      this.#stampHeroCycle(world, this.heroCycleOrigin);
      this.heroCycleOrigin += HERO_ROAD_CYCLE_LENGTH;
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  #tickPattern(world) {
    const diff = this.director.get(world);
    this.lastDifficulty = diff;
    const snap = world.powerUpSystem.snapshot();

    let pattern;
    if (snap.splitClonesActive) {
      pattern = this.library.pickSplitBonus();
    } else {
      // v3.1: pattern pool is keyed on levels 1-4. For our open-ended
      // levels 5-6 we still pick from level 4 — the heightened pressure
      // comes from tighter patternSpacing (DifficultyDirector).
      const libraryLevel = Math.min(4, snap.speedBurstActive ? Math.min(diff.level, 2) : diff.level);
      pattern = this.library.pick(libraryLevel);
      if (!this.validator.isSolvable(pattern)) {
        pattern = this.library.pickFallback();
      }
    }

    this.#spawnPattern(world, pattern, this.projection.maxDistance);
    this.#logSpawn(pattern, diff, world);

    const hasVine = pattern.items.some(i => i.kind === 'obstacle' && i.type === 'vine');
    if (hasVine) {
      // v3.8.4 — visual reward lane that LEADS into the vine, signalling
      // "jump here". Three orchids placed at increasing height ahead of
      // the vine in the same lane it will land in. After the vine we
      // also drop a continuation trail so the player sees the reward
      // exit. Uses the pattern's mid lane (or center) for placement.
      const vineLane = this.#patternVineLane(pattern) ?? 0;
      const vineBase = this.projection.maxDistance;
      this.#spawnRewardApproach(world, vineBase, vineLane);
      this.#spawnRewardExit(world, vineBase, vineLane);
    }
    this.nextOrchid = Math.max(this.nextOrchid, hasVine ? 68 : 30);
    // v3.8.8 Tier-3 — post-vine spacing 96 → 140 so the next obstacle
    // doesn't enter the visible field until the player is well past
    // the vine landing. User reported two vines still reading as a
    // "double barrier" at 96 distance-units of separation.
    const minSpacing = hasVine ? 140 : diff.patternSpacing;
    this.nextPattern = Math.max(diff.patternSpacing, minSpacing);
  }

  /** Read the lane the vine sits in (or 0 if it spans all lanes). */
  #patternVineLane(pattern) {
    const vine = pattern.items.find(i => i.kind === 'obstacle' && i.type === 'vine');
    return vine && !vine.allLanes ? (vine.lane ?? 0) : 0;
  }

  /**
   * "Approach trail" — 3 orchids in the lane the vine will land in,
   * at increasing height so the visual path slopes up to a jump cue.
   * Distances: 26, 18, 10 BEFORE the vine.
   */
  #spawnRewardApproach(world, vineDist, lane) {
    [26, 18, 10].forEach((offset) => {
      createCollectible(world.registry, {
        type: 'flower',
        lane,
        distance: vineDist - offset,
        high: false,
      });
    });
  }

  /**
   * "Exit trail" — a single orchid right after the vine in the same
   * lane, so the player sees their landing rewarded.
   */
  #spawnRewardExit(world, vineDist, lane) {
    createCollectible(world.registry, {
      type: 'flower',
      lane,
      distance: vineDist + 8,
      high: false,
    });
  }

  #tickOrchid(world) {
    const diff = this.director.get(world);
    this.#spawnOrchidPattern(world, this.projection.maxDistance);
    this.nextOrchid = diff.orchidSpacing;
  }

  #tickLife(world) {
    const lane = this.rng.choice(LANE_TRIPLET);
    createCollectible(world.registry, {
      type: 'life',
      lane,
      distance: this.projection.maxDistance + 8,
      high: this.rng.chance(0.20),
    });
    this.nextPattern = Math.max(this.nextPattern, 32);
    this.nextLife = this.rng.range(this.config.spawn.lifePickupMinDistance, this.config.spawn.lifePickupMaxDistance);
  }

  #tickPowerUp(world) {
    // v3.1: roll across 5 power-ups by weight (legacy two still common,
    // new three a bit rarer so they feel special when they appear).
    //   power-tree (speed)     w=4   total 16
    //   power-mushroom (split) w=3
    //   power-magnet           w=3
    //   power-shield           w=3
    //   power-double (x2)      w=3
    const weights = [4, 3, 3, 3, 3];
    const types = ['power-tree', 'power-mushroom', 'power-magnet', 'power-shield', 'power-double'];
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = this.rng.range(0, total);
    let picked = types[0];
    for (let i = 0; i < types.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) { picked = types[i]; break; }
    }
    const lane = this.rng.choice(LANE_TRIPLET);
    createCollectible(world.registry, {
      type: picked,
      lane,
      distance: this.projection.maxDistance + 12,
    });
    this.nextPattern = Math.max(this.nextPattern, 40);
    this.nextPowerUp = this.rng.range(this.config.spawn.powerUpMinDistance, this.config.spawn.powerUpMaxDistance);
  }

  /**
   * v3.1: rare blue orchid — high-value lone pickup. Placed in a random
   * lane, slightly elevated (high=true 50% of the time so it sometimes
   * demands a jump even from a clear path).
   */
  #tickRare(world) {
    const lane = this.rng.choice(LANE_TRIPLET);
    createCollectible(world.registry, {
      type: 'rare-orchid',
      lane,
      distance: this.projection.maxDistance + 10,
      high: this.rng.chance(0.5),
    });
    this.nextPattern = Math.max(this.nextPattern, 28);
    this.nextRare = this.rng.range(
      this.config.spawn.rareOrchidMinDistance,
      this.config.spawn.rareOrchidMaxDistance,
    );
  }

  #spawnPattern(world, pattern, baseDistance) {
    for (const item of pattern.items) {
      const distance = baseDistance + item.offset;
      if (item.kind === 'obstacle') {
        createObstacle(world.registry, {
          type: item.type,
          assetType: item.assetType,
          lane: item.lane ?? 0,
          allLanes: item.allLanes ?? false,
          distance,
          variant: item.variant ?? null,
        });
      } else if (item.kind === 'flower') {
        createCollectible(world.registry, {
          type: 'flower',
          lane: item.lane,
          distance,
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
    const roll = this.rng.next();
    if (roll < 0.40) {
      this.#spawnOrchidLine(world, baseDistance, this.rng.choice(LANE_TRIPLET));
    } else if (roll < 0.60) {
      this.#spawnOrchidZigZag(world, baseDistance);
    } else if (roll < 0.80) {
      this.#spawnOrchidArc(world, baseDistance);
    } else {
      this.#spawnOrchidStep(world, baseDistance);
    }
  }

  /**
   * Diagonal sweep from lane A to lane B. Player must lane-switch midway
   * to collect the full trail. 4 orchids spaced 12 apart, transitioning
   * smoothly across two adjacent lanes (e.g. -1 → 0 or 0 → 1).
   */
  #spawnOrchidArc(world, baseDistance) {
    const fromIdx = this.rng.integer(0, 2);
    let toIdx = fromIdx + (this.rng.chance(0.5) ? 1 : -1);
    if (toIdx < 0 || toIdx > 2) toIdx = fromIdx - (toIdx - fromIdx);
    const fromLane = LANE_TRIPLET[fromIdx];
    const toLane = LANE_TRIPLET[toIdx];
    const count = 4;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      const lane = fromLane + (toLane - fromLane) * t;
      createCollectible(world.registry, {
        type: 'flower',
        lane,
        distance: baseDistance + i * 12,
      });
    }
  }

  /**
   * "Step" pattern — 2 orchids on lane A, then 2 on adjacent lane B.
   * Reads as: "grab these, switch, grab these". Easier than zigzag,
   * good for low-difficulty rotations.
   */
  #spawnOrchidStep(world, baseDistance) {
    const fromIdx = this.rng.integer(0, 2);
    let toIdx = fromIdx + (this.rng.chance(0.5) ? 1 : -1);
    if (toIdx < 0 || toIdx > 2) toIdx = fromIdx - (toIdx - fromIdx);
    const fromLane = LANE_TRIPLET[fromIdx];
    const toLane = LANE_TRIPLET[toIdx];
    [fromLane, fromLane, toLane, toLane].forEach((lane, i) => {
      createCollectible(world.registry, {
        type: 'flower',
        lane,
        distance: baseDistance + i * 13,
      });
    });
  }

  #spawnOrchidLine(world, baseDistance, lane) {
    // v3.8.1 — orchids per line shrunk 3-4 → 2-3 and inter-orchid
    // distance grown 9 → 14. New orchidGoldMain sprite is bigger; tight
    // 9-unit spacing made each column read as a "wall of gold". 14
    // breathing units = single readable trail.
    const count = this.rng.integer(2, 3);
    const high = this.rng.chance(0.26);
    for (let i = 0; i < count; i++) {
      createCollectible(world.registry, {
        type: 'flower',
        lane,
        distance: baseDistance + i * 14,
        high,
      });
    }
  }

  #spawnOrchidZigZag(world, baseDistance) {
    // v3.8.1 — shorter zigzag (5 → 3 nodes) so it doesn't span half a screen.
    const lanes = this.rng.chance(0.5) ? [-1, 0, 1] : [1, 0, -1];
    lanes.forEach((lane, i) => {
      createCollectible(world.registry, {
        type: 'flower',
        lane,
        distance: baseDistance + i * 10,
      });
    });
  }

  #logSpawn(pattern, diff, world) {
    if (!this.config.debug.allowLocalTools) return;
    const analysis = this.validator.analyze(pattern);
    const entry = {
      id:       pattern.id,
      d:        diff.level,
      score:    world.score,
      speed:    Number(world.speed.toFixed(3)),
      solvable: analysis.solvable,
      reason:   analysis.rejectionReason,
    };
    this.spawnLog.push(entry);
    if (this.spawnLog.length > SPAWN_LOG_CAPACITY) this.spawnLog.shift();
  }
}
