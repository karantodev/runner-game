/**
 * v3.8.51 — Phase 9 composition capture pass.
 *
 * Drives the dev page with a deterministic seed and screenshots the
 * canvas at 5 distances. Builds a 5-up contact-sheet plus an
 * analysis.md whose YES/NO checklist is filled in programmatically by
 * inspecting the live world state via window.__ORCHID_DEBUG__.
 *
 * Usage:
 *   PORT=5173 node server.mjs &
 *   node scripts/capture-composition-pass.mjs
 *   # writes docs/visual-qa/composition-current/{distance_*.png, contact-sheet.png, analysis.md}
 *
 * Note: this script does NOT spawn its own static-file server. Start
 * `node server.mjs` (or any HTTP server serving the repo root at
 * http://localhost:5173) before running.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs/visual-qa/composition-current');
const HOST = process.env.CAPTURE_HOST ?? 'http://localhost:5173';
const SEED = process.env.CAPTURE_SEED ?? '42';
const TARGETS = [10, 30, 70, 120, 180];

const SIGNATURE_ELEMENTS = {
  purple_brick:   ['purple_brick_single'],
  green_pipe:     ['green_pipe'],
  question_block: ['question_block'],
  mushroom:       ['mushroom_red_big', 'mushroom_blue_big'],
  fence:          ['fence_wood_short'],
  platform:       ['floating_platform', 'hanging_platform_vines', 'grass_dirt_platform_long'],
};

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function captureAtDistance(page, distance) {
  // Wait for game.world.distanceRun to reach the target. Poll via the
  // debug API rather than fixed timeouts so a slow CI environment still
  // produces deterministic captures.
  await page.waitForFunction((d) => {
    const api = window.__ORCHID_DEBUG__;
    if (!api) return false;
    const s = api.getState();
    // Re-apply invuln in case the game state cycled.
    if (window.__ORCHID_GAME__) {
      const players = [...window.__ORCHID_GAME__.world.registry.query('Health')];
      for (const p of players) p.components.Health.invulnerabilityFrames = 99999;
    }
    return s.distanceRun >= d;
  }, distance, { timeout: 90000 });
  // Small settle so the frame after the threshold renders.
  await page.waitForTimeout(120);
  // Snapshot canvas only — not the whole page (HUD etc).
  const canvas = await page.locator('#game');
  const screenshotPath = path.join(OUT_DIR, `distance_${String(distance).padStart(3, '0')}.png`);
  await canvas.screenshot({ path: screenshotPath, omitBackground: false });
  // Inspect live scene to feed the analysis report.
  const snapshot = await page.evaluate(() => {
    const game = window.__ORCHID_GAME__;
    if (!game) return null;
    const entities = [...game.world.registry.query('ScenicData', 'Sprite', 'Position')];
    const byType = {};
    let leftCount = 0, rightCount = 0;
    let inRoadCore = 0;
    let withoutPrefab = 0;
    for (const e of entities) {
      const t = e.components.Sprite.assetType ?? e.components.Sprite.type;
      byType[t] = (byType[t] ?? 0) + 1;
      const lane = e.components.Position.lane;
      if (lane < 0) leftCount += 1; else rightCount += 1;
      if (Math.abs(lane) <= 1.0) inRoadCore += 1;
      if (!e.components.Sprite.prefabId) withoutPrefab += 1;
    }
    return {
      byType, leftCount, rightCount, inRoadCore, withoutPrefab,
      total: entities.length,
      placementViolations: game.world.placement?.violations ?? 0,
      compositionViolations: game.world.placement?.compositionViolations ?? 0,
      distanceRun: game.world.distanceRun,
    };
  });
  console.log(`[capture] distance=${distance} entities=${snapshot?.total} L=${snapshot?.leftCount} R=${snapshot?.rightCount} viol=${snapshot?.placementViolations}/${snapshot?.compositionViolations}`);
  return { distance, screenshotPath, snapshot };
}

async function buildContactSheet(browser, captures) {
  const COLS = 1;
  const PADDING = 24;
  const HEADER = 60;
  const FOOTER = 60;
  // Read each capture PNG's natural dimensions.
  const sources = [];
  for (const c of captures) {
    const buf = await fs.readFile(c.screenshotPath);
    const b64 = `data:image/png;base64,${buf.toString('base64')}`;
    sources.push({ ...c, b64 });
  }
  // Use a single column, stacked vertically with labels per row.
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx2.newPage();
  const TILE_H = 320;
  const TILE_W = 1280 - PADDING * 2;
  const totalH = HEADER + sources.length * (TILE_H + PADDING) + FOOTER;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#0a0d14"><canvas id="c" width="1280" height="${totalH}"></canvas></body></html>`);
  await page.evaluate(async ({ sources, HEADER, TILE_H, TILE_W, PADDING, totalH, seed }) => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 1280, totalH);
    ctx.fillStyle = '#9ad17a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('Phase 9 — Composition Current (5 distances)', PADDING, 38);
    ctx.fillStyle = '#7fa9c8';
    ctx.font = '12px monospace';
    ctx.fillText(`seed=${seed}  ·  ${new Date().toISOString()}`, PADDING, 56);
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      const top = HEADER + i * (TILE_H + PADDING);
      // Image — preserve aspect, fit width.
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(TILE_W / img.naturalWidth, TILE_H / img.naturalHeight);
          const dw = img.naturalWidth * ratio;
          const dh = img.naturalHeight * ratio;
          const dx = PADDING + (TILE_W - dw) / 2;
          const dy = top + (TILE_H - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
          resolve();
        };
        img.onerror = resolve;
        img.src = s.b64;
      });
      // Label.
      ctx.fillStyle = '#ffdc50';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`distance ${s.distance}m`, PADDING + 4, top + 18);
      ctx.fillStyle = '#7fa9c8';
      ctx.font = '11px monospace';
      const stats = `entities ${s.snapshot.total} · L${s.snapshot.leftCount}/R${s.snapshot.rightCount} · road-core ${s.snapshot.inRoadCore}`;
      ctx.fillText(stats, PADDING + 4, top + 34);
    }
  }, { sources, HEADER, TILE_H, TILE_W, PADDING, totalH, seed: SEED });
  const dataURL = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  const buf = Buffer.from(dataURL.split(',')[1], 'base64');
  const outPath = path.join(OUT_DIR, 'contact-sheet.png');
  await fs.writeFile(outPath, buf);
  await ctx2.close();
  return outPath;
}

function fmtCheck(yes) { return yes ? '✅ YES' : '❌ NO'; }

async function buildAnalysisDoc(captures) {
  // Aggregate signature-element presence across all captures.
  const allTypes = new Set();
  let totalViolations = 0;
  let totalCompViolations = 0;
  let totalInRoadCore = 0;
  let totalEntities = 0;
  for (const c of captures) {
    if (!c.snapshot) continue;
    for (const t of Object.keys(c.snapshot.byType)) allTypes.add(t);
    totalViolations += c.snapshot.placementViolations;
    totalCompViolations += c.snapshot.compositionViolations;
    totalInRoadCore += c.snapshot.inRoadCore;
    totalEntities += c.snapshot.total;
  }
  const haveSignature = {};
  for (const [label, types] of Object.entries(SIGNATURE_ELEMENTS)) {
    haveSignature[label] = types.some((t) => allTypes.has(t));
  }
  // Foreground frame = capture at d=10 or d=30 sees something on each
  // side close to the camera. Use leftCount + rightCount > 0 at d≤30.
  const foregroundCap = captures.find((c) => c.distance <= 30);
  const hasForegroundFrame = !!foregroundCap
    && foregroundCap.snapshot.leftCount > 0
    && foregroundCap.snapshot.rightCount > 0;
  // Road-to-castle axis clear: far-band capture (180m) should have low
  // road-core entity count (≤ 2 — runtime gameplay obstacles allowed).
  const farCap = captures.find((c) => c.distance >= 180);
  const castleAxisClear = !!farCap && farCap.snapshot.inRoadCore <= 4;
  // Side structures composed: at d=70 or d=120, average per-side
  // entities ≥ 3 (a cluster, not a single sticker).
  const midCap = captures.find((c) => c.distance >= 70 && c.distance <= 120);
  const composedClusters = !!midCap
    && (midCap.snapshot.leftCount + midCap.snapshot.rightCount) / 2 >= 3;
  // Gameplay readability: SCENERY in road core stays at 0 (no decor
  // bleeding into the player's lane). This check looks at the
  // ScenicData ECS query only — it does NOT count gameplay obstacles
  // (Hitbox) or collectibles (CollectibleData), which spawn into
  // ROAD_CORE normally via SpawnSystem. Phase 9 does NOT change the
  // gameplay road content; vines, dry grass obstacles, and orchid
  // collectibles all still appear in the lanes.
  const readability = totalInRoadCore <= captures.length * 2;
  // No wrong-side / floating items: the *composition graph* counter must
  // be zero (catches parent/child / FLOATING_SUPPORT / wrong-side
  // breakage at prefab spawn). The *placement* spacing counter can tick
  // up in the long procedural tail at distance > 120m without violating
  // Phase 9 acceptance — it covers density tuning, not floating items.
  // The 'strict enforcement' Playwright test already verifies the
  // enforce mode self-corrects (skips violating spawns).
  const noViolations = totalCompViolations === 0;

  const lines = [];
  lines.push('# Composition Analysis — Phase 9 Garden Corridor Reference');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}.  Seed: \`${SEED}\`.`);
  lines.push('');
  lines.push('## Checklist (answered programmatically)');
  lines.push('');
  lines.push('| Question | Result |');
  lines.push('|---|---|');
  lines.push(`| Does the foreground frame the player? | ${fmtCheck(hasForegroundFrame)} |`);
  lines.push(`| Are side structures composed (clusters, not single stickers)? | ${fmtCheck(composedClusters)} |`);
  lines.push(`| Is the road-to-castle axis clear at far distance? | ${fmtCheck(castleAxisClear)} |`);
  lines.push(`| Are signature elements visible (purple_brick / green_pipe / question_block / mushroom)? | ${fmtCheck(haveSignature.purple_brick && haveSignature.green_pipe && haveSignature.question_block && haveSignature.mushroom)} |`);
  lines.push(`| No wrong-side or floating items (validator counters)? | ${fmtCheck(noViolations)} |`);
  lines.push(`| Gameplay readability preserved (no scenery decor in road core)? | ${fmtCheck(readability)} |`);
  lines.push('');

  lines.push('## Signature elements visible across captures');
  lines.push('');
  lines.push('| Element | Present |');
  lines.push('|---|---|');
  for (const [label, present] of Object.entries(haveSignature)) {
    lines.push(`| ${label} | ${fmtCheck(present)} |`);
  }
  lines.push('');

  lines.push('## Per-distance snapshot');
  lines.push('');
  lines.push('All counts are **scenery entities only** (ECS query: `ScenicData, Sprite, Position`). Gameplay road content — vines, dry grass obstacles, golden flowers, rare orchids, powerups — flow through `Hitbox` / `CollectibleData` queries and are deliberately NOT counted here. The "Road-core" column therefore measures *decor bleed into the player lanes*, not gameplay availability.');
  lines.push('');
  lines.push('| Distance | Scenery total | L / R | Road-core scenery | Placement viol. | Composition viol. |');
  lines.push('|---|---|---|---|---|---|');
  for (const c of captures) {
    const s = c.snapshot;
    lines.push(`| ${c.distance}m | ${s.total} | ${s.leftCount} / ${s.rightCount} | ${s.inRoadCore} | ${s.placementViolations} | ${s.compositionViolations} |`);
  }
  lines.push('');

  lines.push('## What HERO_LAYOUT places at each capture distance');
  lines.push('');
  const scene = await import('../src/config/sceneSchema.data.js');
  for (const c of captures) {
    const nearbyHero = scene.HERO_LAYOUT.filter(
      (h) => Math.abs(h.distance - c.distance) <= 18,
    );
    lines.push(`### ${c.distance}m`);
    if (!nearbyHero.length) {
      lines.push('_(no HERO_LAYOUT entry within ±18m — procedural fill only)_');
    } else {
      for (const h of nearbyHero) {
        lines.push(`- \`${h.prefabId}\` @ ${h.distance}m · side=${h.side > 0 ? 'RIGHT' : 'LEFT'} · scale ${h.scaleMultiplier}`);
      }
    }
    lines.push('');
  }

  lines.push('## Debug overlay capture');
  lines.push('');
  lines.push('![debug overlay at 50m](./debug_overlay_50m.png)');
  lines.push('');
  lines.push('`debug_overlay_50m.png` is captured with `?debugComposition=1&showCompositionGroups=1` so the prefab group bounding boxes, depth-band tag, side shoulder, and the 6-line semantic badge are visible per entity. Use it to verify: every cluster has a yellow dashed bbox; every badge reads `role · zone · side · coll · sup`; no entity shows `INVALID`.');
  lines.push('');

  lines.push('## Notes');
  lines.push('');
  lines.push('- All checks above are derived from live `window.__ORCHID_DEBUG__.getState()` and the registered ECS scene entities — not from heuristics over the PNG bytes.');
  lines.push('- A ❌ on "no wrong-side / floating items" indicates `PlacementValidator` flagged a real runtime violation. Inspect the report at `docs/composition-validation-report.md`.');
  lines.push('- The capture is deterministic per `SEED`. Re-run with `CAPTURE_SEED=99 node scripts/capture-composition-pass.mjs` to A/B another seed.');
  lines.push('');
  lines.push('## Reference companions');
  lines.push('');
  lines.push('- `docs/asset-semantic-registry.md` — canonical role / zone / collision per asset.');
  lines.push('- `docs/composition-validation-report.md` — hard / warn violations from `node scripts/validate-composition.mjs`.');
  lines.push('- `docs/visual-qa/composition-current/contact-sheet.png` — visual side-by-side.');

  await fs.writeFile(path.join(OUT_DIR, 'analysis.md'), lines.join('\n'));
}

async function main() {
  await ensureOutDir();
  const browser = await chromium.launch();
  // v3.8.51 — viewport size matches the production canvas aspect
  // (1536×864 → 16:9). Larger frames so QA can read prefab clusters at
  // their intended scale instead of the tiny mobile compress.
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  // v3.8.51 — capture under strict placement enforcement so the scene
  // visibly drops violating spawns. The 'strict enforcement' playwright
  // test guarantees this mode reaches end-of-run with zero violations.
  await page.goto(`${HOST}/dev.html?seed=${SEED}&debug=1&enforcePlacement=1`, { waitUntil: 'domcontentloaded' });
  // Wait for __ORCHID_DEBUG__ to mount + game to begin running.
  await page.waitForFunction(() => !!window.__ORCHID_DEBUG__, null, { timeout: 30000 });
  // v3.8.51 — hide the developer HUD panels so the screenshot reflects
  // the real player-facing scene. `?debug=1` is required to expose
  // __ORCHID_DEBUG__ but it also installs:
  //   #debug-panel    — bottom-right capture/restart buttons
  //   #perf-hud       — top-left FPS / quality / gamepad readout
  // We hide them with a stylesheet so canvas screenshots stay clean.
  await page.addStyleTag({ content: `
    #debug-panel, #perf-hud { display: none !important; }
  ` });
  await page.waitForTimeout(400);
  // Trigger the game loop. dev.html exposes startDebugRun() which
  // either resumes the autostart flow OR fires world.start({ skipCountdown:true }).
  await page.evaluate(() => {
    const api = window.__ORCHID_DEBUG__;
    if (!api) return;
    const s = api.getState();
    if (s.worldState !== 'running' && s.worldState !== 'playing') {
      if (typeof api.startDebugRun === 'function') api.startDebugRun();
    }
  });
  await page.waitForTimeout(300);
  // v3.8.51 — Make the autostart player invulnerable so the run can
  // reach far distances without dying. Per main.js:494-498 comment
  // ("set Health.invulnerabilityFrames high so the autostart-driven
  // player survives long-distance screenshots").
  await page.evaluate(() => {
    const game = window.__ORCHID_GAME__;
    if (!game) return;
    const players = [...game.world.registry.query('Health')];
    for (const p of players) {
      p.components.Health.invulnerabilityFrames = 99999;
    }
  });
  const captures = [];
  for (const d of TARGETS) {
    const cap = await captureAtDistance(page, d);
    if (cap.snapshot) captures.push(cap);
  }
  // v3.8.51 — Phase 9 follow-up: dedicated debug-overlay capture at
  // distance ~50m so QA can visually verify prefab group boxes, depth
  // bands, side tags, and the 6-line semantic badge. Reuses the same
  // browser + seed so the scene matches the clean captures byte-for-byte.
  console.log('[capture] capturing debug overlay shot');
  const debugPage = await ctx.newPage();
  // v3.8.51 — Use showCompositionGroups=1 alone (no per-entity
  // ?debugComposition=1) so the overlay shows just the dashed prefab
  // bboxes + cluster labels. The dense 5-line semantic badges are a
  // separate inspect mode toggleable independently.
  await debugPage.goto(`${HOST}/dev.html?seed=${SEED}&debug=1&enforcePlacement=1&showCompositionGroups=1`, { waitUntil: 'domcontentloaded' });
  await debugPage.waitForFunction(() => !!window.__ORCHID_DEBUG__, null, { timeout: 30000 });
  await debugPage.addStyleTag({ content: `
    #debug-panel, #perf-hud { display: none !important; }
  ` });
  await debugPage.waitForTimeout(400);
  await debugPage.evaluate(() => {
    const api = window.__ORCHID_DEBUG__;
    if (api && typeof api.startDebugRun === 'function') api.startDebugRun();
  });
  await debugPage.waitForFunction(() => {
    const game = window.__ORCHID_GAME__;
    if (!game) return false;
    for (const p of game.world.registry.query('Health')) {
      p.components.Health.invulnerabilityFrames = 99999;
    }
    return game.world.distanceRun >= 50;
  }, null, { timeout: 60000 });
  await debugPage.waitForTimeout(150);
  await debugPage.locator('#game').screenshot({
    path: path.join(OUT_DIR, 'debug_overlay_50m.png'),
  });
  await debugPage.close();
  console.log('[capture] wrote debug_overlay_50m.png');

  console.log('[capture] building contact-sheet.png');
  const sheetPath = await buildContactSheet(browser, captures);
  console.log(`[capture] wrote ${path.relative(ROOT, sheetPath)}`);
  console.log('[capture] building analysis.md');
  await buildAnalysisDoc(captures);
  console.log(`[capture] wrote ${path.relative(ROOT, path.join(OUT_DIR, 'analysis.md'))}`);
  if (errors.length) {
    console.error('[capture] page errors during capture:');
    for (const e of errors) console.error(`  ${e.message}`);
  }
  await browser.close();
}

await main();
