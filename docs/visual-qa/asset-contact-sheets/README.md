# Asset Contact Sheets

Generated 2026-05-30T18:28:06.888Z

## Coverage

- PNG files discovered (all):                **440**
- PNG files shown in contact sheets:         **416**
- Coverage:                                  **94.5%**

### Skipped folders (intentional)
- `assets/_source/` — 10 files — archived / rejected designer batch
- `assets/player/_source/` — 14 files — archived / rejected designer batch

## Summary

- Total PNG files: **416**
- Registered in gameConfig: **271**
- Unregistered: **145**
- Runtime-used: **152** / 285 keys (111 explicit + 41 dynamic)
- Dead keys (no file): **14**
- Exact duplicate groups (SHA-256): **15**
- Side-aware scenery pairs (OK / mismatch / missing-right): **10** / **1** / **0**
- Road-kit pairs (asymmetric is intentional): **5**

## Contact sheets

### Side-aware scenery pairs (22 cells)
- [`14-side-aware-pairs.png`](14-side-aware-pairs.png)

### Road-kit pairs (10 cells)
- [`14b-road-kit-pairs.png`](14b-road-kit-pairs.png)

### Missing / dead keys (14 cells)
- [`18-missing-dead-keys-placeholders.png`](18-missing-dead-keys-placeholders.png)

## Regeneration
```bash
node scripts/generate-asset-contact-sheets.mjs --all
node scripts/generate-asset-contact-sheets.mjs --group 02-obstacles
node scripts/generate-asset-contact-sheets.mjs --side-aware-only
node scripts/generate-asset-contact-sheets.mjs --duplicates-only
```