/**
 * Player + split-clones rendering. Tries the appropriate sprite atlas
 * first (run cycle or crouch-run cycle), falls back to a tall procedural
 * farmer figure if no art is loaded.
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
    const run = anim.runFrame;
    const onGround = !vert.isJumping;
    const tilt = (lane.targetLane - lane.laneX) * 0.10 + lane.laneTilt * 0.05;
    const stretch = 1 + vert.jumpStretch * 0.07 - vert.landSquash * 0.03;
    const squash = 1 - vert.jumpStretch * 0.05 + vert.landSquash * 0.07;

    const bodyScale = (p.height / 720) * 1.23;

    // runFrame advances at speed*0.7/tick; divide by 3.15 to target ~12 FPS at base speed
    const crouching = crouchState.isCrouching;
    const frameCount = crouching ? 4 : 8;
    const frameIndex = Math.floor(Math.abs(run) / 3.15) % frameCount;
    const spriteKeyPrefix = crouching ? 'playerFarmerCrouch' : 'playerFarmerRun';
    const fallbackKey = crouching ? 'playerFarmerCrouch01' : 'playerFarmerRun01';
    const runKey = `${spriteKeyPrefix}${String(frameIndex + 1).padStart(2, '0')}`;
    const spriteImg = (this.assets.get(runKey) ?? this.assets.get(fallbackKey));
    const refFrame = this.assets.get(fallbackKey) ?? spriteImg;
    if (spriteImg?.naturalWidth && !isClone) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(tilt);
      const crouchSquashY = crouching ? world.config.player.crouch.spriteYScale : 1;
      ctx.scale(squash, stretch * crouchSquashY);
      const spriteW = 118 * bodyScale;
      const spriteH = spriteW * (refFrame.naturalHeight / refFrame.naturalWidth);
      ctx.drawImage(spriteImg, -spriteW / 2, -spriteH, spriteW, spriteH);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(bodyScale * squash, bodyScale * stretch);

    if (isClone) {
      ctx.save();
      ctx.rotate(-tilt);
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = '#a978ff';
      ctx.beginPath();
      ctx.ellipse(0, -78, 42, 92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const airT = -vert.y / 100;
    ctx.save();
    ctx.rotate(-tilt);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - Math.min(0.7, airT))})`;
    ctx.beginPath();
    ctx.ellipse(0, -vert.y + 4, 36 - airT * 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const legLeftOffset = onGround ? Math.sin(run) * 12 : -8;
    const legRightOffset = onGround ? Math.sin(run + Math.PI) * 12 : -8;

    ctx.fillStyle = '#3a2410';
    ctx.fillRect(-18, -8 + Math.min(0, legLeftOffset * 0.3), 16, 10);
    ctx.fillRect(2, -8 + Math.min(0, legRightOffset * 0.3), 16, 10);
    ctx.fillStyle = '#2a5aa0';
    ctx.fillRect(-18, -52 + legLeftOffset * 0.2, 16, 44 + Math.abs(legLeftOffset * 0.1));
    ctx.fillRect(2, -52 + legRightOffset * 0.2, 16, 44 + Math.abs(legRightOffset * 0.1));
    ctx.fillStyle = '#1f4280';
    ctx.fillRect(-18, -52 + legLeftOffset * 0.2, 4, 44);
    ctx.fillRect(2, -52 + legRightOffset * 0.2, 4, 44);

    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(-28, -100, 56, 54);
    ctx.fillStyle = '#2a6a2a';
    ctx.fillRect(-28, -52, 56, 6);
    ctx.fillStyle = '#4ca84c';
    ctx.fillRect(-26, -100, 8, 54);
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(-22, -118, 8, 22);
    ctx.fillRect(14, -118, 8, 22);
    ctx.fillStyle = '#5fbf52';
    ctx.fillRect(-12, -72, 24, 6);
    ctx.fillStyle = '#7dd66e';
    ctx.fillRect(-4, -76, 8, 14);
    ctx.fillStyle = '#5fbf52';
    ctx.beginPath();
    ctx.moveTo(-12, -72);
    ctx.lineTo(-18, -66);
    ctx.lineTo(-12, -66);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, -72);
    ctx.lineTo(18, -66);
    ctx.lineTo(12, -66);
    ctx.closePath();
    ctx.fill();

    const armSwing = onGround ? Math.sin(run + Math.PI) * 6 : -8;
    ctx.fillStyle = '#f0eee0';
    ctx.fillRect(-38, -100 + armSwing * 0.2, 12, 24);
    ctx.fillRect(26, -100 - armSwing * 0.2, 12, 24);
    ctx.fillStyle = '#dcb088';
    ctx.fillRect(-38, -76 + armSwing * 0.4, 12, 20);
    ctx.fillRect(26, -76 - armSwing * 0.4, 12, 20);
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(-40, -58 + armSwing * 0.4, 16, 10);
    ctx.fillRect(24, -58 - armSwing * 0.4, 16, 10);

    ctx.save();
    ctx.translate(32, -58 - armSwing * 0.4);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#8a5a30';
    ctx.fillRect(-2, -14, 4, 30);
    ctx.fillStyle = '#b0b0b0';
    ctx.beginPath();
    ctx.moveTo(-7, 16);
    ctx.lineTo(7, 16);
    ctx.lineTo(5, 28);
    ctx.lineTo(-5, 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.fillRect(-7, 14, 14, 2);
    ctx.restore();

    ctx.fillStyle = '#dcb088';
    ctx.fillRect(-10, -110, 20, 12);
    ctx.fillStyle = '#6a3f1a';
    ctx.fillRect(-22, -140, 44, 34);
    ctx.fillStyle = '#502d12';
    ctx.fillRect(-22, -140, 6, 34);
    ctx.fillStyle = '#7a4f2a';
    ctx.fillRect(-22, -140, 44, 5);
    ctx.fillStyle = '#6a3f1a';
    ctx.fillRect(-26, -130, 4, 14);
    ctx.fillRect(22, -130, 4, 14);

    ctx.fillStyle = '#e8c85a';
    ctx.beginPath();
    ctx.ellipse(0, -140, 42, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c4a236';
    ctx.beginPath();
    ctx.ellipse(0, -138, 42, 6, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#f0d066';
    ctx.fillRect(-20, -160, 40, 20);
    ctx.fillStyle = '#e8c85a';
    ctx.beginPath();
    ctx.ellipse(0, -160, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a4b2b';
    ctx.fillRect(-20, -146, 40, 4);
    ctx.fillStyle = 'rgba(160,120,40,0.4)';
    for (let i = 0; i < 5; i += 1) ctx.fillRect(-18 + i * 8, -158, 1, 14);

    ctx.restore();
  }
}
