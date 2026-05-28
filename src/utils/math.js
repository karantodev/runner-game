/**
 * Pure math helpers. Anything random-related lives in rng.js — these are
 * deterministic functions of their arguments.
 */

/**
 * Clamp a number into `[min, max]`.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation. `amount = 0` returns `from`, `amount = 1` returns `to`.
 * @param {number} from
 * @param {number} to
 * @param {number} amount
 */
export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

/**
 * Framerate-independent exponential damp toward `to`. Drop-in replacement
 * for `lerp` when the smoothing should look the same at any frame rate.
 *
 * @param {number} from
 * @param {number} to
 * @param {number} smoothing — larger = snappier
 * @param {number} delta — frame-units
 */
export function damp(from, to, smoothing, delta) {
  return lerp(from, to, 1 - Math.exp(-smoothing * delta));
}
