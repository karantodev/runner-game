# Asset Semantic Action List

Generated 2026-05-29T23:21:03.074Z.
Phase 1 of the World Asset Semantics + Placement Rules task.

Buckets are *decision surfaces*, not auto-deletes — they tell the team
what to confirm, fix, or design. Run `node scripts/audit-assets.mjs --check`
to refresh.

## ✅ KEEP / ACTIVE (57)
Schema asset types that have a complete entry in `assetSemantics.js`. These
are the canonical placement assets.

- `bush_large` — decor · none · zones [side-left, side-right]
- `bush_large_with_purple_flowers` — decor · none · zones [side-left, side-right]
- `bush_with_purple_flowers` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `castle_far` — landmark · none · zones [background]
- `cloud_large` — background · none · zones [background]
- `dry_grass_obstacle` — obstacle · blocking · zones [road, side-left, side-right]
- `fence_wood_short` — decor · none · zones [side-left, side-right]
- `floating_platform` — platform · none · zones [side-left, side-right]
- `forest_far` — background · none · zones [background]
- `golden_flower` — pickup · collectible · zones [road, road-edge]
- `grass_dirt_block` — support · none · zones [side-left, side-right]
- `grass_dirt_platform_long` — platform · none · zones [side-left, side-right]
- `grass_dirt_step` — support · none · zones [side-left, side-right]
- `grass_dirt_step_left` — support · none · zones [side-left, side-right]
- `grass_dirt_wall` — support · none · zones [side-left, side-right]
- `grass_tuft` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `grass_tuft_large` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `grass_tuft_small` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `green_pipe` — support · none · zones [side-left, side-right]
- `greenhouse_far` — landmark · none · zones [background]
- `hanging_platform_vines` — platform · none · zones [side-left, side-right]
- `heart_full` — pickup · bonus · zones [road, road-edge]
- `leaf_clump_round` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `leaf_clump_small` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `low_branch_overhang` — obstacle · damaging · zones [road]
- `meadow_far` — background · none · zones [background]
- `mountains_far` — background · none · zones [background]
- `mountains_mid` — background · none · zones [background]
- `mushroom_blue_big` — decor · none · zones [side-left, side-right]
- `mushroom_red_big` — decor · none · zones [side-left, side-right]
- `planter_pot` — support · none · zones [side-left, side-right]
- `player_farmer` — scenery · none · zones [road]
- `power_double_pickup` — powerup · bonus · zones [road, road-edge]
- `power_magnet_pickup` — powerup · bonus · zones [road, road-edge]
- `power_mushroom_pickup` — powerup · bonus · zones [road, road-edge]
- `power_shield_pickup` — powerup · bonus · zones [road, road-edge]
- `purple_brick_platform_3` — platform · none · zones [side-left, side-right]
- `purple_brick_single` — support · none · zones [side-left, side-right]
- `purple_flower_single` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `question_block` — landmark · none · zones [side-left, side-right]
- `rare_orchid_pickup` — pickup · collectible · zones [road, road-edge]
- `road_lane_tile` — scenery · none · zones [road]
- `road_perspective_lines` — scenery · none · zones [road]
- `sky_gradient` — background · none · zones [background]
- `small_center_mushroom` — obstacle · blocking · zones [road]
- `speed_tree_pickup` — powerup · bonus · zones [road, road-edge]
- `spider_web_overhang` — obstacle · damaging · zones [road]
- `spiky_bush_obstacle` — obstacle · damaging · zones [road]
- `sprout_soil` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `stone_brick_single` — support · none · zones [side-left, side-right]
- `stone_obstacle` — obstacle · blocking · zones [road]
- `stone_wall_low` — support · none · zones [side-left, side-right]
- `stone_wall_stairs` — support · none · zones [side-left, side-right]
- `tree_round` — decor · none · zones [side-left, side-right]
- `vine_barrier` — obstacle · damaging · zones [road]
- `wheat_tuft` — decor · none · zones [side-left, side-right, road-edge, foreground]
- `yellow_flower_small` — decor · none · zones [side-left, side-right, road-edge, foreground]

## ⚠ NEEDS SEMANTIC CLASSIFICATION (0)
Used in `sceneSchema.js` but no entry in `assetSemantics.js`. Add an entry
to the registry before the placement-rules pass (Phase 2) lands.

- _(none — registry covers every schema type)_

## 🛑 DEPRECATED (3)
Registered key whose file no longer ships, and the engine has migrated.
Safe to remove from `gameConfig.assets` in a follow-up cleanup PR.

- `iconComboX2` → `assets/ui/icons/icon_combo_x2.png`
- `iconComboX3` → `assets/ui/icons/icon_combo_x3.png`
- `iconComboX5` → `assets/ui/icons/icon_combo_x5.png`

## 🟡 MISSING / NEED DESIGN (11)
Keys registered in `gameConfig.assets` whose file is not on disk.

**Waiting on designer (6)**
- `orchidGoldSparkle01` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png`
- `orchidGoldSparkle02` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png`
- `orchidGoldSparkle03` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png`
- `orchidGoldSparkle04` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png`
- `orchidGoldCollect05` → expected at `assets/collectibles/orchid_gold/orchid_gold_collect_05.png`
- `orchidGoldCollect06` → expected at `assets/collectibles/orchid_gold/orchid_gold_collect_06.png`

**Engine path migration (5)**
- `orchidBlueRare` → registered path `assets/collectibles/orchid_blue_rare/orchid_blue_rare.png` doesn't match disk canonical
- `orchidBlueRareHalo` → registered path `assets/collectibles/orchid_blue_rare/orchid_blue_rare_halo.png` doesn't match disk canonical
- `pickupMagnet` → registered path `assets/pickups/magnet/magnet.png` doesn't match disk canonical
- `pickupShield` → registered path `assets/pickups/shield/shield.png` doesn't match disk canonical
- `pickupScoreX2` → registered path `assets/pickups/score_x2/score_x2.png` doesn't match disk canonical

## 🛑 DUPLICATE / OVERDELIVERED (20)
Files on disk above brief target (STOP list) or duplicates of canonical
files. **Do not register**; move new arrivals to `_source/` when they
land at non-canonical paths.

- assets/decor/small/grass/grass_tuft_large.png
- assets/decor/small/grass/grass_tuft_small.png
- assets/effects/dust/dust_burst_01.png
- assets/effects/dust/dust_burst_02.png
- assets/effects/dust/dust_burst_03.png
- assets/effects/dust/dust_burst_04.png
- assets/player/farmer_jump/player_farmer_jump_07.png
- assets/player/farmer_jump/player_farmer_jump_08.png
- assets/player/farmer_jump/player_farmer_jump_09.png
- assets/player/farmer_jump/player_farmer_jump_10.png
- assets/player/farmer_jump/player_farmer_jump_11.png
- assets/player/farmer_jump/player_farmer_jump_12.png
- assets/player/farmer_jump/player_farmer_jump_13.png
- assets/player/farmer_jump/player_farmer_jump_14.png
- assets/player/farmer_jump/player_farmer_jump_15.png
- assets/player/farmer_jump/player_farmer_jump_16.png
- assets/player/farmer_run/player_farmer_run_09.png
- assets/player/farmer_run/player_farmer_run_10.png
- assets/player/farmer_run/player_farmer_run_11.png
- assets/player/farmer_run/player_farmer_run_12.png

## 🟡 NEEDS SIDE PAIR / WIRING (9)
`_left.png` / `_right.png` files on disk that are not yet wired into the
dispatcher. Phase-2 task: extend `SIDE_AWARE_TYPES` + dispatcher branches.

- assets/decor/large/fence/fence_wood_short_left.png
- assets/decor/large/fence/fence_wood_short_right.png
- assets/structures/bricks/purple_brick_single_left.png
- assets/structures/bricks/purple_brick_single_right.png
- assets/structures/platforms/grass_dirt_platform_long_left.png
- assets/structures/platforms/grass_dirt_platform_long_right.png
- assets/structures/platforms/platform_hanging_vines_left.png
- assets/structures/platforms/platform_hanging_vines_right.png
- assets/terrain/blocks/grass_dirt_step_right.png

## 🟡 UNUSED BUT VALID (103)
Files on disk that are not duplicates / overdelivery — they are real
alternates or canonical files waiting on a renderer consumer. Register
only when the engine has a use for them (per the intake rules).

- ALT_VARIANT: 35
- PENDING_REGISTRATION: 68

## 🎬 PLAYER FRAMES (26)
Canonical 64×96. OK 26 · FAIL 0 · MISSING 0.
