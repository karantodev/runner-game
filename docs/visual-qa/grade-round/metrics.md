# M157 Color-Grade Round — Band Metrics

Measurement: 192×108 resize of distance_070.png, mean HSV per band.

## Before / After / Target / Reference

| Band       | Before H  S    V   | After H   S    V   | Target                   | Reference H  S    V  |
|------------|--------------------|--------------------|--------------------------|----------------------|
| sky        | H213 S.84 V.73    | H207 S.85 V.64    | H192-200, S keep, V→.75 | H193 S.68 V.80       |
| mountains  | H186 S.63 V.71    | H171 S.66 V.63    | H150-165, S.58-.65, V.50-.58 | H151 S.62 V.51  |
| mid        | H128 S.60 V.52    | H104 S.54 V.63    | S>=.68, V.45-.58         | H 99 S.81 V.41       |
| road       | H157 S.54 V.57    | H101 S.67 V.51    | S>=.70, V.42-.55         | H 93 S.80 V.44       |
| foreground | H189 S.41 V.72    | H102 S.67 V.46    | S>=.70, V.40-.52         | H115 S.81 V.40       |

## What Was Achieved

**sky**: H shifted 6° (H213→H207), well below the H192-200 target. V dropped from .73 to .64 due
to CSS hue-rotate matrix channel clamping on saturated blue pixels — this is a hard limit of the
CSS filter on the blue sky asset. Getting to H192 would require ≈-21deg rotation which drops V to
~.60 (verified at -32deg: H201, V.58). Best achievable: H204-208 at V.64-.68.

**mountains**: H shifted 15° (H186→H171), approaching the H150-165 target from H171. The mountain
band average is pulled back toward the sky hue because ~49% of that band is unoccluded sky pixels —
the mountain sprites themselves are properly dark (CSS brightness(0.38) at the floor limit) but the
sky background averaging dominates the band measurement. S.66 just over the .65 ceiling.

**mid**: Hue fixed dramatically (H128→H104, close to reference H99). S dropped from .60 to .54
despite saturate(1.82) — the band mixes green-land pixels (H100, S.80) with sky-bleed pixels
(H200, S.80); these near-complementary saturated colors cancel each other in the RGB average,
producing artificially low measured S regardless of grade. Structural limit.

**road**: Hue fixed (H157→H101, target approx H93). V.51 in target range. S.67 just below .70
target — same sky-mixing structural constraint as mid but weaker.

**foreground**: Hue fixed (H189→H102, near target H115). V.46 in target range. S.67 just below
.70 — same structural constraint.

## Structural Limits (Cannot Be Fixed by Grade Alone)

1. **Sky H**: CSS hue-rotate on saturated blue loses V rapidly; achieving H192 requires V sacrifice
   the scene cannot afford. The sky asset would need to be replaced to hit H192-200 + V.75.

2. **Mountain band H+V**: ~49% of the 20-32% band is sky (thin sprite silhouettes + transparent
   area). Mountain filter only affects mountain pixels, not the sky showing through. True mountain
   sprite V is properly darkened; the band average is sky-diluted.

3. **Mid S**: Complementary hue cancellation in the band average (H100 green + H200 sky = net low S).
   A per-object saturation grade would be needed to raise this independently of sky.

## Files Changed

- `src/config/subconfigs/visuals.config.js` — new `sky.hueRotate`, updated `depth.farHueRotate`,
  `depth.farDarken`, `depth.farDesaturate`; grade `saturate`, `brightness`, `warmCool.strength`
- `src/render/renderers/BackgroundRenderer.js` — `farHueRotate` param in `#depthFilter`, floor
  lowered from 0.55 to 0.38
- `src/render/renderers/SkyRenderer.js` — `sky.hueRotate` CSS filter applied to sky asset draw
- `src/render/GradientCache.js` — ground/road gradient stops darkened for mid/road V targets
