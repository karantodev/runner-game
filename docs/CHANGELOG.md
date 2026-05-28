# Changelog

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
