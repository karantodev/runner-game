# Git Clean Manifest

This manifest lists the files that belong in the repository and identifies local/generated artifacts that should stay out of git.

## Keep

| Path | Type | Keep | Notes |
| --- | --- | --- | --- |
| `src/` | runtime | yes | Source of truth for the game. |
| `assets/` | runtime | yes | Game art and UI assets. |
| `index.html` | runtime | yes | Root entry page. |
| `dev.html` | dev | yes | Module-entry template used by `build.js` and smoke coverage. |
| `style.css` | runtime | yes | Game styling. |
| `README.md` | docs | yes | Project overview and workflow. |
| `playwright.config.js` | test | yes | Smoke-test runner config. |
| `build.js` | dev | yes | Root/dev template sync and stale-bundle guard. |
| `server.mjs` | dev | yes | Official local preview and gated debug capture server. |
| `tests/smoke.spec.js` | test | yes | Current useful smoke coverage. |
| `docs/CHANGELOG.md` | docs | yes | Consolidated project history and accepted baseline. |
| `docs/visual-qa.md` | QA | yes | Accepted visual/debug verification workflow. |
| `docs/git-clean-manifest.md` | docs | yes | This manifest. |

## Ignore

| Path | Ignore | Notes |
| --- | --- | --- |
| `node_modules/` | yes | Installed dependencies. |
| `test-results/` | yes | Generated Playwright output. |
| `playwright-report/` | yes | Generated Playwright HTML output. |
| `tmp/` | yes | Local debug capture output. |
| `.DS_Store` | yes | macOS Finder metadata. |

## Removed legacy items

| Path | Removed | Notes |
| --- | --- | --- |
| `target-frame.dev.html` | yes | Old reference utility, not runtime product flow. |
| `tests/screenshot.spec.js` | yes | Local screenshot generation workflow, not required for maintained smoke coverage. |
