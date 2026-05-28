import { clamp } from '../utils/math.js';

/**
 * Pure player actions — operate on a player entity's components.
 * These replace the methods that previously lived on the Player class.
 *
 * Each function returns a boolean / value, but does NOT touch the
 * EventBus, the EntityRegistry, or particle spawning. Side effects
 * (camera shake, particle bursts) are produced by callers that emit
 * events; EffectsSystem then spawns particles as the response.
 *
 * @typedef {import('./Entity.js').Entity} Entity
 */

/**
 * Step the player's target lane left/right within config bounds.
 * @param {Entity} player
 * @param {number} direction — -1 or +1
 * @param {object} cfg — config.player
 */
export function moveLane(player, direction, cfg) {
  const lane = player.components.LaneState;
  lane.targetLane = clamp(lane.targetLane + direction, cfg.minLane, cfg.maxLane);
}

/**
 * Start a jump unless the player is already airborne or locked in a
 * fresh crouch. Returns `true` if a jump was actually initiated.
 *
 * @param {Entity} player
 * @param {object} cfg — config.player
 * @returns {boolean}
 */
export function jump(player, cfg) {
  const vert = player.components.VerticalState;
  const crouch = player.components.CrouchState;
  if (vert.isJumping) return false;

  if (crouch.isCrouching) {
    if (crouch.crouchHoldFrames < cfg.crouch.minHoldFrames) return false;
    standUp(player);
  }

  vert.vy = cfg.jumpVelocity;
  vert.isJumping = true;
  vert.jumpHoldFrames = 0;
  vert.jumpStretch = 1;
  return true;
}

/**
 * Try to enter the crouch. Refused mid-jump or while already crouching.
 * Returns `true` if the player just transitioned into crouching.
 *
 * @param {Entity} player
 */
export function crouch(player) {
  const vert = player.components.VerticalState;
  const cr = player.components.CrouchState;
  if (vert.isJumping || cr.isCrouching) return false;
  cr.isCrouching = true;
  cr.crouchHoldFrames = 0;
  return true;
}

/**
 * Force the player back to a standing pose.
 * @param {Entity} player
 */
export function standUp(player) {
  const cr = player.components.CrouchState;
  cr.isCrouching = false;
  cr.crouchHoldFrames = 0;
}

/** Reset all transient motion state on the player entity. */
export function resetPlayer(player) {
  Object.assign(player.components.LaneState, { targetLane: 0, laneX: 0, laneTilt: 0 });
  Object.assign(player.components.VerticalState, {
    y: 0, vy: 0, isJumping: false, jumpHoldFrames: 0, jumpStretch: 0, landSquash: 0,
  });
  Object.assign(player.components.CrouchState, { isCrouching: false, crouchHoldFrames: 0 });
  Object.assign(player.components.AnimState, { runFrame: 0, idleTime: 0 });
  if (player.components.PlayerIntent) {
    Object.assign(player.components.PlayerIntent, { jumpBuffer: 0, crouchBuffer: 0 });
  }
  const health = player.components.Health;
  health.invulnerabilityFrames = 0;
  health.hitFlash = 0;
}
