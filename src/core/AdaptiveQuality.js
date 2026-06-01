/**
 * FPS-driven graphics quality scaler.
 *
 * Watches the live loop frame-time. If the rolling average crosses the
 * "degrade" threshold for `degradeSampleFrames` frames in a row, we step
 * the quality tier DOWN — disabling parallax / particle bursts / etc.
 * If the average stays under the "recover" threshold for `recoverSampleFrames`
 * frames we step BACK UP.
 *
 * Why a separate class:
 *   - SRP: knows nothing about gameplay; only reads loop metrics and writes
 *     `world.config.gameFeel` flags + `world.adaptiveQuality.tier`.
 *   - Idempotent: applying the same tier twice does nothing.
 *   - Telemetry: PerformanceHUD reads `world.adaptiveQuality.tier` for the
 *     overlay; users see when they fell to a lower tier.
 *
 * Tier ladder (highest → lowest):
 *   3 — Ultra:  parallax + particles + camera shake + score popups
 *   2 — High:   parallax + particles + camera shake (no score popups)
 *   1 — Mid:    particles only (no parallax / shake / popups)
 *   0 — Low:    everything stripped (chunky frame survival mode)
 */
const TIERS = Object.freeze([
  { id: 0, label: 'Low',   parallax: false, particles: false, cameraShake: false, scorePopups: false, ambientMotion: false, postProcessGrade: false, particleCapPct: 0.20 },
  { id: 1, label: 'Mid',   parallax: false, particles: true,  cameraShake: false, scorePopups: false, ambientMotion: false, postProcessGrade: false, particleCapPct: 0.45 },
  { id: 2, label: 'High',  parallax: true,  particles: true,  cameraShake: true,  scorePopups: false, ambientMotion: true,  postProcessGrade: true,  particleCapPct: 0.75 },
  { id: 3, label: 'Ultra', parallax: true,  particles: true,  cameraShake: true,  scorePopups: true,  ambientMotion: true,  postProcessGrade: true,  particleCapPct: 1.00 },
]);

const DEGRADE_FRAMETIME_MS = 22;   // ≈ 45 fps
const RECOVER_FRAMETIME_MS = 17;   // ≈ 58 fps
const DEGRADE_HOLD_FRAMES  = 180;  // ≈ 3 s sustained dip → step down
const RECOVER_HOLD_FRAMES  = 300;  // ≈ 5 s sustained good → step up

export class AdaptiveQuality {
  constructor() {
    /** Default to Ultra — first 3 seconds will catch genuinely slow hardware. */
    this.tier = TIERS[TIERS.length - 1];
    this.degradeRun = 0;
    this.recoverRun = 0;
    /** Whether the user explicitly pinned a tier via Settings — skips auto. */
    this.locked = false;
  }

  /**
   * Force a tier and disable auto-scaling. Use from Settings UI ("Quality: High").
   * @param {0 | 1 | 2 | 3 | null} tierId — null = unlock auto.
   */
  setLocked(tierId) {
    if (tierId === null || tierId === undefined) {
      this.locked = false;
      return;
    }
    const t = TIERS.find((entry) => entry.id === tierId);
    if (!t) return;
    this.locked = true;
    this.#apply(t);
  }

  /**
   * Per-frame hook driven by Game.#update. Reads loop.metrics.frameDeltaMs
   * and adjusts tier if thresholds hold long enough.
   */
  observe(world, frameDeltaMs) {
    if (this.locked) return;
    if (!Number.isFinite(frameDeltaMs) || frameDeltaMs <= 0) return;

    if (frameDeltaMs > DEGRADE_FRAMETIME_MS) {
      this.degradeRun += 1;
      this.recoverRun = 0;
      if (this.degradeRun >= DEGRADE_HOLD_FRAMES) {
        this.#stepDown(world);
        this.degradeRun = 0;
      }
    } else if (frameDeltaMs < RECOVER_FRAMETIME_MS) {
      this.recoverRun += 1;
      this.degradeRun = 0;
      if (this.recoverRun >= RECOVER_HOLD_FRAMES) {
        this.#stepUp(world);
        this.recoverRun = 0;
      }
    } else {
      // Inside the dead band — slowly bleed both counters so we don't
      // build false positives over time.
      if (this.degradeRun > 0) this.degradeRun -= 1;
      if (this.recoverRun > 0) this.recoverRun -= 1;
    }
  }

  /** Reset to Ultra (or the locked tier) — called on world.reset(). */
  resetMetrics() {
    this.degradeRun = 0;
    this.recoverRun = 0;
  }

  #stepDown(world) {
    const idx = this.tier.id;
    if (idx <= 0) return;
    this.#applyToWorld(TIERS[idx - 1], world);
  }

  #stepUp(world) {
    const idx = this.tier.id;
    if (idx >= TIERS.length - 1) return;
    this.#applyToWorld(TIERS[idx + 1], world);
  }

  #apply(tier) {
    this.tier = tier;
  }

  #applyToWorld(tier, world) {
    if (tier === this.tier) return;
    this.tier = tier;
    // Mutate gameFeel flags — every renderer + system already reads these
    // each frame, so there's no need to broadcast a change event.
    const gf = world.config.gameFeel;
    gf.particles    = tier.particles;
    gf.cameraShake  = tier.cameraShake;
    gf.scorePopups  = tier.scorePopups;
    gf.ambientMotion = tier.ambientMotion;
    // Particle cap — ParticleSystem reads it lazily inside spawn().
    if (world.particleSystem) world.particleSystem.softCap = Math.floor(256 * tier.particleCapPct);
    console.info(`[AdaptiveQuality] tier → ${tier.label}`);
  }
}
