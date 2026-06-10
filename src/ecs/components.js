/**
 * Component factories. Every component is a plain data object with no
 * behavior — logic lives in systems that query for these by name.
 *
 * Naming convention: PascalCase + the file is the single registry of
 * known component shapes. Component "name" used by Entity.add / query
 * is the *string* matching the factory name (e.g. 'Position', 'Sprite').
 */

import { PLAYER_STATES } from './playerFsm.js';

// ── Spatial ──────────────────────────────────────────────────────────────────

/** World-space lane + depth used by everything that scrolls toward the player. */
export const Position = (lane = 0, distance = 0) => ({
  lane,
  distance,
  previousDistance: distance,
});

/** Marks an entity as "moves with the road" — distance decreases by world.speed * delta * factor. */
export const Scrollable = (factor = 1) => ({ factor });

// ── Player ───────────────────────────────────────────────────────────────────

/** Pure marker. */
export const PlayerTag = () => ({});

/**
 * FSM label for the player's current high-level state.
 * `hitFramesLeft` is set by GameStateSystem on a hazard hit and counted
 * down by PlayerPhysicsSystem; the 'hit' state ends when it reaches 0.
 *
 * See src/ecs/playerFsm.js — transitionTo() is the only mutation authority.
 */
export const PlayerState = () => ({
  current: PLAYER_STATES.running,
  hitFramesLeft: 0,
});

export const LaneState = () => ({
  targetLane: 0,
  laneX: 0,
  laneTilt: 0,
  // Frame countdown stamped by moveLane on an actual lane step; while > 0
  // the FSM reports laneChanging. A countdown (not a laneX-vs-target
  // epsilon) because the damp converges ~88% per fixed tick — no epsilon
  // yields a stable multi-frame window (see player.config.js fsm notes).
  laneChangeFramesLeft: 0,
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
  // v3.8.39 — Phase 5 prefab item role (optional). Populated by
  // createScenery when a SIDE_DECORATION_PREFAB declares structured
  // slots. Read by SceneryRenderer's composition overlay for the role
  // badge. null when the entity wasn't spawned from an annotated prefab.
  role: null,
  prefabId: null,
  // v3.8.40 — Phase 6 prefab item id + parent + render-order zLayer.
  // Used by the composition overlay to draw parent-child support lines
  // and by SceneryRenderer to break z-sort ties (higher zLayer draws on
  // top). null/0 when the entity has no slot annotation.
  itemId: null,
  parentItemId: null,
  zLayer: 0,
});

// Particles & score popups live in their own pool-backed systems
// (see ParticleSystem / ScorePopupSystem) — they don't go through the
// component registry, so no Lifetime / ParticleData / ScorePopupData
// component shapes are needed here.
