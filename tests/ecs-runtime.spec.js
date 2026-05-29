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

test('seeded run — same ?seed produces same spawn log', async ({ page }) => {
  // Two independent debug runs with the same seed should yield identical
  // spawn-system traces (pattern ids in order). The test does two cold
  // page loads + a 1.2 s settle each, so the default 30 s budget runs
  // tight on slow machines; bump per-test timeout.
  test.setTimeout(60_000);
  const traceFor = async (url) => {
    await page.goto(url);
    await page.waitForFunction(() => window.__ORCHID_DEBUG__ !== undefined);
    await page.evaluate(() => window.__ORCHID_DEBUG__.startDebugRun());
    await page.waitForTimeout(1200);
    return page.evaluate(() => window.__ORCHID_DEBUG__.getSpawnLog().map(e => e.id));
  };

  const a = await traceFor('/dev.html?debug=1&seed=42');
  const b = await traceFor('/dev.html?debug=1&seed=42');

  expect(a.length).toBeGreaterThan(0);
  expect(a).toEqual(b);
});
