// Server-free build. Produces dist/ that opens directly via file:// — no Node
// server needed (`npm run build:standalone`, then double-click dist/index.html).
//
// Why a bundle: the source loads ES modules (`<script type="module">`), which
// browsers refuse to import over file:// (CORS). esbuild flattens everything
// into ONE classic IIFE script that runs without a server. Assets already load
// via <Image> with relative paths (file://-safe), so only the JS needs this.
//
// Cache-busting: game.js / style.css are emitted with a CONTENT HASH in the
// filename (game.<hash>.js). When the code changes the filename changes, so
// browsers and CDNs fetch the new file automatically — end users never have to
// clear their cache. When nothing changed the hash is identical, so the cached
// copy is reused (a content hash beats a build timestamp, which would bust the
// cache on every rebuild even when the output is byte-identical).
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const MODULE_TAG = '<script type="module" src="./src/main.js"></script>';
const CSS_LINK = 'href="./style.css"';
const CHARSET_TAG = '<meta charset="utf-8" />';

const hash8 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8);

// 1. Clean output. (write:false below means esbuild won't create DIST for us.)
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// 2. Bundle src/main.js → classic IIFE, kept in memory so we can hash it.
const result = await esbuild.build({
  entryPoints: [join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'firefox100', 'safari15'],
  minify: true,
  legalComments: 'none',
  write: false,
  outfile: join(DIST, 'game.js'),
});
const jsCode = result.outputFiles[0].text;
const jsName = `game.${hash8(jsCode)}.js`;
writeFileSync(join(DIST, jsName), jsCode);

const cssCode = readFileSync(join(ROOT, 'style.css'));
const cssName = `style.${hash8(cssCode)}.css`;
writeFileSync(join(DIST, cssName), cssCode);

// 3. Standalone HTML: swap the module entry for the hashed bundle + hashed CSS,
//    and mark the HTML document itself non-cacheable (it's the only unhashed
//    entry point — it must always be re-fetched so it can point at the latest
//    hashed asset names). The hashed assets are then safe to cache forever.
let html = readFileSync(join(ROOT, 'dev.html'), 'utf8');
for (const [tag, label] of [[MODULE_TAG, 'module entry'], [CSS_LINK, 'style.css link'], [CHARSET_TAG, 'charset meta']]) {
  if (!html.includes(tag)) {
    throw new Error(`[build:standalone] ${label} not found in dev.html — update build-standalone.mjs.`);
  }
}
html = html
  .replace(MODULE_TAG, `<script src="./${jsName}"></script>`)
  .replace(CSS_LINK, `href="./${cssName}"`)
  .replace(CHARSET_TAG, `${CHARSET_TAG}\n  <meta http-equiv="Cache-Control" content="no-cache" />`);
writeFileSync(join(DIST, 'index.html'), html, 'utf8');

// 4. Copy the files the page references relatively. Skip assets/_source (the
//    ~300 MB designer originals the engine never reads).
cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), {
  recursive: true,
  filter: (src) => !src.split(/[\\/]/).includes('_source'),
});

console.log(`[build:standalone] OK — ${jsName} + ${cssName} (content-hashed, cache-safe).`);
console.log('  Open dist/index.html directly (file://), or deploy dist/.');
console.log('  When deploying: serve index.html with "Cache-Control: no-cache"; the hashed');
console.log('  game.*.js / style.*.css can be cached immutably (max-age=31536000).');
