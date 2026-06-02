/**
 * Frozen render constants shared by the pipeline composer and individual
 * renderers. Kept in one module so layer ordering stays explicit.
 */

export const LAYERS = Object.freeze({
  SKY: 0,
  FAR_BACKGROUND: 1,
  DISTANT_LANDMARKS: 2,
  MAIN_GROUND: 3,
  MIDGROUND_TERRAIN: 4,
  FOREGROUND_DECOR: 5,
  GAMEPLAY: 6,
  PARTICLES: 7,
});

/**
 * v3.8.4 parallax — stronger separation between depth layers. Reference
 * has crisp depth: distant mountains barely move, mid-elements drift
 * leisurely, foreground decor scrolls with the road. Calibration:
 *   sky / gradient        0.00  static (handled outside this table)
 *   farBackground (mtns)  0.05  near-static pixel crawl
 *   castle / greenhouse   0.22  slow drift on the focal landmark
 *   midground (terraces)  0.48  mid trees + rolling hills
 *   foreground (decor)    0.95  near-1:1 with the road
 *   road tiles            1.00  ground truth (set in RoadRenderer)
 */
export const PARALLAX = Object.freeze({
  farBackground: 0.05,
  castle:        0.22,
  midground:     0.48,
  foreground:    0.95,
});

export const AMBIENT_MOTES = Object.freeze([
  { x: 0.12, y: 0.64, size: 4, speed: 0.7, color: 'rgba(255,244,180,0.26)' },
  { x: 0.24, y: 0.56, size: 3, speed: 0.9, color: 'rgba(210,255,210,0.18)' },
  { x: 0.76, y: 0.60, size: 4, speed: 0.8, color: 'rgba(255,244,180,0.24)' },
  { x: 0.86, y: 0.52, size: 3, speed: 0.6, color: 'rgba(214,255,228,0.18)' },
]);

// v4.12 — ambient life. Fixed parameter tables + time-driven sine motion
// (NO Math.random, NO world.rng, NO ECS) so the scene gains life without
// touching the seeded simulation / spawn log. All positions are screen-space
// fractions; motion is keyed to world.timeAlive in EffectsRenderer.

// Fluttering butterflies near the flower fields. Biased to the sides/varied
// heights so they rarely sit on the player. kind → wing palette.
export const AMBIENT_BUTTERFLIES = Object.freeze([
  { x: 0.16, y: 0.62, rx: 0.05, ry: 0.06, speed: 0.018, flap: 0.34, scale: 1.00, phase: 0.0, kind: 'gold' },
  { x: 0.31, y: 0.50, rx: 0.06, ry: 0.05, speed: 0.022, flap: 0.30, scale: 0.85, phase: 1.7, kind: 'blue' },
  { x: 0.70, y: 0.57, rx: 0.07, ry: 0.06, speed: 0.016, flap: 0.32, scale: 1.05, phase: 3.0, kind: 'gold' },
  { x: 0.84, y: 0.49, rx: 0.05, ry: 0.07, speed: 0.020, flap: 0.36, scale: 0.80, phase: 4.2, kind: 'white' },
  { x: 0.50, y: 0.41, rx: 0.09, ry: 0.04, speed: 0.014, flap: 0.28, scale: 0.70, phase: 5.5, kind: 'blue' },
]);

// Drifting petals — fall + sway, looped via modulo on time. kind → tint.
export const AMBIENT_PETALS = Object.freeze([
  { x: 0.07, fall: 0.0016, sway: 0.020, swaySpeed: 0.030, scale: 1.00, phase: 0.05, kind: 'pink' },
  { x: 0.19, fall: 0.0013, sway: 0.026, swaySpeed: 0.024, scale: 0.85, phase: 0.41, kind: 'white' },
  { x: 0.28, fall: 0.0019, sway: 0.018, swaySpeed: 0.034, scale: 0.75, phase: 0.77, kind: 'gold' },
  { x: 0.37, fall: 0.0014, sway: 0.024, swaySpeed: 0.027, scale: 0.95, phase: 0.12, kind: 'pink' },
  { x: 0.46, fall: 0.0017, sway: 0.016, swaySpeed: 0.031, scale: 0.70, phase: 0.58, kind: 'white' },
  { x: 0.57, fall: 0.0012, sway: 0.028, swaySpeed: 0.022, scale: 0.90, phase: 0.90, kind: 'pink' },
  { x: 0.65, fall: 0.0018, sway: 0.019, swaySpeed: 0.033, scale: 0.80, phase: 0.30, kind: 'gold' },
  { x: 0.74, fall: 0.0015, sway: 0.025, swaySpeed: 0.026, scale: 1.00, phase: 0.66, kind: 'white' },
  { x: 0.83, fall: 0.0013, sway: 0.022, swaySpeed: 0.029, scale: 0.78, phase: 0.20, kind: 'pink' },
  { x: 0.92, fall: 0.0017, sway: 0.017, swaySpeed: 0.035, scale: 0.88, phase: 0.84, kind: 'gold' },
  { x: 0.13, fall: 0.0011, sway: 0.027, swaySpeed: 0.021, scale: 0.72, phase: 0.49, kind: 'white' },
  { x: 0.52, fall: 0.0020, sway: 0.015, swaySpeed: 0.037, scale: 0.82, phase: 0.71, kind: 'pink' },
]);

// Distant birds — slow horizontal crossing high in the sky, gentle bob.
export const AMBIENT_BIRDS = Object.freeze([
  { y: 0.14, speed: 0.00100, bob: 0.012, scale: 1.00, phase: 0.00 },
  { y: 0.17, speed: 0.00110, bob: 0.010, scale: 0.85, phase: 0.18 },
  { y: 0.11, speed: 0.00090, bob: 0.013, scale: 0.90, phase: 0.44 },
  { y: 0.20, speed: 0.00120, bob: 0.009, scale: 0.80, phase: 0.66 },
]);
