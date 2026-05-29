/**
 * Asset audit script — walks assets/, cross-references with the registered
 * keys in src/config/gameConfig.js, and produces docs/asset-audit-report.md.
 *
 * Categories per file:
 *   USED            file path matches a registered key in gameConfig.assets
 *   UNREGISTERED    file exists but no key in gameConfig points at it
 *   DEAD_KEY        gameConfig key points at a file that doesn't exist
 *   SIDE_PAIR_OK    side-aware file has a complete _left/_right partner
 *   SIDE_ORPHAN     side-aware file is missing its partner
 *
 * Run:    node scripts/audit-assets.mjs
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

async function main() {
  const files = await walk(ASSETS_DIR);
  const keys = await parseGameConfigKeys();

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
    md += `These keys ARE registered in \`GAME_CONFIG.assets\` but the file is gone from disk. Either restore the file or remove the key.\n\n`;
    md += '```\n';
    for (const { key, path: p } of deadKeys) md += `${key.padEnd(36)} → ${p}\n`;
    md += '```\n\n';
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
    md += `These PNGs sit in the tree but no \`GAME_CONFIG.assets\` key points at them. Either wire them into the engine (add a key + dispatcher / use), move them to \`_source/\`, or delete.\n\n`;
    // group by category for readability
    const byCat = new Map();
    for (const f of unregistered) {
      const cat = f.split(path.sep).slice(0, 2).join('/');
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(f);
    }
    for (const [cat, list] of [...byCat.entries()].sort()) {
      md += `### \`${mdEscape(cat)}\` (${list.length})\n\n`;
      md += '```\n';
      for (const f of list) md += `${f}\n`;
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
