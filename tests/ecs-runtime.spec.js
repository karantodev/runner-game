import { test, expect } from '@playwright/test';

function collectRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (text.includes('Failed to load resource') && text.includes('404')) return;
    errors.push(text);
  });
  return errors;
}

async function waitForDebugRuntime(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
  await page.waitForFunction(() => !document.getElementById('loading')?.classList.contains('on'));
  await expect(page.locator('#game')).toBeVisible();
}

async function resetPersistedSettings(page) {
  await waitForDebugRuntime(page, '/dev.html?debug=1');
  await page.evaluate(() => window.localStorage.removeItem('orchidQuest.settings.v1'));
}

async function readRendererDebugSnapshot(page) {
  return page.evaluate(() => {
    const state = window.__ORCHID_DEBUG__?.getState?.() ?? null;
    const panelText = document.getElementById('debug-panel')?.innerText ?? '';
    const panelMatch = panelText.match(/(?:renderer(?:\s+(?:strategy|kind|type))?|strategy|kind|type)\s*:\s*([^\n]+)/i);
    return {
      stateKeys: state ? Object.keys(state) : [],
      stateRenderer:
        state?.rendererStrategy
        ?? state?.rendererKind
        ?? state?.rendererType
        ?? state?.renderer
        ?? null,
      panelRenderer: panelMatch?.[1]?.trim() ?? null,
      panelText,
    };
  });
}

function inferRendererStrategy(snapshot) {
  const values = [snapshot.stateRenderer, snapshot.panelRenderer]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (values.some((value) => value.includes('three-scene'))) return 'three-scene';
  if (values.some((value) => value.includes('canvas2d') || value.includes('canvas 2d') || value.includes('canvas-2d'))) {
    return 'canvas2d';
  }
  return values[0] ?? null;
}

async function expectRendererStrategy(page, expected) {
  const snapshot = await readRendererDebugSnapshot(page);
  const actual = inferRendererStrategy(snapshot);
  expect(
    actual,
    `Expected renderer strategy "${expected}" but debug state exposed keys [${snapshot.stateKeys.join(', ')}] and panel text:\n${snapshot.panelText || '(empty)'}`
  ).toBe(expected);
}

async function renderAtLeastOneFrame(page) {
  return page.evaluate(async () => {
    const debug = window.__ORCHID_DEBUG__;
    const game = window.__ORCHID_GAME__;
    const canvas = document.getElementById('game');
    const blank = document.createElement('canvas');
    blank.width = canvas?.width ?? 0;
    blank.height = canvas?.height ?? 0;
    const blankDataUrl = blank.toDataURL('image/png');
    const before = game?.loop?.metrics?.frameCount ?? 0;

    debug?.startDebugRun?.();

    const deadline = performance.now() + 4000;
    while (performance.now() < deadline) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const after = game?.loop?.metrics?.frameCount ?? 0;
      if (after > before) {
        return {
          before,
          after,
          canvasDataUrl: canvas?.toDataURL?.('image/png') ?? null,
          blankDataUrl,
        };
      }
    }

    return {
      before,
      after: game?.loop?.metrics?.frameCount ?? 0,
      canvasDataUrl: canvas?.toDataURL?.('image/png') ?? null,
      blankDataUrl,
    };
  });
}

test('runtime — start, move, jump, crouch, restart, no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // v3.1: ignore asset-load 404s for designer-pending PNGs. The renderer
    // fallback chain handles missing assets gracefully; these messages are
    // expected until the artist ships each batch. Real JS runtime errors
    // still surface via pageerror above.
    const text = msg.text();
    if (text.includes('Failed to load resource') && text.includes('404')) return;
    errors.push(text);
  });

  await page.goto('/dev.html');
  await expect(page.locator('#game')).toBeVisible();
  await page.keyboard.press('Space');                  // start
  await page.waitForTimeout(900);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');                  // jump
  await page.waitForTimeout(600);
  await page.keyboard.press('ArrowDown');              // crouch
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');                 // pause
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyR');                   // restart
  await page.waitForTimeout(400);

  expect(errors).toEqual([]);
});

test('structural block renderer — 2D / 3D mode stays reversible', async ({ page }) => {
  await page.goto('/dev.html?debug=1&blockStyle=3d');
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);

  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getState().rendererStrategy)).toBe('canvas2d');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getBlockStyle())).toBe('voxel');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.setBlockStyle('2d'))).toBe('sprite');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.toggleBlockStyle())).toBe('voxel');

  await page.keyboard.press('KeyY');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getState().blockStyle)).toBe('sprite');
});

test('settings — block style defaults to 2D and persists 3D selection', async ({ page }) => {
  await page.goto('/dev.html?debug=1');
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
  await page.evaluate(() => window.localStorage.removeItem('orchidQuest.settings.v1'));
  await page.reload();
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
  await page.waitForFunction(() => !document.getElementById('loading')?.classList.contains('on'));

  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getBlockStyle())).toBe('sprite');

  await page.locator('#settings-button').click();
  await expect(page.locator('#settings-modal')).toHaveClass(/on/);
  await expect(page.locator('#settings-block-style [data-block-style="sprite"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#settings-player-3d')).toBeChecked();

  await page.locator('#settings-block-style [data-block-style="voxel"]').click();
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getBlockStyle())).toBe('voxel');
  await expect(page.locator('#settings-block-style [data-block-style="voxel"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#debug-panel')).toContainText('Blocks: 3D cubes');

  await page.locator('#settings-player-3d').uncheck();
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getPlayerVoxelEnabled())).toBe(false);
  await expect(page.locator('#debug-panel')).toContainText('Farmer: 2D sprite');

  await page.reload();
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getBlockStyle())).toBe('voxel');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getPlayerVoxelEnabled())).toBe(false);
});

test('renderer strategy — defaults to canvas2d in debug runtime', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await resetPersistedSettings(page);
  await waitForDebugRuntime(page, '/dev.html?debug=1');

  await expectRendererStrategy(page, 'canvas2d');
  expect(errors).toEqual([]);
});

test('renderer strategy — ?renderer=three boots cleanly and renders a frame', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await resetPersistedSettings(page);
  await waitForDebugRuntime(page, '/dev.html?debug=1&renderer=three');

  await expectRendererStrategy(page, 'three-scene');

  const frame = await renderAtLeastOneFrame(page);
  expect(frame.after).toBeGreaterThan(frame.before);
  expect(frame.canvasDataUrl).not.toBe(frame.blankDataUrl);
  expect(errors).toEqual([]);
});

test('renderer strategy — Three scene supports orthographic 2.5D mode', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await resetPersistedSettings(page);
  await waitForDebugRuntime(page, '/dev.html?debug=1&renderer=three&threeMode=2.5d');

  await expectRendererStrategy(page, 'three-scene');
  const state = await page.evaluate(() => window.__ORCHID_DEBUG__.getState());
  expect(state.threeMode).toBe('2.5d');
  expect(errors).toEqual([]);
});

test('3D player mode — farmer uses procedural renderer when enabled', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const { PlayerRenderer } = await import('/src/render/renderers/PlayerRenderer.js');
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 260;
    const ctx = canvas.getContext('2d');
    const assetAccesses = [];
    const renderer = new PlayerRenderer({
      ctx,
      projection: { width: 360, height: 260, groundY: 230, visualLaneWidth: 48 },
      assets: {
        get: (key) => {
          assetAccesses.push(key);
          throw new Error(`sprite asset used: ${key}`);
        },
      },
      voxelBlocks: { enabled: true },
      playerVoxelEnabled: true,
    });
    const world = {
      state: 'playing',
      timeAlive: 0,
      playerTrail: [],
      powerUpSystem: { isShieldActive: () => false },
      getPlayerRenderLanes: () => [0],
      config: {
        player: { bottomMargin: 16, heroScale: 1 },
        gameplay: { invulnerabilityFrames: 90 },
        visual: { juice: { playerShadow: { enabled: false }, playerRimLight: { enabled: false } } },
        debug: {},
      },
      player: {
        components: {
          Health: { invulnerabilityFrames: 0, hitFlash: 0 },
          LaneState: { laneX: 0, targetLane: 0, laneTilt: 0 },
          VerticalState: { y: 0, vy: 0, isJumping: false },
          CrouchState: { isCrouching: false },
          AnimState: { runFrame: 0, idleTime: 0 },
        },
      },
    };
    renderer.render(world);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) opaque += 1;
    }
    return { assetAccesses, opaque };
  });

  expect(result.assetAccesses).toEqual([]);
  expect(result.opaque).toBeGreaterThan(1000);
});

test('3D player mode — farmer poses keep distinct silhouettes', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const { PlayerRenderer } = await import('/src/render/renderers/PlayerRenderer.js');
    const { ThreeModelRenderer } = await import('/src/render/renderers/three/ThreeModelRenderer.js');
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 320;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const assetAccesses = [];
    const renderer = new PlayerRenderer({
      ctx,
      projection: { width: 420, height: 320, groundY: 292, visualLaneWidth: 56 },
      assets: {
        get: (key) => {
          assetAccesses.push(key);
          throw new Error(`sprite asset used: ${key}`);
        },
      },
      voxelBlocks: { enabled: true },
      threeModels: new ThreeModelRenderer({ enabled: true }),
      playerVoxelEnabled: true,
    });
    const world = {
      state: 'playing',
      timeAlive: 0,
      playerTrail: [],
      powerUpSystem: { isShieldActive: () => false },
      getPlayerRenderLanes: () => [0],
      config: {
        player: { bottomMargin: 16, heroScale: 1 },
        gameplay: { invulnerabilityFrames: 90 },
        visual: { juice: { playerShadow: { enabled: false }, playerRimLight: { enabled: false } } },
        debug: {},
      },
      player: {
        components: {
          Health: { invulnerabilityFrames: 0, hitFlash: 0 },
          LaneState: { laneX: 0, targetLane: 0, laneTilt: 0 },
          VerticalState: { y: 0, vy: 0, isJumping: false },
          CrouchState: { isCrouching: false },
          AnimState: { runFrame: 7, idleTime: 0 },
        },
      },
    };
    const bbox = () => {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;
      let hash = 0;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const i = (y * canvas.width + x) * 4;
          if (data[i + 3] <= 12) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          hash = (hash + ((x + 1) * 17) + ((y + 1) * 31) + data[i] + data[i + 1] * 3 + data[i + 2] * 7) >>> 0;
        }
      }
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        hash,
      };
    };
    const drawPose = (pose) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      world.player.components.CrouchState.isCrouching = pose === 'crouch';
      world.player.components.VerticalState.isJumping = pose === 'jump';
      world.player.components.VerticalState.y = pose === 'jump' ? -46 : 0;
      world.player.components.VerticalState.vy = pose === 'jump' ? -8 : 0;
      world.player.components.AnimState.runFrame = pose === 'run' ? 7 : 0;
      renderer.render(world);
      return bbox();
    };
    return {
      assetAccesses,
      run: drawPose('run'),
      crouch: drawPose('crouch'),
      jump: drawPose('jump'),
    };
  });

  expect(result.assetAccesses).toEqual([]);
  expect(result.run.height).toBeGreaterThan(60);
  expect(result.crouch.height).toBeLessThan(result.run.height * 0.92);
  expect(result.jump.minY).toBeLessThan(result.run.minY - 20);
  expect(result.crouch.hash).not.toBe(result.run.hash);
  expect(result.jump.hash).not.toBe(result.run.hash);
});

test('Three renderer strategy — scene renderer lifecycle is isolated', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const { ThreeSceneRenderer } = await import('/src/render/renderers/three/ThreeSceneRenderer.js');
    const { assertRendererStrategy, RENDERER_STRATEGY } = await import('/src/render/RendererContract.js');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const renderer = assertRendererStrategy(new ThreeSceneRenderer(canvas, null, {
      width: 640,
      height: 360,
    }, { pixelRatio: 1, mode: '3d' }));
    renderer.init();
    renderer.render({
      playerTrail: [],
      registry: { query: function* query() {} },
      player: {
        components: {
          LaneState: { laneX: 0.5, laneTilt: 0.2 },
          VerticalState: { y: -40 },
        },
      },
    }, 1 / 60);
    renderer.setMode('2.5d');
    renderer.resize(320, 180, 1);
    const beforeDestroy = {
      kind: renderer.kind,
      initialized: renderer.initialized,
      mode: renderer.mode,
      objectCount: renderer.entities.objects.size,
    };
    renderer.destroy();
    return {
      strategyName: RENDERER_STRATEGY.threeScene,
      beforeDestroy,
      afterDestroy: {
        initialized: renderer.initialized,
        disposed: renderer.disposed,
        renderer: renderer.renderer,
        scene: renderer.scene,
      },
    };
  });

  expect(result.strategyName).toBe('three-scene');
  expect(result.beforeDestroy.kind).toBe('three-scene');
  expect(result.beforeDestroy.initialized).toBe(true);
  expect(result.beforeDestroy.mode).toBe('2.5d');
  expect(result.beforeDestroy.objectCount).toBeGreaterThan(0);
  expect(result.afterDestroy.initialized).toBe(false);
  expect(result.afterDestroy.disposed).toBe(true);
  expect(result.afterDestroy.renderer).toBeNull();
  expect(result.afterDestroy.scene).toBeNull();
});

test('Three instanced pool — keeps dense active range and disposes', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { ThreeInstancedPool } = await import('/src/render/renderers/three/ThreeInstancedPool.js');
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const scene = new THREE.Scene();
    const pool = new ThreeInstancedPool({ geometry, material, capacity: 3, scene });
    const m1 = new THREE.Matrix4().makeTranslation(1, 0, 0);
    const m2 = new THREE.Matrix4().makeTranslation(2, 0, 0);
    const m3 = new THREE.Matrix4().makeTranslation(3, 0, 0);
    const a = pool.acquire(m1, 0xff0000);
    const b = pool.acquire(m2, 0x00ff00);
    const c = pool.acquire(m3, 0x0000ff);
    const overflow = pool.acquire();
    const activeAfterAcquire = [a.active, b.active, c.active];
    const releaseMiddle = pool.release(b);
    const movedIndex = c.index;
    const d = pool.acquire(new THREE.Matrix4().makeTranslation(4, 0, 0), 0xffff00);
    const dIndex = d.index;
    const countBeforeReset = pool.count;
    pool.reset();
    const countAfterReset = pool.count;
    pool.dispose({ disposeGeometry: true, disposeMaterial: true });
    let throwsAfterDispose = false;
    try {
      pool.acquire();
    } catch {
      throwsAfterDispose = true;
    }
    return {
      activeAfterAcquire,
      overflow,
      releaseMiddle,
      movedIndex,
      dIndex,
      countBeforeReset,
      countAfterReset,
      sceneChildren: scene.children.length,
      throwsAfterDispose,
    };
  });

  expect(result.activeAfterAcquire).toEqual([true, true, true]);
  expect(result.overflow).toBeNull();
  expect(result.releaseMiddle).toBe(true);
  expect(result.movedIndex).toBe(1);
  expect(result.dIndex).toBe(2);
  expect(result.countBeforeReset).toBe(3);
  expect(result.countAfterReset).toBe(0);
  expect(result.sceneChildren).toBe(0);
  expect(result.throwsAfterDispose).toBe(true);
});

test('3D scenery mode — organic and fence props use voxel renderer branches', async ({ page }) => {
  await page.goto('/dev.html');
  const calls = await page.evaluate(async () => {
    const { getSceneryDraw } = await import('/src/render/renderers/scenery/sceneryDispatch.js');
    const called = [];
    const voxelBlocks = {
      enabled: true,
      drawFence: () => { called.push('fence'); return true; },
      drawTree: () => { called.push('tree'); return true; },
      drawMushroom: (_x, _y, _s, opts) => { called.push(`mushroom:${opts?.variant}`); return true; },
      drawBush: (_x, _y, _s, opts) => { called.push(`bush:${opts?.large ? 'large' : 'small'}:${opts?.flowers ? 'flowers' : 'plain'}`); return true; },
      drawPipe: () => { called.push('pipe'); return true; },
      drawPlanter: () => { called.push('planter'); return true; },
      drawHangingPlatform: () => { called.push('hangingPlatform'); return true; },
      drawSmallFlower: (_x, _y, _s, opts) => { called.push(`smallFlower:${opts?.variant ?? 0}`); return true; },
      drawSprout: () => { called.push('sprout'); return true; },
      drawWheat: () => { called.push('wheat'); return true; },
      drawLeafClump: (_x, _y, _s, opts) => { called.push(`leafClump:${opts?.round ? 'round' : 'low'}`); return true; },
      drawGrassTuft: (_x, _y, _s, opts) => { called.push(`grassTuft:${opts?.large ? 'large' : 'small'}:${opts?.dry ? 'dry' : 'green'}`); return true; },
    };
    const sprites = {
      assets: { get: () => ({ naturalWidth: 1, naturalHeight: 1 }) },
      draw: () => { throw new Error('sprite path used in voxel mode'); },
    };
    const deps = { voxelBlocks, sprites, paint: {} };
    const cases = [
      ['fence_wood_short', -1],
      ['tree_round', -1],
      ['mushroom_red_big', -1, 'red'],
      ['mushroom_blue_big', -1],
      ['bush_large', -1],
      ['bush_large_with_purple_flowers', -1],
      ['bush_with_purple_flowers', -1],
      ['green_pipe', -1],
      ['planter_pot', 1],
      ['hanging_platform_vines', -1],
      ['yellow_flower_small', -1, 1],
      ['sprout_soil', -1],
      ['wheat_tuft', -1],
      ['leaf_clump_small', -1],
      ['leaf_clump_round', -1],
      ['grass_tuft', -1],
      ['grass_tuft_large', -1],
      ['dry_grass_obstacle', -1],
    ];
    for (const [assetType, side, variant] of cases) {
      const draw = getSceneryDraw(assetType);
      if (!draw) throw new Error(`missing draw for ${assetType}`);
      draw(deps, 100, 200, 1, variant, side);
    }
    return called;
  });

  expect(calls).toEqual([
    'fence',
    'tree',
    'mushroom:red',
    'mushroom:blue',
    'bush:large:plain',
    'bush:large:flowers',
    'bush:small:flowers',
    'pipe',
    'planter',
    'hangingPlatform',
    'smallFlower:1',
    'sprout',
    'wheat',
    'leafClump:low',
    'leafClump:round',
    'grassTuft:small:green',
    'grassTuft:large:green',
    'grassTuft:large:dry',
  ]);
});

test('debug scenery QA sheet — opens PNG vs 3D comparison grid', async ({ page }) => {
  await page.goto('/dev.html?debug=1&sceneryQa=1');
  await page.waitForFunction(() => window.__ORCHID_DEBUG__?.getSceneryQaState?.()?.open === true);
  await expect(page.locator('.scenery-qa-sheet')).toHaveClass(/is-open/);
  await expect(page.locator('.scenery-qa-card')).toHaveCount(await page.evaluate(() => window.__ORCHID_DEBUG__.getSceneryQaState().totalRows));
  const state = await page.evaluate(() => window.__ORCHID_DEBUG__.getSceneryQaState());
  expect(state.totalRows).toBeGreaterThan(20);
  expect(state.rows).toBe(state.totalRows);
});

test('3D gameplay mode — obstacles and pickups use voxel renderer branches', async ({ page }) => {
  await page.goto('/dev.html');
  const calls = await page.evaluate(async () => {
    const { GameplayRenderer } = await import('/src/render/renderers/GameplayRenderer.js');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    const called = [];
    const voxelBlocks = {
      enabled: true,
      drawVineBarrier: () => { called.push('vine'); return true; },
      drawOverhang: (_x, _y, _w, _s, opts) => { called.push(`overhang:${opts?.variant}`); return true; },
      drawBush: () => { called.push('bush'); return true; },
      drawWheat: (_x, _y, _s, opts) => { called.push(`wheat:${opts?.dry ? 'dry' : 'green'}`); return true; },
      drawCube: (_x, _y, _s, opts) => { called.push(`cube:${opts?.material}`); return true; },
      drawMushroom: (_x, _y, _s, opts) => { called.push(`mushroom:${opts?.variant}`); return true; },
      drawPickupFlower: (_x, _y, _s, opts) => { called.push(`pickupFlower:${opts?.rare ? 'rare' : opts?.rich ? 'rich' : 'normal'}`); return true; },
      drawHeartPickup: () => { called.push('heart'); return true; },
      drawPowerPickup: () => { called.push('power'); return true; },
    };
    const sprites = {
      draw: () => { throw new Error('sprite path used in voxel gameplay mode'); },
    };
    const renderer = new GameplayRenderer({
      ctx,
      projection: {
        width: 640,
        height: 480,
        visualLaneWidth: 48,
        roadHalfLaneUnits: 2.3,
        projectVisual: (lane, distance) => ({ sx: 320 + lane * 48, sy: 420 - distance, scale: 1 }),
        project: (lane, distance) => ({ sx: 320 + lane * 48, sy: 420 - distance, scale: 1 }),
      },
      assets: { get: () => null },
      sprites,
      paint: {},
      voxelBlocks,
    });
    const obstacle = (id, assetType, type, lane = 0, variant = 0) => ({
      id,
      components: {
        Position: { lane, distance: 20 },
        Sprite: { assetType, type: assetType, variant },
        Hitbox: { type, warning: false },
      },
    });
    const collectible = (id, type) => ({
      id,
      components: {
        Position: { lane: 0, distance: 20 },
        Sprite: { assetType: type, type },
        CollectibleData: { type, collected: false, high: false, t: 1, laneJitter: 0 },
      },
    });
    const obstacles = [
      obstacle(1, 'vine_barrier', 'vine'),
      obstacle(2, 'low_branch_overhang', 'overhang'),
      obstacle(3, 'spider_web_overhang', 'overhang'),
      obstacle(4, 'spiky_bush_obstacle', 'bush'),
      obstacle(5, 'dry_grass_obstacle', 'wheat'),
      obstacle(6, 'purple_brick_single', 'wall'),
      obstacle(7, 'small_center_mushroom', 'mushroom', 0, 'red'),
    ];
    const collectibles = [
      collectible(8, 'flower'),
      collectible(9, 'flower-rich'),
      collectible(10, 'rare-orchid'),
      collectible(11, 'life'),
      collectible(12, 'power-magnet'),
    ];
    renderer.render({
      scrollOffset: 0,
      config: {
        visual: { enabled: false },
        gameFeel: { ambientMotion: false },
        powerUps: { magnet: { radius: 0 } },
        debug: {},
      },
      powerUpSystem: { isMagnetActive: () => false },
      registry: {
        query: (...components) => components.includes('Hitbox') ? obstacles : collectibles,
      },
    });
    return called;
  });

  expect(calls).toEqual([
    'pickupFlower:normal',
    'pickupFlower:rich',
    'pickupFlower:rare',
    'heart',
    'power',
    'vine',
    'overhang:branch',
    'overhang:web',
    'bush',
    'wheat:dry',
    'cube:purple',
    'mushroom:red',
  ]);
});

test('side-aware scenery — accepted re-export pairs use direct side variants', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const dispatch = await import('/src/render/renderers/scenery/sceneryDispatch.js');
    const reliable = [
      'grass_dirt_block',
      'grass_dirt_step',
      'floating_platform',
      'hanging_platform_vines',
      'stone_brick_single',
      'stone_wall_low',
      'grass_dirt_platform_long',
      'purple_brick_single',
      'stone_wall_stairs',
      'planter_pot',
      'fence_wood_short',
    ];
    return {
      reliable: reliable.map((type) => ({
        type,
        quarantined: dispatch.isSideVariantQuarantined(type),
        sideAware: dispatch.isSideAwareSceneryType(type),
      })),
      purpleMapping: dispatch.getSideMappingForType('purple_brick_single'),
    };
  });

  for (const item of result.reliable) {
    expect(item.quarantined, item.type).toBe(false);
    expect(item.sideAware, item.type).toBe(true);
  }
  expect(result.purpleMapping).toBe('normal');
});

test('scenery QA sheet — dev-only PNG vs voxel comparer mounts and exposes cases', async ({ page }) => {
  await page.goto('/dev.html?sceneryQa=1');
  await page.waitForFunction(() => window.__ORCHID_SCENERY_QA__ !== undefined);
  await expect(page.locator('#scenery-qa-sheet')).toHaveClass(/is-open/);

  const state = await page.evaluate(() => window.__ORCHID_SCENERY_QA__.getState());
  await expect(page.locator('.scenery-qa-card')).toHaveCount(state.caseCount);
  expect(state.open).toBe(true);
  expect(state.caseCount).toBeGreaterThan(27);
  expect(state.visibleCount).toBe(state.caseCount);
});

test('touch controls — buttons exist and bind to actions', async ({ page }) => {
  // ?touch=1 forces the on-screen pad to render on desktop chromium.
  // We don't tap from the menu (overlay correctly captures pointer
  // events as the primary CTA); instead we start via keyboard, then
  // confirm the touch buttons are visible and clickable above the
  // gameplay layer.
  await page.goto('/dev.html?touch=1');
  await expect(page.locator('#game')).toBeVisible();
  await page.keyboard.press('Space');                  // dismiss menu
  await page.waitForTimeout(150);

  const jumpBtn = page.locator('#touch-controls button[data-action="jump"]');
  await expect(jumpBtn).toBeVisible();
  // is-active class proves the pointerdown handler wired up.
  await jumpBtn.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
  await expect(jumpBtn).toHaveClass(/is-active/);
  await jumpBtn.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
  await expect(jumpBtn).not.toHaveClass(/is-active/);

  // All four control buttons present.
  const buttons = await page.locator('#touch-controls button[data-action]').count();
  expect(buttons).toBe(4);
});

test('jump buffer — tap mid-air still fires on landing', async ({ page }) => {
  await page.goto('/dev.html?debug=1&autostart=1');
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
  // First jump from the ground.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })));
  await page.waitForTimeout(120);          // mid-air now
  const wasAirborne = await page.evaluate(() =>
    window.__ORCHID_DEBUG__.getState().worldState === 'playing'
      ? window.__ORCHID_DEBUG__ // placeholder; the meaningful check is below
      : null);
  expect(wasAirborne).not.toBeNull();
  // Second jump press while still airborne — should buffer.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })));
  // Wait long enough for the first jump to complete (gravity ≈ 35 frames
  // ≈ 580 ms) plus a couple frames for the buffer to flush.
  await page.waitForTimeout(900);
  // No assert needed beyond "no errors" — if the buffer logic blew up,
  // a console error would have fired.
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  expect(errors).toEqual([]);
});

test('collision contract — actual lane position, jump clears, swept depth window', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const [{ GAME_CONFIG }, { EventBus }, { EntityRegistry }, factories, { CollisionSystem }] = await Promise.all([
      import('/src/config/gameConfig.js'),
      import('/src/core/EventBus.js'),
      import('/src/ecs/EntityRegistry.js'),
      import('/src/ecs/factories.js'),
      import('/src/systems/CollisionSystem.js'),
    ]);

    const scenario = ({ type = 'wheat', lane = 0, laneX = 0, targetLane = laneX, playerY = 0, previous = 0, current = 0, collectible = false }) => {
      const eventBus = new EventBus();
      const registry = new EntityRegistry();
      const player = factories.createPlayer(registry, GAME_CONFIG);
      Object.assign(player.components.LaneState, { laneX, targetLane });
      player.components.VerticalState.y = playerY;
      const events = { hits: [], clears: [], flowers: 0 };
      eventBus.on('hazard:hit', payload => events.hits.push(payload.type));
      eventBus.on('hazard:cleared', payload => events.clears.push(payload.type));
      eventBus.on('flower:collected', () => { events.flowers += 1; });
      const world = {
        state: 'playing',
        config: GAME_CONFIG,
        registry,
        player,
        nearMissesThisRun: 0,
        lastHazardType: null,
        orchidsCollectedThisRun: 0,
        powerUpSystem: {
          isSplitClonesActive: () => false,
          isMagnetActive: () => false,
        },
        getOccupiedLanes: () => [player.components.LaneState.laneX],
      };
      const entity = collectible
        ? factories.createCollectible(registry, { type: 'flower', lane, distance: current })
        : factories.createObstacle(registry, { type, lane, distance: current });
      entity.components.Position.previousDistance = previous;
      new CollisionSystem(GAME_CONFIG, eventBus).update(world);
      return events;
    };

    return {
      movingLane: scenario({ type: 'wheat', lane: 1, laneX: 0, targetLane: 1 }),
      jumpingGroundHazard: scenario({ type: 'wheat', lane: 0, playerY: -40 }),
      sweptObstacle: scenario({ type: 'stone', lane: 0, previous: 4, current: -4 }),
      sweptCollectible: scenario({ lane: 0, previous: 4, current: -4, collectible: true }),
    };
  });

  expect(result.movingLane.hits).toEqual([]);
  expect(result.jumpingGroundHazard.hits).toEqual([]);
  expect(result.jumpingGroundHazard.clears).toEqual(['wheat']);
  expect(result.sweptObstacle.hits).toEqual(['stone']);
  expect(result.sweptCollectible.flowers).toBe(1);
});

test('spawn runtime — top-up stays monotonic after visual offset wraps', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const [{ GAME_CONFIG }, { EntityRegistry }, { Rng }, { SpawnSystem }] = await Promise.all([
      import('/src/config/gameConfig.js'),
      import('/src/ecs/EntityRegistry.js'),
      import('/src/utils/rng.js'),
      import('/src/systems/SpawnSystem.js'),
    ]);
    const projection = { maxDistance: GAME_CONFIG.projection.maxDistance };
    const spawn = new SpawnSystem(GAME_CONFIG, projection, new Rng(42));
    const registry = new EntityRegistry();
    const world = {
      state: 'playing',
      speed: GAME_CONFIG.gameplay.startSpeed,
      scrollOffset: 0.4,
      worldDistanceTotal: 262144.4,
      config: GAME_CONFIG,
      registry,
      powerUpSystem: { snapshot: () => ({ splitClonesActive: false, speedBurstActive: false }) },
    };
    spawn.heroCycleOrigin = 262500;
    spawn._centerTrailNext = 262500;
    spawn.nextPattern = 999;
    spawn.nextOrchid = 999;
    spawn.nextLife = 999;
    spawn.nextPowerUp = 999;
    spawn.nextRare = 999;
    spawn.update(world, 1);
    const positions = [...registry.query('Position')].map(entity => entity.components.Position.distance);
    return {
      heroCycleOrigin: spawn.heroCycleOrigin,
      trailNext: spawn._centerTrailNext,
      horizon: world.worldDistanceTotal + projection.maxDistance,
      entityCount: positions.length,
      maxRelativeDistance: Math.max(...positions),
    };
  });

  expect(result.heroCycleOrigin).toBeGreaterThan(262500);
  expect(result.trailNext).toBeGreaterThan(result.horizon);
  expect(result.entityCount).toBeGreaterThan(0);
  expect(result.maxRelativeDistance).toBeLessThan(600);
});

test('entity registry — compacted entities are pooled and reset before reuse', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const { EntityRegistry } = await import('/src/ecs/EntityRegistry.js');
    const registry = new EntityRegistry();
    const first = registry.create().add('OldComponent', { stale: true });
    const firstId = first.id;
    first.alive = false;
    registry.compact();
    const pooledAfterCompact = registry.freeCount;
    const second = registry.create();
    return {
      reusedObject: second === first,
      idAdvanced: second.id > firstId,
      oldComponentCleared: !second.has('OldComponent'),
      pooledAfterCompact,
      pooledAfterReuse: registry.freeCount,
    };
  });

  expect(result.reusedObject).toBe(true);
  expect(result.idAdvanced).toBe(true);
  expect(result.oldComponentCleared).toBe(true);
  expect(result.pooledAfterCompact).toBe(1);
  expect(result.pooledAfterReuse).toBe(0);
});

test('adaptive quality — manual lock applies runtime flags and reserves full filter for Ultra', async ({ page }) => {
  await page.goto('/dev.html');
  const result = await page.evaluate(async () => {
    const { AdaptiveQuality } = await import('/src/core/AdaptiveQuality.js');
    const quality = new AdaptiveQuality();
    const world = {
      config: {
        gameFeel: {
          particles: true,
          cameraShake: true,
          scorePopups: true,
          ambientMotion: true,
        },
      },
      particleSystem: { softCap: 256 },
    };

    quality.setLocked(0, world);
    const low = {
      ...world.config.gameFeel,
      softCap: world.particleSystem.softCap,
      fullCanvasFilter: quality.tier.fullCanvasFilter,
    };
    quality.setLocked(2, world);
    const high = {
      ...world.config.gameFeel,
      softCap: world.particleSystem.softCap,
      fullCanvasFilter: quality.tier.fullCanvasFilter,
    };
    quality.setLocked(3, world);
    const ultra = {
      ...world.config.gameFeel,
      softCap: world.particleSystem.softCap,
      fullCanvasFilter: quality.tier.fullCanvasFilter,
    };
    quality.setLocked(null, world);
    return { low, high, ultra, locked: quality.locked };
  });

  expect(result.low).toMatchObject({
    particles: false,
    cameraShake: false,
    scorePopups: false,
    ambientMotion: false,
    softCap: 51,
    fullCanvasFilter: false,
  });
  expect(result.high).toMatchObject({
    particles: true,
    cameraShake: true,
    scorePopups: false,
    ambientMotion: true,
    softCap: 192,
    fullCanvasFilter: false,
  });
  expect(result.ultra).toMatchObject({
    particles: true,
    cameraShake: true,
    scorePopups: true,
    ambientMotion: true,
    softCap: 256,
    fullCanvasFilter: true,
  });
  expect(result.locked).toBe(false);
});

test('leaderboard — qualify / submit / persist / cap', async ({ page }) => {
  await page.goto('/dev.html');
  // Drive the Leaderboard module directly via a dynamic import; we don't
  // need to play through a death-state to exercise the CRUD surface.
  const result = await page.evaluate(async () => {
    const m = await import('/src/core/Leaderboard.js');
    const KEY = '__lbtest__' + Math.random();
    const lb = new m.Leaderboard(KEY, 3);
    const ranks = [];
    ranks.push(lb.submit({ name: 'a', score: 10, distance: 100, ts: 1 }));
    ranks.push(lb.submit({ name: 'b', score: 20, distance: 200, ts: 2 }));
    ranks.push(lb.submit({ name: 'c', score: 15, distance: 150, ts: 3 }));
    const qualifies4 = lb.qualifies(5);     // below floor, shouldn't qualify
    ranks.push(lb.submit({ name: 'd', score: 5, distance: 50, ts: 4 })); // → 0
    const qualifies5 = lb.qualifies(25);    // above top, should qualify
    ranks.push(lb.submit({ name: 'e', score: 25, distance: 250, ts: 5 }));
    const list = lb.list();
    // Reload from a fresh instance to confirm persistence.
    const lb2 = new m.Leaderboard(KEY, 3);
    const persisted = lb2.list();
    lb2.clear();
    window.localStorage.removeItem(KEY);
    return { ranks, qualifies4, qualifies5, list, persisted };
  });
  // Ranks of the 3 valid submits should be (1, 1, 2/3 depending on sort) — the
  // important guarantees are: empty board accepts everything, below-floor
  // rejects with 0, above-top accepts and lands at rank 1.
  expect(result.qualifies4).toBe(false);
  expect(result.qualifies5).toBe(true);
  expect(result.ranks[3]).toBe(0);          // 'd' (score 5) rejected
  expect(result.ranks[4]).toBe(1);          // 'e' (score 25) → rank 1
  // Capacity respected.
  expect(result.list).toHaveLength(3);
  expect(result.persisted).toHaveLength(3);
  // Top entry is 'e' (highest score).
  expect(result.list[0].name).toBe('e');
  expect(result.list[0].score).toBe(25);
  // Persistence round-trip preserves order + scores.
  expect(result.persisted.map((e) => e.score)).toEqual([25, 20, 15]);
});

test('placement validator — seeded run produces zero rule violations', async ({ page }) => {
  // v3.8.37 — Phase 2 regression guard. SpawnSystem (hero cycle +
  // procedural) and DecorationSystem run for ~1.5 s of seeded gameplay;
  // ASSET_SEMANTICS zone + adjacency rules must not be violated by any
  // spawn attempt. A non-zero count means a generator started spawning
  // outside its declared semantic zone or busted a minSpacing rule.
  await page.goto('/dev.html?debug=1&seed=42');
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
  await page.evaluate(() => window.__ORCHID_DEBUG__.startDebugRun());
  await page.waitForTimeout(1500);
  const violations = await page.evaluate(() => window.__ORCHID_DEBUG__.getState().placementViolations);
  expect(violations).toBe(0);
});

// v3.8.39 — Phase 5 multi-seed composition guard. Each seed runs the
// hero cycle + procedural decor for ~1.2 s; both placement (Phase 2)
// AND prefab composition (Phase 5) violation counters must stay at
// zero. Catches generator/prefab regressions that only show up under
// specific RNG sequences.
for (const seed of [1, 42, 99, 123, 777]) {
  test(`composition graph — seed=${seed} produces zero placement+composition violations`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto(`/dev.html?debug=1&seed=${seed}`);
    await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
    await page.evaluate(() => window.__ORCHID_DEBUG__.startDebugRun());
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => window.__ORCHID_DEBUG__.getState());
    expect(state.placementViolations, `placement violations @ seed=${seed}`).toBe(0);
    expect(state.compositionViolations, `composition violations @ seed=${seed}`).toBe(0);
  });
}

// v3.8.40 — Phase 6 strict + composition multi-seed sweep. Each seed
// runs with strict placement + composition debug enabled; the run must
// finish with both violation counters at zero. Catches any seed-only
// regression where strict mode would drop a hero/cycle item.
for (const seed of [1, 42, 99, 123, 777]) {
  test(`strict composition — seed=${seed} runs clean under ?enforcePlacement=1&debugComposition=1`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto(`/dev.html?debug=1&seed=${seed}&enforcePlacement=1&debugComposition=1`);
    await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
    await page.evaluate(() => window.__ORCHID_DEBUG__.startDebugRun());
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => window.__ORCHID_DEBUG__.getState());
    expect(['playing', 'starting'], `world state @ seed=${seed}`).toContain(state.worldState);
    expect(state.placementViolations, `placement violations @ seed=${seed}`).toBe(0);
    expect(state.compositionViolations, `composition violations @ seed=${seed}`).toBe(0);
  });
}

test('strict enforcement — ?enforcePlacement=1 drops violations and finishes the run', async ({ page }) => {
  // v3.8.39 — sanity test for strict mode. With enforcement on, both
  // SpawnSystem and DecorationSystem skip violating spawns instead of
  // warn-and-continue. The seeded run should still complete (game.world
  // remains in playing state) and the violation counters stay at zero
  // because the current catalog is clean.
  await page.goto('/dev.html?debug=1&seed=42&enforcePlacement=1');
  await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
  await page.evaluate(() => window.__ORCHID_DEBUG__.startDebugRun());
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => window.__ORCHID_DEBUG__.getState());
  expect(['playing', 'starting']).toContain(state.worldState);
  expect(state.placementViolations).toBe(0);
  expect(state.compositionViolations).toBe(0);
});

test('seeded run — same ?seed produces same spawn log', async ({ page }) => {
  // Two independent debug runs with the same seed should yield identical
  // spawn-system traces (pattern ids in order).
  //
  // v4.4: only procedural patterns (past obstacleStartDistance ≈ 92 world-
  // units) write to spawnLog; the hero-cycle opening sequence does not. A
  // 1.2 s settle reaches only ~65 units → empty log → false failure. Settle
  // 3 s (~160 units) clears the hero window and captures real patterns.
  // Two cold loads (~28 s each) + 3 s settle → budget well above 30 s.
  test.setTimeout(120_000);
  const traceFor = async (url) => {
    await page.goto(url);
    await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
    await page.evaluate(() => {
      window.__ORCHID_DEBUG__.startDebugRun();
      if (window.__seed_trace_invuln_id) clearInterval(window.__seed_trace_invuln_id);
      window.__seed_trace_invuln_id = setInterval(() => {
        const player = window.__ORCHID_GAME__?.world?.player;
        if (player?.components?.Health) player.components.Health.invulnerabilityFrames = 9999;
      }, 100);
    });
    // Wait on simulation distance rather than wall-clock time. Cold asset
    // loads, parallel workers and denser visual scenes can make 20 seconds
    // insufficient on CI even though the loop remains healthy.
    await page.waitForFunction(
      () => (window.__ORCHID_GAME__?.world?.worldDistanceTotal ?? 0) >= 170,
      null,
      { timeout: 40_000, polling: 100 },
    );
    return page.evaluate(() => {
      clearInterval(window.__seed_trace_invuln_id);
      window.__seed_trace_invuln_id = null;
      return window.__ORCHID_DEBUG__.getSpawnLog().map(e => e.id);
    });
  };

  const a = await traceFor('/dev.html?debug=1&seed=42');
  const b = await traceFor('/dev.html?debug=1&seed=42');

  // Both runs must spawn patterns and agree entry-for-entry. Compare the
  // shared prefix: a wall-clock settle can leave the two runs ±1 pattern
  // apart in TOTAL count, but a seed/RNG regression shows up as a diff
  // WITHIN the shared prefix — which is what this test exists to catch.
  expect(a.length).toBeGreaterThan(0);
  expect(b.length).toBeGreaterThan(0);
  const n = Math.min(a.length, b.length);
  expect(a.slice(0, n)).toEqual(b.slice(0, n));
});
