# Asset Style Audit — Reference vs Current

Comprehensive inventory of every visual element in the target reference image, what we currently have in `assets/`, and what's missing or in the wrong style.

**Core finding:** We already have files for almost every element visible in the reference. The visual gap is **stylistic, not coverage** — our assets are rendered in *detailed illustration style with subtle gradients and shading*, while the reference is *flat pixel-art with discrete pixel blocks and limited palette*. To truly match the reference, most existing PNG sprites need to be replaced (not added) with flat pixel-art versions.

---

## 1. Reference inventory (everything visible in target image)

### HUD (UI overlay — top + bottom corners)
| Element | Visible in reference |
|---|---|
| Pause button (II glyph in dark rounded square) | top-left |
| Score panel — yellow flower icon + number "1234" | top-right |
| Hearts panel — 3 full red hearts + 1 empty heart | top-right under score |
| Tool panel — shovel icon + 5-segment energy bar | bottom-left |

### Sky / background layers (far to mid)
| Element | Notes |
|---|---|
| Blue gradient sky | top portion, pixelated |
| White clouds (chunky pixel-art) | multiple sizes scattered |
| Tiered green mountains | 2-3 silhouette layers, lighter front to darker back |
| Castle | red roof / towers / flag, pixel-art style, mid-distance on path centerline |

### Side scenery (left & right of road)
| Element | Notes |
|---|---|
| Wooden fence | vertical board fence, 3-4 boards, foreground edges |
| Red mushroom small | red cap + white spots, Mario-style, foreground |
| Pixel trees | chunky green canopy, dark shading, mid-distance |
| Grass-dirt block cube | green grass top, brown/purple soil sides |
| Purple brick single | single chunky purple brick |
| Purple brick wall (low stacked) | 2-3 bricks stacked low |
| Floating purple platform | 3-tile-wide brick row, no base, suspended |
| Question block (yellow ?) | classic brown-edge yellow ? block |
| Green pipe | classic Mario pipe, single height |
| Purple flower cluster (violets) | small dot clusters, scattered on shoulders |
| Yellow small flowers | small yellow dot clusters |
| Tall dry grass / wheat | brown pyramid, foreground right of reference |

### Road surface
| Element | Notes |
|---|---|
| Grass tile pattern | 3 visible lanes with cream lane dividers |
| Vine barrier | full-road horizontal vine, gameplay obstacle |
| Yellow orchid trail | column of golden flowers down center lane |

### Player
| Element | Notes |
|---|---|
| Farmer sprite | straw hat, green apron with bow, white sleeves, brown gloves, blue jeans, brown boots, carrying small shovel, running away from camera |

---

## 2. Current asset inventory

All 110+ PNG files we ship today, grouped by category. **Note**: every reference element has a corresponding file already — the issue is style match, not file presence.

### UI / HUD (8 files — style matches reasonably)
- `ui/buttons/pause_button.png`, `play_button.png`
- `ui/icons/heart_full.png`, `heart_empty.png`
- `ui/icons/energy_segment_full.png`, `energy_segment_empty.png`
- `ui/icons/flower_currency_icon.png`
- `ui/panels/score_panel_bg.png`, `lives_panel_bg.png`, `tool_panel_bg.png`, `panel_long_blue.png`
- `ui/tools/shovel_full.png`, `shovel_blade.png`, `shovel_handle.png`

### Background (15 files)
- `background/sky/sky_gradient.png`
- `background/sun-glow.png`, `background/castle-distant.png`, `background/castle/castle_far.png`
- `background/clouds/cloud_large.png`, `cloud_medium.png`, `cloud_small.png`
- `background/clouds/cloud-01.png` … `cloud-06.png` (6 individual cloud frames)
- `background/clouds/clouds.png`
- `background/mountains/mountains_far.png`, `mountains_mid.png`, `mountains-far.png`, `mountains-near.png`
- `background/forest/forest_far.png`, `landscape/forest-treeline.png`, `landscape/meadow-rolling.png`

### Player (12 files)
- `player/farmer_run/player_farmer_run_01.png` … `_08.png` (8-frame run cycle)
- `player/farmer_crouch/player_farmer_crouch_01.png` … `_04.png` (4-frame crouch)

### Collectibles & pickups (7 files)
- `collectibles/flower-golden-orchid.png` (the orchid currency)
- `collectibles/flower-purple-cluster.png`, `flower-yellow-small.png`, `life-heart.png`, `sprout.png`
- `pickups/golden_flower/golden_flower_big.png`, `golden_flower_small.png`

### Obstacles (6 files)
- `obstacles/vines/vine_barrier_full.png`
- `obstacles/dry_grass/dry_grass_obstacle.png`
- `obstacles/mushrooms/mushroom_small_red.png`
- `obstacles/overhangs/low_branch_overhang.png`, `spider_web_overhang.png`

### Structures (8 files)
- `structures/bricks/purple_brick_01.png`
- `structures/walls/purple_wall_low.png`, `purple_wall_stairs.png`
- `structures/platforms/purple_platform_row_04.png`, `hanging_platform_vines.png`
- `structures/question_block/question_block.png`
- `structures/pipe/green_pipe.png`

### Legacy blocks (6 files — older variants of structures)
- `blocks/brick-purple-single.png`, `brick-purple-platform-3.png`
- `blocks/bush-spiky.png`, `pipe-green.png`, `question-block-yellow.png`, `vine-coiled.png`

### Terrain blocks (4 files — grass-dirt cubes for midground)
- `terrain/blocks/grass_block_cube_01.png`, `grass_block_cube_02.png`
- `terrain/blocks/grass_block_front_rect.png`, `grass_block_column_tall.png`

### Decor — large (5 files)
- `decor_large/mushrooms/mushroom_red_big.png`
- `decor_large/trees/tree_round.png`
- `decor_large/fence/fence_wood_short.png`
- `decor_large/bushes/bush_large.png`, `bush_large_with_purple_flowers.png`

### Decor — small (7 files)
- `decor_small/flowers/purple_flower_cluster.png`, `yellow_flower_small.png`
- `decor_small/grass/grass_tuft_small.png`, `grass_tuft_large.png`
- `decor_small/bushes/leaf_clump_round.png`, `bush_with_purple_flowers.png`
- `decor_small/plants/sprout_soil.png`

### Environment (legacy duplicates — 11 files)
- `environment/cloud-large.png`, `dry-grass.png`, `fence-wood-short.png`, `grass-tuft.png`
- `environment/leaf-cluster-low.png`, `leaf-cluster-compact.png`
- `environment/mushroom-blue.png`, `mushroom-purple.png`, `mushroom-red.png`
- `environment/tree-round.png`, `wheat-tuft.png`

### Road kit (v2 — current pixel-art) (14 files ✓)
- `terrain/road/kit/road_foreground_left/center/right.png` (3)
- `terrain/road/kit/road_mid_left/center/right.png` (3)
- `terrain/road/kit/road_far_strip.png` (1)
- `terrain/road/kit/shoulder_inner_left/right.png` (2)
- `terrain/road/kit/lane_divider_left_center/center_right.png` (2)
- `terrain/road/kit/road_edge_flower/grass/dark_patch_01.png` (3)

### Road legacy (6 files — kept for tiles + procedural fallback)
- `terrain/road/lane_tiles/road_lane_left/center/right.png` (3)
- `terrain/road/shoulders/road_shoulder_left/right.png` (2)
- `terrain/road/dividers/road_divider_yellow.png` (1)

---

## 3. Style-gap matrix (what to redraw in pixel-art)

Each row: visual element from reference → current file(s) → style gap → priority.

| # | Reference element | Current file | Style problem | Priority |
|---|---|---|---|---|
| 1 | Red mushroom small | `obstacles/mushrooms/mushroom_small_red.png`, `environment/mushroom-red.png` | Too detailed shading, soft gradients — reference is flat pixel-art with 3-4 shades | **HIGH** (very visible) |
| 2 | Red mushroom big (foreground) | `decor_large/mushrooms/mushroom_red_big.png` | Same as above, just bigger | **HIGH** |
| 3 | Pixel tree (mid-distance) | `decor_large/trees/tree_round.png`, `environment/tree-round.png` | Smooth gradient canopy — reference has chunky pixel canopy with discrete dark patches | **HIGH** |
| 4 | Grass-dirt block cube | `terrain/blocks/grass_block_cube_01.png`, `_cube_02.png` | Detailed dirt texture — reference has flat brown sides + grass top with chunky pixel highlights | **HIGH** |
| 5 | Purple brick single | `blocks/brick-purple-single.png`, `structures/bricks/purple_brick_01.png` | Subtle shading — reference is flat purple with clear pixel borders + 1-2 lighter highlights | **HIGH** |
| 6 | Purple brick wall stacked | `structures/walls/purple_wall_low.png`, `purple_wall_stairs.png` | Same shading issue | **HIGH** |
| 7 | Floating purple platform | `blocks/brick-purple-platform-3.png`, `structures/platforms/purple_platform_row_04.png` | Smooth gradient bottom edge — reference has flat hard edges | **MEDIUM** |
| 8 | Question block | `blocks/question-block-yellow.png`, `structures/question_block/question_block.png` | Mostly OK — minor saturation difference | **LOW** |
| 9 | Green pipe | `blocks/pipe-green.png`, `structures/pipe/green_pipe.png` | Smooth gradient ring — reference has flat pixel rings | **MEDIUM** |
| 10 | Purple flower cluster (violets) | `decor_small/flowers/purple_flower_cluster.png`, `collectibles/flower-purple-cluster.png` | Soft petals — reference is 4-5 chunky pixel dots per flower | **HIGH** (very dense on shoulders) |
| 11 | Yellow small flowers | `decor_small/flowers/yellow_flower_small.png`, `collectibles/flower-yellow-small.png` | Same softness issue | **HIGH** |
| 12 | Tall dry grass / wheat (brown pyramid) | `environment/dry-grass.png`, `wheat-tuft.png`, `obstacles/dry_grass/dry_grass_obstacle.png` | OK shape, but smoother shading than reference | **MEDIUM** |
| 13 | Wooden fence | `decor_large/fence/fence_wood_short.png`, `environment/fence-wood-short.png` | Detailed wood grain — reference is flat brown with 2-3 tone shading | **MEDIUM** |
| 14 | Pixel clouds | `background/clouds/cloud-01..06.png`, `cloud_large/medium/small.png` | Smooth round clouds — reference has chunky pixel-block clouds | **MEDIUM** |
| 15 | Tiered mountains | `background/mountains/mountains_far/mid/near.png` | OK silhouette — minor style mismatch | **LOW** |
| 16 | Castle | `background/castle-distant.png`, `castle/castle_far.png` | Slightly different style (less pixel-art) | **LOW** |
| 17 | Green bush small | `decor_small/bushes/bush_with_purple_flowers.png`, `leaf_clump_round.png` | Detailed shading — reference is flat with chunky highlights | **MEDIUM** |
| 18 | Green bush large | `decor_large/bushes/bush_large.png`, `bush_large_with_purple_flowers.png` | Same as small | **MEDIUM** |
| 19 | Hanging vine platform | `structures/platforms/hanging_platform_vines.png` | OK | **LOW** |
| 20 | Sprout / small plant | `collectibles/sprout.png`, `decor_small/plants/sprout_soil.png` | OK | **LOW** |
| 21 | Golden orchid (pickup) | `collectibles/flower-golden-orchid.png`, `pickups/golden_flower/*` | OK | **LOW** |
| 22 | Heart (life pickup) | `collectibles/life-heart.png` | OK | **LOW** |
| 23 | Vine obstacle | `obstacles/vines/vine_barrier_full.png`, `blocks/vine-coiled.png` | Detailed render — reference uses simpler pixel rope | **MEDIUM** |
| 24 | Overhead branch obstacle | `obstacles/overhangs/low_branch_overhang.png`, `spider_web_overhang.png` | OK | **LOW** |
| 25 | Player farmer sprite | `player/farmer_run/*` (8 frames), `farmer_crouch/*` (4 frames) | **Detailed illustration** — most non-pixel-art element in the game | **HIGH but most expensive** |
| 26 | Sun + sun-rays | `background/sun-glow.png` | OK | **LOW** |
| 27 | Road kit | `terrain/road/kit/*` (14 files) | ✅ **Already pixel-art** (just delivered) | DONE |

---

## 4. Priority-ordered replacement list

If commissioning a pixel-art designer, this is the order of biggest visual impact for least effort:

### **Tier 1 — Highest impact, smallest sprites (~15 PNG)**
These are densely repeated on the shoulders and immediately surrounding the player. Replacing them transforms the look-and-feel.
1. `purple_flower_cluster` → flat pixel violet cluster
2. `yellow_flower_small` → flat pixel yellow flower
3. `grass_tuft_small` + `grass_tuft_large` → flat pixel grass blades
4. `leaf_clump_round` → flat pixel leaf clump
5. `mushroom_small_red` → flat pixel Mario-style mushroom
6. `mushroom_red_big` (multiple variants — red, blue, purple) → flat pixel
7. `sprout_soil` → flat pixel sprout
8. `bush_with_purple_flowers` → flat pixel bush
9. `bush_large` + `bush_large_with_purple_flowers` → flat pixel

### **Tier 2 — High impact, structural ($mid-sprites, ~10 PNG)**
2-5 of these visible at any time. They define the "wall structure" alongside the road.
10. `grass_block_cube_01/02`, `grass_block_front_rect`, `grass_block_column_tall` → flat pixel terrain blocks
11. `purple_brick_01`, `purple_wall_low`, `purple_wall_stairs` → flat pixel bricks/walls
12. `purple_platform_row_04`, `hanging_platform_vines` → flat pixel platforms
13. `question_block` → flat pixel (very minor)
14. `green_pipe` → flat pixel Mario pipe
15. `fence_wood_short` → flat pixel fence
16. `tree_round` → flat pixel tree

### **Tier 3 — Medium impact, obstacles + background**
17. `vine_barrier_full`, `vine-coiled` → flat pixel vine
18. `dry_grass_obstacle`, `wheat-tuft`, `dry-grass` → flat pixel dry grass
19. `low_branch_overhang`, `spider_web_overhang` → flat pixel
20. `cloud-01` … `cloud-06`, `cloud_small/medium/large` → flat pixel clouds

### **Tier 4 — Lower impact, far background**
21. `mountains_far/mid/near` → flat pixel tiered mountains
22. `castle-distant`, `castle_far` → flat pixel castle
23. `sun-glow`, `forest_far`, `meadow-rolling`, `forest-treeline` → optional

### **Tier 5 — Biggest single job, but optional**
24. **Player farmer sprite** — 12 frames (8 run + 4 crouch). If redrawn in pixel-art it would fully unify the style, but it's also the most expensive single asset job and the current illustration style player is *recognisable / charming*. Worth keeping detailed if budget is limited.

---

## 5. What we DON'T have but reference suggests

Looking at the reference carefully, **nothing critical is missing**. We have file coverage for every visible element. The composition slots are all filled.

**Possible additions worth considering only if/when redrawing:**
- Multiple variants of each small accent (3+ mushroom sub-styles, 3+ flower color variants, 3+ tree shapes) — for organic side variation
- A "vine connector" tile to make vines look like they grow from one side scenery item to another
- Pixel-art rocks / stones for shoulder filler (currently not in reference but would fit)
- Pixel-art logs / fallen branches (foreground accent)

---

## 6. Decision points

1. **Scope** — replace Tier 1 + Tier 2 (≈25 sprites) for ~80% of visual gain, OR full overhaul Tier 1–5 (≈45 sprites) for full match
2. **Source** — pixel-art designer (best quality, slow), AI image-gen with strict prompts (fast, variable quality), or community pack (cheap, may not match)
3. **Format** — PNG matching existing resolution (~128×128 or 64×64) so they drop into current `gameConfig.assets` paths with zero code changes
4. **Style spec for designer** — flat shading, 3-5 colors per sprite, no gradients, no anti-aliasing edges, palette cohesive with road kit (`#54a040`, `#74c050`, `#3a7028` for grass; cream `#f0d8a8` for stems; warm yellow `#f4c850` for accents; the same purple `#6c4ac0` for bricks/violets)

---

## TL;DR

We're **not missing assets** — we're missing **the right style for the assets we have**. The road kit (14 files just delivered) shows what the target style should be. To fully match the reference, the highest-leverage move is to replace the ~25 sprites in Tier 1 + Tier 2 with same-size PNGs in the same flat pixel-art style as the road kit. Once those land, the scene reads as one cohesive pixel-art world rather than "pixel road + illustration sprites."
