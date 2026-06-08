import * as THREE from '../../../../node_modules/three/build/three.module.js';
import {
  ASSETS, PROP_METRICS, FLORA_ASSETS, BLOB_SKIP, WINDY_ASSETS, ORGANIC_ASSETS,
  FARMER_UNIT, prand, propMetrics,
} from './threeAssetManifest.js';

export class ThreeSceneryManager {
  constructor(scene, textureCache, windUniform) {
    this.scene = scene;
    this.textureCache = textureCache;
    this.windUniform = windUniform;

    this.sceneryInstances = new Map();
    this.sceneryCounters = new Map();
    this.sceneryPlaneGeo = new THREE.PlaneGeometry(1, 1);

    this.blobTexture = null;
    this.blobPlaneGeo = new THREE.PlaneGeometry(1, 1);
    this.sceneryBlobs = null;
    this.blobCursor = 0;
    this.blobQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    this.blobColor = new THREE.Color();

    this.scratchMatrix = new THREE.Matrix4();
    this.scratchQuat = new THREE.Quaternion();
    this.scratchPos = new THREE.Vector3();
    this.scratchScale = new THREE.Vector3();
  }

  init() {
    this.buildBlobTexture();
    this.buildSceneryBlobs();
  }

  buildBlobTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.blobTexture = new THREE.CanvasTexture(canvas);
  }

  buildSceneryBlobs() {
    const CAP = 1024;
    const mat = new THREE.MeshBasicMaterial({
      map: this.blobTexture,
      transparent: true,
      depthWrite: false,
      vertexColors: false,
    });
    // Multiply instanceColor into opacity so each blob can have a different darkness.
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_pars_vertex>',
        `#include <color_pars_vertex>
         varying vec3 vInstanceColor;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_vertex>',
        `#include <color_vertex>
         vInstanceColor = instanceColor;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_pars_fragment>',
        `#include <color_pars_fragment>
         varying vec3 vInstanceColor;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         diffuseColor.a *= (1.0 - vInstanceColor.r);`,
      );
    };

    const mesh = new THREE.InstancedMesh(this.blobPlaneGeo, mat, CAP);
    mesh.name = 'scenery-blobs';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    this.sceneryBlobs = mesh;
  }

  resetCounters() {
    this.sceneryCounters.clear();
    this.blobCursor = 0;
  }

  updateInstances() {
    for (const [assetPath, mesh] of this.sceneryInstances) {
      mesh.count = this.sceneryCounters.get(assetPath) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.sceneryBlobs) {
      this.sceneryBlobs.count = this.blobCursor;
      this.sceneryBlobs.instanceMatrix.needsUpdate = true;
      this.sceneryBlobs.instanceColor.needsUpdate = true;
    }
  }

  addSceneryInstance(assetPath, x, y, z, scale, rotationY, seed) {
    let mesh = this.sceneryInstances.get(assetPath);
    if (!mesh) {
      mesh = this.buildSceneryMesh(assetPath);
      this.sceneryInstances.set(assetPath, mesh);
    }

    const count = this.sceneryCounters.get(assetPath) ?? 0;
    if (count >= mesh.instanceMatrix.count) return;

    const metrics = propMetrics(assetPath);
    const sw = metrics.width * scale;
    const sh = metrics.height * scale;

    this.scratchPos.set(x, y + sh / 2, z);
    this.scratchQuat.setFromEuler(new THREE.Euler(0, rotationY, 0));
    this.scratchScale.set(sw, sh, 1);

    if (ORGANIC_ASSETS.has(assetPath)) {
      const r = prand(seed ?? x + z);
      this.scratchScale.x *= (r > 0.5 ? 1 : -1);
      this.scratchScale.setScalar(this.scratchScale.x * (0.9 + (r % 0.2) * 1.1));
      this.scratchQuat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r - 0.5) * 0.24, 0)));
    }

    this.scratchMatrix.compose(this.scratchPos, this.scratchQuat, this.scratchScale);
    mesh.setMatrixAt(count, this.scratchMatrix);
    this.sceneryCounters.set(assetPath, count + 1);

    // Blob shadow — use instanceMatrix.count (capacity) not mesh.count (render count).
    if (!BLOB_SKIP.has(assetPath) && this.blobCursor < this.sceneryBlobs.instanceMatrix.count) {
      this.addBlob(x, y + 0.02, z, sw * 0.8, metrics.blobGrey ?? 0.2);
    }
  }

  addBlob(x, y, z, radius, grey) {
    if (!this.sceneryBlobs || this.blobCursor >= this.sceneryBlobs.instanceMatrix.count) return;
    this.scratchPos.set(x, y, z);
    this.scratchScale.set(radius, radius, 1);
    this.scratchMatrix.compose(this.scratchPos, this.blobQuat, this.scratchScale);
    this.sceneryBlobs.setMatrixAt(this.blobCursor, this.scratchMatrix);
    this.blobColor.setRGB(grey, grey, grey);
    this.sceneryBlobs.setColorAt(this.blobCursor, this.blobColor);
    this.blobCursor += 1;
  }

  buildSceneryMesh(assetPath) {
    const tex = this.textureCache.get(assetPath);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.45,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    if (WINDY_ASSETS.has(assetPath)) {
      this.injectWindShader(mat);
    }

    const CAP = FLORA_ASSETS.has(assetPath) ? 4096 : 1024;
    const mesh = new THREE.InstancedMesh(this.sceneryPlaneGeo, mat, CAP);
    mesh.name = `instanced:${assetPath}`;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    return mesh;
  }

  injectWindShader(material) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.windUniform;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_pars_vertex>',
        `#include <uv_pars_vertex>
         uniform float uTime;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float wind = sin(uTime * 1.8 + instanceMatrix[3][0] * 0.4 + instanceMatrix[3][2] * 0.2) * 0.08;
         float top = step(0.1, uv.y);
         transformed.x += wind * top;
         transformed.z += wind * 0.5 * top;`,
      );
    };
  }

  dispose() {
    for (const mesh of this.sceneryInstances.values()) {
      mesh.removeFromParent();
      mesh.material?.dispose();
    }
    this.sceneryInstances.clear();
    this.sceneryPlaneGeo?.dispose();
    this.blobPlaneGeo?.dispose();
    if (this.sceneryBlobs) {
      this.sceneryBlobs.removeFromParent();
      this.sceneryBlobs.material?.dispose();
      this.sceneryBlobs = null;
    }
    this.blobTexture?.dispose();
    // textureCache is shared — disposed by ThreeSceneRenderer.
  }
}
