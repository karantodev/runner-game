export class AssetManager {
  #assets = new Map();

  async loadAll(assetMap) {
    const entries = Object.entries(assetMap);
    await Promise.all(entries.map(([key, src]) => this.#loadImage(key, src)));
  }

  get(key) {
    return this.#assets.get(key) ?? null;
  }

  isReady(key) {
    const img = this.get(key);
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  #loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.#assets.set(key, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[AssetManager] Failed to load asset: ${key} → ${src}`);
        resolve(null);
      };
      img.src = src;
    });
  }
}
