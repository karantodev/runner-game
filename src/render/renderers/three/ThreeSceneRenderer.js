import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { RoomEnvironment } from '../../../../node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RENDERER_STRATEGY } from '../../RendererContract.js';
import { ThreeInstancedPool } from './ThreeInstancedPool.js';
import { LANE_BANDS } from '../../../config/sceneSchema.js';

const ASSET_ROOT = './assets/';
const ASSETS = {
  sky: 'background/sky/sky_gradient.png',
  mountainsFar: 'background/mountains/mountains_far.png',
  mountainsMid: 'background/mountains/mountains_mid.png',
  mountainsNear: 'background/mountains/mountains-near.png',
  forest: 'background/landscape/forest-treeline.png',
  castle: 'background/castle/castle_far.png',
  cloudLarge: 'background/clouds/cloud_large.png',
  cloudMedium: 'background/clouds/cloud_medium.png',
  cloudSmall: 'background/clouds/cloud_small.png',
  goldFlower: 'collectibles/flower-golden-orchid.png',
  orchidGold: 'collectibles/orchid_gold/orchid_gold_main.png',
  heart: 'collectibles/life-heart.png',
  grassBlockLeft: 'terrain/blocks/grass_dirt_block_left.png',
  grassBlockRight: 'terrain/blocks/grass_dirt_block_right.png',
  grassBlock: 'terrain/blocks/grass_dirt_block_01.png',
  grassPlatform: 'terrain/blocks/grass_dirt_platform_long.png',
  purpleWall: 'structures/stone_brick/purple_brick_block_iso_01.png',
  purpleBrick: 'structures/stone_brick/purple_brick_single.png',
  purpleStairs: 'structures/stone_brick/purple_brick_stairs_01.png',
  questionBlock: 'structures/question_block/question_block.png',
  pipe: 'structures/pipe/green_pipe.png',
  mushroom: 'decor_large/mushrooms/mushroom_red_big.png',
  tree: 'decor_large/trees/tree_round.png',
  bush: 'decor_large/bushes/bush_large_with_purple_flowers.png',
  fence: 'decor_large/fence/fence_wood_short.png',
  flowersPurple: 'decor_small/flowers/purple_flower_cluster.png',
  flowersYellow: 'decor_small/flowers/yellow_flower_small.png',
  vineBarrier: 'obstacles/vines/vine_barrier_full.png',
  dryGrass: 'obstacles/dry_grass/dry_grass_obstacle.png',
  spikyBush: 'blocks/bush-spiky.png',
  grassTuft: 'decor_small/grass/grass_tuft_large.png',
};

// Small-flora asset paths get multi-instanced carpet clusters (see #syncRegistryObjects);
// all other scenery stays at exactly one instance per ECS entity.
const FLORA_ASSETS = new Set([ASSETS.flowersPurple, ASSETS.flowersYellow]);

// --- Base Scale Hierarchy ----------------------------------------------------
// One metric for the whole scene: 1.0 "unit" = the farmer's on-ground height.
// FARMER_UNIT is that height in Three world-units; every prop is authored as a
// multiple of it so nothing fights for scale. The farmer sprite (#syncPlayer) is
// sized to exactly FARMER_UNIT tall, making it the literal reference object. Tuned so
// the hero fills ~⅓ of the frame height under the compressed FOV (T4) — raising it scales
// the whole hierarchy together, so proportions are preserved while the scene reads larger.
const FARMER_UNIT = 1.7;

// Per-prop [ heightMultiple (in FARMER_UNITs), aspect (width / height), blobGrey ].
// Heights follow the agreed hierarchy — tree ≫ pipe > farmer > block > mushroom; aspect
// preserves each sprite's silhouette so the pixel art is never stretched. blobGrey (#2) is
// the contact-shadow darkness: ~0.05 = dense/near-black (solid bases like pipes/blocks),
// ~0.3 = faint/neat (light props like mushrooms/flowers). Radius derives from width below.
const PROP_METRICS = new Map([
  [ASSETS.tree, [2.35, 0.78, 0.12]],
  [ASSETS.pipe, [1.25, 0.71, 0.06]],
  [ASSETS.mushroom, [0.42, 0.82, 0.28]],
  [ASSETS.fence, [0.60, 2.0, 0.18]],
  [ASSETS.bush, [0.55, 1.7, 0.14]],
  [ASSETS.grassBlock, [1.0, 1.15, 0.10]],
  [ASSETS.grassBlockLeft, [1.0, 1.15, 0.10]],
  [ASSETS.grassBlockRight, [1.0, 1.15, 0.10]],
  [ASSETS.grassPlatform, [0.7, 2.3, 0.12]],
  [ASSETS.purpleBrick, [0.55, 1.4, 0.10]],
  [ASSETS.purpleWall, [0.62, 1.5, 0.10]],
  [ASSETS.purpleStairs, [0.62, 1.55, 0.10]],
  [ASSETS.questionBlock, [0.62, 1.0, 0.18]],
  [ASSETS.flowersPurple, [0.34, 1.3, 0.30]],
  [ASSETS.flowersYellow, [0.30, 1.25, 0.30]],
  [ASSETS.dryGrass, [0.5, 1.2, 0.24]],
  [ASSETS.spikyBush, [0.5, 1.1, 0.20]],
  [ASSETS.grassTuft, [0.42, 1.25, 0.30]],
  [ASSETS.vineBarrier, [0.8, 2.4, 0.10]],
]);

// Props too small/flat to warrant a contact shadow (ground-hugging flora) — skipped in both
// the static set-pieces and the ECS pass so the two stay consistent.
const BLOB_SKIP = new Set([ASSETS.flowersPurple, ASSETS.flowersYellow, ASSETS.grassTuft]);

// Organic props that sway in the wind vertex shader (#2). Rigid structures (pipes, blocks,
// fences, mushrooms, the castle) stay perfectly still.
const WINDY_ASSETS = new Set([
  ASSETS.tree, ASSETS.bush, ASSETS.flowersPurple, ASSETS.flowersYellow,
  ASSETS.grassTuft, ASSETS.spikyBush,
]);

// Organic props that get per-instance scale/mirror/yaw noise (Organic Chaos T1) so identical
// assets read as unique. Structural pieces (pipes, blocks, ?-blocks, fences) stay aligned.
const ORGANIC_ASSETS = new Set([
  ASSETS.tree, ASSETS.bush, ASSETS.mushroom, ASSETS.flowersPurple, ASSETS.flowersYellow,
  ASSETS.grassTuft, ASSETS.spikyBush,
]);

// Deterministic pseudo-random in [0,1) from a seed — for render-side organic noise (scale,
// yaw, scatter). Stable every build and NEVER feeds the seeded ECS sim, so determinism holds.
function prand(seed) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

// Orthographic frustum half-height used by both #buildCameras (initial setup) and
// #updateCameraAspects (resize). A single source of truth prevents the two call
// sites from drifting apart. ~32 at the raised 2.5D vantage frames the playfield —
// road band + side decor + a mountain/sky horizon strip — without excess empty space.
const ORTHO_HEIGHT = 28;

// Perspective vertical FOV at the DESIGN aspect (16:9). DEEP telephoto (18°) — strong
// perspective compression so the castle/mountains read monumental + close and the edge
// skew on the fixed +Z props is minimised, with nothing billboard-rotating. The HORIZONTAL
// field derived from this is LOCKED across aspect ratios in #updateCameraAspects (T4) so a
// portrait viewport never zooms/distorts the track. Shared so #buildCameras can't drift.
const PERSPECTIVE_FOV = 18;

// Atmospheric haze tone — the colour distant geometry dissolves INTO. Shared by the
// exponential fog, the sky-gradient horizon stop and the horizon skirt so the dissolve is
// seamless (a pale blue-lavender that ties the blue sky to the scene's purple accents).
const HAZE_COLOR = 0xccd0e4;

function disposeMaterial(material) {
  if (!material) return;
  const list = Array.isArray(material) ? material : [material];
  for (const item of list) item?.dispose?.();
}

function disposeObject3D(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    disposeMaterial(object.material);
  });
}

/**
 * Paint a vertical three-stop gradient (bottom → mid → top) into a PlaneGeometry's
 * vertex colors by normalised local Y, so a single MeshBasicMaterial renders a full
 * sky→horizon→ground backdrop with no texture and one draw call. Needs ≥2 height
 * segments for the mid stop to appear; interpolation is linear between rows.
 */
function applyVerticalGradientColors(geometry, bottomHex, midHex, topHex) {
  const bottom = new THREE.Color(bottomHex);
  const mid = new THREE.Color(midHex);
  const top = new THREE.Color(topHex);
  const position = geometry.attributes.position;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = maxY - minY || 1;
  const colors = new Float32Array(position.count * 3);
  const scratch = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const t = (position.getY(i) - minY) / span; // 0 bottom → 1 top
    if (t < 0.5) scratch.copy(bottom).lerp(mid, t / 0.5);
    else scratch.copy(mid).lerp(top, (t - 0.5) / 0.5);
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Paint an axial gradient along local Z into a geometry's vertex colors (farHex at the
 * minimum Z / horizon end, nearHex at the maximum Z / camera end). Used to lift the flat
 * road off a single tone — a touch darker in the foreground, brighter toward the castle —
 * so the trackbed reads with depth at one material's cost.
 */
function applyDepthGradientColors(geometry, nearHex, farHex) {
  const near = new THREE.Color(nearHex);
  const far = new THREE.Color(farHex);
  const position = geometry.attributes.position;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const z = position.getZ(i);
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const span = maxZ - minZ || 1;
  const colors = new Float32Array(position.count * 3);
  const scratch = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const t = (position.getZ(i) - minZ) / span; // 0 at far (-Z) → 1 at near (+Z)
    scratch.copy(far).lerp(near, t);
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Atlas tile origins (lower-left UV corner) in the 2×2 block atlas built by #buildBlockAtlas.
// CanvasTexture flips Y, so a tile drawn in the canvas TOP row resolves to the high-V atlas
// half — the origins below already account for that. Each tile spans TILE_UV_SIZE per axis.
const TILE_UV_SIZE = 0.5;
const BLOCK_TILES = {
  grassTop: new THREE.Vector2(0.0, 0.5), // canvas top-left
  dirt: new THREE.Vector2(0.5, 0.5), // canvas top-right (green overhang lip on its high-V edge)
  brick: new THREE.Vector2(0.0, 0.0), // canvas bottom-left
  cracks: new THREE.Vector2(0.5, 0.0), // canvas bottom-right
};

// Retro pixelation (#3): point-sample the composited scene on a fixed low-res grid
// (≈480×270, square cells derived from aspect). Visually identical to rendering into a
// low-res WebGLRenderTarget and upscaling with NearestFilter, but as ONE pipeline-safe
// pass that leaves the SSAO/bloom/resize machinery untouched. uResolution = cell counts.
const PIXELATION_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(480, 270) },
    uLevels: { value: 16 }, // colour-quantisation steps/channel for the ordered dither (T3): 16 =
    // canonical Bayer visible on the sky/fog/shadow ramps while the meadow + foliage stay rich
    // (24 too quiet, 12 muddies the turf — bracketed visually).
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uLevels;
    varying vec2 vUv;

    // 2×2 Bayer base; the 4×4 matrix is the recursive doubling of it (4*super + inner) so the
    // ordered-dither threshold tiles seamlessly across the pixel grid. Returns [0, 15/16].
    float bayer2(vec2 a) {
      return mix(mix(0.0, 2.0, a.x), mix(3.0, 1.0, a.x), a.y);
    }
    float bayer4(vec2 p) {
      vec2 q = mod(p, 4.0);
      vec2 sup = mod(floor(q * 0.5), 2.0);
      vec2 inr = mod(q, 2.0);
      return (4.0 * bayer2(sup) + bayer2(inr)) / 16.0;
    }

    void main() {
      vec2 grid = floor(vUv * uResolution);   // pixel-cell index — one Bayer threshold per art pixel
      vec2 cell = (grid + 0.5) / uResolution; // snap to cell centre
      vec4 texel = texture2D(tDiffuse, cell);
      // Ordered dithering: nudge the posterise rounding by the Bayer threshold so smooth
      // shadow/fog ramps resolve into the canonical retro checkerboard, not a flat gradient.
      vec3 color = floor(texel.rgb * uLevels + bayer4(grid)) / uLevels;
      gl_FragColor = vec4(color, texel.a);
    }
  `,
};

/**
 * Future full-scene WebGL renderer strategy.
 *
 * It is deliberately not wired as the default renderer yet. The current game
 * still uses Canvas2D for production rendering, while this class provides the
 * lifecycle, cameras, lights, and ECS sync surface needed for an incremental
 * migration to a real Three.js scene.
 */
export class ThreeSceneRenderer {
  constructor(canvas, assets, projection, {
    pixelRatio = 1,
    mode = '3d',
    antialias = true,
    alpha = false,
  } = {}) {
    if (!canvas) throw new TypeError('ThreeSceneRenderer requires a canvas');
    this.kind = RENDERER_STRATEGY.threeScene;
    this.canvas = canvas;
    this.assets = assets;
    this.projection = projection;
    this.pixelRatio = Math.max(1, pixelRatio);
    this.mode = mode === '2.5d' ? '2.5d' : '3d';
    this.options = { antialias, alpha };
    this.renderer = null;
    this.scene = null;
    this.cameras = null;
    this.blockStyle = 'voxel';
    this.playerVoxelEnabled = true;
    this.roadStyle = 'three-scene';
    // Pulse handlers add to bloomPulse; the composer decays it each frame.
    this.effectsRenderer = {
      // Combo keeps a small, capped bloom swell; collection now spawns crisp gold spark
      // particles instead of the screen-wide bloom flash that used to blow out the player.
      triggerComboPulse: () => { this.bloomPulse = Math.min(this.bloomPulse + 0.1, 0.28); },
      triggerCollectFlash: () => { this.#spawnCollectSparks(); this.#spawnCollectPop(); },
    };
    this.clock = new THREE.Clock();
    this.objects = new Map();
    this.entityHandles = new Map();
    this.entitySprites = new Map();
    this.textureLoader = new THREE.TextureLoader();
    this.textures = new Map();
    this.pools = null;
    // Per-type InstancedMesh for scenery — keyed by ASSETS path.
    this.sceneryInstances = new Map();
    // Shared PlaneGeometry reused across every scenery InstancedMesh.
    this._sceneryPlaneGeo = null;
    // Per-frame counters: how many instances are active this frame for each type.
    this._sceneryCounters = new Map();
    // Scratch objects — allocated once, reused every frame to avoid GC pressure.
    this._scratchMatrix = new THREE.Matrix4();
    this._scratchQuat = new THREE.Quaternion();
    this._scratchPos = new THREE.Vector3();
    this._scratchScale = new THREE.Vector3();
    this.envTexture = null;
    this.initialized = false;
    this.disposed = false;
    // Post-processing
    this.composer = null;
    this.renderPass = null;
    this.ssaoPass = null;
    this.bloomPass = null;
    // Base bloom strength; pulse accumulator is added each frame then decayed.
    this._bloomBase = 0.45;
    this.bloomPulse = 0;
    // Shared, frame-advanced uniform for the flora wind vertex shader — VISUAL-ONLY time
    // (like the cloud drift), never touches the seeded sim. Plus lazy blob-shadow handles.
    this._windUniform = { value: 0 };
    this._windMaterials = [];
    this._blobTexture = null;
    this._blobPlaneGeo = null;
    // Shared ECS blob-shadow InstancedMesh (#1 parity) + reused fill state. The quat lays
    // each blob flat on the ground; instanceColor carries per-prop density (#2).
    this._sceneryBlobs = null;
    this._blobCursor = 0;
    this._blobQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    this._blobColor = new THREE.Color();
    // Retro-pixel grid height (#3): 270 (dense, default) or 360 (softer); live-togglable.
    this.pixelHeight = 270;
    // Three-unit scroll distance derived from world.scrollOffset each frame.
    // Mirrors the same 0.42 scale used by entity placement (-pos.distance * 0.42),
    // so road/backdrop are always locked to ECS coordinates — no per-frame drift.
    this.scrollZ = 0;
  }

  init() {
    if (this.initialized) return this;
    if (this.disposed) throw new Error('ThreeSceneRenderer cannot be re-initialized after destroy()');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.options.antialias,
      alpha: this.options.alpha,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x78bff2, this.options.alpha ? 0 : 1);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.scene = new THREE.Scene();
    // Deep zenith→light horizon gradient replaces the flat sky PNG.
    // 2×512 canvas is enough for a smooth linear gradient at this scale.
    // colorSpace must be SRGBColorSpace so it displays correctly through the
    // OutputPass sRGB conversion in the post-processing chain.
    this._skyGradientTex = this.#buildSkyGradient();
    this.scene.background = this._skyGradientTex;
    // Exponential aerial perspective (T1): density grows non-linearly with distance, so the
    // foreground stays crisp while the road-end, far voxel columns and skirt dissolve into the
    // horizon haze — the castle "grows into" the ground instead of reading as a flat applique.
    // The pixelation pass bands this smooth haze into retro colour steps. Density 0.010
    // (softened from a first-guess 0.015, which over-hazed our compact scene + epic castle).
    this.scene.fog = new THREE.FogExp2(HAZE_COLOR, 0.010);
    this.scrollZ = 0;
    this.#buildEnvironment();
    this.#buildCameras();
    this.#buildLights();
    this.#buildStaticStage();
    this.#buildShoulderTiers();
    this.#buildReferenceBackdrop();
    this.#buildReferenceSetPieces();
    this.#buildHorizon();
    this.#buildFarSilhouettes();
    this.#buildOrthoBackdrop();
    this.#buildInstancedPools();
    this.#buildParticles();
    this.#buildSparkles();
    this.#buildCollectPops();
    this.#buildSceneryBlobs();
    this.resize();
    this.#buildPostProcessing();
    this.#applyModeVisibility();
    this.initialized = true;
    return this;
  }

  setMode(mode) {
    this.mode = mode === '2.5d' ? '2.5d' : '3d';
    this.#applyModeVisibility();
    return this.mode;
  }

  setBlockStyle(style) {
    this.blockStyle = style === 'sprite' ? 'sprite' : 'voxel';
    return this.blockStyle;
  }

  toggleBlockStyle() {
    return this.setBlockStyle(this.blockStyle === 'voxel' ? 'sprite' : 'voxel');
  }

  setPlayerVoxelEnabled(enabled) {
    this.playerVoxelEnabled = enabled !== false;
    return this.playerVoxelEnabled;
  }

  toggleRoadStyle() {
    return this.roadStyle;
  }

  /**
   * Retro-pixel quantization height (#3): 270 (dense, default) or 360 (softer — fewer
   * "shimmer" artefacts on terrace seams at speed). Live-togglable from the dev switcher;
   * just rewrites the pixelation pass's uResolution, nothing recompiles.
   */
  setPixelHeight(height) {
    this.pixelHeight = height === 360 ? 360 : 270;
    if (this.pixelPass && this.renderer) {
      // Derive X from the REAL framebuffer aspect via getSize (NOT renderer.drawingBufferWidth,
      // which is undefined → NaN), and Math.round it. This keeps the quantization cells SQUARE
      // at every height (no 4:3-grid-on-16:9 squish) and integer (no sub-pixel shimmer on
      // 1px lines under NearestFilter). Same formula as #buildPostProcessing + resize().
      const size = this.renderer.getSize(new THREE.Vector2());
      const aspect = size.y > 0 ? size.x / size.y : 16 / 9;
      this.pixelPass.uniforms.uResolution.value.set(Math.max(1, Math.round(this.pixelHeight * aspect)), this.pixelHeight);
      // Force-recomposite the current scene through the new grid right away, so the switch
      // is visible immediately even if toggled while the rAF loop is paused (otherwise the
      // uniform would only take effect on the next loop frame). delta 0 → no sim advance.
      if (this.composer) {
        this.renderPass.camera = this.#activeCamera();
        this.ssaoPass.camera = this.#activeCamera();
        this.composer.render(0);
      }
    }
    return this.pixelHeight;
  }

  togglePixelHeight() {
    return this.setPixelHeight(this.pixelHeight === 270 ? 360 : 270);
  }

  render(world, delta = this.clock.getDelta()) {
    if (!this.initialized) this.init();
    this.#advanceScroll(world, delta);
    this.#syncWorld(world, delta);

    const cam = this.#activeCamera();
    if (this.composer) {
      // Keep post-processing passes aligned with whichever camera is active
      // (perspective vs orthographic), otherwise 2.5D mode renders through
      // the wrong frustum.
      this.renderPass.camera = cam;
      this.ssaoPass.camera = cam;

      // Drive bloom pulse: accumulator set by effectsRenderer triggers, decayed
      // each frame with framerate-independent exponential falloff (half-life ~0.18 s).
      this.bloomPulse *= Math.exp(-delta * 3.85);
      const clampedPulse = Math.min(this.bloomPulse, 0.55);
      this.bloomPass.strength = this._bloomBase + clampedPulse;

      this.composer.render(delta);
    } else {
      // Fallback when composer is not yet built (should not occur in normal flow).
      this.renderer.render(this.scene, cam);
    }
  }

  resize(width = this.projection?.width ?? this.canvas.clientWidth, height = this.projection?.height ?? this.canvas.clientHeight, pixelRatio = this.pixelRatio) {
    this.pixelRatio = Math.max(1, pixelRatio);
    if (!this.renderer) return;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.#updateCameraAspects(w / h);
    if (this.composer) {
      // EffectComposer.setSize already resizes every pass (incl. SSAO/bloom) to
      // the effective pixel-ratio resolution; sizing them again here would wrongly
      // clamp SSAO/bloom to logical pixels on HiDPI displays.
      this.composer.setPixelRatio?.(this.pixelRatio);
      this.composer.setSize(w, h);
    }
    // Keep the pixelation grid square + aspect-correct as the frame shape changes (#3).
    if (this.pixelPass) {
      this.pixelPass.uniforms.uResolution.value.set(Math.max(1, Math.round(this.pixelHeight * (w / h))), this.pixelHeight);
    }
  }

  resizeToViewport(padding = 0) {
    const appEl = document.getElementById('app');
    const rect = appEl ? appEl.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    let width = Math.max(320, rect.width - padding);
    let height = Math.max(180, rect.height - padding);
    // T4 — FILL the viewport at its OWN aspect (no forced 16:9 letterbox) so a portrait
    // phone uses the whole screen. The camera's horizontal-FOV lock (#updateCameraAspects)
    // keeps the track's on-screen width constant at any aspect, so proportions never
    // distort and side assets never fly off-frame. Aspect is clamped to a sane band so a
    // freak window can't crush the framing. A 16:9 viewport reduces to the old 1536×864.
    const aspect = Math.min(2.2, Math.max(0.5, width / height));
    if (width / height > aspect) width = height * aspect;
    else height = width / aspect;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const stage = this.canvas.parentElement;
    if (stage) {
      stage.style.width = `${width}px`;
      stage.style.height = `${height}px`;
    }
    // Render at a FIXED vertical resolution (the design height) with an aspect-adaptive
    // width, so quality is constant while the frame shape follows the device.
    const renderHeight = this.projection?.height ?? 864;
    this.resize(Math.round(renderHeight * aspect), renderHeight, this.pixelRatio);
  }

  destroy() {
    if (this.disposed) return;
    if (this.pools) {
      for (const pool of Object.values(this.pools)) {
        pool.dispose({ disposeGeometry: true, disposeMaterial: true });
      }
      this.pools = null;
    }
    // Dispose scenery instanced meshes — each has its own material; the shared
    // PlaneGeometry is disposed once separately below.
    for (const mesh of this.sceneryInstances.values()) {
      mesh.removeFromParent();
      mesh.material?.dispose();
    }
    this.sceneryInstances.clear();
    if (this._sceneryBlobs) {
      this._sceneryBlobs.removeFromParent();
      this._sceneryBlobs.material?.dispose();
      this._sceneryBlobs = null;
    }
    this._blobPlaneGeo?.dispose();
    this._blobPlaneGeo = null;
    this._sceneryPlaneGeo?.dispose();
    this._sceneryPlaneGeo = null;
    this._sceneryCounters.clear();
    // Road tile InstancedMesh lives inside _roadGroup which disposeObject3D
    // traverses, so geometry+material are covered; null the ref to prevent reuse.
    this._roadTileInstMesh = null;
    if (this.scene) {
      this.scene.environment = null;
      disposeObject3D(this.scene);
    }
    this.envTexture?.dispose?.();
    this.envTexture = null;
    // Sky gradient is a CanvasTexture created at init time — not in the textures
    // Map (which holds asset-loaded textures), so it must be disposed explicitly.
    this._skyGradientTex?.dispose?.();
    this._skyGradientTex = null;
    for (const texture of this.textures.values()) texture.dispose?.();
    this.objects.clear();
    this.entityHandles.clear();
    for (const entry of this.entitySprites.values()) {
      if (entry.object?.parent) entry.object.parent.remove(entry.object);
    }
    this.entitySprites.clear();
    this.textures.clear();
    this.composer?.dispose?.();
    this.ssaoPass?.dispose?.();
    this.bloomPass?.dispose?.();
    this.renderPass?.dispose?.();
    this.composer = null;
    this.renderPass = null;
    this.ssaoPass = null;
    this.bloomPass = null;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.renderer = null;
    this.scene = null;
    this.cameras = null;
    this.initialized = false;
    this.disposed = true;
  }

  #buildPostProcessing() {
    // Real framebuffer size via getSize (resize() ran earlier in init) — NOT the
    // WebGLRenderer's nonexistent drawingBufferWidth/Height (undefined → NaN). composer
    // .setSize keeps SSAO/bloom current after; the pixelation init below reuses w/h.
    const fb = this.renderer.getSize(new THREE.Vector2());
    const w = fb.x;
    const h = fb.y;
    const cam = this.#activeCamera();

    const composer = new EffectComposer(this.renderer);

    // 1. Base scene render — camera updated each frame to follow active mode.
    const renderPass = new RenderPass(this.scene, cam);
    composer.addPass(renderPass);

    // 2. SSAO — subtle contact shadows at object bases.
    // kernelRadius 6 keeps halos tight; min/maxDistance are conservative so
    // flat billboards don't receive excessive darkening.
    const ssaoPass = new SSAOPass(this.scene, cam, w, h);
    ssaoPass.kernelRadius = 4;
    ssaoPass.minDistance = 0.002;
    ssaoPass.maxDistance = 0.05;
    ssaoPass.output = SSAOPass.OUTPUT.Default;
    composer.addPass(ssaoPass);

    // 3. Bloom — threshold 0.95 keeps the player's bright straw/white surfaces
    // (luminance ~0.88–0.93) below the bloom cutoff while emissive gold coins
    // (emissiveIntensity 0.34, effective luminance > 0.95) still bloom.
    // Selective-by-layer bloom (two-scene approach) is a possible future enhancement.
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), this._bloomBase, 0.3, 0.98);
    composer.addPass(bloomPass);

    // 4. Vignette — frames the action zone by clearly but tastefully darkening
    // the corners. offset 0.95 shrinks the bright inner oval slightly inward;
    // darkness 1.25 gives visible corner compression without crushing the
    // HUD-safe edges to solid black.
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['offset'].value = 0.95;
    vignettePass.uniforms['darkness'].value = 1.25;
    composer.addPass(vignettePass);

    // 5. Retro pixelation (#3): quantise the composited image to a low-res grid so EVERY
    // edge — including the crisp 3D block bevels — resolves to uniform retro pixels. Sits
    // before OutputPass so tone-mapping + sRGB still run on the final image.
    const pixelPass = new ShaderPass(PIXELATION_SHADER);
    // Seed the quantization grid from the same real framebuffer aspect (w/h above): square
    // + integer. resize() and setPixelHeight keep it current.
    const fbAspect = h > 0 ? w / h : 16 / 9;
    pixelPass.uniforms.uResolution.value.set(Math.max(1, Math.round(this.pixelHeight * fbAspect)), this.pixelHeight);
    composer.addPass(pixelPass);

    // 6. OutputPass MUST be last: applies tone-mapping + sRGB conversion so
    // the composer's linear-space render looks correct on screen.
    composer.addPass(new OutputPass());

    this.composer = composer;
    this.renderPass = renderPass;
    this.ssaoPass = ssaoPass;
    this.bloomPass = bloomPass;
    this.vignettePass = vignettePass;
    this.pixelPass = pixelPass;
  }


  #buildEnvironment() {
    // Bake a neutral studio environment map using the bundled RoomEnvironment scene
    // so PBR materials (especially metallic collectibles) receive physically-plausible
    // image-based lighting without requiring any binary asset file.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    // sigma=0.04 gives a gentle blur that softens hard room edges in reflections.
    const envRenderTarget = pmrem.fromScene(roomEnv, 0.04);
    this.envTexture = envRenderTarget.texture;
    this.scene.environment = this.envTexture;
    // 0.65 complements the existing 3-light rig without overpowering it;
    // metals get visible reflections while diffuse surfaces stay warm.
    this.scene.environmentIntensity = 0.65;
    // Dispose the temporary room scene and the generator — the baked texture remains valid.
    disposeObject3D(roomEnv);
    pmrem.dispose();
  }

  #buildCameras() {
    const aspect = (this.projection?.width ?? 1536) / (this.projection?.height ?? 864);
    // Dramatic low cinematic angle (Reference Overhaul): camera dropped close to the
    // ground and pitched almost level so the road stretches to a distant vanishing
    // point with the castle as the composition centre. FOV narrowed 38→30 to curb the
    // wild foreground road-flare a low camera produces. (This intentionally trades back
    // some of the RM-T2 perceived-speed flattening for cinematic depth.)
    // FOV deep-telephoto at 18° (see PERSPECTIVE_FOV): castle/mountains read monumental and
    // close, edge perspective-skew on the side props is minimised — props stay fixed +Z
    // planes, nothing rotates. The camera dollies BACK (z 13 → 15.5) to compensate the
    // zoom-in so the foreground farmer keeps its size, raised slightly (y 3.9 → 4.0) and
    // aimed a touch higher (lookAt y 2.2 → 2.4) to frame the now-larger castle.
    const perspective = new THREE.PerspectiveCamera(PERSPECTIVE_FOV, aspect, 0.1, 900);
    perspective.position.set(0, 4.0, 15.5);
    perspective.lookAt(0, 2.4, -26);

    // Raised + steepened ortho camera for classic 2.5D quarter-view (Crossy Road style):
    // camera sits behind and above the action, looking forward-and-down. ORTHO_HEIGHT
    // is shared with #updateCameraAspects.
    const orthographic = new THREE.OrthographicCamera(
      -ORTHO_HEIGHT * aspect * 0.5,
      ORTHO_HEIGHT * aspect * 0.5,
      ORTHO_HEIGHT * 0.5,
      -ORTHO_HEIGHT * 0.5,
      0.1,
      900,
    );
    orthographic.position.set(0, 16, 18);
    orthographic.lookAt(0, 1, -16);
    this.cameras = { perspective, orthographic };
  }

  #buildLights() {
    // Daylight ambient. Dialled DOWN 1.85→1.5 (the fill) while the key DirectionalLight is
    // raised below — a higher key:fill ratio carves deeper, more contrasty half-tones on
    // the voxel block faces (terraces/ground read with form instead of flat) without
    // crushing the scene (#4). Unlit MeshBasic props are unaffected; lit MeshStandard
    // surfaces (ground/road/tiers/ECS scenery) gain the contrast.
    this.scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x6f9a52, 1.5));
    // Warm amber key, raised 1.75→2.2 to sharpen the lit-vs-shaded face contrast.
    const sun = new THREE.DirectionalLight(0xfff3d6, 2.2);
    sun.position.set(-5, 8, 5);
    sun.castShadow = false;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8fd8ff, 0.75);
    rim.position.set(4, 3, -6);
    this.scene.add(rim);
  }

  #buildStaticStage() {
    // Ground slab: vivid yellow-green base that reads as the reference's lush sunlit
    // meadow rather than a dark flat surface. None of the candidate textures are
    // cleanly tileable flat grass (all carry dirt sides or shaped silhouettes), so
    // brightness + a second subtle detail layer produce the variation without artefacts.
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.08, 115),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.#buildGrassTexture('ground', 6, 40), roughness: 0.9, metalness: 0 }),
    );
    ground.name = 'reference-ground';
    ground.position.set(0, -0.16, -34);
    this.scene.add(ground);

    // Subtle darker-green cross-stripe overlay to break the flat uniform look.
    // BoxGeometry rows at half the slab width, offset ±4.5 units, no depth overlap
    // (same Y as ground top face). Transparent so the base colour glows through.
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x3d9428,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < 12; i += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(18, 0.005, 2.2), stripeMat);
      // Stripes spaced 8 units apart starting at z=4, running into the distance.
      stripe.position.set(0, -0.12, 4 - i * 8);
      stripe.name = `ground-stripe-${i}`;
      this.scene.add(stripe);
    }

    // All per-tile road geometry lives in a single Group so the treadmill
    // only updates one position.z instead of hundreds of individual meshes.
    const roadGroup = new THREE.Group();
    roadGroup.name = 'road-scroll-group';
    this.scene.add(roadGroup);
    this._roadGroup = roadGroup;

    // #4 — a gentle depth gradient (vertex colors) lifts the road off a single flat tone:
    // a touch darker in the foreground, brightening toward the horizon/castle so the eye is
    // led forward. The roadGroup only wraps within one tile pitch, so the gradient reads as
    // fixed in world space rather than scrolling.
    const roadGeo = new THREE.BoxGeometry(5.45, 0.09, 98);
    applyDepthGradientColors(roadGeo, 0xc8d6ad, 0xffffff);
    const road = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({ color: 0xd8edbe, map: this.#buildGrassTexture('road', 3, 55), roughness: 0.92, metalness: 0, vertexColors: true }),
    );
    road.name = 'road';
    road.position.set(0, -0.08, -31);
    roadGroup.add(road);

    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x277f31, roughness: 0.95 });
    for (const x of [-5.35, 5.35]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.07, 98), shoulderMat);
      shoulder.position.set(x, -0.1, -31);
      shoulder.name = 'road-shoulder';
      roadGroup.add(shoulder);
    }

    const laneMat = new THREE.MeshBasicMaterial({ color: 0xffcf3a });
    for (const x of [-1.08, 1.08]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.014, 96), laneMat);
      line.position.set(x, 0.012, -31);
      line.name = 'reference-lane-line';
      roadGroup.add(line);
    }

    // Tile rows span a total depth of 82 Three-units (z 4 → -78, step 1.2).
    // Record the tile-row pitch so the treadmill can wrap by that amount.
    this._roadTileSpan = 82;   // total Z range covered by the tile grid
    this._roadTilePitch = 1.2; // one tile-row depth in Three-units

    // Checkerboard road tiles — single InstancedMesh replaces ~276 individual
    // meshes. One shared material with per-instance color preserves the two-tone
    // pattern in a single draw call. Opacity ~0.15 matches the old tileMatA/B average.
    const tileGeo = new THREE.BoxGeometry(0.55, 0.01, 0.42);
    const tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: this.#buildGrassTexture('tiles', 1, 1), transparent: true, opacity: 0.5 });
    const tileXPositions = [-2.1, -0.7, 0.7, 2.1];
    let tileCount = 0;
    for (let z = 4; z > -78; z -= 1.2) tileCount += tileXPositions.length;
    const tileInstMesh = new THREE.InstancedMesh(tileGeo, tileMat, tileCount);
    tileInstMesh.name = 'instanced-road-tiles';
    // Static geometry — matrices are set once here, never updated per frame.
    const tileMatrix = new THREE.Matrix4();
    const colorA = new THREE.Color(0xeaf6d8);
    const colorB = new THREE.Color(0xa9d189);
    let tileIdx = 0;
    for (let z = 4; z > -78; z -= 1.2) {
      for (const x of tileXPositions) {
        tileMatrix.makeTranslation(x, 0.02, z);
        tileInstMesh.setMatrixAt(tileIdx, tileMatrix);
        tileInstMesh.setColorAt(tileIdx, ((Math.round(z * 10) + Math.round(x * 10)) % 2) ? colorA : colorB);
        tileIdx += 1;
      }
    }
    tileInstMesh.instanceMatrix.needsUpdate = true;
    tileInstMesh.instanceColor.needsUpdate = true;
    // Add to roadGroup so the treadmill scroll moves tiles alongside the road surface.
    roadGroup.add(tileInstMesh);
    this._roadTileInstMesh = tileInstMesh;
  }

  /**
   * Voxel cube columns (reference look): discrete grass-topped dirt cubes and FLOATING
   * purple-brick clumps at varying heights flank the road, with trees/mushrooms crowning the
   * taller grass columns — the "Mario-meets-Minecraft" mid-ground. Real BoxGeometry textured by
   * one shared pixel-art atlas (grass-top / dirt-side / purple brick / cracked stone) across
   * three InstancedMeshes, lit by the sun so the faces read as 3D. Deterministic layout (seeded
   * hash, stable every build). Pure render
   * geometry (no ECS/spawn data) → seed tests untouched. Hidden in 2.5D (#applyModeVisibility).
   */
  #buildShoulderTiers() {
    const group = new THREE.Group();
    group.name = 'shoulder-tiers';
    this.scene.add(group);
    this._shoulderTiersGroup = group;

    const CUBE = 1.9;
    const grassGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const brickGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const rockGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    // One shared pixel-art atlas + face-driven UVs (#applyAtlasFaceUV): the +Y face samples the
    // "top" tile, every side the "side" tile — honest grass-topped dirt / all-brick / cracked
    // stone blocks. Replaces the old colorBoxByFace vertex tint (flat "cardboard" faces).
    const atlas = this.#buildBlockAtlas();
    const grassMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.9, metalness: 0 });
    this.#applyAtlasFaceUV(grassMat, BLOCK_TILES.grassTop, BLOCK_TILES.dirt);
    const brickMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.8, metalness: 0 });
    this.#applyAtlasFaceUV(brickMat, BLOCK_TILES.brick, BLOCK_TILES.brick);
    const rockMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.95, metalness: 0 });
    this.#applyAtlasFaceUV(rockMat, BLOCK_TILES.cracks, BLOCK_TILES.cracks);
    const grassCubes = new THREE.InstancedMesh(grassGeo, grassMat, 128);
    const brickCubes = new THREE.InstancedMesh(brickGeo, brickMat, 128);
    const rockCubes = new THREE.InstancedMesh(rockGeo, rockMat, 48);
    grassCubes.name = 'voxel-grass-cubes';
    brickCubes.name = 'voxel-brick-cubes';
    rockCubes.name = 'voxel-rock-cubes';
    grassCubes.frustumCulled = false;
    brickCubes.frustumCulled = false;
    rockCubes.frustumCulled = false;

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const rockScl = new THREE.Vector3();
    const hash = (n) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
    const tops = []; // grass-column tops, for on-top decor below
    let gi = 0;
    let bi = 0;
    let ri = 0;
    for (let side = -1; side <= 1; side += 2) {
      let ci = 0;
      for (let z = 5; z >= -70; z -= 6.0, ci += 1) {
        const h0 = hash((side + 2) * 131 + ci * 7);
        const h1 = hash((side + 2) * 131 + ci * 7 + 3);
        const h2 = hash((side + 2) * 131 + ci * 7 + 11);
        const x = side * (6.7 + h2 * 1.1); // 6.7 .. 7.8, just outside the shoulder
        if (h0 > 0.55) {
          // Purple brick — a small FLOATING Mario-style clump (sky beneath it), 1-2 tall.
          const stack = 1 + Math.round(h1);
          const base = CUBE * (0.8 + h2 * 0.8);
          for (let s = 0; s < stack && bi < 128; s += 1) {
            pos.set(x, base + s * CUBE + CUBE / 2, z);
            matrix.compose(pos, quat, one);
            brickCubes.setMatrixAt(bi, matrix);
            bi += 1;
          }
        } else {
          // Grass-dirt — a GROUNDED stepped stack, 1-3 tall.
          const stack = 1 + Math.floor(h1 * 2.99);
          for (let s = 0; s < stack && gi < 128; s += 1) {
            pos.set(x, s * CUBE + CUBE / 2, z);
            matrix.compose(pos, quat, one);
            grassCubes.setMatrixAt(gi, matrix);
            gi += 1;
          }
          if (stack >= 2) tops.push({ x, y: stack * CUBE, z, stack });
        }
        // T2 — rare protruding mossy rock between a column and the road, breaking the
        // even-row rhythm (height already varies 1-3 above).
        if (ri < 48 && hash((side + 2) * 131 + ci * 7 + 23) > 0.88) {
          const rs = 0.5 + h2 * 0.28;
          pos.set(x - side * (1.0 + h1 * 0.8), rs * CUBE / 2, z + (h0 - 0.5) * 2.0);
          matrix.compose(pos, quat, rockScl.set(rs, rs, rs));
          rockCubes.setMatrixAt(ri, matrix);
          ri += 1;
        }
      }
    }
    grassCubes.count = gi;
    brickCubes.count = bi;
    rockCubes.count = ri;
    grassCubes.instanceMatrix.needsUpdate = true;
    brickCubes.instanceMatrix.needsUpdate = true;
    rockCubes.instanceMatrix.needsUpdate = true;
    group.add(grassCubes);
    group.add(brickCubes);
    group.add(rockCubes);

    // Decor ON the taller grass columns (reference: trees/mushrooms crown the blocks). Tall
    // 3-stacks get a small mushroom (less towering); 2-stacks a tree. Same group → they hide
    // with the columns in 2.5D.
    for (const t of tops) {
      const asset = t.stack >= 3 ? ASSETS.mushroom : ASSETS.tree;
      const { width, height } = this.#propMetrics(asset);
      const prop = this.#makeProp(asset, { x: t.x, y: t.y + height / 2, z: t.z, width, height, seed: t.x * 13.1 + t.z * 7.7 });
      prop.renderOrder = 2;
      group.add(prop);
    }
  }

  #buildReferenceBackdrop() {
    const backdrop = new THREE.Group();
    backdrop.name = 'reference-backdrop';
    this.scene.add(backdrop);
    this._backdropGroup = backdrop;

    const add = (asset, x, y, z, w, h, options = {}) => {
      const sprite = this.#makeSprite(asset, { x, y, z, width: w, height: h, ...options });
      // depthTest ON so the now-opaque foreground props (which write depth) correctly
      // occlude the backdrop instead of the backdrop painting over them. renderOrder
      // still keeps it behind in the transparent queue; being far in Z it stays visible.
      sprite.material.depthTest = true;
      sprite.renderOrder = options.renderOrder ?? -20;
      backdrop.add(sprite);
      return sprite;
    };

    // Mountains removed — replaced by wraparound cylinder horizon in #buildHorizon().
    // Treeline pushed outward (±11/13) and lowered (y≈2.2) so it frames the sides as a
    // low band and leaves the dead centre open for the castle to stand in a clear gorge.
    add(ASSETS.forest, -11, 2.2, -51, 26, 7.0, { opacity: 0.98, renderOrder: -35 });
    add(ASSETS.forest, 13, 2.2, -52, 26, 7.0, { opacity: 0.96, renderOrder: -35 });

    // Castle landmark standing ON THE GROUND in the mountain valley at the road's end.
    // Scaled up 2.5× (10→25) and lowered so its base sits near y=0 — a bold, grounded
    // silhouette in the centre gorge, not a small tower floating in the clouds. z=-54
    // puts it at the far end of the road; fog=false + renderOrder=-10 keep it crisp and
    // in front of the horizon cylinders.
    const castle = add(ASSETS.castle, 0, 5.5, -46, 9.0, 9.0, { opacity: 1.0, renderOrder: -10 });
    castle.material.fog = false;
    // Clouds live in their own group so they can drift independently of the
    // static backdrop sprites (forest, castle).
    this.#buildCloudCanopy();
  }

  #buildReferenceSetPieces() {
    const group = new THREE.Group();
    group.name = 'reference-setpieces';
    this.scene.add(group);
    this._setpiecesGroup = group;

    // Solid side props: size comes from the shared Base Scale Hierarchy (#propMetrics);
    // each entry only supplies x, a baseY (the surface it stands on — 0 = meadow,
    // 1.0 = lower tier top, 1.3 = upper tier top) and z. y = baseY + height/2 keeps the
    // feet grounded after the resize. Upright opaque cards (T2/T3).
    const add = (asset, x, baseY, z, options = {}) => {
      const { width, height } = this.#propMetrics(asset);
      let y = baseY + height / 2;
      if (asset === ASSETS.questionBlock) y += 1.3; // Mario-style float above the surface
      const prop = this.#makeProp(asset, { x, y, z, width, height, seed: x * 13.1 + z * 7.7, ...options });
      prop.renderOrder = options.renderOrder ?? 2;
      group.add(prop);
      // #1/#2 — contact shadow on the surface the prop stands on (baseY), density per type.
      // Tiny ground-hugging flora is skipped to match the ECS pass.
      if (!BLOB_SKIP.has(asset)) {
        const blob = this.#makeBlob(width, this.#blobGrey(asset));
        blob.position.set(x, baseY + 0.02, z);
        group.add(blob);
      }
      return prop;
    };

    // [ asset, x, baseY, z ] — far trees pulled in to x±5.6 so they stand on the meadow
    // beside (not through) the lower tier.
    const sideProps = [
      [ASSETS.tree, -5.7, 0, -13], [ASSETS.tree, 5.5, 0, -18],
      [ASSETS.tree, -5.6, 0, -32], [ASSETS.tree, 5.6, 0, -35],
      [ASSETS.mushroom, -4.75, 0, 0.2], [ASSETS.mushroom, 4.9, 0, -7.4],
      [ASSETS.pipe, 4.18, 0, -16],
      [ASSETS.fence, -6.2, 0, 3.1], [ASSETS.fence, 6.15, 0, -2.1],
      [ASSETS.bush, -5.2, 0, -4.4], [ASSETS.bush, 5.3, 0, 1.8],
      [ASSETS.grassBlockLeft, -5.0, 0, -1.1], [ASSETS.grassBlockRight, 5.0, 0, -9.4],
      [ASSETS.grassBlock, -5.9, 0, -16.5], [ASSETS.grassBlock, 5.9, 0, -24],
      [ASSETS.purpleWall, -5.8, 0, -6.5], [ASSETS.purpleStairs, 5.8, 0, -22.5],
      [ASSETS.purpleBrick, -4.9, 0, -20.5], [ASSETS.questionBlock, -4.4, 0, -26],
      [ASSETS.questionBlock, 4.7, 0, -32],
      [ASSETS.flowersPurple, -3.45, 0, -11], [ASSETS.flowersPurple, 3.35, 0, -12.8],
      [ASSETS.flowersYellow, -2.8, 0, 0.8], [ASSETS.flowersYellow, 2.65, 0, -3.6],
      [ASSETS.dryGrass, 1.55, 0, 2.1],
      // (The old tier-seated decor is gone — the voxel cube columns + their on-top trees /
      // mushrooms now fill the sides; see #buildShoulderTiers.)
    ];

    for (const [asset, x, baseY, z] of sideProps) add(asset, x, baseY, z);

    // T3 — decorative vine barriers spanning the road (reference look): LOW so they never
    // cover the distant castle. Render-only set-pieces (real vine OBSTACLES still come from
    // ECS). Built directly (not via add) for an explicit full-lane width; the alphaTest gaps
    // let the road + coins show through. In the scrolling group so they stream past.
    for (const vz of [-12, -27]) {
      const vine = this.#makeProp(ASSETS.vineBarrier, { x: 0, y: 0.6, z: vz, width: 5.6, height: 1.05 });
      vine.renderOrder = 2;
      group.add(vine);
    }

    // T3 — micro-props: upright grass tufts on the verges + flat pebbles/cracks on the road,
    // breaking the monotone grass + grey road. Render-only, no collision, depthWrite:false; in
    // the scrolling set-piece group so they stream past. Deterministic via prand.
    for (let i = 0; i < 26; i += 1) {
      const r = prand(i * 3.1 + 1);
      const r2 = prand(i * 5.7 + 2);
      const z = 4 - i * 2.1; // spread along the near track (z 4 → -48)
      if (r > 0.45) {
        // upright grass tuft on a verge beside the road (organic → also gets T1 noise + wind)
        const m = this.#propMetrics(ASSETS.grassTuft);
        const tw = m.width * 0.5;
        const th = m.height * 0.5;
        const tuft = this.#makeProp(ASSETS.grassTuft, {
          x: (r2 > 0.5 ? 1 : -1) * (3.1 + r * 1.9), y: th / 2, z, width: tw, height: th, seed: i * 17.3,
        });
        tuft.renderOrder = 2;
        group.add(tuft);
      } else {
        // flat pebble / grass-patch lying on the road surface (subtle colour break)
        const pebble = new THREE.Mesh(
          new THREE.PlaneGeometry(0.6, 0.4),
          new THREE.MeshBasicMaterial({ color: r > 0.22 ? 0x837a6c : 0x4f7a34, transparent: true, opacity: 0.5, depthWrite: false, fog: true }),
        );
        pebble.rotation.x = -Math.PI / 2;        // lie flat on the road
        pebble.position.set((r2 - 0.5) * 4.6, 0.03, z);
        pebble.scale.setScalar(0.7 + r2 * 0.8);
        pebble.renderOrder = 1;
        pebble.name = 'debris-pebble';
        group.add(pebble);
      }
    }

    // Decorative golden-orchid trail — TRANSLUCENT sprites (alpha-fade toward the vanishing
    // point), built via #makeSprite. T3 — spacing scales INVERSELY with FOV: the telephoto
    // 22° lens compresses depth, so a fixed step piled the quads into one screen point and
    // bloomed them into a "plasma" blob over the farmer. zStep grows as FOV shrinks, the
    // trail starts further ahead (the farmer now sits at z-3), and the base opacity is cut
    // so overlapping quads read as a soft ribbon instead of burning out to white.
    const fov = this.cameras?.perspective?.fov ?? PERSPECTIVE_FOV;
    const zStep = 3.7 * (30 / fov); // ≈5.0 at FOV 22 → quads no longer stack in one point
    // T2 — the trail flickers per-frame (#animateTrail); collect refs + their base scale/opacity.
    this._trailFlowers = [];
    for (let i = 0; i < 9; i += 1) {
      const z = -10 - i * zStep;
      if (z < -44) break; // the narrower FOV grows zStep — stop the trail short of the castle
      const x = (i % 3 - 1) * 0.9;
      const scale = Math.max(0.55, 1.05 - i * 0.025);
      const opacity = Math.max(0.1, 0.62 - i * 0.07);
      const w = 0.72 * scale;
      const flower = this.#makeSprite(ASSETS.goldFlower, { x, y: 0.62, z, width: w, height: w, opacity });
      // Nearest flower (i=0) highest renderOrder → composites front-to-back, clean ribbon.
      flower.renderOrder = 100 - i;
      group.add(flower);
      this._trailFlowers.push({ sprite: flower, baseW: w, baseH: w, baseOpacity: opacity, idx: i, phase: i * 1.7 });
    }
  }

  /**
   * Build a 3-layer wraparound cylinder horizon that reads as infinitely distant.
   *
   * Each layer is an inverted open-ended cylinder (BackSide) centred on the camera
   * so it never scrolls — true-distance horizon. The mountain PNG tiles around the
   * inner wall with RepeatWrapping so there are no hard seams.
   *
   * Layer radii/distances:
   *   far  (mountainsFar) — r=95, h=28  — deepest in fog, most washed out
   *   mid  (mountainsMid) — r=78, h=24  — partial haze
   *   near (mountainsNear)— r=62, h=20  — clearest silhouette
   *
   * MeshBasicMaterial: unlit so silhouettes read as atmospheric shapes, not lit
   * surfaces. fog:true ensures the scene fog tints them by depth automatically.
   */
  #buildHorizon() {
    const group = new THREE.Group();
    group.name = 'horizon-cylinders';
    this.scene.add(group);
    this._horizonGroup = group;

    // T1 — fix the horizon in WORLD SPACE once, at the (static) camera's x/z. The camera
    // never translates in this game, so this matches the old per-frame centering but fully
    // decouples the backdrop from the camera, so view/aspect changes can't make it "wrap"
    // or stand up as side "ears". (In 2.5D this whole group is hidden; the flat screen-space
    // backdrop serves there — see #applyModeVisibility / #buildOrthoBackdrop.)
    const pcam = this.cameras?.perspective;
    group.position.set(pcam?.position.x ?? 0, 0, pcam?.position.z ?? 13);

    // Base Y so cylinder bottoms sit at or just below the ground plane (y=0).
    // The camera looks down slightly so the cylinder base is off-screen below.
    // Centre notch: carve a gap in the near and mid cylinder layers so the castle
    // sits in a visible valley notch at the road's vanishing point (like the reference).
    // Theta=0 is at +X; theta=π/2 is at -Z (the road's vanishing direction).
    // A notch of 28° (≈0.49 rad) on each side of π/2 opens a 56° gap centred on
    // the castle — wide enough to frame it without breaking the wraparound silhouette.
    const NOTCH_HALF = 0.85; // radians — wide clean centre gap (deep V-valley for the castle)
    const NOTCH_CENTER = Math.PI / 2; // -Z direction in cylinder theta space
    const notchStart = NOTCH_CENTER + NOTCH_HALF;
    const notchLength = Math.PI * 2 - NOTCH_HALF * 2;

    // [ assetKey, radius, height, repeatX, colorTint, notched, offsetX, scaleY ]
    // T1 — radii pushed WAY out (62/78/95 → 150/175/200) so the camera-centred cylinder
    // walls sit at z≈-139/-164/-189, far BEHIND the castle (z-46) and forest (z-51).
    // Previously the near wall sat at z≈-51, co-planar with the treeline, so the squashed
    // mountain band sliced through tree/pipe tops (the "horizon seam"). scaleY is scaled
    // up with the radius (×~2.4) so the peaks keep the same on-screen size.
    const layers = [
      [ASSETS.mountainsFar, 200, 28, 4.5, 0xdaf0e2, true, 0.0, 0.32],
      [ASSETS.mountainsMid, 175, 24, 4.0, 0xffffff, true, 0.37, 0.40],
      [ASSETS.mountainsNear, 150, 20, 3.5, 0xffffff, true, 0.68, 0.31],
    ];

    for (const [assetPath, radius, height, repeatX, tint, notched, offsetX, scaleY] of layers) {
      // Notched layers use thetaStart/thetaLength to leave a gap at -Z; un-notched
      // layers use the full 2π circle. 64 radial segments smooth enough at distance.
      const geo = notched
        ? new THREE.CylinderGeometry(radius, radius, height, 64, 1, true, notchStart, notchLength)
        : new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
      const tex = this.#texture(assetPath);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(repeatX, 1);
      tex.offset.x = offsetX;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: tint,
        // Hard-cut transparent sky pixels so fog tints only the mountain silhouette
        // geometry, not blended sky areas that would produce a visible haze band.
        alphaTest: 0.5,
        transparent: true,
        // depthTest on (read the buffer) but depthWrite off (never occlude): nearer
        // opaque props that DO write depth therefore mask the horizon correctly (T1).
        depthTest: true,
        depthWrite: false,
        side: THREE.BackSide,
        fog: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `horizon:${assetPath}`;
      // Position the cylinder so its vertical midpoint sits at a height that keeps
      // the mountain peaks above the horizon line the camera sees (~y=3.5 centre
      // gives base near y=-6.5, peaks near y=+10 — well above the castle at y≈8.5).
      // scaleY squashes the cylinders ~7× into a low, gentle backdrop band — pure
      // horizon framing, not a mass that presses on the scene; sits low at y=1.2.
      mesh.position.y = 1.2;
      mesh.scale.y = scaleY;
      // Large camera-relative geometry — its bounding sphere is meaningless per-frame.
      mesh.frustumCulled = false;
      // Hard-pin the horizon to the BACK of the transparent queue (below the forest at
      // -35 and castle at -10) so it can never paint over nearer scene layers (T1).
      mesh.renderOrder = -40;
      group.add(mesh);
    }

    // T2 — horizon "skirt": a wide OPAQUE, fog-toned quad standing just IN FRONT of the
    // mountain cylinders with its bottom edge driven far below the ground (world y≈-46).
    // Being opaque + depth-writing it guarantees the junction between the end of the
    // road/terraces and the mountain bases is ALWAYS filled — no black tectonic gap can
    // open under the castle at any camera pitch, FOV or window aspect. Its top (~world y+2)
    // tucks just under the ridgeline so the peaks still rise above it; the nearer ground,
    // forest and castle all depth-test in front of it. Hidden in 2.5D with the group.
    const skirt = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 48),
      new THREE.MeshBasicMaterial({ color: HAZE_COLOR, fog: true }),
    );
    skirt.name = 'horizon-skirt';
    skirt.position.set(0, -22, -120);
    skirt.frustumCulled = false;
    group.add(skirt);
  }

  /**
   * Far pastel silhouette layers between the castle and the sky (T3) — flat pixel forest /
   * hill planes painted in HAZE-adjacent tones (near a touch darker, far almost the sky) to
   * give honest aerial-perspective depth so the castle no longer floats on a blank backdrop.
   * MeshBasic + fog:false (precaution): the sun never lights them and FogExp2 never double-
   * hazes the hand-picked tones; alphaTest keeps crisp pixel silhouettes. Placed behind the
   * voxel columns, in front of the (now fog-dissolved) horizon cylinders. Hidden in 2.5D.
   * No X-parallax — a forward runner never pans the camera sideways, so the layers stay put;
   * the pale tone + layering carry the distance read.
   */
  #buildFarSilhouettes() {
    const group = new THREE.Group();
    group.name = 'far-silhouettes';
    this.scene.add(group);
    this._farSilhouettesGroup = group;
    // [ asset, z, y, width, height, tint, renderOrder ]
    const layers = [
      [ASSETS.mountainsFar, -82, 6.5, 190, 36, 0xc4cbe0, -20], // far ridge ≈ sky
      [ASSETS.forest, -72, 3.6, 150, 16, 0x9fb0c4, -19],       // near treeline, a touch darker
    ];
    for (const [asset, z, y, w, h, tint, ro] of layers) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: this.#texture(asset), color: tint, transparent: true, alphaTest: 0.5, depthWrite: false, fog: false }),
      );
      mesh.name = `far-silhouette:${asset}`;
      mesh.position.set(0, y, z);
      mesh.renderOrder = ro;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  /**
   * Build a SCREEN-SPACE backdrop for 2.5D and frame the orthographic camera.
   *
   * The backdrop group is parented to the ortho camera, so its sky + mountain
   * layers are pinned to the viewport: they never slide off-frame when the camera
   * tilts (a world-Z backdrop projects off the top under parallel projection — the
   * core failure of the previous approach). The layers sit near the far plane in
   * camera space with depthTest on, so all world geometry (road, trees, castle)
   * renders in front of them; #syncWorld scrolls the mountain UVs for parallax.
   * 3 layers = 3 draw calls. The camera is hidden from 3D via #applyModeVisibility.
   */
  #buildOrthoBackdrop() {
    const cam = this.cameras.orthographic;
    // 2.5D camera framing lives here, NOT in the shared #buildCameras, so the 3D
    // perspective rig is never touched. Raised with a moderate downward pitch gives
    // the road forward-depth without collapsing it to a line. Because the backdrop is
    // now screen-pinned, the angle is chosen purely for the playfield — no longer
    // constrained by keeping a distant horizon inside the frame.
    cam.position.set(0, 15, 16);
    cam.lookAt(0, 1, -14);
    cam.zoom = 1.0;
    cam.updateProjectionMatrix();

    const group = new THREE.Group();
    group.name = 'ortho-screen-backdrop';
    // Parent to the camera so the backdrop is fixed in screen space. The camera must
    // be in the scene graph for its children to render; it carries no geometry itself
    // and the group is hidden in 3D, so the perspective view is unaffected.
    if (!cam.parent) this.scene.add(cam);
    cam.add(group);
    this._orthoScreenGroup = group;

    // Camera-local frustum half-extents (orthographic size is constant with depth).
    const aspect = (this.projection?.width ?? 1536) / (this.projection?.height ?? 864);
    const halfH = ORTHO_HEIGHT / (2 * cam.zoom);
    const halfW = halfH * aspect;
    // Layers sit near the far plane in camera space and over-cover the frustum (×2.6)
    // so a resize never uncovers an edge. World geometry is far closer in camera space,
    // so depthTest alone keeps the backdrop behind it (depthWrite off → never occludes).
    const FAR = -700;
    const width = halfW * 2.6;

    // Layer 1 — full landscape gradient: blue sky (top) → pale horizon (mid) → meadow
    // green (bottom) matching the ground slab, so the meadow appears to continue to the
    // horizon on both sides of the central path. Sized to the EXACT visible height
    // (ORTHO_HEIGHT is aspect-independent) so the horizon lands at a stable screen Y;
    // only width is over-covered. 2 height segments give the mid (horizon) stop.
    const skyGeo = new THREE.PlaneGeometry(width, halfH * 2, 1, 2);
    applyVerticalGradientColors(skyGeo, 0x57b23c, 0xcfe8f2, 0x3f8fd0);
    const sky = new THREE.Mesh(
      skyGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false }),
    );
    sky.position.set(0, 0, FAR);
    sky.renderOrder = -50;
    sky.frustumCulled = false;
    group.add(sky);

    // Layers 2 & 3 — flat mountain strips BASED at the horizon line (y≈0), rising into
    // the sky. Independent textures (via #loadOrthoTexture) so the UV-scroll parallax
    // never touches the 3D cylinders.
    // [assetPath, heightMul, yMul (×halfH for the band CENTRE), localZ, renderOrder, repeatX]
    const bands = [
      [ASSETS.mountainsFar,  0.60, 0.28, FAR + 6,  -49, 3.0],
      [ASSETS.mountainsNear, 0.52, 0.24, FAR + 12, -48, 2.4],
    ];
    this._orthoMountains = [];
    for (const [assetPath, heightMul, yMul, z, renderOrder, repeatX] of bands) {
      const map = this.#loadOrthoTexture(assetPath, repeatX);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, halfH * heightMul),
        new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, depthWrite: false, fog: false }),
      );
      mesh.name = `ortho-screen-mountain:${assetPath}`;
      mesh.position.set(0, halfH * yMul, z);
      mesh.renderOrder = renderOrder;
      mesh.frustumCulled = false;
      group.add(mesh);
      this._orthoMountains.push(mesh);
    }
  }

  #loadOrthoTexture(assetPath, repeatX) {
    // Dedicated texture instance for the 2.5D flat mountains, kept OUT of the shared
    // #texture cache that the 3D cylinder horizon also reads, so setting repeat +
    // scrolling offset.x for parallax cannot corrupt the 3D mountains. Registered in
    // this.textures under an 'ortho:' key so destroy()'s dispose loop frees it.
    const url = assetPath.startsWith('.') ? assetPath : `${ASSET_ROOT}${assetPath}`;
    const tex = this.textureLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(repeatX, 1);
    this.textures.set(`ortho:${url}`, tex);
    return tex;
  }

  /**
   * Enforce per-mode visibility for the two backdrop systems.
   *
   * Called at the end of init() and inside setMode() so a runtime mode switch
   * re-applies immediately. Guards for null because setMode() can fire before
   * init() completes (constructor sets this.mode first).
   */
  #applyModeVisibility() {
    const is25d = this.mode === '2.5d';
    // Cylinder horizon: shown only in 3D (perspective camera uses perspective shrink
    // to make giant radii read as far away; orthographic does not).
    if (this._horizonGroup) this._horizonGroup.visible = !is25d;
    // Far pastel silhouettes (T3) are composed for the perspective view; the 2.5D screen-space
    // backdrop carries the horizon there, so hide them in 2.5D.
    if (this._farSilhouettesGroup) this._farSilhouettesGroup.visible = !is25d;
    // Screen-space backdrop (sky + mountains parented to the ortho camera): 2.5D only.
    if (this._orthoScreenGroup) this._orthoScreenGroup.visible = is25d;
    // The 3D backdrop sprites (forest trees, castle) are depth-composited for a
    // perspective view; under orthographic projection they bleed in as giant walls,
    // so hide them and let the screen-space backdrop serve as the horizon.
    if (this._backdropGroup) this._backdropGroup.visible = !is25d;
    // Cloud canopy reads fine in 3D; hide in 2.5D where the ortho projection turns it
    // into a ceiling — the screen-space sky layer carries the sky instead.
    if (this._cloudGroup) this._cloudGroup.visible = !is25d;
    // Stepped shoulder podiums are composed for the perspective valley; hide them in
    // 2.5D so the clean top-down screen-space landscape is not cluttered by side walls.
    if (this._shoulderTiersGroup) this._shoulderTiersGroup.visible = !is25d;
    // Post-processing is tuned for the 16:9 perspective frame. In the flat ortho frame
    // a heavy vignette crushes the sides into a dark box and strong bloom muddies the
    // flat sprites, so minimise the vignette and ease the bloom base in 2.5D.
    if (this.vignettePass) this.vignettePass.uniforms['darkness'].value = is25d ? 0.15 : 1.25;
    this._bloomBase = is25d ? 0.25 : 0.2;
    // SSAO adds little to flat ortho sprites and, tuned for the perspective depth
    // range, it over-darkens the road under the much deeper ortho frustum — disable in 2.5D.
    if (this.ssaoPass) this.ssaoPass.enabled = !is25d;
    // The screen-space sky layer fills the 2.5D background; the flat tint is only a
    // fallback for any uncovered edge. 3D keeps the vertical zenith→horizon gradient.
    if (this.scene) this.scene.background = is25d ? new THREE.Color(0x9fc8e8) : this._skyGradientTex;
  }

  #buildInstancedPools() {
    const makePool = ({ geometry, material, capacity }) => new ThreeInstancedPool({
      geometry,
      material,
      capacity,
      scene: this.scene,
    });
    this.pools = {
      collectible: makePool({
        geometry: new THREE.OctahedronGeometry(0.28, 1),
        material: new THREE.MeshStandardMaterial({
          color: 0xffd54a,
          roughness: 0.28,
          metalness: 0.88,
          emissive: 0xd88900,
          emissiveIntensity: 0.34,
        }),
        capacity: 512,
      }),
      obstacle: makePool({
        geometry: new THREE.BoxGeometry(0.82, 0.82, 0.24),
        material: new THREE.MeshStandardMaterial({ color: 0x8d55d8, roughness: 0.82, metalness: 0.02 }),
        capacity: 384,
      }),
      scenery: makePool({
        geometry: new THREE.CapsuleGeometry(0.28, 0.72, 4, 8),
        material: new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.92, metalness: 0 }),
        capacity: 1024,
      }),
    };
    this.pools.collectible.mesh.name = 'instanced-collectibles';
    this.pools.obstacle.mesh.name = 'instanced-obstacles';
    this.pools.scenery.mesh.name = 'instanced-scenery';
  }

  #syncWorld(world, delta = 0) {
    if (!world) return;
    this.#applyScroll();
    this.#syncPlayer(world);
    this.#syncRegistryObjects(world);
    // Horizon is FIXED in world space at build time (T1) — no per-frame camera sync, so
    // it can never "wrap" or stand up as side ears when the view/aspect changes.
    // 2.5D: gentle texture-offset parallax on the flat mountain planes.
    // scrollOffset-driven so depth reads as motion, not a conveyor belt.
    // Far layer moves slowest (barely perceptible); near layer slightly faster.
    if (this.mode === '2.5d' && this._orthoMountains) {
      const scroll = world.scrollOffset ?? 0;
      const factors = [0.0015, 0.003, 0.005];
      for (let i = 0; i < this._orthoMountains.length; i += 1) {
        const map = this._orthoMountains[i].material.map;
        if (map) map.offset.x = scroll * factors[i];
      }
    }
    // Gentle sky drift: rotate cloud canopy around Y at a barely-perceptible rate
    // so the sky is never perfectly static. 0.0035 rad/s ≈ one full revolution per
    // ~30 minutes — movement is felt more than seen.
    if (this._cloudGroup) {
      this._cloudGroup.rotation.y += 0.0035 * delta;
    }
    // Advance the shared flora-wind clock (visual-only, like the cloud drift). Reused as the
    // shared time base for the coin sparkle/spin + trail flicker (all deterministic in it).
    this._windUniform.value += delta;
    this.#updateParticles(delta);
    this.#updateCollectPops(delta);
    this.#animateTrail();
  }

  /**
   * Crisp pixel "spark" pool for coin collection — bright gold quads that fly out and
   * fall under gravity, fading by shrinking. They glow by their own colour, NOT by
   * screen bloom, so the player is never washed out (replaces the old bloom flash).
   */
  #buildParticles() {
    const CAP = 64;
    const mesh = new THREE.InstancedMesh(
      // Small quads (~2.5× smaller than the original 0.17) so sparks read as crisp
      // gold flecks rather than the yellow wall that obscured the gardener's face.
      new THREE.PlaneGeometry(0.05, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, depthWrite: false, fog: false }),
      CAP,
    );
    mesh.name = 'collect-sparks';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CAP; i += 1) mesh.setMatrixAt(i, hidden);
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    this._particles = {
      mesh,
      cap: CAP,
      cursor: 0,
      // Shorter lifetime keeps sparks as a brief flash; the old 0.55 s let them
      // linger long enough to form a persistent gold cloud over the player.
      maxLife: 0.25,
      pos: Array.from({ length: CAP }, () => new THREE.Vector3()),
      vel: Array.from({ length: CAP }, () => new THREE.Vector3()),
      life: new Float32Array(CAP),
    };
  }

  #spawnCollectSparks() {
    const p = this._particles;
    const player = this.objects.get('player');
    if (!p || !player) return;
    // Math.random here is VISUAL-ONLY (opt-in 3D VFX) — it never touches the seeded sim.
    // Just 3 small sparks low at the FEET with a gentle pop — a tiny local twinkle,
    // never a halo that covers the farmer's body or hat.
    for (let n = 0; n < 3; n += 1) {
      const i = p.cursor;
      p.cursor = (p.cursor + 1) % p.cap;
      p.pos[i].set(player.position.x, player.position.y + 0.35, player.position.z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 1.0;
      p.vel[i].set(Math.cos(angle) * speed, 1.3 + Math.random() * 0.8, Math.sin(angle) * speed * 0.45);
      p.life[i] = p.maxLife;
    }
  }

  #updateParticles(delta) {
    const p = this._particles;
    if (!p) return;
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    let dirty = false;
    for (let i = 0; i < p.cap; i += 1) {
      if (p.life[i] <= 0) continue;
      dirty = true;
      p.life[i] -= delta;
      if (p.life[i] <= 0) {
        matrix.makeScale(0, 0, 0);
        p.mesh.setMatrixAt(i, matrix);
        continue;
      }
      p.vel[i].y -= 7.0 * delta; // gravity
      p.pos[i].addScaledVector(p.vel[i], delta);
      const k = p.life[i] / p.maxLife; // 1 → 0 over the particle's life
      // Smaller size range keeps sparks as subtle flecks at all stages of their life.
      const size = 0.05 + k * 0.16;    // tiny flecks — shrink as they die
      scl.set(size, size, size);
      matrix.compose(p.pos[i], quat, scl);
      p.mesh.setMatrixAt(i, matrix);
    }
    if (dirty) p.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Crisp 4-point "sparkle" pool (T1): tiny gold pixel stars that twinkle around the
   * collectibles. Refilled every frame from a DETERMINISTIC sin(windTime + seed) phase per coin
   * (no RNG → never touches the seeded sim, identical for a given time/seed): a star is present
   * this frame iff its coin's phase is near the crest, so glints come and go with no lifetime
   * bookkeeping. One draw call. renderOrder 7 sits it above the coins (6).
   */
  #buildSparkles() {
    const CAP = 48;
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.#buildStarTexture(), color: 0xfff4b0, transparent: true, depthWrite: false, fog: false, alphaTest: 0.04 }),
      CAP,
    );
    mesh.name = 'coin-sparkles';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CAP; i += 1) mesh.setMatrixAt(i, hidden);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = 0;
    mesh.renderOrder = 7;
    this.scene.add(mesh);
    this._sparkles = { mesh, cap: CAP, cursor: 0 };
  }

  /**
   * 16² four-point pixel star (white arms tapering to the tips + a bright core) for the coin
   * sparkle pool. Built from geometry, not RNG. NearestFilter keeps it crisp under the retro
   * pixelation. Registered for disposal under a 'sparkle:' key.
   */
  #buildStarTexture() {
    const size = 16;
    const c = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    for (let d = 0; d < c; d += 1) {
      const half = Math.max(0, Math.round((1 - d / c) * 1.6)); // arm thins toward the tip
      for (let t = -half; t <= half; t += 1) {
        ctx.fillRect(c + d, c + t, 1, 1);
        ctx.fillRect(c - d - 1, c + t, 1, 1);
        ctx.fillRect(c + t, c + d, 1, 1);
        ctx.fillRect(c + t, c - d - 1, 1, 1);
      }
    }
    ctx.fillRect(c - 1, c - 1, 2, 2); // bright core
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    this.textures.set('sparkle:star', tex);
    return tex;
  }

  /**
   * Emit one twinkling star for a coin at (x,y,z) when its deterministic phase tw = sin(windTime
   * + seed) is near the crest (rare → occasional glints, not a constant halo). The star grows
   * with tw so it pops in/out; its offset is a fixed per-coin function of the seed (no RNG) so
   * the glint sits at a stable corner. Consumes the shared scratch transforms fully before return.
   */
  #emitSparkle(x, y, z, seed, tw) {
    const s = this._sparkles;
    if (!s || tw < 0.55) return;
    const i = s.cursor;
    s.cursor = (s.cursor + 1) % s.cap;
    const grow = (tw - 0.55) / 0.45; // 0 → 1 across the crest
    const size = 0.16 + grow * 0.18;
    const ox = Math.sin(seed * 2.1) * 0.17;
    const oy = 0.26 + Math.cos(seed * 1.7) * 0.12;
    this._scratchPos.set(x + ox, y + oy, z + 0.02);
    this._scratchScale.set(size, size, 1);
    this._scratchMatrix.compose(this._scratchPos, this._scratchQuat, this._scratchScale);
    s.mesh.setMatrixAt(i, this._scratchMatrix);
  }

  /**
   * "Juicy collect" pop pool (T3): when a collectible is grabbed, a coin-textured quad jerks UP
   * from the player and shrinks to nothing (scale fade) so pickups feel grabbed, not merely
   * deleted. Driven by the authoritative triggerCollectFlash signal (#spawnCollectPop). Render-
   * only, one draw call; renderOrder 8 keeps it above coins (6) + sparkles (7).
   */
  #buildCollectPops() {
    const CAP = 16;
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.#texture(ASSETS.goldFlower), transparent: true, depthWrite: false, depthTest: false, fog: false, alphaTest: 0.04 }),
      CAP,
    );
    mesh.name = 'collect-pops';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CAP; i += 1) mesh.setMatrixAt(i, hidden);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.renderOrder = 8;
    this.scene.add(mesh);
    this._collectPops = {
      mesh,
      cap: CAP,
      cursor: 0,
      maxLife: 0.4,
      pos: Array.from({ length: CAP }, () => new THREE.Vector3()),
      life: new Float32Array(CAP),
    };
  }

  #spawnCollectPop() {
    const cp = this._collectPops;
    const player = this.objects.get('player');
    if (!cp || !player) return;
    const i = cp.cursor;
    cp.cursor = (cp.cursor + 1) % cp.cap;
    cp.pos[i].set(player.position.x, player.position.y + 0.8, player.position.z);
    cp.life[i] = cp.maxLife;
  }

  #updateCollectPops(delta) {
    const cp = this._collectPops;
    if (!cp) return;
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    let dirty = false;
    for (let i = 0; i < cp.cap; i += 1) {
      if (cp.life[i] <= 0) continue;
      dirty = true;
      cp.life[i] -= delta;
      if (cp.life[i] <= 0) {
        matrix.makeScale(0, 0, 0);
        cp.mesh.setMatrixAt(i, matrix);
        continue;
      }
      const k = cp.life[i] / cp.maxLife; // 1 → 0 over the pop's life
      cp.pos[i].y += (1.6 + k * 1.4) * delta; // quick jerk up, easing as it fades
      const size = 0.7 * k * (0.6 + 0.4 * k); // shrink toward zero (scale fade)
      scl.set(size, size, 1);
      matrix.compose(cp.pos[i], quat, scl);
      cp.mesh.setMatrixAt(i, matrix);
    }
    if (dirty) cp.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Per-frame flicker on the decorative orchid trail (T2): a scale shimmer (sin) plus a
   * checkerboard pixel-skip on opacity so the trail reads as a melting 16-bit energy ribbon
   * rather than a static line. The dim factor stays > 0.4 so it shimmers, never harsh-strobes.
   * Touches only scale/opacity — the set-piece group still scrolls the trail in Z normally.
   */
  #animateTrail() {
    if (!this._trailFlowers) return;
    const t = this._windUniform.value;
    for (const f of this._trailFlowers) {
      const pulse = 0.84 + 0.16 * Math.sin(t * 5.0 + f.phase);
      f.sprite.scale.set(f.baseW * pulse, f.baseH * pulse, 1);
      const skip = ((Math.floor(t * 8) + f.idx) % 2) === 0 ? 1.0 : 0.5; // checkerboard pixel-skip
      f.sprite.material.opacity = f.baseOpacity * skip * (0.85 + 0.15 * Math.sin(t * 7.0 + f.phase));
    }
  }

  /**
   * Bind scrollZ to world.scrollOffset so the road/backdrop position is a strict
   * derivative of ECS state rather than an independent time-integration.
   * world.scrollOffset is the same cumulative value entity placement uses
   * (-pos.distance * 0.42), so scroll never drifts from entity positions under
   * FPS variation or tab-hidden wake-up.
   */
  #advanceScroll(world) {
    if (!world) return;
    this.scrollZ = (world.scrollOffset ?? 0) * 0.42;
  }

  /**
   * Move road, backdrop, and setpiece groups to produce parallax scroll.
   *
   * Road treadmill: the roadGroup translates forward (positive Z) by the
   * sub-tile-pitch fractional offset, wrapping at one tile-row pitch so the
   * grid repeats seamlessly. The full-depth slabs (road surface, shoulders,
   * lane lines) ride along because they live in the same group — their 98-unit
   * length hides the cyclic wrap seam.
   *
   * Backdrop parallax: distant mountains move at 4% of scroll speed; the
   * forest/castle layer at 8%. This mimics the canvas2d BackgroundRenderer
   * convention of deeply-parallaxed sky layers crawling while near layers run.
   *
   * Setpieces parallax: near props move at 65% of scroll speed and wrap with
   * a period equal to the full setpiece Z span so content never runs dry.
   */
  #applyScroll() {
    if (!this._roadGroup) return;

    // Road treadmill — offset within one tile-row pitch, wraps smoothly.
    const pitch = this._roadTilePitch;
    this._roadGroup.position.z = this.scrollZ % pitch;

    // The forest treeline and castle are vanishing-point landmarks whose Z positions
    // are their permanent resting places. Parallax-shifting them forward eventually
    // moves the castle BEHIND the low camera (frustum-culled) and slides the wide
    // forest sprite into the foreground. They must stay fixed in world space.
    if (this._backdropGroup) {
      this._backdropGroup.position.z = 0;
    }

    // Setpieces parallax — near props stream past at ~65% of road speed.
    // Wrap with a 50-unit period so the hand-placed scene never exhausts itself.
    if (this._setpiecesGroup) {
      const setpieceOffset = (this.scrollZ * 0.65) % 50;
      this._setpiecesGroup.position.z = setpieceOffset;
    }
  }

  #syncPlayer(world) {
    const player = world.player;
    if (!player) return;
    const lane = player.components.LaneState;
    const vert = player.components.VerticalState;
    const crouch = player.components.CrouchState;
    // The player is a camera-facing 2D pixel sprite (the original detailed farmer art),
    // NOT a voxel proxy — a true retro billboard in the 3D world (knees, clothing folds
    // and straw texture all come straight from the art pack).
    const sprite = this.#getObject('player', () => {
      const material = new THREE.SpriteMaterial({
        map: this.#playerFrame('run', 0),
        alphaTest: 0.5, // hard pixel cutout — discards the transparent surround crisply
        transparent: true,
        depthWrite: true,
        fog: false,     // the hero never hazes
      });
      const s = new THREE.Sprite(material);
      s.name = 'player-sprite';
      s.center.set(0.5, 0); // anchor the sprite's BOTTOM edge at its position (feet on road)
      this.scene.add(s);
      return s;
    });

    // Vertical jump offset reuses the canvas2d convention (negative vert.y = airborne).
    const jump = Math.max(-2.5, -(vert?.y ?? 0) / 70);
    const crouching = !!crouch?.isCrouching;

    // Animation state: airborne → jump frame, crouching → crouch frame, otherwise a run
    // cycle whose cadence rides scrollOffset so the stride matches the run speed.
    let map;
    if (jump > 0.6) map = this.#playerFrame('jump', 0);
    else if (crouching) map = this.#playerFrame('crouch', 0);
    else map = this.#playerFrame('run', Math.floor((world.scrollOffset ?? 0) * 0.7) % 12);
    if (sprite.material.map !== map) {
      sprite.material.map = map;
      sprite.material.needsUpdate = true;
    }

    // 64×96 art (2:3 → width = height × 0.667). The farmer IS the scene's unit:
    // run-pose height === FARMER_UNIT, so every prop scales relative to it. Feet stay
    // anchored to the road surface (center.set(0.5,0)); crouch is ~0.74 of standing.
    sprite.scale.set(FARMER_UNIT * 0.667, (crouching ? 0.74 : 1) * FARMER_UNIT, 1);
    // z placed at -3.0: far enough that the down-tilted camera frames the WHOLE farmer
    // (feet on the road) in the lower third, close enough to read large (T4). Render-only
    // anchor — ECS gameplay is unaffected.
    sprite.position.set((lane?.laneX ?? 0) * 1.18, 0.02 + jump, -3.0);
    sprite.material.rotation = -((lane?.laneTilt ?? 0) * 0.1);

    // #1 — player contact shadow: stays on the road under the hero, shrinking + fading as
    // the jump arc lifts him so the gap reads as height.
    const blob = this.#getObject('player-blob', () => {
      const b = this.#makeBlob(FARMER_UNIT * 0.75, 0.1); // dense, the hero is the focal point
      this.scene.add(b);
      return b;
    });
    const jumpT = Math.min(1, jump / 2.2);
    const blobScale = FARMER_UNIT * 0.75 * (1 - 0.45 * jumpT);
    blob.position.set((lane?.laneX ?? 0) * 1.18, 0.03, -3.0);
    blob.scale.set(blobScale * 1.05, blobScale * 0.5, 1);
    blob.material.opacity = 0.9 * (1 - 0.5 * jumpT);
  }

  #playerFrame(state, idx) {
    let path;
    if (state === 'jump') path = 'player/farmer_jump/player_farmer_jump_08.png';
    else if (state === 'crouch') path = 'player/farmer_crouch/player_farmer_crouch_02.png';
    else path = `player/farmer_run/player_farmer_run_${String(idx + 1).padStart(2, '0')}.png`;
    return this.#texture(path); // cached + NearestFilter + sRGB by #texture
  }

  /**
   * Lazily create or retrieve the InstancedMesh for a given scenery asset path.
   *
   * Flora assets (purple/yellow flowers) get capacity 1024 because the per-entity
   * multi-instance logic emits up to K+1 copies per entity (~4 near the camera).
   * All other scenery keeps capacity 256 — one copy per entity with margin.
   *
   * PlaneGeometry(1,1) faces +Z; the camera looks down -Z so instances are
   * front-facing with no rotation required. alphaTest=0.5 gives clean PNG cutouts
   * with correct depth ordering — instanced transparent blending cannot be
   * per-instance depth-sorted.
   */
  #sceneryInstancedMesh(assetPath) {
    const existing = this.sceneryInstances.get(assetPath);
    if (existing) return existing;

    if (!this._sceneryPlaneGeo) {
      this._sceneryPlaneGeo = new THREE.PlaneGeometry(1, 1);
    }
    const material = new THREE.MeshStandardMaterial({
      map: this.#texture(assetPath),
      alphaTest: 0.5,
      transparent: false,
      roughness: 1,
      metalness: 0,
    });
    if (WINDY_ASSETS.has(assetPath)) this.#applyWind(material, { instanced: true });
    // Flora assets need extra room for the multi-instance carpet clusters.
    const capacity = FLORA_ASSETS.has(assetPath) ? 1024 : 256;
    const mesh = new THREE.InstancedMesh(this._sceneryPlaneGeo, material, capacity);
    mesh.name = `instanced-scenery:${assetPath}`;
    // Dynamic per-frame instances invalidate the auto bounding sphere.
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.count = 0;
    this.scene.add(mesh);
    this.sceneryInstances.set(assetPath, mesh);
    this._sceneryCounters.set(assetPath, 0);
    return mesh;
  }

  #syncRegistryObjects(world) {
    const registry = world.registry;
    if (!registry?.query) return;
    const seen = new Set();

    // Reset per-type instance counters before the entity loop so stale
    // instances from the previous frame are overwritten or zeroed out.
    for (const assetPath of this.sceneryInstances.keys()) {
      this._sceneryCounters.set(assetPath, 0);
    }
    // Reset the shared ECS blob-shadow cursor; refilled as props are placed this frame (#1).
    this._blobCursor = 0;
    if (this._sparkles) this._sparkles.cursor = 0; // coin sparkles refilled per visible coin (T1)

    for (const entity of registry.query('Position', 'Sprite')) {
      const pos = entity.components.Position;
      const sprite = entity.components.Sprite;
      const category =
        'CollectibleData' in entity.components ? 'collectible' :
        'Hitbox' in entity.components ? 'obstacle' :
        'ScenicData' in entity.components ? 'scenery' : null;
      if (!category || pos.distance < -10 || pos.distance > 170) continue;
      const key = `entity:${entity.id}`;
      seen.add(key);
      const spriteAsset = this.#entitySpriteAsset(sprite, category);
      if (category === 'scenery') {
        // Scenery uses instanced rendering — release any legacy sprite or pool
        // handle that may have been created for this key in a prior code path.
        this.#releaseEntityPoolHandle(key);
        this.#releaseEntitySprite(key);
        const assetPath = this.#scenerySpriteAsset(sprite);
        if (assetPath) {
          const scenic = entity.components.ScenicData;
          const t = sprite?.assetType ?? sprite?.type ?? '';
          const x = this.#sceneryLaneX(pos, scenic);
          const z = -pos.distance * 0.42;

          // Per-type sizing comes from the single Base Scale Hierarchy (#propMetrics),
          // shared with the static set-pieces and ECS obstacles so nothing fights for scale.
          const { width, height } = this.#propMetrics(assetPath);

          // Strict grounding: feet sit exactly on the surface below (base ground or a
          // terrace top); question blocks keep a Mario-style float above that surface.
          let y = this.#getGroundHeight(x) + height / 2;
          if (t.includes('question')) y += 1.3;

          const instanceMesh = this.#sceneryInstancedMesh(assetPath);
          const capacity = instanceMesh.instanceMatrix.count;
          const isFlora = FLORA_ASSETS.has(assetPath);

          // For non-flora scenery emit exactly one instance (unchanged behaviour).
          // For flora, emit the base instance PLUS K extra jittered copies so the
          // shoulder reads as a lush carpet rather than isolated sprites.
          //
          // K quadratic proximity curve: entities near the camera get a denser
          // cluster; distant entities get ~1 extra copy or none.
          //   distRatio = distance / 170  (0=camera, 1=far clip)
          //   K = 1 + round(3 * (1-distRatio)²)  → 4 near, 2 mid, 1 far
          const distRatio = Math.min(1, Math.max(0, pos.distance / 170));
          const extraCopies = isFlora ? (1 + Math.round(3 * (1 - distRatio) * (1 - distRatio))) : 0;

          let counter = this._sceneryCounters.get(assetPath) ?? 0;

          // Base instance (always emitted for both flora and non-flora).
          if (counter < capacity) {
            this._scratchPos.set(x, y, z);
            this._scratchScale.set(width, height, 1);
            this._scratchMatrix.compose(this._scratchPos, this._scratchQuat, this._scratchScale);
            instanceMesh.setMatrixAt(counter, this._scratchMatrix);
            counter += 1;
          }

          // Extra jittered flora copies — draw calls are unaffected because all
          // copies share the same InstancedMesh.
          if (isFlora) {
            const id = entity.id ?? 0;
            // Road shoulder half-width in Three-X units so jitter stays off the lane.
            const shoulderSign = Math.sign(x) || 1;
            for (let k = 1; k <= extraCopies; k += 1) {
              if (counter >= capacity) break;
              // Deterministic hash seeded by (entity.id, copy index) — stable across
              // frames so flowers never swim or flicker.
              const h0 = Math.abs(Math.sin((id * 73 + k * 131) * 12.9898) * 43758.5453) % 1;
              const h1 = Math.abs(Math.sin((id * 97 + k * 157) * 12.9898) * 43758.5453) % 1;
              const h2 = Math.abs(Math.sin((id * 53 + k * 107) * 12.9898) * 43758.5453) % 1;
              // T3 — reduced scatter, snapped to a 0.3 sub-grid so the carpet reads as
              // ordered rows (not random chaos) yet still scrolls smoothly (the offset is
              // a fixed deterministic constant per copy, so no popping).
              const jx = Math.round(((h0 - 0.3) * 0.5 * shoulderSign + shoulderSign * h1 * 0.28) / 0.3) * 0.3;
              const jz = Math.round(((h1 - 0.5) * 0.5) / 0.3) * 0.3;
              // T1 — exclusion: keep flora off the structure/terrace zone (|x|≥4.7) so
              // lavender never grows into pipes, blocks or fences.
              let fx = x + jx;
              if (Math.abs(fx) > 4.7) fx = Math.sign(fx) * 4.7;
              // ±10% scale variance for natural variation in cluster density.
              const scaleVar = 0.9 + h2 * 0.2;
              this._scratchPos.set(fx, y, z + jz);
              this._scratchScale.set(width * scaleVar, height * scaleVar, 1);
              this._scratchMatrix.compose(this._scratchPos, this._scratchQuat, this._scratchScale);
              instanceMesh.setMatrixAt(counter, this._scratchMatrix);
              counter += 1;
            }
          }

          this._sceneryCounters.set(assetPath, counter);
          // #1 — contact shadow for non-flora scenery (flora is too small to bother),
          // grounded on the surface under it, matching the static set-pieces' blobs.
          if (!isFlora) this.#emitBlob(x, z, width, assetPath);
        }
        continue;
      }
      if (spriteAsset) {
        this.#releaseEntityPoolHandle(key);
        let spriteEntry = this.entitySprites.get(key);
        if (!spriteEntry || spriteEntry.asset !== spriteAsset) {
          this.#releaseEntitySprite(key);
          // Upright opaque card (T2/T3) so ECS obstacles/collectibles (pipes, mushrooms,
          // question blocks…) get the same honest depth + crisp cutout as the static props.
          const object = this.#makeProp(spriteAsset);
          object.name = `entity-sprite:${entity.id}:${category}`;
          this.scene.add(object);
          spriteEntry = { asset: spriteAsset, object, category };
          this.entitySprites.set(key, spriteEntry);
        }
        this.#applyEntitySpriteTransform(spriteEntry.object, entity, category);
        if (category === 'collectible') {
          // T1 — deterministic twinkle: emit a star near the crest of this coin's sin phase.
          const seed = (entity.id ?? 0) * 0.7;
          const tw = Math.sin(this._windUniform.value * 2.6 + seed);
          this.#emitSparkle((pos.lane ?? 0) * 1.18, 0.7, -pos.distance * 0.42, seed, tw);
        }
        // #1 — contact shadow for ECS obstacles (collectibles hover, so they get none).
        if (category === 'obstacle') {
          this.#emitBlob((pos.lane ?? 0) * 1.18, -pos.distance * 0.42, this.#propMetrics(spriteAsset).width, spriteAsset);
        }
        continue;
      }
      this.#releaseEntitySprite(key);
      const pool = this.pools?.[category];
      if (!pool) continue;
      let entry = this.entityHandles.get(key);
      if (!entry || entry.category !== category || !entry.handle.active) {
        if (entry?.pool && entry.handle?.active) entry.pool.release(entry.handle);
        const handle = pool.acquire();
        if (!handle) continue;
        entry = { category, pool, handle };
        this.entityHandles.set(key, entry);
      }
      const matrix = this.#entityMatrix(entity, category);
      entry.pool.setMatrix(entry.handle, matrix);
      entry.pool.setColor(entry.handle, this.#entityColor(sprite, category));
    }
    // Commit the final instance count and signal the GPU upload for every
    // scenery type — even types with zero instances this frame (count = 0
    // suppresses their draw call at no geometry cost).
    for (const [assetPath, mesh] of this.sceneryInstances) {
      mesh.count = this._sceneryCounters.get(assetPath) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
    // Commit this frame's ECS blob shadows (#1).
    if (this._sceneryBlobs) {
      this._sceneryBlobs.count = this._blobCursor;
      this._sceneryBlobs.instanceMatrix.needsUpdate = true;
      if (this._sceneryBlobs.instanceColor) this._sceneryBlobs.instanceColor.needsUpdate = true;
    }
    // Commit this frame's coin sparkles (T1) — count = however many coins twinkled this frame.
    if (this._sparkles) {
      this._sparkles.mesh.count = this._sparkles.cursor;
      this._sparkles.mesh.instanceMatrix.needsUpdate = true;
    }

    for (const [key, entry] of this.entityHandles) {
      if (seen.has(key)) continue;
      entry.pool.release(entry.handle);
      this.entityHandles.delete(key);
    }
    for (const [key] of this.entitySprites) {
      if (seen.has(key)) continue;
      this.#releaseEntitySprite(key);
    }
  }

  #entityMatrix(entity, category) {
    const pos = entity.components.Position;
    const scale =
      category === 'collectible' ? 0.58 :
      category === 'scenery' ? 0.86 : 1.0;
    const y =
      category === 'collectible' ? 0.42 :
      category === 'scenery' ? 0.52 : 0.36;
    return new THREE.Matrix4()
      .makeScale(scale, scale, scale)
      .setPosition((pos.lane ?? 0) * 1.18, y, -pos.distance * 0.42);
  }

  #entitySpriteAsset(sprite, category) {
    const type = `${sprite?.type ?? ''} ${sprite?.assetType ?? ''} ${sprite?.key ?? ''}`.toLowerCase();
    if (category === 'collectible') {
      if (type.includes('life') || type.includes('heart')) return ASSETS.heart;
      if (type.includes('rare') || type.includes('blue')) return ASSETS.orchidGold;
      return ASSETS.goldFlower;
    }
    if (category === 'obstacle') {
      if (type.includes('vine')) return ASSETS.vineBarrier;
      if (type.includes('grass') || type.includes('dry')) return ASSETS.dryGrass;
      if (type.includes('mushroom')) return ASSETS.mushroom;
      if (type.includes('pipe')) return ASSETS.pipe;
      if (type.includes('question')) return ASSETS.questionBlock;
      if (type.includes('brick') || type.includes('wall') || type.includes('stone')) return ASSETS.purpleWall;
      if (type.includes('bush')) return ASSETS.bush;
    }
    return null;
  }

  /**
   * Map a scenery entity's Sprite.assetType to the corresponding ASSETS path.
   * Returns null for unknown or purely decorative types that have no equivalent
   * art in the Three scene — the caller will skip sprite creation for those.
   */
  #scenerySpriteAsset(sprite) {
    const t = sprite?.assetType ?? sprite?.type ?? '';
    if (t.includes('tree')) return ASSETS.tree;
    if (t.includes('mushroom')) return ASSETS.mushroom;
    if (t.includes('fence')) return ASSETS.fence;
    if (t.includes('bush')) return ASSETS.bush;
    if (t.includes('pipe')) return ASSETS.pipe;
    if (t.includes('question')) return ASSETS.questionBlock;
    if (t.includes('grass_dirt_block') || t.includes('grass_dirt_wall')) return ASSETS.grassBlock;
    if (t.includes('grass_dirt_step')) return ASSETS.grassBlockLeft;
    if (t.includes('grass_dirt_platform')) return ASSETS.grassPlatform;
    if (t.includes('purple_brick') || t.includes('stone_brick') || t.includes('stone_wall')) return ASSETS.purpleBrick;
    if (t.includes('purple_flower') || t.includes('leaf_clump') || t.includes('sprout')) return ASSETS.flowersPurple;
    if (t.includes('yellow_flower')) return ASSETS.flowersYellow;
    if (t.includes('grass_tuft')) return ASSETS.flowersPurple;
    return null;
  }

  /**
   * Remap a scenery entity's raw lane into the same visual-lane space that
   * SceneryRenderer uses, then convert to Three-X units (* 1.18).
   *
   * Raw lanes sit at ~1.38–1.85 (SHOULDER), ~1.85–2.25 (STRUCTURE), and
   * ~2.40–3.25 (NATURE). SceneryRenderer's remapLaneForBand() pushes them
   * outward to 2.32–2.55, 2.55–3.70, and 3.70–4.80 respectively so the
   * decor bands sit clearly outside the road edge. We replicate the same
   * math here — purely numeric, no canvas2d dependency.
   */
  #sceneryLaneX(pos, scenic) {
    const band = scenic?.laneBand ?? null;
    const lane = pos.lane ?? 0;
    const sign = Math.sign(lane) || 1;
    const abs = Math.abs(lane);
    let remapped;
    if (band === LANE_BANDS.SHOULDER || band === LANE_BANDS.MEADOW) {
      const t = Math.min(1, Math.max(0, (abs - 1.38) / (1.85 - 1.38)));
      remapped = sign * (2.55 + t * (3.70 - 2.55));
    } else if (band === LANE_BANDS.STRUCTURE) {
      // Structures (bricks, blocks, pipes) pushed OUT to the terrace verge (x±5.0–6.5)
      // so stone/brick never flanks the road — the central axis stays clear to the castle.
      if (abs < 1.85) { remapped = sign * 4.2; }
      else {
        const t = Math.min(1, (abs - 1.85) / 0.40);
        remapped = sign * (4.2 + t * (5.5 - 4.2));
      }
    } else if (band === LANE_BANDS.NATURE) {
      if (abs < 2.40) { remapped = sign * 3.70; }
      else {
        const t = Math.min(1, (abs - 2.40) / 0.85);
        remapped = sign * (3.70 + t * (4.80 - 3.70));
      }
    } else {
      remapped = lane;
    }
    return remapped * 1.18;
  }

  /**
   * Surface height at a given X so scenery sits exactly ON the ground or a terrace tier
   * (no floating, no sinking). Render-only — consumed by #syncRegistryObjects (T2).
   */
  #getGroundHeight(x) {
    // The side terraces are now DISCRETE floating voxel columns (#buildShoulderTiers), not a
    // continuous walkable surface — so all streamed scenery + blob shadows ground on the base
    // meadow. (x retained in the signature; callers are unchanged.)
    void x;
    return 0;
  }

  #applyEntitySpriteTransform(object, entity, category) {
    const pos = entity.components.Position;
    const z = -pos.distance * 0.42;
    const x = (pos.lane ?? 0) * 1.18;
    if (category === 'collectible') {
      // Pickups hover at chest height; coins SPIN (horizontal cos-squash — the classic 2D
      // edge-on spin), SHINE (brightness pulse) and bob, all from the shared visual clock keyed
      // by entity id → deterministic, never touches the seeded sim. Hearts get only shine + bob
      // (a squash-spin on a heart reads wrong).
      const t = this._windUniform.value;
      const seed = (entity.id ?? 0) * 0.7;
      const asset = this.#entitySpriteAsset(entity.components.Sprite, category);
      const isCoin = asset === ASSETS.goldFlower || asset === ASSETS.orchidGold;
      const spin = isCoin ? 0.28 + 0.72 * Math.abs(Math.cos(t * 3.4 + seed)) : 1; // never fully flat
      object.position.set(x, 0.66 + Math.sin(t * 2.2 + seed) * 0.05, z);
      object.scale.set(0.64 * spin, 0.64, 1);
      object.material.color.setScalar(0.9 + 0.28 * Math.max(0, Math.sin(t * 4.2 + seed))); // shine
      object.renderOrder = 6;
      return;
    }
    // Obstacles share the Base Scale Hierarchy with the scenery, grounded on the road.
    const { width, height } = this.#propMetrics(this.#entitySpriteAsset(entity.components.Sprite, category));
    object.position.set(x, height / 2, z);
    object.scale.set(width, height, 1);
    object.renderOrder = 4;
  }

  #releaseEntityPoolHandle(key) {
    const entry = this.entityHandles.get(key);
    if (!entry) return;
    entry.pool.release(entry.handle);
    this.entityHandles.delete(key);
  }

  #releaseEntitySprite(key) {
    const entry = this.entitySprites.get(key);
    if (!entry) return;
    if (entry.object?.parent) entry.object.parent.remove(entry.object);
    disposeObject3D(entry.object);
    this.entitySprites.delete(key);
  }

  /**
   * Build a 2×512 CanvasTexture with a vertical zenith→horizon gradient.
   * Deep steel-blue at the top (#1A5276) fades to the fog-matching light-blue
   * at the bottom (#9fc8e8) — the same value used for scene.fog so the horizon
   * seam is invisible.
   */
  #buildSkyGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#248eff');   // saturated azure zenith (bright summer day)
    grad.addColorStop(1, '#ccd0e4');   // pale haze horizon — matches HAZE_COLOR + the fog (T2)
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Build a tileable pixel-grass CanvasTexture: a desaturated base + a soft sunlit→
   * shaded vertical gradient + deterministic blade specks. Replaces the flat "toxic"
   * road/ground fill with juicy turf at one texture's cost (no extra draw calls).
   * Registered in this.textures under a 'grass:' key so destroy() disposes it.
   * repeatX/repeatY tile the 64² texture across each surface's UVs.
   */
  #buildGrassTexture(key, repeatX, repeatY) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // crisp pixel blades, no canvas blur
    ctx.fillStyle = '#4f9e3c';
    ctx.fillRect(0, 0, size, size);
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, 'rgba(150, 205, 110, 0.42)');
    grad.addColorStop(1, 'rgba(38, 110, 46, 0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    // Deterministic blade specks (seeded mulberry32) so the texture is identical
    // every load and never perturbs the seeded gameplay RNG.
    let seed = 0x9e3779b9;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const blades = ['#6fc04a', '#3c8a30', '#5bb040', '#2f7a2a'];
    for (let i = 0; i < 260; i += 1) {
      const x = Math.floor(rnd() * size);
      const y = Math.floor(rnd() * size);
      const h = 2 + Math.floor(rnd() * 4);
      ctx.fillStyle = blades[Math.floor(rnd() * blades.length)];
      ctx.fillRect(x, y, 1, h);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(repeatX, repeatY);
    this.textures.set(`grass:${key}`, tex);
    return tex;
  }

  /**
   * Single pixel-art ATLAS (2×2 tiles, 64²) for the voxel cubes — honest, fully-coloured pixel
   * tiles replacing the old flat vertex-coloured faces: grass-top, dirt-side (with a green
   * overhang lip + sand/pebble specks), purple running-bond brick (lit top edge + cracks) and
   * cracked grey stone. Face-driven UVs (#applyAtlasFaceUV) pick the tile per cube face.
   * NearestFilter + no mipmaps = crisp retro pixels with no distance mush; ClampToEdge so the
   * shader-side inset never wraps. Seeded → identical every build, never touches the gameplay
   * RNG. Registered in this.textures so destroy() disposes it.
   */
  #buildBlockAtlas() {
    const tile = 32;
    const size = tile * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let seed = 0x9e3779b9;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const px = (ox, oy, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(ox + x, oy + y, w, h); };

    // — grass top (canvas top-left): green base + scattered blade specks.
    px(0, 0, 0, 0, tile, tile, '#5aa83a');
    const grassBlades = ['#6fc04a', '#4d9230', '#7ad04f', '#58a338'];
    for (let i = 0; i < 150; i += 1) {
      const x = Math.floor(rnd() * tile);
      const y = Math.floor(rnd() * tile);
      px(0, 0, x, y, 1, 1 + Math.floor(rnd() * 2), grassBlades[Math.floor(rnd() * grassBlades.length)]);
    }

    // — dirt side (canvas top-right): brown base, sand/pebble specks, and a green grass lip on
    // the canvas TOP edge → high-V → the TOP of the cube's side face, with a few blades dripping.
    const dox = tile;
    px(dox, 0, 0, 0, tile, tile, '#8a5a2f');
    for (let i = 0; i < 120; i += 1) {
      const x = Math.floor(rnd() * tile);
      const y = 5 + Math.floor(rnd() * (tile - 5));
      const r = rnd();
      const color = r > 0.82 ? '#6e6760' : (r > 0.5 ? '#a07a4a' : '#6e441f'); // pebble / sand / dark clod
      px(dox, 0, x, y, 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2), color);
    }
    px(dox, 0, 0, 0, tile, 4, '#5aa83a'); // grass lip
    for (let x = 0; x < tile; x += 1) {
      if (rnd() > 0.5) px(dox, 0, x, 4, 1, 1 + Math.floor(rnd() * 2), rnd() > 0.5 ? '#6fc04a' : '#4d9230'); // drips
    }

    // — purple brick (canvas bottom-left): dark mortar field, running-bond bricks with a lit top
    // edge and the occasional crack.
    const boy = tile;
    px(0, boy, 0, 0, tile, tile, '#46365c'); // mortar
    const bw = 14;
    const bh = 7;
    let brow = 0;
    for (let y = 0; y < tile; y += bh + 1, brow += 1) {
      const off = (brow % 2) ? -Math.round(bw / 2) : 0; // running bond
      for (let x = off; x < tile; x += bw + 1) {
        const v = 150 + Math.floor(rnd() * 40);
        px(0, boy, x, y, bw, bh, `rgb(${v},${Math.floor(v * 0.62)},${Math.floor(v * 0.95)})`);
        px(0, boy, x, y, bw, 1, `rgb(${v + 40},${Math.floor(v * 0.62) + 34},${Math.floor(v * 0.95) + 28})`); // lit top edge
        if (rnd() > 0.78) px(0, boy, x + 2 + Math.floor(rnd() * (bw - 4)), y, 1, bh, '#33264a'); // crack
      }
    }

    // — cracked stone (canvas bottom-right): grey base + chips + a few dark crack veins.
    const cox = tile;
    const coy = tile;
    px(cox, coy, 0, 0, tile, tile, '#8f8a80');
    for (let i = 0; i < 70; i += 1) {
      const x = Math.floor(rnd() * tile);
      const y = Math.floor(rnd() * tile);
      const v = 150 + Math.floor(rnd() * 50);
      px(cox, coy, x, y, 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2), `rgb(${v},${v},${Math.floor(v * 0.96)})`);
    }
    for (let i = 0; i < 5; i += 1) {
      let x = Math.floor(rnd() * tile);
      let y = Math.floor(rnd() * tile);
      for (let s = 0; s < 6; s += 1) {
        px(cox, coy, x, y, 1, 1, '#5a564e');
        x += Math.floor(rnd() * 3) - 1;
        y += 1 + Math.floor(rnd() * 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    this.textures.set('blockatlas', tex);
    return tex;
  }

  /**
   * Build the cloud canopy in its own dedicated Group (_cloudGroup) so the
   * gentle Y-rotation drift in #syncWorld reads as a sky movement independent
   * of the backdrop sprites.
   *
   * Layout rules:
   *  - 11 clouds, each composed of 6 axis-aligned quads (66 instances total),
   *    all batched into ONE InstancedMesh — one draw call for the entire canopy
   *    instead of 66 separate Mesh draw calls (~65 fewer GPU round-trips).
   *  - Scale, X, Y, Z all derived deterministically from the cloud index via a
   *    seeded hash (sin-based) so the layout is identical across every reload.
   *  - Two tiers: HIGH (y 12–14) and LOW (y 9–11) so clouds visually overlap
   *    mountain peaks on the horizon.
   *  - X spread ±16 (wider than the backdrop sprites so the sky feels populated
   *    at the edges); Z range −40 to −60 (inside the frustum, beyond the castle).
   *  - Horizontal scale variance 1–3×, vertical variance 1–2× → wide, flat
   *    Genshin-style chunky clouds.
   *  - Instance color encodes the white/shade distinction so a single shared
   *    material suffices without needing per-block material swaps.
   */
  #buildCloudCanopy() {
    const group = new THREE.Group();
    group.name = 'cloud-canopy';
    // Clouds sit in world space, not inside the backdrop group, so the Y-rotation
    // drift is centred on the scene origin.
    this.scene.add(group);
    this._cloudGroup = group;

    const COUNT = 11;
    // Deterministic hash: seeded by cloud index — same value every build.
    const rnd = (i, salt) => Math.abs(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1;

    // Shared unit-plane geometry; each instance's matrix encodes position+scale.
    const geo = new THREE.PlaneGeometry(1, 1);
    // fog:false keeps clouds crisp pure-white regardless of their z depth — the
    // reference shows bold, un-hazed clouds even far in the sky.
    const mat = new THREE.MeshBasicMaterial({ color: 0xb4c0c8, transparent: true, opacity: 0.95, depthWrite: false, fog: false });

    const instMesh = new THREE.InstancedMesh(geo, mat, COUNT * 6);
    instMesh.name = 'cloud-canopy-instanced';
    instMesh.renderOrder = -24;
    // Frustum culling would hide instances whenever the canopy Group rotates its
    // bounding sphere out of view — disable it so the drift animation never pops.
    instMesh.frustumCulled = false;
    group.add(instMesh);

    // Reused scratch objects to avoid per-instance allocations.
    const matrix = new THREE.Matrix4();
    const pos    = new THREE.Vector3();
    const scl    = new THREE.Vector3();
    const quat   = new THREE.Quaternion(); // identity — clouds are always upright

    // Two-tone palette: full white for the lit face, cool tint for underside shade.
    const whiteColor = new THREE.Color(0xffffff);
    const shadeColor = new THREE.Color(0xd6e8ff);

    // Block offsets within each cloud (bx, by, bw, bh, isShade).
    // Order is preserved from the original per-Mesh definition so depth sort is
    // identical to the old per-Group arrangement.
    const blocks = [
      [-1.6,  0,    1.1,  0.42, true ],
      [-0.9,  0.2,  1.2,  0.55, false],
      [-0.2,  0.28, 1.25, 0.72, false],
      [ 0.55, 0.1,  1.15, 0.55, false],
      [ 1.15,-0.05, 0.9,  0.38, true ],
      [-0.25,-0.18, 2.45, 0.32, true ],
    ];

    let idx = 0;
    for (let i = 0; i < COUNT; i += 1) {
      const r0 = rnd(i, 0);
      const r1 = rnd(i, 1);
      const r2 = rnd(i, 2);
      const r3 = rnd(i, 3);
      const r4 = rnd(i, 4);

      // Alternate high/low tiers: even indices in the HIGH tier (y 12–14),
      // odd indices in the LOW tier (y 9–11) for a two-layer canopy.
      const y         = i % 2 === 0 ? 12 + r1 * 2 : 9 + r1 * 2;
      const x         = (r0 - 0.5) * 32;        // ±16 world units
      const z         = -40 - r2 * 20;           // z −40 to −60
      const scaleX    = 1 + r3 * 2;              // wide horizontal spread 1–3×
      const scaleY    = 1 + r4;                  // moderate vertical spread 1–2×
      const baseScale = 1.0 + r0 * 0.6;          // 1.0–1.6 overall size multiplier

      for (const [bx, by, bw, bh, isShade] of blocks) {
        pos.set(
          x + scaleX * bx * baseScale,
          y + scaleY * by * baseScale,
          z,
        );
        scl.set(
          scaleX * bw * baseScale,
          scaleY * bh * baseScale,
          1,
        );
        matrix.compose(pos, quat, scl);
        instMesh.setMatrixAt(idx, matrix);
        instMesh.setColorAt(idx, isShade ? shadeColor : whiteColor);
        idx += 1;
      }
    }

    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.instanceColor.needsUpdate  = true;
  }

  #makeSprite(assetPath, {
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    opacity = 1,
    color = 0xffffff,
  } = {}) {
    const texture = this.#texture(assetPath);
    const material = new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      alphaTest: 0.05,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(width, height, 1);
    sprite.name = `sprite:${assetPath}`;
    return sprite;
  }

  /**
   * Build an UPRIGHT world prop: a vertical PlaneGeometry card (not a screen-aligned
   * THREE.Sprite) with a HARD alphaTest cutout. Being opaque + depth-writing it occludes
   * and is occluded by other props honestly by physical distance (T2 — fixes the soft,
   * "soapy" alpha-blend overlap), and the cutout keeps the pixel contours crisp. It faces
   * the camera on Y only — for the fixed look-down-(-Z) rig that angle is ≈0, so the card
   * stands rigidly vertical and "nailed to the grid" like cardboard theatre scenery
   * (T3 — no spherical-billboard lean whose base floated as the prop scrolled past).
   */
  #makeProp(assetPath, {
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    color = 0xffffff,
    seed = null,
  } = {}) {
    const material = new THREE.MeshBasicMaterial({
      map: this.#texture(assetPath),
      color,
      transparent: false, // opaque: the z-buffer records the prop so overlap is honest
      alphaTest: 0.5,      // discard the transparent surround as a hard pixel cutout
      depthWrite: true,
      depthTest: true,
      fog: true,
      side: THREE.DoubleSide, // lets a mirrored (negative scale.x) sprite still render
    });
    if (WINDY_ASSETS.has(assetPath)) this.#applyWind(material, { instanced: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.position.set(x, y, z);
    // Organic noise (T1): ±15% scale, random horizontal mirror, ±13° yaw — keyed by a
    // deterministic seed so identical assets read as unique. Gated to organic props; a FLAT
    // sprite can't take full 2π yaw (it would turn edge-on/away), so mirror + a small yaw is
    // the screen-stable equivalent. DoubleSide keeps the mirrored card from back-face culling.
    let sx = width;
    let sy = height;
    // Y-billboard toward the static camera; for the look-down-(-Z) rig this is ≈0.
    let yaw = this.cameras?.perspective?.rotation.y ?? 0;
    if (seed !== null && ORGANIC_ASSETS.has(assetPath)) {
      const s = 1 + (prand(seed) * 0.3 - 0.15);
      sx *= s;
      sy *= s;
      if (prand(seed * 1.7 + 1) > 0.5) sx = -sx;
      yaw += (prand(seed * 2.3 + 2) - 0.5) * 0.45;
    }
    mesh.scale.set(sx, sy, 1);
    mesh.rotation.y = yaw;
    mesh.name = `prop:${assetPath}`;
    return mesh;
  }

  /**
   * Resolve a prop's world {width, height} from the Base Scale Hierarchy — the
   * single source of truth so trees, pipes, blocks and mushrooms keep a sane,
   * predictable size relationship to the farmer (1.0 unit). Unknown assets fall
   * back to a ~half-farmer footprint.
   */
  #propMetrics(assetPath) {
    const [mult, aspect] = PROP_METRICS.get(assetPath) ?? [0.5, 1.2];
    const height = mult * FARMER_UNIT;
    return { width: height * aspect, height };
  }

  /**
   * Soft radial blob-shadow texture (dark centre → transparent edge). One CanvasTexture
   * is shared by every blob. Registered for disposal under a 'blob:' key.
   */
  #blobTexture() {
    if (this._blobTexture) return this._blobTexture;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    // WHITE radial alpha so the per-blob material color / instanceColor sets the darkness
    // (a black texture couldn't be tinted lighter for the "neat" props — see #2).
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.34)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set('blob:shadow', tex);
    this._blobTexture = tex;
    return tex;
  }

  /**
   * A blob "contact shadow": a soft dark oval lying flat on the ground (rotation.x = -90°),
   * wider than deep, sized to a prop's footprint. Cheap retro alternative to real shadow
   * maps (#1) — kills the "floating" look without lighting the billboards. Transparent +
   * depthWrite:false so it darkens the ground it sits on; depthTest:true so props in front
   * still occlude it. The caller positions it at the surface the prop stands on.
   */
  #makeBlob(width, grey = 0.12) {
    if (!this._blobPlaneGeo) this._blobPlaneGeo = new THREE.PlaneGeometry(1, 1);
    const blob = new THREE.Mesh(
      this._blobPlaneGeo,
      new THREE.MeshBasicMaterial({
        map: this.#blobTexture(),
        color: new THREE.Color(grey, grey, grey), // white texture × grey → shadow darkness (#2)
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
        fog: true,
      }),
    );
    blob.rotation.x = -Math.PI / 2;            // lie flat on the ground plane
    blob.scale.set(width * 1.05, width * 0.5, 1); // oval — wider (X) than deep (Z)
    blob.renderOrder = 1;
    blob.name = 'blob-shadow';
    return blob;
  }

  /** Per-type contact-shadow darkness (#2), read from the 3rd PROP_METRICS slot. */
  #blobGrey(assetPath) {
    const entry = PROP_METRICS.get(assetPath);
    return entry && entry.length > 2 ? entry[2] : 0.15;
  }

  /**
   * Shared InstancedMesh holding one contact shadow per ECS scenery/obstacle prop (#1) — so
   * streaming objects ground exactly like the static set-pieces (visual parity), at one draw
   * call. Refilled each frame by #emitBlob from #syncRegistryObjects. instanceColor carries
   * the per-prop density (#2); the white-alpha blob texture is shared with #makeBlob.
   */
  #buildSceneryBlobs() {
    if (!this._blobPlaneGeo) this._blobPlaneGeo = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(
      this._blobPlaneGeo,
      new THREE.MeshBasicMaterial({ map: this.#blobTexture(), transparent: true, depthWrite: false, opacity: 0.9, fog: true }),
      512,
    );
    mesh.name = 'ecs-blob-shadows';
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    this.scene.add(mesh);
    this._sceneryBlobs = mesh;
  }

  /**
   * Place one blob into the shared ECS blob mesh at the prop's footprint, grounded on the
   * surface under x (meadow or terrace top, via #getGroundHeight). No-op past capacity.
   */
  #emitBlob(x, z, width, assetPath) {
    const mesh = this._sceneryBlobs;
    if (!mesh || this._blobCursor >= mesh.instanceMatrix.count) return;
    const cursor = this._blobCursor;
    this._scratchPos.set(x, this.#getGroundHeight(x) + 0.02, z);
    this._scratchScale.set(width * 1.05, width * 0.5, 1);
    this._scratchMatrix.compose(this._scratchPos, this._blobQuat, this._scratchScale);
    mesh.setMatrixAt(cursor, this._scratchMatrix);
    mesh.setColorAt(cursor, this._blobColor.setScalar(this.#blobGrey(assetPath)));
    this._blobCursor = cursor + 1;
  }

  /**
   * Inject a cheap wind sway into a material's vertex shader (#2): each vertex's horizontal
   * position is nudged by a sine wave whose amplitude grows up the sprite (windTop), so the
   * base stays planted and the crown drifts. Phase varies per object / per instance by world
   * position so the field never sways in lockstep. uWindTime is a shared visual-only clock
   * (advanced in #syncWorld), so this never perturbs the seeded simulation.
   */
  #applyWind(material, { instanced = false } = {}) {
    const originExpr = instanced ? 'modelMatrix * instanceMatrix' : 'modelMatrix';
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = this._windUniform;
      shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  {
    vec4 windOrigin = ${originExpr} * vec4(0.0, 0.0, 0.0, 1.0);
    float windTop = max(0.0, position.y + 0.5); // unit-plane local Y: 0 at foot → 1 at crown
    transformed.x += sin(uWindTime * 1.6 + windOrigin.x * 0.7 + windOrigin.z * 0.5) * 0.06 * windTop;
  }`,
      );
    };
    material.needsUpdate = true;
  }

  /**
   * Remap a cube material's map-UVs into the right atlas quadrant per face, in the vertex shader:
   * the +Y (top) face → topOrigin tile, every side face → sideOrigin tile. A half-texel inset
   * keeps NearestFilter from bleeding across the 2×2 atlas seams. Lets one shared atlas give each
   * box face a distinct pixel tile (grass top vs dirt side) with no per-face material array. The
   * cubes are axis-aligned (identity/scale only), so the object-space normal identifies the face.
   */
  #applyAtlasFaceUV(material, topOrigin, sideOrigin) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTopTile = { value: topOrigin };
      shader.uniforms.uSideTile = { value: sideOrigin };
      shader.uniforms.uTileSize = { value: TILE_UV_SIZE };
      shader.uniforms.uTileInset = { value: 0.5 / 32 }; // half-texel of a 32px tile, in tile-local UV
      shader.vertexShader = `uniform vec2 uTopTile;
uniform vec2 uSideTile;
uniform float uTileSize;
uniform float uTileInset;
${shader.vertexShader}`.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
  {
    vec2 atlasOrigin = (normal.y > 0.5) ? uTopTile : uSideTile;
    vec2 tileUv = clamp(uv, vec2(uTileInset), vec2(1.0 - uTileInset));
    vMapUv = atlasOrigin + tileUv * uTileSize;
  }`,
      );
    };
    material.needsUpdate = true;
  }

  #texture(assetPath) {
    const url = assetPath.startsWith('.') ? assetPath : `${ASSET_ROOT}${assetPath}`;
    const existing = this.textures.get(url);
    if (existing) return existing;
    const texture = this.textureLoader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    this.textures.set(url, texture);
    return texture;
  }

  #entityColor(sprite, category) {
    const type = sprite?.type ?? sprite?.assetType ?? '';
    if (category === 'collectible') {
      if (type.includes('life')) return 0xff2538;
      if (type.includes('rare')) return 0x5ab8ff;
      if (type.includes('power')) return 0x93ff68;
      return 0xffd54a;
    }
    if (category === 'obstacle') {
      if (type.includes('vine') || type.includes('bush') || type.includes('grass')) return 0x3fa34d;
      if (type.includes('mushroom')) return 0xd94836;
      if (type.includes('stone')) return 0xaaa29b;
      return 0x9a55d8;
    }
    return type.includes('tree') ? 0x2e8f34 : 0x74c957;
  }

  #getObject(key, factory) {
    const existing = this.objects.get(key);
    if (existing) {
      existing.visible = true;
      return existing;
    }
    const created = factory();
    this.objects.set(key, created);
    return created;
  }

  #activeCamera() {
    return this.mode === '2.5d' ? this.cameras.orthographic : this.cameras.perspective;
  }

  #updateCameraAspects(aspect) {
    if (!this.cameras) return;
    // T4 — lock the HORIZONTAL FOV so the track's on-screen width is constant at every
    // aspect ratio. Three keeps a PerspectiveCamera's VERTICAL fov fixed, so a portrait /
    // narrow viewport would otherwise shrink the horizontal fov and zoom the scene until
    // the side scenery flew off-frame. We derive the design horizontal half-angle once,
    // then solve the vertical fov that preserves it for the current aspect (portrait →
    // a TALLER vertical fov, i.e. more sky/road, never a wider-looking track).
    const cam = this.cameras.perspective;
    const designAspect = (this.projection?.width ?? 1536) / (this.projection?.height ?? 864);
    const lockedHalfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(PERSPECTIVE_FOV) / 2) * designAspect);
    cam.aspect = aspect;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(lockedHalfH) / Math.max(0.0001, aspect)));
    cam.updateProjectionMatrix();
    this.cameras.orthographic.left = -ORTHO_HEIGHT * aspect * 0.5;
    this.cameras.orthographic.right = ORTHO_HEIGHT * aspect * 0.5;
    this.cameras.orthographic.top = ORTHO_HEIGHT * 0.5;
    this.cameras.orthographic.bottom = -ORTHO_HEIGHT * 0.5;
    this.cameras.orthographic.updateProjectionMatrix();
  }
}
