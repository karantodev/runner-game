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

export const PARALLAX = Object.freeze({
  farBackground: 0.08,
  castle: 0.20,
  midground: 0.46,
  foreground: 0.82,
});

export const AMBIENT_MOTES = Object.freeze([
  { x: 0.12, y: 0.64, size: 4, speed: 0.7, color: 'rgba(255,244,180,0.26)' },
  { x: 0.24, y: 0.56, size: 3, speed: 0.9, color: 'rgba(210,255,210,0.18)' },
  { x: 0.76, y: 0.60, size: 4, speed: 0.8, color: 'rgba(255,244,180,0.24)' },
  { x: 0.86, y: 0.52, size: 3, speed: 0.6, color: 'rgba(214,255,228,0.18)' },
]);
