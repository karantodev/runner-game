const CLONE_TINT = '#a978ff';
const TRAIL_TINT = '#7dff64';

/**
 * v3.8.29 — Canonical Player Frame Model.
 *
 * Every player sprite is conceptually drawn into a 64×96 canonical canvas
 * with anchor at canvas-bottom-center. The engine uses a UNIFIED pixel
 * scale derived from this canonical width — every sprite is rendered at
 * `naturalW × PIXEL_SCALE`, never stretched to fit a target width.
 *
 * Why this matters: v3.8.25 introduced a "fixed visual box" and force-fit
 * every sprite to `visualW = 120 * bodyScale`. A 56-wide crouch sprite
 * therefore became 120 wide on screen — the SAME pixel width as a 64-wide
 * run sprite. That made the crouched farmer appear BIGGER than the running
 * farmer inside the same outer box. The cyan box was consistent, the
 * character inside was not.
 *
 * With v3.8.29, PIXEL_SCALE = (120 * bodyScale) / 64 is constant for the
 * whole renderer call. A 64-wide sprite draws at 120, a 56-wide sprite
 * draws at 105 (smaller, as it should be — designer cropped tighter), a
 * 72-wide sprite draws at 135 (wider). Character body scale is preserved
 * faithfully from the source.
 *
 * Per-frame metadata can override the anchor for sprites the designer
 * ships off-center or above the canvas floor. Default metadata anchors
 * each sprite at its own bottom-center, which matches the historical
 * "sprite bottom = character feet" convention.
 */
const CANONICAL_PLAYER = { w: 64, h: 96 };

/**
 * Per-frame override format:
 *   { spriteOffsetX, spriteOffsetY, anchorX, footY }
 * — `spriteOffsetX/Y` = top-left of sprite art inside the canonical canvas
 * — `anchorX, footY`  = anchor point in CANVAS coords; this anchor maps to
 *                       the player's foot position
 * Add entries here only when a sprite breaks the default
 * "bottom-center of natural art = character feet" convention.
 */
const PLAYER_FRAME_META = {
  // No overrides yet. Designer currently ships sprites with character feet
  // at sprite bottom; the default below is sufficient. Example override:
  //   playerFarmerCrouch01: { spriteOffsetX: 0, spriteOffsetY: 24, anchorX: 32, footY: 96 },
};

function getFrameMeta(spriteImg, key) {
  const override = PLAYER_FRAME_META[key];
  if (override) return override;
  // Default: sprite-bottom-center anchored at player feet, sprite occupies
  // its own natural dimensions inside an implicit canvas of the same size.
  return {
    spriteOffsetX: 0,
    spriteOffsetY: 0,
    anchorX: spriteImg.naturalWidth / 2,
    footY: spriteImg.naturalHeight,
  };
}

/**
 * v3.8.31 — fit-to-canonical guard.
 *
 * Designer occasionally ships frames at way-higher-than-canonical
 * resolution (e.g., jump01 at 1254×1254 instead of 64×96 — see the asset
 * audit's PATH_MISMATCH bucket). With the v3.8.29 uniform PIXEL_SCALE
 * model, those frames render at `naturalW × 2.77 ≈ 3470` px — completely
 * off-canvas — and the QA contact sheet shows only a stray corner of the
 * sprite poking through.
 *
 * Honest rendering would be "draw what the designer shipped at the
 * declared scale." But for QA usefulness — and so that gameplay doesn't
 * break on a single oversized asset — when the source ratio exceeds
 * 1.25× canonical in either dimension, fall back to scale-to-fit-
 * canonical. The character ends up at roughly canonical size (sprite
 * downsampled to ~177×266 px), and the source-size warning in the
 * debug label still surfaces the underlying asset problem.
 *
 * Returns a render scale to apply uniformly to naturalW and naturalH.
 */
function getRenderScale(spriteImg, pixelScale) {
  const ratioW = spriteImg.naturalWidth / CANONICAL_PLAYER.w;
  const ratioH = spriteImg.naturalHeight / CANONICAL_PLAYER.h;
  const ratio = Math.max(ratioW, ratioH);
  if (ratio > 1.25) {
    // Defensive fallback only.
    // If this branch triggers for a player frame, the asset is INVALID
    // and must be re-exported on the canonical 64×96 canvas. The label
    // warning above + auditPlayerFrames() exist precisely so the
    // designer fix isn't masked by this guard.
    return pixelScale / ratio;
  }
  return pixelScale;
}

/**
 * Player + split-clones rendering. Picks the correct sprite from the
 * run / crouch / jump / hit / idle atlas, applies tilt, and overlays a
 * coloured wash for clone bodies.
 *
 * The procedural fillRect-fallback farmer that used to live here was
 * removed in phase 5: all bundled frames load reliably; if a future asset
 * fails to load, the canvas draws a blank where the player was and the
 * developer fixes the asset.
 */
function playerSnap(value) {
  return Math.round(value);
}

export class PlayerRenderer {
  constructor({ ctx, projection, assets, voxelBlocks, threeModels, playerVoxelEnabled = true }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.voxelBlocks = voxelBlocks ?? null;
    this.threeModels = threeModels ?? null;
    this.voxelEnabled = playerVoxelEnabled !== false;
    // v4.9 — cached unit shadow sprite. The old path rebuilt a radial
    // CanvasGradient every frame; drawImage scaling gives the same ellipse
    // while keeping the run loop allocation-free.
    this._shadowSprite = null;
  }

  setVoxelEnabled(enabled) {
    this.voxelEnabled = enabled !== false;
    return this.voxelEnabled;
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

    // v4.0 — grounding shadow ellipse. Drawn BEFORE trail and body so
    // it sits underneath everything. Reads visual.juice.playerShadow.
    this.#drawGroundShadow(world, lane.laneX);

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
   * v4.0 — soft grounding shadow ellipse.
   * Controlled by visual.juice.playerShadow {enabled, alpha, widthScale}.
   * Drawn BEFORE the body; save/restore isolates ctx state.
   */
  #drawGroundShadow(world, laneX) {
    const shadowCfg = world.config.visual?.juice?.playerShadow;
    if (!shadowCfg?.enabled) return;

    const p = this.projection;
    const vert = world.player.components.VerticalState;
    const ctx = this.ctx;

    const footX = Math.round(p.width / 2 + laneX * p.visualLaneWidth);
    const bottomMargin = world.config.player.bottomMargin ?? 0;
    const footY = Math.round(p.groundY - bottomMargin);

    // As the player rises, the shadow fades and shrinks.
    const airFraction = Math.max(0, Math.min(1, -vert.y / 100));
    const alphaScale = 1 - airFraction * 0.55;
    const sizeScale  = 1 - airFraction * 0.30;

    const bodyScale = (p.height / 720) * 1.23 * (world.config.player.heroScale ?? 1);
    const pixelScale = (120 * bodyScale) / CANONICAL_PLAYER.w;
    const halfW = Math.round(
      CANONICAL_PLAYER.w * pixelScale * (shadowCfg.widthScale ?? 0.92) * sizeScale * 0.5
    );
    const halfH = Math.max(3, Math.round(halfW * 0.20));
    const baseAlpha = (shadowCfg.alpha ?? 0.28) * alphaScale;
    if (baseAlpha <= 0.01 || halfW <= 0) return;

    const sprite = this.#getShadowSprite();
    ctx.save();
    ctx.globalAlpha = baseAlpha;
    ctx.drawImage(sprite, footX - halfW, footY - halfH, halfW * 2, halfH * 2);
    ctx.restore();
  }

  #getShadowSprite() {
    if (this._shadowSprite) return this._shadowSprite;
    const size = 96;
    const shadow = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(size, size)
      : (() => { const c = document.createElement('canvas'); c.width = size; c.height = size; return c; })();
    const ctx = shadow.getContext('2d');
    const center = size / 2;
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
    grad.addColorStop(0,    'rgba(30, 18, 8, 1)');
    grad.addColorStop(0.60, 'rgba(30, 18, 8, 0.45)');
    grad.addColorStop(1,    'rgba(30, 18, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    this._shadowSprite = shadow;
    return shadow;
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
      const bodyScale = (p.height / 720) * 1.23 * (world.config.player.heroScale ?? 1);
      const x = p.width / 2 + g.laneX * p.visualLaneWidth;
      const bottomMargin = world.config.player.bottomMargin ?? 0;
      const y = p.groundY - bottomMargin + g.y;

      if (this.#shouldDrawVoxelPlayer()) {
        if (this.#drawThreePlayer(x, y, bodyScale, {
          pose: g.crouching ? 'crouch' : 'run',
          frameIndex,
          tint: TRAIL_TINT,
        }, alpha)) continue;
        this.#drawVoxelFigure({
          x,
          y,
          bodyScale,
          alpha,
          pose: g.crouching ? 'crouch' : 'run',
          frameIndex,
          tint: TRAIL_TINT,
        });
        continue;
      }

      const prefix = g.crouching ? 'playerFarmerCrouch' : 'playerFarmerRun';
      const key = `${prefix}${String(frameIndex + 1).padStart(2, '0')}`;
      const img = this.assets.get(key);
      if (!img?.naturalWidth) continue;

      // v3.8.29 — uniform PIXEL_SCALE (same as live body), so trail ghosts
      // match the live player's per-sprite proportions exactly.
      // v3.8.31 — fit-to-canonical guard so oversized source frames don't
      // spill ghosts across the whole canvas.
      const pixelScale = (120 * bodyScale) / CANONICAL_PLAYER.w;
      const renderScale = getRenderScale(img, pixelScale);
      const meta = getFrameMeta(img, key);
      const drawW = Math.round(img.naturalWidth * renderScale);
      const drawH = Math.round(img.naturalHeight * renderScale);
      const anchorXInSprite = meta.anchorX - meta.spriteOffsetX;
      const anchorYInSprite = meta.footY - meta.spriteOffsetY;
      const drawLeft = Math.round(-anchorXInSprite * renderScale);
      const drawTop = Math.round(-anchorYInSprite * renderScale);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.drawImage(img, drawLeft, drawTop, drawW, drawH);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#7dff64';
      ctx.fillRect(drawLeft, drawTop, drawW, drawH);
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
    // crouch sprite by 22% on top of the shorter crouch ART. Scale is
    // now CONSTANT; only pose (sprite art choice) + foot-anchor Y
    // (jump arc) + tilt (rotation, not scale) change between states.
    const stretch = 1;
    const squash = 1;
    const bodyScale = (p.height / 720) * 1.23 * (world.config.player.heroScale ?? 1);
    // v3.8.29 — unified pixel scale derived from canonical 64×96 canvas.
    // See module-level comment for the full rationale.
    const pixelScale = (120 * bodyScale) / CANONICAL_PLAYER.w;

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

    const getJumpFrameIndex = () => {
      const vy = vert.vy;
      if (vy < -10) return 0;        // hard accel up
      if (vy < -4) return 1;         // late takeoff
      if (vy < 0) return 2;          // apex up
      if (vy < 4) return 3;          // apex down
      if (vy < 10) return 4;         // pre-landing
      return 5;                      // hard impact
    };
    const getHitFrameIndex = () => {
      const hitElapsed = world.config.gameplay.invulnerabilityFrames - health.invulnerabilityFrames;
      return hitElapsed < 4 ? 0 : hitElapsed < 8 ? 1 : hitElapsed < 16 ? 2 : 3;
    };
    const loopFrameIndex = (frameCount) => Math.floor(Math.abs(anim.runFrame) / 3.15) % frameCount;

    if (this.#shouldDrawVoxelPlayer()) {
      const pose =
        inMenuOrDead ? 'idle' :
        justHit ? 'hit' :
        airborne ? 'jump' :
        crouching ? 'crouch' : 'run';
      const frameIndex =
        pose === 'idle' ? Math.floor(anim.idleTime / 12) % 4 :
        pose === 'hit' ? getHitFrameIndex() :
        pose === 'jump' ? getJumpFrameIndex() :
        loopFrameIndex(pose === 'crouch' ? 4 : 8);

      if (this.#drawThreePlayer(x, y, bodyScale, {
        pose,
        frameIndex,
        tilt,
        tint: isClone ? CLONE_TINT : null,
      }, alpha)) {
        if (!isClone && world.config.debug?.showPlayer) {
          const visualW = Math.round(CANONICAL_PLAYER.w * pixelScale);
          const visualH = Math.round(CANONICAL_PLAYER.h * pixelScale);
          this.#drawPlayerDebug(world, {
            x, y, visualW, visualH, drawW: visualW, drawH: visualH,
            drawLeft: -Math.round(visualW / 2), drawTop: -visualH,
            alpha, runKey: `three:${pose}:${frameIndex}`, crouching, airborne, justHit, pixelScale,
            sourceW: 64, sourceH: 96,
          });
        }
        return;
      }
      this.#drawVoxelFigure({
        x,
        y,
        bodyScale,
        alpha,
        pose,
        frameIndex,
        tilt,
        tint: isClone ? CLONE_TINT : null,
      });
      if (!isClone && world.config.debug?.showPlayer) {
        const visualW = Math.round(CANONICAL_PLAYER.w * pixelScale);
        const visualH = Math.round(CANONICAL_PLAYER.h * pixelScale);
        this.#drawPlayerDebug(world, {
          x, y, visualW, visualH, drawW: visualW, drawH: visualH,
          drawLeft: -Math.round(visualW / 2), drawTop: -visualH,
          alpha, runKey: `voxel:${pose}:${frameIndex}`, crouching, airborne, justHit, pixelScale,
          sourceW: 64, sourceH: 96,
        });
      }
      return;
    }

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
      frameIndex = getHitFrameIndex();
      fallbackKey = 'playerFarmerHit01';
    } else if (airborne && this.assets.get('playerFarmerJump01')?.naturalWidth) {
      prefix = 'playerFarmerJump';
      frameCount = 6;
      // Jump pose driven by vy: takeoff (0-1) → apex up (2) → apex down (3) →
      // landing (4-5). vy is positive going down, negative going up.
      frameIndex = getJumpFrameIndex();
      fallbackKey = 'playerFarmerJump01';
    } else {
      // Run / crouch — the legacy looped tempo.
      prefix = crouching ? 'playerFarmerCrouch' : 'playerFarmerRun';
      frameCount = crouching ? 4 : 8;
      frameIndex = loopFrameIndex(frameCount);
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

    // v3.8.29 True Sprite Scale Normalization — uniform pixel scale.
    // The CANONICAL outer box stays constant across all states (sized
    // from CANONICAL_PLAYER.w × .h × pixelScale). Sprite art is drawn at
    // its NATURAL dimensions scaled by `renderScale`. For canonical-sized
    // frames (≤1.25× canonical) renderScale == pixelScale. For oversized
    // frames (e.g., 1254×1254 designer mistakes), renderScale falls back
    // to "fit canonical" so the sprite occupies roughly the canonical box
    // instead of overflowing the canvas — the source-size warning in the
    // debug label still surfaces the asset bug so designer can fix it.
    const visualW = Math.round(CANONICAL_PLAYER.w * pixelScale);
    const visualH = Math.round(CANONICAL_PLAYER.h * pixelScale);
    const meta = getFrameMeta(spriteImg, runKey);
    const renderScale = getRenderScale(spriteImg, pixelScale);
    const drawW = Math.round(spriteImg.naturalWidth * renderScale);
    const drawH = Math.round(spriteImg.naturalHeight * renderScale);
    const anchorXInSprite = meta.anchorX - meta.spriteOffsetX;
    const anchorYInSprite = meta.footY - meta.spriteOffsetY;
    const drawLeft = Math.round(-anchorXInSprite * renderScale);
    const drawTop = Math.round(-anchorYInSprite * renderScale);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(tilt);
    ctx.scale(squash, stretch);

    // v4.1 — P0 reference-match: sprite-following dark outline (NOT a box).
    // Stamp the sprite as a black silhouette (filter brightness(0) keeps the
    // alpha shape) offset in 4 directions behind the main draw, so the dark
    // edge hugs the farmer's real silhouette and separates him from busy
    // backgrounds after the full-frame grade — with no rectangular smudge in
    // the sprite's transparent areas. Skipped for split-clones so their
    // purple wash stays clean. Cheap: 4 drawImage calls for one sprite/frame.
    if (!isClone) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.55;
      ctx.filter = 'brightness(0)';
      const o = 2;
      ctx.drawImage(spriteImg, drawLeft - o, drawTop, drawW, drawH);
      ctx.drawImage(spriteImg, drawLeft + o, drawTop, drawW, drawH);
      ctx.drawImage(spriteImg, drawLeft, drawTop - o, drawW, drawH);
      ctx.drawImage(spriteImg, drawLeft, drawTop + o, drawW, drawH);
      ctx.restore();
    }

    // A one-pixel upper-right sunlight rim separates the farmer from dense
    // greenery without blurring the sprite or changing its authored pixels.
    const rimCfg = world.config.visual?.juice?.playerRimLight;
    if (!isClone && rimCfg?.enabled) {
      ctx.save();
      ctx.globalAlpha = alpha * (rimCfg.alpha ?? 0.18);
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'brightness(1.35) saturate(1.08)';
      ctx.drawImage(spriteImg, drawLeft + 1, drawTop - 1, drawW, drawH);
      ctx.restore();
    }

    ctx.drawImage(spriteImg, drawLeft, drawTop, drawW, drawH);

    if (isClone) {
      // Purple wash overlay so split-clones read as duplicates of the player.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = CLONE_TINT;
      ctx.fillRect(drawLeft, drawTop, drawW, drawH);
    }

    ctx.restore();

    if (!isClone && world.config.debug?.showPlayer) {
      this.#drawPlayerDebug(world, {
        x, y, visualW, visualH, drawW, drawH, drawLeft, drawTop,
        alpha, runKey, crouching, airborne, justHit, pixelScale,
        sourceW: spriteImg.naturalWidth, sourceH: spriteImg.naturalHeight,
      });
    }
  }

  /**
   * v3.8.29 — debug overlay surfaces the canonical-box vs sprite-art-box
   * relationship so QA can verify two invariants at once:
   *
   *  • CYAN outer box = canonical 64×96 × pixelScale — CONSTANT across
   *    every state. If two states show different cyan box sizes, the
   *    bug is in the renderer / pixelScale derivation.
   *  • MAGENTA inner box = actual sprite-art draw rect at uniform
   *    pixelScale (so a 56-wide sprite shows a NARROWER magenta box,
   *    not a same-width box like in v3.8.25). If the magenta box wider
   *    than cyan, designer over-shipped width vs canonical.
   *  • RED foot dot = anchor point (player.y). Should stay rooted at
   *    the same screen line across all states except jump.
   *  • YELLOW capsule = collision capsule, shorter in DUCK.
   *
   * The "duck looks like a shrunken farmer" failure shows up here as
   * MAGENTA visibly narrower AND shorter than cyan — and matching
   * character pixel scale to run. The "duck looks like a crouched
   * farmer of correct size" success shows up as MAGENTA at the same
   * pixel scale as run, just shorter.
   */
  #drawPlayerDebug(world, info) {
    const ctx = this.ctx;
    const {
      x, y, visualW, visualH, drawW, drawH, drawLeft, drawTop,
      alpha, runKey, crouching, airborne, justHit, pixelScale,
    } = info;
    const rx = Math.round(x);
    const ry = Math.round(y);
    ctx.save();
    // OUTER canonical box (cyan) — 64×96 × pixelScale. Constant.
    ctx.strokeStyle = '#00ffd6';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx - visualW / 2, ry - visualH, visualW, visualH);
    // INNER sprite-art box (magenta dashed) — actual drawn rect. Width
    // and height both vary by sprite at uniform scale.
    const sx = rx + drawLeft;
    const sy = ry + drawTop;
    ctx.strokeStyle = 'rgba(255,92,214,0.85)';
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(sx, sy, drawW, drawH);
    ctx.setLineDash([]);
    // Foot anchor (red dot) — stays put across run/duck/hit, lifts in jump.
    ctx.fillStyle = '#ff3030';
    ctx.beginPath();
    ctx.arc(rx, ry, 3, 0, Math.PI * 2);
    ctx.fill();
    // Collision capsule (yellow dashed) — shorter when crouching.
    const collisionH = crouching ? visualH * 0.55 : visualH * 0.95;
    const collisionW = visualW * 0.42;
    ctx.strokeStyle = 'rgba(255,210,80,0.7)';
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(rx - collisionW / 2, ry - collisionH, collisionW, collisionH);
    ctx.setLineDash([]);
    // State label — two lines now.
    //   line 1: state + scale + boxes + sprite key
    //   line 2: canonical vs source size + ✓ or ⚠ if designer needs to re-export
    const state = justHit ? 'HIT' : airborne ? 'JUMP' : crouching ? 'DUCK' : 'RUN';
    const { sourceW, sourceH } = info;
    const canonical = CANONICAL_PLAYER;
    const sizeMismatch = sourceW !== canonical.w || sourceH !== canonical.h;
    const sizeBadge = sizeMismatch ? '⚠ re-export on 64×96' : '✓';
    const line1 = `${state} | scale=${pixelScale.toFixed(2)} | box=${visualW}×${visualH} | art=${drawW}×${drawH} | ${runKey}`;
    const line2 = `canonical ${canonical.w}×${canonical.h} / source ${sourceW}×${sourceH} ${sizeBadge}`;
    ctx.font = '11px monospace';
    const tw1 = ctx.measureText(line1).width;
    const tw2 = ctx.measureText(line2).width;
    const tw = Math.max(tw1, tw2);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(rx - tw / 2 - 4, ry - visualH - 32, tw + 8, 28);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(line1, rx, ry - visualH - 22);
    ctx.fillStyle = sizeMismatch ? '#ffb060' : '#9be8a3';
    ctx.fillText(line2, rx, ry - visualH - 8);
    ctx.restore();
  }

  #shouldDrawVoxelPlayer() {
    return this.voxelEnabled && this.voxelBlocks?.enabled;
  }

  #drawThreePlayer(x, y, bodyScale, options, alpha) {
    if (!this.threeModels?.enabled) return false;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    const drawn = this.threeModels.draw(ctx, 'player', x, y, bodyScale, {
      ...options,
      width: 96,
      height: 176,
      preservePoseScale: true,
    });
    ctx.restore();
    return drawn;
  }

  #drawVoxelFigure({
    x,
    y,
    bodyScale,
    alpha = 1,
    pose = 'run',
    frameIndex = 0,
    tilt = 0,
    tint = null,
  }) {
    const ctx = this.ctx;
    const s = bodyScale;
    const crouch = pose === 'crouch';
    const jump = pose === 'jump';
    const hit = pose === 'hit';
    const idle = pose === 'idle';
    const stride = Math.sin(frameIndex * Math.PI * 0.5) * (pose === 'run' ? 1 : 0);
    const bob = idle ? Math.sin(frameIndex * Math.PI * 0.5) * 1.5 * s : 0;
    const palette = this.#voxelPlayerPalette(tint, hit);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(playerSnap(x), playerSnap(y + bob));
    ctx.rotate(tilt + (hit ? -0.10 : 0));

    const hipY = crouch ? -38 * s : -52 * s;
    const torsoY = crouch ? -84 * s : -116 * s;
    const headY = crouch ? -120 * s : -154 * s;
    const hatY = headY - 23 * s;
    const bodyW = crouch ? 58 * s : 52 * s;
    const bodyH = crouch ? 42 * s : 58 * s;
    const depth = 8 * s;

    this.#voxelFoot(-18 * s - stride * 4 * s, -5 * s, s, palette, stride < -0.1);
    this.#voxelFoot(18 * s + stride * 4 * s, -5 * s, s, palette, stride > 0.1);
    this.#voxelLeg(-15 * s, hipY, crouch ? 36 * s : 48 * s, s, palette, stride, crouch || jump);
    this.#voxelLeg(15 * s, hipY, crouch ? 32 * s : 48 * s, s, palette, -stride, crouch);

    this.#voxelBox(-bodyW / 2, torsoY, bodyW, bodyH, depth, palette.shirtFront, palette.shirtSide, palette.shirtTop, palette.outline);
    this.#voxelBox(-18 * s, torsoY + 6 * s, 9 * s, bodyH - 8 * s, 4 * s, palette.overall, palette.overallSide, palette.overallTop, palette.outline);
    this.#voxelBox(9 * s, torsoY + 6 * s, 9 * s, bodyH - 8 * s, 4 * s, palette.overall, palette.overallSide, palette.overallTop, palette.outline);
    this.#voxelBox(-10 * s, torsoY + 31 * s, 20 * s, 14 * s, 4 * s, palette.overall, palette.overallSide, palette.overallTop, palette.outline);

    const armSwing = pose === 'run' ? stride * 10 * s : jump ? -12 * s : crouch ? 8 * s : 0;
    this.#voxelArm(-bodyW / 2 - 8 * s, torsoY + 12 * s + armSwing, s, palette, -1);
    this.#voxelArm(bodyW / 2 - 2 * s, torsoY + 12 * s - armSwing, s, palette, 1);

    this.#voxelBox(-20 * s, headY, 40 * s, 34 * s, 7 * s, palette.skinFront, palette.skinSide, palette.skinTop, palette.outline);
    this.#voxelBox(-16 * s, headY + 11 * s, 9 * s, 6 * s, 2 * s, '#1d221d', '#121712', '#2a3128', palette.outline);
    this.#voxelBox(7 * s, headY + 11 * s, 9 * s, 6 * s, 2 * s, '#1d221d', '#121712', '#2a3128', palette.outline);
    this.#voxelBox(-8 * s, headY + 22 * s, 16 * s, 4 * s, 2 * s, palette.mouth, palette.mouth, palette.mouth, null);

    this.#voxelBox(-38 * s, hatY + 18 * s, 76 * s, 11 * s, 6 * s, palette.hatBrim, palette.hatSide, palette.hatTop, palette.outline);
    this.#voxelBox(-25 * s, hatY, 50 * s, 24 * s, 8 * s, palette.hatFront, palette.hatSide, palette.hatTop, palette.outline);

    ctx.restore();
  }

  #voxelPlayerPalette(tint, hit) {
    if (tint) {
      return {
        outline: '#21152e',
        skinFront: tint,
        skinSide: tint,
        skinTop: '#f0d6ff',
        hatFront: tint,
        hatSide: '#65409a',
        hatTop: '#d7b9ff',
        hatBrim: tint,
        shirtFront: tint,
        shirtSide: '#65409a',
        shirtTop: '#d7b9ff',
        overall: '#6d58c8',
        overallSide: '#4d3a96',
        overallTop: '#9f8cff',
        boot: '#302047',
        bootSide: '#171026',
        mouth: '#21152e',
      };
    }
    return {
      outline: hit ? '#5b1320' : '#3a2210',
      skinFront: hit ? '#ff9aa8' : '#d98b55',
      skinSide: hit ? '#d75265' : '#a85f34',
      skinTop: hit ? '#ffc1ca' : '#f0b77b',
      hatFront: hit ? '#ffd16b' : '#e7b248',
      hatSide: hit ? '#b76f24' : '#9b611f',
      hatTop: hit ? '#ffe28a' : '#f8cf66',
      hatBrim: hit ? '#f0a642' : '#c9892e',
      shirtFront: hit ? '#ff625d' : '#e64639',
      shirtSide: hit ? '#bd3439' : '#9b2c25',
      shirtTop: hit ? '#ff9188' : '#ff6f5e',
      overall: hit ? '#5aa7ff' : '#2466b8',
      overallSide: hit ? '#2868b5' : '#18467d',
      overallTop: hit ? '#8cc3ff' : '#3f86de',
      boot: '#45311f',
      bootSide: '#21170e',
      mouth: '#4c2216',
    };
  }

  #voxelLeg(x, hipY, length, s, palette, swing, bent) {
    const lean = swing * 7 * s;
    const kneeY = hipY + length * 0.46;
    const footY = -18 * s;
    if (bent) {
      this.#voxelBox(x - 7 * s, hipY, 14 * s, length * 0.46, 5 * s, palette.overall, palette.overallSide, palette.overallTop, palette.outline);
      this.#voxelBox(x - 4 * s + lean * 0.45, kneeY - 2 * s, 13 * s, footY - kneeY, 5 * s, palette.overall, palette.overallSide, palette.overallTop, palette.outline);
      return;
    }
    this.#voxelBox(x - 7 * s + lean * 0.2, hipY, 14 * s, footY - hipY, 5 * s, palette.overall, palette.overallSide, palette.overallTop, palette.outline);
  }

  #voxelFoot(x, y, s, palette, forward) {
    const w = forward ? 25 * s : 21 * s;
    this.#voxelBox(x - w / 2, y - 10 * s, w, 10 * s, 5 * s, palette.boot, palette.bootSide, '#5a412a', palette.outline);
  }

  #voxelArm(x, y, s, palette, side) {
    this.#voxelBox(x, y, 10 * s, 36 * s, 5 * s, palette.shirtFront, palette.shirtSide, palette.shirtTop, palette.outline);
    this.#voxelBox(x + side * 1 * s, y + 30 * s, 10 * s, 12 * s, 4 * s, palette.skinFront, palette.skinSide, palette.skinTop, palette.outline);
  }

  #voxelBox(x, y, w, h, d, front, side, top, outline) {
    const ctx = this.ctx;
    const sx = playerSnap(x);
    const sy = playerSnap(y);
    const sw = playerSnap(w);
    const sh = playerSnap(h);
    const sd = playerSnap(d);
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = Math.max(1, playerSnap(Math.max(1, d * 0.20)));
    }
    if (top) {
      ctx.fillStyle = top;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sd, sy - sd);
      ctx.lineTo(sx + sw + sd, sy - sd);
      ctx.lineTo(sx + sw, sy);
      ctx.closePath();
      ctx.fill();
      if (outline) ctx.stroke();
    }
    if (side) {
      ctx.fillStyle = side;
      ctx.beginPath();
      ctx.moveTo(sx + sw, sy);
      ctx.lineTo(sx + sw + sd, sy - sd);
      ctx.lineTo(sx + sw + sd, sy + sh - sd);
      ctx.lineTo(sx + sw, sy + sh);
      ctx.closePath();
      ctx.fill();
      if (outline) ctx.stroke();
    }
    ctx.fillStyle = front;
    ctx.fillRect(sx, sy, sw, sh);
    if (outline) {
      ctx.strokeRect(sx, sy, sw, sh);
    }
  }
}
