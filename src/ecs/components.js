/**
 * Component factories. Every component is a plain data object with no
 * behavior — logic lives in systems that query for these by name.
 *
 * Naming convention: PascalCase + the file is the single registry of
 * known component shapes. Component "name" used by Entity.add / query
 * is the *string* matching the factory name (e.g. 'Position', 'Sprite').
 */

// ── Spatial ──────────────────────────────────────────────────────────────────

/** World-space lane + depth used by everything that scrolls toward the player. */
export const Position = (lane = 0, distance = 0) => ({ lane, distance });

/** Marks an entity as "moves with the road" — distance decreases by world.speed * delta * factor. */
export const Scrollable = (factor = 1) => ({ factor });

// ── Player ───────────────────────────────────────────────────────────────────

/** Pure marker. */
export const PlayerTag = () => ({});

export const LaneState = () => ({
  targetLane: 0,
  laneX: 0,
  laneTilt: 0,
});

export const VerticalState = () => ({
  y: 0,
  vy: 0,
  isJumping: false,
  jumpHoldFrames: 0,
  jumpStretch: 0,
  landSquash: 0,
});

export const CrouchState = () => ({
  isCrouching: false,
  crouchHoldFrames: 0,
});

export const AnimState = () => ({
  runFrame: 0,
  idleTime: 0,
});

/**
 * Pending player intent — used for jump / crouch input buffering.
 * Each buffer is a frame countdown: when > 0 and the corresponding
 * action becomes possible, it fires and the counter resets to 0.
 */
export const PlayerIntent = () => ({
  jumpBuffer: 0,
  crouchBuffer: 0,
});

export const Health = (startLives) => ({
  lives: startLives,
  invulnerabilityFrames: 0,
  hitFlash: 0,
});

// ── Obstacles ────────────────────────────────────────────────────────────────

export const Hitbox = (type, lane = 0, allLanes = false) => ({
  type,
  lane,
  allLanes,
  hit: false,
  warning: false,
});

// ── Collectibles ─────────────────────────────────────────────────────────────

// Note: `t` (bobbing phase) and `laneJitter` (±8% horizontal wobble) are
// purely cosmetic — they don't affect spawn placement, collision, or
// score. We use Math.random() here on purpose so the seedable world RNG
// stays untouched by visual jitter.
export const CollectibleData = (type, high = false) => ({
  type,
  high,
  collected: false,
  t: Math.random() * Math.PI * 2,
  laneJitter: type === 'flower' ? (Math.random() - 0.5) * 0.16 : 0,
});

// ── Scenery ──────────────────────────────────────────────────────────────────

export const ScenicData = (laneBand = null, zone = null, chunkId = null) => ({
  laneBand,
  zone,
  chunkId,
});

// ── Sprite / visual ──────────────────────────────────────────────────────────

export const Sprite = (type, assetType, variant = null, visualScale = 1, yOffset = 0) => ({
  type,
  assetType: assetType ?? type,
  variant,
  visualScale,
  yOffset,
});

// Particles & score popups live in their own pool-backed systems
// (see ParticleSystem / ScorePopupSystem) — they don't go through the
// component registry, so no Lifetime / ParticleData / ScorePopupData
// component shapes are needed here.
