/**
 * Image asset loader. Promise-based, tolerant of missing files (404s
 * resolve with `null` so v3-pending designer keys don't block boot).
 */
export class AssetManager {
  #assets = new Map();
  #worker = null;
  #workerCallbacks = new Map();

  constructor() {
    try {
      this.#worker = new Worker(new URL('./AssetWorker.js', import.meta.url), { type: 'module' });
      this.#worker.onmessage = (event) => {
        const { key, px, W, H, processed } = event.data;
        const callback = this.#workerCallbacks.get(key);
        if (callback) {
          this.#workerCallbacks.delete(key);
          callback({ px, W, H, processed });
        }
      };
    } catch (err) {
      console.warn('[AssetManager] Failed to initialize AssetWorker, falling back to sync processing:', err);
    }
  }

  async loadAll(assetMap, opts = {}) {
    const entries = Object.entries(assetMap);
    const total = entries.length;
    const timeoutMs = opts.perAssetTimeoutMs ?? 8000;
    let loaded = 0;
    await Promise.all(entries.map(([key, src]) =>
      this.#loadImage(key, src, timeoutMs).then((img) => {
        loaded += 1;
        if (opts.onProgress) {
          try {
            opts.onProgress({ loaded, total, current: src, key });
          } catch (err) {
            console.warn('[AssetManager] onProgress callback threw:', err);
          }
        }
        return img;
      })
    ));
  }

  get(key) {
    return this.#assets.get(key) ?? null;
  }

  isReady(key) {
    const img = this.get(key);
    return Boolean(img && img.complete && (img.naturalWidth > 0 || img.width > 0));
  }

  #loadImage(key, src, timeoutMs) {
    return new Promise((resolve) => {
      const img = new Image();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      img.onload = async () => {
        const processed = await this.#processImage(key, img);
        this.#assets.set(key, processed);
        finish(processed);
      };
      img.onerror = () => {
        finish(null);
      };
      img.src = src;
      if (timeoutMs > 0) {
        setTimeout(() => finish(null), timeoutMs);
      }
    });
  }

  async #processImage(key, img) {
    if (!img.naturalWidth || !img.naturalHeight) return img;
    const W = img.naturalWidth;
    const H = img.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return img;
    ctx.drawImage(img, 0, 0);

    let data;
    try { data = ctx.getImageData(0, 0, W, H); }
    catch { return img; }

    if (!this.#worker) {
      // Fallback to sync processing if worker failed to init
      if (hasMostlyWhiteBorder(data.data, W, H)) {
        floodFillWhiteFromEdges(data.data, W, H);
        defringeEdgePixels(data.data, W, H);
        ctx.putImageData(data, 0, 0);
        return this.#canvasToImageProxy(canvas, W, H);
      }
      return img;
    }

    return new Promise((resolve) => {
      this.#workerCallbacks.set(key, ({ px, processed }) => {
        if (processed) {
          ctx.putImageData(new ImageData(px, W, H), 0, 0);
          resolve(this.#canvasToImageProxy(canvas, W, H));
        } else {
          resolve(img);
        }
      });
      this.#worker.postMessage({ px: data.data, W, H, key }, [data.data.buffer]);
    });
  }

  #canvasToImageProxy(canvas, W, H) {
    canvas.naturalWidth = W;
    canvas.naturalHeight = H;
    canvas.complete = true;
    return canvas;
  }
}

// Minimal sync fallback helpers (copied from original to keep file self-contained)
function hasMostlyWhiteBorder(px, W, H) {
  let white = 0;
  let colored = 0;
  const check = (i) => {
    if (px[i + 3] < 100) return;
    if (px[i] > 220 && px[i + 1] > 220 && px[i + 2] > 220) white += 1;
    else colored += 1;
  };
  for (let x = 0; x < W; x += 1) {
    check(x * 4);
    check((x + (H - 1) * W) * 4);
  }
  for (let y = 1; y < H - 1; y += 1) {
    check(y * W * 4);
    check((y * W + W - 1) * 4);
  }
  const total = white + colored;
  return total > 0 && white / total >= 0.7;
}

function floodFillWhiteFromEdges(px, W, H) {
  const visited = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  let sp = 0;
  for (let x = 0; x < W; x += 1) {
    stack[sp++] = x;
    stack[sp++] = x + (H - 1) * W;
  }
  for (let y = 1; y < H - 1; y += 1) {
    stack[sp++] = y * W;
    stack[sp++] = y * W + (W - 1);
  }
  while (sp > 0) {
    const idx = stack[--sp];
    if (visited[idx]) continue;
    const pi = idx * 4;
    if (px[pi] < 200 || px[pi + 1] < 200 || px[pi + 2] < 200) continue;
    visited[idx] = 1;
    px[pi + 3] = 0;
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x + 1 < W) stack[sp++] = idx + 1;
    if (x - 1 >= 0) stack[sp++] = idx - 1;
    if (y + 1 < H) stack[sp++] = idx + W;
    if (y - 1 >= 0) stack[sp++] = idx - W;
  }
}

function defringeEdgePixels(px, W, H) {
  const total = W * H;
  for (let idx = 0; idx < total; idx += 1) {
    const pi = idx * 4;
    if (px[pi + 3] === 0) continue;
    const r = px[pi], g = px[pi + 1], b = px[pi + 2];
    const minCh = r < g ? (r < b ? r : b) : (g < b ? g : b);
    if (minCh < 190) continue;
    const x = idx % W;
    const y = (idx / W) | 0;
    const hasTransparentNeighbor = (
      (x > 0     && px[(idx - 1) * 4 + 3] === 0) ||
      (x < W - 1 && px[(idx + 1) * 4 + 3] === 0) ||
      (y > 0     && px[(idx - W) * 4 + 3] === 0) ||
      (y < H - 1 && px[(idx + W) * 4 + 3] === 0)
    );
    if (!hasTransparentNeighbor) continue;
    const newA = 1 - minCh / 255;
    if (newA < 0.04) { px[pi + 3] = 0; continue; }
    const bg = 255 * (1 - newA);
    px[pi    ] = Math.min(255, Math.max(0, ((r - bg) / newA) | 0));
    px[pi + 1] = Math.min(255, Math.max(0, ((g - bg) / newA) | 0));
    px[pi + 2] = Math.min(255, Math.max(0, ((b - bg) / newA) | 0));
    px[pi + 3] = Math.round(newA * 255);
  }
}
