# Designer Asset Brief — Orchid Quest (v3, full refresh)

Detailed spec for an artist / pixel-art designer for the FULL visual rework of **Orchid Quest** — a browser-based 3-lane endless runner.

---

## 🔁 ROUND-2 REVIEW — 2026-06-01 (first delivery against this brief)

Thanks — the **terrain blocks, grass_dirt_step pair, vine_barrier, sparkle (16×16), collect_burst 01–04, and stone bricks came in at the correct canonical sizes.** 👍

But **Batch 1 & 2 (orchids, pickups, gold currency, halos) shipped at 1254×1254 again** — the brief asked 96 / 64 / 128. I downscaled those 21 files engine-side as a stopgap (originals backed up in `assets/_source/oversized_originals_2026-05-31/`) so the game works now — BUT a downscaled 1254² raster is **soft, not crisp**. **Please RE-EXPORT natively** (author on the small canvas; don't shrink a big one):
- `collectibles/orchid_gold/`: `main`, `collect_02–06`, `sparkle_01–04` → **96×96**; `big` → **128×128**
- `collectibles/gold/`: `gold_flower_emblem_01` → **64×64**; `gold_flower_glow_01/02` → **128×128**; `gold_star_01` → **64×64**
- `collectibles/orchid_blue/orchid_blue_rare_halo` → **128×128**
- `pickups/pickup_{magnet,shield,score_x2}` → **96×96**
- `collectibles/flower-purple-cluster` → **96×96**

**Two left/right SIZE mismatches** (Golden Rule: halves must be identical size):
- `structures/bricks/purple_brick_single_left.png` is **2172×724** but `_right` is **56×56** → redraw left at **56×56** (its aspect is also wrong).
- `structures/stone_brick/purple_brick_stairs_left/right` differ → both **168×112**.

**Unrequested extras shipped this round** (not in any batch — confirm intent or we move to `_source/` per § 4.2): `effects/collect_burst/{orchid_burst_01,02, pixel_burst_flash_01, pixel_burst_glow_center_01}`, `effects/hit_flash/pixel_art_flash_transparent_01`, `effects/sparkle/{gold_star_sparkle_01, pixel_star_01, sparkle_05}`, `obstacles/vine_barrier/{thorny_vine_decor_01, vine_barrier_spiral_01, _02}`, plus several `structures/{platforms,stone_brick}` iso/bench/stair variants.

> Note: the repo carries ~240 oversized PNGs (204 MiB) total — pre-dating this delivery. The developer is handling that bulk separately; the re-export ask above is **only the freshly-delivered hero set**.

---

## 🟢 CURRENT PLAN — 2026-05-31 (AUTHORITATIVE — read this, ignore the wave-log below)

---

## 🔒 AI / Designer Anti-Duplication Rule — MUST READ BEFORE EVERY BATCH

This section is authoritative for choosing the next assets to draw. Before generating any new images, the assistant/designer MUST check the `DELIVERED_ASSETS` list below and MUST NOT redraw any file already listed there.

### 1. Source of truth
Only use this order when selecting the next batch:

1. `CURRENT_NEXT_BATCH_QUEUE`
2. then `PENDING_REEXPORT`
3. then `PENDING_NEW`
4. then confirmed developer requests

Ignore all historical wave logs unless an item is explicitly copied into `CURRENT_NEXT_BATCH_QUEUE`.

### 2. Batch size rule
Every drawing request should produce exactly 10 separate PNG files, unless the user/developer explicitly asks for a different count.
Each asset must be:

* one element per file
* correct canonical folder path
* correct lowercase English filename
* correct target canvas size
* transparent PNG
* no Cyrillic filenames
* no duplicate `_01`, `_02`, `alt`, `copy`, `new`, `final` variants unless the brief explicitly requires numbered animation frames

### 3. Do not repeat delivered files
If a file is listed in `DELIVERED_ASSETS`, it must not be generated again.
If the user says "take the next 10 from the brief," choose the next 10 files that are NOT in `DELIVERED_ASSETS`.
If fewer than 10 pending files remain in the current priority batch, continue into the next priority batch.

### 4. Required workflow before drawing
Before every new batch, the assistant/designer must:

1. Read `DELIVERED_ASSETS`
2. Read `CURRENT_NEXT_BATCH_QUEUE`
3. Remove already delivered files from the queue
4. Select the next 10 pending files
5. Generate each file separately
6. Package them into a zip with the same folder structure as `assets/...`
7. Add `MANIFEST.json`
8. After delivery, append all delivered file paths to `DELIVERED_ASSETS`

### 5. Status labels
Use only these statuses:

* `PENDING_NEW` — file does not exist yet and must be drawn
* `PENDING_REEXPORT` — file exists but must be re-exported to canonical size
* `DELIVERED` — generated and packaged, waiting for developer intake
* `ACCEPTED` — developer confirmed it passes audit / Sprite Lab QA
* `REJECTED` — do not use; reason must be written
* `DO_NOT_REDRAW` — enough versions already exist; stop generating this stem

### 6. DELIVERED_ASSETS — do not redraw

**Batch 20 — Orchid Gold P0**
Do not redraw these unless developer explicitly requests a rework:

* `assets/collectibles/orchid_gold/orchid_gold_main.png`
* `assets/collectibles/orchid_gold/orchid_gold_collect_02.png`
* `assets/collectibles/orchid_gold/orchid_gold_collect_03.png`
* `assets/collectibles/orchid_gold/orchid_gold_collect_04.png`
* `assets/collectibles/orchid_gold/orchid_gold_collect_05.png`
* `assets/collectibles/orchid_gold/orchid_gold_collect_06.png`
* `assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png`
* `assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png`
* `assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png`
* `assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png`

**Batch 21 — Pickups, Currency Icon & Halos**
Do not redraw these unless developer explicitly requests a rework:

* `assets/pickups/pickup_magnet.png`
* `assets/pickups/pickup_shield.png`
* `assets/pickups/pickup_score_x2.png`
* `assets/collectibles/gold/gold_flower_emblem_01.png`
* `assets/collectibles/gold/gold_flower_glow_01.png`
* `assets/collectibles/gold/gold_flower_glow_02.png`
* `assets/collectibles/gold/gold_star_01.png`
* `assets/collectibles/orchid_blue/orchid_blue_rare_halo.png`
* `assets/collectibles/orchid_gold/orchid_gold_big.png`
* `assets/collectibles/flower-purple-cluster.png`

**Batch 22 — Stone Structures, Planter Pot L/R Variants & Effects**
Do not redraw these unless developer explicitly requests a rework:

* `assets/structures/stone_brick/stone_wall_low_left.png` — 168 × 56 px
* `assets/structures/stone_brick/stone_wall_low_right.png` — 168 × 56 px
* `assets/structures/stone_brick/stone_brick_single_left.png` — 56 × 56 px
* `assets/structures/stone_brick/stone_brick_single_right.png` — 56 × 56 px
* `assets/obstacles/planter_pot/planter_pot_left.png` — 64 × 80 px
* `assets/obstacles/planter_pot/planter_pot_right.png` — 64 × 80 px
* `assets/effects/sparkle/sparkle_01.png` — 16 × 16 px
* `assets/effects/sparkle/sparkle_02.png` — 16 × 16 px
* `assets/effects/sparkle/sparkle_03.png` — 16 × 16 px
* `assets/effects/collect_burst/collect_burst_01.png` — 96 × 96 px

**Batch 23 — Stone Variants, Decor Trees & Mushrooms**
Do not redraw these unless developer explicitly requests a rework.
⚠️ Items marked `[dup-22]` were already listed in Batch 22 — re-delivered by designer; both deliveries logged here for audit trail.

* `assets/structures/stone_brick/stone_wall_low_left.png` [dup-22]
* `assets/structures/stone_brick/purple_brick_single_left.png`
* `assets/obstacles/planter_pot/planter_pot_left.png` [dup-22]
* `assets/decor/large/mushrooms/mushroom_red_big.png`
* `assets/structures/stone_brick/stone_wall_stairs_left.png`
* `assets/decor/large/trees/tree_round.png`
* `assets/structures/stone_brick/stone_brick_single_left.png` [dup-22]
* `assets/structures/stone_brick/stone_bench_purple.png`
* `assets/obstacles/planter_pot/planter_pot_right.png` [dup-22]
* `assets/structures/stone_brick/stone_brick_single_right.png` [dup-22]

**Batch 24 — Terrain Blocks, Platform & Vine Barriers**
Do not redraw these unless developer explicitly requests a rework:

* `assets/terrain/blocks/grass_dirt_block_01.png` — 96 × 96 px
* `assets/terrain/blocks/grass_dirt_block_02.png` — 96 × 96 px
* `assets/terrain/blocks/grass_dirt_block_flower_01.png` — 96 × 96 px
* `assets/terrain/blocks/grass_dirt_block_flower_02.png` — 96 × 96 px
* `assets/structures/platforms/grass_dirt_platform_long.png` — 192 × 40 px
* `assets/obstacles/vine_barrier/vine_barrier_01.png` — 192 × 56 px
* `assets/obstacles/vine_barrier/vine_barrier_02.png` — 192 × 56 px
* `assets/obstacles/vine_barrier/vine_barrier_03.png` — 192 × 56 px
* `assets/obstacles/vine_barrier/vine_barrier_04.png` — 192 × 56 px
* `assets/obstacles/vine_barrier/vine_barrier_single_01.png` — 64 × 56 px

**Batch 32 — Exact-Canvas Reexports & Pot Lighting Fixes**
Delivered 2026-06-01. Waiting for developer intake / Sprite Lab QA:

* `assets/structures/stone_brick/stone_wall_low_left.png` — 168 × 56 px `DELIVERED`
* `assets/structures/stone_brick/stone_wall_low_right.png` — 168 × 56 px `DELIVERED`
* `assets/structures/stone_brick/stone_brick_single_left.png` — 56 × 56 px `DELIVERED`
* `assets/structures/stone_brick/stone_brick_single_right.png` — 56 × 56 px `DELIVERED`
* `assets/terrain/blocks/grass_dirt_step_right.png` — 168 × 168 px `DELIVERED`
* `assets/obstacles/planter_pot/planter_pot_left.png` — 64 × 80 px `DELIVERED`
* `assets/obstacles/planter_pot/planter_pot_right.png` — 64 × 80 px `DELIVERED`
* `assets/structures/stone_brick/purple_brick_single.png` — 56 × 56 px `DELIVERED`
* `assets/structures/stone_brick/purple_brick_single_moss.png` — 56 × 56 px `DELIVERED`
* `assets/structures/stone_brick/purple_brick_stairs_left.png` — 168 × 112 px `DELIVERED`

### 7. CURRENT_NEXT_BATCH_QUEUE
Updated after Batch 32 delivery (2026-06-01).
✅ **Batch 32 — DELIVERED: exact-canvas fixes for remaining oversized files from Batch 31**
Batch 32 ships exact-canvas RGBA PNGs. `planter_pot_left` and `planter_pot_right`
are distinct road-facing sprites and no longer share the same content hash.
⚠️ `planter_pot_left` and `planter_pot_right` MUST be two distinct sprites with different lighting. See § 1.4.1:
  - `planter_pot_left` — road on RIGHT → pot's RIGHT face is lit (highlight), LEFT face in shadow
  - `planter_pot_right` — road on LEFT → pot's LEFT face is lit (highlight), RIGHT face in shadow

1. `assets/structures/stone_brick/stone_wall_low_left.png` — **168 × 56 px** `DELIVERED`
2. `assets/structures/stone_brick/stone_wall_low_right.png` — **168 × 56 px** `DELIVERED`
3. `assets/structures/stone_brick/stone_brick_single_left.png` — **56 × 56 px** `DELIVERED`
4. `assets/structures/stone_brick/stone_brick_single_right.png` — **56 × 56 px** `DELIVERED`
5. `assets/terrain/blocks/grass_dirt_step_right.png` — **168 × 168 px** `DELIVERED`
6. `assets/obstacles/planter_pot/planter_pot_left.png` — **64 × 80 px** `DELIVERED`
7. `assets/obstacles/planter_pot/planter_pot_right.png` — **64 × 80 px** `DELIVERED`
8. `assets/structures/stone_brick/purple_brick_single.png` — **56 × 56 px** `DELIVERED`
9. `assets/structures/stone_brick/purple_brick_single_moss.png` — **56 × 56 px** `DELIVERED`
10. `assets/structures/stone_brick/purple_brick_stairs_left.png` — **168 × 112 px** `DELIVERED`

**Batch 33 — after Batch 32 (remaining reexports of Batch 25–29):**
Skip files already delivered in Batch 32. The next pending slice starts at item 4.

1. `assets/structures/stone_brick/purple_brick_single.png` — **56 × 56 px** `DELIVERED` `[batch-32]`
2. `assets/structures/stone_brick/purple_brick_single_moss.png` — **56 × 56 px** `DELIVERED` `[batch-32]`
3. `assets/structures/stone_brick/purple_brick_stairs_left.png` — **168 × 112 px** `DELIVERED` `[batch-32]`
4. `assets/structures/stone_brick/purple_brick_stairs_right.png` — **168 × 112 px** `PENDING_REEXPORT` ⚠️ restore Batch 26 correct version
5. `assets/structures/platforms/grass_dirt_platform_tile_01.png` — **96 × 40 px** `PENDING_REEXPORT`
6. `assets/terrain/blocks/grass_dirt_platform_01.png` — **192 × 40 px** `PENDING_REEXPORT`
7. `assets/terrain/blocks/grass_dirt_stair_block_01.png` — **96 × 96 px** `PENDING_REEXPORT`
8. `assets/terrain/blocks/grass_dirt_step_right.png` — **168 × 168 px** `DELIVERED` `[batch-32]`
9. `assets/effects/collect_burst/collect_burst_05.png` — **96 × 96 px** `PENDING_REEXPORT`
10. `assets/effects/collect_burst/collect_burst_06.png` — **96 × 96 px** `PENDING_REEXPORT`

**Remaining after Batch 29 (≈ 24 files — Batch 30–31):**
- `assets/effects/collect_burst/collect_burst_07.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/effects/collect_burst/collect_burst_08.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/obstacles/vine_barrier/vine_barrier_spiral_01.png` — **192 × 56 px** `PENDING_REEXPORT`
- `assets/obstacles/vine_barrier/vine_barrier_spiral_02.png` — **192 × 56 px** `PENDING_REEXPORT`
- `assets/obstacles/vine_barrier/vine_barrier_single_03.png` — **64 × 56 px** `PENDING_NEW`
- `assets/obstacles/vine_barrier/vine_barrier_single_04.png` — **64 × 56 px** `PENDING_NEW`
- `assets/effects/hit_flash/hit_flash_01..04.png` — **64 × 36 px** each (4 files) `PENDING_NEW`
- `assets/effects/lane_swoosh/lane_swoosh_01..04.png` — **96 × 64 px** each (4 files) `PENDING_NEW`
- `assets/decor/large/bushes/bush_large.png` — `PENDING_NEW`
- `assets/decor/large/bushes/bush_large_flower.png` — `PENDING_NEW`
- `assets/collectibles/orchid_gold/orchid_gold_collect_01.png` — **96 × 96 px** `PENDING_NEW`
- `assets/structures/stone_brick/purple_brick_block_iso_01.png` — **56 × 56 px** `PENDING_REEXPORT`
- `assets/structures/stone_brick/mossy_stone_tile_01.png` — **56 × 56 px** `PENDING_REEXPORT`
- `assets/structures/stone_brick/purple_brick_stairs_01.png` — **168 × 112 px** `PENDING_REEXPORT`
- `assets/structures/stone_brick/purple_brick_stairs_02.png` — **168 × 112 px** `PENDING_REEXPORT`
- `assets/structures/platforms/grass_platform_01.png` — **192 × 40 px** `PENDING_REEXPORT`
- `assets/structures/platforms/grass_platform_02.png` — **192 × 40 px** `PENDING_REEXPORT`
- `assets/terrain/blocks/grass_terrain_block_01.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/terrain/blocks/grass_terrain_block_02.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/effects/collect_burst/orchid_burst_01.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/effects/collect_burst/orchid_burst_02.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/structures/stone_brick/purple_stone_stairs_grass_01.png` — **168 × 112 px** `PENDING_REEXPORT`
- `assets/structures/stone_brick/purple_mossy_stone_block_01.png` — **56 × 56 px** `PENDING_REEXPORT`
- `assets/structures/platforms/grass_dirt_platform_double_01.png` — **192 × 40 px** `PENDING_REEXPORT`
- `assets/effects/sparkle/gold_star_sparkle_01.png` — **16 × 16 px** `PENDING_REEXPORT`
- `assets/effects/sparkle/pixel_star_01.png` — **16 × 16 px** `PENDING_REEXPORT`
- `assets/effects/collect_burst/pixel_burst_glow_center_01.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/effects/hit_flash/pixel_art_flash_transparent_01.png` — **64 × 36 px** `PENDING_REEXPORT`
- `assets/effects/collect_burst/pixel_burst_flash_01.png` — **96 × 96 px** `PENDING_REEXPORT`
- `assets/obstacles/vine_barrier/thorny_vine_decor_01.png` — **192 × 56 px** `PENDING_REEXPORT`

**Batch 25 — Effects, Vine & New Structures**
⚠️ ALL 10 FILES ARE OVERSIZED RAW EXPORTS — status `PENDING_REEXPORT`. Do NOT use in engine until re-exported at canonical sizes.
⚠️ `sparkle_05.png` violates STOP LIST (canonical sparkle = 4 frames only). Do not wire; do not redraw.
⚠️ `purple_brick_stairs_left.png` — only LEFT variant delivered; right pair still missing.

| File | Delivered size | Canonical target | Status |
|---|---|---|---|
| `assets/effects/collect_burst/collect_burst_02.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/collect_burst_03.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/collect_burst_04.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/sparkle/sparkle_04.png` | 1254 × 1254 | **16 × 16 px** | `PENDING_REEXPORT` |
| `assets/effects/sparkle/sparkle_05.png` | 1672 × 941 | — | `DO_NOT_REDRAW` (beyond canonical 4-frame set) |
| `assets/obstacles/vine_barrier/vine_barrier_single_02.png` | 1341 × 1173 | **64 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/purple_brick_single.png` | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/purple_brick_stairs_left.png` | 1536 × 1024 | **168 × 112 px** | `PENDING_REEXPORT` |
| `assets/structures/platforms/grass_dirt_platform_tile_01.png` | 1254 × 1254 | **96 × 40 px** (match platform family) | `PENDING_REEXPORT` |
| `assets/terrain/blocks/grass_dirt_stair_block_01.png` | 1254 × 1254 | **96 × 96 px** (match block family) | `PENDING_REEXPORT` |

**Batch 26 — Reexports, Missing Right Pairs & Step Blocks**
Do not redraw these unless developer explicitly requests a rework:

* `assets/effects/sparkle/sparkle_04.png` — 16 × 16 px
* `assets/effects/collect_burst/collect_burst_02.png` — 96 × 96 px
* `assets/effects/collect_burst/collect_burst_03.png` — 96 × 96 px
* `assets/effects/collect_burst/collect_burst_04.png` — 96 × 96 px
* `assets/obstacles/vine_barrier/vine_barrier_single_02.png` — 64 × 56 px
* `assets/structures/stone_brick/stone_wall_stairs_right.png` — 168 × 112 px
* `assets/structures/stone_brick/purple_brick_stairs_right.png` — 168 × 112 px
* `assets/structures/stone_brick/purple_brick_single_right.png` — 56 × 56 px
* `assets/terrain/blocks/grass_dirt_step_left.png` — 168 × 168 px
* `assets/terrain/blocks/grass_dirt_step_right.png` — 168 × 168 px

**Batch 27 — Collect Burst, New Variants & Spiral Barriers**
⚠️ ALL 10 FILES ARE OVERSIZED RAW EXPORTS — status `PENDING_REEXPORT`.
⚠️ Items marked `[dup-26]` overwrite files already delivered at correct size in Batch 26 — designer sent oversized versions again.

| File | Delivered size | Canonical target | Status |
|---|---|---|---|
| `assets/structures/stone_brick/purple_brick_single_moss.png` | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` (new mossy variant) |
| `assets/structures/stone_brick/purple_brick_stairs_right.png` | 1536 × 1024 | **168 × 112 px** | `PENDING_REEXPORT` `[dup-26]` |
| `assets/terrain/blocks/grass_dirt_platform_01.png` | 1942 × 809 | **192 × 40 px** (match platform family) | `PENDING_REEXPORT` (new file) |
| `assets/terrain/blocks/grass_dirt_step_right.png` | 1254 × 1254 | **168 × 168 px** | `PENDING_REEXPORT` `[dup-26]` |
| `assets/effects/collect_burst/collect_burst_05.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/collect_burst_06.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/collect_burst_07.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/collect_burst_08.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/obstacles/vine_barrier/vine_barrier_spiral_01.png` | 1341 × 1173 | **192 × 56 px** (match vine_barrier family) | `PENDING_REEXPORT` (new spiral variant) |
| `assets/obstacles/vine_barrier/vine_barrier_spiral_02.png` | 1341 × 1173 | **192 × 56 px** | `PENDING_REEXPORT` (new spiral variant) |

**Batch 28 — ISO Blocks, Stairs, Platforms & Orchid Burst**
✅ Paths fixed by developer (2026-05-31) — all 10 files moved to canonical locations.
⚠️ ALL 10 FILES still oversized — `PENDING_REEXPORT`. Designer must re-export at canonical sizes.

| Canonical path (fixed) | Delivered size | Target size | Status |
|---|---|---|---|
| `assets/structures/stone_brick/purple_brick_block_iso_01.png` | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/mossy_stone_tile_01.png` | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/purple_brick_stairs_01.png` | 1536 × 1024 | **168 × 112 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/purple_brick_stairs_02.png` | 1536 × 1024 | **168 × 112 px** | `PENDING_REEXPORT` |
| `assets/structures/platforms/grass_platform_01.png` | 1942 × 809 | **192 × 40 px** | `PENDING_REEXPORT` |
| `assets/structures/platforms/grass_platform_02.png` | 1881 × 836 | **192 × 40 px** | `PENDING_REEXPORT` |
| `assets/terrain/blocks/grass_terrain_block_01.png` | 1254 × 1254 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/terrain/blocks/grass_terrain_block_02.png` | 1254 × 1254 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/orchid_burst_01.png` | 1254 × 1254 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/orchid_burst_02.png` | 1254 × 1254 | **96 × 96 px** | `PENDING_REEXPORT` |

**Batch 29 — Stairs, Blocks, Platforms, Sparkles, Explosions & Vine Decor**
✅ Paths fixed by developer (2026-06-01) — 9 files moved; 1 conflict isolated to `_source/`.
⚠️ ALL 9 ACTIVE FILES still oversized — `PENDING_REEXPORT`. Designer must re-export at canonical sizes.
⚠️ `grass_dirt_block_01.png` — CONFLICT with Batch 24 accepted file. Moved to `assets/_source/rejected_duplicates/grass_dirt_block_01_batch29_dup.png`. Do not use.

| Canonical path (fixed) | Delivered size | Target size | Status |
|---|---|---|---|
| `assets/structures/stone_brick/purple_stone_stairs_grass_01.png` | 1536 × 1024 | **168 × 112 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/purple_mossy_stone_block_01.png` | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/terrain/platforms/grass_dirt_block_01.png` | 1254 × 1254 | — | `REJECTED` — duplicate of Batch 24, moved to `_source/rejected_duplicates/` |
| `assets/structures/platforms/grass_dirt_platform_double_01.png` | 1254 × 1254 | **192 × 40 px** | `PENDING_REEXPORT` |
| `assets/effects/sparkle/gold_star_sparkle_01.png` | 1254 × 1254 | **16 × 16 px** | `PENDING_REEXPORT` |
| `assets/effects/sparkle/pixel_star_01.png` | 1672 × 941 | **16 × 16 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/pixel_burst_glow_center_01.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/effects/hit_flash/pixel_art_flash_transparent_01.png` | 1672 × 941 | **64 × 36 px** | `PENDING_REEXPORT` |
| `assets/effects/collect_burst/pixel_burst_flash_01.png` | 1672 × 941 | **96 × 96 px** | `PENDING_REEXPORT` |
| `assets/obstacles/vine_barrier/thorny_vine_decor_01.png` | 1341 × 1173 | **192 × 56 px** | `PENDING_REEXPORT` |

**Batch 30 — Stone Walls, Brick Singles, Step & Planters**
✅ Paths fixed by developer (2026-06-01) — 3 alternates moved to `_source/future/alternates/`.
🚨 ALL 7 PRIMARY FILES overwrite previously-accepted Batch 22/26 versions with oversized raws — correct art is LOST until reexport.
⚠️ `planter_pot_left.png` and `planter_pot_right.png` are byte-identical (a single source PNG was exported for both halves). Left ≠ Right. Redraw required — see Golden Rule § 1.4.1.

| File | Was accepted in | Delivered size | Target size | Status |
|---|---|---|---|---|
| `assets/structures/stone_brick/stone_wall_low_left.png` | Batch 22 ✅ | 2172 × 724 | **168 × 56 px** | `PENDING_REEXPORT` ⚠️ overwrote accepted |
| `assets/structures/stone_brick/stone_wall_low_right.png` | Batch 22 ✅ | 2172 × 724 | **168 × 56 px** | `PENDING_REEXPORT` ⚠️ overwrote accepted |
| `assets/structures/stone_brick/stone_brick_single_left.png` | Batch 22 ✅ | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` ⚠️ overwrote accepted |
| `assets/structures/stone_brick/stone_brick_single_right.png` | Batch 22 ✅ | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` ⚠️ overwrote accepted |
| `assets/terrain/blocks/grass_dirt_step_right.png` | Batch 26 ✅ | 1254 × 1254 | **168 × 168 px** | `PENDING_REEXPORT` ⚠️ overwrote accepted |
| `assets/obstacles/planter_pot/planter_pot_left.png` | Batch 22 ✅ | 1122 × 1402 | **64 × 80 px** | `PENDING_REEXPORT` ⚠️ overwrote accepted + identical to right |
| `assets/obstacles/planter_pot/planter_pot_right.png` | Batch 22 ✅ | 1122 × 1402 | **64 × 80 px** | `PENDING_REEXPORT` ⚠️ overwrote accepted + identical to left |
| `assets/_source/future/alternates/stone_stairs_alt_01.png` | — | 1536 × 1024 | — | moved to `_source/future/` — not in brief |
| `assets/_source/future/alternates/stone_stairs_alt_02.png` | — | 1536 × 1024 | — | moved to `_source/future/` — not in brief |
| `assets/_source/future/alternates/platform_grass_vines_alt_01.png` | — | 1619 × 971 | — | moved to `_source/future/` — not in brief |

**Batch 31 — Urgent Restore + Purple Brick Redelivery**
🟡 Partial progress vs Batch 30: stone wall and brick single pairs are now distinct left/right files.
⚠️ ALL 10 FILES still oversized — `PENDING_REEXPORT`.
⚠️ `planter_pot_left` and `planter_pot_right` are **still byte-identical** (md5 match). Must be redrawn as two distinct sprites with correct per-side lighting (§ 1.4.1).

| File | Left ≠ Right? | Delivered size | Target size | Status |
|---|---|---|---|---|
| `assets/structures/stone_brick/stone_wall_low_left.png` | ✅ distinct | 2172 × 724 | **168 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/stone_wall_low_right.png` | ✅ distinct | 2172 × 724 | **168 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/stone_brick_single_left.png` | ✅ distinct | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/stone_brick_single_right.png` | ✅ distinct | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/terrain/blocks/grass_dirt_step_right.png` | — | 1254 × 1254 | **168 × 168 px** | `PENDING_REEXPORT` |
| `assets/obstacles/planter_pot/planter_pot_left.png` | ⚠️ IDENTICAL | 1122 × 1402 | **64 × 80 px** | `PENDING_REEXPORT` + redraw required |
| `assets/obstacles/planter_pot/planter_pot_right.png` | ⚠️ IDENTICAL | 1122 × 1402 | **64 × 80 px** | `PENDING_REEXPORT` + redraw required |
| `assets/structures/stone_brick/purple_brick_single.png` | — | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/purple_brick_single_moss.png` | — | 1254 × 1254 | **56 × 56 px** | `PENDING_REEXPORT` |
| `assets/structures/stone_brick/purple_brick_stairs_left.png` | — | 1536 × 1024 | **168 × 112 px** | `PENDING_REEXPORT` |

### 8. STOP LIST — do not generate more unless explicitly requested
Do not generate more of these stems without a direct developer request:

* `player_farmer_run_*`
* `player_farmer_jump_*`
* `player_farmer_crouch_*`
* generic `sparkle_*` variants outside the canonical requested frames
* extra dust variants outside canonical animation frames
* extra clouds
* extra powerup auras / medallions
* duplicate decor with `_01`, `_02`, `_alt`, `_new`
* any Cyrillic or transliterated filenames
* any asset under a non-canonical folder when a canonical folder already exists

### 9. Archive naming rule
Every archive must be named with an incremental batch number and category:
`orchid_quest_assets_batch_<number>_<category>_10.zip`

Example:
`orchid_quest_assets_batch_22_terrain_structures_10.zip`

The zip must contain:
```
README.md
MANIFEST.json
assets/
_source/optional_originals/
_previews/optional_contact_sheet.png
```

### 10. Final check before packaging
Before creating the zip, verify:

* no duplicate file paths
* no Cyrillic final filenames
* no wrong folders
* each file matches the requested asset path
* every generated image is separate, not a collage
* archive contains exactly the requested batch files

---

> This section **supersedes** everything from "🎯 ACTIVE DESIGNER ASKS — 2026-05-30"
> down to "## 0. Context and target audience". Those sections are kept only as
> history. The **drawing spec** (palette § 3, sizes § 5, light § 1.4, rules § 4)
> from "## 0." onward is still the authoritative HOW-TO-DRAW reference.
> Forensic data backing this plan came from a one-time audit — run `node scripts/audit-assets.mjs` and `node scripts/audit-images.mjs` to regenerate the live numbers.

### The real situation (measured, not guessed)

| Finding | Number | Meaning |
|---|---|---|
| Live PNGs | 373 (204 MiB) | the engine-visible set (excludes `_source/`) |
| **Byte-identical duplicates** | **1 pair, intentional** | NOT a duplication problem — that pair is a sanctioned anim-loop reuse |
| **Oversized (> 256 px)** | **245 / 373** | THE problem: sprites exported at ~1254×1254 but drawn at ~80–160 px |
| **Fully unused PNGs** | **79 (63 MiB)** | shipped, never referenced → delete |
| **Dead registry keys** | **6** | engine expects art that was never delivered → breaks loading |
| `.DS_Store` junk committed | 5 | macOS cruft → remove + gitignore |

**Headline:** there are essentially **no duplicate images** to clean up. The bloat (204 MiB, slow load, the golden-flower "flame" render glitch) all comes from **oversized exports**. The fix is **re-export at the real draw size** + **delete the 79 unused files**.

### Two workstreams

**🅰 Cleanup — developer-side, NO drawing** (the designer does not act on this; listed so you don't redraw things we're deleting):
- Delete the **79 unused PNGs** (full list in the forensics doc). Biggest wins: `player/farmer_remaining_batch/` + `player/farmer_unfinished_batch/` (13 raw 1024×1536 / 1122×1402 files, Cyrillic names, 13.9 MiB), all of `pickups/aura/` (4), animation tails `farmer_jump_07..16` + `farmer_run_09..12`.
- Remove 5 `.DS_Store`, add to `.gitignore`.
- The **6 dead keys** are **kept on purpose** — Batch 1 below delivers exactly that art, so they wire automatically on drop-in.

**🅱 Designer re-export — DRAWING, in BATCHES OF 10**, priority order below. Rule for every entry: **same artwork, exported on the canonical small canvas** — these are downscales / crisp re-authors, not new concepts. Transparent RGBA (PNG color-type 6), 1×1 pixel grid, sun upper-right (§ 1.4), no AA except the alpha assets noted.

---

### ▶ BATCH 1 (10 files) — Gold orchid trail + collect anim  ·  PRIORITY P0

This batch fixes both the **6 dead keys** (loading errors) AND the center-screen
"golden flame" glitch (the orchid currently renders from a 1254×1254 source
crushed to ~82 px → noise). Match the already-accepted siblings
`orchid_gold_collect_07.png` / `_08.png` (96×96) exactly — same hue, outline, palette.

| # | File (path: `assets/collectibles/orchid_gold/`) | Action | Current → Target | Notes |
|---|---|---|---|---|
| 1 | `orchid_gold_main.png` | **re-export** | 1254×1254 → **96×96** | the primary un-collected orchid; crisp 5-petal gold bloom |
| 2 | `orchid_gold_collect_02.png` | **re-export** | 1254×1254 → **96×96** | collect-burst frame 2/8 |
| 3 | `orchid_gold_collect_03.png` | **re-export** | 1254×1254 → **96×96** | collect-burst frame 3/8 |
| 4 | `orchid_gold_collect_04.png` | **re-export** | 1254×1254 → **96×96** | collect-burst frame 4/8 |
| 5 | `orchid_gold_collect_05.png` | **NEW (dead key)** | — → **96×96** | burst ~85% travel, petals/specks |
| 6 | `orchid_gold_collect_06.png` | **NEW (dead key)** | — → **96×96** | burst residual fade, closes pickup |
| 7 | `orchid_gold_sparkle_01.png` | **NEW (dead key)** | — → **96×96** | idle-shimmer 1/4 orbiting the orchid |
| 8 | `orchid_gold_sparkle_02.png` | **NEW (dead key)** | — → **96×96** | idle-shimmer 2/4 |
| 9 | `orchid_gold_sparkle_03.png` | **NEW (dead key)** | — → **96×96** | idle-shimmer 3/4 |
| 10 | `orchid_gold_sparkle_04.png` | **NEW (dead key)** | — → **96×96** | idle-shimmer 4/4, loops to 1 |

> ❌ Do NOT keep the 1254×1254 originals. Overwrite in place at 96×96.

---

### ▶ BATCH 2 (10 files) — Pickups, currency icon & halos  ·  PRIORITY P0/P1

All currently 1254×1254 raw exports, drawn far smaller. Re-export at target. The three `glow`/`halo` entries are **alpha assets** — soft radial, AA allowed.

| # | File | Action | Current → Target | Notes |
|---|---|---|---|---|
| 1 | `pickups/pickup_magnet.png` | re-export | 1254² → **96×96** | power-up icon |
| 2 | `pickups/pickup_shield.png` | re-export | 1254² → **96×96** | power-up icon |
| 3 | `pickups/pickup_score_x2.png` | re-export | 1254² → **96×96** | power-up icon |
| 4 | `collectibles/gold/gold_flower_emblem_01.png` | re-export | 1254² → **64×64** | HUD currency icon (top-left counter) |
| 5 | `collectibles/gold/gold_flower_glow_01.png` | re-export (alpha) | 1254² → **128×128** | orchid halo frame 1 |
| 6 | `collectibles/gold/gold_flower_glow_02.png` | re-export (alpha) | 1254² → **128×128** | orchid halo frame 2 |
| 7 | `collectibles/gold/gold_star_01.png` | re-export | 1254² → **64×64** | bonus spark icon |
| 8 | `collectibles/orchid_blue/orchid_blue_rare_halo.png` | re-export (alpha) | 1254² → **128×128** | rare blue-orchid aura |
| 9 | `collectibles/orchid_gold/orchid_gold_big.png` | re-export | 1035×936 → **128×128** | large-scale orchid (near camera) |
| 10 | `collectibles/flower-purple-cluster.png` | re-export | 319×332 → **96×96** | purple roadside flower cluster (decor) |

---

### ▶ BATCH 3 (10 files) — Corridor terrain & structure blocks  ·  PRIORITY P2 (perf)

These are the side-of-road blocks: visually fine in-game but exported huge
(1254×1254 … 2172×724), so they dominate the 204 MiB / slow load. Re-export to
match each family's **already-accepted sibling** size — do NOT invent a new size.
**Dev to confirm the exact target px per family at handoff** (the wave-log below
lists historical numbers that conflict; trust the accepted on-disk sibling).
Ship only files confirmed still-used (some are on the delete list).

| # | File | Current → Target | Match sibling |
|---|---|---|---|
| 1 | `terrain/blocks/grass_dirt_block_01.png` | oversized → **= grass_dirt_block_left.png** | accepted block |
| 2 | `terrain/blocks/grass_dirt_block_02.png` | oversized → **= grass_dirt_block_left.png** | accepted block |
| 3 | `terrain/blocks/grass_dirt_block_flower_01.png` | oversized → **= grass_dirt_block_left.png** | accepted block |
| 4 | `terrain/blocks/grass_dirt_block_flower_02.png` | oversized → **= grass_dirt_block_left.png** | accepted block |
| 5 | `structures/platforms/grass_dirt_platform_long.png` | 2172×724 → **= grass_dirt_platform_long_left.png (192×40)** | accepted platform |
| 6 | `structures/stone_brick/stone_brick_single.png` | oversized → **56×56** | stone set |
| 7 | `structures/stone_brick/stone_wall_low.png` | oversized → **168×56** | stone set |
| 8 | `structures/stone_brick/stone_wall_stairs.png` | oversized → **168×112** | stone set |
| 9 | `obstacles/planter_pot/planter_pot.png` | oversized → **64×80** | planter set |
| 10 | `obstacles/vine_barrier/vine_barrier_01.png` | oversized → match the 4-frame set | vine anim |

> Batches 4+ (remaining oversized USED sprites — `misc/` power-up stand-ins,
> `background/`, `effects/` bursts, `ui/buttons/`) are **lower priority (perf only,
> no visual bug)**. After the developer runs the cleanup (🅰) the remaining
> oversized-USED set is small; the dev will hand you the exact next-10 list then,
> so you never re-export a file that's about to be deleted.

### 🔑 Why this order
1. **Batch 1** = the only batch that fixes a *visible* bug (flame-orchid) + *loading* errors (6 dead keys). Do first.
2. **Batch 2** = HUD/pickup polish + the heaviest 1254² collectibles.
3. **Batch 3+** = pure file-size / load-time wins (the 204 MiB → target ~30–40 MiB).

### 🔒 Canonical-size rule (so this never recurs)
Every sprite is **authored/exported at the size it is drawn on screen**, never a 1254×1254 raw generator dump. Player = 64×96; in-lane collectibles ≈ 96×96; HUD icons 48–64; small decor ≤ 96; blocks/platforms per family. CI (`node scripts/audit-assets.mjs --check --strict`) already fails the build on off-canonical **player** frames; we are extending that check to collectibles next.

---

## 🗄 Historical wave-log (SUPERSEDED — kept for reference only)

## 🎯 ACTIVE DESIGNER ASKS — 2026-05-30 (curation pass, 7 files)

(Superseded — see the ROUND-2 REVIEW + CURRENT PLAN sections at the top of this file.)

After the duplicate-archive PR (33 files → `_source/rejected_2026_05_30/`)
and the PENDING_WIRE curation pass (10 alt-art files → `_source/future/`),
the audit now lists exactly **7 real designer asks**. Everything else is
either delivered, intentional, or out-of-scope (`_source/`).

### 🟥 P0 — Missing orchid_gold animation frames (6 files)

Six `gameConfig` keys point at orchid_gold sparkle / collect frames that
**do not exist on disk** and have no path-safe alternate. Every frame
**must** be drawn from scratch on the canonical 96 × 96 RGBA canvas
(matching the already-delivered `orchid_gold_collect_07.png` /
`orchid_gold_collect_08.png` siblings).

**Shared spec for all 6 frames:**
- **Canvas:** 96 × 96 px
- **Format:** PNG, RGBA, **transparent background** (PNG color type 6 — no white/black flat)
- **Padding:** centred sprite, 2-4 px breathing room from canvas edge
- **Style continuity:** match `orchid_gold_collect_07.png` and `_08.png` (same hue, outline weight, palette)
- ❌ **Do NOT re-use** the legacy 1254×1254 `collect_02/03/04.png` or `main.png` — those are oversized RGB flats (color type 2) and will be rejected by the audit.

| # | Path on disk | File name | Canvas | Purpose in game |
|---|---|---|---|---|
| 1 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_01.png` | 96 × 96 RGBA | Idle-shimmer frame **1/4** orbiting an un-collected gold orchid |
| 2 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_02.png` | 96 × 96 RGBA | Idle-shimmer frame **2/4** (slight phase shift from #1) |
| 3 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_03.png` | 96 × 96 RGBA | Idle-shimmer frame **3/4** |
| 4 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_04.png` | 96 × 96 RGBA | Idle-shimmer frame **4/4** — closes the loop back to #1 |
| 5 | `assets/collectibles/orchid_gold/` | `orchid_gold_collect_05.png` | 96 × 96 RGBA | Pickup-burst frame **5/6** — petals / specks at ~85% travel |
| 6 | `assets/collectibles/orchid_gold/` | `orchid_gold_collect_06.png` | 96 × 96 RGBA | Pickup-burst frame **6/6** — residual fade, closes the pickup |

### 🟥 P0 — Side-pair scenery re-export (1 pair = 2 files)

The terrain `grass_dirt_step` side-aware pair ships at two different
oversized canvases — the engine renders both halves through the same
dispatcher at the same target scale, so the mismatched half visibly
pops on the wrong side. Both halves need a clean re-export to the same
canonical canvas as the rest of the terrain-block family.

| Side | Path | Current dims | Target dims | Format |
|---|---|---|---|---|
| LEFT | `assets/terrain/blocks/grass_dirt_step_left.png` | **1086 × 1448** | **168 × 168** | PNG RGBA, transparent BG |
| RIGHT | `assets/terrain/blocks/grass_dirt_step_right.png` | **1254 × 1254** | **168 × 168** | PNG RGBA, transparent BG |

- **Both halves identical canvas size** — same as `grass_dirt_block_left/right` (168 × 168 RGBA).
- **Anchor:** sprite centred; step diagonal meets exactly at the canvas inner edge so left + right tile seamlessly side-by-side.
- ❌ **No code workaround** — the engine will NOT rescale one half to mask the mismatch.

> Distinct from road kit: `assets/terrain/road/**` lane / shoulder pairs
> are intentionally asymmetric (3-point perspective). They show in the
> image audit under "Road-kit intentional asymmetry" and are **not** a
> designer task.

### 🟩 Not a designer task — already resolved on engine side

- **PENDING_WIRE (10 alt-art files)** — moved to `assets/_source/future/`. Same concepts (bush, flower, tuft, mushroom_small, mountains-far) already exist at canonical paths.
- **Group #14 (question_block_02 / _04 SHA-equal)** — runtime-required intentional duplicate, allowlisted in `scripts/audit-images.mjs`.

---

## 📌 DESIGNER HANDOFF — READ THIS FIRST (1 minute)

### ✅ DO THIS NEXT (in this order)

#### ✅ P0 — Player Frame Re-export — **DELIVERED & ACCEPTED** (v3.8.33)

Designer delivered all 7 re-exports. `node scripts/audit-assets.mjs --check` reports **OK 26 / FAIL 0 / MISSING 0**. Sprite Lab technical sheet shows every state visible with stable canonical box. Player animation visual QA sign-off **unblocked**.

| Key | Status | Source | Path |
|---|---|---|---|
| `playerFarmerJump01` | ✅ accepted | 64 × 96 | `assets/player/farmer_jump/player_farmer_jump_01.png` |
| `playerFarmerJump02` | ✅ accepted | 64 × 96 | `assets/player/farmer_jump/player_farmer_jump_02.png` |
| `playerFarmerJump03` | ✅ accepted | 64 × 96 | `assets/player/farmer_jump/player_farmer_jump_03.png` |
| `playerFarmerCrouch01` | ✅ accepted | 64 × 96 | `assets/player/farmer_crouch/player_farmer_crouch_01.png` |
| `playerFarmerCrouch02` | ✅ accepted | 64 × 96 | `assets/player/farmer_crouch/player_farmer_crouch_02.png` |
| `playerFarmerCrouch03` | ✅ accepted | 64 × 96 | `assets/player/farmer_crouch/player_farmer_crouch_03.png` |
| `playerFarmerCrouch04` | ✅ accepted | 64 × 96 | `assets/player/farmer_crouch/player_farmer_crouch_04.png` |

The export rules below are now the **enforced standard** for every future player frame batch. CI runs `node scripts/audit-assets.mjs --check --strict` which exits 1 if any registered `playerFarmer*` frame is not exactly 64 × 96. The defensive fit-to-canonical fallback in the renderer is retained as a safety net but must not trigger in practice for accepted frames.

**Required export rules for ALL player frames** (Run / Jump / Crouch / Hit / Idle / Death):

- ✅ **Canvas**: exactly **64 × 96 px**, transparent background
- ✅ **Foot baseline**: character's feet touch the canvas bottom edge (Y = 96)
- ✅ **Center axis**: character horizontally centred (X = 32)
- ✅ **Body pixel scale**: identical across all poses
- ✅ **Padding**: transparent — crouch pose leaves ~24 px transparent at the top; jump pose may extend up to the canvas top
- ❌ **No per-pose auto-crop**
- ❌ **No 1254 × 1254 canvas** or any other non-canonical size
- ❌ **No tight-cropped crouch / jump frames**

#### ✅ P1 — Side-aware Golden Rule pairs — **DELIVERED & WIRED** (v3.8.34)

Designer delivered 8 PNGs (4 pairs); engine registered new keys + wired the side-aware dispatcher branches; `SIDE_PAIR_PENDING` count dropped 17 → 9. Mapping default is `swapped` (visible-face convention, matching the v3.8.27 wave). Acceptance verified via the Sprite Lab QA panel `?debugSides=1` overlay.

| Pair | Status | Path | Mapping |
|---|---|---|---|
| `stone_wall_low_left/right` (168 × 56) | ✅ accepted | `assets/structures/stone_brick/` | swapped |
| `stone_brick_single_left/right` (56 × 56) | ✅ accepted | `assets/structures/stone_brick/` | swapped |
| `stone_wall_stairs_left/right` (168 × 56) | ✅ accepted | `assets/structures/stone_brick/` | swapped |
| `obstacles/planter_pot_left/right` (64 × 80) | ✅ accepted | `assets/obstacles/planter_pot/` | swapped |

#### ✅ P2 — Anim sheets — **DELIVERED & ACCEPTED** (v3.8.34)

Designer delivered every previously-dead anim key at the canonical path. Files bridge the existing keys; no config changes required.

- ✅ `effects/hit_flash/hit_flash_01..04.png` → `hitFlash01..04` (wired in EffectsRenderer)
- ✅ `effects/jump_dust/jump_dust_01..04.png` → `jumpDust01..04` (wired in EffectsSystem)
- ✅ `effects/lane_swoosh/lane_swoosh_03..04.png` → `laneSwoosh03..04` (completes the 4-frame sequence)
- ✅ `effects/collect_burst/collect_burst_08.png` → `collectBurst08`
- ✅ `effects/dust_puff/dust_puff_04.png` → `dustPuff04`
- ✅ `effects/sparkle/sparkle_01..04.png` (updated re-export)
- ✅ `collectibles/orchid_gold/orchid_gold_collect_07..08.png` → `orchidGoldCollect07..08`
- ✅ `collectibles/orchid_gold/orchid_gold_main.png` (updated re-export)

#### 🛑 P2 — REJECTED in v3.8.34 intake (moved to `_source/`)

Two folders shipped to non-canonical paths that duplicate the already-registered canonical locations. Moved to `assets/_source/rejected_2026_05_29/` (with `README.md` documenting why) so designer can recover if needed; engine never reads from `_source/`.

| Rejected path | Canonical path | Reason |
|---|---|---|
| `assets/effects/orchid_gold_collect/orchid_gold_collect_01..06.png` | `assets/collectibles/orchid_gold/orchid_gold_collect_01..06.png` | wrong category; canonical already filled |
| `assets/effects/orchid_gold_sparkle/orchid_gold_sparkle_01..04.png` | `assets/collectibles/orchid_gold/orchid_gold_sparkle_01..04.png` | wrong category; canonical already filled |

If a future re-spin of these animations is needed, overwrite IN PLACE at the canonical paths above — do not re-create under `assets/effects/`.

#### ✅ P3 — Player WIP folders — **MOVED** (v3.8.33)

Player WIP batches moved to `assets/player/_source/` per the housekeeping rule. Engine never reads from `_source/`; audit script now also skips it (v3.8.34) so designer working-files don't pollute the unregistered / overdelivery counts.

### 🛑 DO NOT MAKE MORE OF THESE (already enough)

| Stem | Current | Brief target |
|---|---|---|
| `player_farmer_run` | **12** | 8 (use 4 extras as headroom only) |
| `player_farmer_jump` | **16** | 6 (10 extras already enough) |
| `sparkle_*` | **13** | 4 (anim sheet) |
| `dust_*` (4 stems: burst, puff, cloud, smoke) | **15** | 1 sheet (`dust_puff_01..04`) |
| `cloud_*` | **6** | 3 (small / medium / large) |
| powerup auras / medallions (`powerups/*` + `pickups/aura/*`) | **13** | 0 until pickup polish ships |
| `_01` / `_02` / `_alt` suffix variants of canonical names | many | 0 — § 4.2 forbids |

If a category is on the STOP list, please **ping the developer before drawing more**. The audit script (`node scripts/audit-assets.mjs --check`) prints the live counts.

### 🔒 REQUIRED RULES (any batch will be rejected if these break)

1. **Filenames**: lowercase + underscore, Latin only. No spaces. No Cyrillic. Two-digit frame numbers (`_01`, not `_1`).
2. **Path matches the brief**: `assets/<category>/<sub>/<name>.png`. Don't create alt-paths like `assets/platforms/` when `assets/structures/platforms/` already exists.
3. **Side-aware convention** (current wave): `_left.png` = the variant where the block's LEFT face is visible. Engine maps this as `SWAPPED` in `SIDE_MAPPING_BY_TYPE`. If a future batch uses the OPPOSITE convention (`_left` = placement on LEFT shoulder), please **flag it in the delivery notes** so the developer can flip the mapping in one line.
4. **Light source**: sun upper-right for ALL sprites (§ 1.4). Do NOT mirror-flip a `_left` to make a `_right` — that reverses the sun direction; re-draw with proper lighting.
5. **Pixel grid**: 1 × 1 px alignment, no AA except on the explicitly-noted alpha assets (halo / sun_glow / hit_flash / spider_web).
6. **Sizes**: exactly per § 5. No "close enough."

---

**Brief goal:** designer delivers finished PNGs, developer drops them into `assets/` and registers them — NO renames, NO size recalculation, NO manual anchor adjustment. Any deviation from naming/folder spec = rework.

**Cross-documents:**
- `docs/asset-audit-report.md` — auto-generated inventory (re-run `node scripts/audit-assets.mjs` to refresh)
- `docs/asset-style-audit.md` — current asset inventory and stylistic gap
- `docs/road-kit-brief.md` — separate brief for the 14-file road kit (already delivered)
- `docs/developer-integration-guide.md` — what the developer does after delivery

---

## 🔍 Asset audit (v3.8.27 — full inventory)

The repo now has **407 asset files** and **277 registered keys** in `GAME_CONFIG.assets`. Run `node scripts/audit-assets.mjs` to regenerate the full breakdown at `docs/asset-audit-report.md`. Headline numbers as of this refresh:

| Metric | Count | Note |
|---|---|---|
| **Files on disk** | 407 | PNG / SVG mix |
| **Registered keys** | 277 | gameConfig → file mapping |
| **Unregistered PNGs** | **153** | shipped but no engine wire-up |
| **Dead keys** | **28** | gameConfig key → file does NOT exist |
| **Side-aware pairs delivered** | 16 | Golden Rule, both halves shipped |
| **Side-aware orphans** | 1 | road-kit `lane_divider_center` (cosmetic, ignore) |
| **Duplicate / near-duplicate groups (≥ 3 files / stem)** | 23 | designer review candidates |

**TL;DR:** designer has been over-delivering in a few categories (sparkles, clouds, dust effects, jump/run anim frames) while the brief's stone-set + planter_pot per-side pairs (priority #1) still aren't shipped.

---

## 🛑 STOP LIST — please don't create any more of these (already enough)

The full inventory in `docs/asset-audit-report.md` shows where designer has shipped multiple variants of the same concept. Until the engine actually wires more of these (i.e. the bottleneck moves), please **don't ship more files in these stems**:

| Category | Stem | Current count | Brief target |
|---|---|---|---|
| `player/` | `player_farmer_run` | **12** | 8 (4 extras kept as headroom) |
| `player/` | `player_farmer_jump` | **16** | 6 (10 extras kept as headroom) |
| `effects/` | `sparkle` (all sparkle\_*) | **13** | 4 (anim sheet) |
| `effects/` | `dust_burst` + `dust_puff` + `dust_cloud` + `dust_smoke` | **8 + 4 + 2 + 1 = 15** | 1 anim sheet (`dust_puff_01..04`) |
| `background/` | `cloud_*` (all sizes) | **6** | 3 (small / medium / large) |
| `effects/` | `collect_burst_*` | **7** | 8 (one frame missing, but stop drawing new variants) |
| `decor/` | `grass_tuft_*` | **4** | 2 (small + large) |
| `obstacles/` | `vine_barrier_*` (full + single + alt) | **8** | 4 + 4 (anim) — already covered |
| `structures/` | `question_block_*` | **5** | 4 + 1 bonus — already covered |

**Also: no more powerup auras / medallions.** 17 files sit under `powerups/` AND `pickups/aura/`, none wired yet. Holding pattern until pickup polish ships.

**No more `_01` / `_02` suffix duplicates of any sprite the brief specifies a single canonical name for** (§ 4.2 forbids).

---

## 🎯 PRIORITY LIST — what to draw next (in this order)

> Goal: close the structural gaps that are visible in-game NOW.

### P1 — Side-aware pairs to complete the Golden Rule (3 pairs = 6 files)

These are the only side-aware types still using the canvas-flip fallback (broken lighting on right). Engine is **ready** — drop them in canonical paths and they wire instantly.

```
❌ structures/stone_brick/stone_wall_low_left.png        168 × 56 px
❌ structures/stone_brick/stone_wall_low_right.png       168 × 56 px
❌ structures/stone_brick/stone_brick_single_left.png     56 × 56 px
❌ structures/stone_brick/stone_brick_single_right.png    56 × 56 px
❌ obstacles/planter_pot/planter_pot_left.png             64 × 80 px
❌ obstacles/planter_pot/planter_pot_right.png            64 × 80 px
```

### P2 — Animation sheets (close out the effects flicker)

Single-frame stand-ins are wired and look jerky in motion. These complete the canonical 4 / 4 / 4 / 8-frame anim sheets:

```
❌ effects/sparkle/sparkle_01..04.png                     16 × 16 px each
❌ effects/hit_flash/hit_flash_01..04.png                 64 × 36 px each (stretchable to fullscreen)
❌ effects/lane_swoosh/lane_swoosh_01..04.png             96 × 64 px each
❌ effects/collect_burst/collect_burst_01..08.png         96 × 96 px each (one shipped, 7 missing)
❌ collectibles/orchid_gold/orchid_gold_sparkle_01..04    12 × 12 px each
❌ collectibles/orchid_gold/orchid_gold_collect_01..08    96 × 96 px each
```

### P3 — Player frame canonical canvas size (critical for visual consistency)

The v3.8.25 fix introduced a FIXED outer visual box per state, but the inner sprite art varies in canvas size between frames (run 64×96, crouch 64×78, jump 64×96, hit 64×96, idle 64×96). For perfect consistency, ALL player frames should be on the same canvas size with TRANSPARENT padding for poses that don't fill it.

```
✅ Target canvas: 64 × 96 px  (matches run)
✅ Foot anchor:   bottom-centre pixel (the back foot's lowest pixel)
✅ Padding:       transparent — crouch leaves ~18 px transparent at top
✅ Frame count:   per brief § 5.1
```

Re-export the CROUCH frames (currently 64×78) on a 64×96 canvas with the crouch pose at the bottom. This stops the renderer from needing the magenta inner-box debug check — the cyan outer box AND the magenta inner box will then be identical.

### P4 — Player batch cleanup (Cyrillic / translit folders)

```
player/farmer_remaining_batch/   ← 5 files, transliterated Russian names
player/farmer_unfinished_batch/  ← 8 files, Cyrillic-script names
```

Per § 4.2: rename to canonical English semantic names AND move to canonical paths, OR move both folders to `_source/`. The developer will NOT wire transliterated or Cyrillic-named files.

### P5 — Resolve powerups path

Two locations for the same conceptual asset:
- `pickups/pickup_magnet|shield|score_x2.png` — canonical (wired)
- `powerups/*` + `pickups/aura/*` — 9 + 4 = 13 ornamental aura/medallion files (none wired)

Pick: keep `powerups/` (and update brief), move to `pickups/aura/`, or delete the duplicates from `powerups/`. Until this is resolved, all 13 aura files sit unused.

### P6 — Decor large refresh — finish

Started in v3.8.22 wave (`mushroom_red_big`, `tree_round`, new `tree_tall`). Still legacy-style:

```
❌ decor/large/bushes/*           bush_large, bush_large_flower
❌ decor/large/fence/fence_corner.png  (already shipped! verify wiring)
❌ decor/large/trees/tree_round.png + tree_tall.png  ← REFRESH alt-style if a second pass is planned
```

### P7 — Background midground polish

Shipped + wired (`background/midground/rolling_hills.png`, `treeline_far.png`). If a refresh is desired with the new flat-pixel style, drop replacements at the same path.

---

## 🚦 Delivery Status (v3.8.27 — refreshed)

Legend in the per-asset sections below:
- ✅ **DELIVERED** — file exists, wired into the dispatcher, visible in game
- 🟡 **PARTIAL** — some frames / variants shipped; missing siblings noted
- ❌ **PENDING** — designer hasn't shipped yet; renderer falls back to legacy art

---

## 🚨 GOLDEN RULE — Every side prop = TWO sprites

> **Any block / wall / platform / pipe / fence / structure that sits on the road's left OR right shoulder MUST be delivered as TWO files: `_left.png` and `_right.png`.**
>
> Engine update (v3.8.15): the dispatcher now actively wires LEFT/RIGHT variants and picks the correct one per side, preserving the global sun-upper-right lighting. The legacy canvas mirror-flip (which reversed the sun direction on the right side and broke the "all blocks lit from one sun" rule) is now a fallback used only when the per-side variant isn't shipped yet.
>
> Consequence: a single billboard sprite on a side-aware type is shipped only as half a delivery. The right side will keep looking wrong until the matching variant lands.

### Which asset categories require per-side variants (mandatory)

| Category | Per-side? | Why |
|---|---|---|
| **Stone / brick walls** (`stone_wall_low`, `stone_wall_stairs`, `purple_brick_*`) | **YES — left + right** | These have explicit front + side faces; a flip reverses the lighting |
| **Grass-dirt blocks** (`grass_dirt_block_*`, `grass_dirt_step`) | **YES — left + right** | Top face tilt + sun-lit side direction matter |
| **Brick platforms / floating platforms** (`platform_floating`, `purple_platform_row_*`) | **YES — left + right** | Same as walls |
| **Pipes / planters** (`planter_pot`, `green_pipe`) | **YES — left + right** | 3/4-view body has a sun-lit + shadow side |
| **Hanging platforms** (`hanging_platform_vines`) | **YES — left + right** | Vine drop direction + lighting |
| **Fences** (`fence_wood_short`, `wooden_fence_webbed_*`) | **YES — left + right** | Plank lighting + cap-end direction |
| **Stairs / wall-stairs** | **YES — left + right** | Step orientation MUST face the road |
| **Large mushrooms decorative** (`mushroom_red_big`) | NO — single sprite | Radially symmetric; reading is robust to flips |
| **Bushes** (`bush_large`, `bush_with_purple_flowers`) | NO — single sprite | Organic / radially symmetric |
| **Trees** (`tree_round`) | NO — single sprite | Same |
| **Small flowers / grass tufts / sprouts** | NO — single sprite | Sub-pixel cluster, flip is invisible |
| **Question blocks** | NO — single sprite | Frontal block, sun on top face, no side bias |
| **Collectibles / obstacles in lane** | NO — single sprite | They're centered in the lane, not on a shoulder |

**Rule of thumb:** if the sprite has a clearly identifiable "front" face vs "side" face, OR if its lighting would look wrong when horizontally flipped → ship per-side.

### What we keep getting

Recent waves shipped a lot of new files, but most of them are:
- Duplicates of already-delivered sprites with `_01` / `_02` suffix (violates § 4.2)
- Re-skins of the same billboard (frontal, head-on) silhouette
- Auras / medallions / glow rings for power-ups (nice but not asked)
- Multiple alt-paths for the same asset (`/platforms/` vs `/structures/platforms/`)

### Per-side variants delivered so far

| Asset | Status |
|---|---|
| `grass_dirt_block_left.png` + `grass_dirt_block_right.png` | ✅ DELIVERED + WIRED (v3.8.15), **VISIBLE-FACE convention** |
| `platform_floating_left.png` + `platform_floating_right.png` | ✅ DELIVERED + WIRED (v3.8.15), **VISIBLE-FACE convention** |
| `grass_dirt_step_left.png` + `grass_dirt_step_right.png` | ✅ DELIVERED (v3.8.22) — orphan partner shipped. Awaiting wiring + convention verification |
| `fence_wood_short_left.png` + `fence_wood_short_right.png` | ✅ DELIVERED (v3.8.22). Awaiting wiring + convention verification |
| `purple_brick_single_left.png` + `purple_brick_single_right.png` | ✅ DELIVERED (v3.8.22). Awaiting wiring + convention verification |
| `grass_dirt_platform_long_left.png` + `grass_dirt_platform_long_right.png` | ✅ DELIVERED (v3.8.22). Awaiting wiring + convention verification |
| `platform_hanging_vines_left.png` + `platform_hanging_vines_right.png` | ✅ DELIVERED (v3.8.22). Awaiting wiring + convention verification |
| stone_wall_low / stone_brick_single / stone_wall_stairs / planter_pot pairs | ❌ PENDING — see remaining file list below |

### ⚠️ Naming convention finding (v3.8.19)

The A/B comparison (clean gameplay at `?sideMapping=normal` vs `?sideMapping=swapped`) showed the current wave's `_left` / `_right` files are named by **VISIBLE FACE**, not by placement shoulder.

- `_left.png`  → block's LEFT face is the prominent / visible one
   → correct for placement on the **RIGHT** shoulder (visible face points TOWARD the road)
- `_right.png` → block's RIGHT face is visible
   → correct for placement on the **LEFT** shoulder

The engine compensates via `SIDE_MAPPING_BY_TYPE` defaults set to `'swapped'` for the affected types.

**Designer ask for future batches:** please confirm which convention you used. Two clear options:
1. **PLACEMENT convention** (preferred per brief § 1.4.1) — `<name>_left.png` is the sprite for left-shoulder placement. Then a single LEFT-placed block is reading correctly is enough QA.
2. **VISIBLE-FACE convention** — `<name>_left.png` is whichever variant has its left face visible. Engine will keep the `'swapped'` mapping for those.

Either is fine as long as it's consistent within a batch.

### What the engine ACTUALLY needs

The runner camera is pseudo-3D: the road runs into a vanishing point and side props sit on the road's left and right shoulders. Frontal billboard sprites placed on either shoulder read as **"stickers floating on a flat green field"** — not as walls of a corridor.

For the corridor to feel like a real pixel-art path leading to the castle, we need **per-side oriented variants** of the corridor structures. Each block type ships TWO sprites:

| Type | Left-facing variant | Right-facing variant |
|---|---|---|
| **Stone / brick wall** | `wall_low_left.png` (3/4 view, light side on the RIGHT — facing the road) | `wall_low_right.png` (3/4 view, light side on the LEFT) |
| **Grass-dirt block** | `grass_block_left.png` (top face tilted toward viewer, right face = sun-lit, left face = shadow) | `grass_block_right.png` (mirrored) |
| **Brick platform** | `brick_platform_left.png` | `brick_platform_right.png` |
| **Pipe / planter** | `planter_pot_left.png` (3/4 angle, light upper-right) | `planter_pot_right.png` (3/4 angle, light upper-left) |
| **Question block** | already roughly billboard — fine to keep as one sprite |
| **Mushroom / bush** | already organic / radially symmetric — fine to keep as one sprite |
| **Floating / hanging platform** | `platform_floating_left.png` + `_right.png` |

### Drawing rules for per-side variants

1. **Camera view** — 3/4 isometric. NOT strictly front-on. NOT strictly side-on. The block's **top face** is visible (about 25-30% of the silhouette is the top), the **side facing the road** is the lit face, the **side facing away from the road** is the shadowed face.

2. **Light source** — global rule from § 1.4 stays: sun upper-right of the scene. So:
   - LEFT-side variant: road is on the right → block's RIGHT face is lit (gets HIGHLIGHT + LIGHT tones), LEFT face is shadowed (SHADOW + DEEP)
   - RIGHT-side variant: road is on the left → block's LEFT face is lit, RIGHT face is shadowed
   - The TOP face on both variants gets the brightest HIGHLIGHT row of pixels (the sun's top hit)

3. **Silhouette mirror is NOT enough** — a horizontally-flipped sprite will have its lighting reversed AND its top-face tilt angle reversed. The engine already auto-mirrors STRUCTURE props on `lane > 0`, but it can only do a horizontal flip; it cannot re-do the lighting. So mirror flips look wrong (sun appears to come from upper-LEFT on the right side). True per-side art fixes this.

4. **Pixel-grid alignment** — both variants must align to a 1×1 pixel grid; no sub-pixel slants. The 3/4 perspective is achieved through pixel staircase, not smooth diagonals.

### What this UNBLOCKS

Once shipped:
- The corridor stops reading as billboards on a field; it reads as a stone/grass wall on either side
- The road feels like a tunnel toward the castle (target image's main vibe)
- Engine can drop the auto-mirror flip for these types (cleaner code path)

### What we DON'T need right now

- More platform variants (we have `platform_floating`, `hanging_platform_vines`, `platform_grass_patch_01`, `platform_grass_vines_01`, `grass_dirt_platform_long` — that's already 5 platforms; adding `_01` siblings doesn't move the needle)
- More powerup auras (the 9 in `powerups/` cover us until pickup polish ships)
- More cloud sizes (3 sizes are wired; legacy 6-frame pool is unused)
- More misc props (the 10 misc icons cover the power-up + bonus rounds already)
- New player concept files in Cyrillic / translit folders

### File list to ship next (priority order)

Per § 1.4 light source + § 3 palette, per the size + folder spec.
✅ = already delivered + wired; ❌ = still missing.

```
✅ terrain/blocks/grass_dirt_block_left.png             96 × 96 px
✅ terrain/blocks/grass_dirt_block_right.png            96 × 96 px
✅ terrain/blocks/grass_dirt_step_left.png              96 × 96 px
✅ terrain/blocks/grass_dirt_step_right.png             96 × 96 px        (v3.8.22)
✅ structures/platforms/platform_floating_left.png     192 × 40 px
✅ structures/platforms/platform_floating_right.png    192 × 40 px
✅ structures/platforms/platform_hanging_vines_left.png  160 × 96 px      (v3.8.22)
✅ structures/platforms/platform_hanging_vines_right.png 160 × 96 px      (v3.8.22)
✅ structures/platforms/grass_dirt_platform_long_left.png  192 × 40 px    (v3.8.22)
✅ structures/platforms/grass_dirt_platform_long_right.png 192 × 40 px    (v3.8.22)
✅ structures/bricks/purple_brick_single_left.png       56 × 56 px        (v3.8.22)
✅ structures/bricks/purple_brick_single_right.png      56 × 56 px        (v3.8.22)
✅ decor/large/fence/fence_wood_short_left.png          96 × 80 px        (v3.8.22)
✅ decor/large/fence/fence_wood_short_right.png         96 × 80 px        (v3.8.22)

❌ P0  structures/stone_brick/stone_wall_low_left.png      168 × 56 px
❌ P0  structures/stone_brick/stone_wall_low_right.png     168 × 56 px
❌ P0  structures/stone_brick/stone_brick_single_left.png   56 × 56 px
❌ P0  structures/stone_brick/stone_brick_single_right.png  56 × 56 px
❌ P0  obstacles/planter_pot/planter_pot_left.png           64 × 80 px
❌ P0  obstacles/planter_pot/planter_pot_right.png          64 × 80 px

❌ P1  structures/stone_brick/stone_wall_stairs_left.png   168 × 112 px
❌ P1  structures/stone_brick/stone_wall_stairs_right.png  168 × 112 px
```

Total remaining: 8 files (4 pairs P0 + 1 pair P1). All sizes are from § 5 — no guessing.

Plus to wire ASAP: 5 newly-delivered pairs need engine registration (gameConfig keys + SIDE_AWARE_TYPES list).

**Drawing reminder for every pair:**
- LEFT variant: 3/4 view, road is on the RIGHT → block's RIGHT face is lit (HIGHLIGHT + LIGHT tones), LEFT face is shadowed (SHADOW + DEEP). Top face brightest along its top-right edge.
- RIGHT variant: road is on the LEFT → block's LEFT face is lit, RIGHT face is shadowed. Top face brightest along its top-LEFT edge.
- DO NOT just horizontally flip the LEFT to make the RIGHT — that reverses the sun direction. Each side is a fresh draw with a re-rendered lighting pass.

### Cohesion test before delivery

Place left+right variant of one block type next to each other. They must look like the SAME block rotated to face inward from two sides of a road — not two different lighting styles. If one looks brighter / more saturated than the other, redo. Sun-direction consistency from § 1.4 is what makes the per-side variants read as a cohesive corridor.

---

### High-level summary

| Category | Status | Notes |
|---|---|---|
| **Road kit (14 files)** | ✅ DELIVERED | All foreground / mid / far / shoulder / divider / patch tiles. Anchor + tiling verified. |
| **Player run cycle** | ✅ DELIVERED | 12 frames shipped (brief asked 8); engine uses first 8, leaves headroom for smoother variant |
| **Player crouch** | ✅ DELIVERED | All 4 frames |
| **Player jump** | 🟡 PARTIAL | 16 frames shipped (brief asked 6); engine uses first 6 — extras are spare |
| **Player hit** | ✅ DELIVERED | All 4 frames now shipped |
| **Player idle** | ✅ DELIVERED | All 4 frames now shipped |
| **Player extras (v3.8.6)** | ⚠️ REWORK | `farmer_remaining_batch/` + `farmer_unfinished_batch/` contain Cyrillic / transliterated filenames — violate § 4.2, will not be wired without renaming |
| **Collectibles — orchid_gold** | 🟡 PARTIAL | main + big + halo delivered. 4-frame sparkle + 8-frame collect burst still missing — single-frame fallbacks in use |
| **Collectibles — rare blue orchid** | ✅ DELIVERED | `orchid_blue_rare.png` + `orchid_blue/orchid_blue_rare_halo.png` shipped (v3.8.7 wave) |
| **Obstacles — vine_barrier** | ✅ DELIVERED | All 4 sway frames + 4 single-lane variants |
| **Obstacles — planter_pot** | ✅ DELIVERED | Replaces Mario pipe |
| **Obstacles — dry_grass / overhangs / small mushroom** | 🟡 PARTIAL | Core sprites shipped, but only as single frame each (no animation yet) |
| **Structures — question_block** | ✅ DELIVERED | 4-frame bounce + bonus variant + 2 gold variants |
| **Structures — stone_brick / wall_low / wall_stairs** | ✅ DELIVERED | All 3 stone-set sprites shipped — neutral grey replacement for purple Mario bricks |
| **Structures — fences (v3.8.6)** | 🟡 PARTIAL | `wooden_fence_webbed_01.png` shipped under `structures/fences/`; canonical short/corner fences still missing |
| **Structures — platforms (floating / hanging)** | 🟡 PARTIAL MIGRATION | v3.8.9: `hanging_platform_vines.png` MOVED to canonical `structures/platforms/`. `platform_floating.png` still ONLY in the wrong root `assets/platforms/`. Plus duplicate files now exist in BOTH `platforms/` and `structures/platforms/` (`platform_grass_vines_01.png`) — must dedupe |
| **Structures — platforms grass variants (v3.8.9)** | ✅ NEW | `structures/platforms/platform_grass_patch_01.png` + `platform_grass_vines_01.png` shipped in canonical path. Good visual fit for the new corridor cluster prefabs — wire as alt platform variants |
| **HUD power-up icons (canonical pickup_*)** | ✅ DELIVERED | v3.8.7 wave shipped canonical `pickups/pickup_magnet.png` + `pickup_shield.png` + `pickup_score_x2.png`; engine can switch off the misc/ stand-ins |
| **Power-up decoration sprites (v3.8.7)** | ✅ NEW, ❌ NOT WIRED | NEW root `assets/powerups/` with 9 ornamental sprites (gold_star, magic_circle_glow, magnet_01, magnet_gold_aura, medal_x2_gold, multiplier_x2_medal_01, orchid_shield_glow, shield_orchid_01, star_gold_01). Treat as alt visuals / aura effects for the canonical pickups |
| **Background — greenhouse** | ✅ DELIVERED | far / mid / near all 3 LODs |
| **Background — mountains far** | ✅ DELIVERED | `mountains_far_01.png` (alt path) wired with fallback |
| **Background — clouds** | 🟡 PARTIAL | 3 alt cloud sizes delivered (top-level path); legacy 6-frame cloud pool unused |
| **Background — castle (legacy → greenhouse)** | ✅ DELIVERED | greenhouse wins; `castle_far_01` alt wired as fallback |
| **Background — midground (v3.8.9)** | ✅ DELIVERED | `background/midground/rolling_hills.png` + `treeline_far.png` shipped — closes brief § 5.12. Wire into LandmarksRenderer or BackgroundRenderer for the rolling-hills depth band between mountains and grass field |
| **Effects — dust set (v3.8.6)** | 🟡 PARTIAL | NEW `effects/dust/` shipped — `dust_burst_01..04` (4-frame!), `dust_cloud_01..02`, `dust_puffs_01`, `dust_smoke_01`. NOT yet wired |
| **Effects — light streak (v3.8.6)** | ✅ NEW | `effects/light/light_streak_01.png` — candidate replacement for `speed_line.png` |
| **Effects — magic glow (v3.8.6)** | ✅ NEW | `effects/magic/magic_glow_rainbow_01.png` — candidate for rare orchid halo / power-up ambient |
| **Effects — anim sheets (sparkle/hit/swoosh/collect)** | ❌ PENDING | 4/4/4/8-frame sheets still missing; single-frame fallbacks in use |
| **HUD wooden panels** | ✅ DELIVERED | `hud_panel_score / lives / tool / long.png` all shipped. CSS pixel-emboss can be swapped for PNG backgrounds when HUD is reskinned |
| **HUD variants (v3.8.6)** | ✅ NEW, ❌ NOT WIRED | `ui/hud/hud_hearts_panel_empty / hud_panel_long / hud_panel_vines` + `ui/cards/tool_shovel_card` + `ui/buttons/button_small_gray` + `ui/panels/panel_large_dark` |
| **HUD power-up icons (pickup_magnet / shield / x2)** | ✅ DELIVERED (via misc/) | Designer shipped `sign_wooden_shield` (Shield), `potion_emerald` (Magnet), `artifact_hourglass` (×2 Score). Map-by-glow-colour wired in `GameplayRenderer.power()` |
| **Game-over modal panel** | ✅ DELIVERED | `panel_game_over.png` shipped |
| **Decor — small (flowers / grass / mushrooms / bushes)** | 🟡 PARTIAL | New `/decor/` folder shipped 6 fresh variants; legacy decor_small still active |
| **Decor — large (trees / big mushroom / fence)** | ❌ PENDING | Legacy illustration-style still in use |
| **Terrain blocks (grass_dirt_block_01/02/flower/step)** | ✅ DELIVERED | All 6 alt-path variants registered; renderer needs to pick them up via dispatcher hook |

### Misc / bonus deliveries

Designer also shipped a `assets/misc/` folder with 10 props not in the brief — repurposed for power-up icons + future bonus rounds. See § 5.13 for the mapping.

### v3.8 bonus deliveries (beyond the original brief)

The designer's second wave also shipped a complete **HUD icon + button + multiplier kit** under `assets/ui/`:
- `icons/icon_heart_full / icon_heart_empty / icon_energy_full / icon_energy_empty` (new pixel-art replacements for the legacy heart_* / energy_segment_* sprites)
- `buttons/button_pause / button_retry / button_menu_back / ui_button_play / ui_button_restart`
- `currency/ui_flower_icon_basic / ui_flower_icon_gold`
- `multipliers/ui_multiplier_x2 / x3 / x5_banner` — perfect for the combo HUD badge
- `status/ui_heart_red_01 / _02 / ui_heart_empty_dark / ui_battery_green` (alt heart & energy variants)
- `tools/tool_shovel_full / blade / handle` (canonical-named shovel set)

All registered as new `gameConfig.assets` keys (see § 2.3 of `developer-integration-guide.md`). HUD can be reskinned to use them without changing markup.

### v3.8.6 wave deliveries (NEWEST batch — not yet wired)

The designer shipped a third bonus wave with effect sheets, expanded HUD variants, and an oversized player run cycle. **The developer needs to register and wire these.**

#### New effect categories under `assets/effects/`

| Folder | Files | Status | Use case |
|---|---|---|---|
| `effects/dust/` | `dust_burst_01..04` (4-frame anim), `dust_cloud_01..02`, `dust_puffs_01`, `dust_smoke_01` | ✅ shipped, ❌ NOT wired | dust_burst replaces the single-frame `dust_puff_small.png` fallback; cloud/puffs/smoke are stand-ins for jump dust / landing dust |
| `effects/light/` | `light_streak_01` | ✅ shipped, ❌ NOT wired | replaces the speed_line.png — use as decal for power-up burst + speed feel |
| `effects/magic/` | `magic_glow_rainbow_01` | ✅ shipped, ❌ NOT wired | candidate for rare-orchid halo or magnet/power-up ambient effect |

These are SINGLE-FRAME stand-ins; the full 4-frame anim sheets requested in the brief (`dust_puff_01..04`, `jump_dust_01..04`, `sparkle_01..04`, `hit_flash_01..04`, `lane_swoosh_01..04`, `collect_burst_01..08`) are still **pending**.

#### New HUD variants under `assets/ui/`

- `ui/hud/hud_hearts_panel_empty.png` — alt "all-empty" lives panel for the death screen
- `ui/hud/hud_panel_long.png` — secondary long panel variant (different ornament)
- `ui/hud/hud_panel_vines.png` — vine-decorated panel for the menu / game-over modal
- `ui/cards/tool_shovel_card.png` — boxed-card variant of the shovel HUD (frame + icon in one)
- `ui/buttons/button_small_gray.png` — neutral utility button (e.g. settings / leaderboard list rows)
- `ui/panels/panel_large_dark.png` — dark variant of the large modal (for high-contrast overlays)

These give the HUD more compositional flexibility; not all need to be used today, but they should be registered so the renderer can opt in.

#### Expanded player run (12 frames instead of 8)

The original brief asked for 8 run frames. The designer has now shipped 12 (`player_farmer_run_01..12`) — the engine still consumes only the first 8, leaving the additional 4 as headroom for a future "smoother variant" or a stride-step animation.

#### ⚠️ Naming-convention violations (rework required before wiring)

Two sub-folders under `assets/player/` contain files that **violate § 4.2 naming rules** and CANNOT be wired as-is:

```
player/farmer_remaining_batch/   ← uses Russian transliteration (e.g. 01_sadovyy_truzhenik...)
player/farmer_unfinished_batch/  ← uses Cyrillic-script filenames (non-ASCII characters)
```

These appear to be in-progress concepts. The brief mandates:
- Lowercase + underscore Latin only — no Cyrillic, no transliteration, no spaces
- Two-digit frame numbers (`_01` not `_1`)
- Semantic English names (`player_farmer_jump_01.png` etc.)

**Designer action required:** rename each finished frame to its canonical name (e.g. `player_farmer_idle_05.png`) OR move them to a `_source/` sub-folder so they don't pollute the production tree. The developer will NOT wire transliterated / Cyrillic-named files.

#### Stray new directory

`assets/scenery/` exists but is empty. If the designer plans to use it, please clarify intent — currently undocumented.

---

### v3.8.7 wave deliveries (THIRD batch — partial wiring needed)

The designer's fourth wave (informal numbering) closed three of the top-priority gaps:

#### Closed priorities

| Brief priority | What shipped | Path |
|---|---|---|
| **`orchid_blue_rare_halo`** (was #4 on priority list) | ✅ shipped | `collectibles/orchid_blue/orchid_blue_rare_halo.png` |
| **Canonical pickup icons** (was #6 on priority list) | ✅ shipped | `pickups/pickup_magnet.png`, `pickups/pickup_shield.png`, `pickups/pickup_score_x2.png` — direct replacements for the `misc/*` stand-ins |
| **Platforms** (was #5 on priority list) | ✅ shipped — WRONG PATH | `platforms/platform_floating.png`, `platforms/platform_hanging_vines.png` (+ 4 grass variants) |

#### ⚠️ Directory naming variances

The designer shipped two new root-level directories that don't match either § 4.1 (the brief's canonical tree) or the engine's existing paths:

```
assets/platforms/         ← brief says assets/structures/platforms/
assets/powerups/          ← not in brief; closest match is assets/pickups/ (canonical icons)
```

**Resolution paths (developer needs to pick one):**
- **Option A — move the files** to the canonical tree (`platforms/* → structures/platforms/*`, `powerups/* → pickups/*` or a new `pickups/aura/` sub-folder)
- **Option B — register new keys** in `gameConfig.assets` that point at the new roots and treat them as alt paths (designer's choice "stays")

Option A keeps the project tidy; Option B is faster. **Pick before wiring**, otherwise we accumulate two sources of truth for the same prop.

#### Duplicate-with-suffix files in new dirs

Both new root dirs ship some files in BOTH bare-name AND `_01`-suffix forms — violates § 4.2 "no v2/copy suffixes":

```
platforms/platform_grass_small.png      AND platforms/platform_grass_small_01.png
platforms/platform_grass_vines.png      AND platforms/platform_grass_vines_01.png
powerups/powerup_magnet_01.png          (and bare powerup_magnet.png? — check before wiring)
powerups/powerup_shield_orchid_01.png
powerups/powerup_star_gold_01.png
powerups/powerup_multiplier_x2_medal_01.png
```

**Designer action:** pick the canonical version per pair (the suffix-less one OR the `_01` one), delete the duplicate. Two files with the "same intent" but different names will get accidentally wired to different keys and the renderer will pick whichever loaded first.

#### Powerup decoration vs. canonical icon

The 9 files under `assets/powerups/` look ornamental (auras, medallions, glow rings), NOT replacements for the canonical small pickup icons. Likely role:
- Aura/halo for active power-up state (`powerup_*_aura.png`, `powerup_*_glow.png`)
- Awarded-medal popup (`powerup_medal_x2_gold.png`, `powerup_multiplier_x2_medal_01.png`)
- Alt icon variants for HUD breadth (`powerup_magnet_01.png`, `powerup_shield_orchid_01.png`)

Brief was silent on aura/medallion variants; treat as bonus deliveries and wire as visual upgrades when the corresponding power-up gameplay ships polish.

---

### v3.8.9 wave deliveries (FOURTH batch — midground + path migration)

The fifth informal wave closed the long-pending midground gap and started canonicalising the rogue `assets/platforms/` directory.

#### Closed priorities

| Brief priority | What shipped | Path |
|---|---|---|
| **Background midground** (was #5 on priority list) | ✅ shipped both files | `background/midground/rolling_hills.png` + `background/midground/treeline_far.png` — direct match to brief § 5.12 |
| **Platform canonical path** (partial) | ⚠️ partial migration | `hanging_platform_vines.png` MOVED to `structures/platforms/` ✅. `platform_floating.png` STILL only in `/platforms/` root ❌ |

#### New deliveries this wave

- `structures/platforms/platform_grass_patch_01.png` — grass-tile patch on platform (alt variant)
- `structures/platforms/platform_grass_vines_01.png` — platform with vine garlands (canonical-path version)

Both look like good fits for the corridor cluster prefabs (`long-platform-with-mushroom`, `long-platform-question-stack`). They are not in the original brief — treat as bonus alternates.

#### ⚠️ Lingering path duplicates

The migration is INCOMPLETE — `assets/platforms/` still has all 6 original files, while `assets/structures/platforms/` now has 5 files (some overlapping). Specifically:

```
DUPLICATED across BOTH directories:
  hanging_platform_vines.png      (in both: keep structures/, delete platforms/)
  platform_grass_vines_01.png     (in both: same — keep structures/)

ONLY in /platforms/ root (NOT YET MIGRATED):
  platform_floating.png           ← biggest gap, brief expected canonical path
  platform_grass_small.png
  platform_grass_small_01.png
  platform_grass_vines.png        ← bare-name version; structures/ has _01 only
```

**Designer action required:**
1. **Move** `platform_floating.png` to `structures/platforms/` (engine expects it there)
2. **Dedupe** the bare-name vs `_01` siblings: per § 4.2, pick one and delete the other
3. **Delete** the `assets/platforms/` root directory once empty — clean separation

The developer will NOT auto-discover files under two paths. Wiring is on hold for `platform_floating` until canonicalised.

---

### v3.8.22 wave deliveries (HUGE Golden Rule wave + canonical fences + decor refresh)

The designer's response to the Golden Rule push: **5 per-side pairs** + **canonical fence kit** + **decor large refresh started**. This wave closes the biggest single batch of priority items in any wave so far.

#### Per-side pairs shipped (5 new pairs = 10 files)

All under the brief's canonical paths:
- `terrain/blocks/grass_dirt_step_right.png` — orphan partner for the long-standing `_left`. Pair complete
- `structures/platforms/platform_hanging_vines_left/right.png` — P1 closed
- `structures/platforms/grass_dirt_platform_long_left/right.png` — P2 closed
- `structures/bricks/purple_brick_single_left/right.png` — P2 closed
- `decor/large/fence/fence_wood_short_left/right.png` — fences are side-aware (Golden Rule item, P1 closed)

#### Canonical fences shipped (brief priority #8 closed)

```
decor/large/fence/fence_short.png    96 × 80 px   ← canonical short fence
decor/large/fence/fence_corner.png  112 × 80 px   ← canonical corner fence
```

The earlier `wooden_fence_webbed_01.png` can now be treated as an alt skin, OR retired in favour of these canonical files. Developer call.

#### Decor large refresh STARTED (brief priority #7 partial)

- `decor/large/mushrooms/mushroom_red_big.png` — refreshed (file size jumped 924K → 1.09M, high-detail flat pixel-art per § 1.1)
- `decor/large/trees/tree_round.png` — refreshed (file size jumped to 1.27M)
- `decor/large/trees/tree_tall.png` — **NEW** variant for silhouette diversity

Engine paths already point at these files — they hot-swap on next load.

#### Bonus deliveries

- `terrain/blocks/stone_block_mossy_cube.png` — new mossy stone block variant (not in brief, bonus). Good fit for a stone-themed cluster prefab if we want a stone-corridor visual identity
- `obstacles/mushroom_small/mushroom_small_red.png` — at the canonical path (was previously only under `obstacles/mushrooms/`)
- `structures/platforms/platform_hanging_vines.png` — billboard version finally moved to canonical path (closes the v3.8.7 path-migration item for this file)

#### Convention verification needed (v3.8.22 wave)

The first two pairs shipped in v3.8.15 (`grass_dirt_block`, `platform_floating`) used the VISIBLE-FACE convention, so the engine has them mapped as `'swapped'` (see § 1.4.1 finding). The new pairs MAY follow the same convention or the placement convention — the developer will check at wiring time using `?debugSideMatrix=1`. Either way it's one Map entry per type in `SIDE_MAPPING_BY_TYPE`.

**Designer ask:** going forward, please flag in the delivery notes which convention each pair uses, so the developer can wire the mapping correctly in one shot:
- **Placement convention** — `_left.png` is for LEFT-shoulder placement (gives engine mapping `'normal'`)
- **Visible-face convention** — `_left.png` is whichever variant has its left face visible (gives engine mapping `'swapped'`)

### What we still need most (priority order)

> v3.8.22 update: HUGE Golden Rule wave shipped — 5 per-side pairs + canonical fences + decor large refresh started. Items #1 (mostly), #2, #7 (started), #8 all closed or partially closed. Remaining list shortened significantly.

1. **🚨 Remaining P0 per-side pairs (Golden Rule, 3 pairs)** — only stone-set bricks + planter_pot left to close P0:
   - `stone_wall_low_left/right.png`        (168 × 56)
   - `stone_brick_single_left/right.png`     (56 × 56)
   - `planter_pot_left/right.png`            (64 × 80)
2. **P1 per-side pair (1 pair)** — `stone_wall_stairs_left/right.png` (168 × 112)
3. **Resolve v3.8.7 powerups path** — pick Option A (move `powerups/* → pickups/aura/`) or Option B (alt-keys). BLOCKING wiring of the 9 powerup aura/glow sprites
4. **Rename / move v3.8.6 player batches** — `farmer_remaining_batch/` + `farmer_unfinished_batch/` use Cyrillic and translit names. Pick canonical names OR move to `_source/` so they don't sit in the production tree (BLOCKING wiring)
5. **Sparkle + hit_flash + lane_swoosh + collect_burst anim sheets** — `sparkle_01..04`, `hit_flash_01..04`, `lane_swoosh_01..04`, `collect_burst_01..08`. Single-frame stand-ins look jerky in-game
6. **Orchid burst + sparkle anim sheets** — `orchid_gold_sparkle_01..04` (4 frames) + `orchid_gold_collect_01..08` (8 frames)
7. **Decor large refresh — finish** — partial done (mushroom_red_big + tree_round + new tree_tall). Bushes / fence-decor / leaf-clumps in `decor_large/` still legacy
8. **Clarify `assets/scenery/`** — empty directory; intent undocumented

### What we do NOT need more of (please stop)

To save designer time and avoid duplicate-folder clutter:
- ❌ **No more `_01` / `_02` suffix duplicates** of already-delivered sprites (§ 4.2 forbids)
- ❌ **No more billboard-only variants** of side-aware corridor blocks — see Golden Rule. Every wall / brick / platform / pipe / fence / stairs goes in PAIRS
- ❌ **No more grass-platform billboard alternates** — current 5 billboards cover the fallback path; per-side pairs shipped now
- ❌ **No more powerup auras / medallions** until pickup gameplay polish ships (9 shipped, none wired yet)
- ❌ **No more cloud sizes** (3 shipped, legacy 6-frame pool unused)
- ❌ **No new Cyrillic / transliterated filenames** — § 4.2 strict

### Developer-side TODO (to actually USE the v3.8.22 wave)

Engine work, not designer asks:
1. Register 10 new gameConfig.assets keys (5 pairs) — `fenceWoodShortLeft/Right`, `purpleBrickSingleLeft/Right`, `grassDirtPlatformLongLeft/Right`, `platformHangingVinesLeft/Right`, `grassDirtStepRight`
2. Extend `SIDE_AWARE_TYPES` set in `sceneryDispatch.js` to include: `fence_wood_short`, `purple_brick_single`, `grass_dirt_platform_long`, `hanging_platform_vines`, `grass_dirt_step`
3. Add dispatcher branches for the new types following the `grass_dirt_block` / `floating_platform` pattern
4. Verify each new pair via `?debugSideMatrix=1` — pick `normal` vs `swapped` per type, lock in `SIDE_MAPPING_BY_TYPE`

---

---

## 0. Context and target audience

| Parameter | Value |
|---|---|
| Genre | 3-lane endless runner (Subway Surfers / Temple Run schema) |
| Platform | Pure web — JS + HTML5 Canvas. Not Unity, not Godot, not a game engine. |
| Canvas | 1536 × 864 (16:9) — CSS-scales to fit device |
| Target audience | 18–40, casual / mid-core, nostalgic for 16-bit aesthetic |
| Setting | Botanical garden / enchanted grove — gardener hero collects golden orchids |
| Camera | Pseudo-3D: road runs into a vanishing point, objects approach the viewer |
| Performance | 60 fps on iPhone 11+ / mid-range Android 2021+ / any desktop |

**Key distinction from the Mario-clone reference:** we keep the general pixel-art aesthetic in the spirit of SNES Mario / Stardew Valley, **but remove direct Nintendo IP elements** (see § 2 "What we do NOT do").

---

## 1. Visual language — fundamental principles

### 1.1. Style
- **Flat pixel-art**, 16-bit SNES era — close to Stardew Valley in detail but more vivid and saturated.
- **NO anti-aliasing** on edges. Every pixel is a pixel. No semi-transparent border pixels except the explicitly-prescribed alpha zones (shadows under objects, halo around collectibles).
- **Clean pixel-grid** — all sprites aligned to a 1×1 grid. No sub-pixel offsets.
- **1 px outline** on the character and major foreground objects for contrast with the grass. No outline on small decor (grass, tiny flowers).
- **Volume through shading, not through the sprite's own 3D perspective.** Every object has 3–5 tones (highlight / light / base / shadow / deep shadow), but does NOT have its own perspective rotation. The sprite is always "frontally upright"; the engine tilts/scales it through projection itself.

### 1.2. Three-level-of-detail (LOD) rule
This is critical because of the pseudo-3D perspective. Objects in three depth zones look different:

| Zone | World-distance | Canvas scale | Detail |
|---|---|---|---|
| **FOREGROUND** | 0–25 | 1.0–0.5 | Full: 4–5 tones, visible texture, clear outline, tiny highlight pixels |
| **MIDGROUND** | 25–70 | 0.5–0.25 | Medium: 3 tones, simplified texture, 1 px outline |
| **FAR / BACKGROUND** | 70–200+ | 0.25–0.10 | Silhouette: 2 tones, NO outline, NO texture |

**How to apply this when drawing:**
- For **SIDE DECOR** (mushrooms, flowers, bushes, trees on shoulders) — draw ONE foreground-quality sprite. The engine auto-scales it down for far positions. Detail will "blur" naturally via scaling — this is normal and expected.
- For **BACKGROUND LAYERS** (mountains, castle, sky, clouds) — draw 2–3 separate LOD variants (mountain_far / mountain_mid / mountain_near) because they never approach the camera and need explicitly different detail counts.
- For the **ROAD KIT** — 3 LOD variants (foreground/mid/far) are already specified in `road-kit-brief.md`.

### 1.3. "Volume in foreground" principle
A foreground object must read as a **3D object on a 2D plane** through correct shading:

```
Example: red mushroom in foreground
┌─────────────────────────────────────┐
│ Highlight       #ff8a4a   ░         │  ← light dot on top (sun)
│ Light           #e85020   ▓▓        │  ← main light red
│ Base            #c43018   ████      │  ← base
│ Shadow          #8a2010   ▓▓▓       │  ← shadow under cap
│ Deep shadow     #4a1008   ░░        │  ← deep shadow under object
│ Outline         #2a0a04   ▒▒▒▒      │  ← 1 px outline
└─────────────────────────────────────┘
```

For the far variant of the same mushroom — only Base + Shadow + Outline.

### 1.4. Light source
- **Single light direction for ALL objects in the scene:** sun is upper-right (30° from vertical).
- Highlight goes on the upper-right face of the object.
- Shadow on the lower-left face.
- This rule is MANDATORY for cohesion. If one sprite is lit from the left and another from the right, the scene falls apart.

### 1.4.1. Per-side variants for side-aware structures (GOLDEN RULE)

Any block / wall / platform / pipe / fence / stairs that the engine places on the road's left OR right shoulder MUST be shipped as a **pair of sprites**: `<name>_left.png` and `<name>_right.png`. The two variants are drawn independently — they are NOT just horizontal flips of each other.

**Why.** A horizontal flip of a LEFT variant inverts the lighting (sun-upper-right becomes sun-upper-LEFT on the flipped sprite), which breaks rule § 1.4 across the scene. The engine prefers the matching per-side variant when it's loaded; if a pair is incomplete, the engine falls back to a canvas mirror flip and the right side will look wrong until the partner ships.

**Drawing rule for the pair:**
- **`_left.png`** — block sits on the road's LEFT shoulder; road is on the RIGHT of the block.
  - Block's RIGHT face = sun-lit (HIGHLIGHT + LIGHT tones, top brighter than bottom).
  - Block's LEFT face = shadow (SHADOW + DEEP tones).
  - TOP face brightest along its top-right edge.
- **`_right.png`** — block sits on the road's RIGHT shoulder; road is on the LEFT.
  - Block's LEFT face = sun-lit.
  - Block's RIGHT face = shadow.
  - TOP face brightest along its top-left edge.

**Which categories require pairs?** See the "Golden Rule" table near the top of this brief (under 🚦 Delivery Status). Short list: walls, brick blocks, grass-dirt blocks, brick / floating platforms, pipes / planters, hanging platforms, fences, stairs.

**Which don't?** Radially-symmetric organic shapes (mushrooms, bushes, trees, flowers, sprouts) and centred-in-lane objects (question blocks, collectibles, in-lane obstacles).

### 1.5. Contrast and readability
- **Gameplay elements (collectible, obstacle)** must contrast with the background in BOTH lightness AND hue. Orchid — golden yellow on green grass. Vine obstacle — warm brown on green grass + warning accent.
- **Decor (small flowers, mushrooms on shoulders)** should be muted so it doesn't distract. Tone shifted 10–15% toward the background green.
- **NEVER** place golden_orchid (collectible) and yellow_flower_small (decor) in the same palette — the player must instantly distinguish "this is collected" vs "this is background".

---

## 2. What we do NOT do (no Nintendo IP)

| Element | Decision | Reason |
|---|---|---|
| Mario green pipe | **REMOVE ENTIRELY.** Replace with a terracotta planter pot with a thick leaf sticking out (`planter_pot.png`). | Direct Nintendo IP clone — legal risk. |
| Question block with "?" | **Keep, but redesign:** wooden crate with a carved floral motif instead of the "?". Filename stays `question_block.png`. | Recognisable gameplay pattern (hit it → bonus) is preserved; IP is removed. |
| Red mushroom with white dots | **Keep the shape, change the palette:** red-cream gamut instead of red-white. Dots are organic cream `#f0e4c0`, not pure white. | Generic fairy-tale mushroom ≠ Mario super mushroom. |
| Castle with red roof and flag | **Replace with a Victorian botanical greenhouse:** glass dome, white metal frame, flag — yes, but as a decorative weather vane with an orchid. File: `greenhouse_far.png` (new, replaces `castle_far.png` / `castle-distant.png`). | Thematic to orchid-quest, not Mushroom Kingdom. |
| Purple Mario-style brick blocks | **Keep the shape, change the palette:** make them stone — neutral grey-brown `#807870` with dark mortar lines. No purple. | Dark-purple tones = Bowser Castle vibe, not a garden. |

---

## 3. Color palette (master palette, mandatory)

Every sprite uses ONLY these colors (plus small interpolations within a single tone). Colors are given in `name #hex` format.

### 3.1. Nature (grass, foliage, leaves)
```
GRASS_HIGHLIGHT     #8cd060   highlight on foreground grass
GRASS_LIGHT         #74c050   standard light grass
GRASS_BASE          #54a040   base grass for road/shoulder
GRASS_SHADOW        #3a7028   shadow under objects on grass
GRASS_DEEP          #1f4a18   deep shadow / silhouette of far trees

LEAF_LIGHT          #6ab048   light leaves of bushes/trees
LEAF_BASE           #4a8c30   leaf base
LEAF_SHADOW         #2a5a18   shadow inside a canopy
```

### 3.2. Ground and road
```
PATH_GUIDE          #c4ce7c   warm yellow-green lane separator (NOT white!)
EARTH_LIGHT         #8c6438   light earth on the shoulder
EARTH_BASE          #6a4830   earth base
EARTH_DARK          #3a2818   deep earth shadow
```

### 3.3. Wood (fences, crates, planter_pot)
```
WOOD_HIGHLIGHT      #c89868   light wood edge
WOOD_LIGHT          #a87850   light wood
WOOD_BASE           #8b5a2b   base (fences, crates)
WOOD_SHADOW         #5a3a20   wood shadow
WOOD_OUTLINE        #2a1a10   outline
```

### 3.4. Stone / neutral structures (formerly purple bricks)
```
STONE_HIGHLIGHT     #b0a898   light stone
STONE_BASE          #807870   stone base
STONE_SHADOW        #4a443c   stone shadow
STONE_OUTLINE       #2a2620   outline
```

### 3.5. Sky and atmosphere
```
SKY_TOP             #4a8cc0   sky top (deep)
SKY_MID             #78b0d8   middle
SKY_HORIZON         #b8d8e8   horizon (soft)
SUN_GLOW            #f4d878   warm sun glow
CLOUD_LIGHT         #ffffff   cloud top
CLOUD_SHADOW        #c8d8e8   underside of cloud
```

### 3.6. Mountains (LOD)
```
MOUNTAIN_NEAR       #4a7050   near layer (visible foliage)
MOUNTAIN_MID        #5a7888   middle layer (warm grey)
MOUNTAIN_FAR        #8a98a8   far layer (atmospheric haze)
```

### 3.7. Gameplay accents (collectibles + warnings)
```
ORCHID_GOLD_LIGHT   #fff4a8   halo around collectible
ORCHID_GOLD_BASE    #ffd54a   orchid collectible body
ORCHID_GOLD_DARK    #c89020   collectible outline / shadow
ORCHID_GOLD_OUTLINE #6a4810   deep outline

WARNING_LIGHT       #f4a878   light warning (obstacle outline)
WARNING_BASE        #e8703a   warning on obstacles
WARNING_DARK        #a83820   warning shadow

DANGER_RED          #c44030   red hearts, hit-flash
DANGER_RED_DARK     #7a2018   heart shadow

DECOR_FLOWER_YELLOW #e8c860   DECORATIVE yellow flowers (NOT collectible!)
DECOR_FLOWER_PURPLE #a878d0   decorative purple flowers (violets)
DECOR_FLOWER_PINK   #e8a0c8   optional, for variety
```

### 3.8. Character (farmer)
```
HAT_STRAW_LIGHT     #f4d878   light straw of the hat
HAT_STRAW_BASE      #c8a040   straw base
HAT_STRAW_DARK      #8a6818   straw shadow

APRON_LIGHT         #e88060   light terracotta apron  ← CRITICAL for contrast with grass
APRON_BASE          #c45a3a   apron base
APRON_DARK          #8a3018   apron shadow

SHIRT_LIGHT         #ffe8d0   light shirt
SHIRT_BASE          #f0e4d0   shirt base
SHIRT_SHADOW        #b0a098   shirt shadow

PANTS_LIGHT         #5a78b0   light pants
PANTS_BASE          #3a4f80   pants base
PANTS_DARK          #1a2a48   pants shadow

BOOTS_BASE          #5a3a20   boots

SKIN_LIGHT          #f4c898   light skin
SKIN_BASE           #d8a070   skin base (gardener's tan)
SKIN_SHADOW         #a06848   skin shadow
```

### 3.9. UI / HUD
```
HUD_PANEL_LIGHT     #a87850   light edge of wooden-plank panel
HUD_PANEL_BASE      #8b5a2b   panel base
HUD_PANEL_DARK      #5a3a20   panel shadow
HUD_PANEL_OUTLINE   #2a1a10   outline

HUD_TEXT_LIGHT      #ffe8d0   primary text
HUD_TEXT_SHADOW     #2a1a10   text shadow (1 px offset)
HUD_TEXT_ACCENT     #ffd54a   highlight on important numbers (score milestone)
```

**FORBIDDEN colors:**
- Pure white `#ffffff` — only on the topmost cloud pixels. Never on UI / text / sprites.
- Pure black `#000000` — never. Outline = `#2a1a10` or `#1f1410`.
- Saturation > 75% — all colors muted; no neon retina-burn.
- Pure RGB `#ff0000` / `#00ff00` / `#0000ff` — never.

---

## 4. Folder structure and naming convention (STRICT)

### 4.1. Root structure
```
assets/
├── player/
│   ├── farmer_run/             ← 8 frames (exists, redraw)
│   ├── farmer_crouch/          ← 4 frames (exists, redraw)
│   ├── farmer_jump/            ← 6 frames (NEW)
│   ├── farmer_hit/             ← 4 frames (NEW)
│   └── farmer_idle/            ← 4 frames (NEW, for game-over / menu)
│
├── collectibles/
│   ├── orchid_gold/            ← orchid + halo + sparkle particles (NEW folder)
│   ├── life_heart.png          ← exists, redraw
│   └── sprout.png              ← exists, redraw
│
├── obstacles/
│   ├── vine_barrier/           ← 4 frames idle sway (NEW — animated)
│   ├── dry_grass/              ← static
│   ├── mushroom_small/         ← static
│   ├── planter_pot/            ← static, REPLACES pipe_green
│   └── overhangs/              ← low_branch + spider_web
│
├── structures/
│   ├── question_block/         ← 4 frames idle bounce (animated)
│   ├── stone_brick/            ← single + wall_low + stairs (REPLACES purple_brick)
│   ├── platforms/              ← floating + hanging_vines
│   └── greenhouse/             ← far / mid / near (REPLACES castle)
│
├── decor/
│   ├── small/
│   │   ├── flowers/            ← purple_violet, yellow_decor, pink_optional
│   │   ├── grass/              ← tuft_small, tuft_large
│   │   ├── leaves/             ← clump_round
│   │   ├── bushes/             ← bush_small, bush_small_flower
│   │   └── plants/             ← sprout_soil
│   └── large/
│       ├── trees/              ← tree_round, tree_tall (NEW tree_tall)
│       ├── mushrooms/          ← mushroom_red_big, mushroom_purple_big
│       ├── bushes/             ← bush_large, bush_large_flower
│       └── fence/              ← fence_short, fence_corner (NEW corner)
│
├── terrain/
│   ├── road/kit/               ← 14 files from road-kit-brief.md
│   └── blocks/                 ← grass-dirt cubes for midground terraces
│
├── background/
│   ├── sky/                    ← sky_gradient
│   ├── clouds/                 ← cloud_small/medium/large + 6 individual frames
│   ├── mountains/              ← far / mid / near (3 LOD)
│   ├── greenhouse/             ← far / near (replaces castle/)
│   └── midground/              ← rolling_hills, treeline_far
│
├── ui/
│   ├── buttons/                ← pause, play, retry, menu_back
│   ├── icons/                  ← heart_full/empty, energy_full/empty, orchid_currency, combo_x2/x3
│   ├── panels/                 ← score, lives, tool, game_over_modal
│   └── tools/                  ← shovel_full, shovel_blade, shovel_handle
│
└── effects/                    ← NEW folder
    ├── dust_puff/              ← 4 frames footstep dust
    ├── collect_burst/          ← 8 frames orchid pickup explosion
    ├── sparkle/                ← 4 frames idle sparkle on collectibles
    ├── speed_line/             ← 1 frame, used as a repeating decal
    ├── hit_flash/              ← 4 frames screen-flash on collision
    ├── lane_swoosh/            ← 4 frames horizontal motion-blur
    └── jump_dust/              ← 4 frames takeoff/landing puff
```

### 4.2. Naming rules
- **Only lowercase + underscore.** No camelCase, kebab-case, spaces, or Cyrillic.
- **No prefixes / suffixes** like `final`, `v2`, `new`, `copy`. One file = one state.
- **Animations:** `<name>_<frame>.png` starting from `_01`. Example: `player_farmer_run_01.png` ... `player_farmer_run_08.png`. **Two-digit frame number required** (`_01`, not `_1`).
- **LOD variants:** `<name>_far.png`, `<name>_mid.png`, `<name>_near.png`. Example: `mountains_far.png`, `mountains_mid.png`, `mountains_near.png`.
- **Extension strictly `.png`.** No `.jpg`, `.webp`, `.svg`, `.psd` in final delivery (source files — separate, in `_source/`).
- **Do NOT include dimensions in the name.** No `mushroom_64x64.png`. Size is fixed by the brief.

### 4.3. Forbidden names
- `final_final.png`, `v2_NEW.png`, `Untitled-1.png`, `asset (1).png`, `test.png` — rework without discussion.

---

## 5. Full asset list with spec

Format for each entry:
```
filename.png       size_w × size_h          frames           priority
  Content description.
  Anchor: where the sprite's "ground" is — the point the engine uses to attach it to the ground.
  Additional notes (animation / LOD / transparency).
```

**Priority:**
- 🔴 **P0** — critical, won't ship without it
- 🟠 **P1** — high impact, ideally in the first batch
- 🟡 **P2** — medium impact, second batch
- 🟢 **P3** — nice-to-have, can defer

### 5.1. Player (farmer)

> The most-visible object, always in the center of the screen. Must be flawless.

```
player_farmer_run_01.png ... _08.png       64 × 96 px           8 frames        🔴 P0
  Farmer's run cycle, 3/4 back-side view (NOT strictly back-on).
  Straw hat, TERRACOTTA apron #c45a3a, cream shirt,
  blue pants, brown boots. Small shovel in the right hand.
  1 px outline #2a1a10 along the entire silhouette.
  Animation: 8-frame run cycle at 60 fps = 7.5 fps actual animation
  (each frame held for 8 render frames).
  Bounce: between frames, the character's center moves ±2 px in Y.
  Anchor: bottom-center of the frame (sole of the back foot in the bottom-center pixel).

player_farmer_crouch_01.png ... _04.png    64 × 78 px           4 frames        🔴 P0
  Crouch-run cycle. Height reduced by 18 px (78 vs 96).
  Same palette. Hat touches the top of the frame.
  Anchor: bottom-center of the frame.

player_farmer_jump_01.png ... _06.png      64 × 96 px           6 frames        🟠 P1
  Jump cycle: takeoff (2 frames) → apex (2 frames) → landing (2 frames).
  Shovel bounces above the body on frames 3–4.
  Anchor: bottom-center.

player_farmer_hit_01.png ... _04.png       64 × 96 px           4 frames        🟠 P1
  Hit reaction: frame 1 = squash (Y scale ~0.85), frame 2 = blink white,
  frame 3 = recovery, frame 4 = back to run pose.
  On frame 2: full silhouette is white #ffffff (hit-flash).
  Anchor: bottom-center.

player_farmer_idle_01.png ... _04.png      64 × 96 px           4 frames        🟡 P2
  Idle for menu/pause. Subtle breathing (Y ±1 px), hat sways.
  Anchor: bottom-center.
```

### 5.2. Collectibles

```
orchid_gold_main.png                       48 × 48 px           1 frame         🔴 P0
  Central sprite of the golden orchid (game's CURRENCY).
  Core color #ffd54a, outline #c89020, deep #6a4810.
  4-petal stylized orchid. NOT a round coin.
  Anchor: center of frame (yOffset for hovering above the ground is set by code).

orchid_gold_halo.png                       72 × 72 px           1 frame         🔴 P0
  Halo / glow around the orchid. Radial gradient:
  center #fff4a8 alpha 80% → edge #ffd54a alpha 0%.
  This is the ONLY asset with anti-aliasing / alpha gradient.
  Rendered BENEATH the main sprite.
  Anchor: center.

orchid_gold_sparkle_01.png ... _04.png     12 × 12 px           4 frames        🔴 P0
  4-frame loop sparkle particle. 4-point star, white #ffe8d0.
  Frames: scale 1.0 → 1.4 → 1.0 → 0 (vanishes).
  Used as idle effect (1-2 sparkles around each orchid in radius 32 px).
  Anchor: center.

orchid_gold_collect_01.png ... _08.png     96 × 96 px           8 frames        🔴 P0
  Orchid collection animation. 8 frames in 120 ms total.
  frames 1-3: main sprite scale 1.0 → 1.5 + halo expanding.
  frames 4-6: 6 sparkle particles fly out to radius 48 px.
  frames 7-8: everything fades (alpha → 0).
  Anchor: center.

life_heart.png                             40 × 36 px           1 frame         🟠 P1
  Life heart, pickup in the world. Color #c44030 (DANGER_RED),
  highlight #f08070 in the upper-right, outline #2a1a10.
  Idle bob is done by code, not the artist.
  Anchor: center.

sprout.png                                 32 × 40 px           1 frame         🟡 P2
  Small sprout / sapling that the player can pick up as a
  rare bonus. A green leaf in a clump of brown soil.
  Anchor: bottom-center.
```

### 5.3. Obstacles

> All obstacles must have a **warning accent** (warm orange-brown edge) so the player immediately sees "this is dangerous".

```
vine_barrier_01.png ... _04.png           192 × 56 px           4 frames        🔴 P0
  Thick thorny vine, blocks all 3 lanes (or one — see single-lane version below
  at 64 × 56 px).
  Palette: GRASS_DARK base + WARNING_BASE #e8703a on thorns
  + WOOD_BASE on knots.
  Animation: 4-frame sway, ±2 px in X at the middle.
  Anchor: bottom-center.

vine_barrier_single_01.png ... _04.png     64 × 56 px           4 frames        🔴 P0
  Single-lane vine variant. Same palette.
  Anchor: bottom-center.

dry_grass_obstacle.png                     80 × 64 px           1 frame         🟠 P1
  Dry grass / haystack to crash into. WHEAT palette:
  highlight #e8c890, base #b89048, shadow #6a4818.
  Warning accent: 2-3 warm WARNING_BASE pixels on the tips.
  Anchor: bottom-center.

mushroom_small_red.png                     48 × 48 px           1 frame         🟠 P1
  Small mushroom obstacle. Red cap with CREAM dots
  (#f0e4c0, NOT white). Cream stem. 1 px outline.
  Palette: cap_light #ff8a4a, cap_base #c43018, cap_shadow #8a2010.
  Anchor: bottom-center.

planter_pot.png                            64 × 80 px           1 frame         🔴 P0
  REPLACES the Mario green pipe. Terracotta planter with a thick
  succulent leaf sticking out from the top. Player crashes into the pot
  or jumps over it.
  Pot palette: highlight #e87050, base #b8482a, shadow #6a2818,
  outline #2a0a04. Leaf: LEAF_LIGHT + LEAF_BASE + LEAF_SHADOW.
  Anchor: bottom-center.

low_branch_overhang.png                   192 × 80 px           1 frame         🟠 P1
  Low-hanging branch with leaves — player must duck.
  Hangs from right/left/center (mirrored by code).
  Palette: WOOD_BASE + LEAF_BASE + WARNING_BASE on leaf tips.
  Anchor: TOP-center (yOffset hangs it from the top of the frame downward).

spider_web_overhang.png                   160 × 96 px           1 frame         🟡 P2
  Spider web hanging from above. Greyish-white #c8c0b0 web,
  black spider #1a1a1a in the middle. Slight alpha (60%) on the threads.
  Anchor: TOP-center.
```

### 5.4. Structures (side structures)

```
question_block_01.png ... _04.png          64 × 64 px           4 frames        🟠 P1
  Wooden crate with a carved floral motif (NOT a "?").
  WOOD_* palette. Flower motif at the center: petals DECOR_FLOWER_YELLOW.
  Animation: idle bounce ±2 px in Y, 4 frames.
  Anchor: bottom-center.

stone_brick_single.png                     56 × 56 px           1 frame         🟠 P1
  REPLACES purple_brick_01. 1×1 stone block.
  STONE_* palette. 2-3 cracks (1 px each) and 1-2 highlight pixels
  in the upper-right corner.
  Anchor: bottom-center.

stone_wall_low.png                        168 × 56 px           1 frame         🟠 P1
  REPLACES purple_wall_low. Wall of 3 stone blocks in a row.
  Same palette.
  Anchor: bottom-center.

stone_wall_stairs.png                     168 × 112 px          1 frame         🟡 P2
  REPLACES purple_wall_stairs. Stone staircase, 3 steps.
  Anchor: bottom-center.

platform_floating.png                     192 × 40 px           1 frame         🟡 P2
  REPLACES purple_platform_row_04. Floating stone platform, 4 blocks.
  Shadow under the platform — NOT drawn; engine adds it.
  Anchor: top-center (the platform is suspended from above).

platform_hanging_vines.png                160 × 96 px           1 frame         🟡 P2
  Platform hanging from vines from above. Stone platform + 2 vines.
  Palette: STONE_* + GRASS_DARK on vines.
  Anchor: TOP-center.
```

### 5.5. Decor — small (small decor, densely repeated on shoulders)

> These assets appear by the dozens in every frame. They must be **readable but NOT loud**. Muted versions of the natural tones.

```
flower_violet_cluster.png                  32 × 32 px           1 frame         🔴 P0
  Cluster of violets: 3-4 pixel flowers #a878d0 with green stems.
  4-5 pixels per flower. Anchor: bottom-center.

flower_yellow_decor.png                    24 × 24 px           1 frame         🔴 P0
  DECORATIVE yellow flower. #e8c860 (NOT #ffd54a — that's the collectible!).
  2-3 flowers per sprite. Anchor: bottom-center.

flower_pink_decor.png                      24 × 24 px           1 frame         🟢 P3
  Optional pink decorative flower for variety.
  DECOR_FLOWER_PINK. Anchor: bottom-center.

grass_tuft_small.png                       24 × 16 px           1 frame         🔴 P0
  Small grass clump. 3 pixel grass blades.
  GRASS_LIGHT + GRASS_BASE. Anchor: bottom-center.

grass_tuft_large.png                       40 × 28 px           1 frame         🔴 P0
  Larger clump. 5-6 blades, plus 1-2 flower pixels on top.
  Anchor: bottom-center.

leaf_clump_round.png                       40 × 32 px           1 frame         🟠 P1
  Low leaf clump, no flowers. LEAF_LIGHT + LEAF_BASE + LEAF_SHADOW.
  Anchor: bottom-center.

bush_small.png                             56 × 48 px           1 frame         🟠 P1
  Small bush, no flowers.
  Anchor: bottom-center.

bush_small_flowers.png                     56 × 48 px           1 frame         🟠 P1
  Small bush WITH 2-3 violet flowers on top.
  Anchor: bottom-center.

sprout_soil.png                            32 × 24 px           1 frame         🟡 P2
  Sprout in soil. 2 leaves + a clump of earth.
  Anchor: bottom-center.
```

### 5.6. Decor — large (large decor, less frequent, defines scene silhouettes)

```
tree_round.png                            128 × 160 px          1 frame         🟠 P1
  Round tree with a rounded canopy.
  Canopy: LEAF_LIGHT highlight upper-right, LEAF_BASE base, LEAF_SHADOW lower-left.
  Trunk: WOOD_BASE + WOOD_SHADOW. 2-3 branches visible inside the canopy (darker pixels).
  Anchor: bottom-center.

tree_tall.png                             104 × 192 px          1 frame         🟡 P2
  Tall tree with an elongated canopy (for silhouette variety).
  Same palette. Anchor: bottom-center.

mushroom_red_big.png                       96 × 112 px          1 frame         🟠 P1
  Large red mushroom (decor, NOT obstacle).
  Same palette as mushroom_small_red but 5 tones for volume.
  Visible explicit highlight dot on the cap (sun upper-right).
  Anchor: bottom-center.

mushroom_purple_big.png                    96 × 112 px          1 frame         🟢 P3
  Optional purple mushroom for variety.
  STONE_* palette (neutral) + #a878d0 dots.
  Anchor: bottom-center.

bush_large.png                            120 × 80 px           1 frame         🟠 P1
  Large bush, no flowers. LEAF_*.
  Anchor: bottom-center.

bush_large_flowers.png                    120 × 80 px           1 frame         🟠 P1
  Large bush WITH 4-5 violet flowers + 2 yellow.
  Anchor: bottom-center.

fence_short.png                            96 × 80 px           1 frame         🟠 P1
  Short wooden fence. 3 vertical boards + a horizontal beam.
  WOOD_* palette. Anchor: bottom-center.

fence_corner.png                          112 × 80 px           1 frame         🟡 P2
  Corner fence (for scenery corners). Anchor: bottom-center.
```

### 5.7. Terrain (midground terraces)

```
grass_block_cube_01.png                    96 × 96 px           1 frame         🟠 P1
  Grass-dirt block cube (3D view) — sits on shoulders as terraces.
  Top: GRASS_LIGHT + GRASS_HIGHLIGHT with grass pattern.
  Right face: EARTH_LIGHT + EARTH_BASE (sun on the right).
  Left face: EARTH_BASE + EARTH_DARK (shadow).
  Grass roots visible on upper-side edges.
  Anchor: bottom-center.

grass_block_cube_02.png                    96 × 96 px           1 frame         🟠 P1
  Variation of cube_01 — different little flowers and cracks on top.
  Anchor: bottom-center.

grass_block_column_tall.png                96 × 192 px          1 frame         🟡 P2
  Vertical column-cube (double-height).
  Anchor: bottom-center.

grass_block_front_rect.png                144 × 64 px           1 frame         🟡 P2
  Horizontal rectangle for the frontal scenery frame.
  Anchor: bottom-center.
```

### 5.8. Road kit (already delivered via separate brief)
**See `docs/road-kit-brief.md` — full spec for 14 files.**

### 5.9. Background — sky and clouds

```
sky_gradient.png                          512 × 512 px          1 frame         🟠 P1
  Vertical gradient: SKY_TOP top → SKY_HORIZON bottom.
  Stretched across canvas width, not tileable.
  May use pixelated "banding" (5-6 explicit bands instead of a smooth gradient)
  — more pixel-art feel.

sun_glow.png                              256 × 256 px          1 frame         🟢 P3
  Warm sun in the upper-right corner. SUN_GLOW + radial alpha.
  This is the ONLY background asset with an alpha gradient.

cloud_small.png                            96 × 56 px           1 frame         🟠 P1
cloud_medium.png                          160 × 80 px           1 frame         🟠 P1
cloud_large.png                           224 × 104 px          1 frame         🟠 P1
  Pixel-art clouds, different sizes. CLOUD_LIGHT top + CLOUD_SHADOW bottom.
  "Chunky" structure — each cloud built from 5-8 square pixel clusters.
  NOT round smooth clouds.
  Anchor: center.
```

### 5.10. Background — mountains (LOD)

```
mountains_far.png                        1536 × 192 px          1 frame         🟠 P1
  Far mountain layer, clean silhouette MOUNTAIN_FAR #8a98a8.
  Fills canvas width. 5-7 peaks of varying height.
  Minimum detail — this is atmospheric haze.
  Anchor: bottom-left.

mountains_mid.png                        1536 × 256 px          1 frame         🟠 P1
  Mid layer. MOUNTAIN_MID #5a7888.
  2 tones: base + slight highlight on right-facing slopes.
  5-6 peaks, more pronounced.

mountains_near.png                       1536 × 320 px          1 frame         🟠 P1
  Near layer. MOUNTAIN_NEAR #4a7050.
  3 tones: base + highlight + shadow. Visible greenery (these are wooded mountains).
  3-4 peaks, with visible tree silhouettes on ridges.
```

### 5.11. Background — greenhouse (REPLACES castle)

```
greenhouse_far.png                        256 × 192 px          1 frame         🔴 P0
  Victorian botanical greenhouse in the distance — on the horizon.
  Glass dome + 2 side wings. White metal frame,
  glass slightly translucent blueish. Small decorative weather vane with an orchid.
  Palette: frame #d8d4c8, glass #b8d8e8 alpha 70%, base #807870 stone.
  Anchor: bottom-center.

greenhouse_near.png                       384 × 288 px          1 frame         🟡 P2
  Same greenhouse, slightly closer — more detail: individual pilasters visible,
  flowers inside the glass as hints.
  Anchor: bottom-center.
```

### 5.12. Background — midground

```
treeline_far.png                         1536 × 96 px           1 frame         🟡 P2
  Dark strip of far forest on the horizon. GRASS_DEEP tree silhouettes.
  Fills canvas width.

rolling_hills.png                        1536 × 144 px          1 frame         🟡 P2
  Hills between mountains and treeline. GRASS_BASE + GRASS_SHADOW.
```

### 5.13. UI / HUD

> All HUD panels — wooden plank pixel-art. HUD_PANEL_* palette. NO rounded corners — corners are pixel-cut (1 corner pixel trimmed).

```
hud_panel_score.png                       208 × 64 px           1 frame         🔴 P0
  Panel in the upper-right corner under the score. Left part — slot for
  orchid_currency icon (~48×48), right part — empty space for the number.
  Pixel-cut corners.

hud_panel_lives.png                       208 × 56 px           1 frame         🔴 P0
  Panel for the hearts (4 slots).

hud_panel_tool.png                        160 × 96 px           1 frame         🔴 P0
  Panel in the lower-left under shovel + energy bar.

hud_panel_long.png                        320 × 64 px           1 frame         🟡 P2
  Long panel (e.g., combo / multiplier indicator).

icon_orchid_currency.png                   48 × 48 px           1 frame         🔴 P0
  Currency icon (orchid) for the score HUD panel.
  Same visual base as orchid_gold_main but WITHOUT the halo.

icon_heart_full.png                        40 × 36 px           1 frame         🔴 P0
icon_heart_empty.png                       40 × 36 px           1 frame         🔴 P0
  Same design as life_heart.png, but empty — grey version #807870.

icon_energy_full.png                       24 × 32 px           1 frame         🔴 P0
icon_energy_empty.png                      24 × 32 px           1 frame         🔴 P0
  Energy segment for the shovel. 5 of these in a row = full energy.
  Full: #74c050 + highlight. Empty: STONE_BASE.

icon_combo_x2.png                          56 × 32 px           1 frame         🟡 P2
icon_combo_x3.png                          56 × 32 px           1 frame         🟡 P2
icon_combo_x5.png                          56 × 32 px           1 frame         🟡 P2
  Combo indicator. Text "x2/x3/x5", colors: x2 = #ffd54a, x3 = #e8703a, x5 = #c44030.
  These icons appear in the HUD when a combo builds up.

button_pause.png                           80 × 80 px           1 frame         🔴 P0
  Pause button in the upper-left. Wooden panel + 2 vertical bars.
  Pixel-cut corners.

button_play.png                            80 × 80 px           1 frame         🔴 P0
  Play button (for pause menu). Wooden panel + ▶ symbol.

button_retry.png                          120 × 56 px           1 frame         🟡 P2
  Large "retry" button in game over modal.

button_menu_back.png                       80 × 56 px           1 frame         🟡 P2
  Back-to-menu button.

panel_game_over.png                       512 × 320 px          1 frame         🟠 P1
  Large game-over modal. Wooden frame + inner field for text/score.
  Pixel-cut corners.

tool_shovel_full.png                       64 × 80 px           1 frame         🟠 P1
  Full shovel icon for the HUD tool panel.
  Wooden handle + metal blade. WOOD_* + #b8b8b0 / #808078 for metal.

tool_shovel_blade.png                      48 × 48 px           1 frame         🟢 P3
tool_shovel_handle.png                     48 × 64 px           1 frame         🟢 P3
  Optional separate parts — for compositional layouts.
```

### 5.14. Effects (NEW — critical for game feel)

> These effects make the game feel **alive**. Without them pixel-art looks "dead", like a coloring book. With them — it becomes a game.

```
dust_puff_01.png ... _04.png               32 × 24 px           4 frames        🔴 P0
  Dust puff under the foot when running.
  EARTH_LIGHT base + CLOUD_LIGHT highlight.
  Frame 1: small dense puff.
  Frame 2: expanding.
  Frame 3: thinning.
  Frame 4: almost gone (alpha 30%).
  Anchor: bottom-center.

jump_dust_01.png ... _04.png               48 × 28 px           4 frames        🟠 P1
  Dust cloud on jump takeoff. Larger and sharper than dust_puff.
  Frame 1: compact.
  Frame 2-4: spreading sideways.
  Anchor: bottom-center.

collect_burst_01.png ... _08.png           96 × 96 px           8 frames        🔴 P0
  Final orchid-collection effect (see orchid_gold_collect above — same asset,
  may live in obstacles/orchid_gold/).
  Duplicate listed here for clarity — rendered from collectibles/orchid_gold/.

sparkle_01.png ... _04.png                 16 × 16 px           4 frames        🔴 P0
  Universal sparkle particle: 4-point star.
  Frame 1: small (4 px).
  Frame 2: medium (10 px).
  Frame 3: large (14 px).
  Frame 4: fading (8 px alpha 30%).
  Color: CLOUD_LIGHT or ORCHID_GOLD_LIGHT (chosen by code).
  Anchor: center.

speed_line.png                             64 × 4 px            1 frame         🟠 P1
  Horizontal white line for the speed-line effect.
  CLOUD_LIGHT alpha 60% at center, alpha 0 at ends.
  Used by code repeatedly along screen edges.

hit_flash_01.png ... _04.png             1536 × 864 px          4 frames        🟠 P1
  Full-screen flash on collision.
  Frame 1: DANGER_RED #c44030 alpha 70% covers the whole screen.
  Frame 2: alpha 50%.
  Frame 3: alpha 25%.
  Frame 4: alpha 0.
  NOTE: these 4 frames are a single full-screen overlay, not a full-screen drawing.
  Can be authored at 64 × 36 px and the engine will stretch it (lighter to ship).
  Alternative size: 64 × 36 px (stretchable).

lane_swoosh_01.png ... _04.png             96 × 64 px           4 frames        🟡 P2
  Horizontal motion-blur on lane change.
  4 frames: blurred dark-green stripes, moving opposite to the lane direction.
  Anchor: center.
```

### 5.15. Final asset counts

| Category | Files |
|---|---|
| Player | 26 (8 run + 4 crouch + 6 jump + 4 hit + 4 idle) |
| Collectibles | 14 (1 orchid + 1 halo + 4 sparkle + 8 collect + 1 heart + 1 sprout, minus duplicate) |
| Obstacles | 12 (4 vine_full + 4 vine_single + 1 dry_grass + 1 mushroom + 1 planter + 1 low_branch + 1 spider_web, minus duplicate of collectibles sparkle) |
| Structures | 9 (4 question + 1 brick + 1 wall + 1 stairs + 1 platform + 1 hanging) |
| Decor small | 9 |
| Decor large | 8 |
| Terrain | 4 (3 grass blocks + 1 column) |
| Road kit | 14 (see separate brief) |
| Background sky/clouds | 5 |
| Background mountains | 3 |
| Background greenhouse | 2 |
| Background midground | 2 |
| UI / HUD | 17 |
| Effects | 26 (4 dust + 4 jump_dust + 4 sparkle + 1 speed_line + 4 hit_flash + 4 lane_swoosh + 5 collect_burst) |
| **TOTAL** | **≈ 151 files** |

Of which:
- **P0 (critical)** — ~50 files
- **P1 (high)** — ~55 files
- **P2 (medium)** — ~35 files
- **P3 (optional)** — ~10 files

Recommended delivery batches:
- **Batch 1 (P0):** player + collectibles + main obstacles + base HUD + 4 effects (dust, sparkle, collect, hit_flash). ≈ 50 files.
- **Batch 2 (P1):** decor + most structures + mountains/sky + remaining HUD. ≈ 55 files.
- **Batch 3 (P2+P3):** optional decor, extra variants, niche effects. ≈ 45 files.

---

## 6. Animation specs (detailed)

### 6.1. General rules
- **Animation fps:** all cycles are designed for 60 fps rendering. Each animation frame is held for N render frames.
- **Loop pattern:** all cycles are loop forward only — ping-pong is **forbidden** (frame 1 → 2 → … → N → 1 → 2 → …).
- **Easing:** not needed in frames. If an effect needs easing-out — that's done by code via alpha/scale modifier on top of the loop.
- **Key poses:** in a 4-frame cycle, frames must be equidistant in phase. In an 8-frame cycle — frames 1 and 5 contrast (peak amplitude).

### 6.2. Specific timings

| Animation | Frames | Hold per frame | Total duration | Loop |
|---|---|---|---|---|
| Player run | 8 | 8 frames @ 60 = 133 ms | 1.07 s | yes |
| Player crouch | 4 | 8 frames = 133 ms | 533 ms | yes |
| Player jump | 6 | variable (see below) | ~600 ms | no (one-shot) |
| Player hit | 4 | 4/4/8/8 frames | ~400 ms | no |
| Player idle | 4 | 12 frames = 200 ms | 800 ms | yes |
| Orchid sparkle | 4 | 8 frames = 133 ms | 533 ms | yes |
| Orchid collect | 8 | 1 frame = 16 ms | 128 ms | no |
| Vine sway | 4 | 12 frames = 200 ms | 800 ms | yes |
| Question block bounce | 4 | 10 frames = 166 ms | 666 ms | yes |
| Dust puff | 4 | 4 frames = 66 ms | 266 ms | no |
| Jump dust | 4 | 4 frames = 66 ms | 266 ms | no |
| Sparkle | 4 | 4 frames = 66 ms | 266 ms | no (but re-emitted by code) |
| Hit flash | 4 | 4 frames = 66 ms | 266 ms | no |
| Lane swoosh | 4 | 3 frames = 50 ms | 200 ms | no |

### 6.3. Player jump (detailed)
The 6 frames are not equidistant:
- Frames 1-2 (takeoff): hold 4 frames each (66 ms × 2 = 133 ms total). Sharp push upward.
- Frame 3 (apex up): hold 8 frames (133 ms). Top of jump, hangs.
- Frame 4 (apex down): hold 8 frames (133 ms). Start of fall.
- Frames 5-6 (landing): hold 4 frames each (66 ms × 2 = 133 ms). Landing + squash.

Total: ~600 ms. Matches the code's physical jump arc.

---

## 7. Export specs

| Parameter | Value |
|---|---|
| Format | PNG-24 with alpha channel |
| Color space | sRGB, **NO embedded color profile** (strip the profile on export — `pngcrush` / `oxipng` recommended) |
| Bit depth | 8 bits per channel |
| Interlacing | OFF (not interlaced PNG) |
| Transparency | Full alpha (0–255). Most pixels are either 0 (transparent) or 255 (opaque). Intermediate alpha values only in the specifically-noted assets (halo, sun_glow, hit_flash, spider_web). |
| Anti-aliasing | OFF (see § 1.1). Exceptions are the same noted alpha assets. |
| Metadata | Strip EXIF, XMP, text comments. PNG must be "bare". |
| Pixel grid | All shapes aligned to a 1×1 pixel grid. No sub-pixel lines. |
| File size | Run every PNG through `oxipng -o 4` or equivalent. Target size of one 64×96 sprite — under 4 KB. |

### 7.1. Pre-delivery check

Checklist per PNG:
- [ ] Filename strictly per naming convention (§ 4.2)
- [ ] Size W × H exactly per spec
- [ ] Palette only from § 3
- [ ] Anchor (attach point) matches the spec
- [ ] 1 px outline present (where required)
- [ ] Light source upper-right (where applicable)
- [ ] No anti-aliasing (except noted alpha assets)
- [ ] sRGB without profile
- [ ] Run through `oxipng`

---

## 8. Cohesion test (mandatory visual QA)

Before delivering a batch — assemble a test collage and verify cohesion:

1. **Player + road foreground + side decor.** Place the character on a foreground road tile, surround them with 4-5 side-decor sprites (mushrooms, flowers, bushes). The character's silhouette must CLEARLY stand out from the background.
2. **Player vs collectible vs decor flower.** Place `orchid_gold_main` next to `flower_yellow_decor`. Both are yellow. They must be distinguishable in lightness/saturation at a glance.
3. **Obstacle vs decor.** Place `vine_barrier` next to `bush_large_flowers`. The obstacle must CLEARLY shout "I'm dangerous" (warning accent).
4. **3 mountain LODs in a row.** Lay mountains_far + mid + near in 3 rows. They must look like ONE mountain range at different distances, not 3 different styles.
5. **All UI on one screen.** Place all hud_panel_* + icons + buttons together. Wood palette must be IDENTICAL across all.
6. **Foreground volumetric vs far flat.** Place `mushroom_red_big` (foreground) next to a scaled-down copy of mushrooms (as it would appear at distance=80). Foreground must look volumetric; far must look flat. If both flat — redo foreground.

If any step fails — iterate.

---

## 9. Delivery format

### 9.1. Zip structure
```
orchid_quest_assets_v3_<batch>.zip
├── README.md                  ← short description of the batch + file list
├── assets/                    ← drop-in-ready structure
│   └── ... (everything per § 4.1)
├── _source/                   ← source files (Aseprite / Pyxel / Photoshop)
│   └── ... (any internal artist files)
└── _previews/                 ← collages from § 8 cohesion test
    ├── 01_player_in_scene.png
    ├── 02_collectible_vs_decor.png
    └── ...
```

### 9.2. Manifest
At the zip root — `MANIFEST.json` with a list of all files in the batch:
```json
{
  "version": "v3.1",
  "batch": "P0",
  "delivered": [
    {"path": "assets/player/farmer_run/player_farmer_run_01.png", "size_w": 64, "size_h": 96},
    ...
  ]
}
```
This lets the developer auto-verify delivery integrity.

### 9.3. What we do NOT include in the zip
- `.DS_Store`, `Thumbs.db`, `desktop.ini` — OS junk.
- `.aseprite-recovery/`, `~tmp` — temp files.
- Hidden folders `.git/`, `.idea/`, `.vscode/`.

---

## 10. What the developer does after your delivery

Fully described in `docs/developer-integration-guide.md`. In short:
1. Unzip into the project root (the inner `assets/` merges with the existing one).
2. Register new keys in `src/config/gameConfig.js → GAME_CONFIG.assets`.
3. Enable the pixel-art renderer (it already exists).
4. Remove legacy assets (including `pipe_green` — per this brief).
5. Run cohesion test in-game.

You are NOT involved in integration — you only ship PNGs and the MANIFEST.

---

## TL;DR for the designer

1. **Flat pixel-art, 16-bit SNES era.** NOT smooth illustration. NOT 32-bit photoshop work.
2. **Palette is MANDATORY** from § 3 — only these colors.
3. **Light source always upper-right.**
4. **No Mario IP elements** — pipe is removed, castle → greenhouse, purple bricks → stone.
5. **Naming strictly per § 4.2** — lowercase_underscore, two-digit frame numbers, .png only.
6. **Sizes EXACTLY as in the spec** — not bigger, not smaller.
7. **Anchor — bottom-center** for anything that stands on the ground. Center — for floating/UI. Top — for overhang.
8. **Foreground = volumetric (4-5 tones); far = flat (2 tones).**
9. **Cohesion test is required** before delivery.
10. **Manifest.json in every batch.**

Any questions about a specific asset — comment in the header of the source file + message the developer.
