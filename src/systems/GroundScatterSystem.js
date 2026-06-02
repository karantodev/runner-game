import { createScenery } from '../ecs/factories.js';
import { LANE_BANDS, zoneForSide } from '../config/sceneSchema.js';

// v4.6 — reference-match: the second decoration channel. The structural
// DecorationSystem can only land ONE prefab cluster per side per spawn
// slot, so the green shoulders read as mostly-empty between clusters. The
// art reference instead carpets those shoulders with dense small flora.
// This palette is intentionally small + soft: violets, a yellow flower,
// and two grass tufts — the same SHOULDER-band assets the renderer
// already size-biases down to buffer-flora weight.
const SCATTER_FLORA = [
  { assetType: 'purple_flower_single', type: 'flowerbush',  scale: [0.40, 0.58] },
  { assetType: 'yellow_flower_small',  type: 'smallFlower', scale: [0.30, 0.42] },
  { assetType: 'grass_tuft_small',     type: 'grassTuft',   scale: [0.40, 0.52] },
  { assetType: 'grass_tuft',           type: 'grassTuft',   scale: [0.42, 0.56] },
  // v4.9 — low leaf clumps give the meadow carpet visual mass without
  // increasing entity count or competing with structural bushes.
  { assetType: 'leaf_clump_round',     type: 'leafClusterCompact', scale: [0.34, 0.48] },
];

// v4.6 — reference-match: scatter sits at zLayer 4 so when a scatter item
// shares a depth tier with a structural cluster's loose flowers (zLayer 5)
// the renderer's ascending-zLayer tie-break draws the carpet BEHIND them.
// The carpet is the bed; structural flora stay the focal layer on top.
const SCATTER_Z_LAYER = 4;

// v4.10 — patches keep flora locally dense without carpeting every metre.
// The floor prevents decorMultiplier from collapsing the breathing interval
// and bounds the live-entity count at high density.
const MIN_SCATTER_PATCH_STEP = 4;

/**
 * Dense ground-scatter decoration layer. Runs as an INDEPENDENT spawn
 * channel parallel to DecorationSystem: same entity lifecycle (spawn at
 * the horizon, reaped by CleanupSystem once behind the player), same
 * per-side distance-cursor cadence — but in small clustered patches so the
 * shoulders read as planted garden beds rather than an even lawn.
 */
export class GroundScatterSystem {
  /**
   * @param {object} config
   * @param {import('../world/Projection.js').Projection} projection
   * @param {import('../utils/rng.js').Rng} rng
   */
  constructor(config, projection, rng) {
    this.config = config;
    this.projection = projection;
    this.rng = rng;
    this.reset();
  }

  reset() {
    // Stagger the two sides so left/right bands don't spawn in lockstep —
    // a synchronised carpet reads as rows; an offset one reads organic.
    this.nextLeft = 0;
    this.nextRight = 2.4;
  }

  /**
   * Fill the whole visible shoulder range at reset so the menu / pause
   * view already shows a stocked carpet (entities sit still while
   * state !== 'playing'; this is purely a visual fill, mirroring
   * DecorationSystem.prepopulate).
   */
  prepopulate(world) {
    if (!this.#enabled(world)) return;
    const start = this.config.spawn.decorStartDistance;
    // v4.6 — reference-match: carpet only the VISIBLE near/mid range. Past
    // scatterMaxDistance the flora are sub-pixel specks that cost entities
    // for no visual gain and would muddy the clean castle approach, so the
    // freed budget is spent on denser bands up close instead.
    const maxDist = this.#farLimit() + 12;
    // Independent cursor per side, each seeded with its own jitter so the
    // two carpets interleave instead of mirroring.
    for (let distance = start; distance < maxDist; distance += this.#patchStep(world)) {
      this.#spawnPatch(world, -1, distance);
    }
    for (let distance = start + 2.4; distance < maxDist; distance += this.#patchStep(world)) {
      this.#spawnPatch(world, 1, distance);
    }
  }

  update(world, delta) {
    // No-op unless actively playing OR the toggle is off — keeps the menu
    // carpet frozen and lets the whole channel be disabled from config.
    if (world.state !== 'playing' || !this.#enabled(world)) return;
    this.nextLeft -= world.speed * delta;
    this.nextRight -= world.speed * delta;

    if (this.nextLeft <= 0) {
      this.#spawnPatch(world, -1, this.#farLimit() + this.rng.range(-1, 1));
      this.nextLeft = this.#patchStep(world);
    }
    if (this.nextRight <= 0) {
      this.#spawnPatch(world, 1, this.#farLimit() + this.rng.range(-1, 1));
      this.nextRight = this.#patchStep(world);
    }
  }

  /** Whether the ground-scatter channel is active for this world. */
  #enabled(world) {
    return world?.config?.visual?.density?.groundScatter !== false;
  }

  /**
   * Far horizon for the carpet. Capped at scatterMaxDistance so the bed
   * fills only the range where the flora actually read, keeping the live
   * entity count low and the castle approach clean. New bands fade in at
   * this limit (small scale ⇒ soft far-fade, no hard pop).
   */
  #farLimit() {
    return this.config.spawn.scatterMaxDistance ?? this.projection.maxDistance;
  }

  /**
   * Distance between garden patches. Base spacing is tightened by
   * decorMultiplier and jittered so left/right beds do not line up.
   * The hard floor keeps the live-entity count bounded.
   */
  #patchStep(world) {
    const base = this.config.spawn.scatterPatchSpacing ?? this.config.spawn.scatterSpacing * 2.6;
    const multiplier = world?.config?.visual?.density?.decorMultiplier ?? 1;
    const jitter = this.rng.range(-0.7, 0.7);
    const step = (base + jitter) / Math.max(0.5, multiplier);
    return Math.max(MIN_SCATTER_PATCH_STEP, step);
  }

  /**
   * Spawn a short run of close bands, then leave a larger interval before
   * the next run. Each band picks its own lateral centre, producing irregular
   * planted beds while preserving the collision-safe shoulder lane range.
   */
  #spawnPatch(world, side, distance) {
    const bands = this.config.spawn.scatterPatchBands ?? 2;
    const bandSpacing = this.config.spawn.scatterPatchBandSpacing ?? 1.35;
    for (let i = 0; i < bands; i += 1) {
      this.#spawnBand(world, side, distance + i * bandSpacing);
    }
  }

  /**
   * Lay one compact flora cluster inside the shoulder lane range. Each item
   * gets independent lateral + distance jitter and a random variant +
   * per-asset scale so repeated assets never read as a grid.
   */
  #spawnBand(world, side, distance) {
    const count = this.config.spawn.scatterPerBand;
    const [laneMin, laneMax] = this.config.spawn.scatterLaneRange;
    const laneRadius = this.config.spawn.scatterClusterLaneRadius ?? 0.16;
    const laneCenter = this.rng.range(laneMin + laneRadius, laneMax - laneRadius);
    // v4.7 — reference-match: split each band between the SHOULDER strip
    // (road edge) and the wider MEADOW remap (the green field between
    // clusters) so the carpet covers the whole flank, not just a border
    // line. Both share one validation zone; only the render remap differs.
    const meadowFrac = this.config.spawn.scatterMeadowFraction ?? 0;
    const zone = zoneForSide(side, LANE_BANDS.SHOULDER);
    for (let i = 0; i < count; i += 1) {
      const flora = this.rng.choice(SCATTER_FLORA);
      const band = this.rng.chance(meadowFrac) ? LANE_BANDS.MEADOW : LANE_BANDS.SHOULDER;
      // Cluster around one local centre rather than spreading each band
      // uniformly from road edge to meadow edge.
      const lane = Math.min(laneMax, Math.max(laneMin, laneCenter + this.rng.range(-laneRadius, laneRadius)));
      createScenery(world.registry, {
        type: flora.type,
        assetType: flora.assetType,
        laneBand: band,
        zone,
        lane: side * lane,
        distance: distance + this.rng.range(-0.9, 0.9),
        variant: this.rng.integer(0, 3),
        scale: this.rng.range(flora.scale[0], flora.scale[1]),
        zLayer: SCATTER_Z_LAYER,
      });
    }
  }
}
