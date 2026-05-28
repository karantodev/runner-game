# Git Clean Manifest

What belongs in the repository and what stays out.

## Keep

| Path | Type | Notes |
|---|---|---|
| `src/` | runtime | Single source of truth for game code. |
| `assets/` | runtime | All sprites + UI art. ~105 PNG/SVG files. |
| `index.html` | runtime | Root entry. Generated from `dev.html` by `npm run build`; do not hand-edit. |
| `dev.html` | dev | Module-entry template. Edit here, then `npm run build`. |
| `style.css` | runtime | HUD + overlay + touch controls + leaderboard styling. |
| `README.md` | docs | Project overview, scripts, URL params, architecture. |
| `playwright.config.js` | test | Playwright runner config. |
| `build.js` | dev | `dev.html → index.html` sync + freshness check. |
| `server.mjs` | dev | Local preview server + gated debug capture endpoint. |
| `package.json` / `package-lock.json` | npm | Dependencies + scripts. |
| `tests/smoke.spec.js` | test | 2 specs — page boots, no console errors. |
| `tests/ecs-runtime.spec.js` | test | 5 specs — input, touch buttons, jump buffer, leaderboard CRUD, seed determinism. |
| `docs/CHANGELOG.md` | docs | Phase-by-phase project history. |
| `docs/visual-qa.md` | docs | Visual QA flow + URL params. |
| `docs/git-clean-manifest.md` | docs | This file. |

## Ignored

Listed in `.gitignore`:

- `node_modules/` — npm install output.
- `test-results/` — playwright per-run artifacts.
- `playwright-report/` — playwright HTML report.
- `tmp/` — local debug capture output (`tmp/debug-captures/*.png`).
- `.DS_Store` — macOS Finder metadata.

## Health check

```bash
git status                # working tree should be clean
git ls-files | grep -iE "\.ds_store|test-results|playwright-report|tmp/|node_modules"
                          # should print nothing
npm run check             # index.html aligned with dev.html
```
