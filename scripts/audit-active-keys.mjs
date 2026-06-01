#!/usr/bin/env node
/**
 * Audit which asset keys in gameConfig.assets are referenced in src/.
 *
 * Three detection strategies, in order:
 *   1. Exact string literal  — key appears as 'key', "key", or `key` in source
 *   2. Numbered-frame prefix — base (key with trailing digits stripped) appears
 *      as a string literal or at the start of a template literal, implying a
 *      loop constructs `base + zeroPad(n)` at runtime
 *   3. Side variant          — base (key with Left/Right stripped) appears in
 *      source, implying `${base}${SIDE_KEY_FOR(...)}` is used at runtime
 *
 * Output: JSON object { keyName: boolean } written to stdout.
 * Pipe to a file and paste the result into the ACTIVE constant in sprites.html.
 *
 * Usage:
 *   node scripts/audit-active-keys.mjs > /tmp/active_keys.json
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (f.endsWith('.js') || f.endsWith('.mjs')) out.push(full);
  }
  return out;
}

// Read every src/ file except gameConfig itself (that's the registry, not usage)
const srcFiles = walk(join(ROOT, 'src'))
  .filter(f => !f.includes('gameConfig.js'));
const combined = srcFiles.map(f => readFileSync(f, 'utf8')).join('\n');

// Import asset registry
const { GAME_CONFIG } = await import('../src/config/gameConfig.js');
const keys = Object.keys(GAME_CONFIG.assets);

/**
 * True if `text` appears as a string literal or at the start of a template
 * literal in the combined source.
 */
function inSrc(text) {
  return combined.includes(`'${text}'`)
      || combined.includes(`"${text}"`)
      || combined.includes(`\`${text}\``)   // full template literal == text
      || combined.includes(`\`${text}$`)    // template starts with text: `text${...}`
      || combined.includes(`\`${text}0`);   // zero-padded frame: `text01`, `text02`, …
}

const result = {};

for (const key of keys) {
  // Strategy 1 — exact
  if (inSrc(key)) { result[key] = true; continue; }

  // Strategy 2 — numbered-frame prefix  (playerFarmerRun01 → base = playerFarmerRun)
  const base = key.replace(/\d+$/, '');
  if (base !== key && inSrc(base)) { result[key] = true; continue; }

  // Strategy 3 — side variant  (grassDirtBlockLeft → sideBase = grassDirtBlock)
  const sideBase = key.replace(/(Left|Right)$/, '');
  if (sideBase !== key && inSrc(sideBase)) { result[key] = true; continue; }

  result[key] = false;
}

process.stdout.write(JSON.stringify(result, null, 0) + '\n');

const active   = Object.values(result).filter(Boolean).length;
const inactive = keys.length - active;
process.stderr.write(`Active: ${active} / ${keys.length}  (inactive: ${inactive})\n`);
