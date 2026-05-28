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
 * Width of the road silhouette at the bottom edge of the canvas, in pixels.
 * @param {Projection} projection
 */
export function roadBaseHalfWidth(projection) {
  return projection.roadBaseHalfWidth * 0.92;
}

/**
 * Width of the road silhouette at the vanishing horizon, in pixels.
 * @param {Projection} projection
 */
export function roadTopHalfWidth(projection) {
  return Math.max(projection.width * 0.022, roadBaseHalfWidth(projection) * 0.068);
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
