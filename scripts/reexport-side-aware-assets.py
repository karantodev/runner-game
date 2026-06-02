#!/usr/bin/env python3
"""
Re-export coherent left/right scenery sprite pairs from canonical runtime PNGs.

By default the script writes a preview tree outside the repository:

    python3 scripts/reexport-side-aware-assets.py

Use --out-dir to select another preview directory. Pass --install only after
reviewing the preview to copy the validated PNGs into their runtime locations.
Existing assets are never overwritten unless --install is explicitly present.
"""
from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = Path(tempfile.gettempdir()) / "orchid-side-aware-assets-preview"
TRIM_ALPHA_THRESHOLD = 16
TRANSPARENT_BORDER = 1


@dataclass(frozen=True)
class MirrorPair:
    source: str
    left: str
    right: str
    size: tuple[int, int]


PAIRS = (
    MirrorPair(
        source="assets/structures/platforms/grass_dirt_platform_long_right.png",
        left="assets/structures/platforms/grass_dirt_platform_long_left.png",
        right="assets/structures/platforms/grass_dirt_platform_long_right.png",
        size=(256, 85),
    ),
    # The existing runtime right sprite has alpha debris and a mismatched
    # silhouette. Rebuild both orientations from the clean current left.
    MirrorPair(
        source="assets/structures/bricks/purple_brick_single_left.png",
        left="assets/structures/bricks/purple_brick_single_left.png",
        right="assets/structures/bricks/purple_brick_single_right.png",
        size=(56, 56),
    ),
    MirrorPair(
        source="assets/structures/stone_brick/stone_wall_stairs_left.png",
        left="assets/structures/stone_brick/stone_wall_stairs_left.png",
        right="assets/structures/stone_brick/stone_wall_stairs_right.png",
        size=(168, 112),
    ),
    MirrorPair(
        source="assets/obstacles/planter_pot/planter_pot.png",
        left="assets/obstacles/planter_pot/planter_pot_left.png",
        right="assets/obstacles/planter_pot/planter_pot_right.png",
        size=(64, 80),
    ),
    MirrorPair(
        source="assets/decor/large/fence/fence_wood_short_left.png",
        left="assets/decor/large/fence/fence_wood_short_left.png",
        right="assets/decor/large/fence/fence_wood_short_right.png",
        size=(96, 80),
    ),
    MirrorPair(
        source="assets/structures/stone_brick/purple_brick_single.png",
        left="assets/structures/stone_brick/purple_brick_single_left.png",
        right="assets/structures/stone_brick/purple_brick_single_right.png",
        size=(56, 56),
    ),
    MirrorPair(
        source="assets/structures/stone_brick/purple_brick_stairs_left.png",
        left="assets/structures/stone_brick/purple_brick_stairs_left.png",
        right="assets/structures/stone_brick/purple_brick_stairs_right.png",
        size=(168, 112),
    ),
)


def alpha_trim(image: Image.Image) -> Image.Image:
    """Trim transparent padding while ignoring low-alpha edge debris."""
    rgba = image.convert("RGBA")
    meaningful_alpha = rgba.getchannel("A").point(
        lambda alpha: 255 if alpha >= TRIM_ALPHA_THRESHOLD else 0
    )
    bbox = meaningful_alpha.getbbox()
    if bbox is None:
        raise ValueError("source contains no visible pixels")
    return rgba.crop(bbox)


def fit_contain_bottom_centered(
    image: Image.Image, target_size: tuple[int, int]
) -> Image.Image:
    """Contain a trimmed RGBA sprite in a transparent, bottom-aligned canvas."""
    target_width, target_height = target_size
    inner_width = target_width - (TRANSPARENT_BORDER * 2)
    inner_height = target_height - (TRANSPARENT_BORDER * 2)
    if inner_width <= 0 or inner_height <= 0:
        raise ValueError(f"invalid target size: {target_size}")

    scale = min(inner_width / image.width, inner_height / image.height)
    resized_size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    resized = image.resize(resized_size, Image.Resampling.NEAREST)

    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    x = (target_width - resized.width) // 2
    y = target_height - TRANSPARENT_BORDER - resized.height
    canvas.alpha_composite(resized, dest=(x, y))
    return canvas


def build_exports() -> dict[str, Image.Image]:
    """Generate every pair in memory so --install cannot affect later sources."""
    exports: dict[str, Image.Image] = {}
    for pair in PAIRS:
        source_path = PROJECT_ROOT / pair.source
        if not source_path.is_file():
            raise FileNotFoundError(f"missing canonical source: {pair.source}")

        with Image.open(source_path) as source:
            left = fit_contain_bottom_centered(alpha_trim(source), pair.size)
        right = left.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

        exports[pair.left] = left
        exports[pair.right] = right
    return exports


def validate_sprite(relative_path: str, image: Image.Image, size: tuple[int, int]) -> None:
    if image.mode != "RGBA":
        raise ValueError(f"{relative_path}: expected RGBA, got {image.mode}")
    if image.size != size:
        raise ValueError(f"{relative_path}: expected {size}, got {image.size}")
    if image.getchannel("A").getbbox() is None:
        raise ValueError(f"{relative_path}: sprite is fully transparent")

    width, height = image.size
    alpha = image.getchannel("A")
    border = (
        list(alpha.crop((0, 0, width, 1)).getdata())
        + list(alpha.crop((0, height - 1, width, height)).getdata())
        + list(alpha.crop((0, 1, 1, height - 1)).getdata())
        + list(alpha.crop((width - 1, 1, width, height - 1)).getdata())
    )
    if any(border):
        raise ValueError(f"{relative_path}: outer alpha border is not transparent")


def validate_exports(exports: dict[str, Image.Image]) -> None:
    for pair in PAIRS:
        left = exports[pair.left]
        right = exports[pair.right]
        validate_sprite(pair.left, left, pair.size)
        validate_sprite(pair.right, right, pair.size)
        expected_right = left.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if right.tobytes() != expected_right.tobytes():
            raise ValueError(f"{pair.right}: output is not an exact mirror of {pair.left}")


def write_preview(exports: dict[str, Image.Image], out_dir: Path) -> None:
    for relative_path, image in exports.items():
        destination = out_dir / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "PNG", optimize=True)


def install_exports(exports: dict[str, Image.Image], out_dir: Path) -> None:
    """Copy validated preview files to runtime paths after an explicit opt-in."""
    for relative_path in exports:
        source = out_dir / relative_path
        destination = PROJECT_ROOT / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help=f"preview output directory (default: {DEFAULT_OUT_DIR})",
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="copy validated preview PNGs into their runtime project paths",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    out_dir = args.out_dir.expanduser().resolve()

    try:
        exports = build_exports()
        validate_exports(exports)
        write_preview(exports, out_dir)
        if args.install:
            install_exports(exports, out_dir)
    except (FileNotFoundError, OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    action = "installed" if args.install else "previewed"
    print(f"{action} {len(exports)} validated RGBA PNGs")
    print(f"preview: {out_dir}")
    if not args.install:
        print("runtime assets unchanged; pass --install after reviewing the preview")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
