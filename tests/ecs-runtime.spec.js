import { test, expect } from '@playwright/test';

test('runtime — start, move, jump, crouch, restart, no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

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

test('seeded run — same ?seed produces same spawn log', async ({ page }) => {
  // Two independent debug runs with the same seed should yield identical
  // spawn-system traces (pattern ids in order).
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
