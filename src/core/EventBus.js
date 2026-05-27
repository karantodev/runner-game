export class EventBus {
  #listeners = new Map();

  on(eventName, handler) {
    const handlers = this.#listeners.get(eventName) ?? new Set();
    handlers.add(handler);
    this.#listeners.set(eventName, handlers);
    return () => handlers.delete(handler);
  }

  emit(eventName, payload) {
    const handlers = this.#listeners.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) handler(payload);
  }
}
