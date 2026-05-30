/**
 * v3.8.37 — Placement rules enforcement (Phase 2).
 *
 * Reads `ASSET_SEMANTICS` and gates per-spawn attempts against:
 *  - placementZones: does this assetType belong in the requested zone?
 *  - adjacencyRules.minSpacing: per-assetType, must keep distance from
 *                                the last recorded spawn of the same type
 *
 * Mode is controlled by `GAME_CONFIG.debug.enforcePlacementRules`:
 *  - false (default): violations log a one-shot console.warn per
 *                     assetType. Spawn still happens. Gameplay rhythm
 *                     is preserved while the data layer is validated.
 *  - true:            violations skip the spawn (factories not called)
 *                     so QA can observe what the rules would reject.
 *
 * Used by SpawnSystem (obstacles + collectibles) and DecorationSystem
 * (side scenery). Initialised once per World and reset() on every new
 * run so adjacency state doesn't bleed across restarts.
 */
import { ASSET_SEMANTICS, isPlacementAllowed, validatePrefab } from '../config/assetSemantics.js';

export class PlacementValidator {
  /**
   * @param {{ debug?: { enforcePlacementRules?: boolean } }} config
   */
  constructor(config) {
    this.config = config;
    /** @type {Map<string, number>} assetType → last accepted distance */
    this.lastDistance = new Map();
    /** @type {Set<string>} per-type "we already warned" gate */
    this.warned = new Set();
    /** @type {number} count of violations observed this run (UI / test surface) */
    this.violations = 0;
    // v3.8.39 — Phase 5 prefab composition stats.
    /** @type {number} prefabs that failed validatePrefab (errors > 0) */
    this.compositionViolations = 0;
    /** @type {Set<string>} per-prefab "we already warned" gate */
    this.warnedPrefabs = new Set();
    /** @type {object[]} latest validation results, capped, for compositionReport */
    this.recentPrefabErrors = [];
  }

  reset() {
    this.lastDistance.clear();
    this.warned.clear();
    this.violations = 0;
    this.compositionViolations = 0;
    this.warnedPrefabs.clear();
    this.recentPrefabErrors = [];
  }

  get strict() {
    return this.config.debug?.enforcePlacementRules === true;
  }

  /**
   * @param {string} assetType
   * @param {{ zone: import('../config/assetSemantics.js').PlacementZone, distance: number, side?: -1 | 1 }} ctx
   * @returns {{ ok: boolean, reason?: string }}
   */
  check(assetType, ctx) {
    const semantic = ASSET_SEMANTICS[assetType];
    if (!semantic) {
      // Unknown assetType — pass through silently. The audit script
      // (Phase 1) is the canonical surface for "registry missing entry";
      // runtime warns would be noisy and not actionable.
      return { ok: true };
    }
    const zoneCheck = isPlacementAllowed(assetType, ctx.zone);
    if (!zoneCheck.ok) return this.#fail(assetType, zoneCheck.reason);
    // Adjacency — only enforced when the semantic registry declares a
    // minSpacing for this asset. Most decor doesn't (free to cluster).
    //
    // v3.8.39 — keyed by `assetType:zone` so a dual-use asset like
    // dry_grass_obstacle (road obstacle + side-decor ambient) doesn't
    // have its road-rhythm spacing contaminated by side-decor spawns
    // that land at similar distances.
    const minSpacing = semantic.adjacencyRules?.minSpacing;
    if (typeof minSpacing === 'number' && minSpacing > 0) {
      const adjacencyKey = `${assetType}:${ctx.zone}`;
      const last = this.lastDistance.get(adjacencyKey);
      if (last !== undefined && Math.abs(ctx.distance - last) < minSpacing) {
        return this.#fail(
          assetType,
          `min spacing ${minSpacing} violated in zone ${ctx.zone} (last @ ${last}, attempt @ ${ctx.distance})`,
        );
      }
      this.lastDistance.set(adjacencyKey, ctx.distance);
    }
    return { ok: true };
  }

  /**
   * Convenience wrapper used by spawn systems: returns true when the
   * spawn should proceed. In strict mode, false means the caller MUST
   * skip the spawn. In default mode, false still means "don't proceed"
   * but the warning is the primary signal.
   */
  shouldSpawn(assetType, ctx) {
    const result = this.check(assetType, ctx);
    if (result.ok) return true;
    return !this.strict;
  }

  #fail(assetType, reason) {
    this.violations += 1;
    if (!this.warned.has(assetType)) {
      this.warned.add(assetType);
      // eslint-disable-next-line no-console
      console.warn(`[placement] ${assetType}: ${reason}`);
    }
    return { ok: false, reason };
  }

  /**
   * v3.8.39 — Phase 5 prefab composition validation. Returns the same
   * shape as validatePrefab from assetSemantics, plus increments the
   * compositionViolations counter and surfaces one-shot warns per
   * prefab id. In strict mode the caller should skip the entire prefab.
   */
  checkPrefab(prefab, side) {
    const result = validatePrefab(prefab, side);
    if (!result.ok) {
      this.compositionViolations += 1;
      // Keep the last 20 errors for compositionReport().
      this.recentPrefabErrors.push(...result.errors.slice(0, 8));
      if (this.recentPrefabErrors.length > 20) {
        this.recentPrefabErrors.splice(0, this.recentPrefabErrors.length - 20);
      }
      const prefabId = prefab?.id ?? '?';
      if (!this.warnedPrefabs.has(prefabId)) {
        this.warnedPrefabs.add(prefabId);
        const summary = result.errors.map((e) => `${e.kind}@${e.item ?? '?'}`).join(', ');
        // eslint-disable-next-line no-console
        console.warn(`[prefab] ${prefabId}: ${summary}`);
      }
    }
    return result;
  }

  /**
   * Wraps checkPrefab with shouldSpawn semantics. Returns true when the
   * caller may proceed with the spawn; false means strict mode and the
   * prefab should be skipped entirely.
   */
  shouldSpawnPrefab(prefab, side) {
    const result = this.checkPrefab(prefab, side);
    if (result.ok) return true;
    return !this.strict;
  }
}
