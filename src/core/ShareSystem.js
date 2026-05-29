/**
 * Death-screen share helpers. Uses Web Share API where available
 * (mobile + macOS Safari), falls back to clipboard copy on desktop.
 *
 * Screenshot:
 *   - Reads the current canvas backing store via `canvas.toBlob`
 *   - Web Share API supports files on iOS 15+ / Android Chrome → share image
 *   - Otherwise downloads as `orchid-quest-<score>.png`
 *
 * Stateless on purpose — `share()` and `screenshot()` are imperatively
 * invoked from the death-screen wiring, no subscription bookkeeping.
 */
export class ShareSystem {
  constructor({ canvas }) {
    this.canvas = canvas;
  }

  /**
   * @param {{ score: number, distance: number }} run
   */
  async share(run) {
    const text = this.#shareText(run);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Orchid Quest',
          text,
          url: window.location.href,
        });
        return 'shared';
      } catch (err) {
        // User cancelled, or unsupported on this content type.
        if (err?.name !== 'AbortError') console.warn('[Share]', err);
      }
    }
    return this.#copyToClipboard(`${text} ${window.location.href}`);
  }

  /**
   * Capture the current canvas frame. Returns a Promise resolving to a
   * Blob (caller decides whether to download or share).
   */
  captureBlob() {
    return new Promise((resolve) => {
      try {
        this.canvas.toBlob((blob) => resolve(blob), 'image/png');
      } catch (err) {
        console.warn('[Share] toBlob failed', err);
        resolve(null);
      }
    });
  }

  /**
   * Capture frame + share or download.
   * @param {{ score: number, distance: number }} run
   */
  async screenshot(run) {
    const blob = await this.captureBlob();
    if (!blob) return 'failed';
    const file = new File([blob], `orchid-quest-${run.score}.png`, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Orchid Quest',
          text: this.#shareText(run),
          files: [file],
        });
        return 'shared';
      } catch (err) {
        if (err?.name !== 'AbortError') console.warn('[Screenshot share]', err);
      }
    }

    // Fallback: trigger a download.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orchid-quest-${run.score}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  }

  #shareText({ score, distance }) {
    return `I scored ${score} in Orchid Quest (ran ${Math.floor(distance)}m). Beat me?`;
  }

  async #copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      // Last-resort hidden textarea copy. Works in older Safari.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      ta.remove();
      return 'copied';
    }
  }
}
