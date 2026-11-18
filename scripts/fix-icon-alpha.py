"""
Fill semi-transparent "holes" left by background removal inside game icons.

Background removal sometimes makes light areas (white walls, wool) partly transparent, so the
icon looks tinted on colored backgrounds. This keeps the soft anti-aliased edge but makes
everything inside the silhouette fully opaque.

Usage: python scripts/fix-icon-alpha.py ICON.png [ICON.png ...]
"""
import sys

from PIL import Image, ImageChops, ImageFilter

EDGE_PX = 3  # width of the soft edge that keeps its original alpha


def fix(path: str) -> None:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    # Silhouette, with interior holes closed (dilate then erode)
    mask = alpha.point(lambda a: 255 if a > 12 else 0)
    closed = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    interior = closed.filter(ImageFilter.MinFilter(EDGE_PX * 2 + 1))
    new_alpha = ImageChops.lighter(alpha, interior)
    before = sum(1 for a in alpha.getdata() if 20 < a < 230)
    after = sum(1 for a in new_alpha.getdata() if 20 < a < 230)
    image.putalpha(new_alpha)
    image.save(path, optimize=True)
    print(f"{path}: semi-transparent px {before} -> {after}")


if __name__ == "__main__":
    for icon in sys.argv[1:]:
        fix(icon)
