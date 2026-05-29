/**
 * Lightweight analytics hook. Subscribes to high-value EventBus events,
 * batches them in memory, flushes on a timer + on window unload.
 *
 * Design:
 *   - Anonymous session id (random per browser session) — no PII.
 *   - In `dev` mode (default until a sink URL is supplied) the flush
 *     writes to `console.debug` so we can verify locally.
 *   - When `sinkUrl` is set, the flush POSTs the batch with
 *     `navigator.sendBeacon` (survives page unload). Falls back to
 *     `fetch({ keepalive: true })` if Beacon is unavailable.
 *   - Per-session ring cap so a long session can't grow the queue
 *     unbounded — older events are dropped first.
 *
 * Privacy:
 *   - No localStorage tracking IDs, no fingerprinting.
 *   - Session id is regenerated every page load.
 *   - User can suppress telemetry via Settings (future toggle).
 */
const QUEUE_SOFT_CAP = 100;
const FLUSH_INTERVAL_MS = 30_000;

export class Telemetry {
  /**
   * @param {{
   *   eventBus: import('./EventBus.js').EventBus,
   *   sinkUrl?: string,
   *   sessionPrefix?: string,
   * }} opts
   */
  constructor({ eventBus, sinkUrl = null, sessionPrefix = 'oq' }) {
    this.eventBus = eventBus;
    this.sinkUrl = sinkUrl;
    this.sessionId = `${sessionPrefix}-${randomId()}`;
    this.queue = [];
    this.enabled = true;
    this.startTime = Date.now();
    this.#wire();
    this.#armFlushTimer();
    this.#armUnloadFlush();
  }

  /** Turn telemetry off (future Settings toggle). */
  setEnabled(value) {
    this.enabled = !!value;
    if (!value) this.queue.length = 0;
  }

  /** Push a custom event. Public so other systems can record one-offs. */
  log(eventName, payload = {}) {
    if (!this.enabled) return;
    this.queue.push({
      session: this.sessionId,
      ts: Date.now() - this.startTime,
      name: eventName,
      data: payload,
    });
    if (this.queue.length > QUEUE_SOFT_CAP) {
      // Drop oldest — recent events are more interesting.
      this.queue.splice(0, this.queue.length - QUEUE_SOFT_CAP);
    }
  }

  /** Manually flush — useful for testing. */
  flush() {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0, this.queue.length);
    if (this.sinkUrl) {
      this.#send(batch);
    } else {
      // No sink configured (dev) — surface the batch in the console so
      // we can inspect what would have been sent.
      console.debug('[Telemetry] batch (would-send)', batch);
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  #wire() {
    const eb = this.eventBus;
    eb.on('stateChanged', (state) => this.log('state', { state }));
    eb.on('run:ended', (p) => this.log('run_ended', p));
    eb.on('hazard:hit', (p) => this.log('hazard_hit', { type: p?.type }));
    eb.on('milestone:reached', (p) => this.log('milestone', p));
    eb.on('powerUpActivated', (p) => this.log('powerup', { type: p?.type }));
    eb.on('comboChanged', (p) => {
      // Only log meaningful crossings so we don't spam the queue.
      if (p?.reason === 'bump' && p.multiplier > 1) this.log('combo_up', { multiplier: p.multiplier });
    });
  }

  #armFlushTimer() {
    setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  #armUnloadFlush() {
    // pagehide is more reliable than unload on mobile Safari.
    window.addEventListener('pagehide', () => this.flush(), { capture: true });
  }

  #send(batch) {
    const payload = JSON.stringify({ session: this.sessionId, events: batch });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.sinkUrl, payload);
        return;
      }
    } catch { /* fall through to fetch */ }
    fetch(this.sinkUrl, { method: 'POST', body: payload, keepalive: true })
      .catch(() => { /* network errors don't surface to the player */ });
  }
}

/** Short random id, URL-safe. */
function randomId() {
  return Math.random().toString(36).slice(2, 10);
}
