import { ASSET_TYPES, LANE_BANDS, SCENE_ZONES } from './sceneSchema.js';
import { CANVAS_CONFIG } from './subconfigs/canvas.config.js';
import { PROJECTION_CONFIG } from './subconfigs/projection.config.js';
import { PLAYER_CONFIG } from './subconfigs/player.config.js';
import { GAMEPLAY_CONFIG } from './subconfigs/gameplay.config.js';
import { DEBUG_CONFIG } from './subconfigs/debug.config.js';
import { VISUALS_CONFIG } from './subconfigs/visuals.config.js';
import { POWERUPS_CONFIG } from './subconfigs/powerups.config.js';
import { SPAWN_CONFIG } from './subconfigs/spawn.config.js';
import { ASSETS_CONFIG } from './subconfigs/assets.config.js';

export const GAME_CONFIG = Object.freeze({
  canvas: CANVAS_CONFIG,
  projection: PROJECTION_CONFIG,
  player: PLAYER_CONFIG,
  gameplay: GAMEPLAY_CONFIG,
  debug: DEBUG_CONFIG,
  visual: VISUALS_CONFIG,
  powerUps: POWERUPS_CONFIG,
  spawn: SPAWN_CONFIG,
  assets: ASSETS_CONFIG,
  scene: {
    zones: SCENE_ZONES,
    laneBands: LANE_BANDS,
    assetTypes: ASSET_TYPES,
    theme: 'GARDEN_CORRIDOR_REFERENCE',
  },
  // Runtime-mutable quality flags — mutated by AdaptiveQuality and SettingsMenu.
  // Defaults match tier 3 (Ultra). Object.freeze is shallow so properties stay writable.
  gameFeel: {
    particles: true,
    cameraShake: true,
    scorePopups: true,
    ambientMotion: true,
  },
});
