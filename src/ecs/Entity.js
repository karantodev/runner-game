/**
 * One game object — identified by `id`, owns a flat bag of `components`
 * (string → data). Components are plain data objects; logic lives in
 * systems that iterate over entities matching a component signature.
 *
 * Lifecycle: created via EntityRegistry.create(), destroyed via
 * EntityRegistry.destroy(id) or by setting `alive = false` (the cleanup
 * pass will remove it on the next sweep).
 *
 * Design choice: components is a plain object keyed by short string names
 * ('Position', 'Sprite', etc.) rather than a Map. Object property access
 * is faster than Map.get in V8 for our access patterns, and adds zero
 * iteration overhead.
 */
export class Entity {
  /**
   * @param {number} id
   */
  constructor(id) {
    this.id = id;
    this.alive = true;
    /** @type {Record<string, any>} */
    this.components = Object.create(null);
  }

  /**
   * Revive a pooled entity without allocating a new component bag.
   * Factories repopulate the bag immediately after registry.create().
   */
  reset(id) {
    this.id = id;
    this.alive = true;
    for (const key in this.components) delete this.components[key];
    return this;
  }

  /**
   * Attach (or replace) a component. Returns `this` for chaining.
   * @param {string} name
   * @param {any} data
   */
  add(name, data) {
    this.components[name] = data;
    return this;
  }

  /** @param {string} name */
  has(name) {
    return name in this.components;
  }

  /** @param {string} name */
  get(name) {
    return this.components[name];
  }

  /** @param {string} name */
  remove(name) {
    delete this.components[name];
    return this;
  }
}
