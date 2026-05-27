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

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(image, x, y, targetWidth, height);
    this.ctx.restore();
    return true;
  }
}
