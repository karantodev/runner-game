import { Obstacle } from '../entities/Obstacle.js';
import { Collectible } from '../entities/Collectible.js';
import { chance, randRange, randomChoice } from '../utils/math.js';
import { zoneForMainLane } from '../config/sceneSchema.js';
import { DifficultyDirector } from './spawn/DifficultyDirector.js';
import { PatternLibrary } from './spawn/PatternLibrary.js';
import { PathValidator } from './spawn/PathValidator.js';

const SPAWN_LOG_CAPACITY = 24;

export class SpawnSystem {
  constructor(config, projection) {
    this.config = config;
    this.projection = projection;
    this.director = new DifficultyDirector();
    this.library = new PatternLibrary();
    this.validator = new PathValidator();
    this.spawnLog = []; // ring-buffer exposed to the debug API
    this.reset();
  }

  reset() {
    this.nextPattern = 44;
    this.nextOrchid = 22;
    this.nextLife = randRange(this.config.spawn.lifePickupMinDistance, this.config.spawn.lifePickupMaxDistance);
    this.nextPowerUp = randRange(
      this.config.spawn.powerUpMinDistance * 0.55,
      this.config.spawn.powerUpMaxDistance * 0.75,
    );
  }

  prepopulate(world) {
    // Two close orchid rows so the player has something to collect immediately.
    this.#spawnOrchidLine(world, this.config.spawn.flowerStartDistance, 0);
    this.#spawnOrchidLine(world, this.config.spawn.flowerStartDistance + 48, 0);
    // One easy obstacle pattern further out.
    this.#spawnPattern(world, this.library.pick(1), this.config.spawn.obstacleStartDistance);
  }

  update(world, delta) {
    const travel = world.speed * delta;
    this.nextPattern -= travel;
    this.nextOrchid  -= travel;
    this.nextLife    -= travel;
    this.nextPowerUp -= travel;

    if (this.nextPattern <= 0) {
      this.#tickPattern(world);
    }

    if (this.nextOrchid <= 0) {
      this.#tickOrchid(world);
    }

    if (this.nextLife <= 0) {
      this.#tickLife(world);
    }

    if (this.nextPowerUp <= 0) {
      this.#tickPowerUp(world);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  #tickPattern(world) {
    const diff = this.director.get(world);
    const snap = world.powerUpSystem.snapshot();

    let pattern;
    if (snap.splitClonesActive) {
      // All 3 lanes occupied during split — give bonus flowers only.
      pattern = this.library.pickSplitBonus();
    } else {
      // Speed burst makes obstacles arrive faster → cap effective difficulty.
      const level = snap.speedBurstActive ? Math.min(diff.level, 2) : diff.level;
      pattern = this.library.pick(level);
      if (!this.validator.isSolvable(pattern)) {
        pattern = this.library.pickFallback();
      }
    }

    this.#spawnPattern(world, pattern, this.projection.maxDistance);
    this.#logSpawn(pattern, diff, world);

    // Push orchid timer forward; extra gap after vine patterns so obstacle vs reward reads clearly.
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
    const lane = randomChoice([-1, 0, 1]);
    world.collectibles.push(new Collectible({
      type: 'life',
      zone: zoneForMainLane(lane),
      lane,
      distance: this.projection.maxDistance + 8,
      high: chance(0.20),
    }));
    // Small clear zone after a life to avoid it feeling like a trap.
    this.nextPattern = Math.max(this.nextPattern, 32);
    this.nextLife = randRange(this.config.spawn.lifePickupMinDistance, this.config.spawn.lifePickupMaxDistance);
  }

  #tickPowerUp(world) {
    const isPowerTree = chance(0.52);
    const lane = randomChoice([-1, 0, 1]);
    world.collectibles.push(new Collectible({
      type: isPowerTree ? 'power-tree' : 'power-mushroom',
      zone: zoneForMainLane(lane),
      lane,
      distance: this.projection.maxDistance + 12,
    }));
    // Delay next obstacle pattern so the power-up isn't a trap.
    this.nextPattern = Math.max(this.nextPattern, 40);
    this.nextPowerUp = randRange(this.config.spawn.powerUpMinDistance, this.config.spawn.powerUpMaxDistance);
  }

  // Spawn all items of a pattern relative to baseDistance.
  #spawnPattern(world, pattern, baseDistance) {
    for (const item of pattern.items) {
      const distance = baseDistance + item.offset;
      if (item.kind === 'obstacle') {
        world.obstacles.push(new Obstacle({
          type: item.type,
          lane: item.lane ?? 0,
          allLanes: item.allLanes ?? false,
          zone: zoneForMainLane(item.lane ?? 0),
          distance,
          variant: item.variant ?? null,
        }));
      } else if (item.kind === 'flower') {
        world.collectibles.push(new Collectible({
          type: 'flower',
          zone: zoneForMainLane(item.lane),
          lane: item.lane,
          distance,
          high: item.high ?? false,
        }));
      }
    }
  }

  // ── Orchid-only filler patterns ──────────────────────────────────────────────

  #spawnOrchidPattern(world, baseDistance) {
    const roll = Math.random();
    if (roll < 0.55) {
      this.#spawnOrchidLine(world, baseDistance, randomChoice([-1, 0, 1]));
    } else if (roll < 0.80) {
      this.#spawnOrchidZigZag(world, baseDistance);
    } else {
      this.#spawnOrchidWide(world, baseDistance);
    }
  }

  #spawnOrchidLine(world, baseDistance, lane) {
    const count = 3 + Math.floor(Math.random() * 2);
    const high  = chance(0.26);
    for (let i = 0; i < count; i++) {
      world.collectibles.push(new Collectible({
        type: 'flower',
        zone: zoneForMainLane(lane),
        lane,
        distance: baseDistance + i * 9,
        high,
      }));
    }
  }

  #spawnOrchidZigZag(world, baseDistance) {
    const lanes = chance(0.5) ? [-1, 0, 1, 0, -1] : [1, 0, -1, 0, 1];
    lanes.forEach((lane, i) => {
      world.collectibles.push(new Collectible({
        type: 'flower',
        zone: zoneForMainLane(lane),
        lane,
        distance: baseDistance + i * 10,
      }));
    });
  }

  #spawnOrchidWide(world, baseDistance) {
    const rows = 1 + Math.floor(Math.random() * 2);
    for (let row = 0; row < rows; row++) {
      for (const lane of [-1, 0, 1]) {
        world.collectibles.push(new Collectible({
          type: 'flower',
          zone: zoneForMainLane(lane),
          lane,
          distance: baseDistance + row * 12,
        }));
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
    // eslint-disable-next-line no-console
    console.debug('[Spawn]', entry.solvable ? '✓' : '✗', entry.id, `D${entry.d}`, `spd=${entry.speed}`, entry.reason ?? '');
    this.spawnLog.push(entry);
    if (this.spawnLog.length > SPAWN_LOG_CAPACITY) this.spawnLog.shift();
  }

}
