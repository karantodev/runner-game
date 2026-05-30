/**
 * v3.8.50 — Phase 8 Composition Validator.
 *
 * Static analysis pass that reads the canonical semantic registry
 * (`src/config/assetSemantics.js`) and the world-generation data
 * (`src/config/sceneSchema.data.js`) and reports rule violations:
 *
 *   Hard violations (block CI / exit 1 on --check):
 *     SEMANTIC_MISSING          asset referenced but not in registry
 *     WRONG_SIDE                left_only on right shoulder (or inverse)
 *     PAIR_DIM_MISMATCH         _left.png / _right.png dims disagree
 *                               for a pair_required asset
 *     FLOATING_SUPPORT          requiresPlatform=true item at anchor=ground
 *                               with no parent
 *     STACKABLE_NO_BASE         STACKABLE_TOP role without canSupport parent
 *     OBSTACLE_AS_DECOR         GAMEPLAY_OBSTACLE asset used as decor item
 *     DECOR_AS_STRUCTURAL       SIDE_DECOR_* used as base/support
 *     SIDE_STRUCT_IN_ROAD       SIDE_STRUCTURE in ROAD lane band
 *     SIDE_DECOR_IN_ROAD        SIDE_DECOR_* in ROAD lane band
 *
 *   Warnings (logged; only fail with --strict):
 *     DENSITY_EXCEEDED          same assetType count in a depth band
 *                               exceeds canonical maxPerScreen
 *     READABILITY_NEAR_PLAYER   blocksRoadReadability asset in HERO_LAYOUT
 *                               within player-zone distance window
 *     OBSTACLE_BEHIND_DECOR     gameplay obstacle z-layer behind decor
 *
 *   Modes:
 *     node scripts/validate-composition.mjs           — write full report
 *     node scripts/validate-composition.mjs --check   — short summary,
 *                                                       exit 1 on hard
 *     node scripts/validate-composition.mjs --strict  — warnings → errors
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORT_OUT = path.join(ROOT, 'docs/composition-validation-report.md');

const sem = await import(pathToFileURL(path.join(ROOT, 'src/config/assetSemantics.js')).href);
const scene = await import(pathToFileURL(path.join(ROOT, 'src/config/sceneSchema.data.js')).href);
const gc = await import(pathToFileURL(path.join(ROOT, 'src/config/gameConfig.js')).href);

const ASSETS = gc.GAME_CONFIG?.assets ?? {};

const hardViolations = [];
const warnings = [];

function pushHard(kind, ctx) { hardViolations.push({ kind, ctx }); }
function pushWarn(kind, ctx) { warnings.push({ kind, ctx }); }

// ── PNG IHDR reader (mirrors scripts/audit-images.mjs) ────────────────
async function readPngDims(absPath) {
  let fh;
  try {
    fh = await fs.open(absPath, 'r');
    const buf = Buffer.alloc(24);
    await fh.read(buf, 0, 24, 0);
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch { return null; } finally { if (fh) await fh.close(); }
}

// ── 1. SEMANTIC_MISSING + per-item checks across all scene data ───────
function* iterateAllPrefabItems() {
  for (const prefab of scene.SIDE_DECORATION_PREFABS) {
    for (const item of prefab.items) {
      yield { source: 'SIDE_DECORATION_PREFABS', prefabId: prefab.id, item, lane: item.lane, dist: item.dist, laneBand: item.laneBand };
    }
  }
  for (const item of scene.MIDGROUND_SCENERY) {
    yield { source: 'MIDGROUND_SCENERY', prefabId: null, item, lane: item.lane, dist: item.distance, laneBand: null };
  }
  for (const item of scene.FOREGROUND_FRAME_SCENERY) {
    yield { source: 'FOREGROUND_FRAME_SCENERY', prefabId: null, item, lane: item.lane, dist: item.distance, laneBand: null };
  }
}

function laneBandIsRoadCore(laneBand) {
  // LANE_BANDS keys: STRUCTURE / SHOULDER / NATURE / ROAD / CENTER.
  // ROAD-core matches anything that contains 'ROAD' or 'CENTER'.
  if (!laneBand) return false;
  return /ROAD|CENTER/.test(String(laneBand));
}

const STRUCTURAL_PREFAB_ROLES = new Set(['base', 'support']);
const DECOR_PREFAB_ROLES = new Set(['loose-decor', 'child-decor', 'foreground-accent', 'background-accent']);

for (const ctx of iterateAllPrefabItems()) {
  const { source, prefabId, item, lane, laneBand } = ctx;
  const canonical = sem.getCanonicalSemantic(item.assetType);
  // SEMANTIC_MISSING
  if (!canonical) {
    pushHard('SEMANTIC_MISSING', { source, prefabId, assetType: item.assetType, itemId: item.id ?? item.assetType });
    continue;
  }

  // WRONG_SIDE — only for left_only / right_only assets in MIDGROUND/FOREGROUND
  // (SIDE_DECORATION_PREFABS items get their side from HERO_LAYOUT at runtime).
  if (source !== 'SIDE_DECORATION_PREFABS' && typeof lane === 'number') {
    if (canonical.sideFacing === 'left_only' && lane > 0) {
      pushHard('WRONG_SIDE', { source, assetType: item.assetType, lane, expected: 'left (lane < 0)' });
    } else if (canonical.sideFacing === 'right_only' && lane < 0) {
      pushHard('WRONG_SIDE', { source, assetType: item.assetType, lane, expected: 'right (lane > 0)' });
    }
  }

  // OBSTACLE_AS_DECOR — gameplay obstacle used as decorative item
  if (canonical.role === 'GAMEPLAY_OBSTACLE' && DECOR_PREFAB_ROLES.has(item.role)) {
    pushHard('OBSTACLE_AS_DECOR', { source, prefabId, assetType: item.assetType, itemId: item.id, prefabRole: item.role });
  }

  // DECOR_AS_STRUCTURAL — small/large decor used as base/support
  if ((canonical.role === 'SIDE_DECOR_SMALL' || canonical.role === 'SIDE_DECOR_LARGE')
      && STRUCTURAL_PREFAB_ROLES.has(item.role)) {
    pushHard('DECOR_AS_STRUCTURAL', { source, prefabId, assetType: item.assetType, itemId: item.id, prefabRole: item.role });
  }

  // SIDE_STRUCT_IN_ROAD — side structure in road lane band
  if (canonical.role === 'SIDE_STRUCTURE' && laneBandIsRoadCore(laneBand)) {
    pushHard('SIDE_STRUCT_IN_ROAD', { source, prefabId, assetType: item.assetType, laneBand });
  }

  // SIDE_DECOR_IN_ROAD — side decor in road lane band
  if ((canonical.role === 'SIDE_DECOR_SMALL' || canonical.role === 'SIDE_DECOR_LARGE')
      && laneBandIsRoadCore(laneBand)) {
    pushHard('SIDE_DECOR_IN_ROAD', { source, prefabId, assetType: item.assetType, laneBand });
  }
}

// ── 2. FLOATING_SUPPORT + STACKABLE_NO_BASE — graph checks per prefab ─
for (const prefab of scene.SIDE_DECORATION_PREFABS) {
  const itemById = new Map();
  for (const item of prefab.items) {
    if (item.id) itemById.set(item.id, item);
  }
  for (const item of prefab.items) {
    const canonical = sem.getCanonicalSemantic(item.assetType);
    if (!canonical) continue;
    const requiresPlatform = canonical.supportRules.requiresPlatform;
    const isStackable = canonical.role === 'STACKABLE_TOP';
    // FLOATING_SUPPORT — needs platform but anchored to ground without
    // parent. Mirrors existing PrefabValidator semantics: certain
    // "ground-fallback" prefab roles legitimately host a support-required
    // asset directly on the ground (a big mushroom on a forest patch is
    // the canonical example — see SUPPORT_REQUIRED_GROUND_FALLBACK_ROLES
    // in assetSemantics.js:802). Only fail for roles outside that set.
    const PREFAB_GROUND_FALLBACK_ROLES = new Set(['base', 'support', 'loose-decor', 'foreground-accent', 'background-accent']);
    if (requiresPlatform && item.anchor === 'ground' && !item.parentId
        && !PREFAB_GROUND_FALLBACK_ROLES.has(item.role)) {
      pushHard('FLOATING_SUPPORT', { prefabId: prefab.id, assetType: item.assetType, itemId: item.id, role: item.role });
    }
    // STACKABLE_NO_BASE — STACKABLE_TOP without a canSupport parent
    if (isStackable) {
      if (!item.parentId) {
        // STACKABLE_TOP on ground (`anchor='ground'`) is the
        // documented fallback (a big mushroom on its own forest
        // patch). PrefabValidator allows it. Skip.
      } else {
        const parent = itemById.get(item.parentId);
        if (!parent) {
          pushHard('STACKABLE_NO_BASE', { prefabId: prefab.id, assetType: item.assetType, itemId: item.id, reason: 'parent missing' });
        } else {
          const parentCanonical = sem.getCanonicalSemantic(parent.assetType);
          if (!parentCanonical?.supportRules.canSupport) {
            pushHard('STACKABLE_NO_BASE', { prefabId: prefab.id, assetType: item.assetType, itemId: item.id, parent: parent.assetType, reason: 'parent cannot support' });
          }
        }
      }
    }
  }
}

// ── 3. PAIR_DIM_MISMATCH — pair_required assets, file dims ────────────
async function checkPairDims() {
  const seen = new Set();
  for (const [, ctx] of Object.entries(scene.SIDE_DECORATION_PREFABS)) {
    void ctx; // placeholder — pair check is per-canonical-asset, not per-item
  }
  for (const key of sem.listSemanticKeys()) {
    const canonical = sem.getCanonicalSemantic(key);
    if (!canonical) continue;
    if (canonical.sideFacing !== 'pair_required' && canonical.sideFacing !== 'road_facing_required') continue;
    if (seen.has(key)) continue;
    seen.add(key);
    // Resolve the pair PNG paths from gameConfig.assets. The key naming
    // convention is camelCase + Left/Right (e.g. `grassDirtBlockLeft`).
    // Convert assetType (snake_case) to camelCase.
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const leftPath = ASSETS[`${camel}Left`];
    const rightPath = ASSETS[`${camel}Right`];
    if (!leftPath || !rightPath) continue;
    const leftAbs = path.join(ROOT, leftPath);
    const rightAbs = path.join(ROOT, rightPath);
    const [leftDims, rightDims] = await Promise.all([readPngDims(leftAbs), readPngDims(rightAbs)]);
    if (!leftDims || !rightDims) continue;
    if (leftDims.width !== rightDims.width || leftDims.height !== rightDims.height) {
      pushHard('PAIR_DIM_MISMATCH', {
        assetType: key,
        left: `${leftPath} (${leftDims.width}×${leftDims.height})`,
        right: `${rightPath} (${rightDims.width}×${rightDims.height})`,
      });
    }
  }
}
await checkPairDims();

// ── 4. DENSITY_EXCEEDED (warning) — same-type count in depth band ─────
function depthBandOf(distance) {
  if (distance < 50)  return 'near';
  if (distance < 100) return 'mid';
  if (distance < 150) return 'mid-far';
  return 'far';
}
const countByTypeInBand = new Map();
for (const item of scene.MIDGROUND_SCENERY) {
  const band = depthBandOf(item.distance);
  const key = `${item.assetType}|${band}`;
  countByTypeInBand.set(key, (countByTypeInBand.get(key) ?? 0) + 1);
}
for (const [key, count] of countByTypeInBand) {
  const [assetType, band] = key.split('|');
  const canonical = sem.getCanonicalSemantic(assetType);
  if (!canonical) continue;
  const max = canonical.compositionRules.maxPerScreen;
  if (count > max) {
    pushWarn('DENSITY_EXCEEDED', { assetType, band, count, max });
  }
}

// ── 5. READABILITY_NEAR_PLAYER (warning) — heavy assets near opening ──
const PLAYER_ZONE_DIST = 30;
// HERO_LAYOUT references prefabs; for each entry in the player zone,
// check whether the referenced prefab contains an item whose canonical
// asset has blocksRoadReadability=true.
const prefabsById = new Map(scene.SIDE_DECORATION_PREFABS.map((p) => [p.id, p]));
for (const entry of scene.HERO_LAYOUT) {
  if (entry.distance >= PLAYER_ZONE_DIST) continue;
  const prefab = prefabsById.get(entry.prefabId);
  if (!prefab) continue;
  for (const item of prefab.items) {
    const canonical = sem.getCanonicalSemantic(item.assetType);
    if (canonical?.compositionRules.blocksRoadReadability) {
      pushWarn('READABILITY_NEAR_PLAYER', {
        prefabId: entry.prefabId,
        assetType: item.assetType,
        distance: entry.distance,
        side: entry.side,
      });
    }
  }
}

// ── 6a. BAND_OVERSUBSCRIBED — HERO_LAYOUT density per depth band ──────
const bandSideCounts = new Map();
for (const entry of scene.HERO_LAYOUT) {
  const band = scene.bandForDistance(entry.distance);
  const key = `${band}|${entry.side > 0 ? 'R' : 'L'}`;
  bandSideCounts.set(key, (bandSideCounts.get(key) ?? 0) + 1);
}
for (const [key, count] of bandSideCounts) {
  const [band, sideTag] = key.split('|');
  const limit = scene.DEPTH_BANDS[band]?.maxClustersPerSide ?? 99;
  if (count > limit) {
    pushHard('BAND_OVERSUBSCRIBED', { band, side: sideTag, count, limit });
  }
}

// ── 6b. ISOLATED_CUBE — HERO_LAYOUT must reference multi-item clusters ─
const prefabsByIdLocal = new Map(scene.SIDE_DECORATION_PREFABS.map((p) => [p.id, p]));
for (const entry of scene.HERO_LAYOUT) {
  const prefab = prefabsByIdLocal.get(entry.prefabId);
  if (!prefab) {
    pushHard('HERO_LAYOUT_PREFAB_MISSING', { prefabId: entry.prefabId, distance: entry.distance });
    continue;
  }
  if (prefab.items.length < 2) {
    pushHard('ISOLATED_CUBE', { prefabId: entry.prefabId, distance: entry.distance, itemCount: prefab.items.length });
  }
}

// ── 6c. QBLOCK_FLOATING — question_block must sit on a structural sibling
const STRUCTURAL_ASSETS = new Set(['purple_brick_single', 'grass_dirt_block', 'grass_dirt_wall', 'floating_platform', 'grass_dirt_platform_long', 'grass_dirt_step']);
for (const prefab of scene.SIDE_DECORATION_PREFABS) {
  for (const item of prefab.items) {
    if (item.assetType !== 'question_block') continue;
    // OK if it has an explicit parent.
    if (item.parentId) continue;
    // OK if a structural sibling sits near it (lane ≤ 0.3 + dist ≤ 1.5).
    const hasStructuralNeighbour = prefab.items.some((sib) =>
      sib !== item
      && STRUCTURAL_ASSETS.has(sib.assetType)
      && Math.abs((sib.lane ?? 0) - (item.lane ?? 0)) <= 0.3
      && Math.abs((sib.dist ?? 0) - (item.dist ?? 0)) <= 1.5
    );
    if (!hasStructuralNeighbour) {
      pushHard('QBLOCK_FLOATING', { prefabId: prefab.id, itemId: item.id ?? item.assetType });
    }
  }
}

// ── 6d. PIPE_NOT_LANDMARK — green_pipe must be anchored as base/support
for (const prefab of scene.SIDE_DECORATION_PREFABS) {
  for (const item of prefab.items) {
    if (item.assetType !== 'green_pipe') continue;
    const role = item.role ?? 'loose-decor';
    // OK if base / support (the landmark + clearly anchored variants).
    if (role === 'base' || role === 'support') continue;
    // OK if a structural sibling is right next to it.
    const hasStructuralNeighbour = prefab.items.some((sib) =>
      sib !== item
      && STRUCTURAL_ASSETS.has(sib.assetType)
      && Math.abs((sib.lane ?? 0) - (item.lane ?? 0)) <= 0.25
      && Math.abs((sib.dist ?? 0) - (item.dist ?? 0)) <= 1.2
    );
    if (!hasStructuralNeighbour) {
      pushHard('PIPE_NOT_LANDMARK', { prefabId: prefab.id, itemId: item.id ?? item.assetType, role });
    }
  }
}

// ── 6. OBSTACLE_BEHIND_DECOR (warning) — z-layer + lane proximity ─────
// For each prefab, find pairs of items where one canonical role is
// GAMEPLAY_OBSTACLE and a decor item shares the same lane (±0.4) AND
// a closer dist (sits between camera and the obstacle). Use zLayer
// as a coarser tiebreaker.
for (const prefab of scene.SIDE_DECORATION_PREFABS) {
  const obstacles = prefab.items.filter((it) => sem.getCanonicalSemantic(it.assetType)?.role === 'GAMEPLAY_OBSTACLE');
  if (!obstacles.length) continue;
  const decor = prefab.items.filter((it) => {
    const c = sem.getCanonicalSemantic(it.assetType);
    return c?.role === 'SIDE_DECOR_SMALL' || c?.role === 'SIDE_DECOR_LARGE';
  });
  for (const obs of obstacles) {
    for (const d of decor) {
      if (Math.abs((obs.lane ?? 0) - (d.lane ?? 0)) > 0.4) continue;
      if ((d.dist ?? 0) > (obs.dist ?? 0)) continue; // decor is further, not in front
      if ((d.zLayer ?? 0) > (obs.zLayer ?? 0)) {
        pushWarn('OBSTACLE_BEHIND_DECOR', {
          prefabId: prefab.id,
          obstacle: obs.assetType,
          decor: d.assetType,
        });
      }
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────
const checkMode = process.argv.includes('--check');
const strictMode = process.argv.includes('--strict');

const effectiveHard = strictMode ? hardViolations.concat(warnings.map((w) => ({ ...w, demotedFromWarning: true }))) : hardViolations;

function summary() {
  console.log('[validate-composition]');
  console.log(`  hard violations  ${hardViolations.length}`);
  console.log(`  warnings         ${warnings.length}${strictMode ? ' (promoted to errors)' : ''}`);
  if (hardViolations.length || (strictMode && warnings.length)) {
    console.log('');
    console.log('FAIL — by kind:');
    const byKind = new Map();
    for (const v of effectiveHard) {
      byKind.set(v.kind, (byKind.get(v.kind) ?? 0) + 1);
    }
    for (const [k, c] of byKind) console.log(`  ${k.padEnd(28)} ${c}`);
  } else {
    console.log('  PASS');
  }
}

if (checkMode) {
  summary();
  process.exit(effectiveHard.length > 0 ? 1 : 0);
}

// Full markdown report
const lines = [];
lines.push('# Composition Validation Report');
lines.push('');
lines.push(`Generated ${new Date().toISOString()}.`);
lines.push('');
lines.push(`- Hard violations: **${hardViolations.length}**`);
lines.push(`- Warnings:        **${warnings.length}**`);
lines.push('');

function section(title, list) {
  lines.push(`## ${title} (${list.length})`);
  lines.push('');
  if (!list.length) { lines.push('_(none)_'); lines.push(''); return; }
  const byKind = new Map();
  for (const v of list) {
    if (!byKind.has(v.kind)) byKind.set(v.kind, []);
    byKind.get(v.kind).push(v);
  }
  for (const [kind, entries] of byKind) {
    lines.push(`### \`${kind}\` (${entries.length})`);
    for (const e of entries) {
      lines.push(`- ${JSON.stringify(e.ctx)}`);
    }
    lines.push('');
  }
}

section('Hard violations', hardViolations);
section('Warnings', warnings);

await fs.writeFile(REPORT_OUT, lines.join('\n'));
console.log(`[validate-composition] wrote ${path.relative(ROOT, REPORT_OUT)}`);
console.log(`[validate-composition] ${hardViolations.length} hard · ${warnings.length} warnings`);
process.exit(0);
