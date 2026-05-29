/**
 * Particles + score popups + full-screen hit flash. Sits on top of all
 * world geometry so VFX always read.
 *
 * Particles and popups are owned by their respective systems as pool-backed
 * plain-object arrays (`world.particleSystem.particles`,
 * `world.popupSystem.popups`) — NOT registry entities. This keeps the
 * per-burst spawn allocation-free.
 *
 * v3: when a particle carries a `spriteKey` (e.g. 'dustPuff', 'sparkle'),
 * the matching frame from the designer-shipped 4-frame sheet is drawn
 * instead of the procedural arc. If the spritesheet isn't loaded the
 * particle falls back to the arc — so this code keeps running cleanly
 * during partial asset deliveries.
 */
export class EffectsRenderer {
  constructor({ ctx, projection, gradients, assets }) {
    this.ctx = ctx;
    this.projection = projection;
    this.gradients = gradients;
    this.assets = assets;
    /**
     * Decaying combo pulse (0..1). Bumped to 1 by EventBus 'comboChanged'
     * milestones (see World wiring); decays in render() each frame. Drives
     * a vignette + center ×N badge overlay so the player feels the tier
     * crossing without needing audio.
     */
    this.comboPulse = 0;
    this.comboPulseMultiplier = 0;
  }

  /**
   * Trigger a combo pulse — called by World when comboChanged fires with
   * a higher multiplier. Cheap and idempotent: re-arming overwrites the
   * decay, no allocation.
   */
  triggerComboPulse(multiplier) {
    this.comboPulse = 1;
    this.comboPulseMultiplier = multiplier;
  }

  render(world) {
    const ctx = this.ctx;
    // v3.8.30 — when ON, every full-screen overlay below (power-up
    // vignette, synergy rainbow, dying chromatic + REPLAY pill, combo
    // pulse vignette, hit-flash full-screen) is skipped. Per-particle,
    // score-popup, and the multiplier ×N badge above the player still
    // render — they don't obscure the farmer for pose QA.
    const noFx = world.config.debug?.disableFullScreenEffects === true;

    // Active-power-up vignette: tinted radial edges that pulse slowly.
    // Burst (green) and split-clones (purple) stack alpha-wise — both can
    // be active at the same time.
    const burstActive = world.powerUpSystem.isSpeedBurstActive();
    const splitActive = world.powerUpSystem.isSplitClonesActive();
    if (!noFx && (burstActive || splitActive)) {
      const pulse = 0.65 + 0.35 * Math.sin(world.timeAlive * 0.11);
      if (burstActive) {
        ctx.globalAlpha = pulse;
        ctx.fillStyle = this.gradients.burstVignette;
        ctx.fillRect(0, 0, this.projection.width, this.projection.height);
      }
      if (splitActive) {
        ctx.globalAlpha = pulse * 0.9;
        ctx.fillStyle = this.gradients.splitVignette;
        ctx.fillRect(0, 0, this.projection.width, this.projection.height);
      }
      ctx.globalAlpha = 1;
    }

    // v3.5 power-up SYNERGY glow — when 2+ power-ups stack simultaneously,
    // overlay a rainbow shimmer at the screen edges. 3+ punches the
    // intensity further. Pure visual feedback for "you're in the zone".
    const activeCount = this.#countActivePowerUps(world);
    if (!noFx && activeCount >= 2) {
      const intensity = activeCount >= 3 ? 0.45 : 0.22;
      const pulse = 0.55 + 0.45 * Math.sin(world.timeAlive * 0.14);
      ctx.save();
      ctx.globalAlpha = intensity * pulse;
      const W = this.projection.width;
      const H = this.projection.height;
      const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      // Pick a colour swirl that drifts over time — rainbow hint without
      // a full HSV cycle.
      const hue = Math.floor((world.timeAlive * 0.6) % 360);
      grad.addColorStop(0.7, `hsla(${hue}, 90%, 60%, 0.55)`);
      grad.addColorStop(1, `hsla(${(hue + 90) % 360}, 90%, 55%, 0.85)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (world.config.gameFeel.particles) {
      const particles = world.particleSystem.particles;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const lifeAlpha = Math.min(1, p.life / 22);
        ctx.globalAlpha = lifeAlpha;
        const spriteImg = this.#particleSprite(p);
        if (spriteImg) {
          const w = (p.spriteSize || p.radius * 6);
          const h = w * (spriteImg.naturalHeight / spriteImg.naturalWidth);
          ctx.drawImage(spriteImg, p.x - w / 2, p.y - h / 2, w, h);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    if (world.config.gameFeel.scorePopups) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const popups = world.popupSystem.popups;
      for (let i = 0; i < popups.length; i += 1) {
        const p = popups[i];
        const t = p.life / p.maxLife;
        ctx.globalAlpha = Math.min(1, t * 1.35);
        ctx.font = `900 ${Math.round(18 * p.scale)}px system-ui, sans-serif`;
        ctx.strokeStyle = 'rgba(22,36,18,0.55)';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      }
    }

    // v3.5 dying state: REPLAY-style indicator + chromatic vignette
    // during the slow-mo death moment. Reads from world.dyingFrames as
    // the timing source; alpha decays as the timer drains so the effect
    // is at its boldest right after the fatal hit.
    if (!noFx && world.state === 'dying') {
      const total = world.config.gameplay.dyingFrames || 1;
      const t = Math.max(0, Math.min(1, world.dyingFrames / total));
      const W = this.projection.width;
      const H = this.projection.height;

      // v3.8.35 — neutral navy/black dim instead of the heavy red wash.
      // The red previously fought the death modal's gold/cream palette and
      // hid the scene that the player just finished. Red identity is now
      // carried exclusively by the .death-cause accent inside the modal.
      ctx.save();
      ctx.globalAlpha = 0.55 * t;
      const dGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.7);
      dGrad.addColorStop(0, 'rgba(0,0,0,0)');
      dGrad.addColorStop(1, 'rgba(6, 12, 24, 0.82)');
      ctx.fillStyle = dGrad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // v3.8.26 — "REPLAY" pill reworked for legibility. Earlier 28 px
      // soft red text was almost invisible against the bright corridor.
      // Now: 56 px bold, brighter danger-red, dark pill BACKDROP so the
      // text reads against any background — even dense flower fields.
      // Includes a small "TAP TO RESTART" subtitle so the player knows
      // the input cue.
      ctx.save();
      ctx.globalAlpha = 0.92 * t;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const replayY = Math.round(H * 0.22);
      // Pill backdrop
      ctx.font = '900 56px system-ui, sans-serif';
      const pillText = '• REPLAY •';
      const pillW = ctx.measureText(pillText).width + 56;
      const pillH = 84;
      ctx.fillStyle = 'rgba(20,4,4,0.78)';
      ctx.beginPath();
      const rx = W / 2 - pillW / 2;
      const ry = replayY - pillH / 2;
      ctx.rect(rx, ry, pillW, pillH);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, pillW, pillH);
      // Main text
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 6;
      ctx.strokeText(pillText, W / 2, replayY - 6);
      ctx.fillStyle = '#ff5050';
      ctx.fillText(pillText, W / 2, replayY - 6);
      // Subtitle
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,200,200,0.92)';
      ctx.fillText('TAP TO RESTART', W / 2, replayY + 24);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // v3.4 countdown: big 3 / 2 / 1 / GO overlay during world.state === 'starting'.
    // Scale + fade-in/out driven by the per-second slice of countdownFrames.
    if (world.state === 'starting' && world.countdownFrames > 0) {
      const remainingSec = world.countdownFrames / 60;
      const wholeRemaining = Math.ceil(remainingSec);
      const label = wholeRemaining > 0 ? String(wholeRemaining) : 'GO!';
      // Fraction inside the current second: 1 → fresh number, 0 → about to swap.
      const frac = remainingSec - Math.floor(remainingSec);
      // Snap on entry (big), fade out as the number ages.
      const alpha = Math.min(1, frac * 2.5);
      const scale = 1.4 - frac * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.round(160 * scale);
      ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 10;
      const cx = this.projection.width / 2;
      const cy = this.projection.height * 0.42;
      ctx.strokeText(label, cx, cy);
      ctx.fillStyle = '#ffd54a';
      ctx.fillText(label, cx, cy);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Combo pulse — golden vignette + center ×N badge that decays over
    // ~600 ms. Triggered by World when comboChanged crosses a tier.
    if (this.comboPulse > 0) {
      const a = this.comboPulse;
      // Decay rate: ~0.025 per render frame → finishes around 0.4-0.6 s.
      this.comboPulse = Math.max(0, this.comboPulse - 0.025);

      // Golden vignette via radial gradient — uses the existing splitVignette
      // pattern as a tinted overlay; cheap because no per-frame allocation.
      // v3.8.30 — gated by `noFx`; the ×N badge below the gate still
      // shows so QA can verify the multiplier popup without the fullscreen
      // sheen washing out the rest of the frame.
      if (!noFx) {
        ctx.save();
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = '#ffd54a';
        // Soft inner cut-out (player area stays clear, edges glow).
        const cx = this.projection.width / 2;
        const cy = this.projection.height * 0.55;
        const grad = ctx.createRadialGradient(cx, cy, this.projection.width * 0.18, cx, cy, this.projection.width * 0.6);
        grad.addColorStop(0, 'rgba(255,213,74,0)');
        grad.addColorStop(1, 'rgba(255,213,74,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.projection.width, this.projection.height);
        ctx.restore();
      }

      // v3.8.25 — ×N badge moved from screen center (was at height*0.42,
      // covering the castle / road-to-castle axis) to a small popup
      // directly above the player. Font dropped 96-126 → 36-44 px. Fades
      // UP as it decays so the pickup-reward read is "score+1×N rising
      // from where you collected it", not "huge label blocking the
      // horizon".
      if (this.comboPulseMultiplier > 0) {
        const playerLaneX = world.player?.components.LaneState.laneX ?? 0;
        const playerY = world.player?.components.VerticalState.y ?? 0;
        const popX = this.projection.width / 2 + playerLaneX * this.projection.visualLaneWidth;
        // Anchor: ~240 px above the player's feet, then lifts another
        // ~80 px as alpha decays so it visually drifts up while fading.
        const popY = this.projection.groundY + playerY - 240 - (1 - a) * 80;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.round(36 + (1 - a) * 8);
        ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
        ctx.strokeStyle = 'rgba(122, 74, 8, 0.85)';
        ctx.lineWidth = 4;
        const label = `×${this.comboPulseMultiplier}`;
        ctx.strokeText(label, popX, popY);
        ctx.fillStyle = '#ffd54a';
        ctx.fillText(label, popX, popY);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // Hit flash — prefers designer-shipped full-screen overlay (4 frames
    // by alpha decay); falls back to a flat colour fill if the overlay
    // isn't loaded.
    const flash = world.player?.components.Health.hitFlash ?? 0;
    if (!noFx && flash > 0) {
      const flashIdx = Math.min(3, Math.floor((1 - flash) * 4));
      const flashImg = this.assets?.get(`hitFlash0${flashIdx + 1}`);
      if (flashImg?.naturalWidth) {
        ctx.globalAlpha = Math.min(1, flash);
        ctx.drawImage(flashImg, 0, 0, this.projection.width, this.projection.height);
      } else {
        ctx.globalAlpha = flash * 0.12;
        ctx.fillStyle = '#ff6464';
        ctx.fillRect(0, 0, this.projection.width, this.projection.height);
      }
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Count of currently-active power-ups. Reads through the legacy
   * accessors so a future power-up addition (which already extends
   * PowerUpSystem via the data table) needs zero changes here.
   */
  #countActivePowerUps(world) {
    const pu = world.powerUpSystem;
    let c = 0;
    if (pu.isSpeedBurstActive())  c += 1;
    if (pu.isSplitClonesActive()) c += 1;
    if (pu.isMagnetActive())      c += 1;
    if (pu.isShieldActive())      c += 1;
    if (pu.isScoreX2Active())     c += 1;
    return c;
  }

  /**
   * Look up the current frame of a sprite-driven particle. Frame index
   * advances linearly with age, capped at spriteFrames-1 so the last
   * frame stays on screen for the tail of the life budget.
   */
  #particleSprite(p) {
    if (!p.spriteKey || !p.spriteFrames || !this.assets) return null;
    const age = 1 - (p.life / p.maxLife);
    const frameIdx = Math.min(p.spriteFrames - 1, Math.floor(age * p.spriteFrames));
    const key = `${p.spriteKey}0${frameIdx + 1}`;
    const img = this.assets.get(key);
    return img?.naturalWidth ? img : null;
  }
}
