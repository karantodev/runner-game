# Visual QA — Side Corridor Composition

Source of truth for the visual layout deliverables of the World Asset
Semantics + Placement Rules system. Captures are deterministic per
seed: re-running the capture script produces the same pixels.

## Files

- `side-corridor-before-after.png` — 3 × 6 contact sheet. Three seeds
  (rows), three distances (cols), BEFORE-left vs AFTER-right halves.
- `before/seed-<N>-dist-<M>.png` — individual cell snapshots taken
  with the v3.8.40 Phase-6 HERO_LAYOUT (14 entries).
- `after/seed-<N>-dist-<M>.png` — same cells with the v3.8.41 Phase-7
  HERO_LAYOUT (11 entries + procedural-pool filter).

## What changed in Phase 7

The Phase-6 prefab annotation closed the **data layer** — every item
has explicit role / parent / anchor / zLayer and strict mode rejects
invalid compositions. But the **visual layer** still felt scattered:
heavy hero clusters landed right at the player's feet (distances
12 / 16 / 32 / 38), the procedural pool re-used those same heavy
clusters past HERO_LAYOUT's tail, and the castle approach lane drifted
into a wall of brick-corridor-segments.

Phase 7 is a pure layout pass — no new validation, no new asset.

### `HERO_LAYOUT` v2: 14 → 11 entries, zoned by depth

| Zone              | Distance | Rule                                       |
|---|---|---|
| NEAR FOREGROUND   | 16-22m   | 2 large anchors framing the road           |
| NEAR-MID          | 42-58m   | one structural beat per side, alternating  |
| MID               | 82-118m  | smaller blocks / platforms, alternating    |
| FAR               | 142-162m | tiny silhouettes only (soft flora)         |
| CASTLE APPROACH   | 188-196m | minimal density, road stays dominant       |

### `proceduralOk: false` on the four heavy hero prefabs

`hero-layered-corner-brick`, `-platform-qblocks`, `-pipe-landmark`,
and `-brick-cascade` are now exclusive to HERO_LAYOUT's hand-placed
anchor slots. `DecorationSystem.#buildWeightedChunks` skips any prefab
whose `proceduralOk === false`. Result: the procedural rotation past
HERO_LAYOUT pulls from soft / mid clusters only — no double-hero
collisions.

## How to regenerate

```bash
# Terminal 1: start the dev server.
node server.mjs

# Terminal 2: capture either label, then compose.
node scripts/capture-side-corridor.mjs before
# … edit layout …
node scripts/capture-side-corridor.mjs after
node scripts/capture-side-corridor.mjs compose
```

Capture relies on `window.__ORCHID_GAME__` (exposed in debug builds)
to top up the autostart-driven player's invulnerability while the
world ticks forward to each requested distance.
