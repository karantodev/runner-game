/**
 * Player Finite State Machine — the single source of truth for which
 * high-level state the player occupies.
 *
 * WHY this exists: historically, player pose was tracked as a soup of
 * boolean flags spread across VerticalState and CrouchState. Any reader
 * of those flags was also a potential writer, making it impossible to
 * reason about valid state combinations or add transition guards in one
 * place.  The FSM fixes that without touching the flags themselves:
 *
 *   • `PlayerState.current` is the authoritative state label.
 *   • `transitionTo` is the ONLY place that mutates `isJumping` and
 *     `isCrouching`.  Renderers, collision, trail, and particles continue
 *     to read those flags directly — they had no mutation authority before
 *     and they still don't after.
 *   • All other systems that previously wrote the flags are migrated to
 *     call `transitionTo` instead.  If a transition is disallowed, the
 *     flags are left unchanged and the caller receives `false`.
 *
 * @module playerFsm
 */

/**
 * Exhaustive set of named player states.
 * @type {Readonly<{running:string, laneChanging:string, jumping:string, crouching:string, hit:string, dead:string}>}
 */
export const PLAYER_STATES = Object.freeze({
  running: 'running',
  laneChanging: 'laneChanging',
  jumping: 'jumping',
  crouching: 'crouching',
  hit: 'hit',
  dead: 'dead',
});

/**
 * Explicit transition table.  Each key is a source state; its value is
 * the set of states reachable from it.
 *
 * Design notes:
 *   - `laneChanging` is only reachable from / back-to `running` because
 *     lane interpolation is purely a ground-movement variant.
 *   - `hit` is reachable from any non-dead state; the player can be hit
 *     mid-jump or mid-crouch.
 *   - `dead` is terminal — no state may transition out of it through
 *     `transitionTo`; `resetPlayer` re-seeds `PlayerState` directly.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const TRANSITIONS = Object.freeze({
  [PLAYER_STATES.running]:      Object.freeze([PLAYER_STATES.laneChanging, PLAYER_STATES.jumping, PLAYER_STATES.crouching, PLAYER_STATES.hit, PLAYER_STATES.dead]),
  // laneChanging is a ground-movement variant of running — the player can
  // still jump or crouch during a lane swap (vertical affordances are
  // independent of horizontal interpolation).  Omitting these targets caused
  // jump/crouch inputs fired on the first frame after a lane-tap to be
  // silently swallowed with false-success feedback.
  [PLAYER_STATES.laneChanging]: Object.freeze([PLAYER_STATES.running, PLAYER_STATES.jumping, PLAYER_STATES.crouching, PLAYER_STATES.hit, PLAYER_STATES.dead]),
  [PLAYER_STATES.jumping]:      Object.freeze([PLAYER_STATES.running, PLAYER_STATES.laneChanging, PLAYER_STATES.hit, PLAYER_STATES.dead]),
  [PLAYER_STATES.crouching]:    Object.freeze([PLAYER_STATES.running, PLAYER_STATES.hit, PLAYER_STATES.dead]),
  [PLAYER_STATES.hit]:          Object.freeze([PLAYER_STATES.running, PLAYER_STATES.laneChanging, PLAYER_STATES.jumping, PLAYER_STATES.crouching, PLAYER_STATES.dead]),
  [PLAYER_STATES.dead]:         Object.freeze([]),
});

/**
 * Attempt to move the player entity into `next`.
 *
 * On success:
 *   (a) `PlayerState.current` is updated.
 *   (b) The derived legacy flags `VerticalState.isJumping` and
 *       `CrouchState.isCrouching` are synchronised here and ONLY here.
 *       Callers must NOT mutate those flags directly — they exist only so
 *       the ~dozen downstream readers (renderers, collision, trail) require
 *       zero changes.
 *
 * Returns `false` if the transition is not in the allowed set, leaving
 * all components unchanged.
 *
 * @param {import('./Entity.js').Entity} player
 * @param {string} next — one of PLAYER_STATES values
 * @returns {boolean}
 */
export function transitionTo(player, next) {
  const ps = player.components.PlayerState;
  if (!ps) return false;

  const current = ps.current;
  if (current === next) return true; // already there, idempotent

  const allowed = TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) return false;

  ps.current = next;

  // Synchronise derived flags — the authoritative mutation point.
  const vert  = player.components.VerticalState;
  const crouch = player.components.CrouchState;

  switch (next) {
    case PLAYER_STATES.jumping:
      vert.isJumping   = true;
      crouch.isCrouching = false;
      break;
    case PLAYER_STATES.crouching:
      vert.isJumping   = false;
      crouch.isCrouching = true;
      break;
    case PLAYER_STATES.running:
    case PLAYER_STATES.laneChanging:
      vert.isJumping   = false;
      crouch.isCrouching = false;
      break;
    case PLAYER_STATES.hit:
      // Physical pose (airborne / crouching) is retained during the hit
      // stun — only the FSM label changes so renderers can show the hit
      // animation overlay without forcing a land or a stand-up.
      break;
    case PLAYER_STATES.dead:
      vert.isJumping   = false;
      crouch.isCrouching = false;
      break;
    default:
      break;
  }

  return true;
}
