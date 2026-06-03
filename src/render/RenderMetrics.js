/**
 * Debug-only per-frame render instrumentation (enabled via ?perf=1).
 *
 * Pure measurement — it NEVER changes what is drawn, only counts. The
 * collector is created only when the flag is set; in production / plain
 * ?debug it is `null`, so every `this.metrics?.count…()` call site is a
 * no-op (a single nullish check) with zero cost and zero behaviour change.
 *
 * Lifecycle per frame (driven by RenderSystem.render):
 *   beginFrame()  → reset the live counters
 *   …renderers increment during the pipeline…
 *   endFrame()    → snapshot live → last (HUD reads the stable snapshot)
 *
 * The PerformanceHUD reads `snapshot()` twice per second.
 */
export class RenderMetrics {
  constructor() {
    this._clusterKeys = new Set();
    this._frame = RenderMetrics.#blank();
    this._last = RenderMetrics.#blank();
  }

  static #blank() {
    return {
      drawImage: 0, sceneryDrawn: 0, sceneryCulled: 0, meadowPoints: 0, clusters: 0,
      cat: { flora: 0, block: 0, mushroom: 0, tree: 0, pipe: 0, other: 0 },
    };
  }

  beginFrame() {
    const f = this._frame;
    f.drawImage = 0; f.sceneryDrawn = 0; f.sceneryCulled = 0; f.meadowPoints = 0; f.clusters = 0;
    const c = f.cat;
    c.flora = 0; c.block = 0; c.mushroom = 0; c.tree = 0; c.pipe = 0; c.other = 0;
    this._clusterKeys.clear();
  }

  countDrawImage() { this._frame.drawImage += 1; }
  countMeadowPoint() { this._frame.meadowPoints += 1; }
  countSceneryCulled() { this._frame.sceneryCulled += 1; }

  /** A scenery sprite was drawn (not culled). category + optional cluster key. */
  countScenery(category, clusterKey) {
    const f = this._frame;
    f.sceneryDrawn += 1;
    const c = f.cat;
    if (c[category] !== undefined) c[category] += 1; else c.other += 1;
    if (clusterKey) this._clusterKeys.add(clusterKey);
  }

  endFrame() {
    const f = this._frame;
    f.clusters = this._clusterKeys.size;
    const l = this._last;
    l.drawImage = f.drawImage; l.sceneryDrawn = f.sceneryDrawn; l.sceneryCulled = f.sceneryCulled;
    l.meadowPoints = f.meadowPoints; l.clusters = f.clusters;
    const lc = l.cat; const fc = f.cat;
    lc.flora = fc.flora; lc.block = fc.block; lc.mushroom = fc.mushroom;
    lc.tree = fc.tree; lc.pipe = fc.pipe; lc.other = fc.other;
  }

  /** Stable snapshot of the last completed frame. */
  snapshot() { return this._last; }
}

/** Map a scenery assetType to a coarse cost category for the breakdown. */
export function sceneryCategory(assetType) {
  if (assetType === 'tree_round' || assetType === 'tree') return 'tree';
  if (typeof assetType === 'string' && assetType.startsWith('mushroom')) return 'mushroom';
  if (assetType === 'green_pipe' || assetType === 'planter_pot') return 'pipe';
  if (assetType === 'grass_dirt_block' || assetType === 'grass_dirt_wall' || assetType === 'grass_dirt_step'
    || assetType === 'purple_brick_single' || assetType === 'question_block'
    || assetType === 'floating_platform' || assetType === 'hanging_platform_vines') return 'block';
  if (typeof assetType === 'string'
    && (assetType.includes('flower') || assetType.includes('grass_tuft') || assetType.includes('leaf')
      || assetType.includes('bush') || assetType === 'sprout_soil' || assetType.includes('dry_grass'))) return 'flora';
  return 'other';
}
