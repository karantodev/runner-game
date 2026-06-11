/**
 * Pure geometry helpers shared by multiple renderers. No canvas state,
 * no allocations — just math against the Projection.
 *
 * @typedef {import('../world/Projection.js').Projection} Projection
 */

/**
 * Sinusoidal horizontal drift used as a cheap "parallax" for static
 * background layers. Magnitude scales with viewport width × amount;
 * drift parameter offsets the phase so layers don't move in lock-step.
 *
 * @param {Projection} projection
 * @param {number} scrollOffset
 * @param {number} amount
 * @param {number} [driftPhase]
 */
export function parallaxOffset(projection, scrollOffset, amount, driftPhase = 0) {
  return Math.sin(scrollOffset * 0.01 + driftPhase) * projection.width * amount * 0.006;
}

/**
 * VISUAL width of the road silhouette at the bottom edge of the canvas.
 * v3.8.7 — uses `roadVisualBaseHalfWidth`, so the road silhouette tightens
 * with `visualLaneScale` without affecting gameplay collision math.
 * @param {Projection} projection
 */
export function roadBaseHalfWidth(projection) {
  return projection.roadVisualBaseHalfWidth * 0.98;
}

/**
 * VISUAL width of the road silhouette at the vanishing horizon.
 * v3.8.8 — coefficients dropped (0.010 → 0.005, 0.040 → 0.025). The
 * road now narrows to ~8 px on each side at the top — a slit that
 * reads as "tunnel into the castle gate" instead of a wide trapezoid
 * ending. The castle approach ramp (drawn in LandmarksRenderer) then
 * fills the narrow gap into the gate.
 * @param {Projection} projection
 */
export function roadTopHalfWidth(projection) {
  return Math.max(projection.width * 0.005, roadBaseHalfWidth(projection) * 0.025);
}

/**
 * Honest horizontal scroll with wrap-around. Drops the source sprite at
 * `(x0 - scroll, y)` and tiles it sideways enough times to fully cover
 * `[x0, x0 + width)`. This replaces the previous sin-drift "parallax"
 * for layers that genuinely benefit from looking like they're moving
 * past the camera (mountains, treelines).
 *
 * Caller controls the tile width by setting `width`. The image is
 * stretched to `width × height` per tile.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement | HTMLCanvasElement | OffscreenCanvas} image
 * @param {number} x0
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} scroll — total pixels of leftward shift (0 = un-scrolled)
 * @param {number} [alpha]
 */
export function drawScrollingTile(ctx, image, x0, y, width, height, scroll, alpha = 1) {
  // HTMLImageElement exposes naturalWidth; OffscreenCanvas / HTMLCanvasElement
  // expose width instead — accept either so canvas-backed strips (e.g.
  // HorizonTreelineRenderer) are not silently rejected.
  const intrinsicW = image?.naturalWidth ?? image?.width;
  if (!image || !intrinsicW) return false;
  if (width <= 0 || height <= 0) return false;
  // Normalize scroll into [0, width) so the leftmost tile is at x0 - off.
  const off = ((scroll % width) + width) % width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  // First tile (may stick out to the left of x0); enough copies to
  // reach x0 + width on the right.
  let x = x0 - off;
  while (x < x0 + width) {
    ctx.drawImage(image, x, y, width, height);
    x += width;
  }
  ctx.restore();
  return true;
}

/**
 * Translate camera shake to a {x, y} offset (zero when shake is calm).
 * Pure function — no canvas calls.
 *
 * @param {import('../world/World.js').World} world
 * @returns {{x: number, y: number}}
 */
export function cameraShakeOffset(world) {
  if (!world.config.gameFeel.cameraShake) return { x: 0, y: 0 };
  const amount = world.cameraShake;
  if (amount <= 0.01) return { x: 0, y: 0 };
  const phase = world.cameraImpulseTime * 0.7;
  return {
    x: Math.sin(phase * 1.9) * amount * 0.55,
    y: Math.cos(phase * 2.3) * amount * 0.35,
  };
}
