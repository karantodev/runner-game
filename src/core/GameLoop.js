export class GameLoop {
  #lastTime = 0;
  #rafId = 0;

  constructor({ update, render }) {
    this.update = update;
    this.render = render;
  }

  start() {
    const tick = (time) => {
      const delta = this.#lastTime === 0 ? 1 : Math.min(2, (time - this.#lastTime) / 16.6667);
      this.#lastTime = time;
      this.update(delta);
      this.render();
      this.#rafId = requestAnimationFrame(tick);
    };
    this.#rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.#rafId) cancelAnimationFrame(this.#rafId);
  }
}
