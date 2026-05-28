export class DifficultyDirector {
  get(world) {
    const level = this.#level(world);
    return {
      level,
      patternSpacing: this.#patternSpacing(level, world.speed),
      orchidSpacing: this.#orchidSpacing(level),
    };
  }

  #level({ score, timeAlive }) {
    if (score >= 150 || timeAlive >= 2000) return 4;
    if (score >= 100 || timeAlive >= 1200) return 3;
    if (score >= 50 || timeAlive >= 600) return 2;
    return 1;
  }

  // Scale by current speed so faster play still gives fair reaction time.
  #patternSpacing(level, speed) {
    const specs = [[46, 18], [38, 16], [30, 14], [22, 12]];
    const [base, jitter] = specs[level - 1];
    return (base + Math.random() * jitter) * Math.max(1, speed / 0.9);
  }

  #orchidSpacing(level) {
    const specs = [[30, 18], [27, 16], [23, 12], [19, 10]];
    const [base, jitter] = specs[level - 1];
    return base + Math.random() * jitter;
  }
}
