# Visual QA

## Standard pass

1. `npm run dev` — serves at `http://localhost:8080`.
2. Open `/dev.html` for the module-entry build, or `/` for the synced root build.
3. Browser console must show no runtime errors during a full ~30s run.
4. Smoke-check: hearts decrement on hazard contact, score increments on orchids, the death overlay shows the top-N leaderboard, restart works.

## URL parameters worth driving

| Param | What to check |
|---|---|
| `?seed=12345` | Spawn sequence is identical across reloads with the same seed. |
| `?hidpi=1` | Edges look crisp on Retina; verify FPS doesn't drop sharply (use `?debug=1` overlay). |
| `?touch=1` | On-screen pad appears bottom-left/right; pad buttons activate `.is-active` on press. |
| `?debug=1` | Performance HUD top-left shows FPS, entity counts, world state. Debug panel bottom-right has Capture / Restart buttons. |
| `?debug=1&autostart=1` | Skips the menu and begins a debug-run automatically. |
| `?debugSteps=N` | With `debug=1` and `debugFreeze=1`, advances exactly N update ticks then renders. |

## Capture flow

1. Visit `/dev.html?debug=1&autostart=1`.
2. Press `F8` (or click "Capture PNG" in the debug panel) to save the current canvas to `tmp/debug-captures/`.
3. The capture endpoint is gated by `gameConfig.debug.allowLocalTools` and a localhost host check.

## What "obvious regression" means

- Player sprite missing or stuck on frame 01 (sprite atlas didn't load).
- Background mountains / forest stop scrolling (parallax factor regressed to 0).
- Crouch silhouette indistinguishable from running pose (Y-scale config drifted).
- HUD doesn't dirty-update (score / hearts frozen).
- Touch pad buttons don't show `is-active` class on press (TouchControls binding broken).
