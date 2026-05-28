export class PowerUpSystem {
  constructor(config, eventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.reset();
  }

  reset() {
    this.speedBurstFrames = 0;
    this.splitClonesFrames = 0;
  }

  update(delta) {
    const hadSpeed = this.isSpeedBurstActive();
    const hadSplit = this.isSplitClonesActive();

    this.speedBurstFrames = Math.max(0, this.speedBurstFrames - delta);
    this.splitClonesFrames = Math.max(0, this.splitClonesFrames - delta);

    if (hadSpeed !== this.isSpeedBurstActive() || hadSplit !== this.isSplitClonesActive()) {
      this.eventBus.emit('powerUpsChanged', this.snapshot());
    }
  }

  activate(type) {
    if (type === 'speed-burst') {
      this.speedBurstFrames = this.config.powerUps.speedBurst.durationFrames;
      this.eventBus.emit('powerUpActivated', { type, label: 'Speed Burst' });
    }

    if (type === 'split-clones') {
      this.splitClonesFrames = this.config.powerUps.splitClones.durationFrames;
      this.eventBus.emit('powerUpActivated', { type, label: 'Split Clones' });
    }

    // Used by EffectsSystem for the activation burst.
    this.eventBus.emit('powerup:activated', { type });
    this.eventBus.emit('powerUpsChanged', this.snapshot());
  }

  speedMultiplier() {
    return this.isSpeedBurstActive() ? this.config.powerUps.speedBurst.speedMultiplier : 1;
  }

  isSpeedBurstActive() {
    return this.speedBurstFrames > 0;
  }

  isSplitClonesActive() {
    return this.splitClonesFrames > 0;
  }

  snapshot() {
    return {
      speedBurstFrames: Math.ceil(this.speedBurstFrames),
      splitClonesFrames: Math.ceil(this.splitClonesFrames),
      speedBurstActive: this.isSpeedBurstActive(),
      splitClonesActive: this.isSplitClonesActive(),
    };
  }
}
