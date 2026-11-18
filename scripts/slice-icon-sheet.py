"""
Slice a Meshy icon sheet (transparent PNG, icons on a grid) into one square PNG per icon.

Usage:
  python scripts/slice-icon-sheet.py SHEET.png COLS ROWS OUT_DIR name1,name2,...

Each grid cell is cropped to the icon's visible pixels (alpha > 8), padded to a square
with a small margin, and resized to 256x256 (enough for 64pt @3x... and crisp on phones).
"""
import sys
from pathlib import Path

from PIL import Image

SIZE = 256
MARGIN = 0.06  # 6% transparent margin around each icon


def main() -> None:
    sheet_path, cols, rows, out_dir, names = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), Path(sys.argv[4]), sys.argv[5].split(",")
    if len(names) != cols * rows:
        sys.exit(f"expected {cols * rows} names, got {len(names)}")

    sheet = Image.open(sheet_path).convert("RGBA")
    width, height = sheet.size
    cell_w, cell_h = width / cols, height / rows
    out_dir.mkdir(parents=True, exist_ok=True)

    for index, name in enumerate(names):
        col, row = index % cols, index // cols
        cell = sheet.crop((round(col * cell_w), round(row * cell_h), round((col + 1) * cell_w), round((row + 1) * cell_h)))
        alpha = cell.getchannel("A").point(lambda a: 255 if a > 8 else 0)
        box = alpha.getbbox()
        if not box:
            print(f"!! {name}: empty cell")
            continue
        icon = cell.crop(box)
        side = round(max(icon.size) * (1 + 2 * MARGIN))
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        square.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
        square = square.resize((SIZE, SIZE), Image.LANCZOS)
        target = out_dir / f"{name}.png"
        square.save(target, optimize=True)
        print(f"{name}: {icon.size[0]}x{icon.size[1]} -> {target} ({target.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
