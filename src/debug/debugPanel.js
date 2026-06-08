import { ASSET_SEMANTICS } from '../config/assetSemantics.js';

export const debugState = {
  enabled: false,
  autostart: false,
  freezeFrame: false,
  errors: [],
  lastCapture: null,
  errorCountNode: null,
  captureNode: null,
  blockStyleNode: null,
  playerStyleNode: null,
  rendererNode: null,
};

export function updateDebugPanel(game) {
  if (debugState.errorCountNode) {
    debugState.errorCountNode.textContent = `Errors: ${debugState.errors.length}`;
  }
  if (debugState.captureNode) {
    debugState.captureNode.textContent = debugState.lastCapture
      ? `Last capture: ${debugState.lastCapture.path.split('/').pop()}`
      : 'Last capture: none';
  }
  if (debugState.blockStyleNode) {
    debugState.blockStyleNode.textContent = `Blocks: ${game.renderer.blockStyle === 'voxel' ? '3D cubes' : '2D sprites'}`;
  }
  if (debugState.playerStyleNode) {
    const active = game.renderer.blockStyle === 'voxel' && game.renderer.playerVoxelEnabled;
    debugState.playerStyleNode.textContent = `Farmer: ${active ? '3D voxel' : '2D sprite'}`;
  }
  if (debugState.rendererNode) {
    debugState.rendererNode.textContent = `Renderer: ${game.rendererStrategy}`;
  }
}

export function recordDebugError(kind, payload, game) {
  debugState.errors.push({
    kind,
    timestamp: new Date().toISOString(),
    ...payload,
  });
  updateDebugPanel(game);
}

export function installDebugPanel(game, debugApi) {
  if (!debugState.enabled) return;

  const panel = document.createElement('aside');
  panel.id = 'debug-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: '1000',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px',
    borderRadius: '12px',
    background: 'rgba(10, 20, 32, 0.88)',
    color: '#dfefff',
    font: '12px/1.3 monospace',
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
  });

  const title = document.createElement('div');
  title.textContent = 'ORCHID DEBUG';
  title.style.fontWeight = '700';
  panel.appendChild(title);

  const mode = document.createElement('div');
  mode.textContent = `Mode: ${debugState.autostart ? 'auto-run' : 'manual'}`;
  panel.appendChild(mode);

  debugState.errorCountNode = document.createElement('div');
  panel.appendChild(debugState.errorCountNode);

  debugState.captureNode = document.createElement('div');
  panel.appendChild(debugState.captureNode);

  debugState.rendererNode = document.createElement('div');
  panel.appendChild(debugState.rendererNode);

  debugState.blockStyleNode = document.createElement('div');
  panel.appendChild(debugState.blockStyleNode);

  debugState.playerStyleNode = document.createElement('div');
  panel.appendChild(debugState.playerStyleNode);

  const captureButton = document.createElement('button');
  captureButton.type = 'button';
  captureButton.textContent = 'Capture PNG';
  captureButton.addEventListener('click', () => {
    debugApi.captureCanvas().catch((error) => {
      console.error('[Orchid Debug] capture failed', error);
    });
  });
  panel.appendChild(captureButton);

  const restartButton = document.createElement('button');
  restartButton.type = 'button';
  restartButton.textContent = 'Restart Frame';
  restartButton.addEventListener('click', () => {
    if (debugState.autostart) game.startDebugRun();
    else game.world.start();
  });
  panel.appendChild(restartButton);

  const blocksButton = document.createElement('button');
  blocksButton.type = 'button';
  blocksButton.textContent = 'Toggle 2D / 3D Blocks';
  blocksButton.addEventListener('click', () => {
    game.settings.toggleBlockStyle();
    updateDebugPanel(game);
  });
  panel.appendChild(blocksButton);

  const sceneryQaButton = document.createElement('button');
  sceneryQaButton.type = 'button';
  sceneryQaButton.textContent = 'Toggle Scenery QA';
  sceneryQaButton.addEventListener('click', async () => {
    sceneryQaButton.disabled = true;
    try {
      await debugApi.toggleSceneryQaSheet();
    } catch (error) {
      console.error('[Orchid Debug] scenery QA toggle failed', error);
    } finally {
      sceneryQaButton.disabled = false;
    }
  });
  panel.appendChild(sceneryQaButton);

  for (const button of [captureButton, restartButton, blocksButton, sceneryQaButton]) {
    Object.assign(button.style, {
      padding: '6px 8px',
      border: '0',
      borderRadius: '8px',
      cursor: 'pointer',
      background: '#8fe35e',
      color: '#11210b',
      font: 'inherit',
      fontWeight: '700',
    });
  }

  document.body.appendChild(panel);
  updateDebugPanel(game);
}

export function installErrorCollector(game) {
  if (!debugState.enabled) return;

  window.addEventListener('error', (event) => {
    recordDebugError('error', {
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, game);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? { message: event.reason.message, stack: event.reason.stack }
      : { message: String(event.reason) };
    recordDebugError('unhandledrejection', reason, game);
  });

  // World emits 'system:failure' via EventBus instead of touching window globals.
  game.world?.eventBus?.on('system:failure', (payload) => {
    recordDebugError('system_failure', payload, game);
  });
}

export function createDebugApi(game, canvas) {
  return {
    errors: debugState.errors,
    async captureCanvas(filename = `orchid-quest-runstate-${Date.now()}.png`) {
      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch('/__debug/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename }),
      });
      if (!response.ok) throw new Error(`Capture save failed: ${response.status}`);
      const payload = await response.json();
      debugState.lastCapture = payload;
      updateDebugPanel(game);
      console.log('[Orchid Debug] capture saved', payload.path);
      return payload;
    },
    captureDataUrl() {
      return canvas.toDataURL('image/png');
    },
    startDebugRun() {
      if (debugState.autostart) game.startDebugRun();
      else game.world.start({ skipCountdown: true });
    },
    resumeLiveUpdates() {
      game.resumeDebugRun();
    },
    getState() {
      const r = game.world.registry;
      let obstacles = 0;
      let collectibles = 0;
      let scenery = 0;
      for (const _ of r.query('Hitbox')) obstacles += 1;
      for (const _ of r.query('CollectibleData')) collectibles += 1;
      for (const _ of r.query('ScenicData')) scenery += 1;
      return {
        worldState: game.world.state,
        distanceRun: game.world.distanceRun,
        score: game.world.score,
        obstacles,
        collectibles,
        scenery,
        pooledEntities: r.freeCount,
        rendererStrategy: game.rendererStrategy,
        rendererKind: game.renderer.kind ?? game.rendererStrategy,
        threeMode: game.renderer.mode ?? null,
        blockStyle: game.renderer.blockStyle,
        playerVoxelEnabled: game.renderer.playerVoxelEnabled,
        placementViolations: game.world.placement?.violations ?? 0,
        compositionViolations: game.world.placement?.compositionViolations ?? 0,
        lastCapture: debugState.lastCapture,
        errors: debugState.errors,
      };
    },
    getSpawnLog() {
      return [...game.world.spawnSystem.spawnLog];
    },
    getBlockStyle() {
      return game.renderer.blockStyle;
    },
    getPlayerVoxelEnabled() {
      return game.renderer.playerVoxelEnabled;
    },
    setPlayerVoxelEnabled(enabled) {
      const next = game.renderer.setPlayerVoxelEnabled(enabled);
      updateDebugPanel(game);
      return next;
    },
    setBlockStyle(style) {
      const next = game.settings.setBlockStyle(style);
      updateDebugPanel(game);
      return next;
    },
    toggleBlockStyle() {
      const next = game.settings.toggleBlockStyle();
      updateDebugPanel(game);
      return next;
    },
    recordDebugError(kind, payload) {
      return recordDebugError(kind, payload, game);
    },
    async runPatternTests() {
      const { runPatternTests } = await import('../systems/spawn/PatternTests.js');
      const results = runPatternTests();
      console.info('[PatternTests]', results.summary);
      return results;
    },
    compositionReport() {
      const r = game.world.registry;
      const byCategory = new Map();
      const byAssetType = new Map();
      const invalid = [];
      const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
      for (const e of r.query('Sprite')) {
        const sprite = e.components.Sprite;
        const assetType = sprite.assetType ?? sprite.type;
        const semantic = ASSET_SEMANTICS[assetType];
        const category = semantic?.category ?? 'unknown';
        bump(byCategory, category);
        bump(byAssetType, assetType);
        if (!semantic) {
          invalid.push({ assetType, reason: 'NEEDS_SEMANTIC_CLASSIFICATION' });
        }
      }
      const placement = game.world.placement;
      const errors = placement?.recentPrefabErrors ?? [];
      const errorsByKind = new Map();
      for (const e of errors) bump(errorsByKind, e.kind);
      const sortedAssetTypes = [...byAssetType.entries()].sort((a, b) => b[1] - a[1]);
      const registeredAssetTypes = Object.keys(ASSET_SEMANTICS);
      const usedAssetTypes = new Set(byAssetType.keys());
      const leastUsedRegistered = registeredAssetTypes
        .filter((k) => !usedAssetTypes.has(k))
        .sort();
      const report = {
        timestamp: new Date().toISOString(),
        totalEntities: [...byAssetType.values()].reduce((a, b) => a + b, 0),
        placementViolations: placement?.violations ?? 0,
        compositionViolations: placement?.compositionViolations ?? 0,
        prefabErrorsByKind: Object.fromEntries(errorsByKind),
        recentPrefabErrors: errors,
        byCategory: Object.fromEntries(byCategory),
        mostUsedAssetTypes: Object.fromEntries(sortedAssetTypes.slice(0, 10)),
        leastUsedRegisteredAssets: leastUsedRegistered.slice(0, 20),
        invalid,
      };
      console.info('[compositionReport]', report);
      console.table(report.byCategory);
      if (Object.keys(report.prefabErrorsByKind).length) console.table(report.prefabErrorsByKind);
      return report;
    },
  };
}
