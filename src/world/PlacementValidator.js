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
import { ASSET_SEMANTICS, isPlacementAllowed } from '../config/assetSemantics.js';

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
  }

  reset() {
    this.lastDistance.clear();
    this.warned.clear();
    this.violations = 0;
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
    const minSpacing = semantic.adjacencyRules?.minSpacing;
    if (typeof minSpacing === 'number' && minSpacing > 0) {
      const last = this.lastDistance.get(assetType);
      if (last !== undefined && Math.abs(ctx.distance - last) < minSpacing) {
        return this.#fail(
          assetType,
          `min spacing ${minSpacing} violated (last @ ${last}, attempt @ ${ctx.distance})`,
        );
      }
    }
    // Accept — record for next adjacency check.
    this.lastDistance.set(assetType, ctx.distance);
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
}
