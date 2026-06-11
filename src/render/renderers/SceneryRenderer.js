import { AMBIENT_MOTES, LAYERS, PARALLAX } from '../constants.js';
import { parallaxOffset, roadBaseHalfWidth } from '../helpers.js';
import { LANE_BANDS, SCENE_ZONES } from '../../config/sceneSchema.js';
import { sceneryCategory } from '../RenderMetrics.js';

/**
 * v3.7 per-band visual-size multipliers. SceneryRenderer multiplies the
 * projected scale by this so each zone reads at its intended weight
 * without changing the individual prefab scales.
 */
const BAND_SIZE_BIAS = Object.freeze({
  [LANE_BANDS.SHOULDER]:  0.55,   // tiny buffer flora
  // v4.7 — MEADOW carpet flora: a touch smaller than SHOULDER so the wide
  // bed reads as fine ground-cover behind the structure clusters.
  [LANE_BANDS.MEADOW]:    0.50,
  // v4.20 — reference-match: bolder block walls (1.00 → 1.08) to match the
  // reference's chunky foreground blocks, without adding clusters (keeps the
  // open garden read from the v4.16 decorMultiplier / tree-thinning passes).
  [LANE_BANDS.STRUCTURE]: 1.08,   // blocks / mushrooms / fences
  // v3.7.1 — trees were dominating the frame at 1.40. Reference shows
  // them as small background mass, not foreground props. Cut to 0.80 +
  // pair with the BAND_ALPHA_BIAS so they read as fading background.
  // v4.15 — reference-match: still read as a foreground wall along the
  // early corridor; cut another ~17% (0.80 → 0.66) so the treeline drops
  // back into background mass and the flowered field + mountains show.
  [LANE_BANDS.NATURE]:    0.66,
});

/** v3.7.1 — extra alpha multiplier so NATURE reads as washed-back. */
const BAND_ALPHA_BIAS = Object.freeze({
  // v4.15 — reference-match: more washed-back (0.78 → 0.64) so the
  // mountains/sky read THROUGH the treeline instead of behind a wall.
  [LANE_BANDS.NATURE]: 0.64,
});

// v4.8 — flora contact-shadow tuning (see #drawFloraShadow).
// MIN_SCALE bounds how many flora get a shadow: only the near/large slice
// (final draw scale above this) qualifies, so the cost stays a handful of
// ellipses per frame instead of one per carpet speck.
const FLORA_SHADOW_MIN_SCALE = 0.13;
// Base footprint half-width in px at scale 1; multiplied by widthScale and
// the sprite's final scale to size the ellipse to the planted flora.
const FLORA_SHADOW_BASE_PX = 46;
// v4.14 — reference-match: solid (block/mushroom/fence/bush) contact-shadow
// tuning. MIN_SCALE is higher than flora's so only near/mid structures pay the
// cost — far blocks skip — bounding the count to a handful of ellipses/frame.
const SOLID_SHADOW_MIN_SCALE = 0.20;
// v4.14 — reference-match: wider base footprint than flora; blocks are chunky
// and need a broader contact patch to read as planted rather than floating.
const SOLID_SHADOW_BASE_PX = 60;
// v4.14 — reference-match: structures that float have NO ground contact, so
// they must never get a contact shadow (it would read as a detached blob).
const NO_SOLID_SHADOW = new Set(['floating_platform', 'platform', 'hanging_platform_vines', 'hangingPlatform']);
const GROUND_STACK_Y_OFFSET_CUTOFF = -18;
const TWO_PI = Math.PI * 2;

const SOLID_SHADOW_PROFILE_DEFAULT = Object.freeze({
  minScale: SOLID_SHADOW_MIN_SCALE,
  widthMul: 1.0,
  heightMul: 0.30,
  alphaMul: 1.0,
  yOffsetPx: 0,
  outwardBiasPx: 4,
});
const SOLID_SHADOW_PROFILE_BLOCK = Object.freeze({
  minScale: 0.19,
  widthMul: 1.12,
  heightMul: 0.27,
  alphaMul: 1.06,
  yOffsetPx: 1,
  outwardBiasPx: 6,
});
const SOLID_SHADOW_PROFILE_WALL = Object.freeze({
  minScale: 0.18,
  widthMul: 1.20,
  heightMul: 0.25,
  alphaMul: 1.08,
  yOffsetPx: 1,
  outwardBiasPx: 7,
});
const SOLID_SHADOW_PROFILE_PLATFORM = Object.freeze({
  minScale: 0.18,
  widthMul: 1.24,
  heightMul: 0.23,
  alphaMul: 1.04,
  yOffsetPx: 1,
  outwardBiasPx: 8,
});
const SOLID_SHADOW_PROFILE_PIPE = Object.freeze({
  minScale: 0.18,
  widthMul: 0.88,
  heightMul: 0.33,
  alphaMul: 1.14,
  yOffsetPx: 1,
  outwardBiasPx: 3,
});
const SOLID_SHADOW_PROFILE_BRICK = Object.freeze({
  minScale: 0.19,
  widthMul: 0.92,
  heightMul: 0.29,
  alphaMul: 0.96,
  yOffsetPx: 0,
  outwardBiasPx: 3,
});
const SOLID_SHADOW_PROFILE_MUSHROOM = Object.freeze({
  minScale: 0.16,
  widthMul: 0.84,
  heightMul: 0.36,
  alphaMul: 0.92,
  yOffsetPx: 1,
  outwardBiasPx: 2,
});
const SOLID_SHADOW_PROFILE_FENCE = Object.freeze({
  minScale: 0.17,
  widthMul: 1.18,
  heightMul: 0.21,
  alphaMul: 0.90,
  yOffsetPx: 1,
  outwardBiasPx: 10,
});
const SOLID_SHADOW_PROFILE_BUSH = Object.freeze({
  minScale: 0.15,
  widthMul: 1.14,
  heightMul: 0.28,
  alphaMul: 0.84,
  yOffsetPx: 1,
  outwardBiasPx: 6,
});
const SOLID_SHADOW_PROFILE_TREE = Object.freeze({
  minScale: 0.17,
  widthMul: 1.34,
  heightMul: 0.24,
  alphaMul: 0.72,
  yOffsetPx: 2,
  outwardBiasPx: 12,
});
const SOLID_SHADOW_PROFILE_BY_ASSET = Object.freeze({
  grass_dirt_block: SOLID_SHADOW_PROFILE_BLOCK,
  grass_dirt_wall: SOLID_SHADOW_PROFILE_WALL,
  grass_dirt_step: SOLID_SHADOW_PROFILE_BLOCK,
  grass_dirt_step_left: SOLID_SHADOW_PROFILE_BLOCK,
  grass_dirt_platform_long: SOLID_SHADOW_PROFILE_PLATFORM,
  pipe: SOLID_SHADOW_PROFILE_PIPE,
  green_pipe: SOLID_SHADOW_PROFILE_PIPE,
  planter_pot: SOLID_SHADOW_PROFILE_PIPE,
  question_block: SOLID_SHADOW_PROFILE_BRICK,
  purple_brick_single: SOLID_SHADOW_PROFILE_BRICK,
  mushroom_red_big: SOLID_SHADOW_PROFILE_MUSHROOM,
  mushroom_blue_big: SOLID_SHADOW_PROFILE_MUSHROOM,
  fence_wood_short: SOLID_SHADOW_PROFILE_FENCE,
  bush_large: SOLID_SHADOW_PROFILE_BUSH,
  bush_large_with_purple_flowers: SOLID_SHADOW_PROFILE_BUSH,
  bush_with_purple_flowers: SOLID_SHADOW_PROFILE_BUSH,
  leaf_clump_round: SOLID_SHADOW_PROFILE_BUSH,
  leaf_clump_small: SOLID_SHADOW_PROFILE_BUSH,
  tree_round: SOLID_SHADOW_PROFILE_TREE,
  tree: SOLID_SHADOW_PROFILE_TREE,
});

/**
 * v4.7 — the two low-flora bands share the same soft treatment: small
 * size bias, near-camera alpha fade and scatter size/flip variation.
 * SHOULDER is the thin road-edge strip; MEADOW is the wide field carpet.
 */
function isLowFloraBand(band) {
  return band === LANE_BANDS.SHOULDER || band === LANE_BANDS.MEADOW;
}

/** v3.7.4 — prefab filter. Only tree assetTypes get rendered as static frame. */
function isTreeAssetType(assetType) {
  return assetType === 'tree_round' || assetType === 'tree';
}

/**
 * v3.7 lane-remap. Legacy prefab data hugged the road tightly
 * (STRUCTURE at lane 1.88-2.18, NATURE trees at lane 3.04-3.22). The
 * new zone scheme pushes them outward so the decor band reads as a real
 * 60-80 px corridor and the trees frame the horizon. Mapped at render-
 * time instead of mutating the data file — keeps SHOULDER (buffer)
 * untouched and lets us re-tune in a single place.
 */
function remapLaneForBand(lane, band) {
  const sign = Math.sign(lane) || 1;
  const abs = Math.abs(lane);
  // v4.2 — P2 reference-match: remap outer bands onto the canonical zone
  // geometry (road edge 2.30, shoulder→2.55, structure→3.70, nature→4.80
  // lane-units, per GAME_CONFIG.projection) so the sides read as clean,
  // non-overlapping bands like the reference. SHOULDER was previously
  // unremapped and rendered flora ON the road; STRUCTURE was collapsed
  // into a thin stripe; NATURE trees now sit clearly beyond the blocks.
  if (band === LANE_BANDS.SHOULDER) {
    // raw shoulder lanes ≈ [1.38, 1.85] → visual [2.32, 2.55] (just past edge)
    const t = Math.min(1, Math.max(0, (abs - 1.38) / (1.85 - 1.38)));
    return sign * (2.32 + t * (2.55 - 2.32));
  }
  if (band === LANE_BANDS.MEADOW) {
    // v4.9 — raw [1.38, 1.85] → visual [2.55, 3.70]. Picks up where the
    // SHOULDER strip ends and spreads across the green field, laterally
    // overlapping the structure band so low flora fill the gaps between
    // clusters. zLayer keeps the carpet behind/below the blocks.
    const t = Math.min(1, Math.max(0, (abs - 1.38) / (1.85 - 1.38)));
    return sign * (2.55 + t * (3.70 - 2.55));
  }
  if (band === LANE_BANDS.STRUCTURE) {
    // raw structure lanes ≈ [1.85, 2.25] → visual [2.55, 3.70] (full band)
    if (abs < 1.85) return sign * 2.55;
    const t = Math.min(1, (abs - 1.85) / 0.40);
    return sign * (2.55 + t * (3.70 - 2.55));
  }
  if (band === LANE_BANDS.NATURE) {
    // raw nature lanes ≈ [2.40, 3.25] → visual [3.70, 4.80] (beyond structures)
    if (abs < 2.40) return sign * 3.70;
    const t = Math.min(1, (abs - 2.40) / 0.85);
    return sign * (3.70 + t * (4.80 - 3.70));
  }
  return lane;
}
import { FOREGROUND_FRAME_SCENERY, MIDGROUND_SCENERY, bandForDistance } from '../../config/sceneSchema.data.js';
import { getSceneryDraw, isSideAwareSceneryType } from './scenery/sceneryDispatch.js';
import { ASSET_SEMANTICS, getCanonicalSemantic } from '../../config/assetSemantics.js';

// v3.8.50 — Phase 8 canonical overlay palette. Keyed by canonical
// role so the colour matches the spec (red=obstacle, yellow=collect,
// green=powerup, blue=side-struct, gray=decor, purple=support).
const COMPOSITION_COLORS = {
  GAMEPLAY_OBSTACLE:  '#ff5050', // red
  COLLECTIBLE:        '#ffd54a', // yellow
  BONUS_POWERUP:      '#6ee06e', // green
  SIDE_STRUCTURE:     '#5ab8ff', // blue
  PLATFORM:           '#7fd0ff', // blue-light (platforms read as structure)
  ROAD_DECOR:         '#a0a0a0', // gray
  SIDE_DECOR_SMALL:   '#a0a0a0', // gray
  SIDE_DECOR_LARGE:   '#9aa0a8', // gray-blue (slightly distinguish)
  SUPPORT_FOUNDATION: '#b78cff', // purple
  STACKABLE_TOP:      '#c39cff', // purple-light
  LANDMARK:           '#ffb0ff', // magenta-pink (low-count, easy to spot)
  BACKGROUND_ONLY:    '#666',    // dim gray
  unknown:            '#ff8030', // orange — semantic missing
};
const ROLE_BADGE_LETTER = {
  'base':              'B',
  'support':           'S',
  'topper':            'T',
  'child-decor':       'C',
  'foreground-accent': 'F',
  'background-accent': 'K',
  'road-facing-face':  'R',
  'loose-decor':       'L',
};

function categoryFor(assetType) {
  return ASSET_SEMANTICS[assetType]?.category ?? 'unknown';
}

// v3.8.50 — filter keyed by canonical role.
function compositionFilterAllows(role, filter) {
  if (filter === 'all' || !filter) return true;
  if (filter === 'obstacles') return role === 'GAMEPLAY_OBSTACLE';
  if (filter === 'pickups')   return role === 'COLLECTIBLE' || role === 'BONUS_POWERUP';
  if (filter === 'decor')     return role === 'SIDE_DECOR_SMALL' || role === 'SIDE_DECOR_LARGE' || role === 'ROAD_DECOR' || role === 'SUPPORT_FOUNDATION' || role === 'STACKABLE_TOP' || role === 'PLATFORM' || role === 'SIDE_STRUCTURE';
  if (filter === 'invalid')   return false; // handled per-entity
  return true;
}

// v3.8.50 — derive the runtime zone from lane sign (instead of just
// using the canonical set of allowed zones). Lets the overlay show
// where the entity ACTUALLY landed, not where it's allowed to.
function runtimeZoneForLane(lane) {
  if (lane === undefined || lane === null) return 'ROAD_CORE';
  if (lane <= -1.5) return 'LEFT_SHOULDER';
  if (lane >=  1.5) return 'RIGHT_SHOULDER';
  if (Math.abs(lane) > 1.0) return 'ROAD_EDGE';
  return 'ROAD_CORE';
}

// v4.23 — M9 far-scenery tint. Asset types whose FAR instances (final
// scale < thresholdScale) get a cached, pre-tinted sprite variant so they
// recede into atmosphere. Conservative far-dominant set only; small flora,
// foreground frame and gameplay-adjacent silhouettes are intentionally absent.
const FAR_TINT_ASSET_TYPES = new Set([
  'tree_round', 'tree',
  'bush_large', 'bush_large_with_purple_flowers',
  'grass_dirt_block', 'grass_dirt_step',
  'green_pipe',
  'floating_platform', 'platform', 'grass_dirt_platform_long',
]);

/**
 * v4.23 — M9. Drop-in stand-in for SpriteRenderer, used ONLY for far scenery
 * sprites. Same geometry as SpriteRenderer.draw, but blits a cached, pre-tinted
 * variant of the source image — built once per sprite key, never per frame, no
 * ctx.filter. Still exactly one drawImage per sprite; only the source changes.
 * When the cache cap is reached it falls back to the raw image (and counts it).
 */
class TintingSprites {
  constructor(ctx, assets) {
    this.ctx = ctx;
    this.assets = assets;
    this.config = null;
    this.cache = new Map();   // spriteKey → tinted canvas (built once)
    this._builtKeys = [];
    this._bytes = 0;
    this._skipped = 0;
  }

  draw(key, cx, baseY, targetWidth, anchor = 'bottom') {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;
    const src = this.#tinted(key, image);
    const height = targetWidth * (image.naturalHeight / image.naturalWidth);
    const x = cx - targetWidth / 2;
    const y = anchor === 'center' ? baseY - height / 2 : baseY - height;
    this.ctx.drawImage(src, Math.round(x), Math.round(y), Math.round(targetWidth), Math.round(height));
    return true;
  }

  #tinted(key, image) {
    const cached = this.cache.get(key);
    if (cached) return cached;
    const cap = this.config?.maxCacheEntries ?? 12;
    if (this.cache.size >= cap) { this._skipped += 1; return image; }   // cap hit → raw sprite
    const canvas = this.#build(image);
    this.cache.set(key, canvas);
    this._builtKeys.push(key);
    this._bytes += image.naturalWidth * image.naturalHeight * 4;
    return canvas;
  }

  #build(image) {
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const canvas = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const t = canvas.getContext('2d');
    t.drawImage(image, 0, 0, w, h);
    // source-atop keeps the tint inside the sprite's alpha (no grey box around
    // transparent edges). Two subtle fills: desaturate toward neutral grey, then
    // lighten toward a pale atmospheric tone. Both one-time, baked into the cache.
    t.globalCompositeOperation = 'source-atop';
    t.globalAlpha = this.config?.desaturate ?? 0.20;
    t.fillStyle = 'rgb(150,160,162)';
    t.fillRect(0, 0, w, h);
    t.globalAlpha = this.config?.lighten ?? 0.10;
    t.fillStyle = 'rgb(236,242,240)';
    t.fillRect(0, 0, w, h);
    t.globalAlpha = 1;
    t.globalCompositeOperation = 'source-over';
    return canvas;
  }

  stats() {
    return { built: this.cache.size, keys: [...this._builtKeys], approxBytes: this._bytes, skipped: this._skipped };
  }
}

/**
 * All non-gameplay world geometry: the static midground/foreground prefab
 * scenery, the per-tick spawned `world.scenery` items (split into a
 * structural pass and an organic pass so walls always sit behind shrubs),
 * the per-side foreground garden gradient + ambient motes, and the
 * dispatcher that paints every individual scenery asset type.
 */
export class SceneryRenderer {
  constructor({ ctx, projection, assets, sprites, paint, gradients, voxelBlocks, metrics }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.paint = paint;
    this.gradients = gradients;
    this.voxelBlocks = voxelBlocks;
    this.metrics = metrics ?? null;   // debug-only render-cost counters (?perf=1)
    this._drawDeps = { sprites, paint, voxelBlocks };
    // v4.23 — M9 far-scenery tint. A tinting sprite proxy + a parallel deps
    // object used ONLY for far tintable scenery; all other draws use the
    // untinted _drawDeps. Cache builds lazily once per key; never per frame.
    this._tintSprites = new TintingSprites(ctx, assets);
    this._tintDeps = { sprites: this._tintSprites, paint, voxelBlocks };
    this._tintCfg = null;
    // v4.12 — three-way draw order (allocation-free scratch arrays). Low flora
    // (SHOULDER/MEADOW) is the GROUND carpet and must sit behind solid props,
    // so the order is: NATURE backdrop → flora carpet → STRUCTURE props.
    // Within each band byDistanceComponent sorts far→near (+ zLayer tiebreak).
    this._nature = [];
    this._flora = [];
    this._structural = [];
    // B2 — garlands collected during the main entity loop (cleared per frame,
    // no fresh allocation). Avoids a second full registry.query scan in
    // #drawGarlands; also enables the correct far→near sort that the doc
    // describes but the old re-scan path was missing.
    this._garlands = [];
  }

  render(world) {
    // v3.8.16 — pull the debug flag once per frame instead of reading
    // it inside #drawSceneryType (called for every scenery entity).
    this._showSideLabels = !!world.config.debug?.showSides;
    // v4.8 — resolve the flora contact-shadow config ONCE per frame so the
    // per-sprite path (#sceneryEntity, ~1k calls) only reads cached fields.
    // The fill colour never changes, so set ctx.fillStyle once here too —
    // each shadow draw then only touches globalAlpha (mirrors the no-
    // save/restore alpha handling in #drawSceneryType, keeping the recent
    // per-sprite state-stack optimisation intact).
    const floraShadowCfg = world.config.visual?.juice?.floraShadow;
    this._floraShadow = floraShadowCfg?.enabled ? floraShadowCfg : null;
    if (this._floraShadow) this.ctx.fillStyle = 'rgb(30, 18, 8)';
    // v4.14 — reference-match: contact shadow under solid side structures so
    // blocks/mushrooms read as planted, not floating. Order-independent default
    // (only OFF when explicitly disabled) so it works before the config knob lands.
    const solidShadowCfg = world.config.visual?.juice?.solidShadow;
    this._solidShadow = (solidShadowCfg && solidShadowCfg.enabled === false)
      ? null
      : (solidShadowCfg ?? { alpha: 0.22, widthScale: 0.62 });
    // v3.8.38 — keep a world ref for the composition overlay so the
    // per-entity dispatch doesn't have to thread world through every
    // private method.
    this._world = world;
    // v4.23 — M9 far-scenery tint config (cached variants for far sprites).
    this._tintCfg = world.config?.visual?.depth?.sceneryTint ?? null;
    this._tintSprites.config = this._tintCfg;
    world.__sceneryTintStats = this._tintSprites.stats();
    // v3.8.40 — Phase 6 parent-child line drawing. Per-frame map of
    // (prefabId + itemId) → screen position, built as items render.
    // After the entire scenery pass we walk it once to draw lines from
    // each child to its parent.
    this._supportPositions = world.config.debug?.showComposition ? new Map() : null;
    // v3.8.51 — Phase 9 prefab-group bounding boxes. Per-frame map of
    // prefabId → { minX, maxX, minY, maxY, count, side }, populated as
    // items render. Drawn once after the scenery pass. Only built when
    // showCompositionGroups is on.
    this._groupBoxes = world.config.debug?.showCompositionGroups ? new Map() : null;
    // v3.8.17 — when the side-matrix debug overlay is on, skip the
    // dynamic scenery rendering entirely and draw the test grid
    // instead. Sky / mountains / road / castle still render in their
    // own renderers — gives context without scenery noise.
    if (world.config.debug?.showSideMatrix) {
      this.#drawSideMatrix(world);
      return;
    }
    this.#midgroundTerraces(world);
    // v3.7.5 — #foregroundGarden removed. It painted:
    //   1. a static side-gradient panel on each shoulder (light-green tint)
    //   2. 28 procedural fillRect grass blades re-seeded off scrollOffset
    //      every frame — caused the visible flicker on the left shoulder
    //   3. four sprite-flora items per side anchored to FIXED screen X —
    //      these were the "static bushes in the bottom corners"
    // The game is a treadmill: only true background (trees / mountains /
    // sky) should sit still, every other prop must flow with the road.
    // Dynamic decor through DecorationSystem covers the buffer/structure
    // zones with entities that actually scroll toward the camera.

    // v4.12 — correctness. Low flora (SHOULDER/MEADOW) is the GROUND carpet:
    // it must always sit BEHIND solid props. The original 3-pass order drew it
    // LAST so flora floated over every block; a flat depth-merge let a nearer
    // flower paint over a farther block face (flowers growing out of blocks).
    // Right model: NATURE backdrop → flora carpet → STRUCTURE props on top,
    // each distance-sorted internally (byDistanceComponent also z-tiebreaks
    // base→topper, so prefab toppers — STRUCTURE band — stay on their blocks).
    const nature = this._nature;
    const flora = this._flora;
    const structural = this._structural;
    const garlands = this._garlands;
    nature.length = 0;
    flora.length = 0;
    structural.length = 0;
    garlands.length = 0;
    for (const e of world.registry.query('ScenicData', 'Position', 'Sprite')) {
      const band = e.components.ScenicData.laneBand;
      // B2 — garland entities use STRUCTURE band but must bypass the normal
      // lane-remap (they sit at lane=0, not remapped to side 2.55). They draw
      // via #drawGarlands() before the structural pass so they read as mid-
      // distance arches BEHIND the side props. Collect them here so
      // #drawGarlands can reuse this set instead of running a second scan.
      if ((e.components.Sprite.assetType ?? e.components.Sprite.type) === 'decorative_branch_garland') {
        garlands.push(e);
        continue;
      }
      if (band === LANE_BANDS.NATURE) nature.push(e);
      else if (isLowFloraBand(band)) flora.push(e);
      else structural.push(e);
    }
    // Pass (a): NATURE trees — background mass.
    nature.sort(byDistanceComponent);
    for (const e of nature) this.#sceneryEntity(e, world, LAYERS.FOREGROUND_DECOR);
    // Pass (b): flora carpet — the ground bed, behind solid props.
    flora.sort(byDistanceComponent);
    for (const e of flora) this.#sceneryEntity(e, world, LAYERS.FOREGROUND_DECOR);
    // B2 — garland pass: mid-field decorative arches drawn before STRUCTURE
    // props so they read as background accents behind the side blocks.
    // garlands was populated during the entity loop above — no second scan.
    this.#drawGarlands(world, garlands);
    // Pass (c): STRUCTURE blocks / mushrooms / fences — solid props on the bed.
    structural.sort(byDistanceComponent);
    for (const e of structural) this.#sceneryEntity(e, world, LAYERS.FOREGROUND_DECOR);

    this.#foregroundFrame(world);
    // v4.21 — M7B: atmospheric haze over the far/mid scenery depth band. Drawn
    // after all scenery so the far decor recedes; gameplay, player and effects
    // render later (on top) and stay crisp.
    this.#drawDepthHaze(world);
    // v3.8.40 — Phase 6 parent-child support lines pass.
    this.#drawSupportLines();
    // v3.8.51 — Phase 9 prefab-group bounding box pass.
    this.#drawGroupBoxes();
  }

  /**
   * v4.21 — M7B dynamic-scenery depth haze: one cached gradient fillRect over
   * the far/mid scenery screen band, scaled by visual.depth.sceneryHaze.alpha.
   * Render-only, allocation-free (gradient cached in GradientCache), no
   * save/restore. Far/mid scenery recedes; near foreground + gameplay stay
   * crisp (they sit below the band, or draw later in the pipeline).
   */
  #drawDepthHaze(world) {
    const cfg = world.config?.visual?.depth?.sceneryHaze;
    if (!cfg?.enabled || world.config?.visual?.enabled === false) return;
    const a = cfg.alpha ?? 0.13;
    if (a <= 0) return;
    const g = this.gradients?.gradients;
    if (!g?.sceneryHaze) return;
    const ctx = this.ctx;
    ctx.globalAlpha = a;
    ctx.fillStyle = g.sceneryHaze;
    ctx.fillRect(0, g.sceneryHazeY0, this.projection.width, g.sceneryHazeY1 - g.sceneryHazeY0);
    ctx.globalAlpha = 1;
  }

  // ── B2 Mid-field garland pass ────────────────────────────────────────────────

  /**
   * B2 — Draw all decorative garland entities in world order (far → near).
   *
   * Garland entities have lane=0 and assetType='decorative_branch_garland'.
   * They are filtered out of the normal entity buckets (structural / flora /
   * nature) and rendered here instead so the lane-remap logic is bypassed —
   * a garland must always project from screen center, not from a remapped
   * side-band position.
   *
   * Visual design:
   *  - Projects at lane 0 (road center) at the entity's stored distance.
   *  - The sprite is drawn at 640 × projectedScale logical pixels wide so it
   *    fills roughly the full visible corridor at mid-distance (50-80m).
   *  - A negative yOffset lifts the arch above the ground plane so it hangs
   *    at window-header height rather than lying flat on the road surface.
   *  - Alpha attenuated by distance (fades in as it approaches) and by the
   *    configured garland opacity so the arch never competes with the player
   *    or obstacles.
   *
   * Perf contract: no ctx.save/restore, no per-frame allocation (garland
   * entities are pooled/cleaned by CleanupSystem; the input array is the
   * pre-collected this._garlands set — no second registry scan). One
   * drawImage per garland in view (typically 1-2 per frame). globalAlpha
   * touched and reset inline.
   *
   * @param {object} world
   * @param {Array} garlandEntities — pre-collected garland entities from the
   *   main entity loop; sorted far→near in-place before drawing.
   */
  #drawGarlands(world, garlandEntities) {
    const cfg = world.config?.visual?.garland;
    if (!cfg || cfg.enabled === false) return;
    const baseAlpha = cfg.opacity ?? 0.82;
    const yLift = cfg.yLiftPx ?? 48;           // px above the projected ground line
    const baseDrawWidth = cfg.drawWidth ?? 540; // logical px at scale 1.0 (config-driven)

    // Sort far→near like sibling passes so z-order is depth-correct.
    garlandEntities.sort(byDistanceComponent);

    for (const e of garlandEntities) {
      const pos = e.components.Position;
      if (pos.distance < -5.5) continue;   // cull (CleanupSystem handles negative)

      // Project from center lane (no remap). projectVisual(0, d) gives the
      // screen center + the vertical ground-contact Y at that depth.
      const p = this.projection.projectVisual(0, pos.distance);
      // Only render at mid-field depth: too far = invisible; too close = obtrusive.
      // The player-facing constraint: at distance < 20m a garland is so large
      // it overwhelms the gameplay corridor. Hard-cull below 18m.
      if (pos.distance < 18) continue;
      if (p.scale < 0.09) continue;        // too far to read cleanly

      // Lift the sprite above the ground contact line so it reads as a
      // hanging arch rather than a flat road element.
      const liftedY = Math.round(p.sy - yLift * p.scale);
      const drawWidth = Math.round(baseDrawWidth * p.scale * (e.components.Sprite.visualScale ?? 1));

      // Near-fade: ease in as the garland scrolls into the 18-30m window so
      // it doesn't hard-pop from invisible to full opacity.
      const nearFade = Math.min(1, (pos.distance - 18) / 12);
      const alpha = baseAlpha * nearFade;
      if (alpha < 0.04) continue;

      const ctx = this.ctx;
      ctx.globalAlpha = alpha;
      this.sprites.draw('decorativeBranchGarland', p.sx, liftedY, drawWidth);
      ctx.globalAlpha = 1;
      this.metrics?.countScenery('garland', null);
    }
  }

  // ── Static prefab layers ────────────────────────────────────────────────────

  #midgroundTerraces(world) {
    // v3.7.4: only TREE entries from the midground prefab are rendered.
    // Static blocks / walls / mushrooms / fences sat at fixed distance
    // and looked "frozen" while dynamic decor scrolled toward the player.
    // Trees are the one prop the user actually wants framing the road.
    for (const item of MIDGROUND_SCENERY) {
      if (!isTreeAssetType(item.assetType)) continue;
      this.#drawComposedSceneryItem(item, world, LAYERS.MIDGROUND_TERRAIN, 0.74);
    }
  }

  #foregroundFrame(world) {
    // Same filter as #midgroundTerraces — only trees survive.
    for (const item of FOREGROUND_FRAME_SCENERY) {
      if (!isTreeAssetType(item.assetType)) continue;
      this.#drawComposedSceneryItem(item, world, LAYERS.FOREGROUND_DECOR, 0.95);
    }
  }

  #drawComposedSceneryItem(item, world, layer, alpha = 1) {
    // v3.7: project against the zone-remapped lane so the prefab pushes
    // outward into the new wider decor / nature bands.
    const band = this.#bandForZone(item.zone);
    const projLane = remapLaneForBand(item.lane, band);
    const p = this.#projectWithParallax(projLane, item.distance, world, layer);
    const layerBoost = layer === LAYERS.MIDGROUND_TERRAIN ? 1.12 : layer === LAYERS.FOREGROUND_DECOR ? 1.06 : 1;
    const sizeBias = BAND_SIZE_BIAS[band] ?? 1;
    const scale = p.scale * (item.scale ?? item.visualScale ?? 1) * layerBoost * sizeBias;
    const alphaBias = BAND_ALPHA_BIAS[band] ?? 1;
    const y = p.sy + (item.yOffset ?? 0) * scale;
    // v3.8.14 — pixel-snap projected position so decor sprites don't
    // jitter at sub-pixel boundaries when scroll advances.
    this.#drawSceneryType(item.assetType ?? item.type, Math.round(p.sx), Math.round(y), scale, item.variant, alpha * alphaBias);
  }

  // ── Dynamic per-side scenery ────────────────────────────────────────────────

  #isStructural(entity) {
    const scenic = entity.components.ScenicData;
    return scenic.laneBand === LANE_BANDS.STRUCTURE
      || scenic.zone === SCENE_ZONES.STRUCTURE_LEFT
      || scenic.zone === SCENE_ZONES.STRUCTURE_RIGHT;
  }

  /**
   * Map a SCENE_ZONES.* literal to its LANE_BANDS.* equivalent so prefab
   * data (which tags zones, not bands) drives the same remap logic that
   * dynamically-spawned scenery (which tags bands) uses.
   */
  #bandForZone(zone) {
    if (zone === SCENE_ZONES.NATURE_LEFT || zone === SCENE_ZONES.NATURE_RIGHT) return LANE_BANDS.NATURE;
    if (zone === SCENE_ZONES.STRUCTURE_LEFT || zone === SCENE_ZONES.STRUCTURE_RIGHT) return LANE_BANDS.STRUCTURE;
    if (zone === SCENE_ZONES.SHOULDER_LEFT || zone === SCENE_ZONES.SHOULDER_RIGHT) return LANE_BANDS.SHOULDER;
    return LANE_BANDS.PLAY;
  }

  #sceneryEntity(entity, world, layer) {
    const pos = entity.components.Position;
    const sprite = entity.components.Sprite;
    const scenic = entity.components.ScenicData;
    const assetType = sprite.assetType ?? sprite.type;
    if (pos.distance < -5.5) { this.metrics?.countSceneryCulled(); return; }
    // v3.7: remap entity lane into the wider zones before projecting.
    const projLane = remapLaneForBand(pos.lane, scenic.laneBand);
    const p = this.#projectWithParallax(projLane, pos.distance, world, layer);
    // v3.7 per-band size bias. Each LANE_BAND has a target visual weight:
    //   SHOULDER  — buffer flowers, grass tufts: tiny, soft (≤30% lane)
    //   STRUCTURE — blocks, mushrooms, fences: full-bodied (100%)
    //   NATURE    — trees, hedges: imposing (140%) to read as background mass
    // Falls back to 1.0 for any band that hasn't been classified.
    const sizeBias = BAND_SIZE_BIAS[scenic.laneBand] ?? 1.0;

    // v4.0 — scale/flip variety for shoulder DECOR. Small flora on the
    // shoulder get a deterministic size tweak (0.82–1.10) and occasional
    // X-flip based on world position + lane, so the same flower asset
    // reads differently every few spawns without random() in the render
    // path. Structural items (STRUCTURE / NATURE bands) are NOT affected —
    // they need consistent proportions for the 3/4-view facing.
    let scatterScale = 1;
    let scatterFlip  = false;
    const densityCfg = world.config.visual?.density;
    if (densityCfg?.scatterFlowers && isLowFloraBand(scenic.laneBand)) {
      // Deterministic hash from lane + distance bucket so the variation
      // is stable frame-to-frame (no jitter) and seed-consistent.
      const hash = (Math.round(pos.lane * 37 + pos.distance * 13)) & 0xff;
      scatterScale = 0.82 + (hash % 29) / 100;   // 0.82–1.10
      scatterFlip  = (hash & 3) === 0;             // ~25% chance
    }

    const scale = p.scale * sprite.visualScale * sizeBias * scatterScale;
    const y = p.sy + sprite.yOffset * scale;

    const isStructural = this.#isStructural(entity);
    const nearFade = isStructural ? 1 : Math.max(0, Math.min(1, (pos.distance + 5.5) / 12));
    const farFade = Math.max(0.62, Math.min(1, p.scale * 3.1));
    let alpha = nearFade * farFade;
    // v3.8.6 Tier-2 — SHOULDER base bias raised 0.74 → 0.85 so corridor
    // reads denser. Close-fade floor raised 0 → 0.55 so props at distance
    // 0-16 stay readable instead of vanishing — the empty-bottom-corner
    // problem the user kept flagging traces to this fade-to-zero.
    if (isLowFloraBand(scenic.laneBand)) alpha *= 0.85;
    if (isLowFloraBand(scenic.laneBand) && pos.distance < 16) {
      alpha *= Math.max(0.55, pos.distance / 16);
    }
    // v3.7.1: NATURE alpha-fade so trees read as background mass even at
    // closer depths. Combined with the 0.80 size bias they stop dominating
    // the frame.
    const bandAlphaBias = BAND_ALPHA_BIAS[scenic.laneBand];
    if (bandAlphaBias != null) alpha *= bandAlphaBias;
    if (!isStructural && layer === LAYERS.FOREGROUND_DECOR && this.#intrudesOnGameplayCorridor(p.sx, scale, pos.distance)) {
      alpha = Math.min(alpha, (pos.distance / 20) * 0.22);
    }
    // v4.15 — reference-match: near trees still stacked into a foreground
    // wall; widen the recede window (10 → 16) and fade harder (0.82 → 0.68)
    // so the treeline drops back as background mass.
    if (pos.distance < 16 && (assetType === 'tree_round' || assetType === 'purple_flower_single' || assetType === 'mushroom_red_big')) alpha *= 0.68;
    // M141 — render-only near-start fade for NATURE-band trees. At the very
    // start of a run (world.distanceRun < 50m) the tree wall dominates the
    // frame. Fade in over the first 50m so trees reveal from nothing at 0m
    // and reach full alpha at 50m. Only NATURE band; does not touch any
    // placement or spawn data, so composition tests are unaffected.
    if (scenic.laneBand === LANE_BANDS.NATURE && world.distanceRun < 50) {
      alpha *= Math.max(0, world.distanceRun / 50);
    }
    if (alpha <= 0.03) { this.metrics?.countSceneryCulled(); return; }

    // v4.0 — scatterFlip applies to non-structural shoulder flora only.
    // For structural items the existing mirror logic (lane > 0) stays.
    const mirrored = isStructural ? pos.lane > 0 : scatterFlip;
    // v3.8.14 — pixel-snap projected position. Same rationale as the
    // composed-prefab path above.
    // v3.8.39 — Phase 5 role propagation. Sprite.role (populated by
    // createScenery for annotated prefabs) feeds the role badge in
    // the composition overlay.
    this._currentItemRole = sprite.role ?? null;
    this._currentItemLane = pos.lane;
    this._currentPrefabId = sprite.prefabId ?? null;
    const drewSolidShadow = this._solidShadow
      && this.#shouldDrawSolidShadow(assetType, scenic.laneBand, sprite)
      && this.#drawSolidShadow(Math.round(p.sx), Math.round(y), scale, alpha, assetType, pos.lane, pos.distance, sprite.role ?? null, sprite.prefabId != null);
    // v4.8 — contact shadow under near ground-flora, drawn BEFORE the
    // sprite so it sits underneath the planted flower/tuft. Gated on band
    // + near-size so only the readable foreground carpet pays the cost.
    if (!drewSolidShadow && this._floraShadow && isLowFloraBand(scenic.laneBand)) {
      this.#drawFloraShadow(Math.round(p.sx), Math.round(y), scale, alpha);
    }
    if (this.metrics) {
      const clusterKey = sprite.prefabId ? `${sprite.prefabId}#${Math.round(pos.distance / 20)}#${pos.lane > 0 ? 1 : -1}` : null;
      this.metrics.countScenery(sceneryCategory(assetType), clusterKey);
    }
    this.#drawSceneryType(assetType, Math.round(p.sx), Math.round(y), scale, sprite.variant, alpha, mirrored);
    this._currentItemRole = null;
    this._currentItemLane = null;
    this._currentPrefabId = null;
    // v3.8.40 — Phase 6 record screen position for parent-child line
    // drawing. Only when the composition overlay is enabled.
    if (this._supportPositions && sprite.prefabId && sprite.itemId) {
      const key = `${sprite.prefabId}/${sprite.itemId}`;
      this._supportPositions.set(key, {
        x: Math.round(p.sx), y: Math.round(y),
        parent: sprite.parentItemId ? `${sprite.prefabId}/${sprite.parentItemId}` : null,
      });
    }
    // v3.8.51 — accumulate prefab-group bbox for showCompositionGroups.
    if (this._groupBoxes && sprite.prefabId) {
      const sx = Math.round(p.sx);
      const sy = Math.round(y);
      // Approximate sprite footprint — use a fixed cell sized by scale.
      const halfW = Math.round(32 * scale);
      const halfH = Math.round(64 * scale);
      // Bucket distances coarsely (20m) so all items of one prefab
      // share a key. Per-item distance varies by ±2m within a cluster
      // due to dist offsets — finer granularity over-splits the bbox.
      const distBucket = Math.round(pos.distance / 20) * 20;
      const groupKey = `${sprite.prefabId}#${distBucket}#${pos.lane > 0 ? 'R' : 'L'}`;
      const existing = this._groupBoxes.get(groupKey);
      if (existing) {
        existing.minX = Math.min(existing.minX, sx - halfW);
        existing.maxX = Math.max(existing.maxX, sx + halfW);
        existing.minY = Math.min(existing.minY, sy - halfH);
        existing.maxY = Math.max(existing.maxY, sy + 8);
        existing.count += 1;
      } else {
        this._groupBoxes.set(groupKey, {
          prefabId: sprite.prefabId,
          side: pos.lane > 0 ? 1 : -1,
          distance: pos.distance,
          minX: sx - halfW, maxX: sx + halfW,
          minY: sy - halfH, maxY: sy + 8,
          count: 1,
        });
      }
    }
  }

  /**
   * v4.8 — cheap contact shadow for a single ground-flora sprite. Draws a
   * filled squashed ellipse at the sprite BASE (x, y already pixel-snapped
   * + bottom-anchored) so the flower/tuft reads as planted in the grass.
   *
   * Perf contract (do NOT regress the recent scenery optimisation):
   *  - NO ctx.save()/restore(), NO gradient, NO shadowBlur. fillStyle is set
   *    once per frame in render(); here we only touch globalAlpha and reset
   *    it to 1 — same direct-alpha discipline as #drawSceneryType.
   *  - One ellipse path + one fill per shadow.
   *  - Count is BOUNDED by FLORA_SHADOW_MIN_SCALE: only near/large flora
   *    (final draw scale above the gate) get a shadow; far carpet specks
   *    are skipped, so a handful of shadows draw per frame, not ~1k.
   */
  #drawFloraShadow(x, y, scale, alpha) {
    // Gate on the FINAL projected scale so only foreground flora qualify.
    // Final flora scale ≈ p.scale · visualScale · sizeBias · scatterScale,
    // which sits around 0.10–0.25 for near flora and decays toward 0 with
    // distance — 0.14 keeps the readable near slice (~d<20) and drops the
    // tiny background carpet.
    if (scale < FLORA_SHADOW_MIN_SCALE) return;
    const cfg = this._floraShadow;
    // Inherit the sprite's own fade so the shadow can't out-live a flower
    // that's fading in/out at the near or corridor edge.
    const a = (cfg.alpha ?? 0.18) * alpha;
    if (a <= 0.01) return;
    // Width from the sprite footprint; height a few px so it stays a thin
    // ground contact, not a blob. Both pixel-floored so it never vanishes.
    const radiusX = Math.max(2, (cfg.widthScale ?? 0.7) * FLORA_SHADOW_BASE_PX * scale);
    const radiusY = Math.max(1.5, radiusX * 0.32);
    const ctx = this.ctx;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  #solidShadowProfileFor(assetType) {
    if (!assetType) return null;
    return SOLID_SHADOW_PROFILE_BY_ASSET[assetType] ?? SOLID_SHADOW_PROFILE_DEFAULT;
  }

  #shouldDrawSolidShadow(assetType, laneBand, sprite) {
    if (NO_SOLID_SHADOW.has(assetType)) return false;
    if (sprite.yOffset < GROUND_STACK_Y_OFFSET_CUTOFF) return false;
    const role = sprite.role ?? null;
    if (role === 'topper' || role === 'child-decor' || role === 'foreground-accent' || role === 'background-accent') return false;
    if (laneBand === LANE_BANDS.STRUCTURE) return true;
    if (!SOLID_SHADOW_PROFILE_BY_ASSET[assetType]) return false;
    return laneBand === LANE_BANDS.NATURE
      || assetType === 'mushroom_red_big'
      || assetType === 'mushroom_blue_big'
      || assetType === 'bush_with_purple_flowers'
      || assetType === 'leaf_clump_round'
      || assetType === 'leaf_clump_small';
  }

  /**
   * v4.14 — reference-match: ground contact shadow for solid side structures
   * (blocks, mushrooms, fences, bushes) so they read as planted, not floating.
   * Wider/slightly stronger than the flora shadow because blocks are chunky.
   *
   * Perf contract (same as #drawFloraShadow — do NOT regress):
   *  - NO ctx.save()/restore(), NO gradient, NO shadowBlur. Only globalAlpha is
   *    touched and reset to 1 — same direct-alpha discipline as #drawSceneryType.
   *  - Unlike the flora path, fillStyle is set HERE every call: sprite draws
   *    between entities mutate ctx.fillStyle, so the once-per-frame set in
   *    render() can't be relied on for correctness.
   *  - One ellipse path + one fill per shadow.
   *  - Count is BOUNDED by SOLID_SHADOW_MIN_SCALE: only near/mid structures
   *    (final draw scale above the gate) get a shadow; far blocks are skipped.
   */
  #drawSolidShadow(x, y, scale, alpha, assetType, lane, distance, role = null, inCluster = false) {
    const profile = this.#solidShadowProfileFor(assetType);
    if (!profile || scale < (profile.minScale ?? SOLID_SHADOW_MIN_SCALE)) return false;
    const cfg = this._solidShadow;
    let a = (cfg.alpha ?? 0.22) * alpha * (profile.alphaMul ?? 1);
    if (a <= 0.01) return;
    let radiusX = Math.max(3, (cfg.widthScale ?? 0.62) * SOLID_SHADOW_BASE_PX * scale * (profile.widthMul ?? 1));
    if (inCluster && (role === 'base' || role === 'support' || role == null)) radiusX *= 1.07;
    let radiusY = Math.max(2, radiusX * (profile.heightMul ?? 0.30));
    const side = lane >= 0 ? 1 : -1;
    let shadowX = x + side * (profile.outwardBiasPx ?? 0) * scale;
    const shadowY = y + (profile.yOffsetPx ?? 0) * scale;
    const roadCenterX = this.projection.visualRoadCenterX(distance);
    const roadSafeHalfWidth = roadBaseHalfWidth(this.projection) * 0.82;
    const innerRoadEdgeX = roadCenterX + side * roadSafeHalfWidth;
    const innerShadowEdgeX = shadowX - side * radiusX;
    const overflow = side * (innerRoadEdgeX - innerShadowEdgeX);
    if (overflow > 0) {
      shadowX += side * Math.min(overflow, radiusX * 0.55);
      radiusX = Math.max(3, radiusX - overflow * 0.35);
      radiusY = Math.max(2, radiusX * (profile.heightMul ?? 0.30));
      a *= Math.max(0.72, 1 - overflow / Math.max(12, radiusX * 3.8));
      if (a <= 0.01) return false;
    }
    const ctx = this.ctx;
    ctx.fillStyle = 'rgb(26, 16, 8)';   // own fillStyle — robust to sprite draws between entities
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, radiusX, radiusY, 0, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    return true;
  }

  /**
   * v3.8.40 — Phase 6 second-pass parent-child line drawing. Called
   * from render() after every scenery item has been drawn so the lines
   * sit on top of the scene. Lines are drawn only when both endpoints
   * are visible (item.x/y present in the per-frame position map).
   */
  #drawSupportLines() {
    if (!this._supportPositions) return;
    const ctx = this.ctx;
    const filter = this._world?.config.debug?.compositionFilter ?? 'all';
    // Only show lines when filter is 'all' or 'support' — keeps other
    // filter views uncluttered.
    if (filter !== 'all' && filter !== 'support') return;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (const [, info] of this._supportPositions) {
      if (!info.parent) continue;
      const parent = this._supportPositions.get(info.parent);
      if (!parent) {
        // Parent missing visually — draw a red marker so QA notices.
        ctx.strokeStyle = 'rgba(255,80,80,0.85)';
        ctx.beginPath();
        ctx.moveTo(info.x - 6, info.y - 6);
        ctx.lineTo(info.x + 6, info.y + 6);
        ctx.moveTo(info.x + 6, info.y - 6);
        ctx.lineTo(info.x - 6, info.y + 6);
        ctx.stroke();
        continue;
      }
      // Cyan line from child centre to parent centre.
      ctx.strokeStyle = 'rgba(80, 220, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(info.x, info.y);
      ctx.lineTo(parent.x, parent.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * v3.8.51 — Phase 9 prefab-group bounding box pass. Draws a dashed
   * rectangle around each cluster + a label "{prefabId} · {band} ·
   * {side} · {count}" so QA can read which cluster owns which screen
   * region. Only fires when ?showCompositionGroups=1.
   */
  #drawGroupBoxes() {
    if (!this._groupBoxes || this._groupBoxes.size === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    for (const g of this._groupBoxes.values()) {
      const w = g.maxX - g.minX;
      const h = g.maxY - g.minY;
      const sideTag = g.side > 0 ? 'RIGHT_SHOULDER' : 'LEFT_SHOULDER';
      const band = bandForDistance(g.distance);
      const label = `${g.prefabId} · ${band} · ${sideTag} · n=${g.count}`;
      // Box.
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.85)';
      ctx.strokeRect(g.minX, g.minY, w, h);
      // Label backdrop + text — above the box top.
      ctx.setLineDash([]);
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(g.minX, g.minY - 14, tw + 8, 14);
      ctx.fillStyle = '#ffdc50';
      ctx.fillText(label, g.minX + 4, g.minY - 2);
      ctx.setLineDash([6, 4]);
    }
    ctx.restore();
  }

  #intrudesOnGameplayCorridor(x, scale, distance = 0) {
    const center = this.projection.visualRoadCenterX(distance);
    const safeHalfWidth = roadBaseHalfWidth(this.projection) * 0.72;
    return Math.abs(x - center) < safeHalfWidth + 80 * scale;
  }

  #projectWithParallax(lane, distance, world, layer) {
    // v3.8.7 — projectVisual so decor placement scales with visualLaneScale
    // alongside the road silhouette. Keeps the gap between road edge and
    // structure decor constant as the visual model is tuned.
    // v4.7 perf — mutate the fresh object projectVisual() returns instead of
    // spreading into a new one. This runs for every scenery sprite (~1k/frame),
    // so the spread was a per-sprite allocation feeding gen-0 GC churn.
    const projected = this.projection.projectVisual(lane, distance);
    const allowParallax = world.adaptiveQuality?.tier?.parallax !== false;
    const amount = allowParallax
      ? (layer === LAYERS.MIDGROUND_TERRAIN ? PARALLAX.midground : PARALLAX.foreground)
      : 0;
    projected.sx += parallaxOffset(this.projection, world.scrollOffset, amount, distance * 0.02);
    return projected;
  }

  // ── Foreground garden (side flora + ambient motes) ──────────────────────────

  #foregroundGarden(scrollOffset, world = null) {
    const ctx = this.ctx;
    const p = this.projection;
    const vpX = p.width / 2;
    const baseHalf = roadBaseHalfWidth(p);
    const y0 = p.groundY - 96;
    const y1 = p.height;

    ctx.save();
    // The foreground-side gradient is pre-built in GradientCache once per
    // viewport size — re-creating it here every frame allocated two
    // CanvasGradient objects and was visible in the GC trace.
    const sideGradient = this.gradients.foregroundSide;
    for (const side of [-1, 1]) {
      const edgeX = vpX + side * baseHalf;
      const outerX = side < 0 ? 0 : p.width;
      ctx.fillStyle = sideGradient;
      ctx.beginPath();
      ctx.moveTo(edgeX, y0);
      ctx.lineTo(outerX, y0 + 48);
      ctx.lineTo(outerX, y1);
      ctx.lineTo(edgeX + side * 34, y1);
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < 28; i += 1) {
        const seed = (i * 41 + Math.floor(scrollOffset * 0.2)) % 997;
        const rx = (seed * 37) % 240;
        const ry = (seed * 19) % 145;
        const x = side < 0 ? 32 + rx : p.width - 32 - rx;
        const sway = world?.config.gameFeel.ambientMotion ? Math.sin((scrollOffset + seed) * 0.03) * 2.2 : 0;
        const y = p.groundY - 18 - ry + sway;
        if ((side < 0 && x > edgeX - 14) || (side > 0 && x < edgeX + 14)) continue;
        ctx.fillStyle = seed % 6 === 0 ? '#8fdc5d' : '#74d648';
        ctx.fillRect(x, y, 3, 4);
        ctx.fillStyle = '#277b35';
        ctx.fillRect(x - 2, y + 4, 8, 3);
        if (world?.config.gameFeel.ambientMotion && seed % 4 === 0) {
          const bend = Math.sin((scrollOffset + seed) * 0.03) * 2.5;
          ctx.fillStyle = 'rgba(98,188,78,0.58)';
          ctx.fillRect(x + bend, y + 8, 2, 10);
        }
      }

      // Sprite-based flora anchors on near shoulder, just outside road edge
      const FLORA = [
        { xOff: 22, yOff: 24, sz: 74, key: 'grassTuftSmall' },
        { xOff: 62, yOff: 14, sz: 62, key: 'yellowFlowerSmall' },
        { xOff: 104, yOff: 20, sz: 78, key: 'grassTuftLarge' },
        { xOff: 152, yOff: 12, sz: 66, key: 'purpleFlowerCluster' },
        { xOff: 200, yOff: 18, sz: 70, key: 'grassTuftSmall' },
      ];
      for (const f of FLORA) {
        const fx = side < 0 ? edgeX - f.xOff : edgeX + f.xOff;
        if (fx > 0 && fx < p.width) this.sprites.draw(f.key, fx, p.groundY - f.yOff, f.sz);
      }
    }

    if (world?.config.gameFeel.ambientMotion) {
      for (const mote of AMBIENT_MOTES) {
        const drift = Math.sin(scrollOffset * 0.01 * mote.speed + mote.x * 9) * 24;
        ctx.fillStyle = mote.color;
        ctx.beginPath();
        ctx.arc(
          p.width * mote.x + drift,
          p.height * mote.y + Math.cos(scrollOffset * 0.012 + mote.y * 12) * 12,
          mote.size,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Asset-type dispatch (Strategy Map — sceneryDispatch.js) ───────────────

  #drawSceneryType(assetType, x, y, scale, variant, alpha = 1, mirrored = false) {
    const draw = getSceneryDraw(assetType);
    if (!draw) return;
    // v4.7 perf — DON'T ctx.save()/restore() per sprite. The state-stack
    // push/pop was the dominant scenery-render cost once the ground-scatter
    // carpet pushed the per-frame sprite count past ~1000 (measured source
    // of the run-time frame stutter: ~9ms / ~844 flora). globalAlpha is
    // isolated with a direct set + reset to the default; only the
    // non-side-aware mirror TRANSFORM still needs save/restore.
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    const side = mirrored ? 1 : -1;
    let usedSideVariant = false;
    let usedFallback = false;
    // v4.23 — M9: far tintable scenery (final scale below threshold) draws
    // through the tinting sprite proxy (cached tinted variant). Everything else
    // — near scenery, road, player, orchids, obstacles — stays untinted.
    const deps = (this._tintCfg?.enabled
      && scale < this._tintCfg.thresholdScale
      && FAR_TINT_ASSET_TYPES.has(assetType))
      ? this._tintDeps : this._drawDeps;
    // v3.8.16 — side-aware dispatch ONLY for types that registered as
    // such (see SIDE_AWARE_TYPES in sceneryDispatch.js).
    if (isSideAwareSceneryType(assetType)) {
      usedSideVariant = !!draw(deps, x, y, scale, variant, side);
      if (!usedSideVariant) {
        // v3.8.16: NO mirror fallback for side-aware types. A canvas
        // flip would reverse the sun direction on the right side and
        // mis-orient the road-facing face. Instead draw the generic
        // billboard WITHOUT flip so the misorientation is visible to
        // QA, and warn once per asset type so the missing pair is loud.
        this.#warnMissingSideVariant(assetType, side);
        draw(deps, x, y, scale, variant, undefined);
        usedFallback = true;
      }
    } else if (mirrored) {
      // Canvas flip needs an isolated transform → save/restore here only.
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x, 0);
      draw(deps, x, y, scale, variant);
      ctx.restore();
    } else {
      draw(deps, x, y, scale, variant);
    }
    ctx.globalAlpha = 1;
    // v3.8.16 debug labels — toggle via ?debugSides=1. Draws a small
    // overlay near each side-aware prop showing type, side, variant
    // used, and X position relative to road center.
    if (this._showSideLabels && isSideAwareSceneryType(assetType)) {
      this.#drawSideLabel(assetType, x, y, scale, side, usedSideVariant, usedFallback);
    }
    // v3.8.38 — Phase 3 composition overlay. Independent of ?debugSides.
    if (this._world?.config.debug?.showComposition) {
      this.#drawCompositionLabel(assetType, x, y, scale, side, usedSideVariant);
    }
  }

  /**
   * v3.8.50 — Phase 8 canonical semantic badge. Five short lines per
   * scenery entity so QA can see the FULL role/zone/side/support/
   * collision contract at a glance. Colour matches spec scheme:
   * red=obstacle, yellow=collect, green=powerup, blue=side-struct,
   * gray=decor, purple=support.
   *
   * Filter via ?compositionFilter=obstacles|pickups|decor|invalid to
   * scope the overlay to one bucket.
   */
  #drawCompositionLabel(assetType, x, y, scale, side, usedSideVariant) {
    const canonical = getCanonicalSemantic(assetType);
    const filter = this._world?.config.debug?.compositionFilter ?? 'all';
    const runtimeZone = runtimeZoneForLane(this._currentItemLane ?? (side === -1 ? -2.0 : 2.0));
    const role = canonical?.role ?? 'UNKNOWN';
    const allowedZones = canonical?.allowedZones ?? [];
    const zoneOk = !canonical || allowedZones.length === 0 || allowedZones.includes(runtimeZone);
    const invalid = !canonical || !zoneOk;
    if (filter === 'invalid' && !invalid) return;
    if (filter !== 'invalid' && !compositionFilterAllows(role, filter)) return;
    const color = invalid ? COMPOSITION_COLORS.unknown : (COMPOSITION_COLORS[role] ?? '#fff');
    const ctx = this.ctx;
    const prefabRole = this._currentItemRole;
    const prefabBadge = prefabRole ? `[${ROLE_BADGE_LETTER[prefabRole] ?? prefabRole[0].toUpperCase()}]` : '';
    const sideFacing = canonical?.sideFacing ?? '?';
    const collision = canonical?.gameplayCollision ?? '?';
    const support = canonical?.supportRules
      ? (canonical.supportRules.canStandAlone
          ? 'standalone'
          : canonical.supportRules.requiresPlatform
            ? 'needs-platform'
            : 'needs-ground')
      : '?';
    const lines = [
      `${prefabBadge} ${assetType}`.trim(),
      `${role}${invalid ? ' · INVALID' : ''}`,
      `zone: ${runtimeZone}${invalid && canonical ? ` (allowed: ${allowedZones.join('/')})` : ''}`,
      `side: ${sideFacing}${canonical?.sideFacing && canonical.sideFacing !== 'neutral' ? (usedSideVariant ? ' · var' : ' · fb') : ''}`,
      `coll: ${collision} · sup: ${support}`,
    ];
    // v3.8.51 — extra line when ?showCompositionGroups=1 is on: the
    // prefab cluster owning this entity. Skipped when prefabId is null
    // (static MIDGROUND_SCENERY / FOREGROUND_FRAME items).
    if (this._world?.config.debug?.showCompositionGroups && this._currentPrefabId) {
      lines.push(`group: ${this._currentPrefabId}`);
    }
    ctx.save();
    ctx.font = '10px monospace';
    let maxW = 0;
    for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
    const lineH = 11;
    const padX = 4;
    const padY = 2;
    const boxW = maxW + padX * 2;
    const boxH = lineH * lines.length + padY * 2;
    const top = Math.round(y - 152 * scale) - boxH;
    const left = Math.round(x - boxW / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(left, top, boxW, boxH);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], Math.round(x), top + padY + i * lineH);
    }
    ctx.restore();
  }

  /** v3.8.16 — warn-once on missing side-variant. */
  #warnMissingSideVariant(assetType, side) {
    if (!this._missingVariantWarned) this._missingVariantWarned = new Set();
    const key = `${assetType}|${side}`;
    if (this._missingVariantWarned.has(key)) return;
    this._missingVariantWarned.add(key);
    const sideName = side === -1 ? 'left' : 'right';
    // eslint-disable-next-line no-console
    console.warn(`[scenery] side-aware "${assetType}" missing ${sideName} variant; drew billboard fallback (lighting may misalign)`);
  }

  /**
   * v3.8.17 side-matrix overlay — isolated A/B test grid for side-aware
   * sprite variants. Enabled via ?debugSideMatrix=1.
   *
   * Layout: for each side-aware type, four cells in a row:
   *   [LEFT-placed, _Left.png]  [LEFT-placed, _Right.png]
   *   [RIGHT-placed, _Left.png] [RIGHT-placed, _Right.png]
   *
   * Sprite content is independent of placement X — the position only
   * affects WHERE the cell is drawn on screen. QA reads each pair and
   * picks the variant whose lighting + 3/4-view face the road centre.
   * The conclusion is then either "normal" or "swapped" — flip
   * ?sideMapping= accordingly.
   */
  #drawSideMatrix(world) {
    const ctx = this.ctx;
    const p = this.projection;
    const types = [
      { key: 'grass_dirt_block', baseKey: 'grassDirtBlock',  size: 185 },
      { key: 'floating_platform', baseKey: 'platformFloating', size: 290 },
    ];
    // Semi-transparent backdrop so labels read against any sky.
    ctx.save();
    ctx.fillStyle = 'rgba(10,18,32,0.55)';
    ctx.fillRect(0, 0, p.width, p.height);
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIDE-AWARE VARIANT MATRIX  —  pick the variant whose road-facing face is on the road side', p.width / 2, 36);
    ctx.font = '12px monospace';
    ctx.fillText('Column 1: drawn at LEFT placement   |   Column 2: drawn at RIGHT placement', p.width / 2, 58);
    ctx.fillText('Row "_L" = sprites named _left.png   |   Row "_R" = sprites named _right.png', p.width / 2, 76);
    // Grid: 2 columns × 2 rows per type. Columns span screen halves.
    const colXLeft  = p.width * 0.28;
    const colXRight = p.width * 0.72;
    const rowHGap = 220;
    let rowY = 200;
    for (const t of types) {
      // Type header
      ctx.fillStyle = '#ffd54a';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`type: ${t.key}`, 40, rowY - 80);
      // Cells
      const cells = [
        { x: colXLeft,  y: rowY,           variant: 'Left',  placement: 'LEFT'  },
        { x: colXLeft,  y: rowY + rowHGap, variant: 'Right', placement: 'LEFT'  },
        { x: colXRight, y: rowY,           variant: 'Left',  placement: 'RIGHT' },
        { x: colXRight, y: rowY + rowHGap, variant: 'Right', placement: 'RIGHT' },
      ];
      for (const c of cells) {
        const key = `${t.baseKey}${c.variant}`;
        // Sprite draw
        const drew = this.sprites.draw(key, c.x, c.y, t.size, 'bottom');
        // Label
        ctx.fillStyle = drew ? '#00ff66' : '#ff3030';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        const text = drew ? `${c.placement} placement · _${c.variant.toLowerCase()}` : `${key} (MISSING)`;
        ctx.fillRect(c.x - 110, c.y + 10, 220, 16);
        ctx.fillStyle = drew ? '#0a1c1f' : '#440000';
        ctx.fillStyle = drew ? '#00ff66' : '#ff3030';
        ctx.fillText(text, c.x, c.y + 22);
      }
      // Center vertical line per row pair (visual guide for "which side")
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(p.width / 2, rowY - 100);
      ctx.lineTo(p.width / 2, rowY + rowHGap + 30);
      ctx.stroke();
      rowY += rowHGap * 2 + 60;
    }
    // Footer with current mapping mode
    ctx.fillStyle = '#ffe8a8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    const mapMode = world.config.debug?.showSides ? '(also: ?debugSides=1 active)' : '';
    ctx.fillText(`Toggle: ?sideMapping=normal | ?sideMapping=swapped  ${mapMode}`, p.width / 2, p.height - 24);
    ctx.restore();
  }

  /** v3.8.16 — per-prop debug label. */
  #drawSideLabel(assetType, x, y, scale, side, usedSideVariant, usedFallback) {
    const ctx = this.ctx;
    const w = this.projection.width;
    const roadCenterX = w / 2;
    const dx = x - roadCenterX;
    const status = usedSideVariant ? 'OK' : (usedFallback ? 'FALLBACK' : '?');
    const color = usedSideVariant ? '#00ff66' : '#ff3030';
    const labelY = Math.round(y - 120 * scale);
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const text = `${assetType} | side=${side === -1 ? 'L' : 'R'} | dx=${Math.round(dx)} | ${status}`;
    const tw = ctx.measureText(text).width;
    ctx.fillRect(Math.round(x - tw / 2 - 3), labelY - 11, tw + 6, 14);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), labelY);
    ctx.restore();
  }
}

// A prefab item whose zLayer marks it as solid structure (base / stack / topper).
// Below this, entities are ground flora / scatter that must keep pure depth order.
const STRUCTURE_Z = 10;

function byDistanceComponent(a, b) {
  // v3.8.40 — Phase 6 z-layer tie-break. Far → near is the primary ordering;
  // entities at the same depth tier sort by Sprite.zLayer ascending so
  // background-accent draws before base, base before topper, topper before
  // foreground-accent.
  const sa = a.components.Sprite;
  const sb = b.components.Sprite;
  const zA = sa?.zLayer ?? 0;
  const zB = sb?.zLayer ?? 0;
  const distDiff = b.components.Position.distance - a.components.Position.distance;
  // M23A — keep ONE prefab instance's solid stack in its authored paint order.
  // Toppers are authored at a small dist offset from their base; under pure
  // distance sort that offset (> 0.05) let a topper fall behind/over the wrong
  // base. Within a single cluster (same prefabId) BOTH-structural items
  // therefore sort by zLayer, not distance. Cross-cluster pairs and ground
  // flora keep the depth-first ordering unchanged — minimal blast radius.
  if (sa && sb && sa.prefabId != null && sa.prefabId === sb.prefabId
      && zA >= STRUCTURE_Z && zB >= STRUCTURE_Z) {
    return zA !== zB ? zA - zB : distDiff;
  }
  if (Math.abs(distDiff) > 0.05) return distDiff;
  return zA - zB;
}
