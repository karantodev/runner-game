/**
 * Lightweight platform detection for diagnostics.
 *
 * Purpose: surface what's running where, so the PerformanceHUD can show
 * useful context on devices without DevTools (consoles in particular).
 * This is NOT a feature-detection layer — it's pure UA-based labelling.
 *
 * UA strings of interest:
 *   - PlayStation 5 → contains "PlayStation"
 *   - Xbox Series X/S → contains "Xbox"
 *   - Nintendo Switch → contains "Nintendo Switch"
 *   - iOS Safari → contains "iPhone" / "iPad" + "Safari" (not "CriOS"/"FxiOS")
 *   - macOS Safari → contains "Macintosh" + "Safari" (not "Chrome")
 *   - Steam Deck → reports as Linux Chromium (indistinguishable from desktop)
 */

const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';

function detectPlatform() {
  if (/PlayStation 5/i.test(UA)) return 'PS5';
  if (/PlayStation/i.test(UA)) return 'PlayStation';
  if (/Xbox/i.test(UA)) return 'Xbox';
  if (/Nintendo Switch/i.test(UA)) return 'Switch';
  if (/iPhone|iPod/i.test(UA)) return 'iPhone';
  if (/iPad/i.test(UA)) return 'iPad';
  if (/Android/i.test(UA)) return 'Android';
  if (/Macintosh/i.test(UA)) return 'macOS';
  if (/Windows/i.test(UA)) return 'Windows';
  if (/Linux/i.test(UA)) return 'Linux';
  return 'unknown';
}

function detectBrowser() {
  // Order matters — Edg comes before Chrome since Edge UA contains both.
  if (/Edg\//i.test(UA)) return 'Edge';
  if (/OPR\//i.test(UA)) return 'Opera';
  if (/Firefox\//i.test(UA)) return 'Firefox';
  if (/Chrome\//i.test(UA)) return 'Chrome';
  if (/Safari\//i.test(UA)) return 'Safari';
  return 'unknown';
}

function isConsole(platform) {
  return platform === 'PS5' || platform === 'PlayStation' || platform === 'Xbox' || platform === 'Switch';
}

function isTouchOnly() {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/**
 * Pick the canvas backing-store pixelRatio.
 *
 * This game uses `image-rendering: pixelated` (see style.css) — a pixel-art
 * aesthetic. Rendering at DPR > 1 makes the source pixels smaller on screen
 * and fights that aesthetic AND multiplies mobile fill rate.
 *
 * Defaults:
 *   - DPR = 1 everywhere (artistic intent + mobile fill rate)
 *   - `?hidpi=1`  → up to `min(devicePixelRatio, 2)` (cap — DPR=3 is wasteful)
 *   - `?dpr=N`    → explicit override (testing only; clamped to [1, 3])
 *
 * Consoles report DPR=1 natively, so this picks 1 there regardless.
 *
 * @param {URLSearchParams} params
 * @param {number} configDefault — GAME_CONFIG.canvas.pixelRatio
 * @returns {{ value: number, source: 'config' | 'hidpi' | 'dpr-override' }}
 */
export function pickPixelRatio(params, configDefault) {
  const explicit = params.get('dpr');
  if (explicit !== null) {
    const n = Number(explicit);
    if (Number.isFinite(n) && n > 0) {
      return { value: Math.max(1, Math.min(3, n)), source: 'dpr-override' };
    }
  }
  if (params.get('hidpi') === '1') {
    return { value: Math.max(1, Math.min(2, PLATFORM.nativeDpr)), source: 'hidpi' };
  }
  return { value: configDefault, source: 'config' };
}

export const PLATFORM = Object.freeze({
  os: detectPlatform(),
  browser: detectBrowser(),
  isConsole: isConsole(detectPlatform()),
  isTouchOnly: isTouchOnly(),
  nativeDpr: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  hardwareConcurrency: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 0) : 0,
  /** @returns {boolean} `true` when `performance.memory` is exposed (Chrome/Edge family). */
  hasMemoryApi: typeof performance !== 'undefined' && 'memory' in performance,
});

/** Human-readable one-liner: "PS5 / Safari · DPR 1 · 8 cores". */
export function platformLabel() {
  const parts = [`${PLATFORM.os} / ${PLATFORM.browser}`];
  parts.push(`DPR ${PLATFORM.nativeDpr}`);
  if (PLATFORM.hardwareConcurrency) parts.push(`${PLATFORM.hardwareConcurrency} cores`);
  return parts.join(' · ');
}
