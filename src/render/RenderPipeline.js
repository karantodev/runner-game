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
      const renderer = this.renderers[i];
      try {
        renderer.render(world);
      } catch (err) {
        // A single renderer failing must not freeze the whole frame:
        // background layers should still paint, the player should still
        // animate, and the player must be able to die / restart. Log
        // once + suppress further reports from this renderer to keep
        // the console readable in long sessions.
        if (!renderer._renderErrLogged) {
          renderer._renderErrLogged = true;
          const name = renderer.constructor?.name ?? `renderer[${i}]`;
          console.error(`[RenderPipeline] ${name}.render() threw — subsequent failures from this renderer suppressed:`, err);
        }
      }
    }
  }
}
