"""
Slice a Meshy sheet of button plates (stacked vertically, transparent PNG) into 3-slice
pieces for <GameButton>: <name>-left.png, <name>-mid.png, <name>-right.png.

The left/right caps keep the rounded ends and details (rivets, trim); the middle is a thin
strip from the center that the app stretches to any width.

Usage: python scripts/slice-button-plates.py SHEET.png OUT_DIR name1,name2,...
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

TARGET_HEIGHT = 120  # px; sharp for ~60pt buttons at 2x
CAP_RATIO = 0.62  # cap width as a fraction of the plate height (covers the round end)
MID_WIDTH = 12


def runs(mask: np.ndarray, min_gap: int = 8):
    idx = np.where(mask)[0]
    out, start, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - prev > min_gap:
            out.append((start, prev))
            start = i
        prev = i
    out.append((start, prev))
    return out


def main() -> None:
    sheet, out_dir, names = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3].split(",")
    out_dir.mkdir(parents=True, exist_ok=True)
    image = Image.open(sheet).convert("RGBA")
    alpha = np.asarray(image)[..., 3] > 24
    rows = [r for r in runs(alpha.any(axis=1)) if r[1] - r[0] > 40]
    if len(rows) != len(names):
        sys.exit(f"found {len(rows)} plates, expected {len(names)}")

    for name, (top, bottom) in zip(names, rows):
        band = alpha[top : bottom + 1]
        cols = np.where(band.any(axis=0))[0]
        plate = image.crop((int(cols[0]), int(top), int(cols[-1]) + 1, int(bottom) + 1))
        scale = TARGET_HEIGHT / plate.height
        plate = plate.resize((round(plate.width * scale), TARGET_HEIGHT), Image.LANCZOS)
        w, h = plate.size
        cap = round(h * CAP_RATIO)
        mid_x = w // 2 - MID_WIDTH // 2
        plate.crop((0, 0, cap, h)).save(out_dir / f"{name}-left.png", optimize=True)
        plate.crop((mid_x, 0, mid_x + MID_WIDTH, h)).save(out_dir / f"{name}-mid.png", optimize=True)
        plate.crop((w - cap, 0, w, h)).save(out_dir / f"{name}-right.png", optimize=True)
        print(f"{name}: plate {w}x{h}, caps {cap}px")


if __name__ == "__main__":
    main()
