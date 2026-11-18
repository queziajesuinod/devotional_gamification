"""
Detect head/neck anchors on character figurines and (optionally) render an accessory fit test.

Anchors are measured from the alpha silhouette of each character's "original" figurine,
which has the same pose/framing as all of its looks:
  - headTop: first row with visible pixels
  - neckY:   narrowest row between the head and the shoulders
  - headCx / headWidth: center and width of the head region
Values are normalized to the image size (0..1) so the app can scale them.

Usage:
  python scripts/figurine-anchors.py                 -> writes assets/characters/anchors.json
  python scripts/figurine-anchors.py --test OUT.png  -> also renders a fit test sheet
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHARS = ROOT / "assets/characters"

# Face landmarks measured by hand on each "original" figurine (pixels on the 1024x1536
# image). All looks of a character share the same pose and framing, so these apply to all.
FACES_PX = {
    "davi": {"hairTop": 40, "brow": 235, "eyes": 315, "chin": 440, "left": 335, "right": 665},
    "lia": {"hairTop": 10, "brow": 200, "eyes": 268, "chin": 362, "left": 395, "right": 630},
    "theo": {"hairTop": 30, "brow": 200, "eyes": 245, "chin": 335, "left": 395, "right": 630},
}
IMAGE_SIZE = (1024, 1536)

# ref: face landmark the accessory is attached to; dy: extra offset in face heights
# (brow->chin distance); align: which edge of the accessory sits on that point;
# width: multiple of the face width. "hide" lists characters that can't wear it.
ACCESSORY_FIT = {
    "bone": {"ref": "brow", "dy": 0.55, "align": "bottom", "width": 1.45},
    "chapeu-palha": {"ref": "brow", "dy": 0.45, "align": "bottom", "width": 2.1},
    "coroa-flores": {"ref": "hairTop", "dy": 0.35, "align": "center", "width": 1.3},
    "faixa-cabelo": {"ref": "brow", "dy": 0.2, "align": "bottom", "width": 1.15},
    "fone": {"ref": "eyes", "dy": -0.12, "align": "center", "width": 1.6},
    "oculos-sol": {"ref": "eyes", "dy": 0.0, "align": "center", "width": 1.0, "hide": ["davi"]},
    "lenco": {"ref": "chin", "dy": 0.25, "align": "top", "width": 0.85},
}


def anchors_for(char: str) -> dict:
    """Normalized (0..1) face landmarks for a character."""
    W, H = IMAGE_SIZE
    f = FACES_PX[char]
    return {
        "hairTop": f["hairTop"] / H,
        "brow": f["brow"] / H,
        "eyes": f["eyes"] / H,
        "chin": f["chin"] / H,
        "faceCx": (f["left"] + f["right"]) / 2 / W,
        "faceWidth": (f["right"] - f["left"]) / W,
    }


def place(base: Image.Image, accessory: Image.Image, a: dict, fit: dict) -> Image.Image:
    W, H = base.size
    face_w = a["faceWidth"] * W
    face_h = (a["chin"] - a["brow"]) * H
    target_w = face_w * fit["width"]
    scale = target_w / accessory.width
    acc = accessory.resize((max(1, int(target_w)), max(1, int(accessory.height * scale))), Image.LANCZOS)
    point = a[fit["ref"]] * H + fit["dy"] * face_h
    offset = {"top": 0, "center": acc.height / 2, "bottom": acc.height}[fit["align"]]
    # Headroom: hats may go above the top edge, so draw on a taller canvas
    pad = 200
    canvas = Image.new("RGBA", (W, H + pad), (0, 0, 0, 0))
    canvas.alpha_composite(base, (0, pad))
    canvas.alpha_composite(acc, (int(a["faceCx"] * W - acc.width / 2), int(point - offset) + pad))
    return canvas


def main() -> None:
    result = {}
    for char in ("davi", "lia", "theo"):
        result[char] = anchors_for(char)
    result["_accessoryFit"] = ACCESSORY_FIT
    (CHARS / "anchors.json").write_text(json.dumps(result, indent=2))
    print(json.dumps({k: v for k, v in result.items() if not k.startswith("_")}, indent=1))

    if "--test" in sys.argv:
        out_path = sys.argv[sys.argv.index("--test") + 1]
        tiles = []
        for char in ("davi", "lia", "theo"):
            base = Image.open(CHARS / char / "original.png").convert("RGBA")
            for acc_name in ("bone", "chapeu-palha", "faixa-cabelo", "fone", "lenco"):
                acc = Image.open(CHARS / "acessorios" / f"{acc_name}.png").convert("RGBA")
                if char in ACCESSORY_FIT[acc_name].get("hide", []):
                    img = base.copy()
                    img = Image.new("RGBA", (base.width, base.height + 200), (0, 0, 0, 0))
                    img.alpha_composite(base, (0, 200))
                else:
                    img = place(base, acc, result[char], ACCESSORY_FIT[acc_name])
                crop = img.crop((0, 60, img.width, int(img.height * 0.45)))
                bg = Image.new("RGBA", crop.size, "#4ECDC4")
                bg.alpha_composite(crop)
                tiles.append(bg.convert("RGB").resize((260, int(260 * crop.height / crop.width))))
        cols = 5
        th = tiles[0].height
        sheet = Image.new("RGB", (cols * 266 + 6, 3 * (th + 6) + 6), "white")
        for i, t in enumerate(tiles):
            sheet.paste(t, (6 + (i % cols) * 266, 6 + (i // cols) * (th + 6)))
        sheet.save(out_path)
        print("test sheet:", out_path)


if __name__ == "__main__":
    main()
