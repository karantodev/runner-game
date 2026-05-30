# Asset Curation — Next Actions (after duplicate archive PR)

Generated 2026-05-30. Companion to [`asset-archive-manifest.md`](./asset-archive-manifest.md).

This PR walks the **next three safe buckets** surfaced by the v3 audit:

1. `UNREGISTERED_PENDING_WIRE` — 10 files
2. `MISSING_DESIGN` — 6 dead keys
3. `SIDE_PAIR_MISMATCH` — 1 scenery pair
4. **Group #14** intentional SHA-duplicate — documented & allowlisted

> **Scope guarantees (no exceptions):**
> No gameplay, layout, difficulty, renderer, or visual-composition
> changes. No new gameConfig registrations "because the file exists".
> No code workaround for the mismatched scenery pair — designer task
> only.

---

## 1. PENDING_WIRE — 10 files moved to `_source/future/`

After hand-inspection, **none** of the ten files have a runtime consumer
and all ten are *alternate art* (different file size, different pixel art)
of files already registered at a different folder path. Re-pointing keys
at the alternates would be a silent visual swap — exactly the kind of
"register because it exists" change the brief explicitly forbids.

Decision: **all ten files relocated to `assets/_source/future/`** via
`git mv`, preserving the original relative path under `_source/future/`
for reversibility. No gameConfig changes.

| File | Dims | Registered counterpart (kept) | Why this is alt-art, not a dupe |
|---|---|---|---|
| `assets/background/mountains/mountains-far.png` | 1672×168 | `background/mountains-far.png` (root) registered as `mountainsFar` | nested-folder variant, different file size; runtime reads root-level path |
| `assets/decor/small/bushes/bush_small.png` | 56×48 | `decor_small/bushes/bush_small.png` registered as `decorBushSmall` | `decor/small/` is a parallel WIP folder; canonical lives at `decor_small/` (underscore) |
| `assets/decor/small/bushes/bush_small_flowers.png` | 56×48 | `decor_small/bushes/bush_small_flowers.png` registered as `decorBushSmallFlowers` | same — parallel WIP folder |
| `assets/decor/small/flowers/flower_violet_cluster.png` | 32×32 | `decor_small/flowers/flower_violet_cluster.png` registered as `decorFlowerVioletCluster` | same |
| `assets/decor/small/flowers/flower_yellow_decor.png` | 24×24 | `decor_small/flowers/flower_yellow_decor.png` registered as `decorFlowerYellowDecor` | same |
| `assets/decor/small/grass/grass_tuft_large.png` | 40×28 | `decor_small/grass/grass_tuft_large.png` registered as `decorGrassTuftLarge` | same |
| `assets/decor/small/grass/grass_tuft_small.png` | 24×16 | `decor_small/grass/grass_tuft_small.png` registered as `decorGrassTuftSmall` | same |
| `assets/decor/small/leaves/leaf_clump_round.png` | 40×32 | `decor_small/leaves/leaf_clump_round.png` registered as `decorLeafClumpRound` | same |
| `assets/decor/small/plants/sprout_soil.png` | 32×24 | `decor_small/plants/sprout_soil.png` registered as `decorSproutSoil` | same |
| `assets/obstacles/mushroom_small/mushroom_small_red.png` | 48×48 | `obstacles/mushroom_red.png` registered as `obstacleMushroomRed` | sub-folder variant, different file size |

### Recovery (any time)
```
git mv assets/_source/future/<path> <path>
```
Then explicitly add a gameConfig key and a runtime consumer — never
just because the file is back.

---

## 2. MISSING_DESIGN — 6 dead keys → designer ship list

Six gameConfig keys reference paths under
`assets/collectibles/orchid_gold/` that **do not exist** on disk and
have no visually-verified alternate. These are real designer requests,
**not** bridgeable to existing alt files.

### Canvas spec derivation

| File on disk | Dims | Color type | Notes |
|---|---|---|---|
| `orchid_gold_collect_07.png` | **96×96** | RGBA (alpha) | **canonical for the new collect/sparkle frames** |
| `orchid_gold_collect_08.png` | **96×96** | RGBA (alpha) | canonical sibling |
| `orchid_gold_halo.png` | 72×72 | RGBA | smaller halo overlay |
| `orchid_gold_collect_02/03/04.png` | 1254×1254 | RGB (no alpha) | legacy oversized — DO NOT match these |
| `orchid_gold_main.png` | 1254×1254 | RGB (no alpha) | legacy oversized |
| `orchid_gold_big.png` | 1035×936 | RGBA | legacy oversized |

**Spec for every new frame requested below:**
- **Canvas:** 96 × 96 px
- **Format:** PNG, RGBA, **transparent background** (PNG color type 6)
- **Padding:** centred sprite, 2-4 px breathing room from canvas edge
- **Style continuity:** match `orchid_gold_collect_07.png` / `_08.png`

### Designer ship list (6 frames)

| Order | Expected on-disk path | File name | Canvas | Transparency | In-game purpose |
|---|---|---|---|---|---|
| 1 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_01.png` | 96×96 | RGBA, transparent BG | Idle-state sparkle frame **1/4**: orbit shimmer #1 around uncollected gold orchid |
| 2 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_02.png` | 96×96 | RGBA, transparent BG | Idle-state sparkle frame **2/4**: orbit shimmer #2 — slight phase shift from frame 1 |
| 3 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_03.png` | 96×96 | RGBA, transparent BG | Idle-state sparkle frame **3/4**: orbit shimmer #3 |
| 4 | `assets/collectibles/orchid_gold/` | `orchid_gold_sparkle_04.png` | 96×96 | RGBA, transparent BG | Idle-state sparkle frame **4/4**: closes the loop back to frame 1 |
| 5 | `assets/collectibles/orchid_gold/` | `orchid_gold_collect_05.png` | 96×96 | RGBA, transparent BG | Pickup-burst frame **5/6** (continues 02-04 sequence). Burst petals/specks at ~85% travel |
| 6 | `assets/collectibles/orchid_gold/` | `orchid_gold_collect_06.png` | 96×96 | RGBA, transparent BG | Pickup-burst frame **6/6**: residual fade — closes the pickup animation |

### Acceptance for designer
- File path & name **must** match the table exactly (case-sensitive).
- Canvas **must** be 96 × 96; engine pads/scales to lane size at render.
- Transparency layer **must** be present — `assets/_source/`-style RGB
  flats (color type 2) will be rejected by the audit.
- Style continuity verified against `orchid_gold_collect_07.png` and
  `_08.png` — same hue, same outline weight, same internal palette.

### What we will NOT do in code (per brief)

- We will **not** substitute the existing legacy 1254×1254 oversized
  frames (`collect_02/03/04`, `main`) for the missing sparkle frames —
  size & style don't match the canonical 07/08 pair.
- We will **not** repoint the missing-key paths at `_source/`-archived
  duplicate look-alikes from Groups #5-8 (sparkle effect bursts) —
  those are *bursts*, not *idle shimmer / pickup tail* frames.
- We will **not** silently disable the keys — that would mask a real
  designer-side gap.

---

## 3. SIDE_PAIR_MISMATCH — 1 scenery pair, designer re-export task

One `_left.png` / `_right.png` sibling pair in the **side-aware scenery**
category disagrees on canvas size. The engine renders both through the
same dispatcher at the same target scale, so the mismatched half will
visually pop on the wrong side.

| Side | Path | Current dims | Color type |
|---|---|---|---|
| LEFT | `assets/terrain/blocks/grass_dirt_step_left.png` | **1086 × 1448** | RGBA |
| RIGHT | `assets/terrain/blocks/grass_dirt_step_right.png` | **1254 × 1254** | RGBA |

### Designer task

Re-export **both halves** to a **shared canonical canvas** matching the
rest of the terrain-block side-aware family (`grass_dirt_block_left/right`
= 168×168 RGBA). Target spec:

- **Canvas:** 168 × 168 px (both halves, identical)
- **Format:** PNG, RGBA, transparent background
- **Pivot:** sprite anchored to canvas centre; the step diagonal must
  meet exactly at the canvas inner edge so left + right tile seamlessly
  when placed side by side.
- **No code workaround:** we will **not** rescale one side at draw time
  to mask the mismatch — that would be invisible to the audit and bake
  in a wrong-aspect render.

> **Distinct from road kit.** Road tiles (`assets/terrain/road/**`) are
> intentionally asymmetric (3-point perspective) — those pairs are
> recorded in the audit under "Road-kit intentional asymmetry" and are
> **not** a designer task. Only side-aware *scenery* must match.

---

## 4. Group #14 — intentional SHA duplicate, now allowlisted

| File | SHA-256 | Registered key | Status |
|---|---|---|---|
| `assets/structures/question_block/question_block_02.png` | `4f2605de…289db9c1` | `questionBlockAnim02` | kept (canonical) |
| `assets/structures/question_block/question_block_04.png` | `4f2605de…289db9c1` | `questionBlockAnim04` | **kept** — runtime requires it |

`sceneryDispatch.js:182` cycles the key
`questionBlockAnim0${animFrame}` over frames 1 → 2 → 3 → 4. Frame 4
intentionally re-uses frame 2's art to create a 1 → 2 → 3 → 2 loop;
collapsing the duplicate would erase frame 4 from the cycle.

### Allowlist

- Added the SHA hash `4f2605de…289db9c1` to
  `scripts/audit-images.mjs` → `INTENTIONAL_DUPLICATE_HASHES`.
- The audit summary now distinguishes:
  - `exact dupes` (fail-worthy) — **0**
  - `intentional` (excluded from fail) — **1 group (Group #14)**

### Bonus side-pair split

While in there, `audit-images.mjs` also learned to split side-pair
mismatches into two buckets — the same split already used by
`generate-asset-contact-sheets.mjs`:

- **Side-pair dim mismatches** (designer task) — 1 (the grass_dirt_step
  pair above)
- **Road-kit intentional asymmetry** (documented, no-action) — 2
  (`road_lane_left/right`, `road_shoulder_left/right`)

---

## Validation

```
node scripts/audit-assets.mjs --check --strict      # exits 0
node scripts/audit-images.mjs --check               # FAIL only on the
                                                    # documented
                                                    # grass_dirt_step
                                                    # designer task
npm run test                                        # 19/19 playwright
```

- Files moved to `_source/future/`: **10** (all PENDING_WIRE).
- gameConfig changes: **none** in this PR.
- Designer asks: **7** (6 MISSING_DESIGN + 1 SIDE_PAIR_MISMATCH).
- Intentional-dupe allowlist entries: **1** (Group #14).
- Audit semantics now match contact-sheet generator (side-pair split).
