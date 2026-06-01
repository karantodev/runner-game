#!/usr/bin/env node
/**
 * optimize-assets.mjs — downscale oversized live PNGs to a sane cap.
 *
 * This is a pixel-art runner: every in-lane / decor / UI-icon / effect sprite
 * is drawn at <= ~200 px on screen, yet many ship as ~1254×1254 raw exports
 * (a ~204 MiB asset payload before this script). drawImage scales them down at
 * runtime anyway, so the giant source only costs load time + memory + a worse
 * nearest-neighbour downscale. This tool caps the LONGER side to --cap
 * (default 256), preserving aspect, so sprites stay crisp at their draw size
 * while the asset payload (204 MiB) collapses.
 *
 * SAFETY:
 *  - Skips layers drawn large/stretched (backgrounds, modal panels, greenhouse)
 *    so they keep full resolution — see SKIP_RE.
 *  - Backs every original up ONCE to assets/_source/oversized_originals_<stamp>/
 *    (engine + audits ignore _source). Re-runs never re-backup.
 *  - Idempotent: files already <= cap are left untouched.
 *
 * Requires macOS `sips` (local dev tool). Usage:
 *   node scripts/optimize-assets.mjs --check     # report only, no writes
 *   node scripts/optimize-assets.mjs             # apply (cap 256)
 *   node scripts/optimize-assets.mjs --cap=320   # custom cap
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const CAP = Number((args.find((a) => a.startsWith('--cap=')) ?? '--cap=256').split('=')[1]) || 256;
const STAMP = '2026-06-01';
const BACKUP = path.join(ASSETS, '_source', `oversized_originals_${STAMP}`);

// Drawn large or stretched full-width — keep these at full resolution.
const SKIP_RE = [
  /\/_source\//,
  /\/assets\/background\//,
  /\/assets\/ui\/panels\//,
  /\/greenhouse\//,
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && p.toLowerCase().endsWith('.png')) out.push(p);
  }
  return out;
}

function dims(p) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', p], { encoding: 'utf8' });
  return {
    w: Number(/pixelWidth:\s*(\d+)/.exec(out)?.[1] ?? 0),
    h: Number(/pixelHeight:\s*(\d+)/.exec(out)?.[1] ?? 0),
  };
}

const all = walk(ASSETS);
let resized = 0;
let skipped = 0;
let bytesBefore = 0;
let bytesAfter = 0;
const lines = [];

for (const f of all) {
  if (SKIP_RE.some((re) => re.test(f))) { skipped += 1; continue; }
  const { w, h } = dims(f);
  if (!w || !h || Math.max(w, h) <= CAP) continue;

  const rel = path.relative(ASSETS, f);
  const before = statSync(f).size;
  bytesBefore += before;
  lines.push(`  ${String(w + 'x' + h).padEnd(11)} -> max ${CAP}   ${rel}`);

  if (!CHECK) {
    const bk = path.join(BACKUP, rel);
    if (!existsSync(bk)) { mkdirSync(path.dirname(bk), { recursive: true }); copyFileSync(f, bk); }
    execFileSync('sips', ['--resampleHeightWidthMax', String(CAP), f], { stdio: 'ignore' });
    bytesAfter += statSync(f).size;
  }
  resized += 1;
}

console.log(lines.join('\n'));
console.log(`\n[optimize-assets] ${CHECK ? 'WOULD resize' : 'resized'} ${resized} files (cap ${CAP}px) · skipped ${skipped} kept-hi-res / _source`);
if (!CHECK && resized) {
  console.log(`[optimize-assets] resized payload ${(bytesBefore / 1048576).toFixed(1)} MiB -> ${(bytesAfter / 1048576).toFixed(1)} MiB`);
  console.log(`[optimize-assets] originals backed up to ${path.relative(ROOT, BACKUP)}`);
}
