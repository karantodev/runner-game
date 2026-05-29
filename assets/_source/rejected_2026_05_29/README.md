# Rejected designer batch — 2026-05-29

Files in this directory were delivered by the designer at non-canonical
paths that duplicate already-registered assets at the canonical paths.
Kept here for traceability; engine does NOT read from `_source/`.

## Why rejected

| Original delivery path | Canonical registered path | Reason |
|---|---|---|
| `assets/effects/orchid_gold_collect/orchid_gold_collect_01..06.png` | `assets/collectibles/orchid_gold/orchid_gold_collect_01..06.png` | Duplicate at wrong category. Engine uses the `collectibles/` path via `orchidGoldCollect01..06` keys. |
| `assets/effects/orchid_gold_sparkle/orchid_gold_sparkle_01..04.png` | `assets/collectibles/orchid_gold/orchid_gold_sparkle_01..04.png` | Duplicate at wrong category. Engine uses the `collectibles/` path via `orchidGoldSparkle01..04` keys. |

If a future batch revisits the orchid-gold animation, the canonical
locations above are authoritative — designer should overwrite IN
PLACE at `assets/collectibles/orchid_gold/`, not re-create under
`assets/effects/`.
