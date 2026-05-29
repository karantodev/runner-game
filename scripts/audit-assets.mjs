/**
 * Asset audit script — walks assets/, cross-references with the registered
 * keys in src/config/gameConfig.js, and produces docs/asset-audit-report.md.
 *
 * Per-file classification:
 *   USED            file path matches a registered key in gameConfig.assets
 *   UNREGISTERED    file exists but no key in gameConfig points at it.
 *                   Sub-classified into:
 *                     ANIM_PENDING_WIRE     anim sheet frame; brief P2 expected
 *                     DESIGNER_OVERDELIVERY ≥ N variants of the same stem; STOP list candidate
 *                     SIDE_PAIR_PENDING     part of a _left/_right pair; needs registration
 *                     ALT_VARIANT           alt path / fallback; bonus shipment
 *                     PENDING_REGISTRATION  default — review + wire OR move to _source/
 *   DEAD_KEY        gameConfig key points at a file that doesn't exist.
 *                   Sub-classified into:
 *                     ANIM_PENDING_DESIGNER expected anim frame; brief P2 priority
 *                     PATH_MISMATCH         file exists at a near-matching path
 *                     DEPRECATED            legacy key, file removed intentionally
 *   SIDE_PAIR_OK    side-aware file has a complete _left/_right partner
 *   SIDE_ORPHAN     side-aware file is missing its partner
 *
 * Run:    node scripts/audit-assets.mjs          (full report)
 *         node scripts/audit-assets.mjs --check  (warning summary, exit 0)
 * Output: docs/asset-audit-report.md
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const GAME_CONFIG = path.join(ROOT, 'src/config/gameConfig.js');
const REPORT_OUT = path.join(ROOT, 'docs/asset-audit-report.md');

/** Walk a directory recursively and return relative file paths from ROOT. */
async function walk(dir) {
  const out = [];
  async function recurse(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await recurse(full);
      else if (e.isFile()) out.push(path.relative(ROOT, full));
    }
  }
  await recurse(dir);
  return out.sort();
}

/** Extract `key: './path.png'` pairs from gameConfig.js. */
async function parseGameConfigKeys() {
  const src = await fs.readFile(GAME_CONFIG, 'utf8');
  const re = /(\w+)\s*:\s*['"](\.\/assets\/[^'"]+\.(?:png|svg))['"]/g;
  const map = new Map();
  let m;
  while ((m = re.exec(src)) !== null) {
    const key = m[1];
    const rel = m[2].replace(/^\.\//, '');
    map.set(key, rel);
  }
  return map;
}

/** Group files by their top-level category directory. */
function bucketByCategory(files) {
  const buckets = new Map();
  for (const f of files) {
    const parts = f.split(path.sep);
    if (parts[0] !== 'assets') continue;
    const cat = parts.slice(0, 2).join('/');
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat).push(f);
  }
  return buckets;
}

/** Detect _left/_right side-aware pairs and orphans. */
function classifySideAware(files) {
  const sideAware = new Map(); // base name (no _left/_right) -> { left, right }
  for (const f of files) {
    const base = f.replace(/_left\.png$/i, '').replace(/_right\.png$/i, '');
    if (base === f) continue; // not a side-aware file
    if (!sideAware.has(base)) sideAware.set(base, { left: null, right: null });
    const entry = sideAware.get(base);
    if (/_left\.png$/i.test(f)) entry.left = f;
    if (/_right\.png$/i.test(f)) entry.right = f;
  }
  return sideAware;
}

/** Detect near-duplicate filenames (heuristic by name similarity, NOT pixel hash). */
function detectDuplicates(files, buckets) {
  const groups = [];
  for (const [cat, list] of buckets) {
    // Group by stripped basename: collapse _01 / _02 / _alt / -small / etc.
    const byStem = new Map();
    for (const f of list) {
      const base = path.basename(f, path.extname(f));
      const stem = base
        .replace(/_[0-9]{1,2}$/i, '')
        .replace(/_alt$/i, '')
        .replace(/_(small|medium|large|big)$/i, '')
        .replace(/_(left|right)$/i, '')
        .replace(/^([a-z_]+)_(0?\d)$/i, '$1');
      if (!byStem.has(stem)) byStem.set(stem, []);
      byStem.get(stem).push(f);
    }
    for (const [stem, list2] of byStem) {
      if (list2.length >= 3) {
        groups.push({ category: cat, stem, count: list2.length, files: list2 });
      }
    }
  }
  return groups;
}

function mdEscape(s) {
  return s.replace(/_/g, '\\_').replace(/\*/g, '\\*');
}

// ── Classification heuristics ─────────────────────────────────────────────────

const ANIM_STEMS = [
  'sparkle_', 'jump_dust_', 'hit_flash_', 'lane_swoosh_', 'collect_burst_',
  'orchid_gold_sparkle_', 'orchid_gold_collect_', 'dust_puff_',
];

function classifyDeadKey({ key, path: filePath, fileSet, files }) {
  const lc = filePath.toLowerCase();
  if (ANIM_STEMS.some((s) => lc.includes(s))) return 'ANIM_PENDING_DESIGNER';
  // Path mismatch heuristic: is there a file whose basename matches?
  const wantedBase = path.basename(filePath);
  const wantedStem = wantedBase.replace(/\.png$/, '');
  for (const f of files) {
    const fb = path.basename(f).replace(/\.png$/, '');
    if (fb === wantedStem || fb === `pickup_${wantedStem}` || `pickup_${fb}` === wantedStem) {
      return 'PATH_MISMATCH';
    }
  }
  return 'DEPRECATED';
}

/**
 * v3.8.32 — Player Frame Validation.
 * Reads the raw PNG header (no image library; PNG signature + IHDR at
 * fixed offsets) for every registered key matching the playerFarmer*
 * family and compares against the canonical 64×96 canvas. Surfaces
 * designer-side asset bugs (oversized canvas, tight crop) at CI time.
 */
const PLAYER_FRAME_RE = /^playerFarmer(Run|Crouch|Jump|Hit|Idle|Death)\d+$/;
const PLAYER_CANONICAL = { w: 64, h: 96 };

async function readPngDimensions(absPath) {
  let fh;
  try {
    fh = await fs.open(absPath, 'r');
    const buf = Buffer.alloc(24);
    await fh.read(buf, 0, 24, 0);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A. Width / height are big-
    // endian uint32 at offsets 16 / 20 inside the IHDR chunk.
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch {
    return null;
  } finally {
    if (fh) await fh.close();
  }
}

async function validatePlayerFrames(keys) {
  const rows = [];
  for (const [key, relPath] of keys.entries()) {
    if (!PLAYER_FRAME_RE.test(key)) continue;
    const abs = path.join(ROOT, relPath);
    const dims = await readPngDimensions(abs);
    if (!dims) {
      rows.push({
        key, path: relPath,
        sourceW: 0, sourceH: 0,
        status: 'MISSING',
        action: 'asset file missing or unreadable',
      });
      continue;
    }
    const ok = dims.width === PLAYER_CANONICAL.w && dims.height === PLAYER_CANONICAL.h;
    rows.push({
      key, path: relPath,
      sourceW: dims.width, sourceH: dims.height,
      status: ok ? 'OK' : 'FAIL',
      action: ok ? '' : `re-export on ${PLAYER_CANONICAL.w}×${PLAYER_CANONICAL.h}`,
    });
  }
  return rows;
}

function classifyUnregistered({ filePath, sideAware, duplicateGroupsByFile }) {
  const lc = filePath.toLowerCase();
  if (ANIM_STEMS.some((s) => lc.includes(s))) return 'ANIM_PENDING_WIRE';
  // Side-aware partner check
  const base = filePath.replace(/_left\.png$/i, '').replace(/_right\.png$/i, '');
  if (base !== filePath) {
    const e = sideAware.get(base);
    if (e && e.left && e.right) return 'SIDE_PAIR_PENDING';
  }
  if (duplicateGroupsByFile.has(filePath)) return 'DESIGNER_OVERDELIVERY';
  if (/_alt|_alt\.|_0[1-9]/i.test(filePath)) return 'ALT_VARIANT';
  return 'PENDING_REGISTRATION';
}

async function main() {
  const argv = process.argv.slice(2);
  const checkMode = argv.includes('--check');

  const files = await walk(ASSETS_DIR);
  const keys = await parseGameConfigKeys();
  // v3.8.32 — player-frame dimension validation (independent of the
  // registered / unregistered classification above).
  const playerFrames = await validatePlayerFrames(keys);

  // USED: files referenced by a key
  const usedFiles = new Set(keys.values());
  // DEAD_KEY: registered key whose file doesn't exist
  const fileSet = new Set(files);
  const deadKeys = [];
  for (const [k, p] of keys) {
    if (!fileSet.has(p)) deadKeys.push({ key: k, path: p });
  }
  // UNREGISTERED: PNGs not referenced anywhere in gameConfig
  const unregistered = files.filter((f) => f.endsWith('.png') && !usedFiles.has(f));

  // Buckets + side-aware + duplicates
  const buckets = bucketByCategory(files);
  const sideAware = classifySideAware(files);
  const duplicates = detectDuplicates(files, buckets);

  // Index of file → duplicate group (so we can tag overdelivery)
  const duplicateGroupsByFile = new Map();
  for (const g of duplicates) {
    for (const f of g.files) duplicateGroupsByFile.set(f, g.stem);
  }

  // Classify dead keys + unregistered with sub-categories
  for (const d of deadKeys) {
    d.kind = classifyDeadKey({ key: d.key, path: d.path, fileSet, files });
  }
  const unregClassified = unregistered.map((filePath) => ({
    path: filePath,
    kind: classifyUnregistered({ filePath, sideAware, duplicateGroupsByFile }),
  }));
  const unregByKind = new Map();
  for (const u of unregClassified) {
    if (!unregByKind.has(u.kind)) unregByKind.set(u.kind, []);
    unregByKind.get(u.kind).push(u.path);
  }
  const deadByKind = new Map();
  for (const d of deadKeys) {
    if (!deadByKind.has(d.kind)) deadByKind.set(d.kind, []);
    deadByKind.get(d.kind).push(d);
  }

  // --check mode prints a short summary and exits (always 0 in v1)
  if (checkMode) {
    console.log('[audit:check] summary');
    console.log(`  files               ${files.length}`);
    console.log(`  registered keys     ${keys.size}`);
    console.log(`  unregistered PNGs   ${unregistered.length}`);
    for (const [k, list] of [...unregByKind.entries()].sort()) {
      console.log(`    └─ ${k.padEnd(25)} ${list.length}`);
    }
    console.log(`  dead keys           ${deadKeys.length}`);
    for (const [k, list] of [...deadByKind.entries()].sort()) {
      console.log(`    └─ ${k.padEnd(25)} ${list.length}`);
    }
    console.log(`  side-aware orphans  ${[...sideAware.values()].filter((e) => !e.left || !e.right).length}`);
    console.log(`  duplicate groups    ${duplicates.length}`);

    // v3.8.32 — Player Frame Validation block.
    const pfFail = playerFrames.filter((r) => r.status === 'FAIL');
    const pfMiss = playerFrames.filter((r) => r.status === 'MISSING');
    const pfOk = playerFrames.length - pfFail.length - pfMiss.length;
    console.log('\n[audit:check] player frame validation');
    console.log(`  canonical canvas    ${PLAYER_CANONICAL.w}×${PLAYER_CANONICAL.h}`);
    console.log(`  total               ${playerFrames.length}`);
    console.log(`  OK                  ${pfOk}`);
    console.log(`  FAIL                ${pfFail.length}`);
    console.log(`  MISSING             ${pfMiss.length}`);
    if (pfFail.length) {
      console.log('  failing frames:');
      for (const r of pfFail) {
        console.log(`    FAIL ${r.key}: ${r.sourceW}×${r.sourceH}, expected ${PLAYER_CANONICAL.w}×${PLAYER_CANONICAL.h}`);
      }
    }
    if (pfMiss.length) {
      console.log('  missing frames:');
      for (const r of pfMiss) {
        console.log(`    MISSING ${r.key}: ${r.path}`);
      }
    }

    // Warnings (non-fatal in v1)
    const warnings = [];
    if (unregByKind.get('DESIGNER_OVERDELIVERY')?.length > 5) warnings.push('many DESIGNER_OVERDELIVERY files — review designer STOP list');
    if (deadByKind.get('PATH_MISMATCH')?.length > 0) warnings.push('PATH_MISMATCH dead keys — engine paths need migration');
    if (pfFail.length) warnings.push(`${pfFail.length} player frame(s) have non-canonical source dimensions — see P0 re-export list`);
    if (pfMiss.length) warnings.push(`${pfMiss.length} player frame(s) missing from disk`);
    if (warnings.length) {
      console.log('\n[audit:check] warnings:');
      for (const w of warnings) console.log('  ⚠ ' + w);
    }
    return;
  }

  // Totals
  const totals = {
    files: files.length,
    registeredKeys: keys.size,
    usedFiles: usedFiles.size,
    unregistered: unregistered.length,
    deadKeys: deadKeys.length,
    duplicateGroups: duplicates.length,
    sideAwarePairs: 0,
    sideOrphans: 0,
  };
  for (const { left, right } of sideAware.values()) {
    if (left && right) totals.sideAwarePairs += 1;
    else totals.sideOrphans += 1;
  }

  // Render report
  let md = '';
  md += `# Asset Audit Report\n\n`;
  md += `Generated: ${new Date().toISOString().split('T')[0]}\n\n`;
  md += `Source-of-truth: \`assets/\` tree vs \`src/config/gameConfig.js → GAME_CONFIG.assets\` registry.\n\n`;
  md += `## Totals\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Files in \`assets/\` (any extension) | ${totals.files} |\n`;
  md += `| Registered keys in gameConfig | ${totals.registeredKeys} |\n`;
  md += `| Files reachable from gameConfig | ${totals.usedFiles} |\n`;
  md += `| **Unregistered PNGs** | **${totals.unregistered}** |\n`;
  md += `| **Dead keys (config → missing file)** | **${totals.deadKeys}** |\n`;
  md += `| Duplicate / near-duplicate groups (≥ 3 files / stem) | ${totals.duplicateGroups} |\n`;
  md += `| Side-aware pairs (\`_left\` + \`_right\`) | ${totals.sideAwarePairs} |\n`;
  md += `| **Side-aware orphans** (one half shipped) | **${totals.sideOrphans}** |\n\n`;

  md += `## Buckets by category\n\n`;
  md += `| Category | File count |\n|---|---|\n`;
  const bucketRows = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [cat, list] of bucketRows) {
    md += `| \`${mdEscape(cat)}\` | ${list.length} |\n`;
  }
  md += `\n`;

  if (deadKeys.length) {
    md += `## ⚠️ Dead keys (gameConfig key → missing file)\n\n`;
    md += `These keys ARE registered in \`GAME_CONFIG.assets\` but the file is gone from disk. Classified per heuristic:\n\n`;
    md += `- **ANIM_PENDING_DESIGNER** — expected anim sheet frame; brief P2 priority (keep key, ship frame)\n`;
    md += `- **PATH_MISMATCH** — a file with the same name exists at a different path; engine path needs migration\n`;
    md += `- **DEPRECATED** — legacy key, no obvious match on disk; safe to remove from \`gameConfig.assets\`\n\n`;
    md += `| Key | Path | Action |\n|---|---|---|\n`;
    for (const { key, path: p, kind } of deadKeys.sort((a, b) => a.kind.localeCompare(b.kind))) {
      md += `| \`${mdEscape(key)}\` | \`${mdEscape(p)}\` | **${kind}** |\n`;
    }
    md += `\n`;
  }

  if (totals.sideOrphans) {
    md += `## ⚠️ Side-aware orphans\n\n`;
    md += `Files shipped as one half of a per-side pair (Golden Rule § 1.4.1). The engine canvas-flips orphans, reversing the sun-upper-right lighting on the unshipped side. Ship the partner or move both to \`_source/\`.\n\n`;
    md += `| Base name | Left | Right |\n|---|---|---|\n`;
    for (const [base, e] of [...sideAware.entries()].sort()) {
      if (!e.left || !e.right) {
        md += `| ${mdEscape(base)} | ${e.left ? '✅' : '❌'} | ${e.right ? '✅' : '❌'} |\n`;
      }
    }
    md += `\n`;
  }

  if (duplicates.length) {
    md += `## Duplicate / near-duplicate groups (heuristic)\n\n`;
    md += `Heuristic stem-grouping: files whose names collapse to the same stem after stripping \`_NN\`, \`_alt\`, size suffixes, and \`_left\`/\`_right\`. ≥ 3 files per stem are flagged as candidates for designer review. Each group may contain LEGITIMATE variants (anim frames, side pairs, LODs) — the designer / dev review picks which to keep.\n\n`;
    duplicates.sort((a, b) => b.count - a.count);
    for (const g of duplicates) {
      md += `### \`${mdEscape(g.category)}\` — stem \`${mdEscape(g.stem)}\` (${g.count} files)\n\n`;
      md += '```\n';
      for (const f of g.files) md += `${f}\n`;
      md += '```\n\n';
    }
  }

  if (unregistered.length) {
    md += `## Unregistered PNGs (file exists, no gameConfig key)\n\n`;
    md += `Classified per heuristic. Sorted by classification, then by category:\n\n`;
    md += `- **ANIM_PENDING_WIRE** — anim sheet frame; engine has a wiring slot, registration is the unblocker\n`;
    md += `- **SIDE_PAIR_PENDING** — half of a delivered \`_left\`/\`_right\` pair; needs gameConfig key + SIDE_AWARE_TYPES entry\n`;
    md += `- **DESIGNER_OVERDELIVERY** — falls inside a duplicate-group stem; STOP list candidate (see brief)\n`;
    md += `- **ALT_VARIANT** — alt path / bonus shipment; wire optional\n`;
    md += `- **PENDING_REGISTRATION** — default; review + wire OR move to \`_source/\`\n\n`;
    for (const kind of ['ANIM_PENDING_WIRE', 'SIDE_PAIR_PENDING', 'DESIGNER_OVERDELIVERY', 'ALT_VARIANT', 'PENDING_REGISTRATION']) {
      const list = unregByKind.get(kind) ?? [];
      if (!list.length) continue;
      md += `### ${kind} (${list.length})\n\n`;
      md += '```\n';
      for (const f of list.sort()) md += `${f}\n`;
      md += '```\n\n';
    }
  }

  await fs.writeFile(REPORT_OUT, md);
  console.log(`[audit] wrote ${path.relative(ROOT, REPORT_OUT)}`);
  console.log(`[audit] ${totals.files} files, ${totals.registeredKeys} keys, ${totals.unregistered} unregistered, ${totals.deadKeys} dead, ${totals.sideOrphans} orphans, ${totals.duplicateGroups} duplicate groups`);
}

main().catch((err) => {
  console.error('[audit] failed', err);
  process.exit(1);
});
