# Orchid Quest

Endless-runner with three lanes, jumps, ducks, and procedurally generated obstacle patterns.
Vanilla ES modules, no build step, runs in any modern browser.

## Quick start

```bash
npm install
npm run dev          # http://localhost:8080/dev.html
```

Keyboard: `← →` / `A D` move · `Space` / `↑` jump · `↓` / `S` crouch · `R` restart · `Esc` / `P` pause
Gamepad and touch (swipe + on-screen buttons on mobile) also supported.

## URL parameters

| Param | Effect |
|---|---|
| `?seed=12345` or `?seed=any-string` | Deterministic spawn sequence (great for repro) |
| `?hidpi=1` | Render at `window.devicePixelRatio` (crisper on Retina, heavier on mobile) |
| `?touch=1` | Force the on-screen touch pad on desktop |
| `?debug=1` | Debug panel + Performance HUD (FPS, entity counts) |
| `?autostart=1` | Skip the menu and start a debug run immediately |
| `?debugSteps=N` | Number of update ticks to advance when `debug=1` and `debugFreeze=1` |

`debug=1` and `autostart=1` require `gameConfig.debug.allowLocalTools` and a localhost host.

## Scripts

```bash
npm run dev              # local server with hot reload (just reload the tab)
npm run build            # sync index.html to dev.html (no bundling)
npm run check            # CI gate — fails if index.html is stale
npm run preview          # build, then serve at /
npm run test:smoke       # 2 playwright specs — page loads, no console errors
npm run test:runtime     # 5 playwright specs — input, leaderboard, seed determinism
npm test                 # both spec files
```

## Architecture

```
src/
  config/                game data + scene enums
    gameConfig.js          single source of truth for tunables
    sceneSchema.js         enums + helpers
    sceneSchema.data.js    static scenery prefab tables
  core/                  bootstrap + cross-cutting infra
    Game.js                composition root
    GameLoop.js            fixed-timestep accumulator (60Hz)
    EventBus.js            pub/sub
    InputManager.js        keyboard + touch + gamepad (edge-counter API)
    TouchControls.js       binds DOM buttons → InputManager
    AssetManager.js        Image preload + lookup
    Leaderboard.js         localStorage top-N
    PerformanceHUD.js      ?debug=1 overlay (FPS, entity counts)
  ecs/                   entity-component-system
    Entity.js              { id, alive, components }
    EntityRegistry.js      create / destroy / query
    components.js          pure data factories
    factories.js           createPlayer / createObstacle / …
    playerActions.js       pure functions over player components
  systems/               per-frame logic + event responders
    PlayerInputSystem.js   input → actions, sets jump/crouch buffers
    PlayerPhysicsSystem.js lane damp + jump physics + buffer retry
    MovementSystem.js      scroll all entities with Position+Scrollable
    SpawnSystem.js         pattern + orchid + life + power-up timing
    DecorationSystem.js    side-scenery chunks
    CollisionSystem.js     emits flower:/life:/power:/hazard: events
    PowerUpSystem.js       speed-burst / split-clones timers
    ParticleSystem.js      VFX motion + lifetime
    ScorePopupSystem.js    +1 popups
    CleanupSystem.js       single registry.compact() per tick
    GameStateSystem.js     score/lives/distance/tier from events
    EffectsSystem.js       event-driven particle / popup spawning
    RenderSystem.js        thin composition root for the render pipeline
    HudSystem.js           DOM HUD (dirty-checked)
    spawn/
      DifficultyDirector.js  score+time → level + spacing
      PatternLibrary.js      weighted pick from patterns.data
      PathValidator.js       solvability simulation
      PatternTests.js        35 self-checks + 10k stress spawns
      patterns.data.js       21 patterns + split-bonus + safe-fallback
  render/                rendering pipeline (no game logic)
    RenderPipeline.js       fixed back-to-front composer
    GradientCache.js        prebuilt CanvasGradient cache
    SpriteRenderer.js       single drawImage helper
    PixelPainter.js         keyed sprite facade
    constants.js            LAYERS, PARALLAX, AMBIENT_MOTES
    helpers.js              parallax, road geometry, tile scroll, shake
    renderers/
      SkyRenderer.js          sky + sun + haze
      BackgroundRenderer.js   clouds + 3 mountain layers (tile-scroll)
      LandmarksRenderer.js    castle + forest + meadow (tile-scroll)
      RoadRenderer.js         offscreen-baked statics + dynamic bands
      SceneryRenderer.js      midground + foreground + dynamic
      GameplayRenderer.js     obstacles + collectibles + warning pulse
      PlayerRenderer.js       player + clones (purple wash overlay)
      EffectsRenderer.js      particles + popups + hit flash
      scenery/
        sceneryDispatch.js    Map<assetType, drawFn>
  utils/
    math.js                clamp, lerp, damp
    pool.js                ObjectPool + compactInPlace
    rng.js                 sfc32 PRNG with string-seed support
  world/
    Projection.js          pseudo-3D world→screen mapping
    World.js               registry + system pipeline + scalars
  main.js                  URL param parsing + boot
```

## Adding content

### A new obstacle
1. Drop the PNG in `assets/obstacles/<category>/`.
2. Add the key + path to `gameConfig.assets`.
3. Add the gameplay `type` to `factories.OBSTACLE_DEFAULT_ASSET` (if needed).
4. Wire the visual in `render/renderers/GameplayRenderer.js#obstacleEntity`.
5. Update `CollisionSystem.#hitObstacles` if it needs special clear rules
   (vine = jump, overhang = crouch, anything else = hazard).
6. Extend `PathValidator.#simulate` if the new type changes solvability.
7. Use it in `systems/spawn/patterns.data.js`.

### A new pattern
Append to `systems/spawn/patterns.data.js`. Run `npm run test:runtime` —
`runPatternTests` validates every pattern + 10 000 simulated spawns.

### A new scenery type
Register a draw function in `render/renderers/scenery/sceneryDispatch.js`.

## Tests

- `tests/smoke.spec.js` — page boot, no JS errors, root build stays on module entry.
- `tests/ecs-runtime.spec.js` — full input sweep, touch buttons, jump
  buffer, leaderboard CRUD, seed determinism.
- `src/systems/spawn/PatternTests.js` — 35 self-checks + a 10k pattern
  stress run across difficulty tiers (call from the debug API or
  `node -e "import('./src/systems/spawn/PatternTests.js').then(m=>console.log(m.runPatternTests().summary))"`).
