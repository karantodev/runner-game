/**
 * Single source of truth for collectible types. Adding a new pickup =
 * one row in COLLECTIBLE_REGISTRY. CollisionSystem reads `event` /
 * `runStatField` to fire the right event + per-run counter; GameplayRenderer
 * reads `render` to know which sprite + glow to draw.
 *
 * No type-specific logic should live in either of those systems anymore —
 * they should consult the table. This is the Open/Closed principle made
 * concrete: extending collectibles never requires editing them.
 */

/**
 * @typedef {{
 *   event: string,
 *   runStatField?: 'orchidsCollectedThisRun' | 'rareOrchidsCollectedThisRun',
 *   powerUpType?: string,
 *   scoreValue?: number,
 *   render: {
 *     kind: 'flower' | 'rare' | 'power' | 'life',
 *     spriteKey?: string,
 *     glowColor?: string,
 *     size?: number,
 *     sizeScale?: number,
 *   },
 * }} CollectibleSpec
 */

/** @type {Readonly<Record<string, CollectibleSpec>>} */
export const COLLECTIBLE_REGISTRY = Object.freeze({
  flower: {
    event: 'flower:collected',
    runStatField: 'orchidsCollectedThisRun',
    scoreValue: 1,
    // v4.0 — glow params read by GameplayRenderer from GAME_CONFIG.visual.collectibles.glow.
    // glowColor / size here are the DATA-LAYER defaults; GameplayRenderer overrides
    // them with the live config values so A/B-toggling visual.enabled works.
    render: { kind: 'flower', glowColor: '#ffcf3a', size: 60 },
  },
  'flower-rich': {
    // Jackpot orchid: same gold family + same flower:collected event (so combo
    // and counters treat it as an orchid), but worth 3× and rendered larger so
    // the premium reads at a glance — matches the one big orchid in the ref art.
    event: 'flower:collected',
    runStatField: 'orchidsCollectedThisRun',
    scoreValue: 3,
    render: { kind: 'flower', sizeScale: 1.35, glowColor: '#ffcf3a' },
  },
  'rare-orchid': {
    event: 'rare:collected',
    runStatField: 'rareOrchidsCollectedThisRun',
    render: {
      kind: 'rare',
      spriteKey: 'orchidBlueRare',
      glowColor: '#5ab8ff',
      size: 92,
    },
  },
  life: {
    event: 'life:collected',
    render: { kind: 'life' },
  },
  'power-tree': {
    event: 'power:collected',
    powerUpType: 'speed-burst',
    render: { kind: 'power', glowColor: '#72ff66' },
  },
  'power-mushroom': {
    event: 'power:collected',
    powerUpType: 'split-clones',
    render: { kind: 'power', glowColor: '#ad72ff' },
  },
  'power-magnet': {
    event: 'power:collected',
    powerUpType: 'magnet',
    render: { kind: 'power', spriteKey: 'pickupMagnet', glowColor: '#ff7ad6', size: 76 },
  },
  'power-shield': {
    event: 'power:collected',
    powerUpType: 'shield',
    render: { kind: 'power', spriteKey: 'pickupShield', glowColor: '#8cdcff', size: 76 },
  },
  'power-double': {
    event: 'power:collected',
    powerUpType: 'score-x2',
    render: { kind: 'power', spriteKey: 'pickupScoreX2', glowColor: '#ffd54a', size: 76 },
  },
});

/** Returns null for unknown types — callers must handle gracefully. */
export function getCollectibleSpec(type) {
  return COLLECTIBLE_REGISTRY[type] ?? null;
}
