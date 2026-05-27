// build.js — keeps root index.html aligned with the module entry template.
// Usage: node build.js [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CHECK = process.argv.includes('--check');
const DEV_TEMPLATE = join(ROOT, 'dev.html');
const ROOT_INDEX = join(ROOT, 'index.html');
const MODULE_ENTRY = '<script type="module" src="./src/main.js"></script>';

function normalizeIndex(html) {
  return html.replace(/^<!-- Generated file.*?\n/, '').trim();
}

const template = readFileSync(DEV_TEMPLATE, 'utf-8');

if (!template.includes(MODULE_ENTRY)) {
  throw new Error('[build] dev.html must retain the module entry <script type="module" src="./src/main.js"></script>.');
}

const output = normalizeIndex(template) + '\n';

if (CHECK) {
  const current = readFileSync(ROOT_INDEX, 'utf-8');
  const normalized = normalizeIndex(current) + '\n';
  if (normalized !== output) {
    console.error('[check] FAIL — index.html is out of sync with dev.html. Run: npm run build');
    process.exit(1);
  }
  if (!normalized.includes(MODULE_ENTRY) || normalized.includes('// ===== src/systems/RenderSystem.js =====')) {
    console.error('[check] FAIL — index.html must stay on the module entry and must not contain inline bundled source.');
    process.exit(1);
  }
  console.log('[check] OK — index.html uses the module entry and matches dev.html');
  process.exit(0);
}

writeFileSync(ROOT_INDEX, output, 'utf-8');
console.log('[build] index.html synced to module-entry template');
