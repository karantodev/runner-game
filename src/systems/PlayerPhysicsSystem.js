import { damp } from '../utils/math.js';
import * as PlayerActions from '../ecs/playerActions.js';
import { transitionTo, PLAYER_STATES } from '../ecs/playerFsm.js';

/**
 * Per-frame player physics: lane interpolation, jump physics with hold-
 * boost, gravity, landing detection, crouch hold timer, anim phase, and
 * the damped lane-tilt / stretch / squash visual states.
 *
 * Emits:
 *   - player:landed → triggers landing camera shake + dust particles
 */
export class PlayerPhysicsSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  update(world, delta) {
    if (world.state !== 'playing') return;
    const player = world.player;
    if (!player) return;

    const cfg = world.config.player;
    const lane = player.components.LaneState;
    const vert = player.components.VerticalState;
    const crouch = player.components.CrouchState;
    const anim = player.components.AnimState;
    const ps = player.components.PlayerState;
    const input = world.input;

    const previousLaneX = lane.laneX;
    lane.laneX = damp(lane.laneX, lane.targetLane, cfg.feel.laneDamp * cfg.laneLerp, delta);
    const laneVelocity = lane.laneX - previousLaneX;
    lane.laneTilt = damp(lane.laneTilt, laneVelocity * cfg.feel.laneTiltGain, cfg.feel.laneTiltDamp, delta);
    lane.laneChangeFramesLeft = Math.max(0, lane.laneChangeFramesLeft - delta);

    // ── Hit-stun countdown ────────────────────────────────────────────────
    // Decrement before physics so the recovery transition happens at the
    // right frame boundary.  Uses a dedicated counter so the hit window is
    // independent of invulnerabilityFrames (which drives sprite flicker).
    if (ps && ps.current === PLAYER_STATES.hit) {
      ps.hitFramesLeft = Math.max(0, ps.hitFramesLeft - delta);
      if (ps.hitFramesLeft <= 0) {
        // Recover to the physical state that matches current component values.
        const recovered = vert.isJumping ? PLAYER_STATES.jumping
          : crouch.isCrouching          ? PLAYER_STATES.crouching
          : this.#laneChanging(lane) ? PLAYER_STATES.laneChanging
          : PLAYER_STATES.running;
        transitionTo(player, recovered);
      }
    }

    if (vert.isJumping) {
      const jumpHeld = input.isHeld('jumpHeld');
      if (jumpHeld && vert.jumpHoldFrames < cfg.maxJumpHoldFrames && vert.vy < 0) {
        vert.vy += cfg.jumpHoldBoost * delta;
        vert.jumpHoldFrames += delta;
      }
      vert.vy += cfg.gravity * delta;
      vert.y += vert.vy * delta;

      if (vert.y >= 0) {
        vert.y = 0;
        vert.vy = 0;
        vert.landSquash = 1;
        // Do not exit 'hit' on landing while the hit-stun countdown is still
        // active — the existing countdown recovery in the block above picks the
        // post-hit state once hitFramesLeft reaches 0.  Physics still runs so
        // the player lands correctly; only the FSM label is held.
        if (!(ps && ps.current === PLAYER_STATES.hit && ps.hitFramesLeft > 0)) {
          // Landing: choose between laneChanging and running based on whether
          // the player is still interpolating toward the target lane.
          const landedState = this.#laneChanging(lane)
            ? PLAYER_STATES.laneChanging
            : PLAYER_STATES.running;
          // transitionTo also clears isJumping via derived-flag sync.
          transitionTo(player, landedState);
        }
        this.eventBus.emit('player:landed', { laneX: lane.laneX });
      }
    }

    if (crouch.isCrouching) {
      crouch.crouchHoldFrames += delta;
      const crouchHeld = input.isHeld('crouchHeld');
      // Do not auto-stand while hit-stun countdown is active — the countdown
      // recovery block above selects the post-hit pose once hitFramesLeft hits 0.
      const inHitStun = ps && ps.current === PLAYER_STATES.hit && ps.hitFramesLeft > 0;
      if (!crouchHeld && crouch.crouchHoldFrames >= cfg.crouch.minHoldFrames && !inHitStun) {
        // standUp routes through transitionTo → running; laneTilt decides
        // whether we briefly become laneChanging on the same frame — the
        // laneChanging check in the block below handles that.
        PlayerActions.standUp(player);
      }
    }

    // ── Lane-change FSM transitions ───────────────────────────────────────
    // Only reachable from / back-to running; hit/jump/crouch take priority.
    // Skip while hit-stun is counting down — the countdown recovery block
    // above already selects the correct post-hit motion state.
    if (ps && !(ps.current === PLAYER_STATES.hit && ps.hitFramesLeft > 0)) {
      const state = ps.current;
      if (state === PLAYER_STATES.running && this.#laneChanging(lane)) {
        transitionTo(player, PLAYER_STATES.laneChanging);
      } else if (state === PLAYER_STATES.laneChanging && !this.#laneChanging(lane)) {
        transitionTo(player, PLAYER_STATES.running);
      }
    }

    // ── Input buffers ──────────────────────────────────────────────────────
    // Decrement first, then try to flush. Buffer survives one frame after
    // a successful flush only because the counter is set to 0 explicitly.
    const intent = player.components.PlayerIntent;
    if (intent.jumpBuffer > 0) {
      intent.jumpBuffer -= delta;
      if (intent.jumpBuffer > 0 && PlayerActions.jump(player, cfg)) {
        intent.jumpBuffer = 0;
        this.eventBus.emit('camera:shake', cfg.feel.jumpShake);
        this.eventBus.emit('player:jumped', null);
      } else if (intent.jumpBuffer <= 0) {
        intent.jumpBuffer = 0;
      }
    }
    if (intent.crouchBuffer > 0) {
      intent.crouchBuffer -= delta;
      if (intent.crouchBuffer > 0 && PlayerActions.crouch(player)) {
        intent.crouchBuffer = 0;
        this.eventBus.emit('camera:shake', cfg.feel.crouchShake);
      } else if (intent.crouchBuffer <= 0) {
        intent.crouchBuffer = 0;
      }
    }

    // v3.4 anim-rate cap: at full speed-burst (×1.58) the legs spin
    // 1.4× too fast and look comical. Clamp the per-frame increment so
    // the run cycle never exceeds ~16 fps of animation regardless of
    // gameplay speed. Trail ghosts read the same field so this also
    // tames the burst-trail tempo.
    const animRate = Math.min(world.speed, cfg.feel.animRateCap) * cfg.feel.animRateScale;
    anim.runFrame += animRate * delta;
    anim.idleTime += delta;
    vert.jumpStretch = Math.max(0, vert.jumpStretch - cfg.feel.jumpStretchDecay * delta);
    vert.landSquash = Math.max(0, vert.landSquash - cfg.feel.landSquashDecay * delta);

    const health = player.components.Health;
    health.invulnerabilityFrames = Math.max(0, health.invulnerabilityFrames - delta);
    health.hitFlash = Math.max(0, health.hitFlash - cfg.feel.hitFlashDecay * delta);

    this.#updateTrail(world, lane, vert, crouch, anim);
  }

  /**
   * Returns true while the laneChanging window opened by moveLane is
   * still counting down (see LaneState.laneChangeFramesLeft).
   *
   * @param {object} lane — LaneState component
   * @returns {boolean}
   */
  #laneChanging(lane) {
    return lane.laneChangeFramesLeft > 0;
  }

  /**
   * Motion-trail ghost spawning during speed-burst. Snapshots come from
   * `world.playerTrailPool` so an active burst (~120 spawns over 360
   * frames) does not allocate fresh objects — without the pool this was
   * the dominant GC source during a run.
   */
  #updateTrail(world, lane, vert, crouch, anim) {
    const trail = world.playerTrail;
    const pool = world.playerTrailPool;
    // Decay + reap dead entries in a single pass (compact-in-place,
    // returning expired snapshots to the pool).
    let write = 0;
    for (let read = 0; read < trail.length; read += 1) {
      const ghost = trail[read];
      ghost.life -= 1;
      if (ghost.life > 0) trail[write++] = ghost;
      else pool.release(ghost);
    }
    trail.length = write;
    // Spawn a fresh ghost every TRAIL_INTERVAL frames while burst is hot.
    if (!world.powerUpSystem.isSpeedBurstActive()) return;
    if (trail.length >= MAX_TRAIL) return;
    if (Math.floor(world.timeAlive) % TRAIL_INTERVAL !== 0) return;
    const g = pool.acquire();
    g.laneX = lane.laneX;
    g.y = vert.y;
    g.runFrame = anim.runFrame;
    g.crouching = crouch.isCrouching;
    g.life = TRAIL_LIFE;
    g.maxLife = TRAIL_LIFE;
    trail.push(g);
  }
}

const MAX_TRAIL = 8;
const TRAIL_LIFE = 12;
const TRAIL_INTERVAL = 3;
