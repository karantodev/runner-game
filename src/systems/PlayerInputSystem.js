import * as PlayerActions from '../ecs/playerActions.js';

/**
 * Consumes edge-actions from the InputManager and translates them into
 * player-entity component mutations + a camera-shake event. State
 * changes (pause/resume/start) are handled separately by GameStateSystem.
 */
export class PlayerInputSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  update(world, _delta) {
    const input = world.input;
    // Note: world.update() calls input.pollGamepad() once at the top of
    // every frame, so no second poll is needed here.

    // Pause / start / restart are consumed by GameStateSystem — we leave
    // them in place. Movement inputs are only meaningful while playing.
    if (world.state !== 'playing') return;
    const player = world.player;
    if (!player) return;

    const cfg = world.config.player;
    if (input.consume('moveLeft')) this.#tryLaneSwitch(player, -1, cfg);
    if (input.consume('moveRight')) this.#tryLaneSwitch(player, 1, cfg);

    const intent = player.components.PlayerIntent;

    if (input.consume('jump')) {
      if (PlayerActions.jump(player, cfg)) {
        intent.jumpBuffer = 0;
        this.eventBus.emit('camera:shake', 1.8);
        this.eventBus.emit('player:jumped', null);
      } else {
        // Refused (airborne, or crouch-locked) — buffer the intent so it
        // fires the moment the gate opens (land + crouch dwell expires).
        intent.jumpBuffer = cfg.jumpBufferFrames;
      }
    }

    if (input.consume('crouchDown')) {
      if (PlayerActions.crouch(player)) {
        intent.crouchBuffer = 0;
        this.eventBus.emit('camera:shake', 0.9);
        // M5-F: wire the (already-defined) CROUCH sfx via its event. Sound
        // only — no gameplay effect and no RNG. Silent until the .ogg ships.
        this.eventBus.emit('player:crouch', null);
      } else {
        // Crouch refused mid-jump — buffer for the landing.
        intent.crouchBuffer = cfg.crouchBufferFrames;
      }
    }
  }

  /**
   * Step a lane and emit `player:laneSwitch` iff the targetLane actually
   * changed. Holding into a wall (already at min/max lane) is a no-op and
   * must NOT fire the skid-particle effect.
   */
  #tryLaneSwitch(player, direction, cfg) {
    const lane = player.components.LaneState;
    const before = lane.targetLane;
    PlayerActions.moveLane(player, direction, cfg);
    if (lane.targetLane !== before) {
      this.eventBus.emit('player:laneSwitch', { direction, laneX: lane.laneX });
    }
  }
}
