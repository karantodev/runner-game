/**
 * Thin sprite-blit helper. Pixel-art smoothing is disabled once per frame
 * in RenderSystem.render(), so this method does NOT save/restore the
 * context state — every per-draw save/restore added up to ~80 ctx state
 * mutations per frame on the visible-entity working set.
 */
export class SpriteRenderer {
  constructor(ctx, assets) {
    this.ctx = ctx;
    this.assets = assets;
  }

  draw(key, cx, baseY, targetWidth, anchor = 'bottom') {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;

    const height = targetWidth * (image.naturalHeight / image.naturalWidth);
    const x = cx - targetWidth / 2;
    const y = anchor === 'center' ? baseY - height / 2 : baseY - height;

    // v3.8.14 — pixel-snap every sprite blit. Fractional draw coordinates
    // were the second-biggest shimmer source (after the road trapezoid
    // edges fixed in v3.8.13). With imageSmoothingEnabled=false, snapping
    // x/y to integers keeps the sprite's pixel grid aligned to the canvas
    // grid frame-over-frame as scroll advances.
    this.ctx.drawImage(
      image,
      Math.round(x), Math.round(y),
      Math.round(targetWidth), Math.round(height),
    );
    return true;
  }
}
