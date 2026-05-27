# Orchid Quest — Endless Runner

Collect orchids, jump over vines, avoid hazards, pick up power-ups.

---

## Source of truth

`src/` is the single source of truth. `dev.html` is the template for both dev and root loads. `npm run build` syncs `index.html` to the same module-entry template, so do not hand-edit `index.html`.

---

## Development workflow

### Dev server — ES modules, instant reload on save

```bash
npm run dev
```

Open:

```
http://localhost:8080/dev.html
```

The dev build uses native ES modules via `<script type="module">`. No build step needed. Reload the browser after editing `src/`.

### Production build

```bash
npm run build
```

Syncs `index.html` from `dev.html` and preserves the module entry:

```html
<script type="module" src="./src/main.js"></script>
```

This build step must not regenerate an inline bundle.

### Production preview

```bash
npm run preview
```

Builds and then serves. Open:

```
http://localhost:8080/
```

### Freshness check (CI gate)

```bash
npm run check
```

Exits 1 if `index.html` is out of sync with `dev.html`, if the module entry is missing, or if inline bundled source reappears. Run in CI before deployment.

**If this fails:** run `npm run build` and commit the updated `index.html`.

---

## Browser smoke tests

Requires Playwright (installed as a dev dependency).

```bash
npm run test:smoke
```

This starts the local server automatically, runs Chromium headless, and verifies:
- dev.html loads without JS errors
- production / loads without JS errors
- Canvas is present with non-zero dimensions
- Keyboard input (arrows, space, ESC, R) doesn't cause errors
- Game starts, pauses, and restarts correctly
- production `/` still uses `./src/main.js`
- production `/` does not contain inline bundled renderer source

Re-run after any refactor or build system change. Takes ~10 seconds.

---

## Adding a new module to `src/`

1. Create the file in `src/` (e.g. `src/systems/MySystem.js`).
2. Use `export class` or `export function` / `export const` for all public symbols.
3. Import it from the files that use it with normal ES module syntax.
4. Make sure the module is reachable from the runtime entry chain rooted at `src/main.js`.
5. Run `npm run build` to sync `index.html` from `dev.html`.
6. Run `npm run check` to verify the root page stayed on the module-entry template.

---

## Adding a new asset

1. Place the image in the appropriate `assets/` subdirectory.
2. Add a new entry to the `assets` section of `src/config/gameConfig.js`:
   ```js
   myAssetKey: './assets/<subdir>/<filename>.png',
   ```
3. Use `this.assets.get('myAssetKey')` in rendering code (via `SpriteRenderer` or directly).
4. The asset manager logs a warning to the console if any asset fails to load — check the browser console after adding a new asset to confirm it resolves.
5. All assets have procedural fallbacks in `PixelPainter.js`; the game works without them but looks better with them.

---

## Visual review

Use the accepted QA flow documented in:

```
docs/visual-qa.md
```

That document covers:

1. local preview
2. debug-run capture
3. runtime error checks
4. visual pass/fail criteria
