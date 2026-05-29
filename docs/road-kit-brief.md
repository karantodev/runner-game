# Road Kit — Designer Brief (v2)

Pixel-art tile kit for the main runner road in Orchid Quest. **14 PNG files total.**

## Core problem we're solving

The current procedural road reads as a flat green trapezoid with lane marks. The target reference reads as a **handcrafted grassy garden path integrated into the environment**. We need art-directed road modules, not more procedural noise.

Specifically:
- The center path must feel tighter and embedded in the garden, not a wide runway
- Road edges must be organic — grass fringe, flowers, darker edge shading, broken pixels
- Lane guides must read as worn garden-path separators, NOT as road markings
- Side scenery should visually hug the path via the shoulder transition tiles

## Output

- **Folder:** `assets/terrain/road/kit/`
- **Format:** PNG, transparent background allowed
- **Style:** pixel-art, no anti-aliasing on edges, crisp pixel-perfect
- **Color palette:** kelly-green grass, warm yellow-green for path guides, **no bright white**, **no highway markings**
- **Cohesion:** all 14 tiles must share the SAME palette + pixel size + style so they blend seamlessly when adjacent

## Critical Don'ts

- **No** white road lines / lane markings — guides must be warm yellow-green and broken
- **No** Minecraft-style 1px borders around tiles
- **No** straight hard edges between road and shoulders — must be organic pixel transitions
- **No** clutter inside the playable lanes — flowers/accents only in shoulder zones
- **No** saturation above ~60% — kelly-green, not neon

---

## Tile List (14 files)

### 1. Foreground Road Modules (3 tiles, 128×128)

Closest-to-camera lane tiles. Highest pixel detail. Used for the bottom ~25 world-units of the road.

| Filename | Description |
|---|---|
| `road_foreground_left.png` | Left lane. Rich grass texture, subtle internal lane structure, slight darker tint on the left side (suggesting shoulder shadow). |
| `road_foreground_center.png` | Center lane. Uniform rich grass, no directional bias. |
| `road_foreground_right.png` | Right lane. Mirror of foreground_left. |

**Design hints:**
- 3-5 shades of mid-green
- Visible horizontal pixel-grass detail (like grass blades laid horizontally)
- Tiny darker pixel clusters scattered (3-5 per tile)
- These tiles read CLEARLY as handcrafted pixel-art grass at full size

### 2. Mid Road Modules (3 tiles, 128×128)

Mid-distance lane tiles (~25-70 world-units). Cleaner than foreground but still hand-painted.

| Filename | Description |
|---|---|
| `road_mid_left.png` | Mid-distance left lane. ~50% less pixel detail vs foreground. |
| `road_mid_center.png` | Mid-distance center lane. |
| `road_mid_right.png` | Mid-distance right lane. |

**Design hints:**
- Same palette as foreground
- Fewer scattered darker pixels (just 1-2 per tile)
- Less aggressive horizontal stripe pattern
- Still clearly pixel-art, not "smoothed"

### 3. Far Road Module (1 tile, 256×24)

Single thin horizontal strip drawn for the far zone (70-200 world-units). Stretched across the road width near the castle.

| Filename | Description |
|---|---|
| `road_far_strip.png` | Wide thin grass band — clean, minimal pixel variation. Aspect ratio is intentionally wide-short because the road is narrow + shallow near the horizon. |

**Design hints:**
- Just a clean grass band
- 1-2 very subtle horizontal pixel stripes
- No flowers / accents / dividers
- Reads as "grass continues to the castle"

### 4. Shoulder Transition Modules (2 tiles, 96×128)

**The most important sell** — these blend the road into the garden organically. NO HARD STRAIGHT EDGES.

| Filename | Description |
|---|---|
| `shoulder_inner_left.png` | Left road-to-garden transition. Right ~60% = same grass as lane tiles. Left ~40% transitions: darker shade, small grass tufts, 1-2 tiny flowers, irregular pixel edge, occasional grass blade crossing toward outside. |
| `shoulder_inner_right.png` | Mirror of `shoulder_inner_left`. |

**Design hints:**
- Inner side (toward playable lanes): matches foreground/mid lane grass exactly
- Outer side: darker green / brown earth tint, irregular pixel edges
- 1-2 tiny flower pixels (yellow `#e8c860` or purple `#a878d0`)
- Few small grass blades crossing the border
- The transition is GRADUAL pixel-by-pixel, not a hard line
- Tile should be readable as "this is where the road softly ends"

### 5. Lane Divider Modules (2 tiles, 32×128)

Vertical narrow strips placed BETWEEN lanes. Subtle worn-grass separators, not road markings.

| Filename | Description |
|---|---|
| `lane_divider_left_center.png` | Vertical strip between left and center lane. Mostly grass background + a broken, soft, warm yellow-green vertical accent down the middle. |
| `lane_divider_center_right.png` | Mirror style of `lane_divider_left_center`. |

**Design hints:**
- Background = same grass as the lane tiles
- Center accent: warm yellow-green like `#c4ce7c` or `#d4d488`, NOT white, NOT bright yellow
- Accent broken into 3-5 short pixel segments (worn path look)
- Accent occupies center 8-12 px of the tile width
- Alpha 50-70% on the accent — readable but not loud

### 6. Edge Decoration Patches (3 tiles, 64×64)

Rare accent patches. Used sparsely (deterministic placement, ~1-2% of tiles) to break the straight road border. **Only placed in shoulder zones**, never in playable lanes.

| Filename | Description |
|---|---|
| `road_edge_flower_patch_01.png` | Small flower cluster — 2-3 tiny pixel flowers (yellow or purple) with stems. For shoulder zones. |
| `road_edge_grass_patch_01.png` | Tall grass blade cluster — slightly darker pixel grass blades. For shoulder zones. |
| `road_edge_dark_patch_01.png` | Subtle dark grass patch — darker green tint suggesting shadow. For shoulder zones. |

**Design hints:**
- All 3 patches have alpha edges so they blend onto adjacent tiles
- No prominent center — they read as soft variation, not as discrete objects
- The `_01` suffix anticipates future `_02`, `_03` variations

---

## Cohesion Test

Lay all 14 tiles in a single canvas and verify:
1. Foreground / mid / far variants look like the SAME road at 3 detail levels
2. Lane left / center / right at each depth tile cleanly side-by-side without visible seams
3. Shoulder_inner placed adjacent to a lane tile transitions organically (no hard edge)
4. Lane dividers placed between lane tiles read as worn grass, not road paint
5. Edge patches placed on shoulder_inner blend organically

If any pair shows an obvious tile boundary, iterate.

---

## Integration (what happens when files arrive)

1. Designer drops 14 PNGs into `assets/terrain/road/kit/`
2. I uncomment the 14 lines in `src/config/gameConfig.js → GAME_CONFIG.assets`
3. Hard-reload the game
4. Press **T** twice → cycle to kit mode
5. Side-by-side compare: procedural / tiles / kit

Then we tune:
- Depth-zone boundaries (where foreground → mid → far transitions)
- Side scenery lane positions (to visually hug the new road edges)
- Patch placement frequency

The `RoadRenderer.#imageKitGrid` code already handles depth zones, perspective projection, edge tiles, dividers, patch placement, and integer-rounded coordinates without hairline seams. Zero code changes needed when tiles arrive — just uncomment + reload.
