# Developer Integration Guide — Orchid Quest Asset Refresh

Step-by-step instructions for the developer on integrating the designer's pixel-art assets into the actual **Orchid Quest** code (JS + HTML5 Canvas, no engine).

**Core principle:** the designer ships PNG files strictly per the naming convention in `docs/designer-asset-brief.md`. Your job is to **wire them in, not rename them**. Anything that doesn't match the naming spec is a designer bug, not a developer task.

**Cross-documents:**
- `docs/designer-asset-brief.md` — full spec for the designer's deliveries (palette, sizes, naming).
- `docs/asset-style-audit.md` — inventory of legacy assets (what we're replacing).
- `docs/road-kit-brief.md` — separate brief for the road kit (already integrated).

---

## 0. What the designer ships

The designer ships a zip with the following structure (see `designer-asset-brief.md § 9.1`):

```
orchid_quest_assets_v3_<batch>.zip
├── README.md
├── MANIFEST.json              ← full file list for this batch + sizes
├── assets/                    ← drop-in ready for the project
│   ├── player/farmer_run/, farmer_crouch/, farmer_jump/, farmer_hit/, farmer_idle/
│   ├── collectibles/orchid_gold/, life_heart.png, sprout.png
│   ├── obstacles/vine_barrier/, dry_grass/, mushroom_small/, planter_pot/, overhangs/
│   ├── structures/question_block/, stone_brick/, platforms/, greenhouse/
│   ├── decor/small/, decor/large/
│   ├── terrain/road/kit/, terrain/blocks/
│   ├── background/sky/, clouds/, mountains/, greenhouse/, midground/
│   ├── ui/buttons/, icons/, panels/, tools/
│   └── effects/dust_puff/, jump_dust/, collect_burst/, sparkle/, speed_line/, hit_flash/, lane_swoosh/
├── _source/                   ← do NOT copy into the project (Aseprite sources)
└── _previews/                 ← do NOT copy (cohesion test screenshots)
```

---

## 1. Architecture — where each asset plugs in

### 1.1. Responsibility map (which renderer owns which asset)

```
┌──────────────────────────────────────────────────────────────────┐
│  src/render/renderers/                                            │
├──────────────────────────────────────────────────────────────────┤
│  SkyRenderer.js          ← sky_gradient, clouds                  │
│  BackgroundRenderer.js   ← mountains_far/mid/near, midground     │
│  LandmarksRenderer.js    ← greenhouse_far/near (was castle)      │
│  RoadRenderer.js         ← terrain/road/kit/* (14 files)         │
│  SceneryRenderer.js      ← decor/small, decor/large, terrain/blocks│
│  GameplayRenderer.js     ← obstacles, collectibles, structures   │
│  PlayerRenderer.js       ← player/farmer_*                       │
│  EffectsRenderer.js      ← effects/* + particles + popups        │
└──────────────────────────────────────────────────────────────────┘

src/systems/HudSystem.js          ← ui/buttons, icons, panels, tools
src/core/AssetManager.js          ← loads every asset (Image loader)
src/config/gameConfig.js          ← key → path registration
src/config/sceneSchema.data.js    ← midground terrace compositions
src/ecs/factories.js              ← creates ECS entities with the correct assetType
src/render/renderers/scenery/
  sceneryDispatch.js              ← assetType → draw function router
```

### 1.2. Data flow on load

```
1. main.js
   └─→ new AssetManager()
       └─→ assets.loadAll(GAME_CONFIG.assets)  ← Promise.all(new Image())
            every key from gameConfig becomes a key in the asset Map.

2. Every renderer receives AssetManager via the constructor:
   const r = new SceneryRenderer({ ctx, projection, assets, sprites, paint, gradients });

3. During rendering:
   const img = assets.get('playerFarmerRun01');  ← returns HTMLImageElement or null

4. If img == null → silent skip (nothing drawn at that slot).
   This is INTENTIONAL: see PlayerRenderer.js around line 102 — fallback to _01,
   and if even that's missing — return.
```

### 1.3. Perspective scaling (IMPORTANT)

```js
// src/world/Projection.js — single source of truth for scale
const { sx, sy, scale } = projection.project(lane, distance);
// scale ∈ [0.10, 1.0]: 1.0 in the foreground (distance=0), ~0.10 at the horizon (distance=200+)

// SceneryRenderer.js:62-65
const scale = p.scale * (item.scale ?? 1) * layerBoost;
const y = p.sy + (item.yOffset ?? 0) * scale;
this.#drawSceneryType(item.assetType, p.sx, y, scale, item.variant, alpha);
```

**Rule:** ALL side decor, obstacles, collectibles, and hazards are drawn from ONE foreground-quality sprite, and the engine auto-shrinks them through `scale`. The designer does NOT ship LOD variants for these.

**Exceptions** (LOD variants required):
- `mountains_far/mid/near.png` — background mountains, never approach the camera
- `greenhouse_far/near.png` — distant greenhouse
- `terrain/road/kit/road_foreground_*/mid_*/far_*.png` — tiled road (3 depth zones already implemented in `RoadRenderer.#imageKitGrid`)
- `cloud_small/medium/large.png` — different sizes for composition variety, picked at random

---

## 2. Integration — step by step

### 2.1. STEP 1: Unzip the archive

```bash
# From project root
unzip orchid_quest_assets_v3_P0.zip -d _delivery_v3_P0/

# Verify the MANIFEST
cat _delivery_v3_P0/MANIFEST.json | jq '.delivered | length'

# Merge assets/ into the project (do NOT overwrite blindly, do NOT delete old files until wired!)
rsync -av _delivery_v3_P0/assets/ assets/
```

**IMPORTANT:** do not delete legacy PNGs until the new set is wired and tested. Old + new co-exist during this stage.

### 2.2. STEP 2: Cross-check MANIFEST against what was actually unpacked

Write a tiny verifier script (e.g. `scripts/verify_delivery.mjs`):

```js
import fs from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await fs.readFile('./MANIFEST.json', 'utf8'));
const missing = [];
const wrongSize = [];

for (const entry of manifest.delivered) {
  try {
    const stat = await fs.stat(entry.path);
    // (optional) check size via sharp/probe-image-size
  } catch {
    missing.push(entry.path);
  }
}
console.log('Missing:', missing);
console.log('Wrong size:', wrongSize);
```

If something is missing, that's a designer bug — request a re-delivery.

### 2.3. STEP 3: Register new assets in gameConfig

File: `src/config/gameConfig.js` → `GAME_CONFIG.assets`.

**Key naming convention:** camelCase. The designer ships `player_farmer_jump_01.png` — the key becomes `playerFarmerJump01`.

**Example for NEW assets:**

```js
// src/config/gameConfig.js
assets: {
  // ... existing keys ...

  // ── NEW: Player jump (6 frames) ────────────────────────────────────────
  playerFarmerJump01: './assets/player/farmer_jump/player_farmer_jump_01.png',
  playerFarmerJump02: './assets/player/farmer_jump/player_farmer_jump_02.png',
  playerFarmerJump03: './assets/player/farmer_jump/player_farmer_jump_03.png',
  playerFarmerJump04: './assets/player/farmer_jump/player_farmer_jump_04.png',
  playerFarmerJump05: './assets/player/farmer_jump/player_farmer_jump_05.png',
  playerFarmerJump06: './assets/player/farmer_jump/player_farmer_jump_06.png',

  // ── NEW: Player hit (4 frames) ─────────────────────────────────────────
  playerFarmerHit01: './assets/player/farmer_hit/player_farmer_hit_01.png',
  playerFarmerHit02: './assets/player/farmer_hit/player_farmer_hit_02.png',
  playerFarmerHit03: './assets/player/farmer_hit/player_farmer_hit_03.png',
  playerFarmerHit04: './assets/player/farmer_hit/player_farmer_hit_04.png',

  // ── NEW: Player idle (4 frames, for menu/pause) ────────────────────────
  playerFarmerIdle01: './assets/player/farmer_idle/player_farmer_idle_01.png',
  playerFarmerIdle02: './assets/player/farmer_idle/player_farmer_idle_02.png',
  playerFarmerIdle03: './assets/player/farmer_idle/player_farmer_idle_03.png',
  playerFarmerIdle04: './assets/player/farmer_idle/player_farmer_idle_04.png',

  // ── NEW: Collectible orchid + halo + sparkle + collect-burst ───────────
  orchidGoldMain:       './assets/collectibles/orchid_gold/orchid_gold_main.png',
  orchidGoldHalo:       './assets/collectibles/orchid_gold/orchid_gold_halo.png',
  orchidGoldSparkle01:  './assets/collectibles/orchid_gold/orchid_gold_sparkle_01.png',
  orchidGoldSparkle02:  './assets/collectibles/orchid_gold/orchid_gold_sparkle_02.png',
  orchidGoldSparkle03:  './assets/collectibles/orchid_gold/orchid_gold_sparkle_03.png',
  orchidGoldSparkle04:  './assets/collectibles/orchid_gold/orchid_gold_sparkle_04.png',
  orchidGoldCollect01:  './assets/collectibles/orchid_gold/orchid_gold_collect_01.png',
  // ... orchidGoldCollect02 ... 08

  // ── NEW: Vine barrier (animated 4 frames + single-lane version) ────────
  vineBarrier01:        './assets/obstacles/vine_barrier/vine_barrier_01.png',
  vineBarrier02:        './assets/obstacles/vine_barrier/vine_barrier_02.png',
  vineBarrier03:        './assets/obstacles/vine_barrier/vine_barrier_03.png',
  vineBarrier04:        './assets/obstacles/vine_barrier/vine_barrier_04.png',
  vineBarrierSingle01:  './assets/obstacles/vine_barrier/vine_barrier_single_01.png',
  // ... etc

  // ── NEW: Planter pot (replaces pipe_green) ─────────────────────────────
  planterPot:           './assets/obstacles/planter_pot/planter_pot.png',

  // ── NEW: Question block (animated 4 frames) ────────────────────────────
  questionBlockAnim01:  './assets/structures/question_block/question_block_01.png',
  questionBlockAnim02:  './assets/structures/question_block/question_block_02.png',
  questionBlockAnim03:  './assets/structures/question_block/question_block_03.png',
  questionBlockAnim04:  './assets/structures/question_block/question_block_04.png',

  // ── NEW: Stone brick (replaces purple_brick_*) ─────────────────────────
  stoneBrickSingle:     './assets/structures/stone_brick/stone_brick_single.png',
  stoneWallLow:         './assets/structures/stone_brick/stone_wall_low.png',
  stoneWallStairs:      './assets/structures/stone_brick/stone_wall_stairs.png',
  platformFloating:     './assets/structures/platforms/platform_floating.png',
  platformHangingVines: './assets/structures/platforms/platform_hanging_vines.png',

  // ── NEW: Greenhouse (replaces castle) ──────────────────────────────────
  greenhouseFar:        './assets/background/greenhouse/greenhouse_far.png',
  greenhouseNear:       './assets/background/greenhouse/greenhouse_near.png',

  // ── NEW: Effects (BRAND-NEW category) ──────────────────────────────────
  dustPuff01:           './assets/effects/dust_puff/dust_puff_01.png',
  dustPuff02:           './assets/effects/dust_puff/dust_puff_02.png',
  dustPuff03:           './assets/effects/dust_puff/dust_puff_03.png',
  dustPuff04:           './assets/effects/dust_puff/dust_puff_04.png',
  jumpDust01:           './assets/effects/jump_dust/jump_dust_01.png',
  // ... jumpDust02..04
  sparkle01:            './assets/effects/sparkle/sparkle_01.png',
  // ... sparkle02..04
  speedLine:            './assets/effects/speed_line/speed_line.png',
  hitFlash01:           './assets/effects/hit_flash/hit_flash_01.png',
  // ... hitFlash02..04
  laneSwoosh01:         './assets/effects/lane_swoosh/lane_swoosh_01.png',
  // ... laneSwoosh02..04

  // ── NEW: stylistically redrawn but same path (no rename) ───────────────
  // These simply overwrite the old files — no need to change keys.
  // collectibleFlower, lifeHeart, sprout, mushroom*, tree*, fence*, bush*,
  // grass_tuft*, etc. — paths stay the same, content is refreshed.

  // ── NEW HUD/UI sets ────────────────────────────────────────────────────
  hudPanelScore:        './assets/ui/panels/hud_panel_score.png',
  hudPanelLives:        './assets/ui/panels/hud_panel_lives.png',
  hudPanelTool:         './assets/ui/panels/hud_panel_tool.png',
  hudPanelLong:         './assets/ui/panels/hud_panel_long.png',
  panelGameOver:        './assets/ui/panels/panel_game_over.png',
  iconOrchidCurrency:   './assets/ui/icons/icon_orchid_currency.png',
  iconComboX2:          './assets/ui/icons/icon_combo_x2.png',
  iconComboX3:          './assets/ui/icons/icon_combo_x3.png',
  iconComboX5:          './assets/ui/icons/icon_combo_x5.png',
  buttonRetry:          './assets/ui/buttons/button_retry.png',
  buttonMenuBack:       './assets/ui/buttons/button_menu_back.png',
},
```

### 2.4. STEP 4: Delete legacy assets (after wiring + testing)

Once the new set is wired and the game renders correctly — delete:

```js
// DELETE from gameConfig.assets:
pipeGreen: './assets/blocks/pipe-green.png',          // ❌ Mario pipe — replaced by planterPot
pipeGreenSprite: './assets/structures/pipe/green_pipe.png',  // ❌

brickPurpleSingle: './assets/blocks/brick-purple-single.png',     // ❌ replaced by stoneBrickSingle
brickPurplePlatform3: './assets/blocks/brick-purple-platform-3.png', // ❌ replaced by platformFloating

purpleBrick01: './assets/structures/bricks/purple_brick_01.png',  // ❌
purplePlatformRow04: './assets/structures/platforms/purple_platform_row_04.png', // ❌
purpleWallLow: './assets/structures/walls/purple_wall_low.png',   // ❌
purpleWallStairs: './assets/structures/walls/purple_wall_stairs.png', // ❌

backgroundCastle: './assets/background/castle-distant.png',       // ❌ replaced by greenhouseFar
backgroundCastleFar: './assets/background/castle/castle_far.png', // ❌ replaced by greenhouseNear
```

And delete the files themselves:
```bash
rm -rf assets/blocks/pipe-green.png \
       assets/structures/pipe/ \
       assets/blocks/brick-purple-*.png \
       assets/structures/bricks/ \
       assets/structures/walls/ \
       assets/structures/platforms/purple_*.png \
       assets/background/castle*.png \
       assets/background/castle/
```

**Optional:** the legacy `assets/environment/` folder (legacy duplicates) should also be cleaned, but that's a separate task — see `asset-style-audit.md § 6 Environment legacy duplicates`.

### 2.5. STEP 5: Update the ECS / sprite dispatcher

#### 2.5.1. assetType enum

File: `src/config/sceneSchema.js` → `ASSET_TYPES`. You need to:
- Remove type `'pipe'` (if present).
- Add new type `'planter_pot'`.
- Replace `'purple_brick'` / `'purple_wall'` with `'stone_brick'` / `'stone_wall'`.
- Add `'greenhouse'` (for the landmark renderer).

#### 2.5.2. sceneryDispatch.js

File: `src/render/renderers/scenery/sceneryDispatch.js`. This is the `assetType → draw function` router. For each new assetType, register a draw function that:

1. Receives `(sx, sy, scale)` coordinates from Projection.
2. Receives `alpha`, `mirrored`, `variant` (options).
3. Calls `sprites.draw(key, sx, sy, targetWidth, anchor)`.

**Example (new planter_pot):**
```js
// src/render/renderers/scenery/draws/planterPot.js
export function drawPlanterPot(ctx, sprites, sx, sy, scale, _variant, alpha, mirrored) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (mirrored) {
    ctx.translate(sx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-sx, 0);
  }
  // Base world-width (px) at scale=1
  const targetWidth = 64 * scale;
  sprites.draw('planterPot', sx, sy, targetWidth, 'bottom');
  ctx.restore();
}

// Register in sceneryDispatch.js:
import { drawPlanterPot } from './draws/planterPot.js';
const REGISTRY = {
  // ...
  planter_pot: drawPlanterPot,
};
```

**Anchor rule:** `'bottom'` for anything that stands on the ground. `'center'` for floating collectibles. Overhang obstacles render with `sy + height` to pin to the top (see existing `low_branch_overhang` code).

#### 2.5.3. Player animation state (new jump/hit/idle)

File: `src/render/renderers/PlayerRenderer.js`. Currently only run and crouch are rendered (lines 96-101). Extend:

```js
// PlayerRenderer.js — choose animation based on player state:
const vert = player.components.VerticalState;
const health = player.components.Health;
const state = world.gameState;  // or equivalent source of truth

let anim, frameCount, prefix;
if (state === 'idle' || state === 'menu') {
  anim = 'idle'; frameCount = 4; prefix = 'playerFarmerIdle';
} else if (health.hitFrames > 0) {
  anim = 'hit'; frameCount = 4; prefix = 'playerFarmerHit';
} else if (vert.isJumping) {
  anim = 'jump'; frameCount = 6; prefix = 'playerFarmerJump';
} else if (crouching) {
  anim = 'crouch'; frameCount = 4; prefix = 'playerFarmerCrouch';
} else {
  anim = 'run'; frameCount = 8; prefix = 'playerFarmerRun';
}

// Frame-rate differs between one-shots vs cycles:
let frameIndex;
if (anim === 'hit' || anim === 'jump') {
  // Hit/jump — non-cyclic, count from start via health.hitFrames / vert.jumpFrames
  const elapsed = anim === 'hit' ? (40 - health.hitFrames) : vert.jumpFrames;
  frameIndex = Math.min(frameCount - 1, Math.floor(elapsed / 6));
} else {
  // Run/crouch/idle — cycles (as before)
  frameIndex = Math.floor(Math.abs(anim.runFrame) / 3.15) % frameCount;
}

const runKey = `${prefix}${String(frameIndex + 1).padStart(2, '0')}`;
```

**WARNING:** do not touch the motion trail `#drawTrail` — it's wired only to run/crouch on purpose (the trail only shows during speed-burst, which is active while running).

### 2.6. STEP 6: Background — greenhouse as the new landmark

File: `src/render/renderers/LandmarksRenderer.js` (or `BackgroundRenderer.js` if the landmark renders there).

Old keys `backgroundCastle` / `backgroundCastleFar` → new `greenhouseNear` / `greenhouseFar`.

If there are direct string mentions in code, replace them all. Quick check:
```bash
grep -rn "Castle\|castle" src/ --include="*.js"
```

And in `sceneSchema.data.js` — if any item has `assetType: 'castle'`, replace it with `'greenhouse'` and update the dispatcher.

### 2.7. STEP 7: Mountains — pick LOD by parallax layer

The current code in `BackgroundRenderer.js` already uses different keys `backgroundMountainsFar / Mid / Near`. **Nothing to change**, beyond the designer redrawing the PNGs.

If the parallax speeds aren't separated per layer, check `src/render/constants.js → PARALLAX`:

```js
// Typical coefficients (if missing):
PARALLAX = {
  SKY:              0.00,
  MOUNTAINS_FAR:    0.05,
  MOUNTAINS_MID:    0.10,
  MOUNTAINS_NEAR:   0.18,
  GREENHOUSE:       0.25,
  MIDGROUND_HILLS:  0.40,
  FOREGROUND:       1.00,
};
```

### 2.8. STEP 8: Effects — move from procedural particles to sprite-based

**Current state** (`EffectsRenderer.js:42-50`):
```js
for (let i = 0; i < particles.length; i += 1) {
  const p = particles[i];
  ctx.fillStyle = p.color;
  ctx.globalAlpha = Math.min(1, p.life / 22);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);  // ← procedural circle
  ctx.fill();
}
```

**Target state** (after designer delivery):
```js
for (let i = 0; i < particles.length; i += 1) {
  const p = particles[i];
  const ageT = 1 - (p.life / p.maxLife);   // 0 → 1
  const frameIdx = Math.min(3, Math.floor(ageT * 4));
  const key = p.spriteKey  // e.g. 'dustPuff' or 'sparkle' or 'jumpDust'
    ? `${p.spriteKey}0${frameIdx + 1}`
    : null;
  const img = key ? this.assets.get(key) : null;
  ctx.globalAlpha = Math.min(1, p.life / 22);
  if (img?.naturalWidth) {
    const w = (p.radius * 2);
    const h = w * (img.naturalHeight / img.naturalWidth);
    ctx.drawImage(img, p.x - w / 2, p.y - h / 2, w, h);
  } else {
    // Fallback: legacy procedural circle
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**Extend `ParticleSystem`:** when spawning, pass a `spriteKey`:
```js
// src/systems/ParticleSystem.js
spawnDustPuff(x, y) {
  this.spawn({ x, y, vx: 0, vy: -0.5, life: 22, maxLife: 22, radius: 8, color: '#e8d8b0', spriteKey: 'dustPuff' });
}
spawnSparkle(x, y) {
  this.spawn({ x, y, vx: rng.range(-1, 1), vy: rng.range(-1.5, -0.3), life: 18, maxLife: 18, radius: 6, color: '#ffe8a8', spriteKey: 'sparkle' });
}
spawnJumpDust(x, y) {
  for (let i = 0; i < 6; i++) {
    this.spawn({ x, y, vx: rng.range(-3, 3), vy: -1, life: 18, maxLife: 18, radius: 10, color: '#d8c8a0', spriteKey: 'jumpDust' });
  }
}
```

### 2.9. STEP 9: Hit flash — full-screen overlay

One designer asset is `hit_flash_01.png ... _04.png` (full-screen red overlay). Integration in `EffectsRenderer`:

```js
// EffectsRenderer.js — at the very end of render(), after particles
if (world.hitFlash.active) {
  const frameIdx = Math.min(3, Math.floor((1 - world.hitFlash.t) * 4));
  const key = `hitFlash0${frameIdx + 1}`;
  const img = this.assets.get(key);
  if (img?.naturalWidth) {
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0, this.projection.width, this.projection.height);
  }
}
```

The `world.hitFlash = { active: false, t: 0 }` state is updated in `CollisionSystem`:
```js
// CollisionSystem.js — after registering a hit
world.hitFlash.active = true;
world.hitFlash.t = 1;  // decays to 0 over ~260 ms
// Decrement t in GameStateSystem each frame
```

### 2.10. STEP 10: HUD — wooden plank panels

File: `src/systems/HudSystem.js`. The HUD currently renders via Canvas-2D procedural rectangles (`ctx.fillRect`). Switch to sprite PNGs:

```js
// HudSystem.js
renderScorePanel(ctx, x, y) {
  const img = this.assets.get('hudPanelScore');
  if (img?.naturalWidth) {
    ctx.drawImage(img, x, y);
  }
  // The orchid icon + digits render ON TOP of the panel
  const icon = this.assets.get('iconOrchidCurrency');
  if (icon?.naturalWidth) {
    ctx.drawImage(icon, x + 12, y + 8);
  }
  this.drawScoreText(ctx, x + 72, y + 32, this.world.score);
}
```

Same pattern for `hudPanelLives` + 4 × `iconHeartFull/Empty`, `hudPanelTool` + `toolShovelFull` + 5 × `iconEnergyFull/Empty`.

**Font:** the brief specifies "pixel bitmap font". Wire up `Press Start 2P` or `VT323` via Google Fonts:
```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```
```css
/* style.css */
.hud-text { font-family: 'Press Start 2P', system-ui, sans-serif; }
```

And in HudSystem: `ctx.font = '20px "Press Start 2P", system-ui'`.

---

## 3. Removing the Mario pipe — checklist

Full action list for removing the green pipe:

1. **Delete files:**
   ```bash
   rm assets/blocks/pipe-green.png
   rm -rf assets/structures/pipe/
   ```

2. **Remove keys from gameConfig:**
   ```js
   // src/config/gameConfig.js — delete:
   pipeGreen: './assets/blocks/pipe-green.png',
   pipeGreenSprite: './assets/structures/pipe/green_pipe.png',
   ```

3. **Remove from ASSET_TYPES:**
   ```js
   // src/config/sceneSchema.js — drop 'pipe' from the enum
   ```

4. **Find every code mention:**
   ```bash
   grep -rn "pipe\|Pipe\|pipeGreen" src/ --include="*.js"
   ```
   Delete every draw function and dispatcher case you find.

5. **Replace with planter_pot in spawn:**
   File: `src/systems/SpawnSystem.js`. If an obstacle of type `'pipe'` is spawned anywhere — replace with `'planter_pot'`.

6. **Check sceneSchema.data.js:**
   If `MIDGROUND_SCENERY` or `FOREGROUND_FRAME_SCENERY` contains `assetType: 'pipe'` or `'pipe_green'` — replace with `'planter_pot'`.

7. **Run the game for 5 minutes.** If no pipe ever appears and no console warnings — done.

---

## 4. Castle → greenhouse — checklist

1. **Swap assets:**
   ```bash
   # New greenhouse PNGs are already in assets/background/greenhouse/
   # Delete the legacy castle PNGs:
   rm -rf assets/background/castle/
   rm assets/background/castle-distant.png
   ```

2. **gameConfig:**
   ```js
   // Delete:
   backgroundCastle: './assets/background/castle-distant.png',
   backgroundCastleFar: './assets/background/castle/castle_far.png',
   // Add:
   greenhouseFar: './assets/background/greenhouse/greenhouse_far.png',
   greenhouseNear: './assets/background/greenhouse/greenhouse_near.png',
   ```

3. **Replace every mention:**
   ```bash
   grep -rn "Castle\|castle" src/ --include="*.js"
   ```
   Wherever you see `backgroundCastle` → `greenhouseNear`. Wherever `backgroundCastleFar` → `greenhouseFar`.

4. **assetType:** in `sceneSchema.js`, replace `'castle'` with `'greenhouse'` (or keep — but then update the dispatcher to the new keys).

---

## 5. Performance — what must not break

### 5.1. Already correct
✅ `imageSmoothingEnabled = false` is set once per frame in `RenderSystem.render()` (line 107). Do not flip it back to `true` anywhere. Do not save/restore around every sprite.

✅ `pixelRatio: 1` in `GAME_CONFIG.canvas` (for mobile). HiDPI opts in via `?hidpi=1` query param.

✅ Particles — pool-backed `world.particleSystem.particles`, allocation-free (see `ParticleSystem.js`).

✅ Renderers reuse `_structural` / `_organic` arrays across frames (see `SceneryRenderer.js:33-36`).

### 5.2. Things to watch when wiring new assets

**PNG size.** The designer must run everything through `oxipng`. Files larger than 10 KB for a 64×96 sprite mean an embedded color profile / suboptimal lossless compression. File a bug.

**Spawned particle count.** When wiring up dust_puff / sparkle, monitor the active particle count. Target ceiling — **30 simultaneous** on mobile, 80 on desktop. If new effects burst past 30, throttle the spawn rate in `ParticleSystem.spawnDustPuff`.

**Do not load assets lazily.** `AssetManager.loadAll` is the only valid path. Do not do `new Image()` inside render code. It will tank FPS and trash the browser cache.

**Smoothing for effects.** Hit_flash, halo, sun_glow — the only assets with an alpha gradient. They can look better with `imageSmoothingEnabled = true`. BUT enable just before the draw and flip it back:
```js
ctx.imageSmoothingEnabled = true;
ctx.drawImage(haloImg, ...);
ctx.imageSmoothingEnabled = false;
```

### 5.3. Profiling after integration

Use the existing `PerformanceHUD.js`:
1. In dev mode `?debug=1` it shows frametime + memory.
2. After delivery, confirm frametime hasn't crossed 16.6 ms (60 fps threshold).
3. If it has — dig into EffectsRenderer (the most likely regression zone from new effects).

---

## 6. Hot-reload and test plan

### 6.1. Dev build startup

If you don't see a build `package.json`, use any of these:
```bash
npx vite     # or whatever your command is
# or
python3 -m http.server 8000  # simplest option for plain JS
```

Open `dev.html` (in repo root) — that's your debug page with the extended HUD.

### 6.2. Debug keys (already working)
- **T** — cycles roadStyle `procedural` → `tiles` → `kit`. The `kit` style is where you see the new road tiles.
- **P** — pause (needed to verify `playerFarmerIdle` on pause).
- **D** — debug HUD overlay (FPS, entity counts).

If you need new toggles for testing effects, add them in `main.js → keydown handler`:
```js
if (e.key === 'h') world.hitFlash.active = true;  // force hit flash
if (e.key === 'b') world.spawnCollectBurst();     // force collect-burst
```

### 6.3. Cohesion test (re-run the designer's test in the live engine)

After full integration — run these scenarios:

1. **Standard run.** 60 seconds of play. On the FPS graph (PerformanceHUD), no dips below 55 fps.
2. **Hit + recovery.** Intentionally crash into something → must:
   - Play `playerFarmerHit` 4 frames.
   - Flash `hitFlash` 4 frames.
   - Trigger camera shake.
   - Start invulnerability blink.
3. **Jump arc.** Jump → must:
   - Play 6 frames of `playerFarmerJump` (non-linear holds, see designer-brief § 6.3).
   - Spawn `jumpDust` particles on takeoff and landing.
4. **Lane change.** Switch lanes → `laneSwoosh` overlay must flash.
5. **Collectible pickup.** Pick up an orchid → must:
   - Play `orchidGoldCollect` 8-frame burst.
   - Spawn 6 `sparkle` particles.
   - Pop a `+10` score popup that floats up and fades.
6. **Game over screen.** Let the player die → must:
   - Show `panelGameOver` with `buttonRetry` + `buttonMenuBack`.
   - Loop `playerFarmerIdle` in the character preview on the panel.

If any item fails — that's your integration bug, not the designer's.

### 6.4. Road kit cohesion test (already working, verify)

In `dev.html`, or after pressing T twice:
- Foreground zone (near the bottom edge) — must have detailed grass.
- Mid zone — less detail.
- Far zone (near the horizon) — thin grass strip.
- Shoulder tile must **blend organically** with the lane tile without a visible seam.
- Edge patches (flower / grass / dark) appear rarely (~1-2 % of tiles).

If a seam is visible — that's a designer bug, not a developer task.

---

## 7. Acceptance checklist (final)

Before merging to main:

### Assets
- [ ] All P0 assets are wired into `gameConfig.assets`
- [ ] Manifest.json matches what's actually on disk
- [ ] Legacy removed: `pipe_green*`, `purple_brick_*`, `castle_*`
- [ ] Legacy `assets/environment/` folder cleaned (if part of this batch's plan)
- [ ] `oxipng -V` run over all new PNGs (optional, can be automated in CI)

### Code
- [ ] All renderers compile with no console.warn (assets loaded)
- [ ] PlayerRenderer handles run / crouch / jump / hit / idle
- [ ] EffectsRenderer migrated to sprite-based particles
- [ ] HudSystem renders wooden plank panels instead of procedural fillRect
- [ ] sceneryDispatch covers every new assetType
- [ ] No hard-coded string `'pipe'` / `'castle'` / `'purple'` anywhere in code

### Gameplay tests
- [ ] FPS ≥ 58 on iPhone 11 / mid Android (5-min test)
- [ ] FPS ≥ 60 on desktop Chrome / Safari
- [ ] Hit + flash + shake synchronise (260 ms total)
- [ ] Jump 6-frame plays correctly (takeoff → apex → landing)
- [ ] Collectible pickup spawns sparkle + collect-burst + score popup
- [ ] Game over modal renders every UI element
- [ ] Road kit has no visible tile seams

### Visual
- [ ] Player silhouette CLEARLY pops out of the background (terracotta apron does the lifting)
- [ ] Collectible orchid visually differs from decor yellow_flower
- [ ] Obstacles have a warning accent, read as "dangerous"
- [ ] Mountains far / mid / near read as 3 LODs of the same range
- [ ] Distant greenhouse looks part of the scene, not a pasted sticker
- [ ] HUD palette is wooden-plank, not a jittery dark overlay

### Regression
- [ ] Pause / unpause works
- [ ] Speed-burst / split-clones power-ups render
- [ ] Leaderboard / best score persist via localStorage
- [ ] Touch controls on mobile still work (TouchControls.js intact)
- [ ] Gamepad navigation still works (GamepadDebugOverlay.js)

---

## 8. If something doesn't work

### 8.1. "Asset loads but doesn't render"

```js
// Check in DevTools console:
window.__game.assets.get('orchidGoldMain')   // must return HTMLImageElement
window.__game.assets.isReady('orchidGoldMain') // true
```

If `null` → check the path in `gameConfig.assets`.
If `HTMLImageElement` but `naturalWidth === 0` → broken PNG, ask the designer to re-ship.

### 8.2. "Sprite renders but in the wrong place"

99 % of cases — wrong `anchor`. The designer specified bottom-center, but `SpriteRenderer.draw` is called with `anchor='center'`. Check the dispatcher (`sceneryDispatch.js`).

### 8.3. "Sprite flickers / jumps"

That's perspective scaling onto non-integer pixels. Fix — round to int in `SpriteRenderer.draw`:
```js
this.ctx.drawImage(image, Math.round(x), Math.round(y), Math.round(targetWidth), Math.round(height));
```
But careful: this can introduce other visual glitches (floating objects start "jumping" by 1 px). Test after the change.

### 8.4. "FPS dropped after wiring up effects"

Most likely — particle pool overflow or an asset with a large alpha layer (`hit_flash` at 1536×864 is ~6 MB in RAM per frame × 4 frames = 24 MB just for hit-flash). Fixes:
- Shrink `hit_flash` PNG to 64×36 — engine stretches it to full screen.
- Drop `dustPuff` spawn rate (every 3 frames instead of every frame).
- Verify there's no particle leak (life always reaches 0).

### 8.5. "Designer shipped a PNG in the wrong size"

Don't try to scale-fix in code — request a re-delivery. Sizes in the brief are tuned for perspective scaling and pixel grid alignment. Code-side scale fixes lead to blurry edges.

---

## TL;DR for the developer

1. **Unzip the zip → assets/.**
2. **Register new keys in `gameConfig.assets`** (camelCase from snake_case filenames).
3. **Extend PlayerRenderer** to 5 anim states (run/crouch/jump/hit/idle) instead of 2.
4. **Rewrite EffectsRenderer** from procedural arcs to sprite-based.
5. **Migrate HudSystem** to the new wooden plank panels.
6. **Delete Mario pipe + purple bricks + castle** from both assets AND code.
7. **Do not touch Projection / scale** — it handles perspective on its own.
8. **Run cohesion test (§ 6.3)** before merging.

The designer shipped PNGs. You ship the engine. **Don't rename files, don't resize them — those are designer bugs.** Any asset modification on the code side is tech debt.
