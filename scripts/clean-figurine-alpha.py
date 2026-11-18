"""
Clean background-removal leftovers on character figurines (transparent PNGs).

1. Shadows: semi-transparent, dark, colorless pixels (e.g. the floor shadow left between
   the legs) become fully transparent.
2. Fringes: semi-transparent edge pixels (flyaway hair, fingers) often keep the old
   background color, showing a light or dark halo on colored backgrounds. Their RGB is
   replaced by the color of nearby solid pixels ("color decontamination"); alpha is kept.

Usage: python scripts/clean-figurine-alpha.py FILE.png [FILE.png ...]   (edits in place)
"""
import sys

import numpy as np
from PIL import Image

SOLID = 235  # alpha considered fully part of the character


def _box(channel: np.ndarray, r: int, axis: int) -> np.ndarray:
    """Mean over a (2r+1) window along one axis, using cumulative sums (edges padded)."""
    padded = np.pad(channel, [(r + 1, r) if a == axis else (0, 0) for a in range(2)], mode="edge")
    csum = np.cumsum(padded, axis=axis, dtype=np.float64)
    hi = np.take(csum, range(2 * r + 1, csum.shape[axis]), axis=axis)
    lo = np.take(csum, range(0, csum.shape[axis] - 2 * r - 1), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(channel: np.ndarray, radius: int) -> np.ndarray:
    """Approximate Gaussian blur: two passes of a separable box blur."""
    out = channel.astype(np.float32)
    for _ in range(2):
        out = _box(_box(out, radius, 0), radius, 1)
    return out


def clean(path: str) -> None:
    rgba = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32)
    rgb, alpha = rgba[..., :3], rgba[..., 3]

    # 1) remove soft shadows
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    luminance = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    shadow = (alpha > 0) & (alpha < 200) & (chroma < 40) & (luminance < 110)
    alpha = np.where(shadow, 0, alpha)

    # 2) decontaminate edges: spread solid colors outward, use them on semi-transparent px
    solid = (alpha >= SOLID).astype(np.float32)
    weight = np.zeros_like(solid)
    color = np.zeros_like(rgb)
    for radius in (2, 5, 10):  # growing radius fills wider fringes
        w = blur(solid, radius)
        c = np.stack([blur(rgb[..., i] * solid, radius) for i in range(3)], axis=2)
        fill = (weight < 1e-3) & (w > 1e-3)
        weight = np.where(fill, w, weight)
        color = np.where(fill[..., None], c, color)
    spread = color / np.maximum(weight, 1e-6)[..., None]
    semi = (alpha > 0) & (alpha < SOLID) & (weight > 1e-3)
    rgb = np.where(semi[..., None], spread, rgb)

    out = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha, 0, 255)]).astype(np.uint8)
    Image.fromarray(out, mode="RGBA").save(path, optimize=True)
    print(f"{path}: shadow px removed {int(shadow.sum())}, edge px recolored {int(semi.sum())}")


if __name__ == "__main__":
    for file in sys.argv[1:]:
        clean(file)
