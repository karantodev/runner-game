import { GAME_CONFIG } from '../../config/gameConfig.js';
import { getObstacleRule, obstacleSpansAllLanes } from '../../ecs/obstacleRules.js';

// The current lane interpolation reaches a safe offset in roughly nine frames
// at base speed. Scale the required world distance with speed so validation
// remains frame-accurate when the runner accelerates.
const BASE_LANE_SWITCH_UNITS = 8;

// Mirrors CollisionSystem #collect: the player Y threshold below which they are
// considered "airborne enough" to collect a high pickup.
// Runtime: CollisionSystem.js — `const heightOK = data.high ? playerY < -30 : true`
// (threshold value: -30)

// Mirrors CollisionSystem #hitObstacles: the player Y threshold for jumping over
// a ground obstacle. Runtime: CollisionSystem.js — `const jumpingOver = playerY < -25`
// (threshold value: -25)

export class PathValidator {
  constructor(config = GAME_CONFIG) {
    this.config = config;
  }

  isSolvable(pattern, options = {}) {
    return this.#simulate(pattern, options).solvable;
  }

  // Returns { solvable, rejectionReason, finalStates }
  analyze(pattern, options = {}) {
    return this.#simulate(pattern, options);
  }

  /**
   * Returns true iff at least one HITLESS path through the pattern occupies
   * target.lane at target.offset AND satisfies the height requirement.
   *
   * Height rules mirror CollisionSystem #collect (lines 43-45):
   *   - high pickup: player must be airborne at that offset (landAt > offset),
   *     mirroring `playerY < HIGH_COLLECT_Y_THRESHOLD` — a player is airborne
   *     in the validator when their landAt has not yet elapsed.
   *   - ground pickup: no height restriction (runtime heightOK = true).
   *
   * Implementation: filters to obstacles only and walks them in offset order,
   * stopping at each whose offset <= target.offset. After the sweep any
   * surviving state whose lane and height match the target is considered
   * reachable.
   *
   * @param {object} pattern
   * @param {{ lane: number, offset: number, high: boolean }} target
   * @param {object} [options]
   * @returns {boolean}
   */
  isCollectible(pattern, target, options = {}) {
    const speed = options.speed ?? this.config.gameplay.startSpeed;
    const timing = this.#timing(speed);

    const obstacles = pattern.items
      .filter(i => i.kind === 'obstacle')
      .sort((a, b) => a.offset - b.offset);

    // Initial states — same as #simulate, no hits allowed.
    let states = [-1, 0, 1].map(lane => ({
      lane, airborne: false, landAt: -Infinity,
      crouching: false, crouchUntil: -Infinity,
      posAt: -Infinity,
    }));

    // Walk through all obstacles whose offset <= target.offset, then check
    // reachability, then continue. We reuse #stepObstacle to advance the set.
    for (const obs of obstacles) {
      if (obs.offset > target.offset) break;
      states = this.#stepObstacle(states, obs, timing);
      if (states.length === 0) return false; // pattern unsolvable before target
    }

    // At this point `states` represents all hitless states reachable at or
    // just after `target.offset`. Check whether any state satisfies the
    // lane+height constraint.
    return states.some(s => {
      const laneMatch = Math.abs(s.lane - target.lane) <
        (this.config.gameplay.collect?.laneWindow ?? 0.48);
      if (!laneMatch) return false;
      if (target.high) {
        // High pickup: player must be airborne (landAt has not elapsed yet).
        // This mirrors the runtime `playerY < HIGH_COLLECT_Y_THRESHOLD` check:
        // the validator has no continuous y coordinate, so we proxy with
        // landAt > offset meaning the jump arc is still active.
        return s.airborne && s.landAt > target.offset;
      }
      // Ground pickup: no height restriction (runtime heightOK = true).
      return true;
    });
  }

  /**
   * Returns true iff the pattern survives with at most one hit.
   *
   * At any obstacle where a given state has no legal clear action, the state
   * "takes a hit": it survives in place, gains an invulnerability window of
   * `cfg.gameplay.invulnerabilityFrames * speed` world-units, and passes
   * subsequent obstacles within that window harmlessly. After the window,
   * normal rules resume. A path fails only if it is forced into a SECOND hit
   * (hits >= 1 when another forced obstacle is reached outside the invuln
   * window), or if the entire hit-branch state set empties before the end.
   *
   * The hitless paths from #simulate are a strict subset — if isSolvable is
   * true, survivesOneHit is also true.
   *
   * @param {object} pattern
   * @param {object} [options]
   * @returns {boolean}
   */
  survivesOneHit(pattern, options = {}) {
    return this.#simulateRecovery(pattern, options).recoverable;
  }

  /**
   * Returns { recoverable, firstUnrecoverableOffset }.
   *
   * firstUnrecoverableOffset is the offset of the obstacle that forces the
   * second unavoidable hit, or null when the pattern is recoverable.
   *
   * @param {object} pattern
   * @param {object} [options]
   * @returns {{ recoverable: boolean, firstUnrecoverableOffset: number|null }}
   */
  analyzeRecovery(pattern, options = {}) {
    return this.#simulateRecovery(pattern, options);
  }

  // ── Simulation ─────────────────────────────────────────────────────────────

  #simulate(pattern, { speed = this.config.gameplay.startSpeed } = {}) {
    const timing = this.#timing(speed);
    const obstacles = pattern.items
      .filter(i => i.kind === 'obstacle')
      .sort((a, b) => a.offset - b.offset);

    if (obstacles.length === 0) {
      return { solvable: true, rejectionReason: null, finalStates: [] };
    }

    // State: { lane, airborne, landAt, crouching, crouchUntil, posAt }
    // posAt = -Infinity means the player can enter the pattern from any lane.
    let states = [-1, 0, 1].map(lane => ({
      lane, airborne: false, landAt: -Infinity,
      crouching: false, crouchUntil: -Infinity,
      posAt: -Infinity,
    }));

    for (const obs of obstacles) {
      states = this.#stepObstacle(states, obs, timing);
      if (states.length === 0) {
        const allLanes = obstacleSpansAllLanes(obs.type, obs.allLanes);
        const label = allLanes ? obs.type : `${obs.type ?? 'obstacle'} in lane ${obs.lane}`;
        return {
          solvable: false,
          rejectionReason: `No valid path at offset ${obs.offset} (${label})`,
          finalStates: [],
        };
      }
    }

    return { solvable: true, rejectionReason: null, finalStates: states };
  }

  /**
   * One-hit recovery simulation.
   *
   * State is extended with:
   *   hits        — number of hits taken so far (0 or 1; 2 = dead)
   *   invulnUntil — world offset at which invulnerability expires (-Infinity = not active)
   *
   * At each obstacle, for each state:
   *   1. If invulnUntil > obs.offset, the obstacle is passed through
   *      harmlessly (the player is still in the grace window).
   *   2. Otherwise, attempt all normal clear actions (same as #stepObstacle).
   *      If ANY clear action is valid, branch into those cleared states.
   *      If NO clear action is valid (forced hit):
   *        - If hits === 0: produce a single "took-a-hit" continuation with
   *          hits=1 and invulnUntil set. The state stays at the same lane/airborne.
   *        - If hits === 1: this path is dead (second forced hit).
   *
   * The pattern is recoverable iff at least one path survives to the end.
   */
  #simulateRecovery(pattern, { speed = this.config.gameplay.startSpeed } = {}) {
    const timing = this.#timing(speed);
    const invulnUnits = this.config.gameplay.invulnerabilityFrames * speed;

    const obstacles = pattern.items
      .filter(i => i.kind === 'obstacle')
      .sort((a, b) => a.offset - b.offset);

    if (obstacles.length === 0) {
      return { recoverable: true, firstUnrecoverableOffset: null };
    }

    // Recovery state adds: hits (0|1), invulnUntil (world offset).
    let states = [-1, 0, 1].map(lane => ({
      lane, airborne: false, landAt: -Infinity,
      crouching: false, crouchUntil: -Infinity,
      posAt: -Infinity,
      hits: 0, invulnUntil: -Infinity,
    }));

    for (const obs of obstacles) {
      const next = [];

      for (const s of states) {
        // ── Invulnerability pass-through ────────────────────────────────────
        // Within the grace window, the obstacle is harmless regardless of lane
        // or action; the player's physical state (airborne, crouching) carries
        // through unchanged.
        if (s.invulnUntil > obs.offset) {
          next.push({ ...s, posAt: obs.offset });
          continue;
        }

        // ── Attempt normal clear actions ────────────────────────────────────
        const cleared = this.#clearActions(s, obs, timing);

        if (cleared.length > 0) {
          // At least one valid dodge/jump/crouch — propagate those paths,
          // carrying over the existing hit count and (expired) invuln marker.
          for (const c of cleared) {
            next.push({ ...c, hits: s.hits, invulnUntil: s.invulnUntil });
          }
          continue;
        }

        // ── No valid clear action — forced hit ──────────────────────────────
        if (s.hits >= 1) {
          // Second forced hit on this path — it dies. Do not add to next.
          continue;
        }

        // First hit: survive in place with an invulnerability window.
        // Physical state is preserved (same lane, same vertical state).
        next.push({
          ...s,
          posAt: obs.offset,
          hits: 1,
          invulnUntil: obs.offset + invulnUnits,
        });
      }

      states = this.#dedupRecovery(next);
      if (states.length === 0) {
        return { recoverable: false, firstUnrecoverableOffset: obs.offset };
      }
    }

    return { recoverable: true, firstUnrecoverableOffset: null };
  }

  /**
   * Advances a set of states past a single obstacle, returning the cleared
   * successor states. Used by both #simulate and isCollectible.
   *
   * @param {object[]} states
   * @param {object} obs
   * @param {object} timing
   * @returns {object[]}
   */
  #stepObstacle(states, obs, timing) {
    const next = [];
    for (const s of states) {
      const cleared = this.#clearActions(s, obs, timing);
      for (const c of cleared) next.push(c);
    }
    return this.#dedup(next);
  }

  /**
   * Returns all valid successor states for a single state crossing a single
   * obstacle, using purely the hitless clear rules. Returns an empty array
   * when no clear action is available (forced hit in the hitless model).
   *
   * @param {object} s  — current state
   * @param {object} obs — obstacle item
   * @param {object} timing
   * @returns {object[]}
   */
  #clearActions(s, obs, timing) {
    const result = [];
    const rule = getObstacleRule(obs.type);
    const allLanes = obstacleSpansAllLanes(obs.type, obs.allLanes);

    const isAirborne = s.airborne && s.landAt > obs.offset;
    const isCrouching = s.crouching && s.crouchUntil > obs.offset;
    const elapsed = obs.offset - s.posAt;
    const shift = Math.min(
      2,
      Number.isFinite(elapsed) ? Math.floor(elapsed / timing.laneSwitchUnits) : 2,
    );
    const reachable = [-1, 0, 1].filter(lane => Math.abs(lane - s.lane) <= shift);

    if (rule.clearBy === 'crouch') {
      // Overhead hazards span the road. Jumping into one is not recoverable.
      if (isAirborne) return result;
      for (const lane of reachable) {
        result.push({
          lane, airborne: false, landAt: -Infinity,
          crouching: true,
          crouchUntil: isCrouching ? s.crouchUntil : obs.offset + timing.crouchHeldUnits,
          posAt: obs.offset,
        });
      }
      return result;
    }

    if (allLanes) {
      // A full-width ground hazard can only be cleared by jumping.
      if (rule.clearBy !== 'jump' || isCrouching) return result;
      for (const lane of reachable) {
        result.push({
          lane,
          airborne: true,
          landAt: isAirborne ? s.landAt : obs.offset + timing.jumpAirborneUnits,
          crouching: false,
          crouchUntil: -Infinity,
          posAt: obs.offset,
        });
      }
      return result;
    }

    for (const lane of reachable) {
      if (lane !== obs.lane) {
        // Dodge by occupying another lane. Preserve any active action.
        result.push({
          lane,
          airborne: isAirborne,
          landAt: isAirborne ? s.landAt : -Infinity,
          crouching: isCrouching,
          crouchUntil: isCrouching ? s.crouchUntil : -Infinity,
          posAt: obs.offset,
        });
        continue;
      }

      if (rule.clearBy === 'jump' && !isCrouching) {
        // Same-lane ground hazards can be jumped in runtime, including
        // ordinary wheat, bush, stone, wall, and mushroom obstacles.
        result.push({
          lane,
          airborne: true,
          landAt: isAirborne ? s.landAt : obs.offset + timing.jumpAirborneUnits,
          crouching: false,
          crouchUntil: -Infinity,
          posAt: obs.offset,
        });
      }
    }

    return result;
  }

  #timing(speed) {
    const cfg = this.config;
    const startSpeed = cfg.gameplay.startSpeed;
    const jumpAirborneFrames = Math.ceil((-2 * cfg.player.jumpVelocity) / cfg.player.gravity);
    return {
      laneSwitchUnits: BASE_LANE_SWITCH_UNITS * speed / startSpeed,
      jumpAirborneUnits: jumpAirborneFrames * speed,
      crouchHeldUnits: cfg.player.crouch.minHoldFrames * speed,
    };
  }

  #dedup(states) {
    const seen = new Set();
    return states.filter(s => {
      const key = `${s.lane}|${s.airborne ? 1 : 0}|${Math.round(s.landAt)}|${s.crouching ? 1 : 0}|${Math.round(s.crouchUntil)}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  }

  /**
   * Deduplication for recovery states. Extends the base key with hits and
   * the rounded invulnUntil offset so that hit/non-hit branches are kept
   * distinct, and paths with the same effective grace window are collapsed.
   */
  #dedupRecovery(states) {
    const seen = new Set();
    return states.filter(s => {
      const key = `${s.lane}|${s.airborne ? 1 : 0}|${Math.round(s.landAt)}|${s.crouching ? 1 : 0}|${Math.round(s.crouchUntil)}|${s.hits}|${Math.round(s.invulnUntil)}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  }
}
