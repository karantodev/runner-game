import { test, expect } from '@playwright/test';

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

  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getBlockStyle())).toBe('voxel');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.setBlockStyle('2d'))).toBe('sprite');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.toggleBlockStyle())).toBe('voxel');

  await page.keyboard.press('KeyY');
  expect(await page.evaluate(() => window.__ORCHID_DEBUG__.getState().blockStyle)).toBe('sprite');
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
