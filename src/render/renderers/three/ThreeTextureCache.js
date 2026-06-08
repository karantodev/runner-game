import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { ASSET_ROOT } from './threeAssetManifest.js';

export class ThreeTextureCache {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this._cache = new Map();
  }

  get(assetPath) {
    const url = assetPath.startsWith('.') ? assetPath : `${ASSET_ROOT}${assetPath}`;
    if (this._cache.has(url)) return this._cache.get(url);
    const tex = this.textureLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    this._cache.set(url, tex);
    return tex;
  }

  dispose() {
    for (const tex of this._cache.values()) tex.dispose();
    this._cache.clear();
  }
}
