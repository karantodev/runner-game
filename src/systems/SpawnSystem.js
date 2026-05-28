import { createCollectible, createObstacle } from '../ecs/factories.js';
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
  constructor(config, projection, rng) {
    this.config = config;
    this.projection = projection;
    this.rng = rng;
    this.director = new DifficultyDirector(rng);
    this.library = new PatternLibrary(rng);
    this.validator = new PathValidator();
    this.spawnLog = []; // ring-buffer exposed to the debug API
    this.reset();
  }

  reset() {
    this.nextPattern = 44;
    this.nextOrchid = 22;
    this.nextLife = this.rng.range(this.config.spawn.lifePickupMinDistance, this.config.spawn.lifePickupMaxDistance);
    this.nextPowerUp = this.rng.range(
      this.config.spawn.powerUpMinDistance * 0.55,
      this.config.spawn.powerUpMaxDistance * 0.75,
    );
  }

  prepopulate(world) {
    this.#spawnOrchidLine(world, this.config.spawn.flowerStartDistance, 0);
    this.#spawnOrchidLine(world, this.config.spawn.flowerStartDistance + 48, 0);
    this.#spawnPattern(world, this.library.pick(1), this.config.spawn.obstacleStartDistance);
  }

  update(world, delta) {
    if (world.state !== 'playing') return;
    const travel = world.speed * delta;
    this.nextPattern -= travel;
    this.nextOrchid  -= travel;
    this.nextLife    -= travel;
    this.nextPowerUp -= travel;

    if (this.nextPattern <= 0) this.#tickPattern(world);
    if (this.nextOrchid <= 0) this.#tickOrchid(world);
    if (this.nextLife <= 0) this.#tickLife(world);
    if (this.nextPowerUp <= 0) this.#tickPowerUp(world);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  #tickPattern(world) {
    const diff = this.director.get(world);
    const snap = world.powerUpSystem.snapshot();

    let pattern;
    if (snap.splitClonesActive) {
      pattern = this.library.pickSplitBonus();
    } else {
      const level = snap.speedBurstActive ? Math.min(diff.level, 2) : diff.level;
      pattern = this.library.pick(level);
      if (!this.validator.isSolvable(pattern)) {
        pattern = this.library.pickFallback();
      }
    }

    this.#spawnPattern(world, pattern, this.projection.maxDistance);
    this.#logSpawn(pattern, diff, world);

    const hasVine = pattern.items.some(i => i.kind === 'obstacle' && i.type === 'vine');
    this.nextOrchid = Math.max(this.nextOrchid, hasVine ? 68 : 30);
    this.nextPattern = diff.patternSpacing;
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
    const isPowerTree = this.rng.chance(0.52);
    const lane = this.rng.choice(LANE_TRIPLET);
    createCollectible(world.registry, {
      type: isPowerTree ? 'power-tree' : 'power-mushroom',
      lane,
      distance: this.projection.maxDistance + 12,
    });
    this.nextPattern = Math.max(this.nextPattern, 40);
    this.nextPowerUp = this.rng.range(this.config.spawn.powerUpMinDistance, this.config.spawn.powerUpMaxDistance);
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

  #spawnOrchidPattern(world, baseDistance) {
    const roll = this.rng.next();
    if (roll < 0.55) {
      this.#spawnOrchidLine(world, baseDistance, this.rng.choice(LANE_TRIPLET));
    } else if (roll < 0.80) {
      this.#spawnOrchidZigZag(world, baseDistance);
    } else {
      this.#spawnOrchidWide(world, baseDistance);
    }
  }

  #spawnOrchidLine(world, baseDistance, lane) {
    const count = this.rng.integer(3, 4);
    const high = this.rng.chance(0.26);
    for (let i = 0; i < count; i++) {
      createCollectible(world.registry, {
        type: 'flower',
        lane,
        distance: baseDistance + i * 9,
        high,
      });
    }
  }

  #spawnOrchidZigZag(world, baseDistance) {
    const lanes = this.rng.chance(0.5) ? [-1, 0, 1, 0, -1] : [1, 0, -1, 0, 1];
    lanes.forEach((lane, i) => {
      createCollectible(world.registry, {
        type: 'flower',
        lane,
        distance: baseDistance + i * 10,
      });
    });
  }

  #spawnOrchidWide(world, baseDistance) {
    const rows = this.rng.integer(1, 2);
    for (let row = 0; row < rows; row++) {
      for (const lane of LANE_TRIPLET) {
        createCollectible(world.registry, {
          type: 'flower',
          lane,
          distance: baseDistance + row * 12,
        });
      }
    }
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
