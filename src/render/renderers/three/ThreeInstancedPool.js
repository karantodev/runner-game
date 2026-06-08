import * as THREE from '../../../../node_modules/three/build/three.module.js';

const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Dense handle pool for THREE.InstancedMesh.
 *
 * InstancedMesh only renders indices [0, mesh.count), so releases keep the
 * active range dense by moving the last live handle into the freed slot.
 * Callers should keep the returned handle object rather than caching index.
 */
export class ThreeInstancedPool {
  constructor({
    geometry,
    material,
    capacity,
    scene = null,
    dynamic = true,
  }) {
    if (!geometry || !material) throw new TypeError('ThreeInstancedPool requires geometry and material');
    if (!Number.isInteger(capacity) || capacity <= 0) throw new TypeError('ThreeInstancedPool capacity must be a positive integer');
    this.capacity = capacity;
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.count = 0;
    this.handles = [];
    this.nextId = 1;
    this.disposed = false;
    if (dynamic) {
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (this.mesh.instanceColor) this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    if (scene) scene.add(this.mesh);
  }

  acquire(matrix = null, color = null) {
    this.#assertLive();
    if (this.mesh.count >= this.capacity) return null;
    const handle = { id: this.nextId++, index: this.mesh.count, active: true };
    this.handles[handle.index] = handle;
    this.mesh.count += 1;
    this.setMatrix(handle, matrix ?? HIDDEN_MATRIX);
    if (color !== null) this.setColor(handle, color);
    return handle;
  }

  release(handle) {
    this.#assertLive();
    if (!handle?.active || this.handles[handle.index] !== handle) return false;
    const releasedIndex = handle.index;
    const lastIndex = this.mesh.count - 1;
    const moved = releasedIndex !== lastIndex ? this.handles[lastIndex] : null;
    if (moved) {
      const matrix = new THREE.Matrix4();
      this.mesh.getMatrixAt(lastIndex, matrix);
      this.mesh.setMatrixAt(releasedIndex, matrix);
      if (this.mesh.instanceColor) {
        const color = new THREE.Color();
        this.mesh.getColorAt(lastIndex, color);
        this.mesh.setColorAt(releasedIndex, color);
      }
      moved.index = releasedIndex;
      this.handles[releasedIndex] = moved;
    }
    this.handles[lastIndex] = undefined;
    this.mesh.count = lastIndex;
    handle.active = false;
    handle.index = -1;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return true;
  }

  reset() {
    this.#assertLive();
    for (let i = 0; i < this.mesh.count; i += 1) {
      const handle = this.handles[i];
      if (handle) {
        handle.active = false;
        handle.index = -1;
      }
      this.mesh.setMatrixAt(i, HIDDEN_MATRIX);
      this.handles[i] = undefined;
    }
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  setMatrix(handle, matrix) {
    this.#assertHandle(handle);
    this.mesh.setMatrixAt(handle.index, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setColor(handle, color) {
    this.#assertHandle(handle);
    this.mesh.setColorAt(handle.index, color instanceof THREE.Color ? color : new THREE.Color(color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose({ disposeGeometry = false, disposeMaterial = false } = {}) {
    if (this.disposed) return;
    this.reset();
    this.mesh.removeFromParent();
    if (disposeGeometry) this.mesh.geometry.dispose();
    if (disposeMaterial) {
      const materials = Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material];
      for (const material of materials) material?.dispose?.();
    }
    this.disposed = true;
  }

  get count() {
    return this.mesh.count;
  }

  #assertHandle(handle) {
    this.#assertLive();
    if (!handle?.active || this.handles[handle.index] !== handle) {
      throw new TypeError('Invalid or released ThreeInstancedPool handle');
    }
  }

  #assertLive() {
    if (this.disposed) throw new Error('ThreeInstancedPool has been disposed');
  }
}
