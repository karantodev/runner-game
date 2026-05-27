import { test, expect } from '@playwright/test';

const DEV_URL = '/dev.html';

test.describe('dev build (/dev.html)', () => {
  test('loads without JS errors and shows the canvas', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error));

    await page.goto(DEV_URL);
    await expect(page.locator('#game')).toBeVisible();

    const size = await page.locator('#game').evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height,
    }));

    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(errors).toHaveLength(0);
  });
});

test.describe('production build (/)', () => {
  test('loads without JS errors and keeps module entry', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error));

    await page.goto('/');
    await expect(page.locator('#game')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyR');

    const html = await page.content();
    expect(html).toContain('./src/main.js');
    expect(html).not.toContain('src/systems/RenderSystem.js');
    expect(errors).toHaveLength(0);
  });
});
