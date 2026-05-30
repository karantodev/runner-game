# Asset Dead-Key Decisions

Generated 2026-05-30T18:42:39.808Z.

Every registered key whose path has no file is one of:

- **PATH_MISMATCH_CAN_BRIDGE** — file exists at a different path. Either move
  the file to the canonical path OR update the gameConfig key. **Designer is NOT needed.**
- **MISSING_DESIGN** — no candidate found. Designer to ship.
- **DEPRECATED_KEY** — legacy stem. Remove the gameConfig entry.
- **FEATURE_NOT_IMPLEMENTED** — key for a future feature, no runtime consumer.

## PATH_MISMATCH_CAN_BRIDGE (5)

- `orchidBlueRare` — expected `assets/collectibles/orchid_blue_rare/orchid_blue_rare.png` — candidate `assets/collectibles/orchid_blue_rare.png`
- `orchidBlueRareHalo` — expected `assets/collectibles/orchid_blue_rare/orchid_blue_rare_halo.png` — candidate `assets/collectibles/orchid_blue/orchid_blue_rare_halo.png`
- `pickupMagnet` — expected `assets/pickups/magnet/magnet.png` — candidate `assets/pickups/pickup_magnet.png`
- `pickupShield` — expected `assets/pickups/shield/shield.png` — candidate `assets/pickups/pickup_shield.png`
- `pickupScoreX2` — expected `assets/pickups/score_x2/score_x2.png` — candidate `assets/pickups/pickup_score_x2.png`

## DEPRECATED_KEY (3)

- `iconComboX2` — expected `assets/ui/icons/icon_combo_x2.png`
- `iconComboX3` — expected `assets/ui/icons/icon_combo_x3.png`
- `iconComboX5` — expected `assets/ui/icons/icon_combo_x5.png`

## FEATURE_NOT_IMPLEMENTED (0)


## MISSING_DESIGN (6)

- `orchidGoldSparkle01` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png`
- `orchidGoldSparkle02` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png`
- `orchidGoldSparkle03` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png`
- `orchidGoldSparkle04` — expected `assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png`
- `orchidGoldCollect05` — expected `assets/collectibles/orchid_gold/orchid_gold_collect_05.png`
- `orchidGoldCollect06` — expected `assets/collectibles/orchid_gold/orchid_gold_collect_06.png`
