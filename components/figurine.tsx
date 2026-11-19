/**
 * Character figurine (2D, generated with Meshy) with its equipped accessory.
 * Images come from the API server (/characters/...), see shared/character-catalog.ts.
 *
 * - mode "full": whole body, `height` tall (width = 2/3 of the height)
 * - mode "head": square crop around the face, `height` x `height` (headers, rankings)
 *
 * Accessories attach by a pin point on the accessory to a body point on the figurine
 * (see AccessoryFit). When an accessory sticks out of the figurine's box (hat above the
 * hair, staff below the feet, balloon to the side), the whole composition is scaled down
 * to fit, so nothing gets clipped.
 *
 * For some accessories there is a "pose" image instead (the character redrawn holding /
 * wearing it, see posePath) — then that image is shown alone, no overlay.
 */
import { useState, type ReactNode } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { getApiBaseUrl } from "@/constants/api";
import {
  ACCESSORIES,
  CHARACTERS,
  FIGURINE_ASSET_VERSION,
  HEAD_POINTS,
  accessoryPath,
  figurinePath,
  posePath,
  type Figurine as FigurineData,
} from "@shared/character-catalog";

const assetUrl = (path: string) => `${getApiBaseUrl()}${path}?v=${FIGURINE_ASSET_VERSION}`;
const FALLBACK = require("@/assets/images/mascote-ovelhinha.png");

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Where the accessory goes, in "figure units": x in figurine widths, y in figurine heights
 * (the figurine itself is the rect 0,0 → 1,1). Returns the visible content rect and the
 * rect of the whole (square, padded) image to draw.
 */
function placeAccessory(figurine: FigurineData, key: string) {
  const accessory = ACCESSORIES.find((acc) => acc.key === key);
  if (!accessory) return null;
  const a = CHARACTERS[figurine.character].anchors;
  const fit = accessory.fit;
  const [bx0, by0, bx1, by1] = fit.box;
  const contentAspect = (bx1 - bx0) / (by1 - by0); // width / height of the visible part (square image)
  const ASPECT = 2 / 3; // figurine width / height

  // Visible size, in figure units
  let w: number;
  let h: number;
  if (fit.sizeBy === "head") {
    w = fit.scale * a.headWidth;
    h = (w * ASPECT) / contentAspect; // height in figure heights
  } else {
    h = fit.scale;
    w = (h * contentAspect) / ASPECT;
  }
  const [px, py] = a.points[fit.point];
  const content: Rect = { x: px - fit.pin[0] * w, y: py - fit.pin[1] * h, w, h };
  // Full image (incl. transparent margin)
  const imgW = w / (bx1 - bx0);
  const imgH = h / (by1 - by0);
  const image: Rect = { x: content.x - bx0 * imgW, y: content.y - by0 * imgH, w: imgW, h: imgH };
  return { accessory, content, image, head: HEAD_POINTS.includes(fit.point), behind: !!fit.behind };
}

/** The figurine image + accessory, drawn to fit inside a W x H box. */
function FullBody({
  figurine,
  width,
  height,
  headOnlyAccessory = false,
}: {
  figurine: FigurineData;
  width: number;
  height: number;
  headOnlyAccessory?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [poseFailed, setPoseFailed] = useState(false);
  const placed = figurine.accessory ? placeAccessory(figurine, figurine.accessory) : null;
  const visible = placed && (!headOnlyAccessory || placed.head) ? placed : null;
  const pose = visible && !poseFailed ? posePath(figurine) : null;
  if (pose) {
    return (
      <View style={{ width, height }}>
        <Image
          source={{ uri: assetUrl(pose) }}
          onError={() => setPoseFailed(true)}
          style={{ position: "absolute", left: 0, top: 0, width, height }}
          resizeMode="contain"
        />
      </View>
    );
  }
  const shown = visible;

  // Union of the figurine (0..1) and the accessory's visible part, in figure units
  let ux0 = 0;
  let uy0 = 0;
  let ux1 = 1;
  let uy1 = 1;
  if (shown && !headOnlyAccessory) {
    ux0 = Math.min(0, shown.content.x);
    uy0 = Math.min(0, shown.content.y);
    ux1 = Math.max(1, shown.content.x + shown.content.w);
    uy1 = Math.max(1, shown.content.y + shown.content.h);
  }
  // Scale so the union fits in the box; keep it centered horizontally and the feet at the bottom
  const k = Math.min(1 / (ux1 - ux0), 1 / (uy1 - uy0));
  const figW = width * k;
  const figH = height * k;
  const originX = (width - (ux1 - ux0) * figW) / 2 - ux0 * figW;
  const originY = height - (uy1 - uy0) * figH - uy0 * figH;

  let accessoryNode: ReactNode = null;
  if (shown) {
    const r = shown.image;
    accessoryNode = (
      <Image
        source={{ uri: assetUrl(accessoryPath(shown.accessory.key)) }}
        style={{
          position: "absolute",
          left: originX + r.x * figW,
          top: originY + r.y * figH,
          width: r.w * figW,
          height: r.h * figH,
        }}
        resizeMode="stretch"
        accessibilityElementsHidden
      />
    );
  }

  return (
    <View style={{ width, height }}>
      {shown?.behind ? accessoryNode : null}
      <Image
        source={failed ? FALLBACK : { uri: assetUrl(figurinePath(figurine.character, figurine.look, figurine.hair)) }}
        onError={() => setFailed(true)}
        style={{ position: "absolute", left: originX, top: originY, width: figW, height: figH }}
        resizeMode="contain"
      />
      {shown && !shown.behind ? accessoryNode : null}
    </View>
  );
}

export function Figurine({
  figurine,
  height,
  mode = "full",
  style,
  label,
}: {
  figurine: FigurineData;
  height: number;
  mode?: "full" | "head";
  style?: ViewStyle;
  label?: string;
}) {
  const a11y = {
    accessible: true,
    accessibilityLabel: label ?? `${CHARACTERS[figurine.character].name}`,
  };

  if (mode === "full") {
    return (
      <View style={[{ width: (height * 2) / 3, height }, style]} {...a11y}>
        <FullBody figurine={figurine} width={(height * 2) / 3} height={height} />
      </View>
    );
  }

  // Head crop: from a bit above the hair (or the hat) to a bit below the chin.
  // Hand/back accessories are hidden here; head ones (hat, crown, glasses…) are included.
  const a = CHARACTERS[figurine.character].anchors;
  const placed = figurine.accessory ? placeAccessory(figurine, figurine.accessory) : null;
  // A pose image already has the cap drawn on the head: just leave a little room above the hair
  const posed = placed?.head && !!posePath(figurine);
  const headAcc = placed?.head && !posed ? placed.content : null;
  const regionTop = Math.min(Math.max(0, a.hairTop - (posed ? 0.05 : 0.03)), headAcc ? headAcc.y - 0.01 : 1);
  const regionBottom = a.chin + 0.08;
  // The crop is square: make it tall enough that a wide hat also fits across
  const accWidthInHeights = headAcc ? (headAcc.w * 2) / 3 + 0.02 : 0;
  const span = Math.max(regionBottom - regionTop, accWidthInHeights);
  const fullH = height / span;
  const fullW = (fullH * 2) / 3;
  const top = -(regionTop - (span - (regionBottom - regionTop)) / 2) * fullH;
  const centerX = headAcc ? ((headAcc.x + headAcc.w / 2 + a.faceCx) / 2) : a.faceCx;
  return (
    <View style={[{ width: height, height, overflow: "hidden" }, style]} {...a11y}>
      <View style={{ position: "absolute", top, left: height / 2 - centerX * fullW }}>
        <FullBody figurine={figurine} width={fullW} height={fullH} headOnlyAccessory />
      </View>
    </View>
  );
}
