/**
 * v3.8.41 — Phase 7 (visual art-direction) capture utility.
 *
 * Usage:
 *   node scripts/capture-side-corridor.mjs before   # current state
 *   node scripts/capture-side-corridor.mjs after    # after layout edit
 *   node scripts/capture-side-corridor.mjs compose  # build the final
 *                                                   # side-by-side sheet
 *
 * Generates a 3 (seed) × 3 (distance) grid for each label. Saves raw
 * per-cell PNGs to docs/visual-qa/<label>/. The compose step builds the
 * final docs/visual-qa/side-corridor-before-after.png from the two
 * directories side-by-side with labels.
 *
 * Expects the dev server (server.mjs) to be already running on
 * http://localhost:8080. Run via `node server.mjs &` in another shell.
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const SEEDS = [1, 42, 99];
const DISTANCES = [30, 70, 120];

async function capture(label) {
  const outDir = path.join(ROOT, 'docs/visual-qa', label);
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const seed of SEEDS) {
      const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 } });
      const page = await ctx.newPage();
      // debugFreeze=0 lets the world tick live (autostart by default
      // freeze-after-N-steps so the user can inspect a fixed frame).
      const url = `${BASE_URL}/dev.html?debug=1&autostart=1&debugFreeze=0&seed=${seed}`;
      console.log(`[capture:${label}] seed=${seed} → ${url}`);
      await page.goto(url);
      await page.waitForFunction(() => window.__ORCHID_GAME__ !== undefined, null, { timeout: 15000 });
      // Keep the autostart-driven player immortal so we actually reach
      // the deep distance marks. Top up invulnerability every 100 ms.
      await page.evaluate(() => {
        if (window.__capture_invuln_id) clearInterval(window.__capture_invuln_id);
        window.__capture_invuln_id = setInterval(() => {
          const p = window.__ORCHID_GAME__?.world?.player;
          if (p?.components?.Health) p.components.Health.invulnerabilityFrames = 9999;
        }, 100);
      });
      for (const dist of DISTANCES) {
        // Wait for the player to scroll past the target distance.
        // distanceRun ticks during the autostart loop; once it crosses
        // the requested mark the visible window will hold the prefabs
        // we want to QA.
        await page.waitForFunction(
          (d) => (window.__ORCHID_DEBUG__?.getState()?.distanceRun ?? 0) >= d,
          dist,
          { timeout: 60_000, polling: 100 },
        );
        // One settle frame so the snapshot is consistent with the
        // last spawn tick.
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const dataURL = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
        const buf = Buffer.from(dataURL.split(',')[1], 'base64');
        const file = path.join(outDir, `seed-${seed}-dist-${dist}.png`);
        await fs.writeFile(file, buf);
        console.log(`[capture:${label}]   ${path.relative(ROOT, file)}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

/**
 * Final composite: 2 columns × 9 rows? No — read the brief: 3 seeds
 * × 3 distances per side = 3 × 6 grid (before-left half + after-right
 * half, with labels). Use an off-screen browser canvas to build it.
 */
async function compose(beforeLabel = 'before', afterLabel = 'after', outName) {
  const beforeDir = path.join(ROOT, 'docs/visual-qa', beforeLabel);
  const afterDir  = path.join(ROOT, 'docs/visual-qa', afterLabel);
  const outFile   = path.join(ROOT, 'docs/visual-qa', outName ?? `side-corridor-${beforeLabel}-vs-${afterLabel}.png`);
  const cellW = 384;   // each cell is ~25% width of 1536-source
  const cellH = 216;   // proportional
  const margin = 8;
  const labelH = 22;
  const cols = 6;      // 3 distances × 2 labels (before/after side by side)
  const rows = SEEDS.length;
  const headerH = 40;
  const W = cols * cellW + (cols + 1) * margin;
  const H = rows * (cellH + labelH) + (rows + 1) * margin + headerH;

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#0a0d14"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);
    // Convert each cell PNG to a data URL Node-side, hand them to the
    // browser to draw. Keeps the composition logic close to the data.
    async function dataUrl(p) {
      const buf = await fs.readFile(p);
      return 'data:image/png;base64,' + buf.toString('base64');
    }
    const cells = [];
    for (let r = 0; r < rows; r += 1) {
      const seed = SEEDS[r];
      const row = [];
      for (let i = 0; i < DISTANCES.length; i += 1) {
        const dist = DISTANCES[i];
        row.push({
          x: margin + i * (cellW + margin),
          y: headerH + margin + r * (cellH + labelH + margin),
          label: `${beforeLabel.toUpperCase()} · seed=${seed} · ${dist}m`,
          isAfter: false,
          src: await dataUrl(path.join(beforeDir, `seed-${seed}-dist-${dist}.png`)),
        });
        row.push({
          x: margin + (i + DISTANCES.length) * (cellW + margin),
          y: headerH + margin + r * (cellH + labelH + margin),
          label: `${afterLabel.toUpperCase()} · seed=${seed} · ${dist}m`,
          isAfter: true,
          src: await dataUrl(path.join(afterDir, `seed-${seed}-dist-${dist}.png`)),
        });
      }
      cells.push(...row);
    }
    const dataURL = await page.evaluate(async ({ cells, W, H, cellW, cellH, labelH, headerH }) => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#9ad17a';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Side Corridor — visual recomposition', 12, 26);
      for (const cell of cells) {
        const img = new Image();
        img.src = cell.src;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => { img.onload = r; });
        ctx.drawImage(img, cell.x, cell.y, cellW, cellH);
        ctx.fillStyle = cell.isAfter ? '#9ad17a' : '#a8d4ff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cell.label, cell.x + cellW / 2, cell.y + cellH + 14);
      }
      return canvas.toDataURL('image/png');
    }, { cells, W, H, cellW, cellH, labelH, headerH });
    const buf = Buffer.from(dataURL.split(',')[1], 'base64');
    await fs.writeFile(outFile, buf);
    console.log(`[compose] wrote ${path.relative(ROOT, outFile)}  (${W}×${H})`);
  } finally {
    await browser.close();
  }
}

const cmd = process.argv[2];
if (cmd === 'capture') {
  const label = process.argv[3];
  if (!label) {
    console.error('usage: node scripts/capture-side-corridor.mjs capture <label>');
    process.exit(1);
  }
  capture(label).catch((e) => { console.error(e); process.exit(1); });
} else if (cmd === 'before' || cmd === 'after') {
  capture(cmd).catch((e) => { console.error(e); process.exit(1); });
} else if (cmd === 'compose') {
  const before = process.argv[3] ?? 'before';
  const after  = process.argv[4] ?? 'after';
  const out    = process.argv[5];
  compose(before, after, out).catch((e) => { console.error(e); process.exit(1); });
} else {
  console.error('usage: node scripts/capture-side-corridor.mjs <before|after|capture <label>|compose [before [after [out]]]>');
  process.exit(1);
}
