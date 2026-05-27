import http from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=utf-8'],
]);

const allowRemoteDebug = process.env.ORCHID_ALLOW_REMOTE_DEBUG === '1';

function safePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const requested = cleanPath === '/' ? '/index.html' : cleanPath;
  const resolved = path.normalize(path.join(root, requested));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function handleDebugCapture(req, res) {
  const raw = await readBody(req);
  const payload = JSON.parse(raw || '{}');
  const dataUrl = payload.dataUrl || '';
  const filename = String(payload.filename || `orchid-quest-runstate-${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, '-');
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);

  if (!match) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Expected PNG data URL' }));
    return;
  }

  const dir = path.join(root, 'tmp', 'debug-captures');
  await mkdir(dir, { recursive: true });
  const outputPath = path.join(dir, filename);
  await writeFile(outputPath, Buffer.from(match[1], 'base64'));

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ ok: true, path: outputPath }));
}

function isLocalDebugRequest(req) {
  const host = String(req.headers.host || '').toLowerCase();
  if (allowRemoteDebug) return true;
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:') || host.startsWith('[::1]:');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url?.split('?')[0] === '/__debug/capture') {
    if (!isLocalDebugRequest(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: false, error: 'Debug capture is only available in local dev mode' }));
      return;
    }
    try {
      await handleDebugCapture(req, res);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    }
    return;
  }

  const filePath = safePath(req.url || '/');
  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': types.get(ext) || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Orchid Quest server running`);
  console.log(`  Dev  (ES modules): http://localhost:${port}/dev.html`);
  console.log(`  Prod (built):      http://localhost:${port}/`);
  console.log(`Press Ctrl+C to stop.`);
});
