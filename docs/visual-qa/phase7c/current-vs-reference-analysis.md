# Phase 7c — Composition Analysis

Generated alongside the Phase 7c side-corridor captures.

## Layout summary

`HERO_LAYOUT` is now an 8-entry composed corridor (vs Phase 7b's 6).
The two added entries are intermediate-depth beats so each band has a
landmark instead of a gap:

```
ZONE              DIST  SIDE   PREFAB                            SCALE
─────────────────────────────────────────────────────────────────────
FOREGROUND        20    L      foreground-left-anchor            1.00
FOREGROUND        30    R      foreground-right-anchor           1.00
NEAR-MID FILLER   48    R      fence-flower-row                  0.85   ← new vs 7b
MID STRUCTURAL    68    L      hero-layered-platform-qblocks     0.75
MID STRUCTURAL    88    R      corner-platform-mushroom-frame    0.72
MID-FAR PURPLE   108    L      brick-corridor-segment            0.55   ← new vs 7b
FAR LANDMARK     132    R      leaf-forest-edge                  0.42
FAR LANDMARK     152    L      organic-meadow                    0.40
CASTLE APPROACH 155m+         (deliberately empty)
```

## Composition variety

Each beat brings a different prefab "intent" so no two adjacent
landmarks read as the same composition:

- **foreground-left-anchor**: mushroom-on-block + inner brick + flora
- **foreground-right-anchor**: pipe + back bush + brick + fence + flower
- **fence-flower-row**: fence + 4 small flowers (soft transition)
- **hero-layered-platform-qblocks**: brick + platform + 2 qblocks + outer wall + mushroom topper
- **corner-platform-mushroom-frame**: long platform + mushroom topper + brick + fence + 2 flowers
- **brick-corridor-segment**: 2 purple bricks + qblock + small flora (purple beat)
- **leaf-forest-edge**: 5 small leaf clumps + grass + flowers
- **organic-meadow**: flower + ground mushroom + 2 flowers + tuft

## Run Complete overlay fix

The dying / dead overlay now stacks two soft layers:

1. Dark navy radial dim (alpha 0.45 × t) — keeps the scene readable.
2. Subtle red edge ring (alpha 0.28 × t) — accent only, not a wash.

The designer `hit_flash_*.png` overlays (translucent red checker
pattern) are no longer drawn during `world.state === 'dying'` or
`'dead'` — that's what produced the "raw checkerboard" look the user
flagged. In-game hit flash also drops the designer overlay and falls
through to a flat colour-fill tint at 0.12 alpha — much subtler than
the noisy designer art.

## Asset class taxonomy (Phase 7c)

New `ASSET_CLASS_BY_TYPE` map in `src/config/assetSemantics.js`. Each
of the 57 registered asset types maps to one of 12 classes. The class
is finer-grained than the existing `category` and captures stacking
+ composition role:

```
GAMEPLAY_OBSTACLE    7  vine / overhang / bush / wheat / mushroom-obstacle / stone / spider_web
COLLECTIBLE          3  golden_flower / heart_full / rare_orchid_pickup
BONUS_POWERUP        5  speed_tree / power_mushroom / magnet / shield / double
ROAD_DECOR           2  road_lane_tile / road_perspective_lines
SIDE_STRUCTURE       7  purple_brick / stone_brick / stone_wall_low/stairs / planter_pot / green_pipe / question_block
SUPPORT_FOUNDATION   5  grass_dirt_block / wall / step / step_left / platform_long
STACKABLE_TOP        2  mushroom_red_big / mushroom_blue_big
PLATFORM             3  floating_platform / hanging_platform_vines / purple_brick_platform_3
SIDE_DECOR_SMALL     9  yellow/purple flower / grass_tuft × 3 / wheat / sprout / leaf_small / bush_with_purple
SIDE_DECOR_LARGE     5  bush_large / bush_large_purple / tree_round / fence / leaf_round
LANDMARK             3  castle_far / greenhouse_far / player_farmer
BACKGROUND_ONLY      6  sky / cloud / mountains_far/mid / forest_far / meadow_far
```

## Prefab composition metadata (Phase 7c)

New `PREFAB_COMPOSITION_METADATA` map in `sceneSchema.data.js`. One
entry per hero-tier prefab (the eight used in HERO_LAYOUT). Each has
`zone / side / role / densityWeight / allowedDepthRange /
minSpacingFromSameType / requiresSupport / roadClearance`. Future
composition validators read this map to enforce depth-band rules at
spawn time without touching the prefab arrays.

## Asset inventory — developer hand-off list

Authoritative source: `docs/asset-semantic-action-list.md` +
`docs/asset-missing-art-list.md` +`docs/image-audit-report.md`. Numbers
from `node scripts/audit-assets.mjs --check --strict`:

### ✅ Active (G — used in game)         25 asset types

Currently referenced by at least one prefab / HERO_LAYOUT /
MIDGROUND_SCENERY entry. Deletion-protected.

### ⚠ Registered but unused             32 asset types

In `ASSET_SEMANTICS` but no scene/prefab consumer. Backgrounds + core
lanes are intentional (sky, mountains, road_lane_tile). The remaining
~20 are spawn-pool-only or fallbacks. See semantic-action-list.

### 🛑 REJECT — duplicates / overdelivery   20 PNGs

From `image-audit-report.md`. **15 exact-content duplicate groups**
(SHA-256 identical, different paths). Worst offenders:

- 4 copies of `orchid_blue_rare_halo` across collectibles / effects /
  powerups
- 4 copies of `star_burst_gold` across effects/powerups
- 4 copies of `star_small_burst` across paths
- 4 copies of `magic_circle_glow`
- 8 more multi-copy groups (see report)

Designer action: pick one canonical path per asset, archive the rest
to `_source/`.

### 🟡 NEED DESIGNER FIX — side-pair mismatches  3 pairs

From image audit. `_left.png` / `_right.png` siblings disagree on
canvas dimensions, so the engine's per-side dispatcher renders the
mismatched half at the wrong scale:

- `grass_dirt_step_left.png` 1086×1448 ≠ `_right.png` 1254×1254
- `road_lane_left.png` 526×2172 ≠ `_right.png` 445×2172
- `road_shoulder_left.png` 375×2047 ≠ `_right.png` 278×2166

Designer action: re-export both halves to matching dims.

### 🟡 MISSING CRITICAL                  21 entries

11 dead keys waiting on designer + 10 semantic side-aware types
missing a registered left/right pair. See
`docs/asset-missing-art-list.md` bucket B.

### 🟢 LOW PRIORITY OPTIONAL              35 PNGs

Alt-style variants on disk without an engine consumer. Could enrich
variety in a future composition-template pass; not blocking gameplay.

## Honest visual delta assessment

Comparing `phase7b` to `phase7c`:

- **dist=30**: phase7c now has the `foreground-right-anchor`'s pipe +
  bush visible behind the inner brick; phase7b had only the brick.
  Foreground reads as a composed gate rather than scattered objects.
- **dist=70**: phase7c shows the `corner-platform-mushroom-frame` on
  the right with the explicit platform + mushroom topper + fence
  framing. Phase7b had the same prefab but at the same scale as the
  near anchors; phase7c's 0.72 scale gives it real depth.
- **dist=120**: phase7c shows the new `brick-corridor-segment` at the
  mid-far band (108m at 0.55 scale) — a purple-brick beat that
  phase7b skipped entirely. The castle approach (155m+) stays empty
  as designed.

This is the third pass on the same data. We've moved from:

- Phase 6 (14 entries, scattered): noisy, no perspective
- Phase 7 (11 entries, lightly trimmed): cleaner but similar feel
- Phase 7b (6 entries, aggressive trim): clean but empty
- Phase 7c (8 entries, composed): clean AND composed, depth-zoned

We're not yet at "looks exactly like the reference". Closing that
gap needs new artwork — wider garden-frame prefab, more silhouette
tree variants, a wider road-edge stone texture — none of which is a
layout edit. The data layer + composition grammar are in place; the
remaining delta is designer-side.

## What this pass added (Phase 7c summary)

Code:
- `EffectsRenderer` dying overlay rewritten with two-layer dim
  (navy base + subtle red edge); hit_flash never draws over dying.
- `ASSET_CLASS_BY_TYPE` map — 12-role taxonomy.
- `PREFAB_COMPOSITION_METADATA` map — per-prefab zone / role / depth
  rules for the hero-tier prefabs.

Data:
- HERO_LAYOUT 6 → 8 entries (added `fence-flower-row` near-mid filler
  + `brick-corridor-segment` mid-far purple beat).

QA:
- `docs/visual-qa/phase7c/seed-{1,42,99}-dist-{30,70,120}.png` — 9
  full-size screenshots.
- `docs/visual-qa/side-corridor-phase7b-vs-phase7c.png` composite.
- This analysis doc.
