/**
 * v3.8.44 — Visual asset inventory generator.
 *
 * Walks every PNG under assets/ (excluding _source/), classifies it
 * against ASSET_CLASS_BY_TYPE, cross-references with gameConfig.assets
 * registry, and renders contact-sheet PNGs grouped by category +
 * special sheets for side-aware pairs, exact duplicates, unregistered,
 * registered-unused, and missing-dead-keys.
 *
 * Pure read-only. Never moves or deletes a file.
 *
 * Usage:
 *   node scripts/generate-asset-contact-sheets.mjs            # all sheets
 *   node scripts/generate-asset-contact-sheets.mjs --all       # same
 *   node scripts/generate-asset-contact-sheets.mjs --group player
 *   node scripts/generate-asset-contact-sheets.mjs --side-aware-only
 *   node scripts/generate-asset-contact-sheets.mjs --duplicates-only
 *   node scripts/generate-asset-contact-sheets.mjs --unregistered-only
 *   node scripts/generate-asset-contact-sheets.mjs --registered-only
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ASSET_CLASS_BY_TYPE, ASSET_SEMANTICS } from '../src/config/assetSemantics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const GAME_CONFIG = path.join(ROOT, 'src/config/gameConfig.js');
const OUT_DIR = path.join(ROOT, 'docs/visual-qa/asset-contact-sheets');

// ── Data collection helpers ─────────────────────────────────────────

async function walk(dir) {
  const out = [];
  async function recurse(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name === '_source') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) await recurse(full);
      else if (e.isFile() && full.endsWith('.png')) out.push(full);
    }
  }
  await recurse(dir);
  return out.sort();
}

async function readPngHeader(absPath) {
  let fh;
  try {
    fh = await fs.open(absPath, 'r');
    const buf = Buffer.alloc(24);
    await fh.read(buf, 0, 24, 0);
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch { return null; } finally { if (fh) await fh.close(); }
}

async function hashFile(absPath) {
  const buf = await fs.readFile(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function parseGameConfigKeys() {
  const src = await fs.readFile(GAME_CONFIG, 'utf8');
  const re = /(\w+)\s*:\s*['"](\.\/assets\/[^'"]+\.(?:png|svg))['"]/g;
  const map = new Map();   // key → rel path
  const reverse = new Map(); // rel path → key
  let m;
  while ((m = re.exec(src)) !== null) {
    const key = m[1];
    const rel = m[2].replace(/^\.\//, '');
    map.set(key, rel);
    reverse.set(rel, key);
  }
  return { keyToPath: map, pathToKey: reverse };
}

// ── Group definitions ───────────────────────────────────────────────

/**
 * Map each file's rel-path to one of the 18 contact sheet group IDs.
 * Priority: known assetType → ASSET_CLASS_BY_TYPE; else path-prefix
 * fall-back. Files not assignable to any group land in 'unclassified'.
 */
function groupForFile(relPath, registeredKey) {
  const lower = relPath.toLowerCase();
  // Player frames — by path, not by registered key.
  if (lower.startsWith('assets/player/')) return '01-player-frames';
  // Use ASSET_CLASS_BY_TYPE when path stem matches a known assetType.
  // Map common path heuristics → assetType.
  const knownType = inferAssetTypeFromPath(relPath);
  const cls = knownType ? ASSET_CLASS_BY_TYPE[knownType] : null;
  if (cls === 'GAMEPLAY_OBSTACLE') return '02-obstacles';
  if (cls === 'COLLECTIBLE')       return '03-collectibles';
  if (cls === 'BONUS_POWERUP')     return '04-powerups';
  if (cls === 'SUPPORT_FOUNDATION') return '05-side-structures-blocks';
  if (cls === 'SIDE_STRUCTURE')    return '06-side-structures-walls-bricks';
  if (cls === 'PLATFORM')          return '07-platforms';
  if (cls === 'STACKABLE_TOP' || lower.includes('/mushroom') || lower.includes('flower')) return '10-mushrooms-flowers-small-decor';
  if (cls === 'SIDE_DECOR_SMALL')  return '10-mushrooms-flowers-small-decor';
  if (cls === 'SIDE_DECOR_LARGE')  return '09-nature-trees-bushes-grass';
  if (cls === 'BACKGROUND_ONLY' || cls === 'LANDMARK') return '11-background-sky-clouds-mountains-castle';
  // Path-based heuristics for everything else.
  if (lower.startsWith('assets/effects/')) return '12-effects-sparkles-dust-hit-flash-bursts';
  if (lower.startsWith('assets/ui/')) return '13-ui-hud-icons';
  if (lower.startsWith('assets/background/')) return '11-background-sky-clouds-mountains-castle';
  if (lower.startsWith('assets/obstacles/')) return '02-obstacles';
  if (lower.startsWith('assets/collectibles/') || lower.startsWith('assets/pickups/')) return '03-collectibles';
  if (lower.startsWith('assets/powerups/')) return '04-powerups';
  if (lower.includes('/pipe') || lower.includes('/planter') || lower.includes('/fence')) return '08-pipes-planters-fences';
  if (lower.includes('/tree') || lower.includes('/bush') || lower.includes('/grass')) return '09-nature-trees-bushes-grass';
  if (lower.startsWith('assets/structures/')) return '06-side-structures-walls-bricks';
  if (lower.startsWith('assets/terrain/')) return '05-side-structures-blocks';
  if (lower.startsWith('assets/decor/')) return '10-mushrooms-flowers-small-decor';
  return 'unclassified';
}

/** Best-effort assetType inference from path stem. */
function inferAssetTypeFromPath(relPath) {
  const base = path.basename(relPath, '.png');
  // Strip frame numbers + side suffix to find the stem-as-assetType.
  const stem = base
    .replace(/_\d{1,3}$/, '')
    .replace(/_(left|right)$/, '');
  return ASSET_SEMANTICS[stem] ? stem : null;
}

const GROUP_ORDER = [
  { id: '01-player-frames',                              title: 'Player frames' },
  { id: '02-obstacles',                                  title: 'Obstacles' },
  { id: '03-collectibles',                               title: 'Collectibles' },
  { id: '04-powerups',                                   title: 'Power-ups' },
  { id: '05-side-structures-blocks',                     title: 'Side structures — blocks' },
  { id: '06-side-structures-walls-bricks',               title: 'Side structures — walls / bricks' },
  { id: '07-platforms',                                  title: 'Platforms' },
  { id: '08-pipes-planters-fences',                      title: 'Pipes / planters / fences' },
  { id: '09-nature-trees-bushes-grass',                  title: 'Nature — trees / bushes / grass' },
  { id: '10-mushrooms-flowers-small-decor',              title: 'Mushrooms / flowers / small decor' },
  { id: '11-background-sky-clouds-mountains-castle',     title: 'Background — sky / clouds / mountains / castle' },
  { id: '12-effects-sparkles-dust-hit-flash-bursts',     title: 'Effects — sparkles / dust / hit-flash / bursts' },
  { id: '13-ui-hud-icons',                               title: 'UI / HUD / icons' },
  { id: 'unclassified',                                  title: 'Unclassified' },
];

// ── Rendering ───────────────────────────────────────────────────────

const CELL_W = 260;
const CELL_H = 280;
const IMG_H = 200;
const COLS = 6;
const MARGIN = 12;
const HEADER_H = 60;
const PAGE_MAX_ROWS = 6; // 36 cells per page max

function pagesOf(items, cellsPerPage) {
  const pages = [];
  for (let i = 0; i < items.length; i += cellsPerPage) {
    pages.push(items.slice(i, i + cellsPerPage));
  }
  return pages.length === 0 ? [[]] : pages;
}

async function dataUrl(absPath) {
  const buf = await fs.readFile(absPath);
  return 'data:image/png;base64,' + buf.toString('base64');
}

async function renderSheet(browser, { sheetId, title, cells }) {
  const cellsPerPage = COLS * PAGE_MAX_ROWS;
  const pages = pagesOf(cells, cellsPerPage);
  const outFiles = [];
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx += 1) {
    const pageCells = pages[pageIdx];
    const rows = Math.max(1, Math.ceil(pageCells.length / COLS));
    const W = COLS * CELL_W + (COLS + 1) * MARGIN;
    const H = HEADER_H + rows * CELL_H + (rows + 1) * MARGIN;
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#0a0d14"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);
    // Pre-load image data URLs for the cells.
    const cellData = [];
    for (const c of pageCells) {
      const src = c.placeholder || !c.absPath ? null : await dataUrl(c.absPath);
      cellData.push({ ...c, src });
    }
    const pageLabel = pages.length > 1 ? ` · page ${pageIdx + 1}/${pages.length}` : '';
    await page.evaluate(async ({ cells, W, H, CELL_W, CELL_H, IMG_H, COLS, MARGIN, HEADER_H, title }) => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      // Background.
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, W, H);
      // Header.
      ctx.fillStyle = '#9ad17a';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(title, MARGIN, 38);
      ctx.fillStyle = '#7fa9c8';
      ctx.font = '14px monospace';
      ctx.fillText(`${cells.length} cells`, W - 110, 38);

      // Status → colour palette.
      const STATUS_COLOR = {
        USED: '#9ad17a',
        REGISTERED_UNUSED: '#a8d4ff',
        UNREGISTERED: '#ff9050',
        DUPLICATE: '#ff5050',
        SIDE_PAIR_OK: '#9ad17a',
        SIDE_PAIR_MISMATCH: '#ff5050',
        MISSING: '#ff5050',
        UNCLASSIFIED: '#c78cff',
      };

      // Cell helper.
      const drawCell = async (cell, cellX, cellY) => {
        // Checker background for transparency.
        const TILE = 12;
        for (let yy = 0; yy < IMG_H; yy += TILE) {
          for (let xx = 0; xx < CELL_W; xx += TILE) {
            const dark = ((xx / TILE) + (yy / TILE)) & 1;
            ctx.fillStyle = dark ? '#3a3a3a' : '#525252';
            ctx.fillRect(cellX + xx, cellY + yy, TILE, TILE);
          }
        }
        // Cell border.
        ctx.strokeStyle = '#1d2a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX, cellY, CELL_W, CELL_H);

        // Image: fit-contain within IMG area, nearest-neighbour.
        const imgArea = { x: cellX + 6, y: cellY + 6, w: CELL_W - 12, h: IMG_H - 12 };
        if (cell.placeholder) {
          // Missing-file placeholder: red diagonal cross.
          ctx.strokeStyle = '#ff5050';
          ctx.lineWidth = 2;
          ctx.strokeRect(imgArea.x + 4, imgArea.y + 4, imgArea.w - 8, imgArea.h - 8);
          ctx.beginPath();
          ctx.moveTo(imgArea.x + 4, imgArea.y + 4);
          ctx.lineTo(imgArea.x + imgArea.w - 4, imgArea.y + imgArea.h - 4);
          ctx.moveTo(imgArea.x + imgArea.w - 4, imgArea.y + 4);
          ctx.lineTo(imgArea.x + 4, imgArea.y + imgArea.h - 4);
          ctx.stroke();
          ctx.fillStyle = '#ff5050';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('MISSING', cellX + CELL_W / 2, cellY + IMG_H / 2);
        } else {
          await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const ratio = Math.min(imgArea.w / img.naturalWidth, imgArea.h / img.naturalHeight);
              const drawW = Math.round(img.naturalWidth * ratio);
              const drawH = Math.round(img.naturalHeight * ratio);
              const drawX = Math.round(cellX + (CELL_W - drawW) / 2);
              const drawY = Math.round(cellY + (IMG_H - drawH) / 2);
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
              resolve();
            };
            img.onerror = resolve;
            img.src = cell.src;
          });
        }

        // Label area: 4 lines.
        const labelY = cellY + IMG_H + 12;
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        // Line 1: filename or key.
        ctx.fillStyle = '#e8eff5';
        const headline = cell.key ?? cell.filename;
        ctx.fillText(truncate(headline, 36), cellX + 6, labelY);
        // Line 2: dimensions + status.
        ctx.fillStyle = STATUS_COLOR[cell.status] ?? '#aaa';
        const sizeStr = cell.placeholder ? '—' : `${cell.width}×${cell.height}`;
        ctx.fillText(`${sizeStr} · ${cell.status}`, cellX + 6, labelY + 14);
        // Line 3: role/class.
        ctx.fillStyle = '#7fa9c8';
        ctx.fillText(cell.role ?? 'UNCLASSIFIED', cellX + 6, labelY + 28);
        // Line 4: path.
        ctx.fillStyle = '#6b8294';
        ctx.fillText(truncate(cell.relPath ?? cell.expectedPath ?? '', 38), cellX + 6, labelY + 42);
      };

      const truncate = (s, n) => (s && s.length > n ? '…' + s.slice(-n + 1) : (s ?? ''));

      // Layout grid.
      for (let i = 0; i < cells.length; i += 1) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cellX = MARGIN + col * (CELL_W + MARGIN);
        const cellY = HEADER_H + MARGIN + row * (CELL_H + MARGIN);
        await drawCell(cells[i], cellX, cellY);
      }
    }, { cells: cellData, W, H, CELL_W, CELL_H, IMG_H, COLS, MARGIN, HEADER_H, title: title + pageLabel });

    // Snapshot canvas to PNG.
    const dataURL = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
    const buf = Buffer.from(dataURL.split(',')[1], 'base64');
    const fileName = pages.length > 1
      ? `${sheetId}-page-${String(pageIdx + 1).padStart(2, '0')}.png`
      : `${sheetId}.png`;
    const outPath = path.join(OUT_DIR, fileName);
    await fs.writeFile(outPath, buf);
    outFiles.push(outPath);
    console.log(`[contact-sheets]   wrote ${path.relative(ROOT, outPath)}  (${pageCells.length} cells)`);
    await ctx.close();
  }
  return outFiles;
}

// ── Side-aware pairs sheet ─────────────────────────────────────────

function findSidePairs(entries) {
  const byPath = new Map(entries.map((e) => [e.relPath, e]));
  const pairs = [];
  for (const e of entries) {
    if (!e.relPath.endsWith('_left.png')) continue;
    const rightPath = e.relPath.replace(/_left\.png$/, '_right.png');
    const right = byPath.get(rightPath);
    const stem = e.relPath.replace(/_left\.png$/, '');
    const status = right
      ? (e.width === right.width && e.height === right.height ? 'SIDE_PAIR_OK' : 'SIDE_PAIR_MISMATCH')
      : 'SIDE_PAIR_MISSING_RIGHT';
    pairs.push({ stem, left: e, right, status });
  }
  return pairs;
}

async function renderSidePairsSheet(browser, pairs) {
  const cells = [];
  for (const p of pairs) {
    // Render LEFT cell.
    cells.push({
      key: `${path.basename(p.stem)}_left`,
      filename: path.basename(p.left.relPath),
      relPath: p.left.relPath,
      absPath: p.left.absPath,
      width: p.left.width, height: p.left.height,
      status: p.status,
      role: `${path.basename(p.stem).toUpperCase()} · LEFT`,
    });
    // Render RIGHT cell (placeholder when missing).
    if (p.right) {
      cells.push({
        key: `${path.basename(p.stem)}_right`,
        filename: path.basename(p.right.relPath),
        relPath: p.right.relPath,
        absPath: p.right.absPath,
        width: p.right.width, height: p.right.height,
        status: p.status,
        role: `${path.basename(p.stem).toUpperCase()} · RIGHT`,
      });
    } else {
      cells.push({
        key: `${path.basename(p.stem)}_right`,
        filename: 'MISSING',
        expectedPath: `${p.stem}_right.png`,
        absPath: '',
        placeholder: true,
        status: 'SIDE_PAIR_MISSING_RIGHT',
        role: `${path.basename(p.stem).toUpperCase()} · RIGHT`,
      });
    }
  }
  return renderSheet(browser, { sheetId: '14-side-aware-pairs', title: 'Side-aware pairs', cells });
}

// ── Duplicates sheet ───────────────────────────────────────────────

function findDuplicates(entries) {
  const byHash = new Map();
  for (const e of entries) {
    if (!byHash.has(e.hash)) byHash.set(e.hash, []);
    byHash.get(e.hash).push(e);
  }
  return [...byHash.values()].filter((g) => g.length > 1);
}

async function renderDuplicatesSheet(browser, dupGroups) {
  const cells = [];
  for (let i = 0; i < dupGroups.length; i += 1) {
    const group = dupGroups[i];
    for (const e of group) {
      cells.push({
        key: `dup#${i + 1}`,
        filename: path.basename(e.relPath),
        relPath: e.relPath,
        absPath: e.absPath,
        width: e.width, height: e.height,
        status: 'DUPLICATE',
        role: `GROUP ${i + 1} · ${group.length} copies`,
      });
    }
  }
  return renderSheet(browser, { sheetId: '15-duplicates-exact', title: 'Exact duplicates (SHA-256 groups)', cells });
}

// ── Unregistered / registered-unused / missing sheets ─────────────

async function renderUnregisteredSheet(browser, entries, pathToKey) {
  const unreg = entries.filter((e) => !pathToKey.has(e.relPath));
  const cells = unreg.map((e) => ({
    filename: path.basename(e.relPath),
    relPath: e.relPath,
    absPath: e.absPath,
    width: e.width, height: e.height,
    status: 'UNREGISTERED',
    role: pathBucket(e.relPath),
  }));
  return renderSheet(browser, { sheetId: '16-unregistered-assets', title: 'Unregistered assets', cells });
}

function pathBucket(relPath) {
  const parts = relPath.split('/');
  return parts[1] ? parts[1].toUpperCase() : 'ROOT';
}

async function renderRegisteredUnusedSheet(browser, entries, keyToPath, runtimeUsedTypes) {
  const used = new Set(runtimeUsedTypes);
  const cells = [];
  for (const [key, relPath] of keyToPath) {
    if (used.has(key)) continue;
    const e = entries.find((x) => x.relPath === relPath);
    if (!e) continue;
    cells.push({
      key,
      filename: path.basename(relPath),
      relPath,
      absPath: e.absPath,
      width: e.width, height: e.height,
      status: 'REGISTERED_UNUSED',
      role: pathBucket(relPath),
    });
  }
  return renderSheet(browser, { sheetId: '17-registered-unused', title: 'Registered but unused (no runtime consumer)', cells });
}

async function renderMissingSheet(browser, entries, keyToPath) {
  const fileSet = new Set(entries.map((e) => e.relPath));
  const cells = [];
  for (const [key, relPath] of keyToPath) {
    if (fileSet.has(relPath)) continue;
    cells.push({
      key,
      filename: path.basename(relPath),
      relPath,
      expectedPath: relPath,
      absPath: '',
      placeholder: true,
      width: 0, height: 0,
      status: 'MISSING',
      role: pathBucket(relPath),
    });
  }
  return renderSheet(browser, { sheetId: '18-missing-dead-keys-placeholders', title: 'Missing files / dead keys', cells });
}

// ── Runtime consumer detection ─────────────────────────────────────

/**
 * Tries to find keys that are actually referenced from runtime code
 * (anywhere under src/). Returns a set of registered keys that
 * appear at least once. Anything NOT in this set + present in
 * gameConfig.assets = registered but unused.
 */
async function findRuntimeUsedKeys(keyToPath) {
  const srcDir = path.join(ROOT, 'src');
  const used = new Set();
  // Grep src/ recursively for each key.
  const files = [];
  async function recurse(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await recurse(full);
      else if (e.isFile() && (full.endsWith('.js') || full.endsWith('.mjs'))) files.push(full);
    }
  }
  await recurse(srcDir);
  // Concatenate all source content once — then test each key against it.
  const allSrc = (await Promise.all(files.map((f) => fs.readFile(f, 'utf8')))).join('\n');
  for (const key of keyToPath.keys()) {
    // Skip the gameConfig declaration itself (it always has `<key>:`).
    // A key is "used" when it appears in code as a string literal or
    // identifier substring distinct from its own declaration line.
    // Cheap heuristic: occurrence count > 1 (declaration + at least one
    // consumer somewhere in src/).
    const re = new RegExp(`\\b${key}\\b`, 'g');
    const matches = allSrc.match(re);
    if (matches && matches.length > 1) used.add(key);
  }
  return used;
}

// ── Main pipeline ──────────────────────────────────────────────────

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  const groupIdx = process.argv.indexOf('--group');
  const groupName = groupIdx >= 0 ? process.argv[groupIdx + 1] : null;
  return {
    all: args.has('--all') || (args.size === 0),
    group: groupName,
    sideAwareOnly: args.has('--side-aware-only'),
    duplicatesOnly: args.has('--duplicates-only'),
    unregisteredOnly: args.has('--unregistered-only'),
    registeredOnly: args.has('--registered-only'),
  };
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`[contact-sheets] scanning ${path.relative(ROOT, ASSETS_DIR)}`);

  const files = await walk(ASSETS_DIR);
  const entries = [];
  for (const f of files) {
    const [dims, hash] = await Promise.all([readPngHeader(f), hashFile(f)]);
    if (!dims) continue;
    entries.push({
      absPath: f,
      relPath: path.relative(ROOT, f),
      width: dims.width,
      height: dims.height,
      hash,
    });
  }
  console.log(`[contact-sheets] scanned ${entries.length} PNGs`);

  const { keyToPath, pathToKey } = await parseGameConfigKeys();
  const runtimeUsed = await findRuntimeUsedKeys(keyToPath);
  console.log(`[contact-sheets] runtime consumer scan: ${runtimeUsed.size}/${keyToPath.size} keys used in src/`);

  // Build per-file metadata.
  const enriched = entries.map((e) => {
    const key = pathToKey.get(e.relPath);
    const stemType = inferAssetTypeFromPath(e.relPath);
    const cls = stemType ? ASSET_CLASS_BY_TYPE[stemType] : null;
    return {
      ...e,
      key,
      class: cls ?? 'UNCLASSIFIED',
      group: groupForFile(e.relPath, key),
    };
  });

  const browser = await chromium.launch();
  try {
    const generatedSheets = [];
    const filters = {
      sideAwareOnly: args.sideAwareOnly,
      duplicatesOnly: args.duplicatesOnly,
      unregisteredOnly: args.unregisteredOnly,
      registeredOnly: args.registeredOnly,
      group: args.group,
    };
    const shouldRender = (kind) => {
      if (filters.sideAwareOnly) return kind === 'side-aware';
      if (filters.duplicatesOnly) return kind === 'duplicates';
      if (filters.unregisteredOnly) return kind === 'unregistered';
      if (filters.registeredOnly) return kind === 'registered-unused' || kind === 'registered-group';
      if (filters.group) return kind === 'group';
      return true;
    };

    if (shouldRender('group')) {
      for (const g of GROUP_ORDER) {
        if (filters.group && filters.group !== g.id && !g.id.includes(filters.group)) continue;
        const cells = enriched
          .filter((e) => e.group === g.id)
          .map((e) => ({
            key: e.key,
            filename: path.basename(e.relPath),
            relPath: e.relPath,
            absPath: e.absPath,
            width: e.width, height: e.height,
            status: e.key
              ? (runtimeUsed.has(e.key) ? 'USED' : 'REGISTERED_UNUSED')
              : 'UNREGISTERED',
            role: e.class,
          }));
        if (cells.length === 0) continue;
        const sheets = await renderSheet(browser, { sheetId: g.id, title: g.title, cells });
        generatedSheets.push({ group: g, sheets, cellCount: cells.length });
      }
    }
    if (shouldRender('side-aware')) {
      const pairs = findSidePairs(enriched);
      if (pairs.length) {
        const sheets = await renderSidePairsSheet(browser, pairs);
        generatedSheets.push({ group: { id: '14-side-aware-pairs', title: 'Side-aware pairs' }, sheets, cellCount: pairs.length * 2 });
      }
    }
    if (shouldRender('duplicates')) {
      const groups = findDuplicates(enriched);
      if (groups.length) {
        const sheets = await renderDuplicatesSheet(browser, groups);
        generatedSheets.push({ group: { id: '15-duplicates-exact', title: 'Exact duplicates' }, sheets, cellCount: groups.reduce((s, g) => s + g.length, 0) });
      }
    }
    if (shouldRender('unregistered')) {
      const sheets = await renderUnregisteredSheet(browser, enriched, pathToKey);
      generatedSheets.push({ group: { id: '16-unregistered-assets', title: 'Unregistered assets' }, sheets, cellCount: enriched.filter((e) => !pathToKey.has(e.relPath)).length });
    }
    if (shouldRender('registered-unused')) {
      const sheets = await renderRegisteredUnusedSheet(browser, enriched, keyToPath, runtimeUsed);
      generatedSheets.push({ group: { id: '17-registered-unused', title: 'Registered but unused' }, sheets, cellCount: [...keyToPath.keys()].filter((k) => !runtimeUsed.has(k)).length });
    }
    if (shouldRender('group') || filters.group === null) {
      const sheets = await renderMissingSheet(browser, enriched, keyToPath);
      generatedSheets.push({ group: { id: '18-missing-dead-keys-placeholders', title: 'Missing / dead keys' }, sheets, cellCount: [...keyToPath.values()].filter((p) => !enriched.some((e) => e.relPath === p)).length });
    }

    // Build markdown index + inventory.
    await writeMarkdownIndex(generatedSheets, enriched, pathToKey, runtimeUsed);
    await writeInventoryMarkdown(enriched, pathToKey, runtimeUsed);
  } finally {
    await browser.close();
  }
}

async function writeMarkdownIndex(generated, enriched, pathToKey, runtimeUsed) {
  const total = enriched.length;
  const registered = enriched.filter((e) => pathToKey.has(e.relPath)).length;
  const unregistered = total - registered;
  const dupGroups = findDuplicates(enriched);
  const pairs = findSidePairs(enriched);
  const pairsOk = pairs.filter((p) => p.status === 'SIDE_PAIR_OK').length;
  const pairsBroken = pairs.length - pairsOk;
  // pathToKey is a Map<relPath, key>; its keys() ARE the registered
  // paths. Dead = registered path with no file on disk.
  const fileSet = new Set(enriched.map((e) => e.relPath));
  const deadKeys = [...pathToKey.keys()].filter((p) => !fileSet.has(p)).length;
  const lines = [];
  lines.push('# Asset Contact Sheets');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`- Total PNG files: **${total}**`);
  lines.push(`- Registered in gameConfig: **${registered}**`);
  lines.push(`- Unregistered: **${unregistered}**`);
  lines.push(`- Runtime-used keys: **${runtimeUsed.size}** / ${pathToKey.size}`);
  lines.push(`- Dead keys (no file): **${deadKeys}**`);
  lines.push(`- Exact duplicate groups (SHA-256): **${dupGroups.length}**`);
  lines.push(`- Side-aware pairs (OK / broken / missing-right): **${pairsOk}** / **${pairsBroken}** / **${pairs.filter((p) => p.status === 'SIDE_PAIR_MISSING_RIGHT').length}**`);
  lines.push('');
  lines.push('## Contact sheets');
  lines.push('');
  for (const g of generated) {
    if (!g.sheets.length) continue;
    lines.push(`### ${g.group.title} (${g.cellCount} cells)`);
    for (const f of g.sheets) lines.push(`- [\`${path.basename(f)}\`](${path.basename(f)})`);
    lines.push('');
  }
  lines.push('## Regeneration');
  lines.push('```bash');
  lines.push('node scripts/generate-asset-contact-sheets.mjs --all');
  lines.push('node scripts/generate-asset-contact-sheets.mjs --group 02-obstacles');
  lines.push('node scripts/generate-asset-contact-sheets.mjs --side-aware-only');
  lines.push('node scripts/generate-asset-contact-sheets.mjs --duplicates-only');
  lines.push('```');
  await fs.writeFile(path.join(OUT_DIR, 'README.md'), lines.join('\n'));
  console.log('[contact-sheets] wrote docs/visual-qa/asset-contact-sheets/README.md');
}

async function writeInventoryMarkdown(enriched, pathToKey, runtimeUsed) {
  const lines = [];
  lines.push('# Asset Visual Inventory');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}`);
  lines.push('Derived from the contact-sheet generator pass.');
  lines.push('');

  // Active by group.
  lines.push('## Active assets (USED — referenced in src/)');
  const usedByGroup = new Map();
  for (const e of enriched) {
    if (!e.key || !runtimeUsed.has(e.key)) continue;
    const g = e.group;
    if (!usedByGroup.has(g)) usedByGroup.set(g, []);
    usedByGroup.get(g).push(e);
  }
  for (const g of GROUP_ORDER) {
    const list = usedByGroup.get(g.id) ?? [];
    if (list.length === 0) continue;
    lines.push(`### ${g.title} (${list.length})`);
    for (const e of list) lines.push(`- \`${e.key}\` → ${e.relPath}`);
    lines.push('');
  }

  // Unregistered.
  const unreg = enriched.filter((e) => !pathToKey.has(e.relPath));
  lines.push(`## Unregistered (${unreg.length})`);
  const byBucket = new Map();
  for (const e of unreg) {
    const b = pathBucket(e.relPath);
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b).push(e);
  }
  for (const [bucket, list] of [...byBucket.entries()].sort()) {
    lines.push(`### ${bucket} (${list.length})`);
    for (const e of list.slice(0, 30)) lines.push(`- ${e.relPath} — ${e.width}×${e.height}`);
    if (list.length > 30) lines.push(`- _(${list.length - 30} more)_`);
    lines.push('');
  }

  // Duplicates.
  const dups = findDuplicates(enriched);
  lines.push(`## Duplicate exact groups (${dups.length})`);
  for (let i = 0; i < dups.length; i += 1) {
    lines.push(`### Group ${i + 1} (${dups[i].length} copies — ${dups[i][0].width}×${dups[i][0].height})`);
    for (const e of dups[i]) lines.push(`- ${e.relPath}`);
    lines.push('');
  }

  // Side-aware problems.
  const pairs = findSidePairs(enriched);
  const problems = pairs.filter((p) => p.status !== 'SIDE_PAIR_OK');
  lines.push(`## Side-aware problems (${problems.length})`);
  for (const p of problems) {
    if (p.status === 'SIDE_PAIR_MISSING_RIGHT') {
      lines.push(`- \`${p.stem}\` — missing **_right.png** (have \`${p.left.relPath}\` ${p.left.width}×${p.left.height})`);
    } else {
      lines.push(`- \`${p.stem}\` — DIM MISMATCH: left ${p.left.width}×${p.left.height} ≠ right ${p.right.width}×${p.right.height}`);
    }
  }
  lines.push('');

  // Missing critical (dead keys). pathToKey is Map<relPath, key>.
  const fileSet = new Set(enriched.map((e) => e.relPath));
  const deadKeys = [...pathToKey.entries()].filter(([relPath]) => !fileSet.has(relPath));
  lines.push(`## Missing critical (${deadKeys.length})`);
  for (const [relPath, key] of deadKeys) {
    lines.push(`- \`${key}\` → expected at \`${relPath}\``);
  }
  lines.push('');

  // Action lists.
  lines.push('## Designer action list');
  lines.push('');
  lines.push(`- **P0**: ${problems.filter((p) => p.status === 'SIDE_PAIR_MISMATCH').length} side-pair dim mismatches need re-export`);
  lines.push(`- **P0**: ${dups.length} exact-content duplicate groups — pick one canonical path per asset, archive the rest`);
  lines.push(`- **P1**: ${problems.filter((p) => p.status === 'SIDE_PAIR_MISSING_RIGHT').length} side-aware pairs missing _right.png`);
  lines.push(`- **P1**: ${deadKeys.length} dead-key files designer needs to ship`);
  lines.push('');
  lines.push('## Developer action list');
  lines.push('');
  lines.push(`- wire: ${[...pathToKey.keys()].filter((k) => !runtimeUsed.has(k)).length} registered keys lack a runtime consumer`);
  lines.push(`- classify: files in \`unclassified\` group need ASSET_CLASS_BY_TYPE entry`);
  lines.push(`- reject (move to _source/): files in duplicate groups beyond the canonical copy`);
  lines.push('');
  await fs.writeFile(path.join(OUT_DIR, 'asset-visual-inventory.md'), lines.join('\n'));
  console.log('[contact-sheets] wrote docs/visual-qa/asset-contact-sheets/asset-visual-inventory.md');
}

main().catch((err) => { console.error('[contact-sheets] failed', err); process.exit(1); });
