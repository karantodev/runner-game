import * as THREE from '../../../../node_modules/three/build/three.module.js';

const RENDER_SIZE = 320;

const MODEL_SIZE = Object.freeze({
  cube: [116, 92],
  platform: [190, 76],
  steps: [170, 118],
  question: [92, 92],
  hangingPlatform: [150, 106],
  smallFlower: [42, 62],
  sprout: [42, 62],
  wheat: [78, 76],
  leafClump: [96, 66],
  grassTuft: [68, 54],
  vineBarrier: [180, 74],
  overhang: [188, 112],
  pickupFlower: [58, 76],
  heart: [68, 62],
  power: [62, 62],
  fence: [150, 96],
  pipe: [86, 118],
  planter: [82, 102],
  mushroom: [142, 120],
  bush: [150, 94],
  tree: [178, 220],
  player: [130, 230],
});

const PALETTES = Object.freeze({
  grass: { top: 0x7ed53d, front: 0xa35c27, side: 0x5b2d1a, dark: 0x1b2a14 },
  stone: { top: 0xaaa29b, front: 0x746d6a, side: 0x4a4646, dark: 0x2a2727 },
  purple: { top: 0xad71e6, front: 0x7b3ec6, side: 0x422178, dark: 0x1f123d },
  wood: { top: 0xd58a3d, front: 0xb8662d, side: 0x74401f, dark: 0x2b1a12 },
  question: { top: 0xffce4d, front: 0xe0900f, side: 0x94530c, dark: 0x482809 },
  leaf: { top: 0x74c957, front: 0x3fa34d, side: 0x1f6f38, dark: 0x123720 },
});

function normalizeKind(kind) {
  return MODEL_SIZE[kind] ? kind : 'cube';
}

function stableKey(kind, options) {
  const parts = [kind];
  for (const key of ['material', 'variant', 'large', 'flowers', 'dry', 'rare', 'rich', 'color', 'pose', 'frameIndex', 'tilt', 'tint', 'side']) {
    if (options?.[key] !== undefined) parts.push(`${key}:${String(options[key])}`);
  }
  return parts.join('|');
}

function parseColor(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;
  const hex = value.trim().replace('#', '');
  const parsed = Number.parseInt(hex, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimTransparentPixels(source, padding = 8) {
  const readable = document.createElement('canvas');
  readable.width = source.width;
  readable.height = source.height;
  const readableCtx = readable.getContext('2d', { willReadFrequently: true });
  readableCtx.drawImage(source, 0, 0);
  const ctx = readableCtx;
  const { width, height } = readable;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return readable;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d').drawImage(readable, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function mat(color, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
    flatShading: true,
  });
}

function addBox(group, {
  x = 0, y = 0, z = 0, w = 1, h = 1, d = 1,
  color = 0xffffff, roughness,
  rotX = 0, rotY = 0, rotZ = 0,
}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, roughness));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotX, rotY, rotZ);
  group.add(mesh);
  return mesh;
}

function addEllipsoid(group, {
  x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1,
  color = 0xffffff, roughness,
}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), mat(color, roughness));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function addCylinder(group, {
  x = 0, y = 0, z = 0, r = 0.4, h = 1, color = 0xffffff,
  radialSegments = 12, rotX = 0, rotY = 0, rotZ = 0,
}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, radialSegments), mat(color));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotX, rotY, rotZ);
  group.add(mesh);
  return mesh;
}

function addGroundShadow(group, w = 2.2, d = 0.9) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({ color: 0x140e08, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(w, d, 1);
  mesh.position.set(0, -1.04, 0.04);
  group.add(mesh);
}

function buildBlock(group, options = {}) {
  const p = PALETTES[options.material] ?? PALETTES.grass;
  addGroundShadow(group, 1.85, 0.72);
  addBox(group, { w: 1.72, h: 1.05, d: 1.08, y: -0.36, color: p.front });
  addBox(group, { w: 1.72, h: 0.18, d: 1.12, y: 0.26, color: p.top });
  addBox(group, { x: 0.88, w: 0.16, h: 1.0, d: 1.08, y: -0.39, color: p.side });
  if ((options.material ?? 'grass') === 'grass') {
    for (let i = 0; i < 9; i += 1) addBox(group, { x: -0.76 + i * 0.19, y: 0.08 - (i % 3) * 0.04, z: 0.56, w: 0.055, h: 0.34, d: 0.07, color: PALETTES.leaf.front });
    for (let i = 0; i < 8; i += 1) addBox(group, { x: -0.68 + i * 0.20, y: -0.45 + (i % 4) * 0.12, z: 0.57, w: 0.10, h: 0.04, d: 0.04, color: 0x6f3a1e });
    for (let i = 0; i < 4; i += 1) addEllipsoid(group, { x: -0.56 + i * 0.34, y: 0.40, z: -0.20 + (i % 2) * 0.24, sx: 0.10, sy: 0.04, sz: 0.07, color: i % 2 ? 0xb05cff : 0xffd94d });
  } else {
    for (let i = 0; i < 7; i += 1) addBox(group, { x: -0.72 + i * 0.24, y: -0.16 + (i % 3) * 0.18, z: 0.57, w: 0.16, h: 0.035, d: 0.04, color: p.dark });
  }
  addBox(group, { x: -0.42, y: 0.30, z: 0.58, w: 0.42, h: 0.035, d: 0.04, color: 0xdfffa0 });
}

function buildPlatform(group, options = {}) {
  buildBlock(group, { ...options, material: options.material ?? 'grass' });
  group.scale.x = 1.8;
  group.scale.y = 0.62;
}

function buildSteps(group, options = {}) {
  const p = PALETTES[options.material] ?? PALETTES.stone;
  addGroundShadow(group, 1.7, 0.7);
  for (let i = 0; i < 3; i += 1) {
    addBox(group, { x: -0.52 + i * 0.52, y: -0.72 + i * 0.24, z: -0.06 * i, w: 0.72, h: 0.58 + i * 0.34, d: 0.92, color: p.front });
    addBox(group, { x: -0.52 + i * 0.52, y: -0.40 + i * 0.41, z: -0.06 * i, w: 0.72, h: 0.09, d: 0.96, color: p.top });
    addBox(group, { x: -0.72 + i * 0.52, y: -0.74 + i * 0.27, z: 0.48, w: 0.18, h: 0.04, d: 0.04, color: p.dark });
  }
}

function buildQuestion(group) {
  buildBlock(group, { material: 'question' });
  const q = 0x6a3c0c;
  for (const [x, y] of [[-0.2, 0.04], [0, 0.12], [0.2, 0.04], [0.18, -0.16], [0, -0.34], [0, -0.62]]) {
    addBox(group, { x, y, z: 0.62, w: 0.14, h: 0.14, d: 0.05, color: q });
  }
}

function buildFence(group) {
  const p = PALETTES.wood;
  addGroundShadow(group, 1.7, 0.34);
  for (let i = 0; i < 4; i += 1) addBox(group, { x: -0.72 + i * 0.48, y: -0.42, w: 0.13, h: 1.05, d: 0.12, color: p.front });
  addBox(group, { y: -0.18, w: 1.75, h: 0.16, d: 0.13, color: p.top });
  addBox(group, { y: -0.58, w: 1.65, h: 0.15, d: 0.13, color: p.front });
}

function buildPipe(group) {
  addGroundShadow(group, 0.85, 0.42);
  addCylinder(group, { y: -0.34, r: 0.38, h: 1.26, color: 0x2aa43a, radialSegments: 18 });
  addCylinder(group, { y: 0.38, r: 0.50, h: 0.30, color: 0x73df55, radialSegments: 18 });
  addCylinder(group, { y: 0.48, r: 0.32, h: 0.08, color: 0x0d3b22, radialSegments: 18 });
  addBox(group, { x: -0.16, y: -0.28, z: 0.38, w: 0.08, h: 0.74, d: 0.04, color: 0x8bf276 });
}

function buildPlanter(group) {
  addGroundShadow(group, 0.82, 0.42);
  addBox(group, { y: -0.55, w: 0.82, h: 0.58, d: 0.62, color: 0xb85f31 });
  addBox(group, { y: -0.22, w: 0.92, h: 0.12, d: 0.70, color: 0xe08a4a });
  addEllipsoid(group, { y: 0.15, sx: 0.58, sy: 0.16, sz: 0.34, color: 0x4f2919 });
  for (let i = 0; i < 5; i += 1) addEllipsoid(group, { x: -0.35 + i * 0.17, y: 0.42 + (i % 2) * 0.09, sx: 0.18, sy: 0.42, sz: 0.08, color: i % 2 ? 0x74c957 : 0x3fa34d });
}

function buildMushroom(group, options = {}) {
  const cap = options.variant === 'blue' ? 0x4c8fe8 : options.variant === 'purple' ? 0x9a55d8 : 0xd94836;
  addGroundShadow(group, 1.0, 0.45);
  addCylinder(group, { y: -0.48, r: 0.20, h: 0.88, color: 0xf1d39a, radialSegments: 10 });
  addEllipsoid(group, { y: 0.07, sx: 1.08, sy: 0.42, sz: 0.70, color: cap });
  addEllipsoid(group, { x: -0.12, y: 0.25, z: 0.08, sx: 0.46, sy: 0.12, sz: 0.20, color: options.variant === 'blue' ? 0x70b7ff : options.variant === 'purple' ? 0xc283f1 : 0xef7358 });
  for (let i = 0; i < 5; i += 1) addEllipsoid(group, { x: -0.42 + i * 0.22, y: 0.20 + (i % 2) * 0.08, z: 0.32, sx: 0.12, sy: 0.07, sz: 0.04, color: 0xffe2c8 });
}

function buildBush(group, options = {}) {
  addGroundShadow(group, options.large ? 1.45 : 1.0, 0.48);
  const count = options.large ? 9 : 6;
  for (let i = 0; i < count; i += 1) {
    addEllipsoid(group, { x: -0.70 + (i % 5) * 0.34, y: -0.38 + Math.floor(i / 5) * 0.26 + (i % 2) * 0.08, z: (i % 3) * 0.08, sx: 0.44, sy: 0.34, sz: 0.34, color: i % 2 ? 0x3fa34d : 0x74c957 });
  }
  if (options.flowers) for (let i = 0; i < 5; i += 1) addEllipsoid(group, { x: -0.48 + i * 0.24, y: -0.13 + (i % 2) * 0.18, z: 0.36, sx: 0.06, sy: 0.06, sz: 0.04, color: i % 2 ? 0xb05cff : 0xf3d14b });
  addEllipsoid(group, { x: -0.28, y: 0.02, z: 0.28, sx: 0.28, sy: 0.07, sz: 0.06, color: 0x9ce36a });
}

function buildTree(group) {
  addGroundShadow(group, 1.05, 0.48);
  addCylinder(group, { y: -0.56, r: 0.16, h: 1.18, color: 0xb8662d, radialSegments: 8 });
  addCylinder(group, { x: -0.25, y: -0.08, r: 0.06, h: 0.58, color: 0x74401f, radialSegments: 7, rotZ: 0.72 });
  addCylinder(group, { x: 0.25, y: -0.02, r: 0.06, h: 0.58, color: 0x74401f, radialSegments: 7, rotZ: -0.72 });
  for (let i = 0; i < 9; i += 1) addEllipsoid(group, { x: -0.65 + (i % 5) * 0.32, y: 0.12 + Math.floor(i / 5) * 0.35 + (i % 2) * 0.10, z: (i % 3) * 0.08, sx: 0.52, sy: 0.42, sz: 0.42, color: i % 2 ? 0x3fa34d : 0x74c957 });
  addEllipsoid(group, { x: -0.16, y: 0.55, z: 0.24, sx: 0.34, sy: 0.10, sz: 0.08, color: 0x9ce36a });
}

function buildGrassLike(group, kind, options = {}) {
  addGroundShadow(group, 0.55, 0.22);
  const dry = options.dry || kind === 'wheat';
  const color = dry ? 0xd8b24b : 0x67bd3d;
  for (let i = 0; i < 8; i += 1) {
    addBox(group, { x: -0.46 + i * 0.13, y: -0.52 + (i % 3) * 0.04, w: 0.035, h: 0.72 - (i % 3) * 0.12, d: 0.035, color, rotZ: (-0.2 + (i % 5) * 0.1) });
  }
}

function buildFlower(group, options = {}) {
  addGroundShadow(group, 0.35, 0.18);
  const rare = options.rare;
  const petal = rare ? 0x5ab8ff : 0xffd54a;
  addCylinder(group, { y: -0.44, r: 0.025, h: 0.74, color: 0x3fa34d, radialSegments: 6 });
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    addEllipsoid(group, { x: Math.cos(angle) * 0.22, y: -0.05 + Math.sin(angle) * 0.10, z: 0.24, sx: 0.18, sy: 0.10, sz: 0.05, color: petal });
  }
  addEllipsoid(group, { y: -0.05, z: 0.27, sx: 0.11, sy: 0.11, sz: 0.05, color: rare ? 0xe8f8ff : 0xfff2aa });
}

function buildVine(group) {
  addGroundShadow(group, 1.45, 0.14);
  for (let i = 0; i < 9; i += 1) {
    addCylinder(group, { x: -0.88 + i * 0.22, y: -0.35 + Math.sin(i) * 0.06, r: 0.05, h: 0.30, color: 0x2b7f35, radialSegments: 8, rotZ: Math.PI / 2 });
    addEllipsoid(group, { x: -0.78 + i * 0.20, y: -0.20 + (i % 2) * 0.08, sx: 0.12, sy: 0.06, sz: 0.05, color: 0x74c957 });
  }
}

function buildOverhang(group, options = {}) {
  if (options.variant === 'web') {
    for (let i = 0; i < 9; i += 1) addCylinder(group, { x: -0.8 + i * 0.2, y: -0.16 + Math.abs(i - 4) * 0.07, r: 0.012, h: 1.1, color: 0xeef8ff, radialSegments: 5, rotZ: Math.PI / 2 + (i - 4) * 0.11 });
    addEllipsoid(group, { y: -0.40, z: 0.28, sx: 0.18, sy: 0.24, sz: 0.10, color: 0x3a2454 });
    return;
  }
  addCylinder(group, { y: -0.10, r: 0.10, h: 1.95, color: 0xb8662d, radialSegments: 8, rotZ: Math.PI / 2 - 0.08 });
  for (let i = 0; i < 7; i += 1) addEllipsoid(group, { x: -0.75 + i * 0.25, y: -0.42 - (i % 2) * 0.12, sx: 0.12, sy: 0.24, sz: 0.06, color: 0x74c957 });
}

function buildHeart(group) {
  addGroundShadow(group, 0.42, 0.18);
  addEllipsoid(group, { x: -0.17, y: -0.10, sx: 0.24, sy: 0.24, sz: 0.11, color: 0xff2538 });
  addEllipsoid(group, { x: 0.17, y: -0.10, sx: 0.24, sy: 0.24, sz: 0.11, color: 0xff2538 });
  addBox(group, { y: -0.30, z: 0.02, w: 0.34, h: 0.34, d: 0.18, color: 0xd51c2c, rotZ: Math.PI / 4 });
}

function buildPower(group, options = {}) {
  const color = Number.parseInt(String(options.color ?? '#a7ff7e').replace('#', ''), 16) || 0xa7ff7e;
  addGroundShadow(group, 0.42, 0.18);
  addBox(group, { y: -0.22, w: 0.58, h: 0.58, d: 0.34, color });
  addBox(group, { y: -0.05, z: 0.20, w: 0.24, h: 0.08, d: 0.04, color: 0xffffff });
}

function buildPlayer(group, options = {}) {
  const pose = options.pose ?? 'run';
  const frame = Number(options.frameIndex ?? 0);
  const tint = options.tint ? parseColor(options.tint, 0xa978ff) : null;
  const crouch = pose === 'crouch';
  const jump = pose === 'jump';
  const hit = pose === 'hit';
  const idle = pose === 'idle';
  const stride = pose === 'run' ? Math.sin((frame / 8) * Math.PI * 2) : 0;
  const crouchDrop = crouch ? -0.48 : 0;
  const jumpLift = jump ? 0.16 : 0;
  const physicsTilt = Number(options.tilt ?? 0) || 0;
  const lean = physicsTilt + (hit ? -0.20 : jump ? 0.11 : idle ? Math.sin(frame * 0.8) * 0.025 : 0);
  const shirt = tint ?? (hit ? 0xff625d : 0xe64639);
  const shirtSide = tint ? 0x65409a : 0x9b2c25;
  const skin = tint ? 0xd7b9ff : 0xd98b55;
  const skinSide = tint ? 0x8b66c8 : 0xa85f34;
  const denim = tint ? 0x6d58c8 : 0x2466b8;
  const denimDark = tint ? 0x4d3a96 : 0x18467d;
  const hat = tint ? 0xb58cff : 0xe7b248;
  const hatTop = tint ? 0xd7b9ff : 0xf8cf66;
  const boot = 0x45311f;

  addGroundShadow(group, 0.72, jump ? 0.24 : 0.32);
  group.rotation.z = lean;

  const torsoY = -0.03 + crouchDrop + jumpLift;
  const headY = 0.73 + crouchDrop + jumpLift;
  const hatY = 1.08 + crouchDrop + jumpLift;
  const legH = crouch ? 0.34 : 0.74;
  const legY = crouch ? -0.74 : -0.66;
  const leftLegSwing = stride * 0.30;
  const rightLegSwing = -stride * 0.30;
  const bootSpread = crouch ? 0.34 : 0.24;
  const armSwing = jump ? -0.82 : crouch ? 0.38 : stride * 0.42;
  const torsoH = crouch ? 0.58 : 0.86;
  const bibH = crouch ? 0.34 : 0.54;
  const strapH = crouch ? 0.44 : 0.62;

  addBox(group, { x: -0.22 + leftLegSwing * 0.18, y: legY + leftLegSwing * 0.16, w: 0.18, h: legH, d: 0.20, color: denim, rotZ: leftLegSwing });
  addBox(group, { x: 0.22 + rightLegSwing * 0.18, y: legY + rightLegSwing * 0.16, w: 0.18, h: legH, d: 0.20, color: denim, rotZ: rightLegSwing });
  addBox(group, { x: -bootSpread + leftLegSwing * 0.38, y: -1.07, z: 0.04, w: 0.34, h: 0.13, d: 0.28, color: boot, rotZ: crouch ? 0.12 : 0 });
  addBox(group, { x: bootSpread + rightLegSwing * 0.38, y: -1.07, z: 0.04, w: 0.34, h: 0.13, d: 0.28, color: boot, rotZ: crouch ? -0.12 : 0 });

  addBox(group, { y: torsoY, w: 0.60, h: torsoH, d: 0.34, color: shirt });
  addBox(group, { x: 0.30, y: torsoY, w: 0.07, h: torsoH - 0.02, d: 0.34, color: shirtSide });
  addBox(group, { y: torsoY - 0.01, z: 0.22, w: 0.33, h: bibH, d: 0.06, color: denim });
  addBox(group, { x: -0.18, y: torsoY + 0.08, z: 0.23, w: 0.08, h: strapH, d: 0.05, color: denimDark });
  addBox(group, { x: 0.18, y: torsoY + 0.08, z: 0.23, w: 0.08, h: strapH, d: 0.05, color: denimDark });
  addBox(group, { y: torsoY - 0.10, z: 0.27, w: 0.08, h: 0.08, d: 0.04, color: 0xffd54a });

  addBox(group, { x: -0.47, y: torsoY - 0.04 - armSwing * 0.20, w: 0.15, h: 0.62, d: 0.20, color: skin, rotZ: -0.14 + armSwing });
  addBox(group, { x: 0.47, y: torsoY - 0.04 + armSwing * 0.20, w: 0.15, h: 0.62, d: 0.20, color: skinSide, rotZ: 0.14 - armSwing });

  addBox(group, { y: headY, z: 0.03, w: 0.50, h: 0.42, d: 0.36, color: skin });
  addBox(group, { x: 0.25, y: headY, z: 0.00, w: 0.06, h: 0.39, d: 0.34, color: skinSide });
  addBox(group, { x: -0.11, y: headY + 0.02, z: 0.25, w: 0.08, h: 0.07, d: 0.04, color: 0x1d221d });
  addBox(group, { x: 0.11, y: headY + 0.02, z: 0.25, w: 0.08, h: 0.07, d: 0.04, color: 0x1d221d });
  addBox(group, { y: headY - 0.13, z: 0.26, w: 0.18, h: 0.04, d: 0.04, color: hit ? 0x5b1320 : 0x4c2216 });
  addBox(group, { x: -0.19, y: headY + 0.24, z: 0.13, w: 0.14, h: 0.10, d: 0.22, color: 0x6b3a1f });

  addBox(group, { y: hatY, w: 1.08, h: 0.12, d: 0.62, color: hat });
  addBox(group, { y: hatY + 0.18, w: 0.62, h: 0.28, d: 0.46, color: hatTop });
  addBox(group, { y: hatY + 0.33, w: 0.46, h: 0.07, d: 0.34, color: 0xffe28a });
}

const BUILDERS = Object.freeze({
  cube: buildBlock,
  platform: buildPlatform,
  steps: buildSteps,
  question: buildQuestion,
  hangingPlatform: buildPlatform,
  smallFlower: buildFlower,
  sprout: (group) => buildGrassLike(group, 'sprout'),
  wheat: (group, options) => buildGrassLike(group, 'wheat', options),
  leafClump: buildBush,
  grassTuft: buildGrassLike,
  vineBarrier: buildVine,
  overhang: buildOverhang,
  pickupFlower: buildFlower,
  heart: buildHeart,
  power: buildPower,
  fence: buildFence,
  pipe: buildPipe,
  planter: buildPlanter,
  mushroom: buildMushroom,
  bush: buildBush,
  tree: buildTree,
  player: buildPlayer,
});

export class ThreeModelRenderer {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled && typeof document !== 'undefined';
    this.cache = new Map();
  }

  draw(ctx, kind, x, y, scale = 1, options = {}) {
    if (!this.enabled) return false;
    const normalized = normalizeKind(kind);
    const canvas = this.#getCanvas(normalized, options);
    if (!canvas) return false;
    const [baseW, baseH] = MODEL_SIZE[normalized];
    let width = (options.width ?? baseW) * scale;
    let height = (options.height ?? baseH) * scale;
    if (options.preservePoseScale) {
      const reference = this.#getCanvas(normalized, {
        ...options,
        pose: 'run',
        frameIndex: 0,
        tilt: 0,
        preservePoseScale: undefined,
      }) ?? canvas;
      width *= canvas.width / Math.max(1, reference.width);
      height *= canvas.height / Math.max(1, reference.height);
    }
    ctx.drawImage(canvas, Math.round(x - width / 2), Math.round(y - height), Math.round(width), Math.round(height));
    return true;
  }

  #getCanvas(kind, options) {
    const key = stableKey(kind, options);
    if (this.cache.has(key)) return this.cache.get(key);

    // vineBarrier: use actual sprite rather than procedural geometry.
    // The game preloads all assets before first render, so the PNG is already in
    // the browser HTTP cache when this runs — new Image() + same URL → complete=true.
    if (kind === 'vineBarrier') {
      const img = new Image();
      img.src = './assets/obstacles/vines/vine_barrier_full.png';
      if (img.complete && img.naturalWidth > 0) {
        const out = document.createElement('canvas');
        out.width = img.naturalWidth;
        out.height = img.naturalHeight;
        out.getContext('2d').drawImage(img, 0, 0);
        this.cache.set(key, out);
        return out;
      }
      // Image not in cache yet — bust after load so next draw picks up the sprite
      img.addEventListener('load', () => this.cache.delete(key), { once: true });
      // fall through to procedural version for this frame
    }

    const canvas = document.createElement('canvas');
    canvas.width = RENDER_SIZE;
    canvas.height = RENDER_SIZE;
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const group = new THREE.Group();
      (BUILDERS[kind] ?? buildBlock)(group, options);
      group.rotation.x = -0.18;
      group.rotation.y = options.side > 0 ? -0.55 : 0.55;
      scene.add(group);
      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(-2.5, 4.0, 3.5);
      scene.add(keyLight);
      const fill = new THREE.DirectionalLight(0x9fd4ff, 0.8);
      fill.position.set(3, 2, 2);
      scene.add(fill);
      const camera = new THREE.OrthographicCamera(-1.9, 1.9, 1.9, -1.9, 0.1, 20);
      camera.position.set(0, 0.35, 5.0);
      camera.lookAt(0, -0.45, 0);
      renderer.render(scene, camera);
      renderer.dispose();
      const trimmed = trimTransparentPixels(canvas);
      this.cache.set(key, trimmed);
      return trimmed;
    } catch (error) {
      console.warn('[ThreeModelRenderer] disabled after render failure', error);
      this.enabled = false;
      return null;
    }
  }
}
