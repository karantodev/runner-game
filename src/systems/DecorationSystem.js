import { createScenery } from '../ecs/factories.js';
import { LANE_BANDS, SCENE_ZONES, zoneForSide } from '../config/sceneSchema.js';
import { HERO_LAYOUT, SIDE_DECORATION_PREFABS, PREFAB_INTENT_BY_ID, THEMES } from '../config/sceneSchema.data.js';

const HERO_GAP_FILL_PREFABS = Object.freeze([
  'wall-continuous-3block',
  'elevated-platform-wall',
  'garden-chain-platform-fence',
  'fence-flower-row',
]);

// v4.22 — M8 anti-repetition. Heavy silhouettes that must be capped per rolling
// pick window so the procedural side world never reads as a wall. intent → cap.
const HEAVY_INTENT_CAP_KEY = Object.freeze({
  'vertical-landmark': 'maxTall',
  'pipe-landmark':     'maxPipe',
  'cluster':           'maxQblock',
});
const PICK_HISTORY_MAX = 32;

function assetTypeToSceneryType(assetType) {
  const typeMap = {
    grass_dirt_block: 'terrainBlock',
    grass_dirt_step: 'terrainBlock',
    grass_dirt_wall: 'grassWall',
    purple_flower_single: 'flowerbush',
    yellow_flower_small: 'smallFlower',
    grass_tuft: 'grassTuft',
    sprout_soil: 'sprout',
    mushroom_red_big: 'mushroom',
    mushroom_blue_big: 'mushroomBlue',
    dry_grass_obstacle: 'dryGrass',
    green_pipe: 'planter_pot',  // v3: pipe retired, sceneryDispatch redirects.
    planter_pot: 'planter_pot',
    leaf_clump_small: 'leafClusterLow',
    leaf_clump_round: 'leafClusterCompact',
    purple_brick_single: 'blockStack',
    floating_platform: 'platform',
    fence_wood_short: 'fence',
    tree_round: 'tree',
    bush_large: 'bushLarge',
    bush_large_with_purple_flowers: 'bushLargeFlower',
    bush_with_purple_flowers: 'flowerbush',
    hanging_platform_vines: 'hangingPlatform',
    grass_tuft_small: 'grassTuft',
    grass_tuft_large: 'grassTuftLarge',
  };
  return typeMap[assetType] ?? assetType;
}

export class DecorationSystem {
  /**
   * @param {object} config
   * @param {import('../world/Projection.js').Projection} projection
   * @param {import('../utils/rng.js').Rng} rng
   */
  constructor(config, projection, rng, placement = null) {
    this.config = config;
    this.projection = projection;
    this.rng = rng;
    // v3.8.37 — Phase 2 placement enforcement. Optional so legacy
    // unit-test paths constructing DecorationSystem standalone don't break.
    this.placement = placement;
    this.weightedChunks = this.#buildWeightedChunks();
    // v3.8.21 — index prefabs by id for HERO_LAYOUT lookups.
    this.prefabsById = new Map(SIDE_DECORATION_PREFABS.map((p) => [p.id, p]));
    this.heroGapFillPrefabs = HERO_GAP_FILL_PREFABS
      .map((id) => this.prefabsById.get(id))
      .filter(Boolean);
    this.reset();
  }

  reset() {
    this.nextLeft = 0;
    this.nextRight = 3.6;
    // v4.22 — M8 anti-repetition. Rolling pick history (newest last) drives
    // per-side id/intent cooldowns, a cross-side intent guard and per-window
    // caps on heavy silhouettes. Pick-count based — runtime decor all spawns at
    // ~maxDistance, so spawn-distance can't separate beats but pick order can.
    // decorRng only; never touches gameplay world.rng.
    this.history = [];
    // Debug-only selection stats (rerolls / least-bad fallbacks) for the
    // seed-sweep report; read off world.decorationSystem._pickStats.
    this._pickStats = { picks: 0, rerolls: 0, fallbacks: 0 };
    // B2 — garland cadence cursor (world units until the next garland spawns).
    // Seeded RNG drives the initial offset so garlands appear at varied depths
    // each run without touching the gameplay world.rng.
    this.nextGarland = 0;
  }

  /**
   * v3.8.21 — two-phase prepopulate.
   *
   * PHASE 1: HERO_LAYOUT — place specific prefabs at specific distances
   *          + sides. Deterministic per-run, no RNG noise. The opening
   *          120-150 m always looks like a curated scene.
   *
   * PHASE 2: Procedural variation — weighted random chunks fill the
   *          stretch FROM after the last hero entry TO the horizon, so
   *          deeper visible distances still have variety.
   *
   * Each side runs its own continuation cursor so hero placements on
   * different distances per side don't collide.
   */
  prepopulate(world) {
    const start = this.config.spawn.decorStartDistance;
    // v4.0 — apply decorMultiplier at prepopulate time so the initial
    // visible corridor matches the runtime density.
    const decorMult = world?.config?.visual?.density?.decorMultiplier ?? 1;
    const spacing = Math.max(8, this.config.spawn.sideDecorSpacing / Math.max(0.5, decorMult));
    const maxDist = this.projection.maxDistance + 24;

    // Phase 1 — hero entries, jitterless. Track the furthest distance
    // we placed per side so the procedural loop continues from there.
    let lastHeroDistLeft = start - spacing;
    let lastHeroDistRight = start - spacing;
    const heroEntriesBySide = { '-1': [], '1': [] };
    for (const entry of HERO_LAYOUT) {
      const prefab = this.prefabsById.get(entry.prefabId);
      if (!prefab) continue;
      // v3.8.42 — Phase 7b per-entry scale multiplier. HERO_LAYOUT zones
      // declare a multiplier (1.0 near, 0.75 mid, 0.40 far) so the
      // perspective reads as actual depth instead of "everything is the
      // same size at different positions".
      this.#spawnChunk(world, entry.side, entry.distance, prefab, entry.scaleMultiplier ?? 1);
      heroEntriesBySide[String(entry.side)].push(entry);
      if (entry.side < 0) lastHeroDistLeft  = Math.max(lastHeroDistLeft,  entry.distance);
      else                 lastHeroDistRight = Math.max(lastHeroDistRight, entry.distance);
    }
    this.#fillHeroGaps(world, -1, heroEntriesBySide['-1']);
    this.#fillHeroGaps(world, 1, heroEntriesBySide['1']);

    // Phase 2 — procedural variation past the hero stretch. Step from
    // the last hero distance + spacing so we don't overlap the hand-
    // placed clusters.
    // v3.8.42 — Phase 7b clean castle approach. Hard-floor procStart at
    // 200m so the 150-200m band stays empty (HERO_LAYOUT itself ends at
    // 150m). Without this, procedural fill would creep into the castle
    // approach with even our soft pool, breaking the road→castle axis.
    const PROC_FLOOR = 200;
    const procStartLeft  = Math.max(PROC_FLOOR, lastHeroDistLeft  + spacing);
    const procStartRight = Math.max(PROC_FLOOR, lastHeroDistRight + spacing);
    for (let distance = procStartLeft; distance < maxDist; distance += spacing) {
      this.#spawnSideChunk(world, -1, distance + this.rng.range(-0.7, 0.7));
    }
    for (let distance = procStartRight; distance < maxDist; distance += spacing) {
      this.#spawnSideChunk(world, 1, distance + 3.4 + this.rng.range(-0.7, 0.7));
    }

    // B2 — prepopulate garlands across the visible mid-field horizon.
    // Only fires when the garland feature is enabled; uses the same decorRng
    // so the pattern is deterministic for any given seed.
    if (this.#garlandEnabled(world)) {
      const cfg = world?.config?.visual?.garland ?? {};
      const cadenceLo = cfg.cadenceLo ?? 80;
      const cadenceHi = cfg.cadenceHi ?? 130;
      // First garland starts at mid-field depth minimum (35m) so it never
      // overwhelms the near foreground at run start. rng offset stays within
      // the cadence window for variety.
      const garlandStartMin = 35;
      let garlandDist = Math.max(garlandStartMin, start + this.rng.range(cadenceLo * 0.35, cadenceHi * 0.55));
      while (garlandDist < maxDist) {
        this.#spawnGarland(world, garlandDist);
        garlandDist += this.rng.range(cadenceLo, cadenceHi);
      }
      // Seed the runtime cursor so the first post-prepopulate garland continues
      // the rhythm from where the last prepopulated one left off.
      this.nextGarland = this.rng.range(cadenceLo * 0.5, cadenceHi * 0.8);
    }
  }

  /**
   * Fill large authored-layout gaps with a small deterministic rotation of
   * transition prefabs. This keeps the opening corridor dense while the
   * anchor clusters remain intentionally asymmetric and art-directed.
   */
  #fillHeroGaps(world, side, entries) {
    if (this.heroGapFillPrefabs.length === 0 || entries.length < 2) return;
    const maxGap = this.config.spawn.sideDecorHeroMaxGap ?? 16;
    const sorted = [...entries].sort((a, b) => a.distance - b.distance);
    let fillIndex = side < 0 ? 0 : 1;
    for (let i = 1; i < sorted.length; i += 1) {
      const from = sorted[i - 1].distance;
      const to = sorted[i].distance;
      const gap = to - from;
      if (gap <= maxGap) continue;
      const fillCount = Math.floor(gap / maxGap);
      for (let n = 1; n <= fillCount; n += 1) {
        const distance = from + gap * (n / (fillCount + 1));
        // Castle-approach accents stay deliberately sparse.
        if (distance >= 150) continue;
        const prefab = this.heroGapFillPrefabs[fillIndex % this.heroGapFillPrefabs.length];
        const scaleMultiplier = distance < 45 ? 0.86 : distance < 90 ? 0.72 : 0.56;
        this.#spawnChunk(world, side, distance, prefab, scaleMultiplier);
        fillIndex += 1;
      }
    }
  }

  update(world, delta) {
    if (world.state !== 'playing') return;
    this.nextLeft -= world.speed * delta;
    this.nextRight -= world.speed * delta;

    if (this.nextLeft <= 0) {
      this.#spawnSideChunk(world, -1, this.projection.maxDistance + this.rng.range(0, 8));
      this.nextLeft = this.#nextSpacing(world);
    }
    if (this.nextRight <= 0) {
      this.#spawnSideChunk(world, 1, this.projection.maxDistance + this.rng.range(0, 8));
      this.nextRight = this.#nextSpacing(world);
    }

    // B2 — garland cadence: tick and spawn when the cursor reaches zero.
    if (this.#garlandEnabled(world)) {
      this.nextGarland -= world.speed * delta;
      if (this.nextGarland <= 0) {
        this.#spawnGarland(world, this.projection.maxDistance + this.rng.range(0, 10));
        this.nextGarland = this.#nextGarlandSpacing(world);
      }
    }
  }

  /** Procedural path: weighted-random chunk + RNG noise. */
  #spawnSideChunk(world, side, distance) {
    const chunk = this.#pickChunk(side, world.distanceRun ?? 0);
    // v3.8.39 — Phase 5 prefab composition validation. Strict mode skips
    // the whole prefab if support graph is invalid; warn-mode logs once
    // per prefab id and proceeds.
    if (this.placement && !this.placement.shouldSpawnPrefab(chunk, side)) return;
    this.#spawnChunkItems(world, side, distance, chunk, /* useRng */ true);
  }

  /** Deterministic path: explicit prefab, no RNG noise (used by HERO_LAYOUT). */
  #spawnChunk(world, side, distance, prefab, scaleMultiplier = 1) {
    if (this.placement && !this.placement.shouldSpawnPrefab(prefab, side)) return;
    this.#spawnChunkItems(world, side, distance, prefab, /* useRng */ false, scaleMultiplier);
  }

  #spawnChunkItems(world, side, distance, chunk, useRng, scaleMultiplier = 1) {
    for (const item of chunk.items) {
      const mirroredLane = side * item.lane;
      const jitter = useRng ? this.rng.range(-0.028, 0.028) : 0;
      const scaleJitter = useRng ? this.rng.range(0.96, 1.05) : 1;
      const variant = this.#resolveVariant(item.variant, item.assetType);
      const zone = zoneForSide(side, item.laneBand ?? LANE_BANDS.SHOULDER);
      // v3.8.37 — Phase 2 placement enforcement. Decor items live on
      // side-left / side-right; the validator maps each item's assetType
      // against ASSET_SEMANTICS.placementZones. Adjacency tracking is
      // per-assetType across left+right (so a mushroom cluster on the
      // right counts toward the global min spacing for that mushroom).
      const semanticZone = side === -1 ? 'side-left' : 'side-right';
      if (this.placement
          && !this.placement.shouldSpawn(item.assetType, {
            zone: semanticZone,
            distance: distance + item.dist,
            side,
          })) {
        continue;
      }
      createScenery(world.registry, {
        type: assetTypeToSceneryType(item.assetType),
        assetType: item.assetType,
        laneBand: item.laneBand ?? LANE_BANDS.SHOULDER,
        zone,
        lane: mirroredLane + side * jitter,
        distance: distance + item.dist,
        variant,
        // v3.8.42 — Phase 7b: per-entry scaleMultiplier propagates to
        // every item in the prefab. Multiplied with the per-item scale
        // and the procedural scaleJitter so a single HERO_LAYOUT entry
        // can shrink an entire cluster for perspective depth.
        scale: item.scale * scaleJitter * scaleMultiplier,
        yOffset: (item.yOffset ?? 0) * scaleMultiplier,
        chunkId: chunk.id,
        // v3.8.39 — Phase 5 slot metadata. null when the prefab item
        // hasn't been annotated yet.
        role: item.role ?? null,
        prefabId: chunk.id,
        // v3.8.40 — Phase 6 item identity + zLayer for parent-child
        // line drawing + render-order tie-break.
        itemId: item.id ?? null,
        parentItemId: item.parentId ?? null,
        zLayer: item.zLayer ?? 0,
      });
    }
  }

  /**
   * v4.0 — spacing accounts for visual.density.decorMultiplier.
   * decorMultiplier > 1 → shorter interval → denser side decor.
   * Safe range enforced: spacing won't go below 8 world-units to avoid
   * z-fighting between adjacent clusters.
   */
  #nextSpacing(world) {
    const base = this.config.spawn.sideDecorSpacing;
    const jitter = this.rng.range(-this.config.spawn.sideDecorJitter, this.config.spawn.sideDecorJitter);
    const multiplier = world?.config?.visual?.density?.decorMultiplier ?? 1;
    const spacing = (base + jitter) / Math.max(0.5, multiplier);
    return Math.max(8, spacing);
  }

  #resolveVariant(variant, type) {
    if (variant !== undefined) return variant;
    if (type === 'mushroom_red_big') return this.rng.chance(0.55) ? 'red' : 'purple';
    return this.rng.integer(0, 3);
  }

  /**
   * v4.22 — M8 rhythm windows, keyed on progression (world.distanceRun, the
   * displayed metres). 0–120m clean; 120–300m moderate; 300m+ allows stronger
   * beats but still caps heavy silhouettes. All limits are pick-count based
   * (history scan) since runtime decor all spawns at ~maxDistance.
   */
  #windowParams(progress) {
    // "Stronger beats" deep in the run = HIGHER heavy-silhouette caps (more
    // tall/pipe/qblock landmarks allowed), NOT weaker cooldowns — relaxing the
    // intent cooldown just lets same-intent runs grow into a wall. So the
    // cooldowns stay firm across windows; only the caps open up at 300m+.
    if (progress < 120) return { idCooldown: 5, intentCooldown: 4, crossSide: 3, capWindow: 6, maxTall: 1, maxPipe: 1, maxQblock: 1, sideSkew: 2 };
    if (progress < 300) return { idCooldown: 4, intentCooldown: 3, crossSide: 3, capWindow: 7, maxTall: 1, maxPipe: 2, maxQblock: 1, sideSkew: 2 };
    return                      { idCooldown: 4, intentCooldown: 3, crossSide: 2, capWindow: 9, maxTall: 2, maxPipe: 2, maxQblock: 2, sideSkew: 3 };
  }

  /**
   * v4.22 — M8 repetition score for a candidate: number of anti-repeat rules it
   * violates (0 = clean). History is pick-ordered (newest last); rules filter by
   * side so left/right interleaving is handled. decorRng only.
   */
  #repetitionViolations(chunk, side, w) {
    const intent = PREFAB_INTENT_BY_ID[chunk.id] ?? null;
    const hist = this.history;
    let v = 0;
    // 1) per-side prefab-id cooldown
    let seen = 0;
    for (let i = hist.length - 1; i >= 0 && seen < w.idCooldown; i -= 1) {
      if (hist[i].side !== side) continue;
      seen += 1;
      if (hist[i].id === chunk.id) { v += 1; break; }
    }
    // 2) per-side intent cooldown
    seen = 0;
    for (let i = hist.length - 1; i >= 0 && seen < w.intentCooldown; i -= 1) {
      if (hist[i].side !== side) continue;
      seen += 1;
      if (intent && hist[i].intent === intent) { v += 1; break; }
    }
    // 3) cross-side intent guard — same intent on the OTHER side recently
    seen = 0;
    for (let i = hist.length - 1; i >= 0 && seen < w.crossSide; i -= 1) {
      if (hist[i].side === side) continue;
      seen += 1;
      if (intent && hist[i].intent === intent) { v += 1; break; }
    }
    // 4) per-window cap + 5) side-skew balance for HEAVY silhouettes
    const capKey = HEAVY_INTENT_CAP_KEY[intent];
    if (capKey) {
      const windowN = Math.min(hist.length, w.capWindow);
      let count = 0;
      let thisSide = 0;
      let otherSide = 0;
      for (let i = hist.length - 1; i >= hist.length - windowN; i -= 1) {
        const h = hist[i];
        if (h.intent === intent) count += 1;
        if (HEAVY_INTENT_CAP_KEY[h.intent]) {
          if (h.side === side) thisSide += 1;
          else otherSide += 1;
        }
      }
      if (count >= w[capKey]) v += 1;
      if (thisSide >= otherSide + w.sideSkew) v += 1;
    }
    return v;
  }

  /**
   * v4.22 — M8 anti-repetition. Roll up to 8 candidates; take the first with
   * zero violations, else the least-bad (safe fallback so selection always
   * resolves). Replaces the old 4-roll immediate id+intent dedup with
   * window-keyed cooldowns + a cross-side guard + heavy-silhouette caps.
   * decorRng only — gameplay world.rng is never touched.
   */
  #pickChunk(side, progress = 0) {
    const w = this.#windowParams(progress);
    let best = null;
    let bestV = Infinity;
    let rolls = 0;
    for (let i = 0; i < 8; i += 1) {
      const candidate = this.rng.choice(this.weightedChunks);
      rolls += 1;
      const v = this.#repetitionViolations(candidate, side, w);
      if (v === 0) { best = candidate; bestV = 0; break; }
      if (v < bestV) { best = candidate; bestV = v; }
    }
    const chunk = best;
    this.history.push({ id: chunk.id, intent: PREFAB_INTENT_BY_ID[chunk.id] ?? null, side });
    if (this.history.length > PICK_HISTORY_MAX) this.history.shift();
    this._pickStats.picks += 1;
    this._pickStats.rerolls += rolls - 1;
    if (bestV > 0) this._pickStats.fallbacks += 1;
    return chunk;
  }

  // ── B2 Garland helpers ────────────────────────────────────────────────────

  /**
   * Returns true when the garland feature is enabled in config.
   * Requires the config key to be present AND enabled !== false.
   * An absent key (cfg === undefined/null) is treated as disabled —
   * safe default that mirrors the gameFeel missing-subconfig lesson
   * (a missing subconfig should never silently activate a feature).
   *
   * @param {object} world
   * @returns {boolean}
   */
  #garlandEnabled(world) {
    const cfg = world?.config?.visual?.garland;
    if (!cfg) return false;                // absent cfg → disabled
    return cfg.enabled !== false;
  }

  /**
   * Compute the next garland cadence distance (world units).
   * Uses decorRng only — never touches gameplay world.rng.
   *
   * @param {object} world
   * @returns {number}
   */
  #nextGarlandSpacing(world) {
    const cfg = world?.config?.visual?.garland ?? {};
    const lo = cfg.cadenceLo ?? 80;
    const hi = cfg.cadenceHi ?? 130;
    return this.rng.range(lo, hi);
  }

  /**
   * Spawn a single decorative garland entity at `distance`.
   * The entity has lane=0 (center), LANE_BANDS.PLAY band and a special
   * assetType that SceneryRenderer renders via a dedicated garland pass
   * (bypassing lane-remap so it stays at screen center).
   * No Hitbox — pure scenery.
   *
   * Founding-spec rule: decor must never blend visually with an obstacle.
   * A garland at nearly the same depth as a vine_barrier (or any road
   * obstacle) creates an unreadable tangle — the player can't tell which
   * is the dangerous element. The clearance check below queries the
   * RoadSpawnLedger for any reserved obstacle within ±obstacleClearance
   * world units and pushes the garland depth forward by garlandRetryDistance
   * when one is found (one retry only — keeps the cadence rhythm intact).
   *
   * @param {object} world
   * @param {number} distance  — world units from the player
   */
  #spawnGarland(world, distance) {
    const cfg = world?.config?.visual?.garland ?? {};
    const scale = cfg.scale ?? 1.0;
    const clearance = cfg.obstacleClearance ?? 26;
    const retryDist = cfg.garlandRetryDistance ?? 18;

    // Check the road ledger for obstacles within clearance of the target depth.
    // Uses decorRng stream only; the ledger query is read-only (no world.rng).
    const ledger = world.spawnSystem?.roadLedger;
    let spawnDepth = distance;
    if (ledger) {
      const obstacles = ledger.obstaclesInSpan(spawnDepth - clearance, spawnDepth + clearance);
      if (obstacles.length > 0) {
        // Push the garland past the obstacle cluster. One nudge is enough —
        // the cadence window is wide (80–130 m) so a single retry keeps rhythm.
        spawnDepth += retryDist;
        // Verify the retried depth is also clear; if not, skip this beat
        // rather than place a garland that still stacks on an obstacle.
        const retryObstacles = ledger.obstaclesInSpan(spawnDepth - clearance, spawnDepth + clearance);
        if (retryObstacles.length > 0) return;
      }
    }

    // No shouldSpawn call: the garland cadence (cadenceLo/cadenceHi) already
    // enforces inter-garland spacing. The PlacementValidator's minSpacing check
    // is designed for side-decor that competes for side-shoulder zones — it
    // would incorrectly fire when the update cursor's first tick lands close to
    // the last prepopulate garland's projection distance. The cadence is the
    // sole spacing authority for this decorative-only element.
    createScenery(world.registry, {
      type: 'decorative_branch_garland',
      assetType: 'decorative_branch_garland',
      lane: 0,
      distance: spawnDepth,
      variant: 0,
      scale,
      yOffset: 0,
      // STRUCTURE band puts the entity in the structural render bucket, which
      // skips the gameplay-corridor intrusion fade (structural items are
      // expected to be in the side bands — that fade only affects non-structural
      // items). We override lane remap in SceneryRenderer's garland pass so
      // the STRUCTURE band remap to 2.55 never fires for this type.
      laneBand: LANE_BANDS.STRUCTURE,
      zone: SCENE_ZONES.BACKGROUND_MID,
      chunkId: 'garland',
      prefabId: 'garland',
      role: 'background-accent',
    });
  }

  #buildWeightedChunks() {
    // v3.8.41 — Phase 7 art-direction. Prefabs flagged proceduralOk:false
    // (the four hero-layered-* compositions + Phase 9 garden_* clusters)
    // live exclusively in HERO_LAYOUT's hand-placed anchor slots.
    // Excluding them from the procedural pool prevents heavy hero
    // clusters from landing on top of the curated near-foreground beats.
    //
    // v3.8.51 — Phase 9 theme-pool filter. Procedural fill at
    // distance > 200m is now restricted to the curated subset declared
    // by THEMES[scene.theme].procedural. Generic flower-scatter prefabs
    // that don't use a signature element are excluded so the far band
    // still reads as a garden corridor, not a meadow.
    const themeKey = this.config?.scene?.theme ?? 'GARDEN_CORRIDOR_REFERENCE';
    const themePool = THEMES[themeKey]?.procedural;
    const themeAllowed = themePool ? new Set(themePool) : null;
    const result = [];
    for (const chunk of SIDE_DECORATION_PREFABS) {
      if (chunk.proceduralOk === false) continue;
      if (themeAllowed && !themeAllowed.has(chunk.id)) continue;
      for (let i = 0; i < chunk.weight; i++) result.push(chunk);
    }
    return result;
  }
}
