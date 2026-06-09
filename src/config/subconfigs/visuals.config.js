export const VISUALS_CONFIG = {
  enabled: true,
  grade: {
    enabled: true,
    saturate: 1.16,
    contrast: 1.15,
    brightness: 0.99,
    warmCool: {
      enabled: true,
      warm: 'rgba(255, 216, 138, 1)',
      cool: 'rgba(64, 86, 158, 1)',
      strength: 0.13,
    },
    vignette: { enabled: true, strength: 0.06 },
  },
  depth: {
    farDesaturate: 0.11,
    farDarken: 0.10,
    sceneryHaze: { enabled: true, alpha: 0.13 },
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
  density: { decorMultiplier: 1.62, scatterFlowers: true, groundScatter: true },
  detail: {
    meadowTexture: true,
    vineGarlands: false,
    meadow: {
      count: 2400,
      outerPatchFraction: 0.50,
      nearBias: 0.55,
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
  juice: {
    playerShadow: { enabled: true, alpha: 0.28, widthScale: 0.92 },
    playerRimLight: { enabled: true, alpha: 0.18 },
    floraShadow: { enabled: true, alpha: 0.26, widthScale: 0.78 },
    solidShadow: { enabled: true, alpha: 0.36, widthScale: 0.66 },
    runDust: { enabled: true, rate: 0.5 },
    collectFlash: { enabled: true, bloom: 0.16 },
  },
};
