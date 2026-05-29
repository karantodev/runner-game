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

    // Motion-trail ghosts behind the player (drawn back-to-front: oldest
    // ghost has the lowest life, draw first so newer trails sit on top).
    this.#drawTrail(world);

    // v3.5: shield aura — breathing energy ring around the player while
    // shield is active. Drawn UNDER the body so the silhouette stays clean.
    if (world.powerUpSystem?.isShieldActive()) this.#drawShieldRing(world, lane.laneX);

    const renderLanes = world.getPlayerRenderLanes();
    for (const laneX of renderLanes) {
      if (Math.abs(laneX - lane.laneX) < 0.01) continue;
      this.#playerBody(world, laneX, 0.42 * invulnAlpha, true);
    }
    this.#playerBody(world, lane.laneX, invulnAlpha, false);
  }

  /**
   * v3.5: shield ring — two stacked circles with breathing alpha so the
   * effect reads as "energy field", not a flat outline. Pulses with
   * world.timeAlive for an organic feel.
   */
  #drawShieldRing(world, laneX) {
    const ctx = this.ctx;
    const p = this.projection;
    const x = p.width / 2 + laneX * p.visualLaneWidth;
    const y = p.groundY + world.player.components.VerticalState.y - 70;
    const pulse = 0.5 + 0.5 * Math.sin(world.timeAlive * 0.16);
    const baseRadius = 78 + pulse * 8;
    ctx.save();
    // Outer halo
    ctx.globalAlpha = 0.18 + pulse * 0.12;
    ctx.strokeStyle = '#8cdcff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius + 6, 0, Math.PI * 2);
    ctx.stroke();
    // Inner crisp ring
    ctx.globalAlpha = 0.55 + pulse * 0.30;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  #drawTrail(world) {
    const trail = world.playerTrail;
    if (trail.length === 0) return;
    const ctx = this.ctx;
    const p = this.projection;
    // Iterate oldest → newest so the freshest ghost sits on top.
    for (let i = 0; i < trail.length; i += 1) {
      const g = trail[i];
      const t = g.life / g.maxLife;
      const alpha = t * 0.42;
      if (alpha <= 0.02) continue;
      const frameCount = g.crouching ? 4 : 8;
      const frameIndex = Math.floor(Math.abs(g.runFrame) / 3.15) % frameCount;
      const prefix = g.crouching ? 'playerFarmerCrouch' : 'playerFarmerRun';
      const key = `${prefix}${String(frameIndex + 1).padStart(2, '0')}`;
      const img = this.assets.get(key);
      if (!img?.naturalWidth) continue;

      // v3.8.6 Tier-2 composition pass — base width 138 → 120 (-13%).
      // Previous size was dominating the road and made everything else
      // read undersized. New ratio matches the reference where the
      // farmer is the visible focal point but obstacles/blocks around
      // him feel proportional.
      const bodyScale = (p.height / 720) * 1.23;
      const spriteW = 120 * bodyScale;
      const spriteH = spriteW * (img.naturalHeight / img.naturalWidth);
      const x = p.width / 2 + g.laneX * p.visualLaneWidth;
      // v3.7.3: same bottom-margin offset as the live player so trail
      // ghosts line up exactly with the runner.
      const bottomMargin = world.config.player.bottomMargin ?? 0;
      const y = p.groundY - bottomMargin + g.y;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      // Greenish tint via composite — purely cosmetic, ties to speed-burst.
      ctx.drawImage(img, -spriteW / 2, -spriteH, spriteW, spriteH);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#7dff64';
      ctx.fillRect(-spriteW / 2, -spriteH, spriteW, spriteH);
      ctx.restore();
    }
  }

  #playerBody(world, renderLaneX, alpha = 1, isClone = false) {
    const ctx = this.ctx;
    const p = this.projection;
    const player = world.player;
    const lane = player.components.LaneState;
    const vert = player.components.VerticalState;
    const crouchState = player.components.CrouchState;
    const anim = player.components.AnimState;
    const health = player.components.Health;

    const x = p.width / 2 + renderLaneX * p.visualLaneWidth;
    const idleBob = !vert.isJumping ? Math.sin(anim.idleTime * 0.10) * 2.4 : 0;
    // v3.7.3: lift the player above the road's foreground edge so a strip
    // of road / decor sits visibly below their feet — matches the
    // reference framing. Config-driven so it tunes without rebuilds.
    const bottomMargin = world.config.player.bottomMargin ?? 0;
    const y = p.groundY - bottomMargin + vert.y + idleBob;
    const tilt = (lane.targetLane - lane.laneX) * 0.10 + lane.laneTilt * 0.05;
    const stretch = 1 + vert.jumpStretch * 0.07 - vert.landSquash * 0.03;
    const squash = 1 - vert.jumpStretch * 0.05 + vert.landSquash * 0.07;

    const bodyScale = (p.height / 720) * 1.23;

    // State-priority pick: menu/dead idle → hit (one-shot during invuln) →
    // jump (one-shot per arc) → crouch (looped) → run (looped). Hit frames
    // peg the very first frames of the invulnerability window; jump frames
    // come from vert.jumpHoldFrames + post-apex airtime; crouch + run keep
    // looping off anim.runFrame so the existing tempo (speed × 0.7 / tick)
    // stays intact.
    const crouching = crouchState.isCrouching;
    const inMenuOrDead = world.state === 'menu' || world.state === 'dead';
    const justHit = health.hitFlash > 0 && health.invulnerabilityFrames > world.config.gameplay.invulnerabilityFrames - 18;
    const airborne = vert.isJumping || vert.y < -2;

    let prefix, frameCount, frameIndex, fallbackKey;
    if (inMenuOrDead && this.assets.get('playerFarmerIdle01')?.naturalWidth) {
      prefix = 'playerFarmerIdle';
      frameCount = 4;
      // Slow idle bob: 12-render-frame hold per frame = 200 ms.
      frameIndex = Math.floor(anim.idleTime / 12) % frameCount;
      fallbackKey = 'playerFarmerIdle01';
    } else if (justHit && this.assets.get('playerFarmerHit01')?.naturalWidth) {
      prefix = 'playerFarmerHit';
      frameCount = 4;
      // Hit: 4 frames over the first ~16 render-frames of invuln (4/4/8/8 holds).
      const hitElapsed = world.config.gameplay.invulnerabilityFrames - health.invulnerabilityFrames;
      frameIndex = hitElapsed < 4 ? 0 : hitElapsed < 8 ? 1 : hitElapsed < 16 ? 2 : 3;
      fallbackKey = 'playerFarmerHit01';
    } else if (airborne && this.assets.get('playerFarmerJump01')?.naturalWidth) {
      prefix = 'playerFarmerJump';
      frameCount = 6;
      // Jump pose driven by vy: takeoff (0-1) → apex up (2) → apex down (3) →
      // landing (4-5). vy is positive going down, negative going up.
      const vy = vert.vy;
      if (vy < -10) frameIndex = 0;        // hard accel up
      else if (vy < -4) frameIndex = 1;    // late takeoff
      else if (vy < 0)  frameIndex = 2;    // apex up
      else if (vy < 4)  frameIndex = 3;    // apex down
      else if (vy < 10) frameIndex = 4;    // pre-landing
      else              frameIndex = 5;    // hard impact
      fallbackKey = 'playerFarmerJump01';
    } else {
      // Run / crouch — the legacy looped tempo.
      prefix = crouching ? 'playerFarmerCrouch' : 'playerFarmerRun';
      frameCount = crouching ? 4 : 8;
      frameIndex = Math.floor(Math.abs(anim.runFrame) / 3.15) % frameCount;
      fallbackKey = crouching ? 'playerFarmerCrouch01' : 'playerFarmerRun01';
    }

    const runKey = `${prefix}${String(frameIndex + 1).padStart(2, '0')}`;
    // Final fallback chain: state-specific frame → state's frame 1 →
    // run frame 1 (always shipped). Guarantees the player never disappears
    // even if a partial designer delivery is missing intermediate frames.
    const spriteImg =
      this.assets.get(runKey)
      ?? this.assets.get(fallbackKey)
      ?? this.assets.get('playerFarmerRun01');
    if (!spriteImg?.naturalWidth) return;
    const refFrame = this.assets.get(fallbackKey) ?? spriteImg;

    // Lateral squash: when the player is sliding sideways fast (big
    // laneTilt), stretch horizontally and squash vertically — gives the
    // body a sense of weight + momentum into the new lane.
    const lateral = Math.min(0.18, Math.abs(lane.laneTilt) * 0.08);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const crouchSquashY = crouching ? world.config.player.crouch.spriteYScale : 1;
    ctx.scale(squash * (1 + lateral), stretch * crouchSquashY * (1 - lateral * 0.35));
    // v3.8.6 Tier-2 — base 138 → 120 (-13%). See comment in trail-ghost
    // section above for full rationale.
    const spriteW = 120 * bodyScale;
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
