import { GAME_CONFIG } from '../config/gameConfig.js';
import { PerformanceHUD } from '../core/PerformanceHUD.js';
import { GamepadDebugOverlay } from '../core/GamepadDebugOverlay.js';
import {
  debugState,
  installDebugPanel,
  installErrorCollector,
  createDebugApi,
  updateDebugPanel,
} from './debugPanel.js';
import { setupModeSwitch } from './modeSwitcher.js';

export async function initDebugTools(game, canvas, params, options) {
  const {
    debugEnabled,
    autostart,
    freezeFrame,
    pixelRatioChoice,
    debugAllowed,
    sceneryQaEnabled,
  } = options;

  debugState.enabled = debugEnabled;
  debugState.autostart = autostart;
  debugState.freezeFrame = freezeFrame;

  // Scenery QA Sheet integration — gated on debugAllowed only, so
  // `?sceneryQa=1` works without the full debug toolchain.
  let sceneryQaController = null;
  const bootReady = options.bootReady;

  async function ensureSceneryQaSheet() {
    if (!debugAllowed) return null;
    await bootReady;
    if (!sceneryQaController) {
      const { createSceneryQaSheet } = await import('./SceneryQaSheet.js');
      sceneryQaController = createSceneryQaSheet({
        game,
        initialFilter: params.get('sceneryQaFilter') ?? '',
        initialGroup: params.get('sceneryQaGroup') ?? 'all',
        initialOpen: false,
      });
      window.__ORCHID_SCENERY_QA__ = sceneryQaController;
      if (window.__ORCHID_DEBUG__) {
        window.__ORCHID_DEBUG__.openSceneryQaSheet = openSceneryQaSheet;
        window.__ORCHID_DEBUG__.toggleSceneryQaSheet = toggleSceneryQaSheet;
        window.__ORCHID_DEBUG__.getSceneryQaState = () => sceneryQaController?.getState() ?? null;
      }
    }
    return sceneryQaController;
  }

  async function openSceneryQaSheet() {
    const controller = await ensureSceneryQaSheet();
    return controller?.open() ?? null;
  }

  async function toggleSceneryQaSheet(force) {
    const controller = await ensureSceneryQaSheet();
    return controller?.toggle(force) ?? null;
  }

  let debugApi = null;
  if (debugEnabled) {
    debugApi = createDebugApi(game, canvas);
    window.__ORCHID_DEBUG__ = debugApi;
    debugApi.openSceneryQaSheet = openSceneryQaSheet;
    debugApi.toggleSceneryQaSheet = toggleSceneryQaSheet;
    debugApi.getSceneryQaState = () => sceneryQaController?.getState() ?? null;

    window.__ORCHID_GAME__ = game;

    installErrorCollector(game);
    installDebugPanel(game, debugApi);
    new PerformanceHUD(game, { pixelRatioChoice });

    window.addEventListener('keydown', (event) => {
      if (event.code !== 'F8') return;
      event.preventDefault();
      debugApi.captureCanvas().catch((error) => {
        console.error('[Orchid Debug] capture failed', error);
      });
    });

    if (GAME_CONFIG.debug.showPlayerStates) {
      const { installPlayerStatesMode } = await import('./playerStates.js');
      installPlayerStatesMode(game, debugApi);
    }

    if (params.get('gamepadDebug') === '1') {
      new GamepadDebugOverlay();
    }

    setupModeSwitch(game);

    window.addEventListener('orchid:blockStyleChanged', () => updateDebugPanel(game));
    window.addEventListener('orchid:playerVoxelChanged', () => updateDebugPanel(game));
  }

  if (sceneryQaEnabled) {
    await openSceneryQaSheet();
  }

  return debugApi;
}
