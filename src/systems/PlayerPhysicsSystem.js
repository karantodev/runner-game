import { damp } from '../utils/math.js';
import { standUp } from '../ecs/playerActions.js';

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
        standUp(player);
      }
    }

    anim.runFrame += world.speed * 0.7 * delta;
    anim.idleTime += delta;
    vert.jumpStretch = Math.max(0, vert.jumpStretch - 0.11 * delta);
    vert.landSquash = Math.max(0, vert.landSquash - 0.12 * delta);

    const health = player.components.Health;
    health.invulnerabilityFrames = Math.max(0, health.invulnerabilityFrames - delta);
    health.hitFlash = Math.max(0, health.hitFlash - 0.09 * delta);
  }
}
