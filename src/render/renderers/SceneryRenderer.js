import { AMBIENT_MOTES, LAYERS, PARALLAX } from '../constants.js';
import { parallaxOffset, roadBaseHalfWidth } from '../helpers.js';
import { LANE_BANDS, SCENE_ZONES } from '../../config/sceneSchema.js';

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
  [LANE_BANDS.STRUCTURE]: 1.00,   // blocks / mushrooms / fences
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
const TWO_PI = Math.PI * 2;

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

/**
 * All non-gameplay world geometry: the static midground/foreground prefab
 * scenery, the per-tick spawned `world.scenery` items (split into a
 * structural pass and an organic pass so walls always sit behind shrubs),
 * the per-side foreground garden gradient + ambient motes, and the
 * dispatcher that paints every individual scenery asset type.
 */
export class SceneryRenderer {
  constructor({ ctx, projection, assets, sprites, paint, gradients, voxelBlocks }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.paint = paint;
    this.gradients = gradients;
    this.voxelBlocks = voxelBlocks;
    this._drawDeps = { sprites, paint, voxelBlocks };
    // v4.12 — three-way draw order (allocation-free scratch arrays). Low flora
    // (SHOULDER/MEADOW) is the GROUND carpet and must sit behind solid props,
    // so the order is: NATURE backdrop → flora carpet → STRUCTURE props.
    // Within each band byDistanceComponent sorts far→near (+ zLayer tiebreak).
    this._nature = [];
    this._flora = [];
    this._structural = [];
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
    nature.length = 0;
    flora.length = 0;
    structural.length = 0;
    for (const e of world.registry.query('ScenicData', 'Position', 'Sprite')) {
      const band = e.components.ScenicData.laneBand;
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
    // Pass (c): STRUCTURE blocks / mushrooms / fences — solid props on the bed.
    structural.sort(byDistanceComponent);
    for (const e of structural) this.#sceneryEntity(e, world, LAYERS.FOREGROUND_DECOR);

    this.#foregroundFrame(world);
    // v3.8.40 — Phase 6 parent-child support lines pass.
    this.#drawSupportLines();
    // v3.8.51 — Phase 9 prefab-group bounding box pass.
    this.#drawGroupBoxes();
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
    if (pos.distance < -5.5) return;
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
    if (pos.distance < 16 && (sprite.assetType === 'tree_round' || sprite.assetType === 'purple_flower_single' || sprite.assetType === 'mushroom_red_big')) alpha *= 0.68;
    if (alpha <= 0.03) return;

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
    // v4.14 — reference-match: ground contact shadow for solid structures,
    // drawn BEFORE the sprite so it sits underneath the planted block/mushroom.
    // alpha is the entity's already-faded alpha → the shadow fades with the
    // object (same discipline as the flora path). Floating items are excluded.
    if (this._solidShadow && isStructural
        && !NO_SOLID_SHADOW.has(sprite.assetType ?? sprite.type)) {
      this.#drawSolidShadow(Math.round(p.sx), Math.round(y), scale, alpha);
    }
    // v4.8 — contact shadow under near ground-flora, drawn BEFORE the
    // sprite so it sits underneath the planted flower/tuft. Gated on band
    // + near-size so only the readable foreground carpet pays the cost.
    if (this._floraShadow && isLowFloraBand(scenic.laneBand)) {
      this.#drawFloraShadow(Math.round(p.sx), Math.round(y), scale, alpha);
    }
    this.#drawSceneryType(sprite.assetType ?? sprite.type, Math.round(p.sx), Math.round(y), scale, sprite.variant, alpha, mirrored);
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
  #drawSolidShadow(x, y, scale, alpha) {
    if (scale < SOLID_SHADOW_MIN_SCALE) return;
    const cfg = this._solidShadow;
    const a = (cfg.alpha ?? 0.22) * alpha;
    if (a <= 0.01) return;
    const radiusX = Math.max(3, (cfg.widthScale ?? 0.62) * SOLID_SHADOW_BASE_PX * scale);
    const radiusY = Math.max(2, radiusX * 0.30);
    const ctx = this.ctx;
    ctx.fillStyle = 'rgb(26, 16, 8)';   // own fillStyle — robust to sprite draws between entities
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;
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
    // v3.8.16 — side-aware dispatch ONLY for types that registered as
    // such (see SIDE_AWARE_TYPES in sceneryDispatch.js).
    if (isSideAwareSceneryType(assetType)) {
      usedSideVariant = !!draw(this._drawDeps, x, y, scale, variant, side);
      if (!usedSideVariant) {
        // v3.8.16: NO mirror fallback for side-aware types. A canvas
        // flip would reverse the sun direction on the right side and
        // mis-orient the road-facing face. Instead draw the generic
        // billboard WITHOUT flip so the misorientation is visible to
        // QA, and warn once per asset type so the missing pair is loud.
        this.#warnMissingSideVariant(assetType, side);
        draw(this._drawDeps, x, y, scale, variant, undefined);
        usedFallback = true;
      }
    } else if (mirrored) {
      // Canvas flip needs an isolated transform → save/restore here only.
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x, 0);
      draw(this._drawDeps, x, y, scale, variant);
      ctx.restore();
    } else {
      draw(this._drawDeps, x, y, scale, variant);
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

function byDistanceComponent(a, b) {
  // v3.8.40 — Phase 6 z-layer tie-break. Far → near remains the primary
  // ordering; entities at the same depth tier sort by Sprite.zLayer
  // ascending so background-accent draws before base, base before
  // topper, topper before foreground-accent. Matches the role enum's
  // implicit depth ordering.
  const distDiff = b.components.Position.distance - a.components.Position.distance;
  if (Math.abs(distDiff) > 0.05) return distDiff;
  const zA = a.components.Sprite?.zLayer ?? 0;
  const zB = b.components.Sprite?.zLayer ?? 0;
  return zA - zB;
}
