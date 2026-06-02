// Server-free build. Produces dist/ that opens directly via file:// — no Node
// server needed (`npm run build:standalone`, then double-click dist/index.html).
//
// Why a bundle: the source loads ES modules (`<script type="module">`), which
// browsers refuse to import over file:// (CORS). esbuild flattens everything
// into ONE classic IIFE script that runs without a server. Assets already load
// via <Image> with relative paths (file://-safe), so only the JS needs this.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const MODULE_TAG = '<script type="module" src="./src/main.js"></script>';
const CLASSIC_TAG = '<script src="./game.js"></script>';

// 1. Clean output.
rmSync(DIST, { recursive: true, force: true });

// 2. Bundle src/main.js → dist/game.js as a classic IIFE (no module syntax).
await esbuild.build({
  entryPoints: [join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'firefox100', 'safari15'],
  minify: true,
  legalComments: 'none',
  outfile: join(DIST, 'game.js'),
});

// 3. Standalone HTML: dev.html with the module entry swapped for the bundle.
let html = readFileSync(join(ROOT, 'dev.html'), 'utf8');
if (!html.includes(MODULE_TAG)) {
  throw new Error('[build:standalone] module entry not found in dev.html — update MODULE_TAG.');
}
html = html.replace(MODULE_TAG, CLASSIC_TAG);
writeFileSync(join(DIST, 'index.html'), html, 'utf8');

// 4. Copy the files the page references relatively. Skip assets/_source (the
//    ~300 MB designer originals the engine never reads).
cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), {
  recursive: true,
  filter: (src) => !src.split(/[\\/]/).includes('_source'),
});
cpSync(join(ROOT, 'style.css'), join(DIST, 'style.css'));

console.log('[build:standalone] OK — open dist/index.html directly (no server needed).');
