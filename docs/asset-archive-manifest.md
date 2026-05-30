# Asset Archive Manifest — 2026-05-30

33 files moved from active asset tree to
`assets/_source/rejected_2026_05_30/duplicates/group_NN/<original-path>`.

**Reversible & traceable.** Original relative path is preserved under
each `group_NN/` folder; `git log --follow` resolves the rename history.

Source: `docs/asset-duplicate-cleanup-proposal.md` (15 SHA-256 groups).
14 / 15 groups archived; **Group #14 deliberately skipped** because
the runtime renders `questionBlockAnim04` via a dynamic-key
animation cycle (`sceneryDispatch.js:182`).

## Pre-archive gameConfig changes (3 keys removed)

| Key | Reason |
|---|---|
| `uiScorePanel` | SHA-identical to `uiLivesPanel`, no `src/` consumer |
| `uiPanelLongBlue` | SHA-identical to `uiLivesPanel`, no `src/` consumer |
| `orchidGoldCollect01` | SHA-identical to `orchid_gold_main.png`, no consumer |

`questionBlockAnim04` key **kept** — used by dynamic frame cycle.

## Move log

### Group #1 — 1960×403 (1 file)
- Canonical kept: `assets/background/clouds/cloud_large.png`
- Archived:
  - `assets/background/clouds/clouds.png` → `assets/_source/rejected_2026_05_30/duplicates/group_01/assets/background/clouds/clouds.png` · unregistered

### Group #2 — 1254×1254 (3 files)
- Canonical kept: `assets/collectibles/orchid_blue/orchid_blue_rare_halo.png`
- Archived:
  - `assets/effects/effect_magic_circle_glow_01.png` → `group_02/…` · unregistered
  - `assets/powerups/powerup_magic_circle_glow.png` → `group_02/…` · unregistered
  - `assets/powerups/magic_circle_glow_01.png` → `group_02/…` · unregistered

### Group #3 — 1254×1254 (1 file)
- Canonical kept: `assets/collectibles/orchid_gold/orchid_gold_main.png`
- Archived:
  - `assets/collectibles/orchid_gold/orchid_gold_collect_01.png` → `group_03/…` · **registered as `orchidGoldCollect01`, key removed**

### Group #4 — 1448×1086 (1 file)
- Canonical kept: `assets/effects/dust_puff/dust_puff_03.png`
- Archived:
  - `assets/effects/sparkle/sparkle_05.png` → `group_04/…` · unregistered

### Group #5 — 1254×1254 (3 files)
- Canonical kept: `assets/effects/effect_gold_spark_burst.png`
- Archived:
  - `assets/effects/sparkle_04.png` → `group_05/…` · unregistered
  - `assets/effects/effect_burst_gold_01.png` → `group_05/…` · unregistered
  - `assets/powerups/star_burst_gold_01.png` → `group_05/…` · unregistered

### Group #6 — 1254×1254 (3 files)
- Canonical kept: `assets/effects/effect_small_star_burst.png`
- Archived:
  - `assets/effects/sparkle_01.png` → `group_06/…` · unregistered
  - `assets/effects/effect_star_small_01.png` → `group_06/…` · unregistered
  - `assets/powerups/star_gold_small_01.png` → `group_06/…` · unregistered

### Group #7 — 1254×1254 (3 files)
- Canonical kept: `assets/effects/effect_small_star_glint.png`
- Archived:
  - `assets/effects/sparkle_03.png` → `group_07/…` · unregistered
  - `assets/effects/effect_star_burst_small_01.png` → `group_07/…` · unregistered
  - `assets/powerups/star_glint_small_01.png` → `group_07/…` · unregistered

### Group #8 — 1254×1254 (3 files)
- Canonical kept: `assets/effects/sparkle_02.png`
- Archived:
  - `assets/powerups/powerup_gold_star.png` → `group_08/…` · unregistered
  - `assets/powerups/star_gold_01.png` → `group_08/…` · unregistered
  - `assets/powerups/powerup_star_gold_01.png` → `group_08/…` · unregistered

### Group #9 — 1254×1254 (3 files)
- Canonical kept: `assets/pickups/pickup_magnet.png`
- Archived:
  - `assets/powerups/powerup_magnet_gold_aura.png` → `group_09/…` · unregistered
  - `assets/powerups/powerup_magnet_01.png` → `group_09/…` · unregistered
  - `assets/powerups/magnet_gold_aura_01.png` → `group_09/…` · unregistered

### Group #10 — 1254×1254 (3 files)
- Canonical kept: `assets/pickups/pickup_score_x2.png`
- Archived:
  - `assets/powerups/powerup_medal_x2_gold.png` → `group_10/…` · unregistered
  - `assets/powerups/medal_x2_gold_01.png` → `group_10/…` · unregistered
  - `assets/powerups/powerup_multiplier_x2_medal_01.png` → `group_10/…` · unregistered

### Group #11 — 1254×1254 (3 files)
- Canonical kept: `assets/pickups/pickup_shield.png`
- Archived:
  - `assets/powerups/powerup_orchid_shield_glow.png` → `group_11/…` · unregistered
  - `assets/powerups/shield_orchid_glow_01.png` → `group_11/…` · unregistered
  - `assets/powerups/powerup_shield_orchid_01.png` → `group_11/…` · unregistered

### Group #12 — 1448×1086 (2 files)
- Canonical kept: `assets/platforms/platform_floating.png`
- Archived:
  - `assets/platforms/platform_grass_small.png` → `group_12/…` · unregistered
  - `assets/platforms/platform_grass_small_01.png` → `group_12/…` · unregistered

### Group #13 — 1448×1086 (2 files)
- Canonical kept: `assets/platforms/platform_grass_vines.png`
- Archived:
  - `assets/platforms/platform_hanging_vines.png` → `group_13/…` · unregistered (≠ `platformHangingVines` key which points at `structures/platforms/`)
  - `assets/platforms/platform_grass_vines_01.png` → `group_13/…` · unregistered

### Group #14 — 1254×1254 (SKIPPED)
- Canonical: `assets/structures/question_block/question_block_02.png` (registered `questionBlockAnim02`)
- **Not archived:** `assets/structures/question_block/question_block_04.png` (registered `questionBlockAnim04`) — runtime renders frames via `questionBlockAnim0${animFrame}` (`sceneryDispatch.js:182`). Archiving would remove frame 4 from the animation cycle.

### Group #15 — 1964×516 (2 files)
- Canonical kept: `assets/ui/panels/lives_panel_bg.png` (registered `uiLivesPanel`)
- Archived:
  - `assets/ui/panels/score_panel_bg.png` → `group_15/…` · **registered as `uiScorePanel`, key removed**
  - `assets/ui/panels/panel_long_blue.png` → `group_15/…` · **registered as `uiPanelLongBlue`, key removed**

## Recovery

To restore any file:
```
git mv assets/_source/rejected_2026_05_30/duplicates/group_NN/<original-relpath>/<filename> <original-relpath>/<filename>
```

To recover an entire group:
```
git log --diff-filter=R --name-status -- 'assets/_source/rejected_2026_05_30/duplicates/group_NN/**'
```

## Verification

```
node scripts/audit-assets.mjs --check --strict   # exits 0
node scripts/audit-images.mjs --check            # 1 group left (Group #14), expected
```

- Player frame validation: 26 OK / 0 FAIL / 0 MISSING (unchanged)
- Semantic registry coverage: 57/57 SEMANTIC_OK (unchanged)
- 19/19 playwright tests pass
- Files archived: 33 (15 groups → 1 remaining, Group #14 intentional)
