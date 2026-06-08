import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { RENDERER_STRATEGY } from '../../RendererContract.js';
import { ThreeTextureCache } from './ThreeTextureCache.js';
import { ThreePostProcessingManager } from './ThreePostProcessingManager.js';
import { ThreeEnvironmentManager } from './ThreeEnvironmentManager.js';
import { ThreeSceneryManager } from './ThreeSceneryManager.js';
import { ThreeEntityManager } from './ThreeEntityManager.js';
import { FARMER_UNIT } from './threeAssetManifest.js';

const WORLD_UNIT_PER_DISTANCE = 0.42;

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
    this.scene = new THREE.Scene();
    this.timer = new THREE.Timer();

    this.blockStyle = 'voxel';
    this.playerVoxelEnabled = true;
    this.roadStyle = 'three-scene';

    this.windUniform = { value: 0 };
    this.bloomPulse = 0;
    this._bloomBase = 0.45;
    this.pixelHeight = 270;
    this.scrollZ = 0;

    this._textureCache = new ThreeTextureCache();
    this.environment = new ThreeEnvironmentManager(null, this.scene, this.assets, this.projection, this._textureCache);
    this.postProcessing = null;
    this.scenery = new ThreeSceneryManager(this.scene, this._textureCache, this.windUniform);
    this.entities = new ThreeEntityManager(this.scene, this._textureCache, this.windUniform);

    this.effectsRenderer = {
      triggerComboPulse: () => { this.bloomPulse = Math.min(this.bloomPulse + 0.1, 0.28); },
      triggerCollectFlash: () => {
        const player = this.entities.objects.get('player');
        if (player) {
          this.entities.spawnCollectSparks(player.position);
          this.entities.spawnCollectPop(player.position);
        }
      },
    };

    this.initialized = false;
    this.disposed = false;
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
    this.renderer.setClearColor(0x4ab4e8, this.options.alpha ? 0 : 1);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.environment.renderer = this.renderer;
    this.environment.build();

    this.scenery.init();
    this.entities.init();

    this.postProcessing = new ThreePostProcessingManager(this.renderer, this.scene, this.#activeCamera(), {
      bloomBase: this._bloomBase,
      pixelHeight: this.pixelHeight,
    });
    this.postProcessing.init();

    this.resize();
    this.#applyModeVisibility();
    this.initialized = true;
    return this;
  }

  render(world, delta) {
    if (!this.initialized) this.init();
    this.timer.update();
    const dt = delta ?? this.timer.getDelta();

    this.scrollZ = (world.scrollOffset ?? 0) * WORLD_UNIT_PER_DISTANCE;
    this.windUniform.value += dt;

    this.#syncWorld(world, dt);

    const cam = this.#activeCamera();
    this.postProcessing.updateCamera(cam);

    this.bloomPulse *= Math.exp(-dt * 3.85);
    const clampedPulse = Math.min(this.bloomPulse, 0.55);
    this.postProcessing.setBloomStrength(this._bloomBase + clampedPulse);

    this.postProcessing.render(dt);
  }

  resize(width = this.projection?.width ?? this.canvas.clientWidth, height = this.projection?.height ?? this.canvas.clientHeight, pixelRatio = this.pixelRatio) {
    this.pixelRatio = Math.max(1, pixelRatio);
    if (!this.renderer) return;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);

    this.#updateCameraAspects(w / h);
    if (this.postProcessing) {
      this.postProcessing.setSize(w, h, this.pixelRatio);
    }
  }

  resizeToViewport(padding = 0) {
    const appEl = document.getElementById('app');
    const rect = appEl ? appEl.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    let width = Math.max(320, rect.width - padding);
    let height = Math.max(180, rect.height - padding);
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
    const renderHeight = this.projection?.height ?? 864;
    this.resize(Math.round(renderHeight * aspect), renderHeight, this.pixelRatio);
  }

  destroy() {
    if (this.disposed) return;
    this.environment.dispose();
    this.postProcessing?.dispose();
    this.scenery.dispose();
    this.entities.dispose();
    this._textureCache.dispose();
    this.timer.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.renderer = null;
    this.initialized = false;
    this.disposed = true;
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

  setPixelHeight(height) {
    this.pixelHeight = height === 360 ? 360 : 270;
    if (this.postProcessing && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.postProcessing.setPixelHeight(this.pixelHeight, size.x, size.y);
    }
    return this.pixelHeight;
  }

  togglePixelHeight() {
    return this.setPixelHeight(this.pixelHeight === 270 ? 360 : 270);
  }

  #activeCamera() {
    return this.mode === '2.5d' ? this.environment.cameras.orthographic : this.environment.cameras.perspective;
  }

  #updateCameraAspects(aspect) {
    if (!this.environment.cameras) return;
    const cam = this.environment.cameras.perspective;
    const PERSPECTIVE_FOV = 22;
    const ORTHO_HEIGHT = 28;
    const designAspect = (this.projection?.width ?? 1536) / (this.projection?.height ?? 864);
    const lockedHalfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(PERSPECTIVE_FOV) / 2) * designAspect);
    cam.aspect = aspect;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(lockedHalfH) / Math.max(0.0001, aspect)));
    cam.updateProjectionMatrix();

    const ocam = this.environment.cameras.orthographic;
    ocam.left = -ORTHO_HEIGHT * aspect * 0.5;
    ocam.right = ORTHO_HEIGHT * aspect * 0.5;
    ocam.top = ORTHO_HEIGHT * 0.5;
    ocam.bottom = -ORTHO_HEIGHT * 0.5;
    ocam.updateProjectionMatrix();
  }

  #applyModeVisibility() {
    const is25d = this.mode === '2.5d';
    if (this.environment.horizonGroup) this.environment.horizonGroup.visible = !is25d;
    if (this.environment.farSilhouettesGroup) this.environment.farSilhouettesGroup.visible = !is25d;
    if (this.environment.orthoScreenGroup) this.environment.orthoScreenGroup.visible = is25d;
    if (this.environment.backdropGroup) this.environment.backdropGroup.visible = !is25d;
    if (this.environment.cloudGroup) this.environment.cloudGroup.visible = !is25d;
    if (this.environment.shoulderTiersGroup) this.environment.shoulderTiersGroup.visible = !is25d;

    if (this.postProcessing) {
      this.postProcessing.setVignetteDarkness(is25d ? 0.15 : 0.35);
      this.postProcessing.setSSAOEnabled(!is25d);
    }
    this._bloomBase = is25d ? 0.25 : 0.2;
    if (this.scene) {
      this.scene.background = is25d ? new THREE.Color(0x9fc8e8) : this.environment.skyGradientTex;
    }
  }

  #syncWorld(world, delta) {
    // 1. Scroll treadmill
    if (this.environment.roadGroup) {
      this.environment.roadGroup.position.z = this.scrollZ % this.environment.roadTilePitch;
      this.environment.backdropGroup.position.z = 0;
      if (this.environment.setpiecesGroup) {
        this.environment.setpiecesGroup.position.z = (this.scrollZ * 0.65) % 50;
      }
    }

    // 2. Parallax
    if (this.mode === '2.5d' && this.environment.orthoMountains) {
      const scroll = world.scrollOffset ?? 0;
      const factors = [0.0015, 0.003, 0.005];
      for (let i = 0; i < this.environment.orthoMountains.length; i += 1) {
        const map = this.environment.orthoMountains[i].material.map;
        if (map) map.offset.x = scroll * factors[i];
      }
    }

    // 3. Clouds & Effects
    if (this.environment.cloudGroup) {
      this.environment.cloudGroup.rotation.y += 0.0035 * delta;
    }
    this.entities.updateEffects(delta);
    this.#animateTrail(delta);

    // 4. ECS Sync
    this.#syncPlayer(world);
    this.#syncRegistryObjects(world);
  }

  #animateTrail() {
    const trail = this.environment.trailFlowers;
    if (!trail) return;
    const t = this.windUniform.value;
    for (const f of trail) {
      const pulse = 0.84 + 0.16 * Math.sin(t * 5.0 + f.phase);
      f.sprite.scale.set(f.baseW * pulse, f.baseH * pulse, 1);
      const skip = ((Math.floor(t * 8) + f.idx) % 2) === 0 ? 1.0 : 0.5;
      f.sprite.material.opacity = f.baseOpacity * skip * (0.85 + 0.15 * Math.sin(t * 7.0 + f.phase));
    }
  }

  #syncPlayer(world) {
    const player = world.player;
    if (!player) return;
    const lane = player.components.LaneState;
    const vert = player.components.VerticalState;
    const crouch = player.components.CrouchState;
    const anim = player.components.AnimState;

    const sprite = this.entities.objects.get('player') || this.#createPlayerSprite();
    const jump = Math.max(-2.5, -(vert?.y ?? 0) / 70);
    const crouching = !!crouch?.isCrouching;

    let path;
    if (jump > 0.6) path = 'player/farmer_jump/player_farmer_jump_08.png';
    else if (crouching) path = 'player/farmer_crouch/player_farmer_crouch_02.png';
    else {
      const frameIndex = Math.floor(Math.abs(anim?.runFrame ?? 0) / 3.15) % 12;
      path = `player/farmer_run/player_farmer_run_${String(frameIndex + 1).padStart(2, '0')}.png`;
    }

    const map = this._textureCache.get(path);
    if (sprite.material.map !== map) {
      sprite.material.map = map;
      sprite.material.needsUpdate = true;
    }


    sprite.scale.set(FARMER_UNIT * 0.667, (crouching ? 0.74 : 1) * FARMER_UNIT, 1);
    sprite.position.set((lane?.laneX ?? 0) * 1.18, 0.02 + jump, -3.0);
    sprite.material.rotation = -((lane?.laneTilt ?? 0) * 0.1);

    const blob = this.entities.objects.get('player-blob') || this.#createPlayerBlob();
    const jumpT = Math.min(1, jump / 2.2);
    const blobScale = FARMER_UNIT * 0.75 * (1 - 0.45 * jumpT);
    blob.position.set((lane?.laneX ?? 0) * 1.18, 0.03, -3.0);
    blob.scale.set(blobScale * 1.05, blobScale * 0.5, 1);
    blob.material.opacity = 0.9 * (1 - 0.5 * jumpT);
  }

  #createPlayerSprite() {
    const mat = new THREE.SpriteMaterial({
      map: this._textureCache.get('player/farmer_run/player_farmer_run_01.png'),
      alphaTest: 0.5,
      transparent: true,
      depthWrite: true,
      fog: false,
    });
    const s = new THREE.Sprite(mat);
    s.center.set(0.5, 0);
    this.scene.add(s);
    this.entities.objects.set('player', s);
    return s;
  }

  #createPlayerBlob() {

    const geo = new THREE.PlaneGeometry(FARMER_UNIT * 0.75, FARMER_UNIT * 0.37);
    const mat = new THREE.MeshBasicMaterial({
      map: this.scenery.blobTexture,
      color: 0x1a1a1a,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    });
    const b = new THREE.Mesh(geo, mat);
    b.rotation.x = -Math.PI / 2;
    this.scene.add(b);
    this.entities.objects.set('player-blob', b);
    return b;
  }

  #syncRegistryObjects(world) {
    const registry = world.registry;
    if (!registry?.query) return;

    this.scenery.resetCounters();
    const seen = new Set();

    for (const entity of registry.query('Position', 'Sprite')) {
      const pos = entity.components.Position;
      if (pos.distance < -10 || pos.distance > 170) continue;

      const sprite = entity.components.Sprite;
      const category =
        'CollectibleData' in entity.components ? 'collectible' :
        'Hitbox' in entity.components ? 'obstacle' :
        'ScenicData' in entity.components ? 'scenery' : null;

      if (!category) continue;
      const key = `entity:${entity.id}`;
      seen.add(key);

      if (category === 'scenery') {
        const assetPath = this.environment.scenerySpriteAsset?.(sprite);
        if (assetPath) {
          const x = this.environment.sceneryLaneX(pos.lane, entity.components.ScenicData.laneBand);
          const z = -pos.distance * WORLD_UNIT_PER_DISTANCE;
          this.scenery.addSceneryInstance(assetPath, x, 0, z, 1.0, 0, entity.id);
        }
      } else {
        const assetPath = this.environment.entitySpriteAsset?.(sprite, category);
        if (assetPath) {
          const laneX = (pos.lane ?? 0) * 1.18;
          const z = -pos.distance * WORLD_UNIT_PER_DISTANCE;
          const yOffset = category === 'collectible' ? 0.85 : 0;
          this.scenery.addSceneryInstance(assetPath, laneX, yOffset, z, 1.0, 0, entity.id);
        }
      }
    }
    this.scenery.updateInstances();
  }
}
