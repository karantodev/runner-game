import { GAME_CONFIG } from '../../config/gameConfig.js';
import { getObstacleRule, obstacleSpansAllLanes } from '../../ecs/obstacleRules.js';

// The current lane interpolation reaches a safe offset in roughly nine frames
// at base speed. Scale the required world distance with speed so validation
// remains frame-accurate when the runner accelerates.
const BASE_LANE_SWITCH_UNITS = 8;

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
      const next = [];
      const rule = getObstacleRule(obs.type);
      const allLanes = obstacleSpansAllLanes(obs.type, obs.allLanes);

      for (const s of states) {
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
          if (isAirborne) continue;
          for (const lane of reachable) {
            next.push({
              lane, airborne: false, landAt: -Infinity,
              crouching: true,
              crouchUntil: isCrouching ? s.crouchUntil : obs.offset + timing.crouchHeldUnits,
              posAt: obs.offset,
            });
          }
          continue;
        }

        if (allLanes) {
          // A full-width ground hazard can only be cleared by jumping.
          if (rule.clearBy !== 'jump' || isCrouching) continue;
          for (const lane of reachable) {
            next.push({
              lane,
              airborne: true,
              landAt: isAirborne ? s.landAt : obs.offset + timing.jumpAirborneUnits,
              crouching: false,
              crouchUntil: -Infinity,
              posAt: obs.offset,
            });
          }
          continue;
        }

        for (const lane of reachable) {
          if (lane !== obs.lane) {
            // Dodge by occupying another lane. Preserve any active action.
            next.push({
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
            next.push({
              lane,
              airborne: true,
              landAt: isAirborne ? s.landAt : obs.offset + timing.jumpAirborneUnits,
              crouching: false,
              crouchUntil: -Infinity,
              posAt: obs.offset,
            });
          }
        }
      }

      states = this.#dedup(next);
      if (states.length === 0) {
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
}
