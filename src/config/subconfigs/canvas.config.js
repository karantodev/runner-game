export const CANVAS_CONFIG = {
  width: 1536,
  height: 864,
  viewportPadding: 0,
  pixelRatio: 1,
  // Retro chunky-pixel scale for the canvas2d renderer.
  // 1.0 = off (full 1536×864 backing store, crisp).
  // 0.5 = half-res (768×432 backing store, upscaled with nearest-neighbor
  //       via CSS image-rendering:pixelated → ~2× pixel blocks).
  // 0.6 = mild chunky (920×518 backing store).
  // All rendering remains in logical 1536×864 coordinates; only the
  // backing buffer is smaller. Zero per-frame cost — fewer pixels to fill.
  retroPixelScale: 0.5,
};
