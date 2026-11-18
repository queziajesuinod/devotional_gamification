/**
 * Character figurine (2D, generated with Meshy) with its equipped accessory.
 * Images come from the API server (/characters/...), see shared/character-catalog.ts.
 *
 * - mode "full": whole body, `height` tall (width = 2/3 of the height)
 * - mode "head": square crop around the face, `height` x `height` (headers, rankings)
 */
import { useState, type ReactNode } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { getApiBaseUrl } from "@/constants/api";
import {
  ACCESSORIES,
  CHARACTERS,
  FIGURINE_ASSET_VERSION,
  accessoryPath,
  figurinePath,
  type Figurine as FigurineData,
} from "@shared/character-catalog";

const assetUrl = (path: string) => `${getApiBaseUrl()}${path}?v=${FIGURINE_ASSET_VERSION}`;
const FALLBACK = require("@/assets/images/mascote-ovelhinha.png");

/** The figurine image + accessory, drawn in a W x H box matching the 2:3 image. */
function FullBody({ figurine, width, height }: { figurine: FigurineData; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  const a = CHARACTERS[figurine.character].anchors;
  const accessory = figurine.accessory ? ACCESSORIES.find((acc) => acc.key === figurine.accessory) : null;

  let accessoryNode: ReactNode = null;
  if (accessory) {
    const fit = accessory.fit;
    const faceW = a.faceWidth * width;
    const faceH = (a.chin - a.brow) * height;
    const size = faceW * fit.width; // accessory images are square
    const isHand = fit.ref === "hand";
    const refY =
      fit.ref === "hand" ? a.hand.y : fit.ref === "shoulders" ? a.shoulders : (a[fit.ref] as number);
    const cx = (isHand ? a.hand.x : a.faceCx) * width;
    const offset = fit.align === "top" ? 0 : fit.align === "center" ? size / 2 : size;
    const top = refY * height + fit.dy * faceH - offset;
    accessoryNode = (
      <Image
        source={{ uri: assetUrl(accessoryPath(accessory.key)) }}
        style={{ position: "absolute", width: size, height: size, left: cx - size / 2, top }}
        resizeMode="contain"
        accessibilityElementsHidden
      />
    );
  }

  return (
    <View style={{ width, height }}>
      {accessory?.fit.behind ? accessoryNode : null}
      <Image
        source={failed ? FALLBACK : { uri: assetUrl(figurinePath(figurine.character, figurine.look, figurine.hair)) }}
        onError={() => setFailed(true)}
        style={{ position: "absolute", width, height }}
        resizeMode="contain"
      />
      {accessory && !accessory.fit.behind ? accessoryNode : null}
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

  // Head crop: from a bit above the hair to a bit below the chin
  const a = CHARACTERS[figurine.character].anchors;
  const regionTop = Math.max(0, a.hairTop - 0.03);
  const regionBottom = a.chin + 0.08;
  const fullH = height / (regionBottom - regionTop);
  const fullW = (fullH * 2) / 3;
  return (
    <View style={[{ width: height, height, overflow: "hidden" }, style]} {...a11y}>
      <View style={{ position: "absolute", top: -regionTop * fullH, left: height / 2 - a.faceCx * fullW }}>
        <FullBody figurine={figurine} width={fullW} height={fullH} />
      </View>
    </View>
  );
}
