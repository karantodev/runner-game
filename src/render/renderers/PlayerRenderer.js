const CLONE_TINT = '#a978ff';

/**
 * Player + split-clones rendering. Picks the correct sprite from the
 * run or crouch atlas, applies tilt / squash / stretch / Y-squash
 * (crouch), and overlays a coloured wash for clone bodies.
 *
 * The procedural fillRect-fallback farmer that used to live here was
 * removed in phase 5: all 8 run frames and 4 crouch frames are bundled
 * assets and load reliably; if a future asset fails to load, the canvas
 * draws a blank where the player was and the developer fixes the asset.
 */
export class PlayerRenderer {
  constructor({ ctx, projection, assets }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
  }

  render(world) {
    if (!world.player) return;
    const health = world.player.components.Health;
    const lane = world.player.components.LaneState;
    const invulnAlpha = health.invulnerabilityFrames > 0
      ? (Math.floor(health.invulnerabilityFrames / 6) % 2 === 0 ? 0.28 : 1)
      : 1;

    const renderLanes = world.getPlayerRenderLanes();
    for (const laneX of renderLanes) {
      if (Math.abs(laneX - lane.laneX) < 0.01) continue;
      this.#playerBody(world, laneX, 0.42 * invulnAlpha, true);
    }
    this.#playerBody(world, lane.laneX, invulnAlpha, false);
  }

  #playerBody(world, renderLaneX, alpha = 1, isClone = false) {
    const ctx = this.ctx;
    const p = this.projection;
    const player = world.player;
    const lane = player.components.LaneState;
    const vert = player.components.VerticalState;
    const crouchState = player.components.CrouchState;
    const anim = player.components.AnimState;

    const x = p.width / 2 + renderLaneX * p.laneWidth;
    const idleBob = !vert.isJumping ? Math.sin(anim.idleTime * 0.10) * 2.4 : 0;
    const y = p.groundY + vert.y + idleBob;
    const tilt = (lane.targetLane - lane.laneX) * 0.10 + lane.laneTilt * 0.05;
    const stretch = 1 + vert.jumpStretch * 0.07 - vert.landSquash * 0.03;
    const squash = 1 - vert.jumpStretch * 0.05 + vert.landSquash * 0.07;

    const bodyScale = (p.height / 720) * 1.23;

    // runFrame advances at speed*0.7/tick; divide by 3.15 to target ~12 FPS at base speed
    const crouching = crouchState.isCrouching;
    const frameCount = crouching ? 4 : 8;
    const frameIndex = Math.floor(Math.abs(anim.runFrame) / 3.15) % frameCount;
    const spriteKeyPrefix = crouching ? 'playerFarmerCrouch' : 'playerFarmerRun';
    const fallbackKey = crouching ? 'playerFarmerCrouch01' : 'playerFarmerRun01';
    const runKey = `${spriteKeyPrefix}${String(frameIndex + 1).padStart(2, '0')}`;
    const spriteImg = this.assets.get(runKey) ?? this.assets.get(fallbackKey);
    if (!spriteImg?.naturalWidth) return;
    const refFrame = this.assets.get(fallbackKey) ?? spriteImg;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const crouchSquashY = crouching ? world.config.player.crouch.spriteYScale : 1;
    ctx.scale(squash, stretch * crouchSquashY);
    const spriteW = 118 * bodyScale;
    const spriteH = spriteW * (refFrame.naturalHeight / refFrame.naturalWidth);
    ctx.drawImage(spriteImg, -spriteW / 2, -spriteH, spriteW, spriteH);

    if (isClone) {
      // Purple wash overlay so split-clones read as duplicates of the player.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = CLONE_TINT;
      ctx.fillRect(-spriteW / 2, -spriteH, spriteW, spriteH);
    }

    ctx.restore();
  }
}
