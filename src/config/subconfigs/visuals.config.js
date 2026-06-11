export const VISUALS_CONFIG = {
  enabled: true,
  grade: {
    enabled: true,
    // M157 color-grade round: saturate raised to 1.82 to push land-band S
    // to >=0.68; brightness 0.93 pulls V toward reference. Contrast at
    // 1.10 (slightly softer than 1.15) to avoid clipping dark pixel edges.
    saturate: 1.82,
    contrast: 1.10,
    brightness: 0.93,
    warmCool: {
      enabled: true,
      // M156: shift warm stop toward pure golden-yellow (less orange) and
      // raise strength so the lower-right gets a richer warm tint.
      // Cool stop changed to a desaturated purple-shadow rather than blue
      // because the blue cool tint was pushing road/meadow hue toward teal
      // (the diagonal axis hits the bottom-left = road band).
      // M157: raise warm strength slightly so the land bands pick up more
      // yellow-green character rather than teal-blue from the sky bleed.
      warm: 'rgba(255, 228, 80, 1)',
      cool: 'rgba(40, 40, 80, 1)',
      strength: 0.18,
    },
    vignette: { enabled: true, strength: 0.06 },
  },
  // Sky hue adjustment — shifts the sky asset from measured H213 toward the
  // reference target H192-200. Applied as a CSS hue-rotate() in SkyRenderer.
  // M157 final: -20deg is the best compromise — shifts H213→H205 while keeping
  // V in .66-.70 range. Larger rotations (e.g. -32deg) caused severe V drop
  // (.73→.58) due to CSS matrix channel clamping on saturated blue pixels.
  // Structural limit: the sky asset hue cannot reach H192-200 without major
  // V degradation; H204-206 is the maximum achievable with V>=.66.
  sky: {
    hueRotate: -20,
  },
  depth: {
    // M157 final: mountains — farHueRotate -55deg achieves H165 (target
    // H150-165) when sky is at round-4 level. With sky at -20deg (slightly
    // lighter), mountain band H may read ~H170. Accept as the best balanced
    // state given ~49% of that band is sky background pixels.
    // farDarken 0.78 pushes far-layer brightness to its 0.38 floor limit,
    // targeting mountain sprite V in the .35-.45 range before sky averaging.
    farDesaturate: 0.20,
    farDarken: 0.78,
    farHueRotate: -55,
    sceneryHaze: { enabled: true, alpha: 0.10 },
    sceneryTint: { enabled: true, thresholdScale: 0.13, desaturate: 0.20, lighten: 0.10, maxCacheEntries: 12 },
  },
  collectibles: {
    centerTrail: { enabled: true, spacing: 6, runLength: 16 },
    glow: { enabled: true, radiusScale: 1.12, pulse: 0.10, alpha: 0.28, flowerColor: '#ffcf3a' },
    lead: { enabled: true, scaleStart: 0.7, scaleFull: 0.92, maxBoost: 0.4 },
    lineJitter: 0.3,
  },
  obstacles: {
    tint: { enabled: true, color: '#7a4fd0', strength: 0.20 },
    outline: { enabled: true, color: 'rgba(20,12,40,0.55)', width: 2 },
  },
  density: { decorMultiplier: 1.80, scatterFlowers: true, groundScatter: true },
  // B2 — mid-field decorative garland. Brown arch branches + small purple flowers,
  // strung between the side bands at mid-distance. Unmistakably distinct from the
  // vine_barrier obstacle (green thorns vs brown arch, horizontal strip vs curved
  // arch, no hitbox vs damaging collision). Default enabled:true.
  garland: {
    enabled: true,
    // World-unit cadence range between consecutive garlands. Wide range avoids
    // repetitive walls of arches and keeps each one a memorable accent beat.
    cadenceLo: 80,
    cadenceHi: 130,
    // Overall opacity of the arch. Keeps it clearly decorative without fading so
    // far it vanishes. Reduced slightly vs full 1.0 to integrate into scene depth.
    opacity: 0.80,
    // Visual scale multiplier applied on top of the projected scale. 1.0 = the
    // 540-px draw width fills the corridor at 50-80m depth.
    scale: 1.0,
    // Logical pixel width (at scale 1.0) used when projecting a garland sprite.
    // SceneryRenderer multiplies this by projectedScale to get the on-screen width.
    // Single source of truth — sceneryDispatch.js dead entry was removed so this
    // is the only place the constant lives.
    drawWidth: 540,
    // Screen-space lift (logical px at scale 1.0) above the projected ground
    // contact Y. Lifts the arch into the mid-air "doorway" read rather than
    // lying flat on the road like the disabled vineGarlands road decoration.
    yLiftPx: 54,
    // Minimum world-unit clearance between a garland depth and any reserved
    // road obstacle. Garlands that land within this window are deferred by
    // garlandRetryDistance to prevent visual stacking of decor + obstacle
    // (founding-spec rule: decor must not blend with obstacles).
    obstacleClearance: 26,
    // How far to nudge a garland depth when the clearance check fails.
    // Keeps the cadence rhythm intact — the retried depth is still within
    // the original cadence window, just pushed forward past the obstacle.
    garlandRetryDistance: 18,
  },
  detail: {
    meadowTexture: true,
    vineGarlands: false,
    meadow: {
      count: 2400,
      outerPatchFraction: 0.50,
      nearBias: 0.68,
      violetRatio: 0.74,
      yellowRatio: 0.14,
      tierCounts: { low: 1400, medium: 1900, high: 2400 },
    },
  },
  background: {
    cloudKeys: [
      'backgroundCloud03',
      'backgroundCloud04',
      'backgroundCloud05',
      'backgroundCloud06',
    ],
  },
  // B1 — far horizon tree-line. Sits between the mountain silhouettes and the
  // corridor vanishing point, framing the castle like the reference.
  // Toggle the whole feature with `enabled: false` for A/B comparison.
  horizon: {
    enabled:      true,
    // Density: number of tree trunks per viewport width (doubled internally
    // because the strip is 2× wide for seamless scroll wrap).
    density:      14,
    // Tree height as a fraction of strip height: each tree gets a random
    // value in [treeHeightMin, treeHeightMax] × stripH.
    treeHeightMin: 0.55,
    treeHeightMax: 0.98,
    // Strip bottom Y = roadVanishY + landmarkOffset.
    // 72 = just above LandmarksRenderer's ground polygon at roadVanishY+78.
    landmarkOffset: 72,
    // Strip top Y = stripBottomY − stripH, where:
    //   stripH = (roadVanishY + landmarkOffset) - (horizonY + aboveHorizon)
    // aboveHorizon=32 means the strip overlaps the near-mountain layer by ~32px,
    // so tree canopies blend into the mountain silhouette.
    aboveHorizon:   32,
    // Where tree roots sit within the strip height (0=top, 1=bottom).
    baselineRatio:  0.88,
    // Darkening overlay alpha applied to each tree sprite when baking the strip.
    darkenFactor:   0.62,
    // Parallax scroll factor (fraction of world.scrollOffset).
    scrollFactor:   0.09,
    // Overall draw alpha for the blitted strip (blends over the sky/mountains).
    alpha:          0.80,
  },
  juice: {
    playerShadow: { enabled: true, alpha: 0.28, widthScale: 0.92 },
    playerRimLight: { enabled: true, alpha: 0.18 },
    floraShadow: { enabled: true, alpha: 0.30, widthScale: 0.78 },
    solidShadow: { enabled: true, alpha: 0.44, widthScale: 0.74 },
    runDust: { enabled: true, rate: 0.5 },
    collectFlash: { enabled: true, bloom: 0.16 },
  },
};
