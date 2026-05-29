# Asset Audit Report

Generated: 2026-05-29

Source-of-truth: `assets/` tree vs `src/config/gameConfig.js → GAME_CONFIG.assets` registry.

## Totals

| Metric | Count |
|---|---|
| Files in `assets/` (any extension) | 407 |
| Registered keys in gameConfig | 277 |
| Files reachable from gameConfig | 277 |
| **Unregistered PNGs** | **153** |
| **Dead keys (config → missing file)** | **28** |
| Duplicate / near-duplicate groups (≥ 3 files / stem) | 23 |
| Side-aware pairs (`_left` + `_right`) | 16 |
| **Side-aware orphans** (one half shipped) | **1** |

## Buckets by category

| Category | File count |
|---|---|
| `assets/effects` | 59 |
| `assets/player` | 54 |
| `assets/ui` | 50 |
| `assets/structures` | 40 |
| `assets/terrain` | 36 |
| `assets/background` | 31 |
| `assets/decor` | 24 |
| `assets/collectibles` | 20 |
| `assets/obstacles` | 19 |
| `assets/powerups` | 17 |
| `assets/environment` | 11 |
| `assets/misc` | 10 |
| `assets/pickups` | 9 |
| `assets/blocks` | 8 |
| `assets/decor\_small` | 7 |
| `assets/platforms` | 6 |
| `assets/decor\_large` | 5 |
| `assets/.DS\_Store` | 1 |

## ⚠️ Dead keys (gameConfig key → missing file)

These keys ARE registered in `GAME_CONFIG.assets` but the file is gone from disk. Classified per heuristic:

- **ANIM_PENDING_DESIGNER** — expected anim sheet frame; brief P2 priority (keep key, ship frame)
- **PATH_MISMATCH** — a file with the same name exists at a different path; engine path needs migration
- **DEPRECATED** — legacy key, no obvious match on disk; safe to remove from `gameConfig.assets`

| Key | Path | Action |
|---|---|---|
| `orchidGoldSparkle01` | `assets/collectibles/orchid\_gold/orchid\_gold\_sparkle\_01.png` | **ANIM_PENDING_DESIGNER** |
| `orchidGoldSparkle02` | `assets/collectibles/orchid\_gold/orchid\_gold\_sparkle\_02.png` | **ANIM_PENDING_DESIGNER** |
| `orchidGoldSparkle03` | `assets/collectibles/orchid\_gold/orchid\_gold\_sparkle\_03.png` | **ANIM_PENDING_DESIGNER** |
| `orchidGoldSparkle04` | `assets/collectibles/orchid\_gold/orchid\_gold\_sparkle\_04.png` | **ANIM_PENDING_DESIGNER** |
| `orchidGoldCollect05` | `assets/collectibles/orchid\_gold/orchid\_gold\_collect\_05.png` | **ANIM_PENDING_DESIGNER** |
| `orchidGoldCollect06` | `assets/collectibles/orchid\_gold/orchid\_gold\_collect\_06.png` | **ANIM_PENDING_DESIGNER** |
| `orchidGoldCollect07` | `assets/collectibles/orchid\_gold/orchid\_gold\_collect\_07.png` | **ANIM_PENDING_DESIGNER** |
| `orchidGoldCollect08` | `assets/collectibles/orchid\_gold/orchid\_gold\_collect\_08.png` | **ANIM_PENDING_DESIGNER** |
| `dustPuff04` | `assets/effects/dust\_puff/dust\_puff\_04.png` | **ANIM_PENDING_DESIGNER** |
| `jumpDust01` | `assets/effects/jump\_dust/jump\_dust\_01.png` | **ANIM_PENDING_DESIGNER** |
| `jumpDust02` | `assets/effects/jump\_dust/jump\_dust\_02.png` | **ANIM_PENDING_DESIGNER** |
| `jumpDust03` | `assets/effects/jump\_dust/jump\_dust\_03.png` | **ANIM_PENDING_DESIGNER** |
| `jumpDust04` | `assets/effects/jump\_dust/jump\_dust\_04.png` | **ANIM_PENDING_DESIGNER** |
| `hitFlash01` | `assets/effects/hit\_flash/hit\_flash\_01.png` | **ANIM_PENDING_DESIGNER** |
| `hitFlash02` | `assets/effects/hit\_flash/hit\_flash\_02.png` | **ANIM_PENDING_DESIGNER** |
| `hitFlash03` | `assets/effects/hit\_flash/hit\_flash\_03.png` | **ANIM_PENDING_DESIGNER** |
| `hitFlash04` | `assets/effects/hit\_flash/hit\_flash\_04.png` | **ANIM_PENDING_DESIGNER** |
| `laneSwoosh03` | `assets/effects/lane\_swoosh/lane\_swoosh\_03.png` | **ANIM_PENDING_DESIGNER** |
| `laneSwoosh04` | `assets/effects/lane\_swoosh/lane\_swoosh\_04.png` | **ANIM_PENDING_DESIGNER** |
| `collectBurst08` | `assets/effects/collect\_burst/collect\_burst\_08.png` | **ANIM_PENDING_DESIGNER** |
| `iconComboX2` | `assets/ui/icons/icon\_combo\_x2.png` | **DEPRECATED** |
| `iconComboX3` | `assets/ui/icons/icon\_combo\_x3.png` | **DEPRECATED** |
| `iconComboX5` | `assets/ui/icons/icon\_combo\_x5.png` | **DEPRECATED** |
| `orchidBlueRare` | `assets/collectibles/orchid\_blue\_rare/orchid\_blue\_rare.png` | **PATH_MISMATCH** |
| `orchidBlueRareHalo` | `assets/collectibles/orchid\_blue\_rare/orchid\_blue\_rare\_halo.png` | **PATH_MISMATCH** |
| `pickupMagnet` | `assets/pickups/magnet/magnet.png` | **PATH_MISMATCH** |
| `pickupShield` | `assets/pickups/shield/shield.png` | **PATH_MISMATCH** |
| `pickupScoreX2` | `assets/pickups/score\_x2/score\_x2.png` | **PATH_MISMATCH** |

## ⚠️ Side-aware orphans

Files shipped as one half of a per-side pair (Golden Rule § 1.4.1). The engine canvas-flips orphans, reversing the sun-upper-right lighting on the unshipped side. Ship the partner or move both to `_source/`.

| Base name | Left | Right |
|---|---|---|
| assets/terrain/road/kit/lane\_divider\_center | ❌ | ✅ |

## Duplicate / near-duplicate groups (heuristic)

Heuristic stem-grouping: files whose names collapse to the same stem after stripping `_NN`, `_alt`, size suffixes, and `_left`/`_right`. ≥ 3 files per stem are flagged as candidates for designer review. Each group may contain LEGITIMATE variants (anim frames, side pairs, LODs) — the designer / dev review picks which to keep.

### `assets/player` — stem `player\_farmer\_jump` (16 files)

```
assets/player/farmer_jump/player_farmer_jump_01.png
assets/player/farmer_jump/player_farmer_jump_02.png
assets/player/farmer_jump/player_farmer_jump_03.png
assets/player/farmer_jump/player_farmer_jump_04.png
assets/player/farmer_jump/player_farmer_jump_05.png
assets/player/farmer_jump/player_farmer_jump_06.png
assets/player/farmer_jump/player_farmer_jump_07.png
assets/player/farmer_jump/player_farmer_jump_08.png
assets/player/farmer_jump/player_farmer_jump_09.png
assets/player/farmer_jump/player_farmer_jump_10.png
assets/player/farmer_jump/player_farmer_jump_11.png
assets/player/farmer_jump/player_farmer_jump_12.png
assets/player/farmer_jump/player_farmer_jump_13.png
assets/player/farmer_jump/player_farmer_jump_14.png
assets/player/farmer_jump/player_farmer_jump_15.png
assets/player/farmer_jump/player_farmer_jump_16.png
```

### `assets/effects` — stem `sparkle` (13 files)

```
assets/effects/magic/sparkle_01.png
assets/effects/magic/sparkle_02.png
assets/effects/sparkle/sparkle_01.png
assets/effects/sparkle/sparkle_02.png
assets/effects/sparkle/sparkle_03.png
assets/effects/sparkle/sparkle_04.png
assets/effects/sparkle/sparkle_05.png
assets/effects/sparkle_01.png
assets/effects/sparkle_02.png
assets/effects/sparkle_03.png
assets/effects/sparkle_04.png
assets/effects/sparkles/sparkle_small_01.png
assets/effects/sparkles/sparkle_small_02.png
```

### `assets/player` — stem `player\_farmer\_run` (12 files)

```
assets/player/farmer_run/player_farmer_run_01.png
assets/player/farmer_run/player_farmer_run_02.png
assets/player/farmer_run/player_farmer_run_03.png
assets/player/farmer_run/player_farmer_run_04.png
assets/player/farmer_run/player_farmer_run_05.png
assets/player/farmer_run/player_farmer_run_06.png
assets/player/farmer_run/player_farmer_run_07.png
assets/player/farmer_run/player_farmer_run_08.png
assets/player/farmer_run/player_farmer_run_09.png
assets/player/farmer_run/player_farmer_run_10.png
assets/player/farmer_run/player_farmer_run_11.png
assets/player/farmer_run/player_farmer_run_12.png
```

### `assets/effects` — stem `collect\_burst` (7 files)

```
assets/effects/collect_burst/collect_burst_01.png
assets/effects/collect_burst/collect_burst_02.png
assets/effects/collect_burst/collect_burst_03.png
assets/effects/collect_burst/collect_burst_04.png
assets/effects/collect_burst/collect_burst_05.png
assets/effects/collect_burst/collect_burst_06.png
assets/effects/collect_burst/collect_burst_07.png
```

### `assets/background` — stem `cloud` (6 files)

```
assets/background/cloud_large_01.png
assets/background/cloud_medium_01.png
assets/background/cloud_small_01.png
assets/background/clouds/cloud_large.png
assets/background/clouds/cloud_medium.png
assets/background/clouds/cloud_small.png
```

### `assets/structures` — stem `question\_block` (5 files)

```
assets/structures/question_block/question_block.png
assets/structures/question_block/question_block_01.png
assets/structures/question_block/question_block_02.png
assets/structures/question_block/question_block_03.png
assets/structures/question_block/question_block_04.png
```

### `assets/collectibles` — stem `orchid\_gold\_collect` (4 files)

```
assets/collectibles/orchid_gold/orchid_gold_collect_01.png
assets/collectibles/orchid_gold/orchid_gold_collect_02.png
assets/collectibles/orchid_gold/orchid_gold_collect_03.png
assets/collectibles/orchid_gold/orchid_gold_collect_04.png
```

### `assets/decor` — stem `grass\_tuft` (4 files)

```
assets/decor/grass_tuft_medium_01.png
assets/decor/grass_tuft_small_01.png
assets/decor/small/grass/grass_tuft_large.png
assets/decor/small/grass/grass_tuft_small.png
```

### `assets/effects` — stem `dust\_burst` (4 files)

```
assets/effects/dust/dust_burst_01.png
assets/effects/dust/dust_burst_02.png
assets/effects/dust/dust_burst_03.png
assets/effects/dust/dust_burst_04.png
```

### `assets/effects` — stem `dust\_puff` (4 files)

```
assets/effects/dust_puff/dust_puff_01.png
assets/effects/dust_puff/dust_puff_02.png
assets/effects/dust_puff/dust_puff_03.png
assets/effects/dust_puff_small.png
```

### `assets/obstacles` — stem `vine\_barrier` (4 files)

```
assets/obstacles/vine_barrier/vine_barrier_01.png
assets/obstacles/vine_barrier/vine_barrier_02.png
assets/obstacles/vine_barrier/vine_barrier_03.png
assets/obstacles/vine_barrier/vine_barrier_04.png
```

### `assets/obstacles` — stem `vine\_barrier\_single` (4 files)

```
assets/obstacles/vine_barrier/vine_barrier_single_01.png
assets/obstacles/vine_barrier/vine_barrier_single_02.png
assets/obstacles/vine_barrier/vine_barrier_single_03.png
assets/obstacles/vine_barrier/vine_barrier_single_04.png
```

### `assets/player` — stem `player\_farmer\_crouch` (4 files)

```
assets/player/farmer_crouch/player_farmer_crouch_01.png
assets/player/farmer_crouch/player_farmer_crouch_02.png
assets/player/farmer_crouch/player_farmer_crouch_03.png
assets/player/farmer_crouch/player_farmer_crouch_04.png
```

### `assets/player` — stem `player\_farmer\_hit` (4 files)

```
assets/player/farmer_hit/player_farmer_hit_01.png
assets/player/farmer_hit/player_farmer_hit_02.png
assets/player/farmer_hit/player_farmer_hit_03.png
assets/player/farmer_hit/player_farmer_hit_04.png
```

### `assets/player` — stem `player\_farmer\_idle` (4 files)

```
assets/player/farmer_idle/player_farmer_idle_01.png
assets/player/farmer_idle/player_farmer_idle_02.png
assets/player/farmer_idle/player_farmer_idle_03.png
assets/player/farmer_idle/player_farmer_idle_04.png
```

### `assets/terrain` — stem `grass\_dirt\_block` (4 files)

```
assets/terrain/blocks/grass_dirt_block_01.png
assets/terrain/blocks/grass_dirt_block_02.png
assets/terrain/blocks/grass_dirt_block_left.png
assets/terrain/blocks/grass_dirt_block_right.png
```

### `assets/obstacles` — stem `planter\_pot` (3 files)

```
assets/obstacles/planter_pot/planter_pot.png
assets/obstacles/planter_pot/planter_pot_left.png
assets/obstacles/planter_pot/planter_pot_right.png
```

### `assets/structures` — stem `grass\_dirt\_platform\_long` (3 files)

```
assets/structures/platforms/grass_dirt_platform_long.png
assets/structures/platforms/grass_dirt_platform_long_left.png
assets/structures/platforms/grass_dirt_platform_long_right.png
```

### `assets/structures` — stem `platform\_floating` (3 files)

```
assets/structures/platforms/platform_floating.png
assets/structures/platforms/platform_floating_left.png
assets/structures/platforms/platform_floating_right.png
```

### `assets/structures` — stem `platform\_hanging\_vines` (3 files)

```
assets/structures/platforms/platform_hanging_vines.png
assets/structures/platforms/platform_hanging_vines_left.png
assets/structures/platforms/platform_hanging_vines_right.png
```

### `assets/structures` — stem `stone\_brick\_single` (3 files)

```
assets/structures/stone_brick/stone_brick_single.png
assets/structures/stone_brick/stone_brick_single_left.png
assets/structures/stone_brick/stone_brick_single_right.png
```

### `assets/structures` — stem `stone\_wall\_low` (3 files)

```
assets/structures/stone_brick/stone_wall_low.png
assets/structures/stone_brick/stone_wall_low_left.png
assets/structures/stone_brick/stone_wall_low_right.png
```

### `assets/structures` — stem `stone\_wall\_stairs` (3 files)

```
assets/structures/stone_brick/stone_wall_stairs.png
assets/structures/stone_brick/stone_wall_stairs_left.png
assets/structures/stone_brick/stone_wall_stairs_right.png
```

## Unregistered PNGs (file exists, no gameConfig key)

Classified per heuristic. Sorted by classification, then by category:

- **ANIM_PENDING_WIRE** — anim sheet frame; engine has a wiring slot, registration is the unblocker
- **SIDE_PAIR_PENDING** — half of a delivered `_left`/`_right` pair; needs gameConfig key + SIDE_AWARE_TYPES entry
- **DESIGNER_OVERDELIVERY** — falls inside a duplicate-group stem; STOP list candidate (see brief)
- **ALT_VARIANT** — alt path / bonus shipment; wire optional
- **PENDING_REGISTRATION** — default; review + wire OR move to `_source/`

### ANIM_PENDING_WIRE (13)

```
assets/effects/magic/sparkle_01.png
assets/effects/magic/sparkle_02.png
assets/effects/sparkle/sparkle_05.png
assets/effects/sparkle/sparkle_gold_01.png
assets/effects/sparkle_01.png
assets/effects/sparkle_02.png
assets/effects/sparkle_03.png
assets/effects/sparkle_04.png
assets/effects/sparkles/sparkle_small_01.png
assets/effects/sparkles/sparkle_small_02.png
assets/effects/sparkles/sparkle_star_01.png
assets/effects/sparkles/sparkle_star_02.png
assets/effects/sparkles/sparkle_star_gold_01.png
```

### SIDE_PAIR_PENDING (17)

```
assets/decor/large/fence/fence_wood_short_left.png
assets/decor/large/fence/fence_wood_short_right.png
assets/obstacles/planter_pot/planter_pot_left.png
assets/obstacles/planter_pot/planter_pot_right.png
assets/structures/bricks/purple_brick_single_left.png
assets/structures/bricks/purple_brick_single_right.png
assets/structures/platforms/grass_dirt_platform_long_left.png
assets/structures/platforms/grass_dirt_platform_long_right.png
assets/structures/platforms/platform_hanging_vines_left.png
assets/structures/platforms/platform_hanging_vines_right.png
assets/structures/stone_brick/stone_brick_single_left.png
assets/structures/stone_brick/stone_brick_single_right.png
assets/structures/stone_brick/stone_wall_low_left.png
assets/structures/stone_brick/stone_wall_low_right.png
assets/structures/stone_brick/stone_wall_stairs_left.png
assets/structures/stone_brick/stone_wall_stairs_right.png
assets/terrain/blocks/grass_dirt_step_right.png
```

### DESIGNER_OVERDELIVERY (20)

```
assets/decor/small/grass/grass_tuft_large.png
assets/decor/small/grass/grass_tuft_small.png
assets/effects/dust/dust_burst_01.png
assets/effects/dust/dust_burst_02.png
assets/effects/dust/dust_burst_03.png
assets/effects/dust/dust_burst_04.png
assets/player/farmer_jump/player_farmer_jump_07.png
assets/player/farmer_jump/player_farmer_jump_08.png
assets/player/farmer_jump/player_farmer_jump_09.png
assets/player/farmer_jump/player_farmer_jump_10.png
assets/player/farmer_jump/player_farmer_jump_11.png
assets/player/farmer_jump/player_farmer_jump_12.png
assets/player/farmer_jump/player_farmer_jump_13.png
assets/player/farmer_jump/player_farmer_jump_14.png
assets/player/farmer_jump/player_farmer_jump_15.png
assets/player/farmer_jump/player_farmer_jump_16.png
assets/player/farmer_run/player_farmer_run_09.png
assets/player/farmer_run/player_farmer_run_10.png
assets/player/farmer_run/player_farmer_run_11.png
assets/player/farmer_run/player_farmer_run_12.png
```

### ALT_VARIANT (35)

```
assets/effects/bursts/light_burst_gradient_01.png
assets/effects/bursts/light_burst_sun_01.png
assets/effects/dust/dust_cloud_01.png
assets/effects/dust/dust_cloud_02.png
assets/effects/dust/dust_puffs_01.png
assets/effects/dust/dust_smoke_01.png
assets/effects/effect_burst_gold_01.png
assets/effects/effect_magic_circle_glow_01.png
assets/effects/effect_star_burst_small_01.png
assets/effects/effect_star_small_01.png
assets/effects/light/light_streak_01.png
assets/effects/magic/magic_glow_rainbow_01.png
assets/effects/trails/light_streak_01.png
assets/effects/trails/light_sweep_01.png
assets/effects/trails/light_trail_motion_01.png
assets/effects/trails/light_trail_yellow_01.png
assets/platforms/platform_grass_small_01.png
assets/platforms/platform_grass_vines_01.png
assets/powerups/magic_circle_glow_01.png
assets/powerups/magnet_gold_aura_01.png
assets/powerups/medal_x2_gold_01.png
assets/powerups/powerup_magnet_01.png
assets/powerups/powerup_multiplier_x2_medal_01.png
assets/powerups/powerup_shield_orchid_01.png
assets/powerups/powerup_star_gold_01.png
assets/powerups/shield_orchid_glow_01.png
assets/powerups/star_burst_gold_01.png
assets/powerups/star_glint_small_01.png
assets/powerups/star_gold_01.png
assets/powerups/star_gold_small_01.png
assets/structures/platforms/platform_grass_patch_01.png
assets/structures/platforms/platform_grass_small_01.png
assets/structures/platforms/platform_grass_vines_01.png
assets/terrain/blocks/grass_block_cube_01.png
assets/terrain/blocks/grass_block_cube_02.png
```

### PENDING_REGISTRATION (68)

```
assets/background/clouds/clouds.png
assets/background/mountains/mountains-far.png
assets/collectibles/orchid_blue/orchid_blue_rare_halo.png
assets/collectibles/orchid_blue_rare.png
assets/collectibles/orchid_gold.png
assets/decor/large/bushes/bush_large.png
assets/decor/large/bushes/bush_large_flowers.png
assets/decor/large/fence/fence_corner.png
assets/decor/large/fence/fence_short.png
assets/decor/large/mushrooms/mushroom_purple_big.png
assets/decor/large/mushrooms/mushroom_red_big.png
assets/decor/large/trees/tree_round.png
assets/decor/large/trees/tree_tall.png
assets/decor/small/bushes/bush_small.png
assets/decor/small/bushes/bush_small_flowers.png
assets/decor/small/flowers/flower_violet_cluster.png
assets/decor/small/flowers/flower_yellow_decor.png
assets/decor/small/leaves/leaf_clump_round.png
assets/decor/small/plants/sprout_soil.png
assets/effects/effect_gold_spark_burst.png
assets/effects/effect_small_star_burst.png
assets/effects/effect_small_star_glint.png
assets/obstacles/mushroom_small/mushroom_small_red.png
assets/pickups/aura/pickup_magnet_aura.png
assets/pickups/aura/pickup_medal_x2_gold.png
assets/pickups/aura/pickup_shield_orchid_aura.png
assets/pickups/aura/pickup_star_gold_aura.png
assets/pickups/pickup_magnet.png
assets/pickups/pickup_score_x2.png
assets/pickups/pickup_shield.png
assets/platforms/platform_floating.png
assets/platforms/platform_grass_small.png
assets/platforms/platform_grass_vines.png
assets/platforms/platform_hanging_vines.png
assets/player/farmer_remaining_batch/01_sadovyy_truzhenik_v_piksel_arte.png
assets/player/farmer_remaining_batch/02_stilnyy_pikselnyy_personazh_v_dvizhenii.png
assets/player/farmer_remaining_batch/03_fermer_v_pikselnom_stile.png
assets/player/farmer_remaining_batch/04_begushchiy_s_lopatoy_v_rukakh.png
assets/player/farmer_remaining_batch/05_fermer_s_lopatoy_v_piksel_arte.png
assets/player/farmer_unfinished_batch/крючок_для_садоводства_в_стиле_пиксель_арт.png
assets/player/farmer_unfinished_batch/персонаж_в_прыжке_с_лопатой.png
assets/player/farmer_unfinished_batch/персонаж_с_лопатой_в_позе_наклона.png
assets/player/farmer_unfinished_batch/пиксельный_герой_в_прыжке.png
assets/player/farmer_unfinished_batch/садовод_с_маленькой_лопатой.png
assets/player/farmer_unfinished_batch/фермер_в_движении_с_лопатой.png
assets/player/farmer_unfinished_batch/фермер_в_наклоне_с_лопатой.png
assets/player/farmer_unfinished_batch/фермер_в_прыжке_с_лопатой.png
assets/powerups/powerup_gold_star.png
assets/powerups/powerup_magic_circle_glow.png
assets/powerups/powerup_magnet_gold_aura.png
assets/powerups/powerup_medal_x2_gold.png
assets/powerups/powerup_orchid_shield_glow.png
assets/structures/fences/fence_corner.png
assets/structures/fences/fence_short.png
assets/structures/greenhouse/greenhouse_far.png
assets/structures/greenhouse/greenhouse_near.png
assets/terrain/blocks/grass_block_column_tall.png
assets/terrain/blocks/grass_block_front_rect.png
assets/terrain/blocks/stone_block_mossy_cube.png
assets/ui/buttons/button_small_gray.png
assets/ui/cards/tool_shovel_card.png
assets/ui/hud/hud_hearts_panel_empty.png
assets/ui/hud/hud_panel_long.png
assets/ui/hud/hud_panel_vines.png
assets/ui/icons/battery_green.png
assets/ui/icons/heart_dark.png
assets/ui/icons/heart_red.png
assets/ui/panels/panel_large_dark.png
```

