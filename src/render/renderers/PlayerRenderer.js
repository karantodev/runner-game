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
    // v3.8.24 Player Visual Consistency Pass — invuln blink alpha floor
    // raised 0.28 → 0.62 so the hero stays readable against road decor
    // even in the dim half of the blink cycle. Blink cadence unchanged
    // (every 6 frames). Floor returns to 1.0 the moment invuln ends.
    const invulnAlpha = health.invulnerabilityFrames > 0
      ? (Math.floor(health.invulnerabilityFrames / 6) % 2 === 0 ? 0.62 : 1)
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
      const spriteW = Math.round(120 * bodyScale);
      const spriteH = Math.round(spriteW * (img.naturalHeight / img.naturalWidth));
      const x = p.width / 2 + g.laneX * p.visualLaneWidth;
      const bottomMargin = world.config.player.bottomMargin ?? 0;
      const y = p.groundY - bottomMargin + g.y;

      ctx.save();
      ctx.globalAlpha = alpha;
      // v3.8.24 — pixel-snap trail ghosts (same fix as the live body).
      ctx.translate(Math.round(x), Math.round(y));
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
    const bottomMargin = world.config.player.bottomMargin ?? 0;
    const y = p.groundY - bottomMargin + vert.y + idleBob;
    const tilt = (lane.targetLane - lane.laneX) * 0.10 + lane.laneTilt * 0.05;

    // v3.8.24 Player Visual Consistency Pass — REMOVED state-based
    // visual scaling. Previously stretch/squash/jumpStretch/landSquash
    // applied ±7% scale on takeoff/landing, lateral squash applied
    // ±18% scale on lane-change, and crouchSquashY (0.78) shrank the
    // crouch sprite by 22% on top of the shorter crouch ART. The
    // result: the player's visual size CHANGED between states (jump
    // briefly bigger / duck briefly smaller / lane-change wobble).
    // Per the brief, scale is now CONSTANT; only pose (sprite art
    // choice) + foot-anchor Y (jump arc) + tilt (rotation, not scale)
    // change between states.
    const stretch = 1;
    const squash = 1;
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

    // v3.8.24 — lateral momentum lean removed (was ±18% horizontal
    // scale on lane-change). The tilt rotation already conveys
    // momentum without distorting the silhouette.

    ctx.save();
    ctx.globalAlpha = alpha;
    // v3.8.24 — pixel-snap the player's translate origin so sub-pixel
    // motion (jump arc, idle bob) doesn't shimmer the silhouette.
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(tilt);
    // v3.8.24 — crouchSquashY (0.78) REMOVED. Crouch sprite art is
    // already shorter (78 px vs 96 px run); the extra Y-squash was a
    // double-duck that made the player visually smaller than just the
    // pose change.
    ctx.scale(squash, stretch);
    const spriteW = Math.round(120 * bodyScale);
    const spriteH = Math.round(spriteW * (refFrame.naturalHeight / refFrame.naturalWidth));
    ctx.drawImage(spriteImg, -spriteW / 2, -spriteH, spriteW, spriteH);

    if (isClone) {
      // Purple wash overlay so split-clones read as duplicates of the player.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = CLONE_TINT;
      ctx.fillRect(-spriteW / 2, -spriteH, spriteW, spriteH);
    }

    ctx.restore();

    // v3.8.24 — ?debugPlayer=1 overlay. Drawn AFTER the body restore so
    // labels and boxes sit on top of the sprite. Only fires for the
    // primary (non-clone) body; clones aren't relevant to consistency QA.
    if (!isClone && world.config.debug?.showPlayer) {
      this.#drawPlayerDebug(world, {
        x, y, spriteW, spriteH, alpha, prefix, runKey, crouching, airborne, justHit,
      });
    }
  }

  /** v3.8.24 — visual-bounds + foot-anchor + state debug overlay. */
  #drawPlayerDebug(world, info) {
    const ctx = this.ctx;
    const { x, y, spriteW, spriteH, alpha, prefix, runKey, crouching, airborne, justHit } = info;
    const rx = Math.round(x);
    const ry = Math.round(y);
    ctx.save();
    // Visual bounds (sprite quad in canvas space, ignoring tilt rotation
    // for clarity — the rotation is small enough that the box is a
    // useful reference even untilted).
    ctx.strokeStyle = '#00ffd6';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx - spriteW / 2, ry - spriteH, spriteW, spriteH);
    // Feet anchor — bright red dot at (x, y). Must stay stable across
    // states (run / jump / duck / hit / post-hit). If it drifts, the
    // foot-anchor design is broken.
    ctx.fillStyle = '#ff3030';
    ctx.beginPath();
    ctx.arc(rx, ry, 3, 0, Math.PI * 2);
    ctx.fill();
    // Collision-capsule rectangle (from config). Width matches lane
    // hit-tolerance; height shrinks when crouching to half.
    const collisionH = crouching ? spriteH * 0.55 : spriteH * 0.95;
    const collisionW = spriteW * 0.42;
    ctx.strokeStyle = 'rgba(255,210,80,0.7)';
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(rx - collisionW / 2, ry - collisionH, collisionW, collisionH);
    ctx.setLineDash([]);
    // Text label — state + scale + alpha + frame key.
    const state = justHit ? 'HIT' : airborne ? 'JUMP' : crouching ? 'DUCK' : 'RUN';
    const text = `${state} | a=${alpha.toFixed(2)} | ${runKey}`;
    ctx.font = '11px monospace';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(rx - tw / 2 - 4, ry - spriteH - 18, tw + 8, 14);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, rx, ry - spriteH - 8);
    ctx.restore();
  }
}
