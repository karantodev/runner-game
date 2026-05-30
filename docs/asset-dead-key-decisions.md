# Asset Dead-Key Decisions

Generated 2026-05-30T20:01:43.393Z.

Every registered key whose path has no file is one of:

- **PATH_MISMATCH_CAN_BRIDGE** — file exists at a different path. Either move
  the file to the canonical path OR update the gameConfig key. **Designer is NOT needed.**
- **MISSING_DESIGN** — no candidate found. Designer to ship.
- **DEPRECATED_KEY** — legacy stem. Remove the gameConfig entry.
- **FEATURE_NOT_IMPLEMENTED** — key for a future feature, no runtime consumer.

## PATH_MISMATCH_CAN_BRIDGE (0)


## DEPRECATED_KEY (0)


## FEATURE_NOT_IMPLEMENTED (0)


## MISSING_DESIGN (6)

- `orchidGoldSparkle01` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png`
- `orchidGoldSparkle02` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png`
- `orchidGoldSparkle03` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png`
- `orchidGoldSparkle04` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png`
- `orchidGoldCollect05` — expected `assets/collectibles/orchid_gold/orchid_gold_collect_05.png`
- `orchidGoldCollect06` — expected `assets/collectibles/orchid_gold/orchid_gold_collect_06.png`
