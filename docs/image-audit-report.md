# Image Audit Report

Generated 2026-05-30T19:55:12.782Z.
Scanned 373 PNGs under `assets/` (excluding `_source/`).

## Exact duplicates (0 groups)
_(none — every PNG has unique content)_

## Stem-family dimension inconsistencies (13)
Files sharing a stem (e.g., `player_farmer_run_*`) but with
different `width×height`. Re-export to a canonical canvas.

### `assets/collectibles/orchid_gold/orchid_gold_collect`
- `assets/collectibles/orchid_gold/orchid_gold_collect_02.png` — 1254×1254
- `assets/collectibles/orchid_gold/orchid_gold_collect_03.png` — 1254×1254
- `assets/collectibles/orchid_gold/orchid_gold_collect_04.png` — 1254×1254
- `assets/collectibles/orchid_gold/orchid_gold_collect_07.png` — 96×96
- `assets/collectibles/orchid_gold/orchid_gold_collect_08.png` — 96×96

### `assets/effects/collect_burst/collect_burst`
- `assets/effects/collect_burst/collect_burst_01.png` — 1254×1254
- `assets/effects/collect_burst/collect_burst_02.png` — 1254×1254
- `assets/effects/collect_burst/collect_burst_03.png` — 1448×1086
- `assets/effects/collect_burst/collect_burst_04.png` — 1672×941
- `assets/effects/collect_burst/collect_burst_05.png` — 1672×941
- `assets/effects/collect_burst/collect_burst_06.png` — 1672×941
- `assets/effects/collect_burst/collect_burst_07.png` — 1672×941
- `assets/effects/collect_burst/collect_burst_08.png` — 96×96

### `assets/effects/dust_puff/dust_puff`
- `assets/effects/dust_puff/dust_puff_01.png` — 1448×1086
- `assets/effects/dust_puff/dust_puff_02.png` — 1448×1086
- `assets/effects/dust_puff/dust_puff_03.png` — 1448×1086
- `assets/effects/dust_puff/dust_puff_04.png` — 32×24

### `assets/effects/lane_swoosh/lane_swoosh`
- `assets/effects/lane_swoosh/lane_swoosh_01.png` — 1448×1086
- `assets/effects/lane_swoosh/lane_swoosh_02.png` — 1448×1086
- `assets/effects/lane_swoosh/lane_swoosh_03.png` — 96×64
- `assets/effects/lane_swoosh/lane_swoosh_04.png` — 96×64

### `assets/effects/sparkle/sparkle`
- `assets/effects/sparkle/sparkle_01.png` — 1254×1254
- `assets/effects/sparkle/sparkle_02.png` — 1254×1254
- `assets/effects/sparkle/sparkle_03.png` — 16×16
- `assets/effects/sparkle/sparkle_04.png` — 16×16

### `assets/structures/platforms/grass_dirt_platform_long`
- `assets/structures/platforms/grass_dirt_platform_long.png` — 1361×274
- `assets/structures/platforms/grass_dirt_platform_long_left.png` — 2172×724
- `assets/structures/platforms/grass_dirt_platform_long_right.png` — 2172×724

### `assets/structures/platforms/platform_floating`
- `assets/structures/platforms/platform_floating.png` — 1448×1086
- `assets/structures/platforms/platform_floating_left.png` — 2172×724
- `assets/structures/platforms/platform_floating_right.png` — 2172×724

### `assets/terrain/blocks/grass_block_cube`
- `assets/terrain/blocks/grass_block_cube_01.png` — 887×1774
- `assets/terrain/blocks/grass_block_cube_02.png` — 1254×1254

### `assets/terrain/blocks/grass_dirt_block`
- `assets/terrain/blocks/grass_dirt_block_01.png` — 712×322
- `assets/terrain/blocks/grass_dirt_block_02.png` — 1056×876
- `assets/terrain/blocks/grass_dirt_block_left.png` — 1254×1254
- `assets/terrain/blocks/grass_dirt_block_right.png` — 1254×1254

### `assets/terrain/blocks/grass_dirt_block_flower`
- `assets/terrain/blocks/grass_dirt_block_flower_01.png` — 857×824
- `assets/terrain/blocks/grass_dirt_block_flower_02.png` — 896×927

### `assets/terrain/blocks/grass_dirt_step`
- `assets/terrain/blocks/grass_dirt_step_left.png` — 1086×1448
- `assets/terrain/blocks/grass_dirt_step_right.png` — 1254×1254

### `assets/terrain/road/lane_tiles/road_lane`
- `assets/terrain/road/lane_tiles/road_lane_left.png` — 526×2172
- `assets/terrain/road/lane_tiles/road_lane_right.png` — 445×2172

### `assets/terrain/road/shoulders/road_shoulder`
- `assets/terrain/road/shoulders/road_shoulder_left.png` — 375×2047
- `assets/terrain/road/shoulders/road_shoulder_right.png` — 278×2166


## Side-pair dimension mismatches (3)
Per-side variants disagree on canvas size. Engine renders both
through the same dispatcher at the same target scale, so the
mismatched half visually pops on the wrong side.

- `assets/terrain/blocks/grass_dirt_step_left.png` 1086×1448 ≠ `assets/terrain/blocks/grass_dirt_step_right.png` 1254×1254
- `assets/terrain/road/lane_tiles/road_lane_left.png` 526×2172 ≠ `assets/terrain/road/lane_tiles/road_lane_right.png` 445×2172
- `assets/terrain/road/shoulders/road_shoulder_left.png` 375×2047 ≠ `assets/terrain/road/shoulders/road_shoulder_right.png` 278×2166

## Suspicious aspect ratios (3)
Heuristic flags. Block sprites should be square-ish; walls wide;
flowers tall. An outlier likely means the file is mis-named.

- `assets/structures/stone_brick/stone_wall_stairs.png` (168×112, ratio 1.50) — expected wide (>1.6)
- `assets/structures/stone_brick/stone_wall_stairs_left.png` (168×112, ratio 1.50) — expected wide (>1.6)
- `assets/structures/stone_brick/stone_wall_stairs_right.png` (168×112, ratio 1.50) — expected wide (>1.6)

## Summary

- PNGs scanned: **373**
- Exact-content duplicate groups: **0** (0 files)
- Stem dim mismatches: **13**
- Side-pair dim mismatches: **3**
- Aspect-ratio flags: **3**
