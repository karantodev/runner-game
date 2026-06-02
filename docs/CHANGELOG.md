# Changelog

## Phase 9 — Reference-match: visual fidelity pass (v4.14–v4.19)

Drives the in-game look toward the `docs/visual-qa/` reference target. All changes are render-only — collision, spawn and prefab-composition stay in lane/distance units (verified by the collision-contract test + composition seed sweeps).

- **Lush flower field** — the meadow carpet is a clustered, violet-dominant patch system (connected flower beds, not isolated specks) with an outer-field fill and a near-distance bias, so the immersive foreground reads densely up close. Baked + GC-free via a module-local PRNG; per-frame far-culls bound overdraw (`RoadRenderer.buildMeadowPattern` / `#meadowTexture`).
- **Grounded structures** — solid contact shadows under side blocks / mushrooms / fences (`visual.juice.solidShadow`, scale-gated; floating platforms excluded), alongside the existing flora shadows.
- **Warmer scene** — deeper, warmer ground gradient + grade (`saturate` / `contrast` / `warmCool`); the road path-fill contrast was cut so the path reads as a garden trail in the field, not a separate carpet.
- **Open corridor** — NATURE-band trees pushed to the background (smaller, washed-back) + softer compressed horizon treelines, so mountains and sky read through instead of a tree wall.
- **Immersive camera (default)** — bigger, closer hero (`player.heroScale`) + a slightly wider visual scene (`projection.visualLaneScale`); `?cam=classic` restores the pre-v4.17 far framing for A/B. Pure render — collision/hitbox untouched.

> Iterated v4.14 → v4.19 with in-browser screenshot verification against the reference target.

## Phase 8 — Reference-match: spawn balance, game feel, visuals

### Spawn balance + fairness
- Difficulty is a smooth `intensity` curve (time + score) with periodic rest windows, replacing the discrete 6-step ramp. Tunables in `gameConfig.gameplay.difficulty`.
- Collectible "density discipline": the center breadcrumb trail AND the orchid filler both yield to hero/pattern figures (`RoadSpawnLedger.collectibleDensityAround`), killing the early-run "gold blob". Knobs in `gameConfig.spawn.density`.
- Anti-repetition shuffle-bag in `PatternLibrary` — a procedural pattern can't repeat back-to-back.
- Cross-seam solvability: a candidate pattern is validated against the hero/earlier obstacles already on the road (`obstaclesInSpan` + merged `PathValidator` sim), not just in isolation — closes an unfair double-switch the gap heuristic allowed.
- New difficulty buckets 5-6 (rolling corridors, vine-gates, gauntlets, duck-jump-duck) for deep / end-game variety; pool clamp raised 4 → 6.

### Risk / reward + game feel
- `flower-rich` jackpot collectible (3×, jump-gated), placed on the safe exit of the harder patterns; distinct gold burst + real-value popup on pickup.
- Combo tier-ups fire a ×N popup + escalating-colour burst (pairs with the existing combo sound).
- Forgiving lateral pickup tolerance (`gameConfig.gameplay.collect.laneWindow`).

### Collectible visuals (reference-match)
- Foreground "lead" orchid emphasis — the nearest orchid reads bigger, like the reference's prominent foreground orchid (`visual.collectibles.lead`).
- Straighter center line (`visual.collectibles.lineJitter`) + softer flower glow.
- Reference-match art pass: side-aware asset re-exports (`scripts/reexport-side-aware-assets.py`), renderer / scene / ground-scatter tuning, reference target art under `docs/visual-qa/`.

> Determinism preserved throughout (gameplay RNG via the seeded `this.rng`; particle/popup juice uses visual-only `Math.random`). Verified by `runPatternTests` (52/52) and the full Playwright suite (31/31, incl. composition seed sweeps).

## Phase 7 — Polish + Leaderboard
- Opt-in HiDPI rendering (`?hidpi=1` or `gameConfig.canvas.pixelRatio`). Default stays 1 (pixel-art look + cheap on mobile).
- Honest horizontal-scroll parallax for mountain / forest / meadow layers (`drawScrollingTile` with wrap-around). Castle still anchored.
- `PixelPainter` shrinks from 232 → 95 lines: every method is now a thin facade over `SpriteRenderer.draw`. All 8 procedural fallbacks + `paint.stone` removed.
- Local leaderboard with localStorage (`src/core/Leaderboard.js`): top-10 by score, name prompt on qualifying death, podium colouring on the death overlay.

## Phase 6 — Game Feel
- Jump + crouch input buffers. A tap that can't fire immediately stays queued for 6 frames (~100 ms) and triggers the moment the gate opens.
- Mobile on-screen controls (`#touch-controls`, `TouchControls.js`). Shown on `pointer: coarse` devices; `?touch=1` forces them on desktop.
- Performance HUD overlay (`?debug=1`): FPS, world state, entity counts per component shape.

## Phase 5 — Data + DX
- Patterns moved to `systems/spawn/patterns.data.js`, scenery prefabs to `config/sceneSchema.data.js`. `PatternLibrary.js` shrinks 411 → 42 lines, `sceneSchema.js` 283 → 78.
- Seedable RNG (sfc32 + FNV-1a string seed) in `src/utils/rng.js`. `?seed=…` reproduces a run end-to-end.
- JSDoc types on public APIs (EventBus, GameLoop, InputManager, Projection, World, math).
- Procedural fillRect-fallback farmer removed (~106 lines).
- New playwright runtime suite (`tests/ecs-runtime.spec.js`): full input sweep + seed determinism.

## Phase 4 — Full ECS rewrite
- 17 components (Position, Sprite, Hitbox, CollectibleData, Lifetime, ParticleTag, …) + `EntityRegistry` with `query()` generator.
- 12 systems: PlayerInput, PlayerPhysics, Movement, Spawn, Decoration, Collision, Particle, ScorePopup, Cleanup, GameState, Effects, PowerUp.
- CollisionSystem no longer mutates state — emits `flower:collected`, `hazard:hit`, etc. `GameStateSystem` and `EffectsSystem` listen and apply consequences.
- `src/entities/` removed (Player, Obstacle, Collectible, Scenery, Particle classes).

## Phase 3b — Render perf
- Strategy-Map dispatch for scenery asset types (`sceneryDispatch.js`) replaces the 90-line if/else chain.
- `RoadRenderer` bakes the static ground + trapezoid + edges into an offscreen canvas; per-frame paint is one `drawImage` + the scrolling bands.
- Reused render-queue + scratch arrays (no per-frame Array allocation for sort).
- `World.getPlayerRenderLanes` no longer allocates a Set or calls `toFixed`.

## Phase 3a — RenderSystem split
- `RenderSystem.js` shrinks 1238 → 90 lines. Owns the `RenderPipeline` + cross-cutting deps.
- 8 dedicated renderers in `src/render/renderers/`: Sky, Background, Landmarks, Road, Scenery, Gameplay, Player, Effects.
- Shared `helpers.js` (parallax math, road geometry, camera shake) + `constants.js` (layers, parallax factors).

## Phase 2 — Crouch mechanic
- New `overhang` obstacle type (overhead barrier). Two visual variants: low branch + spider web.
- Player crouch state + 4-frame crouch-run sprite cycle with Y-scale squash so the silhouette unmistakably reads as ducking.
- `PathValidator` extended with `crouching` / `crouchUntil` state — vine still requires a jump, overhang requires a crouch, crouch-into-vine within ~24 units is correctly rejected.
- 5 new patterns across difficulty tiers 2–4.

## Phase 1 — Stability
- Fixed-timestep accumulator GameLoop (60Hz). Resync threshold for tab-hidden / long stalls.
- ObjectPool + in-place `compactInPlace` helper. Particles flow through a 256-item pool; per-frame `.filter()` × 4 in `World.#cleanup` replaced.
- `GradientCache` prebuilds 8 `CanvasGradient` instances on construction.
- InputManager edge-counter (no more lost double-taps). `jumpHeld` clears on blur / visibilitychange. Multi-touch defence.
- HUD is event-driven and dirty-checked; the per-frame `render()` was removed.
