/**
 * Minimal pub/sub event bus.
 *
 * @template T
 * @typedef {(payload: T) => void} EventHandler
 */
export class EventBus {
  /** @type {Map<string, Set<EventHandler<any>>>} */
  #listeners = new Map();

  /**
   * Subscribe to an event. Returns a disposer that removes this handler.
   *
   * @param {string} eventName
   * @param {EventHandler<any>} handler
   * @returns {() => boolean} disposer
   */
  on(eventName, handler) {
    const handlers = this.#listeners.get(eventName) ?? new Set();
    handlers.add(handler);
    this.#listeners.set(eventName, handlers);
    return () => handlers.delete(handler);
  }

  /**
   * Fire an event. All registered handlers run synchronously in
   * subscription order. A thrown error from one handler is logged but
   * does NOT abort the chain — the remaining handlers still run. This
   * keeps a buggy listener from cascading into a UI freeze (e.g. a
   * particle-spawn error stopping score updates from reaching the HUD).
   *
   * @param {string} eventName
   * @param {any} [payload]
   */
  emit(eventName, payload) {
    const handlers = this.#listeners.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        // Surface the failure once per occurrence — never silently swallow.
        // The console keeps a trace, but the loop continues.
        console.error(`[EventBus] handler for '${eventName}' threw:`, err);
      }
    }
  }
}
