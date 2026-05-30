# Asset Cleanup Proposal

Generated 2026-05-30T18:53:35.147Z.

**Nothing is removed automatically.** This is a decision surface.
Each section names assets; the human reviewer marks approval.

## Safe to keep (no action)

Buckets A + B + C. 60 explicit + 30 dynamic + 50 intentional-unused = 140 files. See production manifest.

## Safe to archive after approval (bucket F + G, 90 files)

Move to `assets/_source/rejected_YYYY_MM_DD/` after sign-off.

### Duplicate non-canonical copies (34)
- `assets/background/clouds/clouds.png` — same SHA as a canonical sibling
- `assets/collectibles/orchid_gold/orchid_gold_main.png` — same SHA as a canonical sibling
- `assets/effects/effect_gold_spark_burst.png` — same SHA as a canonical sibling
- `assets/effects/effect_magic_circle_glow_01.png` — same SHA as a canonical sibling
- `assets/effects/effect_star_burst_small_01.png` — same SHA as a canonical sibling
- `assets/effects/effect_star_small_01.png` — same SHA as a canonical sibling
- `assets/effects/sparkle/sparkle_05.png` — same SHA as a canonical sibling
- `assets/effects/sparkle_01.png` — same SHA as a canonical sibling
- `assets/effects/sparkle_03.png` — same SHA as a canonical sibling
- `assets/effects/sparkle_04.png` — same SHA as a canonical sibling
- `assets/platforms/platform_grass_small.png` — same SHA as a canonical sibling
- `assets/platforms/platform_grass_small_01.png` — same SHA as a canonical sibling
- `assets/platforms/platform_grass_vines.png` — same SHA as a canonical sibling
- `assets/platforms/platform_hanging_vines.png` — same SHA as a canonical sibling
- `assets/powerups/magic_circle_glow_01.png` — same SHA as a canonical sibling
- `assets/powerups/magnet_gold_aura_01.png` — same SHA as a canonical sibling
- `assets/powerups/medal_x2_gold_01.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_gold_star.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_magic_circle_glow.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_magnet_01.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_magnet_gold_aura.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_medal_x2_gold.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_multiplier_x2_medal_01.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_orchid_shield_glow.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_shield_orchid_01.png` — same SHA as a canonical sibling
- `assets/powerups/powerup_star_gold_01.png` — same SHA as a canonical sibling
- `assets/powerups/shield_orchid_glow_01.png` — same SHA as a canonical sibling
- `assets/powerups/star_burst_gold_01.png` — same SHA as a canonical sibling
- `assets/powerups/star_glint_small_01.png` — same SHA as a canonical sibling
- `assets/powerups/star_gold_01.png` — same SHA as a canonical sibling
- _(4 more)_

### Overdelivery (56)
- `assets/collectibles/orchid_gold.png`
- `assets/effects/dust/dust_burst_01.png`
- `assets/effects/dust/dust_burst_02.png`
- `assets/effects/dust/dust_burst_03.png`
- `assets/effects/dust/dust_burst_04.png`
- `assets/effects/dust/dust_cloud_01.png`
- `assets/effects/dust/dust_cloud_02.png`
- `assets/effects/dust/dust_puffs_01.png`
- `assets/effects/dust/dust_smoke_01.png`
- `assets/effects/effect_burst_gold_01.png`
- `assets/effects/effect_small_star_burst.png`
- `assets/effects/effect_small_star_glint.png`
- `assets/effects/sparkle/sparkle_gold_01.png`
- `assets/effects/sparkle_02.png`
- `assets/platforms/platform_floating.png`
- `assets/platforms/platform_grass_vines_01.png`
- `assets/player/farmer_jump/player_farmer_jump_07.png`
- `assets/player/farmer_jump/player_farmer_jump_08.png`
- `assets/player/farmer_jump/player_farmer_jump_09.png`
- `assets/player/farmer_jump/player_farmer_jump_10.png`
- `assets/player/farmer_jump/player_farmer_jump_11.png`
- `assets/player/farmer_jump/player_farmer_jump_12.png`
- `assets/player/farmer_jump/player_farmer_jump_13.png`
- `assets/player/farmer_jump/player_farmer_jump_14.png`
- `assets/player/farmer_jump/player_farmer_jump_15.png`
- `assets/player/farmer_jump/player_farmer_jump_16.png`
- `assets/player/farmer_run/player_farmer_run_09.png`
- `assets/player/farmer_run/player_farmer_run_10.png`
- `assets/player/farmer_run/player_farmer_run_11.png`
- `assets/player/farmer_run/player_farmer_run_12.png`
- _(26 more)_

## Needs designer re-export (bucket E, 132)

Active or registered files with quality issues: oversized canvas, no alpha channel, or side-pair dimension mismatch.

- `assets/background/castle_far_01.png` — 1254×1254 · NO_TRANSPARENCY
- `assets/background/cloud_large_01.png` — 1774×887 · NO_TRANSPARENCY
- `assets/background/cloud_medium_01.png` — 1774×887 · NO_TRANSPARENCY
- `assets/background/cloud_small_01.png` — 1774×887 · NO_TRANSPARENCY
- `assets/background/clouds/cloud_medium.png` — 1448×1086 · NO_TRANSPARENCY
- `assets/background/clouds/cloud_small.png` — 1448×1086 · NO_TRANSPARENCY
- `assets/background/midground/rolling_hills.png` — 2172×724 · NO_TRANSPARENCY
- `assets/background/midground/treeline_far.png` — 2172×724 · NO_TRANSPARENCY
- `assets/background/mountains_far_01.png` — 1774×887 · NO_TRANSPARENCY
- `assets/blocks/brick-purple-platform-3.png` — 522×180 · OVERSIZED_CANVAS
- `assets/blocks/question/gold_question_block_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/blocks/question/gold_question_block_02.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/gold/gold_flower_emblem_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/gold/gold_flower_glow_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/gold/gold_flower_glow_02.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/gold/gold_star_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/orchid_blue/orchid_blue_rare_halo.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/orchid_gold/orchid_gold_big.png` — 1035×936 · OVERSIZED_CANVAS
- `assets/collectibles/orchid_gold/orchid_gold_collect_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/orchid_gold/orchid_gold_collect_02.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/orchid_gold/orchid_gold_collect_03.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/collectibles/orchid_gold/orchid_gold_collect_04.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor/branches/decorative_branch_flowers_01.png` — 1448×1086 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor/bush_bright_small_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor/bush_flower_small_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor/grass_tuft_medium_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor/grass_tuft_small_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor/leaf_clump_small_01.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_large/bushes/bush_large.png` — 1132×875 · OVERSIZED_CANVAS
- `assets/decor_large/bushes/bush_large_with_purple_flowers.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_large/fence/fence_wood_short.png` — 1127×435 · OVERSIZED_CANVAS
- `assets/decor_large/mushrooms/mushroom_red_big.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_large/trees/tree_round.png` — 701×911 · OVERSIZED_CANVAS
- `assets/decor_small/bushes/bush_with_purple_flowers.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_small/bushes/leaf_clump_round.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_small/flowers/purple_flower_cluster.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_small/flowers/yellow_flower_small.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_small/grass/grass_tuft_large.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_small/grass/grass_tuft_small.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- `assets/decor_small/plants/sprout_soil.png` — 1254×1254 · NO_TRANSPARENCY, OVERSIZED_CANVAS
- _(92 more)_

## Needs developer wiring (bucket D, 54)

Files on disk with no `gameConfig.assets` key. Add a key OR move to `_source/`.

- `assets/background/mountains/mountains-far.png`
- `assets/decor/large/bushes/bush_large.png`
- `assets/decor/large/bushes/bush_large_flowers.png`
- `assets/decor/large/fence/fence_corner.png`
- `assets/decor/large/fence/fence_short.png`
- `assets/decor/large/fence/fence_wood_short_left.png`
- `assets/decor/large/fence/fence_wood_short_right.png`
- `assets/decor/large/mushrooms/mushroom_purple_big.png`
- `assets/decor/large/mushrooms/mushroom_red_big.png`
- `assets/decor/large/trees/tree_round.png`
- `assets/decor/large/trees/tree_tall.png`
- `assets/decor/small/bushes/bush_small.png`
- `assets/decor/small/bushes/bush_small_flowers.png`
- `assets/decor/small/flowers/flower_violet_cluster.png`
- `assets/decor/small/flowers/flower_yellow_decor.png`
- `assets/decor/small/grass/grass_tuft_large.png`
- `assets/decor/small/grass/grass_tuft_small.png`
- `assets/decor/small/leaves/leaf_clump_round.png`
- `assets/decor/small/plants/sprout_soil.png`
- `assets/effects/bursts/light_burst_gradient_01.png`
- `assets/effects/bursts/light_burst_sun_01.png`
- `assets/effects/light/light_streak_01.png`
- `assets/effects/magic/magic_glow_rainbow_01.png`
- `assets/effects/magic/sparkle_01.png`
- `assets/effects/magic/sparkle_02.png`
- `assets/effects/sparkles/sparkle_small_01.png`
- `assets/effects/sparkles/sparkle_small_02.png`
- `assets/effects/sparkles/sparkle_star_01.png`
- `assets/effects/sparkles/sparkle_star_02.png`
- `assets/effects/sparkles/sparkle_star_gold_01.png`
- `assets/effects/trails/light_streak_01.png`
- `assets/effects/trails/light_sweep_01.png`
- `assets/effects/trails/light_trail_motion_01.png`
- `assets/effects/trails/light_trail_yellow_01.png`
- `assets/obstacles/mushroom_small/mushroom_small_red.png`
- `assets/pickups/aura/pickup_magnet_aura.png`
- `assets/pickups/aura/pickup_medal_x2_gold.png`
- `assets/pickups/aura/pickup_shield_orchid_aura.png`
- `assets/pickups/aura/pickup_star_gold_aura.png`
- `assets/player/farmer_remaining_batch/01_sadovyy_truzhenik_v_piksel_arte.png`
- _(14 more)_

## Needs designer to ship (bucket I, 6)

Keys registered without a file. Either ship the file or remove the key.

- `orchidGoldSparkle01` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png`
- `orchidGoldSparkle02` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png`
- `orchidGoldSparkle03` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png`
- `orchidGoldSparkle04` → expected at `assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png`
- `orchidGoldCollect05` → expected at `assets/collectibles/orchid_gold/orchid_gold_collect_05.png`
- `orchidGoldCollect06` → expected at `assets/collectibles/orchid_gold/orchid_gold_collect_06.png`

## Needs semantic classification (bucket J, 0)

No entry in `ASSET_CLASS_BY_TYPE`. Add one OR delete if unused.

## Do not touch

- Bucket H (`_source/` already archived) — leave for designer recovery.
- Road-kit pairs (`assets/terrain/road/`) flagged as asymmetric — intentional perspective.
- Background-only layers > 512 px — large canvas is expected.
