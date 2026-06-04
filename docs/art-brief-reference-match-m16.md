# Art Brief — Reference-Match Final Pass (M16)

**Purpose.** Close the final ~10% visual gap to the reference target with a *human pixel-art* redraw of a small, specific set of assets. This brief is for a pixel artist (or a deliberate hand-drawn pass). It is **not** for procedural/canvas generation — that was tried in M15C and the generated candidates lost to the current hand-crafted sprites in-scene.

**Reference target:** [`docs/visual-qa/premium-pixel-art-target-2026.png`](visual-qa/premium-pixel-art-target-2026.png)
**Contact sheets (current asset + in-scene scale + 70/110/300/600m context + reference crop):**
- Flowers — [`docs/visual-qa/m16-contact-flowers.png`](visual-qa/m16-contact-flowers.png)
- Pipe — [`docs/visual-qa/m16-contact-pipe.png`](visual-qa/m16-contact-pipe.png)
- Blocks — [`docs/visual-qa/m16-contact-blocks.png`](visual-qa/m16-contact-blocks.png)

**Current state:** the scene is ~88–90% of the reference. The remaining gap is *craft* (hand pixel-art), not code or density. The current sprites are already good; only redraw an asset if the new version is **clearly better in-scene at the actual render size** (see Acceptance).

---

## 1. Current → reference gap summary

| Element | Current | Reference | Gap |
|---|---|---|---|
| Flower beds | Small yellow 2-bloom cluster + lush purple cluster; render ~24–27px so the yellow reads as a dab | Dense, lush clusters that read as *beds* even small; clean petals | **Largest visible gap** — most-repeated element |
| Live pipe | Solid 3D pipe (elliptical rim, glossy cylinder); mild vertical texture | Cleaner rim, smoother cylinder, crisper L-light/R-shadow | Minor (small on-screen) |
| Blocks (grass-dirt / purple-brick / qblock) | Hand-crafted PNG sprites; decent | Crisper 3-tone shading, stronger dark outlines, grass tufts on block tops | Modest |

> **Render-path note (important):** blocks render from **PNG sprites** in the default/shipping view (`blockStyle='sprite'`). The `VoxelBlockRenderer` is a debug-only `?blockStyle=voxel` alternate, so the procedural voxel palette is **not** what ships. A human PNG redraw of the block sprites *will* show in the default scene.

---

## 2. Prioritized redraw candidates

| Priority | Asset | Rationale |
|---|---|---|
| **P1** | `yellow_flower_small.png` + `purple_flower_cluster.png` | Most visible + most-repeated; clearest gap. **Redraw as a pair** (they alternate in the same bed). |
| **P2** | `green_pipe.png` (live pipe) | Real but small on-screen → modest ROI. |
| **P3** | `question_block.png`, `purple_brick_single_{left,right}.png`, `grass_dirt_block_*` family | PNG-backed but **multi-variant** → more effort, lower ROI. |

**Excluded — do NOT target:** `assets/blocks/pipe-green.png` — legacy/unused Mario pipe (docs flag it for deletion). The live pipe is `assets/structures/pipe/green_pipe.png`.

---

## 3–4. Asset specs (paths · dimensions · transparency/baseline · render path)

### P1 — Yellow flower
- **Path:** `assets/decor_small/flowers/yellow_flower_small.png`
- **Dimensions:** 256×256, 8-bit RGBA. Opaque bounds x90–167 / y73–170 (≈77×97). **Bottom baseline ≈ y170.**
- **Render path:** `assetType: 'yellow_flower_small'` (SHOULDER band, scale 0.30–0.34) drawn at **80·scale ≈ 24–27px**. The dispatch **alternates** this key with `purpleFlowerCluster` by variant parity, and both also draw in a SceneryRenderer flower-bed composite — so the two flowers are a **matched pair**.

### P1 — Purple flower cluster
- **Path:** `assets/decor_small/flowers/purple_flower_cluster.png`
- **Dimensions:** 256×256, 8-bit RGBA. Bottom-baselined like the yellow.
- **Render path:** drawn via the same `yellow_flower_small` dispatch (alternate variant) + bed composite. Already lush — change conservatively.

### P2 — Live pipe
- **Path:** `assets/structures/pipe/green_pipe.png`
- **Dimensions:** 256×256, 8-bit RGBA. Opaque bounds x67–185 / y43–211 (≈118×168).
- **Render path:** `green_pipe`/`pipe` → `pipeGreenSprite`, drawn at **130·scale**. Side scenery (not a gameplay obstacle).

### P3 — Blocks (secondary)
- **Question block:** `assets/structures/question_block/question_block.png` — 256×256; drawn 90·scale (idle-bounce frames `questionBlockAnim01–04` fall back to this sprite).
- **Purple brick:** `assets/structures/bricks/purple_brick_single_{left,right}.png` — **56×56** side pair; drawn 110·scale. The `_left/_right` pair **must keep matching dimensions** (`audit:images` checks side-pair parity).
- **Grass-dirt block:** `assets/terrain/blocks/grass_dirt_block_{01,02,flower_01,flower_02,left,right}.png` — a **family**; drawn 185·scale. Keep side + numbered variants visually consistent. (`grass_dirt_platform_long.png` 192×40 @ 290·scale is the long platform.)

---

## 5. Visual target per asset

- **Yellow flower** — denser **bed** read at 20–30px (not isolated dots); clean pixel clusters; **warmer yellow-orange** but **NOT collectible-like** (must not be confused with the gold on-road orchids); dark-green foliage base; crisp dark outline.
- **Purple cluster** — keep its lush 5-bloom read; richer violet (NOT oversaturated); clean dark base/outline; no speckle/noise.
- **Live pipe** — cleaner rim; stronger **left highlight / right shadow**; rounded cylinder feel; **less distracting vertical striping**; reads as side scenery; match the garden palette.
- **Blocks** — crisper 3-tone shading + stronger dark outline; clean mortar (brick); clean `?` emblem + rivets (qblock); brighter green top + grass tufts (grass-dirt); match garden palette.

---

## 6. What must NOT change

- **Dimensions** stay as listed (256×256 flowers/pipe/qblock; 56×56 brick pair) **unless explicitly approved**.
- **Transparent bounds + bottom baseline preserved** — sprites are drawn at fixed px sizes, bottom-anchored; shifting opaque bounds shifts them in-scene.
- **Side-aware `_left/_right` variants stay matched** (same dimensions, mirrored shading).
- **No** schema / renderer / density / `drawImage`-count / `world.rng` / gameplay / difficulty changes. Art-only.
- **No** mobile-HUD overlap; pipe stays scenery (not obstacle).
- No release packaging as part of this work.

> **Integration is path-based.** `AssetManager` loads PNGs by path; replacing a file reflects immediately on `/` and `/dev.html`. There is no runtime atlas/JSON manifest. The standalone bundle (`npm run build:standalone`) only needs a rebuild if that artifact ships. `npm test` does not pin these pixels; `audit:images` checks dup-hash + side-pair dimension parity; `audit:assets` dimension-locks player frames only.

---

## 7. In-scene test plan (after new assets arrive)

For each delivered PNG, **before** replacing the shipped asset:
1. **Native side-by-side** — current vs candidate at native size.
2. **In-scene A/B via request interception** (repo asset untouched until approved) at **start / 70 / 110 / 300 / 600m** + shoulder close-ups, frame-aligned (seed=42 freeze-step).
3. **Assert `drawImage` delta = 0** (same draw count) and tier Ultra, perf unchanged.
4. **Swap only if the candidate is clearly better in-scene** (not just at native). Otherwise keep current.

This is the exact gate that closed M15C. A reusable harness exists from M15C/M16.

---

## Recommendation — is a human redraw worth commissioning?

- **Yes for P1 (yellow + purple flowers, redrawn together)** — most visible, most repeated, clearest gap; a skilled pixel artist can make them read as lush beds at 25px = a real, visible lift.
- **P2 pipe: low ROI** — small on-screen; optional.
- **P3 blocks: optional stretch** — already decent + multi-variant effort.
- **If no pixel artist is readily available, the current build is shippable as-is** — the remaining gap is small and was the accepted stopping point.

---

*Generated for M16 (scope/brief only). No code, schema, renderer, or shipped-asset changes were made. Contact-sheet images are the only new files.*
