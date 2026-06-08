/**
 * Runtime renderer strategy contract.
 *
 * This is intentionally documentation-first because the project is plain JS.
 * Implementations should expose:
 *   init(): void
 *   render(world: import('../world/World.js').World, delta?: number): void
 *   resize(width?: number, height?: number, pixelRatio?: number): void
 *   destroy(): void
 *
 * The existing Canvas2D RenderSystem already follows render/resize semantics.
 * New WebGL strategies should implement the full lifecycle so render backends
 * can be swapped without leaking GPU resources.
 */
export const RENDERER_STRATEGY = Object.freeze({
  canvas2d: 'canvas2d',
  threeScene: 'three-scene',
});

export function assertRendererStrategy(renderer) {
  for (const method of ['render', 'resize', 'destroy']) {
    if (typeof renderer?.[method] !== 'function') {
      throw new TypeError(`Renderer strategy missing ${method}()`);
    }
  }
  return renderer;
}
