# Asset Contact Sheets

Generated 2026-05-30T22:08:41.860Z

## Coverage

- PNG files discovered (all):                **440**
- PNG files shown in contact sheets:         **373**
- Coverage:                                  **84.8%**

### Skipped folders (intentional)
- `assets/_source/` — 53 files — archived / rejected designer batch
- `assets/player/_source/` — 14 files — archived / rejected designer batch

## Summary

- Total PNG files: **373**
- Registered in gameConfig: **273**
- Unregistered: **100**
- Runtime-used: **159** / 279 keys (111 explicit + 48 dynamic)
- Dead keys (no file): **6**
- Exact duplicate groups (SHA-256): **1**
- Side-aware scenery pairs (OK / mismatch / missing-right): **10** / **1** / **0**
- Road-kit pairs (asymmetric is intentional): **5**

## Contact sheets

### Player frames (53 cells)
- [`01-player-frames-page-01.png`](01-player-frames-page-01.png)
- [`01-player-frames-page-02.png`](01-player-frames-page-02.png)

### Obstacles (13 cells)
- [`02-obstacles.png`](02-obstacles.png)

### Collectibles (23 cells)
- [`03-collectibles.png`](03-collectibles.png)

### Side structures — blocks (30 cells)
- [`05-side-structures-blocks.png`](05-side-structures-blocks.png)

### Side structures — walls / bricks (35 cells)
- [`06-side-structures-walls-bricks-page-01.png`](06-side-structures-walls-bricks-page-01.png)
- [`06-side-structures-walls-bricks-page-02.png`](06-side-structures-walls-bricks-page-02.png)

### Platforms (1 cells)
- [`07-platforms.png`](07-platforms.png)

### Pipes / planters / fences (7 cells)
- [`08-pipes-planters-fences.png`](08-pipes-planters-fences.png)

### Nature — trees / bushes / grass (18 cells)
- [`09-nature-trees-bushes-grass.png`](09-nature-trees-bushes-grass.png)

### Mushrooms / flowers / small decor (35 cells)
- [`10-mushrooms-flowers-small-decor-page-01.png`](10-mushrooms-flowers-small-decor-page-01.png)
- [`10-mushrooms-flowers-small-decor-page-02.png`](10-mushrooms-flowers-small-decor-page-02.png)

### Background — sky / clouds / mountains / castle (30 cells)
- [`11-background-sky-clouds-mountains-castle.png`](11-background-sky-clouds-mountains-castle.png)

### Effects — sparkles / dust / hit-flash / bursts (61 cells)
- [`12-effects-sparkles-dust-hit-flash-bursts-page-01.png`](12-effects-sparkles-dust-hit-flash-bursts-page-01.png)
- [`12-effects-sparkles-dust-hit-flash-bursts-page-02.png`](12-effects-sparkles-dust-hit-flash-bursts-page-02.png)
- [`12-effects-sparkles-dust-hit-flash-bursts-page-03.png`](12-effects-sparkles-dust-hit-flash-bursts-page-03.png)

### UI / HUD / icons (44 cells)
- [`13-ui-hud-icons-page-01.png`](13-ui-hud-icons-page-01.png)
- [`13-ui-hud-icons-page-02.png`](13-ui-hud-icons-page-02.png)

### Unclassified (23 cells)
- [`unclassified.png`](unclassified.png)

### Side-aware scenery pairs (22 cells)
- [`14-side-aware-pairs.png`](14-side-aware-pairs.png)

### Road-kit pairs (10 cells)
- [`14b-road-kit-pairs.png`](14b-road-kit-pairs.png)

### Exact duplicates (2 cells)
- [`15-duplicates-exact.png`](15-duplicates-exact.png)

### Unregistered assets (100 cells)
- [`16-unregistered-assets-page-01.png`](16-unregistered-assets-page-01.png)
- [`16-unregistered-assets-page-02.png`](16-unregistered-assets-page-02.png)
- [`16-unregistered-assets-page-03.png`](16-unregistered-assets-page-03.png)
- [`16-unregistered-assets-page-04.png`](16-unregistered-assets-page-04.png)

### Registered but unused (120 cells)
- [`17-registered-unused-page-01.png`](17-registered-unused-page-01.png)
- [`17-registered-unused-page-02.png`](17-registered-unused-page-02.png)
- [`17-registered-unused-page-03.png`](17-registered-unused-page-03.png)
- [`17-registered-unused-page-04.png`](17-registered-unused-page-04.png)

### Missing / dead keys (6 cells)
- [`18-missing-dead-keys-placeholders.png`](18-missing-dead-keys-placeholders.png)

## Regeneration
```bash
node scripts/generate-asset-contact-sheets.mjs --all
node scripts/generate-asset-contact-sheets.mjs --group 02-obstacles
node scripts/generate-asset-contact-sheets.mjs --side-aware-only
node scripts/generate-asset-contact-sheets.mjs --duplicates-only
```