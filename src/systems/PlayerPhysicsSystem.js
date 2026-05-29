import { damp } from '../utils/math.js';
import * as PlayerActions from '../ecs/playerActions.js';

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
    const input = world.input;

    const previousLaneX = lane.laneX;
    lane.laneX = damp(lane.laneX, lane.targetLane, 10.5 * cfg.laneLerp, delta);
    const laneVelocity = lane.laneX - previousLaneX;
    lane.laneTilt = damp(lane.laneTilt, laneVelocity * 12, 10, delta);

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
        vert.isJumping = false;
        vert.landSquash = 1;
        this.eventBus.emit('player:landed', { laneX: lane.laneX });
      }
    }

    if (crouch.isCrouching) {
      crouch.crouchHoldFrames += delta;
      const crouchHeld = input.isHeld('crouchHeld');
      if (!crouchHeld && crouch.crouchHoldFrames >= cfg.crouch.minHoldFrames) {
        PlayerActions.standUp(player);
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
        this.eventBus.emit('camera:shake', 1.8);
        this.eventBus.emit('player:jumped', null);
      } else if (intent.jumpBuffer <= 0) {
        intent.jumpBuffer = 0;
      }
    }
    if (intent.crouchBuffer > 0) {
      intent.crouchBuffer -= delta;
      if (intent.crouchBuffer > 0 && PlayerActions.crouch(player)) {
        intent.crouchBuffer = 0;
        this.eventBus.emit('camera:shake', 0.9);
      } else if (intent.crouchBuffer <= 0) {
        intent.crouchBuffer = 0;
      }
    }

    // v3.4 anim-rate cap: at full speed-burst (×1.58) the legs spin
    // 1.4× too fast and look comical. Clamp the per-frame increment so
    // the run cycle never exceeds ~16 fps of animation regardless of
    // gameplay speed. Trail ghosts read the same field so this also
    // tames the burst-trail tempo.
    const animRate = Math.min(world.speed, 1.15) * 0.7;
    anim.runFrame += animRate * delta;
    anim.idleTime += delta;
    vert.jumpStretch = Math.max(0, vert.jumpStretch - 0.11 * delta);
    vert.landSquash = Math.max(0, vert.landSquash - 0.12 * delta);

    const health = player.components.Health;
    health.invulnerabilityFrames = Math.max(0, health.invulnerabilityFrames - delta);
    health.hitFlash = Math.max(0, health.hitFlash - 0.09 * delta);

    this.#updateTrail(world, lane, vert, crouch, anim);
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
