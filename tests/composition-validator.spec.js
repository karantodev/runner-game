/**
 * v3.8.50 — Phase 8 composition overlay + canonical semantic smoke
 * test. Verifies that `?debugComposition=1` does not throw, and that
 * the canonical semantic catalog is wired into the page context so
 * future debug surfaces can introspect it.
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
