import { getObstacleRule, obstacleSpansAllLanes } from '../../ecs/obstacleRules.js';

const COLLECTIBLE_DEPTH_BUCKET = 0.25;
const COLLECTIBLE_LANE_BUCKET = 0.05;
const COLLECTIBLE_OBSTACLE_CLEARANCE = 4;
const COLLECTIBLE_OBSTACLE_LANE_CLEARANCE = 0.24;
const PASSED_RETENTION = 16;

/**
 * Coordinates road occupancy across hero cycles, procedural patterns, and
 * collectible trails. Producers still decide what they would like to spawn;
 * this ledger prevents independent producers from creating overlapping or
 * visually contradictory objects.
 */
export class RoadSpawnLedger {
  constructor() {
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.collectibles = new Map();
  }

  /**
   * Drop reservations that are safely behind the player. The active set stays
   * bounded even during multi-hour runs.
   */
  advance(playerDistance) {
    const minDistance = playerDistance - PASSED_RETENTION;
    let write = 0;
    for (let read = 0; read < this.obstacles.length; read += 1) {
      const obstacle = this.obstacles[read];
      if (obstacle.distance >= minDistance) this.obstacles[write++] = obstacle;
    }
    this.obstacles.length = write;

    for (const [key, collectible] of this.collectibles) {
      if (collectible.distance < minDistance || collectible.entity?.alive === false) {
        this.collectibles.delete(key);
      }
    }
  }

  canReservePattern(items, baseDistance, sourceId) {
    for (const item of items) {
      if (item.kind !== 'obstacle') continue;
      if (!this.canReserveObstacle({
        type: item.type,
        lane: item.lane ?? 0,
        allLanes: item.allLanes ?? false,
        distance: baseDistance + item.offset,
        sourceId,
      })) {
        return false;
      }
    }
    return true;
  }

  canReserveObstacle(opts) {
    const candidate = this.#obstacleRecord(opts);
    return !this.obstacles.some((existing) => this.#obstaclesConflict(existing, candidate));
  }

  reserveObstacle(opts) {
    const obstacle = this.#obstacleRecord(opts);
    if (this.obstacles.some((existing) => this.#obstaclesConflict(existing, obstacle))) {
      return false;
    }
    this.obstacles.push(obstacle);
    this.#removeBlockedCollectibles(obstacle);
    return true;
  }

  reserveCollectible(opts) {
    const collectible = {
      distance: opts.distance,
      lane: opts.lane ?? 0,
      entity: null,
    };
    if (this.#isBlockedByObstacle(collectible)) return null;

    const key = this.#collectibleKey(collectible);
    if (this.collectibles.has(key)) return null;
    this.collectibles.set(key, collectible);
    return collectible;
  }

  attachCollectible(reservation, entity) {
    if (reservation) reservation.entity = entity;
  }

  #obstacleRecord(opts) {
    const rule = getObstacleRule(opts.type);
    return {
      type: opts.type,
      lane: opts.lane ?? 0,
      allLanes: obstacleSpansAllLanes(opts.type, opts.allLanes),
      distance: opts.distance,
      sourceId: opts.sourceId ?? 'unknown',
      crossSourceGap: rule.crossSourceGap,
    };
  }

  #obstaclesConflict(a, b) {
    if (a.sourceId === b.sourceId) return false;
    const gap = Math.abs(a.distance - b.distance);
    const requiredGap = Math.max(a.crossSourceGap, b.crossSourceGap);
    if (gap >= requiredGap) return false;
    if (a.allLanes || b.allLanes) return true;
    return Math.abs(a.lane - b.lane) < 0.56;
  }

  #isBlockedByObstacle(collectible) {
    return this.obstacles.some((obstacle) => {
      if (Math.abs(obstacle.distance - collectible.distance) >= COLLECTIBLE_OBSTACLE_CLEARANCE) {
        return false;
      }
      return obstacle.allLanes
        || Math.abs(obstacle.lane - collectible.lane) < COLLECTIBLE_OBSTACLE_LANE_CLEARANCE;
    });
  }

  #removeBlockedCollectibles(obstacle) {
    for (const [key, collectible] of this.collectibles) {
      if (Math.abs(obstacle.distance - collectible.distance) >= COLLECTIBLE_OBSTACLE_CLEARANCE) {
        continue;
      }
      if (!obstacle.allLanes
          && Math.abs(obstacle.lane - collectible.lane) >= COLLECTIBLE_OBSTACLE_LANE_CLEARANCE) {
        continue;
      }
      if (collectible.entity) collectible.entity.alive = false;
      this.collectibles.delete(key);
    }
  }

  #collectibleKey({ lane, distance }) {
    const laneBucket = Math.round(lane / COLLECTIBLE_LANE_BUCKET);
    const depthBucket = Math.round(distance / COLLECTIBLE_DEPTH_BUCKET);
    return `${laneBucket}:${depthBucket}`;
  }
}
