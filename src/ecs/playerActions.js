import { clamp } from '../utils/math.js';
import { transitionTo, PLAYER_STATES } from './playerFsm.js';

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
  const next = clamp(lane.targetLane + direction, cfg.minLane, cfg.maxLane);
  if (next === lane.targetLane) return; // clamped at the road edge — no swap
  lane.targetLane = next;
  // Open the laneChanging window for the FSM (and the collision forgiveness
  // keyed on it). Stamped only on a real lane step so mashing into the road
  // edge never re-arms forgiveness.
  lane.laneChangeFramesLeft = cfg.fsm.laneChangeWindowFrames;
}

/**
 * Start a jump unless the player is already airborne or locked in a
 * fresh crouch. Returns `true` if a jump was actually initiated.
 *
 * Guards (isJumping check, crouchHoldFrames dwell) remain here so
 * callers see the same boolean contract as before; `transitionTo` then
 * synchronises the derived flags in one authoritative place.
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
    // Stand up before jumping — resets isCrouching via FSM.
    standUp(player);
  }

  // Attempt the FSM transition first; apply physics impulse only on success
  // so a rejected transition (disallowed state) never leaves orphaned vy/stretch
  // mutations.  transitionTo syncs isJumping = true on the same call.
  if (!transitionTo(player, PLAYER_STATES.jumping)) return false;
  vert.vy = cfg.jumpVelocity;
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
  // Guards checked here so callers get the same boolean as before.
  if (vert.isJumping || cr.isCrouching) return false;
  // Attempt the FSM transition first; apply side effects only on success so
  // a rejected transition never leaves an orphaned crouchHoldFrames reset.
  if (!transitionTo(player, PLAYER_STATES.crouching)) return false;
  cr.crouchHoldFrames = 0;
  return true;
}

/**
 * Force the player back to a standing pose.
 * @param {Entity} player
 */
export function standUp(player) {
  const cr = player.components.CrouchState;
  // Reset the hold counter regardless; FSM handles the flag.
  cr.crouchHoldFrames = 0;
  transitionTo(player, PLAYER_STATES.running);
}

/** Reset all transient motion state on the player entity. */
export function resetPlayer(player) {
  Object.assign(player.components.LaneState, {
    targetLane: 0, laneX: 0, laneTilt: 0, laneChangeFramesLeft: 0,
  });
  Object.assign(player.components.VerticalState, {
    y: 0, vy: 0, isJumping: false, jumpHoldFrames: 0, jumpStretch: 0, landSquash: 0,
  });
  Object.assign(player.components.CrouchState, { isCrouching: false, crouchHoldFrames: 0 });
  Object.assign(player.components.AnimState, { runFrame: 0, idleTime: 0 });
  if (player.components.PlayerIntent) {
    Object.assign(player.components.PlayerIntent, { jumpBuffer: 0, crouchBuffer: 0 });
  }
  // Re-seed the FSM directly (bypasses the transition guard because `dead`
  // has no allowed outgoing transitions — this is the only valid exit path).
  if (player.components.PlayerState) {
    player.components.PlayerState.current = PLAYER_STATES.running;
    player.components.PlayerState.hitFramesLeft = 0;
  }
  const health = player.components.Health;
  health.invulnerabilityFrames = 0;
  health.hitFlash = 0;
}
