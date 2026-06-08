import { GAME_CONFIG } from '../config/gameConfig.js';
import { EventBus } from './EventBus.js';
import { AssetManager } from './AssetManager.js';
import { InputManager } from './InputManager.js';
import { GameLoop } from './GameLoop.js';
import { Leaderboard } from './Leaderboard.js';
import { PlayerStats } from './PlayerStats.js';
import { AdaptiveQuality } from './AdaptiveQuality.js';
import { TutorialOverlay } from './TutorialOverlay.js';
import { SettingsMenu } from './SettingsMenu.js';
import { ShareSystem } from './ShareSystem.js';
import { DailyChallenge } from './DailyChallenge.js';
import { Achievements } from './Achievements.js';
import { UINavigator } from './UINavigator.js';
import { SoundSystem } from './SoundSystem.js';
import { Telemetry } from './Telemetry.js';
import { Projection } from '../world/Projection.js';
import { World } from '../world/World.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { HudSystem } from '../systems/HudSystem.js';
import { RENDERER_STRATEGY } from '../render/RendererContract.js';
import { ThreeSceneRenderer } from '../render/renderers/three/ThreeSceneRenderer.js';

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
    this.leaderboard = new Leaderboard(
      this.config.gameplay.leaderboardKey,
      this.config.gameplay.leaderboardCapacity,
    );
    this.playerStats = new PlayerStats(this.config.gameplay.statsKey);
    this.adaptiveQuality = new AdaptiveQuality();
    this.tutorial = new TutorialOverlay(this.config.gameplay.tutorialSeenKey);
    this.share = new ShareSystem({ canvas });
    this.daily = new DailyChallenge({
      baseKey: this.config.gameplay.dailyLeaderboardKey,
      capacity: this.config.gameplay.leaderboardCapacity,
    });
    this.achievements = new Achievements({
      storageKey: this.config.gameplay.achievementsKey,
      eventBus: this.eventBus,
      playerStats: this.playerStats,
    });
    this.uiNav = new UINavigator();
    this.sound = new SoundSystem({ eventBus: this.eventBus });
    this.telemetry = new Telemetry({ eventBus: this.eventBus });
    this.world = new World(this.config, this.projection, this.eventBus, {
      seed: options.seed,
      leaderboard: this.leaderboard,
      playerStats: this.playerStats,
      adaptiveQuality: this.adaptiveQuality,
      share: this.share,
    });
    const rendererOptions = {
      pixelRatio: options.pixelRatio ?? this.config.canvas.pixelRatio,
      roadStyle: options.roadStyle,
      blockStyle: options.blockStyle,
      playerVoxelEnabled: options.playerVoxelEnabled,
      // Debug-only render-cost counters (?perf=1). null in production.
      metrics: this.config.debug?.renderMetrics === true,
    };
    this.rendererStrategy = options.rendererStrategy === RENDERER_STRATEGY.threeScene
      ? RENDERER_STRATEGY.threeScene
      : RENDERER_STRATEGY.canvas2d;
    this.renderer = this.rendererStrategy === RENDERER_STRATEGY.threeScene
      ? new ThreeSceneRenderer(canvas, this.assets, this.projection, {
        pixelRatio: rendererOptions.pixelRatio,
        mode: options.threeMode ?? '3d',
      })
      : new RenderSystem(canvas, this.assets, this.projection, rendererOptions);
    this.settings = new SettingsMenu({
      storageKey: this.config.gameplay.settingsKey,
      world: this.world,
      renderer: this.renderer,
      adaptiveQuality: this.adaptiveQuality,
      playerStats: this.playerStats,
      leaderboard: this.leaderboard,
      tutorial: this.tutorial,
      achievements: this.achievements,
      sound: this.sound,
      defaultBlockStyle: this.renderer.blockStyle,
      defaultPlayerVoxel: this.renderer.playerVoxelEnabled,
    });
    // Late-wire sound ↔ settings so the SFX toggle works immediately.
    this.sound.settings = this.settings;
    this.hud = new HudSystem(this.eventBus, this.world);

    // Combo tier-up → trigger pulse in EffectsRenderer (visual-only;
    // when audio lands the same event can play the sting).
    this.eventBus.on('comboChanged', (snap) => {
      if (snap?.reason === 'bump' && snap.multiplier > 1) {
        this.renderer.effectsRenderer?.triggerComboPulse?.(snap.multiplier);
      }
    });
    // v3.4 milestone flash — reuse the combo-pulse renderer slot. The
    // multiplier value is just label text; passing 0 makes the renderer
    // skip the ×N badge but still paint the gold vignette.
    this.eventBus.on('effects:milestoneFlash', () => {
      this.renderer.effectsRenderer?.triggerComboPulse?.(0);
    });
    // v4.0 — collect bloom flash on flower / rare pickup.
    // Projects the player's current screen position as the bloom centre.
    const _triggerCollectBloom = (force = false) => () => {
      const eff = this.renderer.effectsRenderer;
      if (!eff) return;
      const proj = this.projection;
      const player = this.world.player;
      if (!player) { eff.triggerCollectFlash(proj.width / 2, proj.groundY - 80, { force }); return; }
      const laneX = player.components.LaneState.laneX;
      const vertY  = player.components.VerticalState.y;
      const bm     = this.config.player.bottomMargin ?? 0;
      const sx = proj.width / 2 + laneX * proj.visualLaneWidth;
      const sy = proj.groundY - bm + vertY - 60;
      eff.triggerCollectFlash(sx, sy, { force });
    };
    this.eventBus.on('flower:collected', _triggerCollectBloom(false));
    this.eventBus.on('rare:collected',   _triggerCollectBloom(true));

    // Tutorial overlay must not linger after the run ends or is paused —
    // it would sit on top of the death/pause UI and capture screen real
    // estate. Cancel + un-mark-seen so it replays on the next fresh start.
    this.eventBus.on('stateChanged', (state) => {
      if ((state === 'dead' || state === 'paused') && this.tutorial && !this.tutorial.hasBeenSeen()) {
        this.tutorial.cancel();
        this.tutorial.clearSeen();
      }
    });
    this.loop = new GameLoop({
      update: (delta) => this.#update(delta),
      render: () => this.#render(),
    });
  }

  async boot() {
    this.renderer.resizeToViewport(this.config.canvas.viewportPadding);
    // rAF-throttle the resize handler — `resize` fires per-pixel during
    // orientationchange / window drag (≥20 events on iOS rotation, hundreds
    // during desktop drag). Coalescing to once per animation frame avoids
    // running getBoundingClientRect → restyle ×N times without dropping the
    // final size.
    let pendingResize = false;
    window.addEventListener('resize', () => {
      if (pendingResize) return;
      pendingResize = true;
      requestAnimationFrame(() => {
        pendingResize = false;
        this.renderer.resizeToViewport(this.config.canvas.viewportPadding);
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.world.state === 'playing') this.world.pause();
    });

    this.settings.bind();
    this.#bindDailyButton();
    this.#registerUiScenes();
    this.hud.bindStart(() => {
      if (this.world.state === 'paused') {
        this.world.resume();
        return;
      }
      // Restore regular leaderboard if a daily run just ended.
      this.#restoreRegularLeaderboard();
      this.world.start();
      this.tutorial.run().catch((err) => console.warn('[Tutorial]', err));
    });
    this.hud.bindPause(() => {
      if (this.world.state === 'playing') this.world.pause();
      else if (this.world.state === 'paused') this.world.resume();
    });

    const loadingEl = document.getElementById('loading');
    const loadingFill = document.getElementById('loading-fill');
    const loadingLabel = document.getElementById('loading-label');
    await this.assets.loadAll(this.config.assets, {
      onProgress: ({ loaded, total }) => {
        if (!loadingFill) return;
        const pct = total > 0 ? Math.floor((loaded / total) * 100) : 100;
        loadingFill.style.width = `${pct}%`;
        if (loadingLabel) loadingLabel.textContent = `Loading ${loaded} / ${total}`;
      },
    });
    if (loadingEl) {
      loadingEl.classList.remove('on');
      // Remove after the CSS transition so it stops capturing pointer events.
      setTimeout(() => loadingEl.remove(), 420);
    }
    this.eventBus.emit('stateChanged', this.world.state);
    if (this.debug.autostart) this.startDebugRun();
    this.loop.start();
  }

  startDebugRun() {
    this.debug.freezeUpdates = false;
    // Debug entry skips the 3-2-1-GO so spawn / physics start ticking
    // immediately — tests expect spawns within the first second.
    this.world.start({ skipCountdown: true });
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
    // Read live frame-time from the loop (set on the previous tick) so
    // AdaptiveQuality can step quality up/down before the next render.
    this.adaptiveQuality.observe(this.world, this.loop.metrics.frameDeltaMs);
    // UI gamepad navigator polls AFTER world.update so it sees the same
    // pad state without re-reading; it's a no-op when no overlay is on.
    this.uiNav.poll();
  }

  #render() {
    this.renderer.render(this.world);
  }

  /**
   * "Daily Challenge" button: re-seed the world RNG and swap the
   * leaderboard for the day-scoped one, then start. Tutorial is skipped
   * — players hitting this button have already played at least once.
   */
  #bindDailyButton() {
    const btn = document.getElementById('daily-button');
    if (!btn) return;
    btn.addEventListener('click', () => {
      // Lock today's YMD so the seed + submission stay consistent even if
      // the run crosses midnight (see DailyChallenge.lockForRun).
      this.daily.lockForRun();
      this.world.dailyMode = true;
      this.world.leaderboard = this.daily.getLeaderboard();
      // Reseed BOTH streams so a daily run is fully reproducible: gameplay on
      // the day's seed, decor on the matching distinct sub-seed (mirrors the
      // World-constructor derivation so the streams stay isolated).
      this.world.rng.reseed(this.daily.seedForToday());
      this.world.decorRng.reseed(`${this.daily.seedForToday()}:decor`);
      this.world.start();
    });
  }

  #restoreRegularLeaderboard() {
    if (this.world.dailyMode) {
      this.world.dailyMode = false;
      this.world.leaderboard = this.leaderboard;
      this.daily.unlockYmd();
    }
  }

  /**
   * Tell UINavigator which DOM containers represent navigable scenes.
   *
   * Order matters: scenes registered LATER win when multiple are visible.
   * Settings sits on top of the main menu / death overlay, so register
   * the overlay first and the settings modal last.
   */
  #registerUiScenes() {
    this.uiNav.attachWorld(this.world);
    const overlayEl = document.getElementById('overlay');
    const settingsEl = document.getElementById('settings-modal');
    if (overlayEl) {
      this.uiNav.registerScene('overlay', overlayEl, {
        // Overlay has no inherent "back": pressing B on the menu does
        // nothing; on the death screen it would just close — but then
        // the game is dead, so leave as no-op (player picks Run Again).
        onBack: null,
        autoFocus: true,
      });
    }
    if (settingsEl) {
      this.uiNav.registerScene('settings', settingsEl, {
        onBack: () => this.settings.hide(),
        autoFocus: true,
      });
    }
  }
}
