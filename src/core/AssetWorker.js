/**
 * Image processing worker for AssetManager.
 * Handles white background removal and defringing in a background thread.
 */

self.onmessage = function(event) {
  const { px, W, H, key } = event.data;
  try {
    if (hasMostlyWhiteBorder(px, W, H)) {
      floodFillWhiteFromEdges(px, W, H);
      defringeEdgePixels(px, W, H);
      self.postMessage({ px, W, H, key, processed: true }, [px.buffer]);
    } else {
      self.postMessage({ px, W, H, key, processed: false }, [px.buffer]);
    }
  } catch (err) {
    // Return the original pixel data unmodified on any processing error.
    self.postMessage({ px, W, H, key, processed: false }, [px.buffer]);
  }
};

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
  const capacity = W * H;
  const visited = new Uint8Array(capacity);
  // Stack holds pixel indices; worst case every pixel is pushed 4 times by
  // its 4 neighbours, so 4× capacity is the safe upper bound.
  const stack = new Int32Array(capacity * 4);
  let sp = 0;

  const push = (idx) => {
    if (sp < stack.length) stack[sp++] = idx;
  };

  for (let x = 0; x < W; x += 1) {
    push(x);
    push(x + (H - 1) * W);
  }
  for (let y = 1; y < H - 1; y += 1) {
    push(y * W);
    push(y * W + (W - 1));
  }

  while (sp > 0) {
    const idx = stack[--sp];
    if (idx < 0 || idx >= capacity || visited[idx]) continue;
    const pi = idx * 4;
    if (px[pi] < 200 || px[pi + 1] < 200 || px[pi + 2] < 200) continue;
    visited[idx] = 1;
    px[pi + 3] = 0;
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x + 1 < W) push(idx + 1);
    if (x - 1 >= 0) push(idx - 1);
    if (y + 1 < H) push(idx + W);
    if (y - 1 >= 0) push(idx - W);
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
