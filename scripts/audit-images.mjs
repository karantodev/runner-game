/**
 * v3.8.42 — Phase 7b image audit. Static analysis of every PNG under
 * assets/ (excluding _source/). Produces docs/image-audit-report.md.
 *
 * Detects:
 *   - Exact duplicates by SHA-256 file-content hash. Two files with
 *     identical bytes are byte-for-byte copies — designer or dev
 *     accidentally shipped the same image twice under different names.
 *   - Dimension inconsistency within a stem family (e.g., all
 *     player_farmer_run_* should be the same width × height; all
 *     stone_brick_single_left and _right should match).
 *   - Side-pair dimension mismatch: when `_left.png` and `_right.png`
 *     siblings disagree on dims, the engine's per-side variant draw
 *     would render one half at a different scale.
 *   - Suspicious aspect ratios for known categories (e.g., a "block"
 *     that's 200×40 is probably a wall, not a block — flag for review).
 *
 * Runs without any external image libraries — PNG dims come from the
 * IHDR chunk at fixed offsets in the file header. Crypto + fs from
 * node core.
 *
 * Usage:
 *   node scripts/audit-images.mjs           # write full report
 *   node scripts/audit-images.mjs --check   # short summary + exit 1
 *                                           # on any duplicate / pair
 *                                           # mismatch
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const REPORT_OUT = path.join(ROOT, 'docs/image-audit-report.md');

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

/**
 * Strip the trailing `_NN` frame number, `_left/right`, and the file
 * extension to derive a "stem family" — used to group sibling sprites
 * for dimension-consistency checks.
 */
function stemFamily(absPath) {
  const rel = path.relative(ROOT, absPath);
  const base = path.basename(rel, '.png');
  const stem = base
    .replace(/_\d{2,3}$/, '')
    .replace(/_(left|right)$/, '');
  return path.join(path.dirname(rel), stem);
}

async function main() {
  const files = await walk(ASSETS_DIR);
  const entries = [];
  for (const f of files) {
    const [dims, hash] = await Promise.all([readPngHeader(f), hashFile(f)]);
    if (!dims) continue;
    entries.push({
      path: path.relative(ROOT, f),
      width: dims.width, height: dims.height,
      hash,
      stem: stemFamily(f),
    });
  }

  // 1. Exact-content duplicates.
  const byHash = new Map();
  for (const e of entries) {
    if (!byHash.has(e.hash)) byHash.set(e.hash, []);
    byHash.get(e.hash).push(e);
  }
  // v3.8.49 — intentional duplicate allowlist. Hashes belonging to a
  // documented runtime pattern (e.g. question_block animation frame 4
  // = frame 2 by design) are filtered OUT of the duplicates list so
  // the audit doesn't ask us to "fix" them every run.
  const INTENTIONAL_DUPLICATE_HASHES = new Set([
    // Group #14 — questionBlockAnim02 / questionBlockAnim04 SHA-equal.
    // Runtime cycles `questionBlockAnim0${animFrame}` over frames 1-4
    // in sceneryDispatch.js:182; frame 4 reusing frame 2's art is the
    // intended loop. See docs/asset-archive-manifest.md Group #14.
    '4f2605dee4a5feaadc49ae5e3b731a79914180d0e49cfed1f6ac04d5289db9c1',
  ]);
  const allDuplicates = [...byHash.values()].filter((g) => g.length > 1);
  const duplicates = allDuplicates.filter((g) => !INTENTIONAL_DUPLICATE_HASHES.has(g[0].hash));
  const intentionalDuplicates = allDuplicates.filter((g) => INTENTIONAL_DUPLICATE_HASHES.has(g[0].hash));

  // 2. Stem-family dim inconsistency.
  const byStem = new Map();
  for (const e of entries) {
    if (!byStem.has(e.stem)) byStem.set(e.stem, []);
    byStem.get(e.stem).push(e);
  }
  const dimMismatches = [];
  for (const [stem, list] of byStem) {
    if (list.length < 2) continue;
    const dimSet = new Set(list.map((e) => `${e.width}x${e.height}`));
    if (dimSet.size > 1) dimMismatches.push({ stem, list });
  }

  // 3. Side-pair dim mismatch (special case of #2, isolated for
  //    easier hand-off).
  //
  // v3.8.49 — road-kit pairs are excluded from the *failing* side-pair
  // list. The road kit (`assets/terrain/road/**`) is intentionally
  // asymmetric: lane / shoulder left & right are drawn from a 3-point
  // perspective and have legitimately different widths. SIDE_AWARE
  // scenery pairs (rocks, stairs, stone walls, terrain step blocks)
  // are still expected to match. See Phase 7d sidePair split.
  const isRoadKitPair = (relPath) => /^assets\/terrain\/road\//.test(relPath);
  const sidePairMismatches = [];
  const sidePairMismatchesRoadKit = [];
  const filesByPath = new Map(entries.map((e) => [e.path, e]));
  for (const e of entries) {
    if (!e.path.endsWith('_left.png')) continue;
    const rightPath = e.path.replace(/_left\.png$/, '_right.png');
    const right = filesByPath.get(rightPath);
    if (!right) continue;
    if (e.width !== right.width || e.height !== right.height) {
      if (isRoadKitPair(e.path)) sidePairMismatchesRoadKit.push({ left: e, right });
      else sidePairMismatches.push({ left: e, right });
    }
  }

  // 4. Suspicious aspect: known categories want known aspects.
  //    Heuristic — block (square-ish 0.7-1.4), wall (wide >1.6), flower
  //    (tall <0.9). Flags off-aspect outliers.
  const aspectFlags = [];
  for (const e of entries) {
    const r = e.width / e.height;
    const rel = e.path;
    if (rel.includes('/grass_dirt_block/') && (r < 0.7 || r > 1.4)) aspectFlags.push({ ...e, expected: 'square-ish (0.7-1.4)', actual: r.toFixed(2) });
    if (rel.includes('/stone_brick/') && rel.includes('_wall_') && r < 1.6) aspectFlags.push({ ...e, expected: 'wide (>1.6)', actual: r.toFixed(2) });
    if (rel.includes('/flower/') && r > 1.4) aspectFlags.push({ ...e, expected: 'tall or square', actual: r.toFixed(2) });
  }

  const checkMode = process.argv.includes('--check');

  if (checkMode) {
    console.log('[image-audit:check]');
    console.log(`  scanned        ${entries.length} PNGs`);
    console.log(`  exact dupes    ${duplicates.length} groups (${duplicates.reduce((s, g) => s + g.length, 0)} files)`);
    if (intentionalDuplicates.length) {
      console.log(`  intentional    ${intentionalDuplicates.length} group(s) — documented runtime duplicates, excluded from fail`);
    }
    console.log(`  stem dim mismatches ${dimMismatches.length}`);
    console.log(`  side-pair dim mismatches ${sidePairMismatches.length}`);
    if (sidePairMismatchesRoadKit.length) {
      console.log(`  road-kit pairs (intentional asym) ${sidePairMismatchesRoadKit.length}`);
    }
    console.log(`  aspect flags   ${aspectFlags.length}`);
    if (duplicates.length || sidePairMismatches.length) {
      console.log('\n[image-audit:check] FAIL');
      process.exit(1);
    }
    return;
  }

  // ── Full report ─────────────────────────────────────────────────────
  const lines = [];
  lines.push('# Image Audit Report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}.`);
  lines.push(`Scanned ${entries.length} PNGs under \`assets/\` (excluding \`_source/\`).`);
  lines.push('');

  lines.push(`## Exact duplicates (${duplicates.length} groups)`);
  if (duplicates.length === 0) {
    lines.push('_(none — every PNG has unique content)_');
  } else {
    lines.push('Files with identical SHA-256 content hash. Pick one canonical');
    lines.push('location, point the engine at it, and archive the rest to `_source/`.');
    lines.push('');
    for (const group of duplicates) {
      lines.push(`### Group (${group.length} copies — ${group[0].width}×${group[0].height})`);
      for (const e of group) lines.push(`- \`${e.path}\``);
      lines.push('');
    }
  }
  lines.push('');

  lines.push(`## Stem-family dimension inconsistencies (${dimMismatches.length})`);
  if (dimMismatches.length === 0) {
    lines.push('_(none — every sibling frame ships at the same canvas size)_');
  } else {
    lines.push('Files sharing a stem (e.g., `player_farmer_run_*`) but with');
    lines.push('different `width×height`. Re-export to a canonical canvas.');
    lines.push('');
    for (const m of dimMismatches.slice(0, 20)) {
      lines.push(`### \`${m.stem}\``);
      for (const e of m.list) lines.push(`- \`${e.path}\` — ${e.width}×${e.height}`);
      lines.push('');
    }
    if (dimMismatches.length > 20) lines.push(`_(${dimMismatches.length - 20} more mismatches omitted)_`);
  }
  lines.push('');

  lines.push(`## Side-pair dimension mismatches (${sidePairMismatches.length})`);
  if (sidePairMismatches.length === 0) {
    lines.push('_(none — every `_left.png` / `_right.png` pair shares its dims)_');
  } else {
    lines.push('Per-side variants disagree on canvas size. Engine renders both');
    lines.push('through the same dispatcher at the same target scale, so the');
    lines.push('mismatched half visually pops on the wrong side.');
    lines.push('');
    for (const m of sidePairMismatches) {
      lines.push(`- \`${m.left.path}\` ${m.left.width}×${m.left.height} ≠ \`${m.right.path}\` ${m.right.width}×${m.right.height}`);
    }
  }
  lines.push('');

  lines.push(`## Road-kit intentional asymmetry (${sidePairMismatchesRoadKit.length})`);
  if (sidePairMismatchesRoadKit.length === 0) {
    lines.push('_(none)_');
  } else {
    lines.push('Road kit lane / shoulder pairs are drawn in 3-point perspective.');
    lines.push('Left and right halves legitimately have different widths — this');
    lines.push('section is documentation only, **not** a designer ask.');
    lines.push('');
    for (const m of sidePairMismatchesRoadKit) {
      lines.push(`- \`${m.left.path}\` ${m.left.width}×${m.left.height} · \`${m.right.path}\` ${m.right.width}×${m.right.height}`);
    }
  }
  lines.push('');

  lines.push(`## Suspicious aspect ratios (${aspectFlags.length})`);
  if (aspectFlags.length === 0) {
    lines.push('_(none — every known-category file has the expected aspect)_');
  } else {
    lines.push('Heuristic flags. Block sprites should be square-ish; walls wide;');
    lines.push('flowers tall. An outlier likely means the file is mis-named.');
    lines.push('');
    for (const e of aspectFlags) {
      lines.push(`- \`${e.path}\` (${e.width}×${e.height}, ratio ${e.actual}) — expected ${e.expected}`);
    }
  }
  lines.push('');

  // Summary tail.
  lines.push('## Summary');
  lines.push('');
  lines.push(`- PNGs scanned: **${entries.length}**`);
  lines.push(`- Exact-content duplicate groups: **${duplicates.length}** (${duplicates.reduce((s, g) => s + g.length, 0)} files)`);
  lines.push(`- Stem dim mismatches: **${dimMismatches.length}**`);
  lines.push(`- Side-pair dim mismatches: **${sidePairMismatches.length}** (designer task)`);
  lines.push(`- Road-kit intentional asymmetry: **${sidePairMismatchesRoadKit.length}** (documented, no-action)`);
  lines.push(`- Aspect-ratio flags: **${aspectFlags.length}**`);
  lines.push('');

  await fs.writeFile(REPORT_OUT, lines.join('\n'));
  console.log(`[image-audit] wrote ${path.relative(ROOT, REPORT_OUT)}`);
  console.log(`[image-audit] ${entries.length} PNGs · ${duplicates.length} dupe groups · ${sidePairMismatches.length} side-pair mismatches`);
}

main().catch((err) => { console.error('[image-audit] failed', err); process.exit(1); });
