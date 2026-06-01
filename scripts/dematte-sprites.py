#!/usr/bin/env python3
"""
Batch-remove white backgrounds from sprite PNGs.

Scans assets/ and, for any image whose opaque border pixels are
≥ 70% near-white, runs two passes:
  1. BFS flood-fill from all edges (threshold: all R,G,B ≥ 200) to erase the
     connected white background.
  2. Alpha-matting de-fringe of the one-pixel ring adjacent to cleared pixels
     (only for pixels with all channels ≥ 190) to remove anti-aliased halos.

Safe to re-run: images without white borders are untouched.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

# Border analysis: pixel is "near-white opaque" if all channels above this
BORDER_NEAR_WHITE = 215
# Fraction of opaque border pixels that must be near-white to trigger BFS
BORDER_RATIO = 0.70
# BFS stops at first pixel with any channel below this
BFS_THRESHOLD = 200
# De-fringe: only matte edge pixels where all channels are ≥ this
DEFRINGE_MIN = 190


# ---------------------------------------------------------------------------
# Core algorithm
# ---------------------------------------------------------------------------

def _needs_dematte(arr: np.ndarray) -> bool:
    """True if ≥ BORDER_RATIO of opaque border pixels are near-white."""
    h, w = arr.shape[:2]
    # Collect all border pixels
    rows = np.concatenate([arr[0, :], arr[h - 1, :]])
    cols = np.concatenate([arr[1:h - 1, 0], arr[1:h - 1, w - 1]])
    border = np.concatenate([rows, cols], axis=0)  # shape (N, 4)

    opaque = border[border[:, 3] > 100]
    if len(opaque) == 0:
        return False
    near_white = opaque[(opaque[:, 0] > BORDER_NEAR_WHITE)
                        & (opaque[:, 1] > BORDER_NEAR_WHITE)
                        & (opaque[:, 2] > BORDER_NEAR_WHITE)]
    return len(near_white) / len(opaque) >= BORDER_RATIO


def _bfs_fill(arr: np.ndarray) -> np.ndarray:
    """
    BFS from all border pixels; clear (alpha→0) any near-white connected region.
    Returns boolean mask (h, w) of cleared pixels.
    """
    h, w = arr.shape[:2]
    cleared = np.zeros((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)

    # Seed stack with all border indices
    border_ys = np.concatenate([
        np.zeros(w, dtype=np.intp),
        np.full(w, h - 1, dtype=np.intp),
        np.arange(1, h - 1, dtype=np.intp),
        np.arange(1, h - 1, dtype=np.intp),
    ])
    border_xs = np.concatenate([
        np.arange(w, dtype=np.intp),
        np.arange(w, dtype=np.intp),
        np.zeros(h - 2, dtype=np.intp),
        np.full(h - 2, w - 1, dtype=np.intp),
    ])
    stack = list(zip(border_ys.tolist(), border_xs.tolist()))

    while stack:
        y, x = stack.pop()
        if visited[y, x]:
            continue
        visited[y, x] = True
        r, g, b, a = arr[y, x]
        if r < BFS_THRESHOLD or g < BFS_THRESHOLD or b < BFS_THRESHOLD:
            continue  # colored → stop
        if a < 100:
            continue  # already transparent → stop
        cleared[y, x] = True
        arr[y, x, 3] = 0  # erase alpha
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                stack.append((ny, nx))

    return cleared


def _defringe(arr: np.ndarray, cleared: np.ndarray) -> None:
    """
    Alpha-matte pixels in the one-pixel ring adjacent to the cleared region.
    Only touches near-white pixels (all channels ≥ DEFRINGE_MIN).
    """
    from scipy.ndimage import binary_dilation
    try:
        ring = binary_dilation(cleared) & ~cleared
    except ImportError:
        # Fallback without scipy: manual 4-neighbour dilation
        ring = _dilate4(cleared) & ~cleared

    ys, xs = np.where(ring)
    for y, x in zip(ys, xs):
        r, g, b, a = arr[y, x].astype(int)
        if a == 0:
            continue
        min_ch = min(r, g, b)
        if min_ch < DEFRINGE_MIN:
            continue  # colored — leave as-is
        new_a = 1.0 - min_ch / 255.0
        if new_a < 0.04:
            arr[y, x, 3] = 0
            continue
        # Un-premultiply white background contribution
        def unp(c: int) -> int:
            return max(0, min(255, round((c - 255 * (1 - new_a)) / new_a)))
        arr[y, x] = (unp(r), unp(g), unp(b), round(new_a * 255))


def _dilate4(mask: np.ndarray) -> np.ndarray:
    """Manual 4-neighbour dilation without scipy."""
    d = mask.copy()
    d[:-1, :] |= mask[1:, :]
    d[1:, :] |= mask[:-1, :]
    d[:, :-1] |= mask[:, 1:]
    d[:, 1:] |= mask[:, :-1]
    return d


def _has_scipy() -> bool:
    try:
        import scipy  # noqa: F401
        return True
    except ImportError:
        return False


def process_image(path: Path) -> bool:
    """Return True if the file was modified."""
    img = Image.open(path).convert("RGBA")
    arr = np.array(img, dtype=np.uint8)

    if not _needs_dematte(arr):
        return False

    cleared = _bfs_fill(arr)
    if not cleared.any():
        return False

    _defringe(arr, cleared)

    Image.fromarray(arr, "RGBA").save(path, "PNG", optimize=True)
    return True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    paths = sorted(ASSETS_DIR.glob("**/*.png"))
    paths = [p for p in paths if "_source" not in str(p)]

    print(f"Scanning {len(paths)} sprites in {ASSETS_DIR}…")
    modified = 0
    errors = 0

    for path in paths:
        try:
            changed = process_image(path)
            if changed:
                rel = path.relative_to(ASSETS_DIR)
                print(f"  ✓ {rel}")
                modified += 1
        except Exception as exc:
            print(f"  ✗ {path.name}: {exc}", file=sys.stderr)
            errors += 1

    print(f"\nDone — {modified} sprites de-matted, {errors} errors.")


if __name__ == "__main__":
    # Check for scipy; warn if absent (fallback will be used)
    if not _has_scipy():
        print("Note: scipy not found, using built-in 4-neighbour dilation fallback.", file=sys.stderr)
    main()
