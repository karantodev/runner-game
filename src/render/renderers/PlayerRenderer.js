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

    // v3.8.25 Fixed Visual Box — the OUTER visual frame is constant
    // across run / jump / duck / hit. We size it from the canonical
    // RUN sprite's aspect ratio (the tallest pose), so when the crouch
    // sprite (shorter ART) is drawn inside the box, its top stops
    // BELOW the box top — the empty space is the visible duck pose,
    // not a size shrink of the whole character.
    const canonImg = this.assets.get('playerFarmerRun01') ?? refFrame;
    const visualW = Math.round(120 * bodyScale);
    const visualH = Math.round(visualW * (canonImg.naturalHeight / canonImg.naturalWidth));
    // Sprite is drawn at its NATURAL aspect, anchored at the bottom of
    // the visual box. Crouch (shorter) → drawn smaller height, but the
    // outer box stays visualH. Run / jump / hit (taller) → fills the box.
    const drawW = visualW;
    const drawH = Math.round(visualW * (spriteImg.naturalHeight / spriteImg.naturalWidth));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(tilt);
    ctx.scale(squash, stretch);
    ctx.drawImage(spriteImg, -drawW / 2, -drawH, drawW, drawH);

    if (isClone) {
      // Purple wash overlay so split-clones read as duplicates of the player.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = CLONE_TINT;
      ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
    }

    ctx.restore();

    // v3.8.25 — debug overlay uses the OUTER visual box (visualW × visualH),
    // not the inner sprite draw rect. Outer box stays the same size
    // across all states; sprite art changes inside.
    if (!isClone && world.config.debug?.showPlayer) {
      this.#drawPlayerDebug(world, {
        x, y, visualW, visualH, drawH, alpha, prefix, runKey, crouching, airborne, justHit,
      });
    }
  }

  /**
   * v3.8.25 — visual-bounds (OUTER fixed box) + foot-anchor + sprite-
   * art bounds (inner) + collision capsule + state label.
   *
   * The cyan outer box stays the SAME size across all states. A magenta
   * inner box shows the actual sprite art bounds (smaller for crouch).
   * The empty space between cyan and magenta on a crouch frame is the
   * "duck pose lives inside the box" gap.
   */
  #drawPlayerDebug(world, info) {
    const ctx = this.ctx;
    const { x, y, visualW, visualH, drawH, alpha, runKey, crouching, airborne, justHit } = info;
    const rx = Math.round(x);
    const ry = Math.round(y);
    ctx.save();
    // OUTER visual box — constant across states
    ctx.strokeStyle = '#00ffd6';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx - visualW / 2, ry - visualH, visualW, visualH);
    // INNER sprite-art box — shows actual drawn sprite rect (shorter for crouch)
    if (drawH !== visualH) {
      ctx.strokeStyle = 'rgba(255,92,214,0.7)';
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(rx - visualW / 2, ry - drawH, visualW, drawH);
      ctx.setLineDash([]);
    }
    // Foot anchor — stable red dot
    ctx.fillStyle = '#ff3030';
    ctx.beginPath();
    ctx.arc(rx, ry, 3, 0, Math.PI * 2);
    ctx.fill();
    // Collision capsule — yellow dashed, height shrinks ONLY when crouching
    const collisionH = crouching ? visualH * 0.55 : visualH * 0.95;
    const collisionW = visualW * 0.42;
    ctx.strokeStyle = 'rgba(255,210,80,0.7)';
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(rx - collisionW / 2, ry - collisionH, collisionW, collisionH);
    ctx.setLineDash([]);
    // State label
    const state = justHit ? 'HIT' : airborne ? 'JUMP' : crouching ? 'DUCK' : 'RUN';
    const text = `${state} | a=${alpha.toFixed(2)} | box=${visualW}×${visualH} | ${runKey}`;
    ctx.font = '11px monospace';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(rx - tw / 2 - 4, ry - visualH - 18, tw + 8, 14);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, rx, ry - visualH - 8);
    ctx.restore();
  }
}
