# Asset Missing-Art / Reject-Art List

Generated 2026-05-30T04:44:08.540Z.
Derived from `ASSET_SEMANTICS` + audit buckets. Designer hand-off doc.

## ✅ A — NO NEED / DUPLICATE / REJECT (23)
Don't draw or re-export these. Move new arrivals at the same path to `_source/`.

### Overdelivery — STOP LIST (20)
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

### Deprecated keys (3)
- `iconComboX2` → `assets/ui/icons/icon_combo_x2.png`
- `iconComboX3` → `assets/ui/icons/icon_combo_x3.png`
- `iconComboX5` → `assets/ui/icons/icon_combo_x5.png`

## 🟡 B — MISSING CRITICAL (21)
Engine declares these are needed; either no file ships, or the side-aware
pair is incomplete. Priority order: side-pair gaps first, then dead keys.

### Missing side-aware pairs (10)
Each entry below declares `orientationType: 'side-aware'` in `assetSemantics.js`.
Engine needs BOTH `<key>Left` and `<key>Right` registered + on disk.

- `grass_dirt_step` — missing: **Right**
- `grass_dirt_wall` — missing: **Left + Right**
- `grass_dirt_platform_long` — missing: **Left + Right**
- `purple_brick_single` — missing: **Left + Right**
- `purple_brick_platform_3` — missing: **Left + Right**
- `question_block` — missing: **Left + Right**
- `green_pipe` — missing: **Left + Right**
- `floating_platform` — missing: **Left + Right**
- `hanging_platform_vines` — missing: **Left + Right**
- `fence_wood_short` — missing: **Left + Right**

### Waiting on designer (6)
- `orchidGoldSparkle01` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png`
- `orchidGoldSparkle02` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png`
- `orchidGoldSparkle03` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png`
- `orchidGoldSparkle04` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png`
- `orchidGoldCollect05` → expected at `assets/collectibles/orchid_gold/orchid_gold_collect_05.png`
- `orchidGoldCollect06` → expected at `assets/collectibles/orchid_gold/orchid_gold_collect_06.png`

### Engine path migration needed (5)
- `orchidBlueRare` → `assets/collectibles/orchid_blue_rare/orchid_blue_rare.png`
- `orchidBlueRareHalo` → `assets/collectibles/orchid_blue_rare/orchid_blue_rare_halo.png`
- `pickupMagnet` → `assets/pickups/magnet/magnet.png`
- `pickupShield` → `assets/pickups/shield/shield.png`
- `pickupScoreX2` → `assets/pickups/score_x2/score_x2.png`

## 🟢 E — LOW PRIORITY OPTIONAL (35)
Alt-style variants on disk without an engine consumer. Could enrich variety
in a future composition-template pass; not blocking gameplay today.

- assets/effects/bursts/light_burst_gradient_01.png
- assets/effects/bursts/light_burst_sun_01.png
- assets/effects/dust/dust_cloud_01.png
- assets/effects/dust/dust_cloud_02.png
- assets/effects/dust/dust_puffs_01.png
- assets/effects/dust/dust_smoke_01.png
- assets/effects/effect_burst_gold_01.png
- assets/effects/effect_magic_circle_glow_01.png
- assets/effects/effect_star_burst_small_01.png
- assets/effects/effect_star_small_01.png
- assets/effects/light/light_streak_01.png
- assets/effects/magic/magic_glow_rainbow_01.png
- assets/effects/trails/light_streak_01.png
- assets/effects/trails/light_sweep_01.png
- assets/effects/trails/light_trail_motion_01.png
- _(20 more)_

## 📦 F — READY TO DELETE / ARCHIVE (20)
Same files as bucket A; called out separately so an archival sweep has
a single target list. Move to `assets/_source/rejected_*` rather than
deleting outright — the designer may want to revisit.

## ✅ G — ACTIVE USED IN GAME (25)
AssetTypes referenced by at least one prefab / HERO_LAYOUT / scenery
frame today. Deletion-protected for the foreseeable future.

- `bush_large`
- `bush_large_with_purple_flowers`
- `bush_with_purple_flowers`
- `dry_grass_obstacle`
- `fence_wood_short`
- `floating_platform`
- `grass_dirt_block`
- `grass_dirt_platform_long`
- `grass_dirt_step_left`
- `grass_dirt_wall`
- `grass_tuft`
- `grass_tuft_large`
- `grass_tuft_small`
- `green_pipe`
- `hanging_platform_vines`
- `leaf_clump_round`
- `leaf_clump_small`
- `mushroom_blue_big`
- `mushroom_red_big`
- `purple_brick_single`
- `purple_flower_single`
- `question_block`
- `sprout_soil`
- `tree_round`
- `yellow_flower_small`

### Registered but not used by any prefab (32)
In `assetSemantics.js` but not referenced by current scene/prefab data.
Either wire into a prefab or remove the semantic entry.

- `castle_far`
- `cloud_large`
- `forest_far`
- `golden_flower`
- `grass_dirt_step`
- `greenhouse_far`
- `heart_full`
- `low_branch_overhang`
- `meadow_far`
- `mountains_far`
- `mountains_mid`
- `planter_pot`
- `player_farmer`
- `power_double_pickup`
- `power_magnet_pickup`
- `power_mushroom_pickup`
- `power_shield_pickup`
- `purple_brick_platform_3`
- `rare_orchid_pickup`
- `road_lane_tile`
- `road_perspective_lines`
- `sky_gradient`
- `small_center_mushroom`
- `speed_tree_pickup`
- `spider_web_overhang`
- `spiky_bush_obstacle`
- `stone_brick_single`
- `stone_obstacle`
- `stone_wall_low`
- `stone_wall_stairs`
- `vine_barrier`
- `wheat_tuft`
