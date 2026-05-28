import { GAME_CONFIG } from '../config/gameConfig.js';
import { EventBus } from './EventBus.js';
import { AssetManager } from './AssetManager.js';
import { InputManager } from './InputManager.js';
import { GameLoop } from './GameLoop.js';
import { Projection } from '../world/Projection.js';
import { World } from '../world/World.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { HudSystem } from '../systems/HudSystem.js';

export class Game {
  constructor(canvas, options = {}) {
    this.config = GAME_CONFIG;
    this.canvas = canvas;
    this.options = options;
    this.debug = {
      autostart: Boolean(options.autostart),
      freezeFrame: Boolean(options.freezeFrame),
      captureSteps: Math.max(0, options.captureSteps ?? 12),
      freezeUpdates: false,
    };
    this.eventBus = new EventBus();
    this.assets = new AssetManager();
    this.input = new InputManager(canvas);
    this.projection = new Projection(this.config.projection, this.config.canvas);
    this.world = new World(this.config, this.projection, this.eventBus, { seed: options.seed });
    this.renderer = new RenderSystem(canvas, this.assets, this.projection);
    this.hud = new HudSystem(this.eventBus, this.world);
    this.loop = new GameLoop({
      update: (delta) => this.#update(delta),
      render: () => this.#render(),
    });
  }

  async boot() {
    this.renderer.resizeToViewport(this.config.canvas.viewportPadding);
    window.addEventListener('resize', () => this.renderer.resizeToViewport(this.config.canvas.viewportPadding));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.world.state === 'playing') this.world.pause();
    });

    this.hud.bindStart(() => {
      if (this.world.state === 'paused') this.world.resume();
      else this.world.start();
    });
    this.hud.bindPause(() => {
      if (this.world.state === 'playing') this.world.pause();
      else if (this.world.state === 'paused') this.world.resume();
    });

    await this.assets.loadAll(this.config.assets);
    this.eventBus.emit('stateChanged', this.world.state);
    if (this.debug.autostart) this.startDebugRun();
    this.loop.start();
  }

  startDebugRun() {
    this.debug.freezeUpdates = false;
    this.world.start();
    this.hud.overlay.classList.remove('on');
    if (!this.debug.freezeFrame) return;

    for (let step = 0; step < this.debug.captureSteps; step += 1) {
      this.world.update(this.input, 1);
    }

    this.debug.freezeUpdates = true;
    this.hud.tick();
    this.renderer.render(this.world);
  }

  resumeDebugRun() {
    this.debug.freezeUpdates = false;
    if (this.world.state === 'paused') this.world.resume();
  }

  #update(delta) {
    if (this.debug.freezeUpdates) {
      this.hud.tick();
      return;
    }
    this.world.update(this.input, delta);
    this.hud.tick();
  }

  #render() {
    this.renderer.render(this.world);
  }
}
