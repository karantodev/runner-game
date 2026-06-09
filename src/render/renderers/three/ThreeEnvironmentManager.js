import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { RoomEnvironment } from '../../../../node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import {
  ASSETS, FARMER_UNIT, BLOB_SKIP, WINDY_ASSETS, ORGANIC_ASSETS,
  prand, propMetrics,
} from './threeAssetManifest.js';

const ORTHO_HEIGHT = 28;
const PERSPECTIVE_FOV = 22;
const HAZE_COLOR = 0x98d8f8;

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
    const t = (position.getY(i) - minY) / span;
    if (t < 0.5) scratch.copy(bottom).lerp(mid, t / 0.5);
    else scratch.copy(mid).lerp(top, (t - 0.5) / 0.5);
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

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
    const t = (position.getZ(i) - minZ) / span;
    scratch.copy(far).lerp(near, t);
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

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

export class ThreeEnvironmentManager {
  constructor(renderer, scene, assets, projection, textureCache) {
    this.renderer = renderer;
    this.scene = scene;
    this.assets = assets;
    this.projection = projection;
    this.textureCache = textureCache;
    this.textureLoader = textureCache?.textureLoader ?? new THREE.TextureLoader();

    this.cameras = null;
    this.envTexture = null;
    this.skyGradientTex = null;

    this.roadGroup = null;
    this.roadTileInstMesh = null;
    this.shoulderTiersGroup = null;
    this.backdropGroup = null;
    this.setpiecesGroup = null;
    this.horizonGroup = null;
    this.farSilhouettesGroup = null;
    this.orthoScreenGroup = null;
    this.orthoMountains = [];
    this.cloudGroup = null;

    this.trailFlowers = [];
    this.roadTileSpan = 82;
    this.roadTilePitch = 1.2;
  }

  build() {
    this.skyGradientTex = this.buildSkyGradient();
    this.scene.background = this.skyGradientTex;
    // 0.003 → 0.002: backdrop forest at D=63m was 17% fog-blended toward haze (too muted);
    // 0.002 reduces that to 12% while keeping near-field (<30m) fog under 6% (imperceptible).
    this.scene.fog = new THREE.FogExp2(HAZE_COLOR, 0.002);

    this.buildEnvironment();
    this.buildCameras();
    this.buildLights();
    this.buildStaticStage();
    this.buildShoulderTiers();
    this.buildReferenceBackdrop();
    this.buildReferenceSetPieces();
    this.buildHorizon();
    this.buildFarSilhouettes();
    this.buildOrthoBackdrop();
    this.buildCloudCanopy();
  }

  buildSkyGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    // CanvasTexture has flipY=true by default, so canvas-bottom (stop=0) maps to screen-top.
    // Putting vivid blue at stop=0 gives the bright sky band at the top of the viewport.
    const grad = ctx.createLinearGradient(0, 512, 0, 0);
    // VERIFIED: stop=1 → screen TOP, stop=0 → screen BOTTOM (contrary to the old comment).
    // Three.js background: UV v=1 → screen top, v=0 → screen bottom. flipY on CanvasTexture
    // maps canvas-top(y=0) → v=0 → screen bottom, canvas-bottom(y=512) → v=1 → screen top.
    // Deep cobalt MUST be at stop=1 to appear at the zenith; horizon at stop=0 is hidden by ground.
    grad.addColorStop(0, '#98c8f4');    // pale horizon → screen BOTTOM (hidden below ground)
    grad.addColorStop(0.50, '#3888d8'); // azure mid – deepened for richer sky gradient
    grad.addColorStop(1, '#1c60c8');    // deeper navy-cobalt → screen TOP (visible sky zone)
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    const envRenderTarget = pmrem.fromScene(roomEnv, 0.04);
    this.envTexture = envRenderTarget.texture;
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.8;
    disposeObject3D(roomEnv);
    pmrem.dispose();
  }

  buildCameras() {
    const aspect = (this.projection?.width ?? 1536) / (this.projection?.height ?? 864);
    const perspective = new THREE.PerspectiveCamera(PERSPECTIVE_FOV, aspect, 0.1, 900);
    perspective.position.set(0, 4.0, 15.5);
    perspective.lookAt(0, 2.0, -26);

    // Orthographic position is set in buildOrthoBackdrop after group parenting.
    const orthographic = new THREE.OrthographicCamera(
      -ORTHO_HEIGHT * aspect * 0.5,
      ORTHO_HEIGHT * aspect * 0.5,
      ORTHO_HEIGHT * 0.5,
      -ORTHO_HEIGHT * 0.5,
      0.1,
      900,
    );
    this.cameras = { perspective, orthographic };
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xdaf0ff, 0x90d860, 2.6));
    const sun = new THREE.DirectionalLight(0xfff8e8, 2.8);
    sun.position.set(-5, 8, 5);
    sun.castShadow = false;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8fd8ff, 0.9);
    rim.position.set(4, 3, -6);
    this.scene.add(rim);
  }

  buildStaticStage() {
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.08, 115),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.buildGrassTexture('ground', 6, 40), roughness: 0.9, metalness: 0 }),
    );
    ground.name = 'reference-ground';
    ground.position.set(0, -0.16, -34);
    this.scene.add(ground);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x3d9428,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < 12; i += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(18, 0.005, 2.2), stripeMat);
      stripe.position.set(0, -0.12, 4 - i * 8);
      stripe.name = `ground-stripe-${i}`;
      this.scene.add(stripe);
    }

    const roadGroup = new THREE.Group();
    roadGroup.name = 'road-scroll-group';
    this.scene.add(roadGroup);
    this.roadGroup = roadGroup;

    const roadGeo = new THREE.BoxGeometry(5.45, 0.09, 98);
    // Gradient from vibrant near-green to light-green far (not white) to match reference's bright corridor
    applyDepthGradientColors(roadGeo, 0x80b838, 0xc0e870);
    const road = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({ color: 0x98cc48, map: this.buildGrassTexture('road', 3, 55), roughness: 0.92, metalness: 0, vertexColors: true }),
    );
    road.name = 'road';
    road.position.set(0, -0.08, -31);
    roadGroup.add(road);

    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x44cc34, roughness: 0.95 });
    for (const x of [-5.35, 5.35]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.07, 98), shoulderMat);
      shoulder.position.set(x, -0.1, -31);
      shoulder.name = 'road-shoulder';
      roadGroup.add(shoulder);
    }

    const laneMat = new THREE.MeshBasicMaterial({ color: 0xddf07a });
    for (const x of [-1.08, 1.08]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.014, 96), laneMat);
      line.position.set(x, 0.012, -31);
      line.name = 'reference-lane-line';
      roadGroup.add(line);
    }

    this.roadTileSpan = 82;
    this.roadTilePitch = 1.2;

    const tileGeo = new THREE.BoxGeometry(0.55, 0.01, 0.42);
    const tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: this.buildGrassTexture('tiles', 1, 1), transparent: true, opacity: 0.5 });
    const tileXPositions = [-2.1, -0.7, 0.7, 2.1];
    let tileCount = 0;
    for (let z = 4; z > -78; z -= 1.2) tileCount += tileXPositions.length;
    const tileInstMesh = new THREE.InstancedMesh(tileGeo, tileMat, tileCount);
    tileInstMesh.name = 'instanced-road-tiles';
    const tileMatrix = new THREE.Matrix4();
    const colorA = new THREE.Color(0xc8f060);
    const colorB = new THREE.Color(0x88c040);
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
    roadGroup.add(tileInstMesh);
    this.roadTileInstMesh = tileInstMesh;
  }

  buildShoulderTiers() {
    const group = new THREE.Group();
    group.name = 'shoulder-tiers';
    this.scene.add(group);
    this.shoulderTiersGroup = group;

    // Smaller cubes (1.6 vs 2.3) keep wall tops below camera eye (y=4.0),
    // matching reference proportions where blocks are ~0.65× farmer height.
    const CUBE = 1.6;
    const grassGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const rockGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);

    // BoxGeometry face group order: +X, -X, +Y (top), -Y (bottom), +Z, -Z.
    // Grass cubes: top face gets grass sprite, sides get earthy dirt colour.
    const grassTopMat = new THREE.MeshStandardMaterial({
      map: this.textureCache.get(ASSETS.grassBlock), roughness: 0.9, metalness: 0,
    });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8b5234, roughness: 0.92, metalness: 0 });
    const grassMats = [dirtMat, dirtMat, grassTopMat, dirtMat, dirtMat, dirtMat];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7570, roughness: 0.95, metalness: 0 });

    // No brickCubes in shoulder tiers — purple structures come from sideProps sprites only,
    // keeping the shoulder wall uniformly brown with green tops (matching reference).
    // 500 instances: inner + outer columns × 2 sides × ~24 z-slots × 1-2 stack height.
    const grassCubes = new THREE.InstancedMesh(grassGeo, grassMats, 500);
    const rockCubes = new THREE.InstancedMesh(rockGeo, rockMat, 48);
    grassCubes.name = 'voxel-grass-cubes';
    rockCubes.name = 'voxel-rock-cubes';
    grassCubes.frustumCulled = false;
    rockCubes.frustumCulled = false;

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const rockScl = new THREE.Vector3();
    const hash = (n) => prand(n);
    let gi = 0;
    let ri = 0;
    for (let side = -1; side <= 1; side += 2) {
      let ci = 0;
      // Inner column: x range 3.7–4.0, just outside road edge (±2.725m).
      // Outer column: x = inner + CUBE (1.6m further) = 5.3–5.6, creates wide terraced shoulder.
      // Both sit on the 18m-wide ground plane (±9m), so outer column has visible green beneath.
      // Start at z=-3.2 (D=18.7m) — near cubes at z=5 (D=10.5m) and z=1.8 (D=13.7m) are off-FOV
      // or too large at screen edges; sideProps sprites cover that near-field range.
      for (let z = -3.2; z >= -70; z -= 3.2, ci += 1) {
        const h0 = hash((side + 2) * 131 + ci * 7);
        const h1 = hash((side + 2) * 131 + ci * 7 + 3);
        const h2 = hash((side + 2) * 131 + ci * 7 + 11);
        const xInner = side * (3.7 + h2 * 0.3);
        const xOuter = xInner + side * CUBE; // flush with inner cube's outer face
        const stack = 1 + Math.round(h1); // 1–2 cubes; tops stay below camera at y=4.0

        // Inner column — 1–2 cubes high
        for (let s = 0; s < stack && gi < 500; s += 1) {
          pos.set(xInner, s * CUBE + CUBE / 2, z);
          matrix.compose(pos, quat, one);
          grassCubes.setMatrixAt(gi, matrix);
          gi += 1;
        }
        // Outer column — always 1 cube high (step-down terrace matching reference platforms)
        if (gi < 500) {
          pos.set(xOuter, CUBE / 2, z);
          matrix.compose(pos, quat, one);
          grassCubes.setMatrixAt(gi, matrix);
          gi += 1;
        }

        // No wall-top mushrooms: y-center = stackTop + cap_half ≈ 5.1m sits above the
        // camera (y=4.0) and renders as a huge cap at the screen edges. sideProps handles mushrooms.
        if (ri < 48 && hash((side + 2) * 131 + ci * 7 + 23) > 0.88) {
          const rs = 0.5 + h2 * 0.28;
          pos.set(xInner - side * (1.0 + h1 * 0.8), rs * CUBE / 2, z + (h0 - 0.5) * 2.0);
          matrix.compose(pos, quat, rockScl.set(rs, rs, rs));
          rockCubes.setMatrixAt(ri, matrix);
          ri += 1;
        }
      }
    }
    grassCubes.count = gi;
    rockCubes.count = ri;
    grassCubes.instanceMatrix.needsUpdate = true;
    rockCubes.instanceMatrix.needsUpdate = true;
    group.add(grassCubes);
    group.add(rockCubes);
  }

  buildReferenceBackdrop() {
    const backdrop = new THREE.Group();
    backdrop.name = 'reference-backdrop';
    this.scene.add(backdrop);
    this.backdropGroup = backdrop;

    const add = (asset, x, y, z, w, h, options = {}) => {
      const sprite = this.makeSprite(asset, { x, y, z, width: w, height: h, ...options });
      sprite.material.depthTest = true;
      sprite.renderOrder = options.renderOrder ?? -20;
      backdrop.add(sprite);
      return sprite;
    };

    // y 1.0→-2.0, h=8.0: plane top drops from 33.4% to 45.6% from screen top.
    // Mountain silhouette peaks (18%) now show clearly above these panels.
    // Visible mountain zone: 18%–36.7% (forest silhouette canopy) = 18.7% of screen.
    // Canopy tops (v≈0.85) at y≈0.8m → screen 49.7%; forest fills the lower background.
    add(ASSETS.forest, -15, -2.0, -48, 36, 8.0, { opacity: 0.98, renderOrder: -35 });
    add(ASSETS.forest,  17, -2.0, -48, 36, 8.0, { opacity: 0.96, renderOrder: -35 });
    add(ASSETS.forest,   0, -2.0, -52, 32, 8.0, { opacity: 0.94, renderOrder: -35 });

    // Raised y 5.0→7.0: top=10.5m → atan(6.5/59.5)=6.24° → screen 9.1% from top.
    // Mountain peaks at 13% (after M68 silhouette raise), castle turrets at 9% → castle
    // peeks 4% above mountain ridge matching reference's "castle in the valley" framing.
    const castle = add(ASSETS.castle, 0, 7.0, -44, 8.0, 7.0, { opacity: 1.0, renderOrder: -10 });
    castle.material.fog = false;
  }

  buildReferenceSetPieces() {
    const group = new THREE.Group();
    group.name = 'reference-setpieces';
    this.scene.add(group);
    this.setpiecesGroup = group;

    const add = (asset, x, baseY, z, options = {}) => {
      const m = propMetrics(asset);
      let y = baseY + m.height / 2;
      if (asset === ASSETS.questionBlock) y += 1.3;
      const prop = this.makeProp(asset, { x, y, z, width: m.width, height: m.height, seed: x * 13.1 + z * 7.7, ...options });
      prop.renderOrder = options.renderOrder ?? 2;
      group.add(prop);
      return prop;
    };

    const sideProps = [
      // Trees — z=-13/-18 flanking near shoulder; z=-32/-35 visible at DIST≈25-30m edges
      [ASSETS.tree, -5.7, 0, -13], [ASSETS.tree, 5.5, 0, -18],
      // Left far tree: x=-5.5 → angle 13.7°=87% @ DIST=25m (was -7.0, just off-screen at 18°)
      [ASSETS.tree, -5.5, 0, -32], [ASSETS.tree, 5.6, 0, -35],
      // Mushrooms — near ones visible at game start (z=0.5 extends left window to ~7m)
      [ASSETS.mushroom, -2.0, 0, 0.5], [ASSETS.mushroom, 2.2, 0, 4.0],
      [ASSETS.mushroom, -3.3, 0, -1.5],
      [ASSETS.mushroom, 3.4, 0, -7.0],
      // Mid-distance mushroom pair
      // Left z=-23: 12.5m ahead @ DIST=26 — closer than purpleBrick at z=-25 (14.5m); x=-2.0
      //   inner corridor edge: 21.1% from left (324px) @ DIST=26 — clearly open corridor area
      // Right z=-26.5: 16m ahead @ DIST=26 — closer than purpleStairs at z=-28 → renders in front
      [ASSETS.mushroom, -2.0, 0, -23.0], [ASSETS.mushroom, 3.4, 0, -26.5],
      // Second mushroom pair at z=-30/-31 for "field of mushrooms" depth (DIST≈28-35m)
      [ASSETS.mushroom, -3.1, 0, -30.0], [ASSETS.mushroom, 3.1, 0, -31.0],
      // Pipe
      [ASSETS.pipe, 4.18, 0, -16],
      // Fences
      [ASSETS.fence, -4.8, 0, 3.1], [ASSETS.fence, 4.85, 0, -2.1],
      [ASSETS.fence, -5.1, 0, -28], [ASSETS.fence, 5.0, 0, -34],
      // Bushes
      [ASSETS.bush, -4.5, 0, -4.4], [ASSETS.bush, 4.6, 0, 1.8],
      // Grass-dirt blocks — closer to road, taller platforms form elevated wall
      [ASSETS.grassBlockLeft, -3.5, 0, 1.5],   [ASSETS.grassBlockRight, 3.5, 0, -4.5],
      [ASSETS.grassBlock, -3.6, 0, -9.5],       [ASSETS.grassBlock, 3.6, 0, -14.5],
      [ASSETS.grassBlockLeft, -3.5, 0, -19.0],  [ASSETS.grassBlockRight, 3.6, 0, -23.5],
      [ASSETS.grassBlock, -3.7, 0, -28.0],      [ASSETS.grassBlock, 3.6, 0, -33.0],
      // Purple structures — elevated to sit on top of voxel cube platforms
      // Near pair: visible early (DIST=0-22m). z=-12/-16 keeps them at 27-32m distance
      // at DIST=0, closer approach over the first 20m without ever getting overwhelming.
      [ASSETS.purpleWall, -3.2, 1.8, -12.0], [ASSETS.purpleBrick, 3.2, 1.8, -16.0],
      // Mid pair: visible at DIST=22-38m. z=-30 → dist=17.5m @ DIST=28 (was 12.5m at z=-25);
      // angular position 10°, screen width ~21% — matches reference's purple brick proportions.
      [ASSETS.purpleBrick, -3.1, 1.8, -30], [ASSETS.purpleStairs, 3.3, 1.8, -34],
      // Far pair: visible at DIST=35-50m for layered depth
      [ASSETS.purpleWall, -3.3, 1.8, -40], [ASSETS.purpleBrick, 3.3, 1.8, -46],
      [ASSETS.questionBlock, -3.9, 3.8, -14],
      [ASSETS.questionBlock, 4.0, 3.8, -22],
      // Flowers — very near foreground (fills lower-quarter between player and wall)
      [ASSETS.flowersYellow, -2.3, 0, 5.5], [ASSETS.flowersYellow, 2.2, 0, 6.0],
      [ASSETS.flowersPurple, -3.0, 0, 4.5], [ASSETS.flowersPurple, 3.1, 0, 4.0],
      [ASSETS.flowersYellow, -3.5, 0, 2.0], [ASSETS.flowersYellow, 3.4, 0, 1.5],
      // Flowers — near road edge
      [ASSETS.flowersPurple, -3.45, 0, -11], [ASSETS.flowersPurple, 3.35, 0, -12.8],
      [ASSETS.flowersPurple, -3.2, 0, -24], [ASSETS.flowersPurple, 3.2, 0, -30],
      [ASSETS.flowersYellow, -2.8, 0, 0.8], [ASSETS.flowersYellow, 2.65, 0, -3.6],
      [ASSETS.flowersPurple, -2.9, 0, -6.0], [ASSETS.flowersPurple, 3.0, 0, -8.0],
      [ASSETS.flowersYellow, -3.3, 0, -17.0], [ASSETS.flowersYellow, 3.3, 0, -36.0],
      // Flowers — outer shoulder fill (matches reference's flower-covered meadow)
      [ASSETS.flowersPurple, -6.2, 0, -4.0], [ASSETS.flowersPurple, 6.0, 0, -7.5],
      [ASSETS.flowersPurple, -6.5, 0, -16.0], [ASSETS.flowersPurple, 6.3, 0, -21.0],
      [ASSETS.flowersYellow, -5.8, 0, -1.5], [ASSETS.flowersYellow, 5.6, 0, -9.0],
      [ASSETS.flowersYellow, -6.0, 0, -22.0], [ASSETS.flowersYellow, 6.1, 0, -29.5],
      // Spiky/dry accents just behind the player — match reference right-side spiky plant
      [ASSETS.dryGrass, 3.4, 0, -6.5], [ASSETS.spikyBush, -3.2, 0, -5.0],
    ];

    for (const [asset, x, baseY, z] of sideProps) add(asset, x, baseY, z);

    for (const vz of [-12, -27]) {
      const vine = this.makeProp(ASSETS.vineBarrier, { x: 0, y: 0.7, z: vz, width: 6.4, height: 1.6 });
      vine.renderOrder = 2;
      group.add(vine);
    }

    // Outer meadow tuft carpet — wider x positions match reference's flower-covered shoulder
    for (let i = 0; i < 22; i += 1) {
      const r = prand(i * 7.3 + 41);
      const r2 = prand(i * 4.9 + 53);
      const z = 3 - i * 2.3;
      const m = propMetrics(ASSETS.grassTuft);
      const tw = m.width * 0.55;
      const th = m.height * 0.55;
      const tuft = this.makeProp(ASSETS.grassTuft, {
        x: (r2 > 0.5 ? 1 : -1) * (5.5 + r * 2.5), y: th / 2, z, width: tw, height: th, seed: i * 23.7,
      });
      tuft.renderOrder = 2;
      group.add(tuft);
    }

    for (let i = 0; i < 40; i += 1) {
      const r = prand(i * 3.1 + 1);
      const r2 = prand(i * 5.7 + 2);
      const z = 4 - i * 2.1;
      if (r > 0.45) {
        const m = propMetrics(ASSETS.grassTuft);
        const tw = m.width * 0.5;
        const th = m.height * 0.5;
        const tuft = this.makeProp(ASSETS.grassTuft, {
          x: (r2 > 0.5 ? 1 : -1) * (3.1 + r * 1.9), y: th / 2, z, width: tw, height: th, seed: i * 17.3,
        });
        tuft.renderOrder = 2;
        group.add(tuft);
      } else {
        const pebble = new THREE.Mesh(
          new THREE.PlaneGeometry(0.6, 0.4),
          new THREE.MeshBasicMaterial({ color: r > 0.22 ? 0x837a6c : 0x4f7a34, transparent: true, opacity: 0.5, depthWrite: false, fog: true }),
        );
        pebble.rotation.x = -Math.PI / 2;
        pebble.position.set((r2 - 0.5) * 4.6, 0.03, z);
        pebble.scale.setScalar(0.7 + r2 * 0.8);
        pebble.renderOrder = 1;
        pebble.name = 'debris-pebble';
        group.add(pebble);
      }
    }

    const fov = this.cameras?.perspective?.fov ?? PERSPECTIVE_FOV;
    const zStep = 3.7 * (30 / fov);
    this.trailFlowers = [];
    for (let i = 0; i < 9; i += 1) {
      const z = -10 - i * zStep;
      if (z < -44) break;
      const x = (i % 3 - 1) * 0.9;
      const scale = Math.max(0.55, 1.05 - i * 0.025);
      const opacity = Math.max(0.1, 0.62 - i * 0.07);
      const w = 0.72 * scale;
      const flower = this.makeSprite(ASSETS.goldFlower, { x, y: 0.62, z, width: w, height: w, opacity });
      flower.renderOrder = 100 - i;
      group.add(flower);
      this.trailFlowers.push({ sprite: flower, baseW: w, baseH: w, baseOpacity: opacity, idx: i, phase: i * 1.7 });
    }
  }

  sceneryLaneX(lane, band) {
    const remapped = this.projection.remapLaneForBand(lane, band);
    return remapped * 1.18;
  }

  scenerySpriteAsset(sprite) {
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
    if (t.includes('vine')) return ASSETS.vineBarrier;
    if (t.includes('dry_grass')) return ASSETS.dryGrass;
    if (t.includes('spiky') || t.includes('bush')) return ASSETS.spikyBush;
    return null;
  }

  entitySpriteAsset(sprite, category) {
    const t = sprite?.assetType ?? sprite?.type ?? '';
    if (category === 'collectible') {
      if (t.includes('heart') || t.includes('life')) return ASSETS.heart;
      return ASSETS.orchidGold;
    }
    return this.scenerySpriteAsset(sprite);
  }

  buildHorizon() {
    const group = new THREE.Group();
    group.name = 'horizon-cylinders';
    this.scene.add(group);
    this.horizonGroup = group;

    const pcam = this.cameras?.perspective;
    group.position.set(pcam?.position.x ?? 0, 0, pcam?.position.z ?? 13);

    const NOTCH_HALF = 0.85;
    const NOTCH_CENTER = Math.PI / 2;
    const notchStart = NOTCH_CENTER + NOTCH_HALF;
    const notchLength = Math.PI * 2 - NOTCH_HALF * 2;

    const layers = [
      // Reduced scaleY so cylinder tops are near/below camera y=4.0, pushing mountains into the
      // mid-screen zone and opening a wider sky band (target ~20%) above them.
      // Near: top at y=3.8m (below camera) → screen 26% — defines sky/mountain boundary.
      // Mid: top at y=5.0m → screen 12% — mid peaks visible in sky gap above near.
      // Far: top at y=6.3m → screen 9% — distant peaks just below sky top.
      // Tints pushed to vivid saturated lime-green matching reference's bright mountain peaks.
      // scaleY +0.04 across all layers: far top 6.3→7.0m (body fills down from 29% not 32%),
      // giving each layer a slightly more prominent valley-fill against the deeper sky.
      [ASSETS.mountainsFar, 100, 28, 4.5, 0xb4ff38, true, 0.12, 0.50],
      [ASSETS.mountainsMid,  80, 24, 4.0, 0x96e038, true, 0.44, 0.46],
      [ASSETS.mountainsNear, 62, 20, 3.5, 0x80d030, true, 0.72, 0.42],
    ];

    for (const [assetPath, radius, height, repeatX, tint, notched, offsetX, scaleY] of layers) {
      const geo = notched
        ? new THREE.CylinderGeometry(radius, radius, height, 64, 1, true, notchStart, notchLength)
        : new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
      const tex = this.textureLoader.load(`./assets/${assetPath}`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(repeatX, 1);
      tex.offset.x = offsetX;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: tint,
        alphaTest: 0.5,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        side: THREE.BackSide,
        fog: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `horizon:${assetPath}`;
      // Lowered from 2.2 to 0 so mountain tops appear at ~17% from screen top,
      // revealing ~17% sky gap above them (matches reference's ~20% sky band).
      mesh.position.y = 0;
      mesh.scale.y = scaleY;
      mesh.frustumCulled = false;
      mesh.renderOrder = -40;
      group.add(mesh);
    }

    const skirt = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 48),
      new THREE.MeshBasicMaterial({ color: HAZE_COLOR, fog: true }),
    );
    skirt.name = 'horizon-skirt';
    skirt.position.set(0, -22, -120);
    skirt.frustumCulled = false;
    group.add(skirt);
  }

  buildFarSilhouettes() {
    const group = new THREE.Group();
    group.name = 'far-silhouettes';
    this.scene.add(group);
    this.farSilhouettesGroup = group;
    // renderOrder -38/-37/-36: behind backdrop forest (-35) so forest line shows in front of mountain shapes
    const layers = [
      // Mountain plane z=-65→z=-58, y=6.0→5.5: keep peaks at 18% from screen top.
      // D=73.5m (was 80.5m): mountain texture 10% taller on screen, peak triangles more distinct.
      // Tint 0xb4f040→0xb4ff38: G channel maxed for richer lime-green matching reference vibrancy.
      // h 22→28, y_center -0.6→-2.85 to keep peaks at 22%:
      // y_peak = -2.85 + 28*(0.875-0.5) = -2.85+10.5 = 7.65m → screen 22% ✓
      // Taller mountain profile: visible zone 22-43% shows UV 0.698-0.875 (was 0.65-0.875 with h=22).
      // Steeper triangle slopes → more dramatic peak silhouette matching reference's tall mountains.
      [ASSETS.mountainsFar, -46, -2.85, 170, 28, 0xb4ff38, -38],
      // y -2.0→-3.5: top drops from 37.5% to 43% from screen top.
      // Mountain window widens: 22–43% = 21% (was 18–37.5% = 19.5%).
      // Reference forest line starts at ~42–43%, matching this value.
      [ASSETS.forest, -56, -3.5, 140, 12, 0x78cc34, -37],
    ];
    // Horizon bridge — fills below the mountain zone.
    // y -3.0→-4.4: top at y=-4.4+7=2.6m → screen (8.24-atan(-1.4/64.5)*57.3)/22 = 43.8%.
    // Matches forest silhouette top (43%) to avoid gap between bridge and forest layer.
    const bridge = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 14),
      new THREE.MeshBasicMaterial({ color: 0x90ee38, depthTest: false, depthWrite: false, fog: false }),
    );
    bridge.name = 'horizon-bridge';
    bridge.position.set(0, -4.4, -49);
    bridge.renderOrder = -36;
    bridge.frustumCulled = false;
    group.add(bridge);
    for (const [asset, z, y, w, h, tint, ro] of layers) {
      // textureCache repeat=1 (no repeat set). Mountain plane w=170, visible screen width
      // at D=61.5m ≈ 42.4m (25% of 170). With repeat=1 only 25% of one texture tile shows
      // → ~1 partial peak. Need repeat=4 so visible 25% × 4 = 1 full tile = 5 peaks on screen.
      // Forest silhouette (w=140, D=71.5m, visible 49m) gets repeat=3 for ~3 repeats visible.
      const baseTex = this.textureCache.get(asset);
      const repeatX = (asset === ASSETS.mountainsFar) ? 4 : 3;
      let tex = baseTex;
      if (repeatX !== 1) {
        tex = baseTex.clone();
        tex.wrapS = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, 1);
        tex.needsUpdate = true;
      }
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, color: tint, transparent: true, alphaTest: 0.5, depthWrite: false, fog: false }),
      );
      mesh.name = `far-silhouette:${asset}`;
      mesh.position.set(0, y, z);
      mesh.renderOrder = ro;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }

  buildOrthoBackdrop() {
    const cam = this.cameras.orthographic;
    cam.position.set(0, 15, 16);
    cam.lookAt(0, 1, -14);
    cam.zoom = 1.0;
    cam.updateProjectionMatrix();

    const group = new THREE.Group();
    group.name = 'ortho-screen-backdrop';
    if (!cam.parent) this.scene.add(cam);
    cam.add(group);
    this.orthoScreenGroup = group;

    const aspect = (this.projection?.width ?? 1536) / (this.projection?.height ?? 864);
    const halfH = ORTHO_HEIGHT / (2 * cam.zoom);
    const halfW = halfH * aspect;
    const FAR = -700;
    const width = halfW * 2.6;

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

    const bands = [
      [ASSETS.mountainsFar,  0.60, 0.28, FAR + 6,  -49, 3.0],
      [ASSETS.mountainsNear, 0.52, 0.24, FAR + 12, -48, 2.4],
    ];
    this.orthoMountains = [];
    for (const [assetPath, heightMul, yMul, z, renderOrder, repeatX] of bands) {
      const map = this.loadRepeatTexture(assetPath, repeatX);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, halfH * heightMul),
        new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, depthWrite: false, fog: false }),
      );
      mesh.name = `ortho-screen-mountain:${assetPath}`;
      mesh.position.set(0, halfH * yMul, z);
      mesh.renderOrder = renderOrder;
      mesh.frustumCulled = false;
      group.add(mesh);
      this.orthoMountains.push(mesh);
    }
  }

  buildCloudCanopy() {
    const group = new THREE.Group();
    group.name = 'cloud-canopy';
    this.scene.add(group);
    this.cloudGroup = group;

    // CAP=10 spread linearly across full sky width (x: -17 to +17m).
    // Prior ring placement (theta=PI*1.5 ±0.5 rad) clustered clouds; some fell outside the
    // ±19° horizontal half-FOV at their respective radii, leaving large gaps.
    // Linear sector distribution guarantees even coverage: at D≈65m, ±17m ≈ ±14.6° < 19° FOV.
    const CAP = 10;
    // z=-55 to -65: at y=11–13m all clouds land 4–15% from screen top (sky zone 0–18%).
    // Scale 0.80–1.30 on 9×5.5 base → each cloud ~20–35% screen width; naturally overlapping.
    const yBase = 11;
    for (let i = 0; i < CAP; i += 1) {
      const r = prand(i * 1.7 + 1);
      // Evenly-spaced sectors: 0.05 → 0.95 (symmetric), with small jitter so clouds don't look gridded.
      const sector = (i + 0.5) / CAP;
      const x = (sector - 0.5) * 34 + (prand(i * 3.1 + 2) - 0.5) * 4;
      const z = -55 - r * 10;  // z: -55 to -65
      const h = yBase + prand(i * 7.7 + 3) * 2;
      const asset = r > 0.65 ? ASSETS.cloudLarge : r > 0.3 ? ASSETS.cloudMedium : ASSETS.cloudSmall;
      // 0.80–1.30 range on 9×5.5 base: each cloud 20–35% of screen width, matching reference prominence.
      const scale = 0.80 + prand(i * 11.1 + 4) * 0.50;
      // Billboard sprite always faces camera, visible from any orbit angle
      const mat = new THREE.SpriteMaterial({
        map: this.textureCache.get(asset),
        transparent: true,
        opacity: 1.0,
        alphaTest: 0.1,
        fog: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      // 9×5.5 world-unit base (was 7.5×4.5); at scale 0.80–1.30 each cloud is 20–35% screen width
      sprite.scale.set(9 * scale, 5.5 * scale, 1);
      sprite.position.set(x, h, z);
      sprite.renderOrder = -14;
      group.add(sprite);
    }
  }

  loadRepeatTexture(assetPath, repeatX) {
    const tex = this.textureLoader.load(`./assets/${assetPath}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(repeatX, 1);
    return tex;
  }

  makeSprite(assetPath, { x, y, z, width, height, opacity = 1 }) {
    const tex = this.textureCache.get(assetPath);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, alphaTest: 0.15, depthWrite: false, fog: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  makeProp(assetPath, { x, y, z, width, height, seed, opacity = 1 }) {
    const tex = this.textureCache.get(assetPath);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, opacity, alphaTest: 0.45, roughness: 0.9, metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.position.set(x, y, z);
    if (ORGANIC_ASSETS.has(assetPath)) {
      const r = prand(seed ?? x + z);
      mesh.scale.x *= (r > 0.5 ? 1 : -1);
      mesh.scale.setScalar(mesh.scale.x * (0.9 + (r % 0.2) * 1.1));
      mesh.rotation.y = (r - 0.5) * 0.24;
    }
    return mesh;
  }

  buildGrassTexture(name, repeatX, repeatY) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#62cc2a';
    ctx.fillRect(0, 0, 64, 64);
    // Use deterministic noise so QA screenshots are reproducible.
    const seed = name === 'ground' ? 1000 : name === 'road' ? 2000 : 3000;
    for (let i = 0; i < 40; i += 1) {
      const x = prand(seed + i * 2.1) * 64;
      const y = prand(seed + i * 3.7) * 64;
      const w = 1 + prand(seed + i * 5.3) * 2;
      ctx.fillStyle = prand(seed + i * 7.1) > 0.5 ? '#74d830' : '#52b824';
      ctx.fillRect(x, y, w, w);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
  }

  dispose() {
    this.skyGradientTex?.dispose();
    this.envTexture?.dispose();
    // textureCache is shared — disposed by ThreeSceneRenderer.
  }
}
