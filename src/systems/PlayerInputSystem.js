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
    input.pollGamepad();

    // Pause / start / restart are consumed by GameStateSystem — we leave
    // them in place. Movement inputs are only meaningful while playing.
    if (world.state !== 'playing') return;
    const player = world.player;
    if (!player) return;

    const cfg = world.config.player;
    if (input.consume('moveLeft')) PlayerActions.moveLane(player, -1, cfg);
    if (input.consume('moveRight')) PlayerActions.moveLane(player, 1, cfg);

    if (input.consume('jump')) {
      if (PlayerActions.jump(player, cfg)) {
        this.eventBus.emit('camera:shake', 1.8);
        this.eventBus.emit('player:jumped', null);
      }
    }

    if (input.consume('crouchDown')) {
      if (PlayerActions.crouch(player)) {
        this.eventBus.emit('camera:shake', 0.9);
      }
    }
  }
}
