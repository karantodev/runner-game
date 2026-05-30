/**
 * v3.8.50 — Phase 8 composition overlay + canonical semantic smoke
 * test. Verifies that `?debugComposition=1` does not throw, and that
 * the canonical semantic catalog is wired into the page context so
 * future debug surfaces can introspect it.
 *
 * v3.8.51 — Phase 9 garden corridor theme assertions added.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 8 — composition rules + debug overlay', () => {
  test('?debugComposition=1 renders without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e));

    await page.goto('/dev.html?debugComposition=1');
    await expect(page.locator('#game')).toBeVisible();
    // Let a few RAF ticks paint the overlay so the renderer code path
    // actually executes (it only fires when entities are queued).
    await page.waitForTimeout(800);
    expect(errors).toHaveLength(0);
  });

  test('?showCompositionGroups=1 renders without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e));
    await page.goto('/dev.html?showCompositionGroups=1');
    await expect(page.locator('#game')).toBeVisible();
    await page.waitForTimeout(800);
    expect(errors).toHaveLength(0);
  });

  test('canonical semantic catalog is reachable from page module graph', async ({ page }) => {
    await page.goto('/dev.html');
    const summary = await page.evaluate(async () => {
      const mod = await import('/src/config/assetSemantics.js');
      return {
        roleCount: mod.listCanonicalRoles().length,
        zoneCount: mod.listCanonicalZones().length,
        haveGetter: typeof mod.getCanonicalSemantic === 'function',
        // Spot-check three representative assets across roles.
        obstacle: mod.getCanonicalSemantic('vine_barrier'),
        side:     mod.getCanonicalSemantic('stone_wall_low'),
        decor:    mod.getCanonicalSemantic('tree_round'),
      };
    });
    expect(summary.haveGetter).toBe(true);
    expect(summary.roleCount).toBeGreaterThanOrEqual(12);
    expect(summary.zoneCount).toBeGreaterThanOrEqual(5);
    expect(summary.obstacle.role).toBe('GAMEPLAY_OBSTACLE');
    expect(summary.obstacle.gameplayCollision).toBe('obstacle_jump');
    expect(summary.side.role).toBe('SIDE_STRUCTURE');
    expect(summary.side.sideFacing).toBe('road_facing_required');
    expect(summary.decor.role).toBe('SIDE_DECOR_LARGE');
    expect(summary.decor.compositionRules.blocksRoadReadability).toBe(true);
  });
});

test.describe('Phase 9 — garden corridor theme', () => {
  test('HERO_LAYOUT only references prefabs declared in the theme pool', async ({ page }) => {
    await page.goto('/dev.html');
    const summary = await page.evaluate(async () => {
      const mod = await import('/src/config/sceneSchema.data.js');
      const allowed = new Set(mod.THEMES.GARDEN_CORRIDOR_REFERENCE.heroLayoutPrefabs);
      const referenced = new Set(mod.HERO_LAYOUT.map((e) => e.prefabId));
      const offenders = [];
      for (const id of referenced) {
        if (!allowed.has(id)) offenders.push(id);
      }
      return {
        heroEntries: mod.HERO_LAYOUT.length,
        heroPool: allowed.size,
        offenders,
        // Spot-check the 5 spec-named clusters all exist.
        clustersExist: [
          'garden_foreground_left_platform_cluster',
          'garden_foreground_right_pipe_cluster',
          'garden_mid_left_purple_wall_cluster',
          'garden_mid_right_stone_step_cluster',
          'garden_far_castle_approach_cluster',
        ].every((id) => mod.SIDE_DECORATION_PREFABS.some((p) => p.id === id)),
      };
    });
    expect(summary.offenders).toEqual([]);
    expect(summary.heroEntries).toBeGreaterThanOrEqual(12);
    expect(summary.clustersExist).toBe(true);
  });

  test('DEPTH_BANDS + bandForDistance map the 5 reference distances correctly', async ({ page }) => {
    await page.goto('/dev.html');
    const summary = await page.evaluate(async () => {
      const mod = await import('/src/config/sceneSchema.data.js');
      return {
        d10:  mod.bandForDistance(10),
        d50:  mod.bandForDistance(50),
        d100: mod.bandForDistance(100),
        d175: mod.bandForDistance(175),
        d300: mod.bandForDistance(300),
        bands: Object.keys(mod.DEPTH_BANDS),
      };
    });
    expect(summary.d10).toBe('FOREGROUND');
    expect(summary.d50).toBe('NEAR');
    expect(summary.d100).toBe('MID');
    expect(summary.d175).toBe('CASTLE_APPROACH');
    expect(summary.d300).toBe('FAR');
    expect(summary.bands).toContain('CASTLE_APPROACH');
  });
});
