/**
 * Image asset loader. Promise-based, tolerant of missing files (404s
 * resolve with `null` so v3-pending designer keys don't block boot).
 *
 * Progress reporting:
 *   - Pass a `onProgress({ loaded, total, current, key })` callback to
 *     loadAll() and the loader will fire after every image resolves.
 *   - The callback runs from inside a microtask; do NOT do expensive
 *     work synchronously inside it (queue a rAF if you must repaint).
 */
export class AssetManager {
  #assets = new Map();

  /**
   * @param {Record<string, string>} assetMap
   * @param {{
   *   onProgress?: (info: { loaded: number, total: number, current: string, key: string }) => void,
   *   perAssetTimeoutMs?: number,
   * }} [opts]
   */
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
            // Progress callbacks must never block the loader.
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
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  /**
   * Each image races a hard timeout. A truly hung asset never resolving
   * was previously enough to leave the player on the loading screen
   * forever; now after `timeoutMs` the slot resolves as null and the
   * boot proceeds (renderer fallback chain handles missing keys).
   *
   * v3.2: post-load, run a single-pass white-background check. If all
   * four corner pixels are opaque near-white, we assume the source PNG
   * lost its alpha during AI generation / export and flood-fill the
   * connected white region from each edge. Interior whites (cloud bodies,
   * character shirt) stay intact because the flood doesn't cross
   * non-white pixels.
   */
  #loadImage(key, src, timeoutMs) {
    return new Promise((resolve) => {
      const img = new Image();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      img.onload = () => {
        // bg-removal runs sync in the load handler. Yes, each image
        // costs 20-150 ms — that's what the loading screen is for.
        // (Initial experiment moved this to lazy first-get() but that
        // froze the first render frame for 1-2 seconds when every
        // sprite drew at once. Sync during boot is the right tradeoff.)
        const processed = removeWhiteBackgroundIfNeeded(img);
        this.#assets.set(key, processed);
        finish(processed);
      };
      img.onerror = () => {
        // Common during v3-transition: designer-pending PNGs 404. Renderer
        // fallback chain handles these silently — boot continues.
        finish(null);
      };
      img.src = src;
      if (timeoutMs > 0) {
        setTimeout(() => finish(null), timeoutMs);
      }
    });
  }
}

/**
 * If the four corner pixels are opaque near-white, treat the image as
 * "lost alpha" and flood-fill the white background away.
 *
 * Returns either:
 *   - the original Image (if no white bg detected or processing failed)
 *   - a canvas duck-typed as an Image (drawImage works on canvas;
 *     SpriteRenderer only reads .naturalWidth / .naturalHeight which we
 *     define explicitly on the canvas)
 */
function removeWhiteBackgroundIfNeeded(img) {
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
  catch { return img; }  // CORS-tainted (cross-origin asset) → leave alone.
  const px = data.data;

  if (!hasOpaqueWhiteCorners(px, W, H)) return img;

  floodFillWhiteFromEdges(px, W, H);
  ctx.putImageData(data, 0, 0);

  // Duck-type canvas as an Image so SpriteRenderer's interface holds.
  // drawImage already accepts HTMLCanvasElement; we just need the
  // naturalWidth/naturalHeight readbacks the renderer guards on.
  canvas.naturalWidth = W;
  canvas.naturalHeight = H;
  canvas.complete = true;
  return canvas;
}

/** Near-white opaque corner test — single pixel sample per corner. */
function hasOpaqueWhiteCorners(px, W, H) {
  return (
    isNearWhiteOpaque(px, 0, 0, W) &&
    isNearWhiteOpaque(px, W - 1, 0, W) &&
    isNearWhiteOpaque(px, 0, H - 1, W) &&
    isNearWhiteOpaque(px, W - 1, H - 1, W)
  );
}

function isNearWhiteOpaque(px, x, y, W) {
  const i = (y * W + x) * 4;
  return px[i] > 235 && px[i + 1] > 235 && px[i + 2] > 235 && px[i + 3] > 200;
}

/**
 * BFS flood-fill from every edge pixel. Walk only through near-white
 * opaque pixels; once a pixel is visited its alpha is set to 0. Stops
 * automatically at the first non-white pixel of each direction.
 *
 * Uses typed-array stack to avoid recursion + a Uint8Array visited
 * bitmap so the cost is O(N) for any image size up to 2048×2048.
 */
function floodFillWhiteFromEdges(px, W, H) {
  const visited = new Uint8Array(W * H);
  // The stack holds packed (y*W+x) indices. Worst case = N entries.
  const stack = new Int32Array(W * H);
  let sp = 0;

  // Seed with every border pixel.
  for (let x = 0; x < W; x += 1) {
    stack[sp++] = x;            // top row
    stack[sp++] = x + (H - 1) * W; // bottom row
  }
  for (let y = 1; y < H - 1; y += 1) {
    stack[sp++] = y * W;             // left col
    stack[sp++] = y * W + (W - 1);   // right col
  }

  while (sp > 0) {
    const idx = stack[--sp];
    if (visited[idx]) continue;
    const pi = idx * 4;
    // Non-white encountered → leave this pixel opaque, stop the wave.
    if (px[pi] < 230 || px[pi + 1] < 230 || px[pi + 2] < 230) continue;
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
