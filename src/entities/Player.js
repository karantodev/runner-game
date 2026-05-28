import { clamp, damp } from '../utils/math.js';
import { spawnParticle } from './Particle.js';

export class Player {
  constructor(config) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.targetLane = 0;
    this.laneX = 0;
    this.y = 0;
    this.vy = 0;
    this.isJumping = false;
    this.jumpHoldFrames = 0;
    this.runFrame = 0;
    this.idleTime = 0;
    this.laneTilt = 0;
    this.jumpStretch = 0;
    this.landSquash = 0;
    this.isCrouching = false;
    this.crouchHoldFrames = 0;
  }

  moveLane(direction) {
    this.targetLane = clamp(this.targetLane + direction, this.config.minLane, this.config.maxLane);
  }

  jump(particles, groundY, laneWidth, centerX) {
    if (this.isJumping) return false;
    // Jumping cancels a crouch — but only after the minimum dwell, otherwise
    // an accidental Up tap right after Down would let the player escape an
    // overhang frame instead of taking the duck.
    if (this.isCrouching) {
      if (this.crouchHoldFrames < this.config.crouch.minHoldFrames) return false;
      this.standUp();
    }
    this.vy = this.config.jumpVelocity;
    this.isJumping = true;
    this.jumpHoldFrames = 0;
    this.jumpStretch = 1;

    if (particles) {
      for (let i = 0; i < 10; i++) {
        particles.push(spawnParticle({
          x: centerX + this.laneX * laneWidth,
          y: groundY + 4,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 3 - 1,
          life: 24,
          radius: 3 + Math.random() * 3,
          color: 'rgba(200,170,120,0.8)',
        }));
      }
    }
    return true;
  }

  /**
   * Try to start crouching. Refused while airborne (you cannot duck mid-jump).
   * Returns true if the crouch state was newly entered.
   */
  crouch() {
    if (this.isJumping) return false;
    if (this.isCrouching) return false;
    this.isCrouching = true;
    this.crouchHoldFrames = 0;
    return true;
  }

  standUp() {
    this.isCrouching = false;
    this.crouchHoldFrames = 0;
  }

  update({ delta, speed, jumpHeld, crouchHeld, particles, groundY, laneWidth, centerX }) {
    let landed = false;
    const previousLaneX = this.laneX;
    this.laneX = damp(this.laneX, this.targetLane, 10.5 * this.config.laneLerp, delta);
    const laneVelocity = this.laneX - previousLaneX;
    this.laneTilt = damp(this.laneTilt, laneVelocity * 12, 10, delta);

    if (this.isJumping) {
      if (jumpHeld && this.jumpHoldFrames < this.config.maxJumpHoldFrames && this.vy < 0) {
        this.vy += this.config.jumpHoldBoost * delta;
        this.jumpHoldFrames += delta;
      }

      this.vy += this.config.gravity * delta;
      this.y += this.vy * delta;

      if (this.y >= 0) {
        this.y = 0;
        this.vy = 0;
        this.isJumping = false;
        this.landSquash = 1;
        landed = true;
        if (particles) {
          for (let i = 0; i < 10; i++) {
            particles.push(spawnParticle({
              x: centerX + this.laneX * laneWidth + (Math.random() - 0.5) * 30,
              y: groundY,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 2,
              life: 18,
              radius: 2 + Math.random() * 2,
              color: 'rgba(200,170,120,0.7)',
            }));
          }
        }
      }
    }

    if (this.isCrouching) {
      this.crouchHoldFrames += delta;
      // Stand up only after the minimum dwell has elapsed AND the input is
      // no longer held — keeps swipe-down (no hold) usable on touch.
      if (!crouchHeld && this.crouchHoldFrames >= this.config.crouch.minHoldFrames) {
        this.standUp();
      }
    }

    this.runFrame += speed * 0.7 * delta;
    this.idleTime += delta;
    this.jumpStretch = Math.max(0, this.jumpStretch - 0.11 * delta);
    this.landSquash = Math.max(0, this.landSquash - 0.12 * delta);
    return { landed };
  }
}
