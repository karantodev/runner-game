import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { RoomEnvironment } from '../../../../node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import {
  ASSETS, FARMER_UNIT, BLOB_SKIP, WINDY_ASSETS, ORGANIC_ASSETS,
  prand, propMetrics,
} from './threeAssetManifest.js';

const ORTHO_HEIGHT = 28;
const PERSPECTIVE_FOV = 18;
const HAZE_COLOR = 0xccd0e4;

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
    this.scene.fog = new THREE.FogExp2(HAZE_COLOR, 0.010);

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
    const grad = ctx.createLinearGradient(0, 512, 0, 0);
    grad.addColorStop(0, '#ccd0e4');
    grad.addColorStop(0.35, '#cfe8f2');
    grad.addColorStop(1, '#78bff2');
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
    this.scene.environmentIntensity = 0.65;
    disposeObject3D(roomEnv);
    pmrem.dispose();
  }

  buildCameras() {
    const aspect = (this.projection?.width ?? 1536) / (this.projection?.height ?? 864);
    const perspective = new THREE.PerspectiveCamera(PERSPECTIVE_FOV, aspect, 0.1, 900);
    perspective.position.set(0, 4.0, 15.5);
    perspective.lookAt(0, 2.4, -26);

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
    this.scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x6f9a52, 1.5));
    const sun = new THREE.DirectionalLight(0xfff3d6, 2.2);
    sun.position.set(-5, 8, 5);
    sun.castShadow = false;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8fd8ff, 0.75);
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
    applyDepthGradientColors(roadGeo, 0xc8d6ad, 0xffffff);
    const road = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({ color: 0xd8edbe, map: this.buildGrassTexture('road', 3, 55), roughness: 0.92, metalness: 0, vertexColors: true }),
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
    roadGroup.add(tileInstMesh);
    this.roadTileInstMesh = tileInstMesh;
  }

  buildShoulderTiers() {
    const group = new THREE.Group();
    group.name = 'shoulder-tiers';
    this.scene.add(group);
    this.shoulderTiersGroup = group;

    const CUBE = 1.9;
    const grassGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const brickGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const rockGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);

    // BoxGeometry face group order: +X, -X, +Y (top), -Y (bottom), +Z, -Z.
    // Grass cubes: top face gets grass sprite, sides get dirt color.
    const grassTopMat = new THREE.MeshStandardMaterial({
      map: this.textureCache.get(ASSETS.grassBlock), roughness: 0.9, metalness: 0,
    });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.95, metalness: 0 });
    const grassMats = [dirtMat, dirtMat, grassTopMat, dirtMat, dirtMat, dirtMat];

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x7a5fa0, roughness: 0.8, metalness: 0 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7570, roughness: 0.95, metalness: 0 });

    const grassCubes = new THREE.InstancedMesh(grassGeo, grassMats, 128);
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
    const hash = (n) => prand(n);
    const tops = [];
    let gi = 0;
    let bi = 0;
    let ri = 0;
    for (let side = -1; side <= 1; side += 2) {
      let ci = 0;
      for (let z = 5; z >= -70; z -= 6.0, ci += 1) {
        const h0 = hash((side + 2) * 131 + ci * 7);
        const h1 = hash((side + 2) * 131 + ci * 7 + 3);
        const h2 = hash((side + 2) * 131 + ci * 7 + 11);
        const x = side * (6.7 + h2 * 1.1);
        if (h0 > 0.55) {
          const stack = 1 + Math.round(h1);
          const base = CUBE * (0.8 + h2 * 0.8);
          for (let s = 0; s < stack && bi < 128; s += 1) {
            pos.set(x, base + s * CUBE + CUBE / 2, z);
            matrix.compose(pos, quat, one);
            brickCubes.setMatrixAt(bi, matrix);
            bi += 1;
          }
        } else {
          const stack = 1 + Math.floor(h1 * 2.99);
          for (let s = 0; s < stack && gi < 128; s += 1) {
            pos.set(x, s * CUBE + CUBE / 2, z);
            matrix.compose(pos, quat, one);
            grassCubes.setMatrixAt(gi, matrix);
            gi += 1;
          }
          if (stack >= 2) tops.push({ x, y: stack * CUBE, z, stack });
        }
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

    for (const t of tops) {
      const asset = t.stack >= 3 ? ASSETS.mushroom : ASSETS.tree;
      const m = propMetrics(asset);
      const prop = this.makeProp(asset, { x: t.x, y: t.y + m.height / 2, z: t.z, width: m.width, height: m.height, seed: t.x * 13.1 + t.z * 7.7 });
      prop.renderOrder = 2;
      group.add(prop);
    }
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

    add(ASSETS.forest, -11, 2.2, -51, 26, 7.0, { opacity: 0.98, renderOrder: -35 });
    add(ASSETS.forest, 13, 2.2, -52, 26, 7.0, { opacity: 0.96, renderOrder: -35 });

    const castle = add(ASSETS.castle, 0, 5.5, -46, 9.0, 9.0, { opacity: 1.0, renderOrder: -10 });
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
    ];

    for (const [asset, x, baseY, z] of sideProps) add(asset, x, baseY, z);

    for (const vz of [-12, -27]) {
      const vine = this.makeProp(ASSETS.vineBarrier, { x: 0, y: 0.6, z: vz, width: 5.6, height: 1.05 });
      vine.renderOrder = 2;
      group.add(vine);
    }

    for (let i = 0; i < 26; i += 1) {
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
      [ASSETS.mountainsFar, 200, 28, 4.5, 0xdaf0e2, true, 0.0, 0.32],
      [ASSETS.mountainsMid, 175, 24, 4.0, 0xffffff, true, 0.37, 0.40],
      [ASSETS.mountainsNear, 150, 20, 3.5, 0xffffff, true, 0.68, 0.31],
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
        fog: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `horizon:${assetPath}`;
      mesh.position.y = 1.2;
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
    const layers = [
      [ASSETS.mountainsFar, -82, 6.5, 190, 36, 0xc4cbe0, -20],
      [ASSETS.forest, -72, 3.6, 150, 16, 0x9fb0c4, -19],
    ];
    for (const [asset, z, y, w, h, tint, ro] of layers) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: this.textureCache.get(asset), color: tint, transparent: true, alphaTest: 0.5, depthWrite: false, fog: false }),
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

    const CAP = 14;
    const rBase = 80;
    const yBase = 18;
    for (let i = 0; i < CAP; i += 1) {
      const r = prand(i * 1.7 + 1);
      const theta = prand(i * 3.1 + 2) * Math.PI * 2;
      const radius = rBase + r * 30;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const h = yBase + prand(i * 7.7 + 3) * 12;
      const asset = r > 0.65 ? ASSETS.cloudLarge : r > 0.3 ? ASSETS.cloudMedium : ASSETS.cloudSmall;
      const scale = 0.8 + prand(i * 11.1 + 4) * 0.7;
      const sprite = this.makeSprite(asset, { x, y: h, z, width: 14 * scale, height: 8 * scale, opacity: 0.85 });
      sprite.renderOrder = -45;
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
    ctx.fillStyle = '#6f9a52';
    ctx.fillRect(0, 0, 64, 64);
    // Use deterministic noise so QA screenshots are reproducible.
    const seed = name === 'ground' ? 1000 : name === 'road' ? 2000 : 3000;
    for (let i = 0; i < 40; i += 1) {
      const x = prand(seed + i * 2.1) * 64;
      const y = prand(seed + i * 3.7) * 64;
      const w = 1 + prand(seed + i * 5.3) * 2;
      ctx.fillStyle = prand(seed + i * 7.1) > 0.5 ? '#7eb05d' : '#5d8145';
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
