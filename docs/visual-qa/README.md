# Visual QA — Side Corridor Composition

Source of truth for the visual layout deliverables of the World Asset
Semantics + Placement Rules system. Captures are deterministic per
seed: re-running the capture script produces the same pixels.

## Files

```
docs/visual-qa/
├── README.md                                    ← this file
├── side-corridor-before-after.png               ← phase 6 vs phase 7
├── side-corridor-phase7-vs-phase7b.png          ← phase 7 vs phase 7b
├── before/   (phase 6 — 14 entries, dense rails)
├── phase7/   (phase 7 — 11 entries, light cleanup)  [renamed from after/]
└── phase7b/  (phase 7b — 6 anchors + scale zones + MIDGROUND trim)
```

## Phase progression (HERO_LAYOUT entry count)

```
phase 6    →  14 entries  (every depth tier filled, both sides)
phase 7    →  11 entries  (~20% reduction, light cleanup)
phase 7b   →   6 entries  (~45% reduction, zoned scale, clean castle)
```

## What changed in phase 7b vs phase 7

### `HERO_LAYOUT` v3 — 11 → 6 anchors with per-zone `scaleMultiplier`

| Zone | Distance | scaleMultiplier | Entries |
|---|---|---|---|
| NEAR FOREGROUND | 20-30m | 1.00 | 2 (foreground-left-anchor, foreground-right-anchor) |
| MID             | 60-80m | 0.72-0.75 | 2 (hero-layered-platform-qblocks, corner-platform-mushroom-frame) |
| FAR             | 130-150m | 0.40-0.42 | 2 (leaf-forest-edge, organic-meadow) |
| CASTLE APPROACH | 150m+ | — | 0 (deliberately empty) |

Removed in phase 7b vs phase 7:
- `brick-corridor-segment` @ 82 (mid brick clutter)
- `long-platform-with-mushroom` @ 100 (mid mushroom repeat)
- `fence-flower-row` @ 118, 188 (mid + castle-approach noise)
- `large-bush-garden` @ 196 (castle-approach noise)
- `hero-layered-corner-brick` @ 16 → swapped for new `foreground-left-anchor` @ 20
- `hero-layered-pipe-landmark` @ 22 → swapped for new `foreground-right-anchor` @ 30

### Two new hand-composed foreground anchors

- `foreground-left-anchor`: outer mushroom-on-block + inner brick + front flora
- `foreground-right-anchor`: pipe landmark + back bush + inner brick + front fence + flower

Both `proceduralOk: false` — they live exclusively in HERO_LAYOUT.

### MIDGROUND_SCENERY trim — 34 → 17 entries (50% reduction)

Static structure frame previously placed a block / wall / qblock every
~12 distance units along both sides. Now only mid-to-far depths (65m+)
carry structures; the near zone (12-50m) is trees + silhouettes only.

Removed (per side):
- LEFT: 18 block, 31 qblock, 42 wall, 54 block, 78 qblock, 119 brick, 174 block-2nd-variant
- RIGHT: 18 block, 31 qblock, 42 wall, 78 qblock, 104 fence, 157 block, 168 block-2nd-variant

### FOREGROUND_FRAME_SCENERY trim — 19 → 8 entries

Previous frame placed walls + qblocks + blocks at distance 3-28 right
under the camera. Removed all walls / blocks / qblocks; kept only trees
+ small shoulder flora. HERO_LAYOUT's foreground anchors at distance
20-30 now carry the structural framing.

### Procedural fill floor

`DecorationSystem.prepopulate` now hard-floors `procStart` at 200m so
the 150-200m band stays empty. Even with our softened procedural pool,
without this floor, decor would creep into the castle-approach band
and break the road→castle axis.

## Honest visual delta assessment

Comparing `phase7/seed-1-dist-*` to `phase7b/seed-1-dist-*`:

- **dist=30**: phase7b shows fewer scattered structures on the right —
  the foreground-right-anchor reads as one composed beat (pipe + bush)
  vs phase7's mixed brick/mushroom/qblock cluster.
- **dist=70**: phase7b mid zone now has 1 platform-qblock structure on
  left at scale 0.75 + 1 platform-mushroom on right at scale 0.72,
  alternating cleanly. Phase 7 had heavier `brick-corridor-segment` on
  left at the same distance.
- **dist=120**: phase7b castle approach is **noticeably cleaner** —
  no MIDGROUND wall at distance 104, 119, 157; no late HERO_LAYOUT
  fence at 118; just trees + distant mushroom silhouettes.

This is still **not** a dramatic "wow this looks like the reference"
delta. The remaining visual noise comes from gameplay items (orchid
flower lines / arcs spawned by HERO_ROAD_SEQUENCE) which intentionally
populate the road core. Truly reference-level composition would
require new artwork (a wider "garden frame" prefab, a different
mushroom shape, better silhouette tree variants) — a designer task,
not a layout task.

## How to regenerate

```bash
# Terminal 1: start the dev server.
node server.mjs

# Terminal 2: capture either label.
node scripts/capture-side-corridor.mjs capture phase7b
# … edit layout …
node scripts/capture-side-corridor.mjs capture phase7c
# Compose any two label folders side-by-side.
node scripts/capture-side-corridor.mjs compose phase7b phase7c out.png
```

Capture relies on `window.__ORCHID_GAME__` (exposed in debug builds)
to top up the autostart-driven player's invulnerability while the
world ticks forward to each requested distance.

## Related — image audit

`node scripts/audit-images.mjs` walks every PNG under `assets/` and
emits `docs/image-audit-report.md` with: exact-content duplicates
(SHA-256 hash groups), stem-family dimension inconsistencies,
side-pair (`_left.png` / `_right.png`) dimension mismatches, and
suspicious aspect ratios for known categories. Useful for spotting
designer over-delivery / wrong-canvas re-exports without opening
each file by hand.
