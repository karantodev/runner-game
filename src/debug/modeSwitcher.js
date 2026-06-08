/**
 * TEMP dev mode switcher — remove before ship.
 * Exposes all four visual modes across two independent axes:
 *   blockStyle (canvas2d only): 'sprite' (flat 2D) | 'voxel' (3D-look).
 *     Toggled live via game.settings.setBlockStyle() — no reload needed.
 *   renderer: canvas2d | three. Requires page reload because a canvas
 *     cannot hot-swap its 2D ↔ WebGL context; driven by URL params.
 * Preserves all existing params (debug, seed, perf, roadStyle, …) on every
 * reload so a debugging session survives the switch intact.
 */
export function setupModeSwitch(game) {
  const container = document.getElementById('mode-switch');
  if (!container) return;

  // Mark the button matching the current active mode as .active.
  // Called on load and after every live blockStyle change so the
  // highlight stays in sync without a reload.
  function syncActiveButton() {
    const isThree = game.renderer.kind === 'three-scene';
    let activeMode;
    if (isThree) {
      activeMode = game.renderer.mode === '2.5d' ? '25d' : '3d';
    } else {
      // blockStyle defaults to 'sprite' when the property is absent.
      activeMode = (game.renderer.blockStyle ?? 'sprite') === 'voxel' ? 'voxel' : '2d';
    }
    for (const btn of container.querySelectorAll('button[data-mode]')) {
      btn.classList.toggle('active', btn.dataset.mode === activeMode);
    }
  }

  syncActiveButton();

  // Re-sync the highlight when block style changes outside the switcher — the
  // Settings menu and the `Y` hotkey both dispatch orchid:blockStyleChanged.
  // Without this the switcher would show a stale active button after such a toggle.
  window.addEventListener('orchid:blockStyleChanged', syncActiveButton);

  for (const btn of container.querySelectorAll('button[data-mode]')) {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;

      if (mode === '2d' || mode === 'voxel') {
        // blockStyle is a live, settings-persisted toggle — no reload needed
        // when already on canvas2d. Only reload when coming from three, where
        // the WebGL context must be torn down and rebuilt as canvas2d.
        const style = mode === 'voxel' ? 'voxel' : 'sprite';
        game.settings.setBlockStyle(style);
        if (game.renderer.kind === 'three-scene') {
          // Drop renderer + threeMode params to land on canvas2d.
          const next = new URLSearchParams(window.location.search);
          next.delete('renderer');
          next.delete('threeMode');
          window.location.search = next.toString();
        } else {
          // Already canvas2d — blockStyle change is instant; just update highlight.
          syncActiveButton();
        }
        return;
      }

      // '3d' and '25d' both target the three renderer; reload required.
      const next = new URLSearchParams(window.location.search);
      next.set('renderer', 'three');
      if (mode === '25d') {
        next.set('threeMode', '2.5d');
      } else {
        // '3d' is the three default — omit threeMode to keep the URL minimal.
        next.delete('threeMode');
      }
      window.location.search = next.toString();
    });
  }

  // Live retro-pixel resolution toggle (270p ⇄ 360p) for on-the-fly comparison — three
  // renderer only (canvas2d has no pixelation pass). Dev-only; removed with the switcher.
  if (game.renderer.kind === 'three-scene' && typeof game.renderer.togglePixelHeight === 'function') {
    const pxBtn = document.createElement('button');
    pxBtn.dataset.px = '1';
    pxBtn.textContent = `PX ${game.renderer.pixelHeight ?? 270}`;
    pxBtn.addEventListener('click', () => {
      pxBtn.textContent = `PX ${game.renderer.togglePixelHeight()}`;
    });
    container.appendChild(pxBtn);
  }
}
