/**
 * Render pipeline composer. Holds a fixed ordered list of renderers and
 * calls each one's `render(world)` in sequence.
 *
 * The pipeline does NOT manage the canvas transform — camera shake / clear
 * happens upstream in RenderSystem before this is invoked.
 *
 * Renderers must expose a `render(world)` method. Adding a layer is just
 * a matter of inserting a new renderer at the right position in the
 * constructor's array.
 */
export class RenderPipeline {
  /**
   * @param {Array<{ render(world: any): void }>} renderers — ordered back-to-front
   */
  constructor(renderers) {
    this.renderers = renderers;
  }

  render(world) {
    for (let i = 0; i < this.renderers.length; i += 1) {
      this.renderers[i].render(world);
    }
  }
}
