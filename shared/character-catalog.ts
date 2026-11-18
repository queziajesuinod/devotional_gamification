/**
 * Character "figurinhas" catalog — the single source of truth for the shop.
 *
 * Edit prices / what is free here, then run `pnpm catalog:sync` to apply it to the
 * shop_items table (upsert by slug; purchases are never deleted).
 *
 * Images live in public/characters (WebP, served by the API at /characters/...):
 *   /characters/<character>/<look>.webp
 *   /characters/<character>/<look>-cabelo-<hair>.webp   (only for HAIR_LOOKS)
 *   /characters/acessorios/<accessory>.webp
 */
import type { ShopRarity } from "./shop-rules";

export type CharacterKey = "davi" | "lia" | "theo";

export type FaceAnchors = {
  /** All values are fractions of the figurine image (width for x, height for y). */
  hairTop: number;
  brow: number;
  eyes: number;
  chin: number;
  faceCx: number;
  faceWidth: number;
  hand: { x: number; y: number };
  shoulders: number;
};

const px = (f: { hairTop: number; brow: number; eyes: number; chin: number; left: number; right: number }) => ({
  hairTop: f.hairTop / 1536,
  brow: f.brow / 1536,
  eyes: f.eyes / 1536,
  chin: f.chin / 1536,
  faceCx: (f.left + f.right) / 2 / 1024,
  faceWidth: (f.right - f.left) / 1024,
});

export const CHARACTERS: Record<
  CharacterKey,
  {
    name: string;
    tagline: string;
    anchors: FaceAnchors;
    hair: { key: string; name: string; swatch: string }[];
    /** Accessories that clash with the character's own look */
    cannotWear: string[];
  }
> = {
  davi: {
    name: "Davi",
    tagline: "Curioso e cheio de ideias",
    anchors: {
      ...px({ hairTop: 40, brow: 235, eyes: 315, chin: 440, left: 335, right: 665 }),
      hand: { x: 0.69, y: 0.625 },
      shoulders: 0.36,
    },
    hair: [
      { key: "loiro", name: "Cabelo loiro", swatch: "#E8C25A" },
      { key: "preto", name: "Cabelo preto", swatch: "#1F1B1A" },
      { key: "azul", name: "Cabelo azul", swatch: "#2F6BFF" },
    ],
    cannotWear: ["oculos-sol"],
  },
  lia: {
    name: "Lia",
    tagline: "Corajosa e animada",
    anchors: {
      ...px({ hairTop: 10, brow: 200, eyes: 268, chin: 362, left: 395, right: 630 }),
      hand: { x: 0.745, y: 0.615 },
      shoulders: 0.33,
    },
    hair: [
      { key: "castanho", name: "Cabelo castanho", swatch: "#6B3E26" },
      { key: "loiro", name: "Cabelo loiro", swatch: "#E8C25A" },
      { key: "rosa", name: "Cabelo rosa", swatch: "#FF5FA2" },
    ],
    cannotWear: [],
  },
  theo: {
    name: "Theo",
    tagline: "Amigo de todo mundo",
    anchors: {
      ...px({ hairTop: 30, brow: 200, eyes: 245, chin: 335, left: 395, right: 630 }),
      hand: { x: 0.71, y: 0.605 },
      shoulders: 0.31,
    },
    hair: [
      { key: "castanho", name: "Cabelo castanho", swatch: "#6B3E26" },
      { key: "loiro", name: "Cabelo loiro", swatch: "#E8C25A" },
      { key: "azul", name: "Cabelo azul", swatch: "#2F6BFF" },
    ],
    cannotWear: [],
  },
};

export const CHARACTER_KEYS = Object.keys(CHARACTERS) as CharacterKey[];
export const DEFAULT_CHARACTER: CharacterKey = "theo";
export const DEFAULT_LOOK = "original";

type Pricing = { rarity: ShopRarity; price: number; minLevel: number; medalsRequired: number };

export const LOOKS: ({ key: string; name: string; description: string } & Pricing)[] = [
  { key: "original", name: "Original", description: "O visual de sempre", rarity: "COMMON", price: 0, minLevel: 1, medalsRequired: 0 },
  { key: "esporte", name: "Esporte", description: "Boné, camiseta azul e tênis vermelho", rarity: "COMMON", price: 40, minLevel: 1, medalsRequired: 0 },
  { key: "moletom", name: "Moletom", description: "Moletom verde-água quentinho", rarity: "COMMON", price: 60, minLevel: 1, medalsRequired: 0 },
  { key: "culto", name: "Domingo de culto", description: "Roupa caprichada para a igreja", rarity: "RARE", price: 150, minLevel: 5, medalsRequired: 0 },
  { key: "explorador", name: "Explorador", description: "Pronto para a aventura", rarity: "RARE", price: 150, minLevel: 5, medalsRequired: 0 },
  { key: "tunica", name: "Túnica bíblica", description: "Como nos tempos da Bíblia", rarity: "RARE", price: 200, minLevel: 8, medalsRequired: 0 },
  { key: "pastor", name: "Pastorzinho", description: "Cajado e uma ovelhinha no colo", rarity: "EPIC", price: 400, minLevel: 12, medalsRequired: 1 },
  { key: "realeza", name: "Realeza bíblica", description: "Rei Davi e rainha Ester", rarity: "EPIC", price: 500, minLevel: 15, medalsRequired: 2 },
];

/** Looks that have hair color variants (others always show the character's own hair). */
export const HAIR_LOOKS = ["original", "esporte"];

export const HAIR_PRICING: Pricing = { rarity: "RARE", price: 80, minLevel: 5, medalsRequired: 0 };

export type AccessoryFit = {
  ref: "hairTop" | "brow" | "eyes" | "chin" | "hand" | "shoulders";
  /** Extra vertical offset, in face heights (brow → chin) */
  dy: number;
  align: "top" | "center" | "bottom";
  /** Width as a multiple of the face width */
  width: number;
  /** Draw behind the figurine (backpack) */
  behind?: boolean;
};

export const ACCESSORIES: ({ key: string; name: string; description: string; fit: AccessoryFit } & Pricing)[] = [
  { key: "lenco", name: "Lenço", description: "Presente de boas-vindas", rarity: "COMMON", price: 0, minLevel: 1, medalsRequired: 0, fit: { ref: "chin", dy: 0.25, align: "top", width: 0.85 } },
  { key: "bone", name: "Boné", description: "Boné verde-água", rarity: "COMMON", price: 40, minLevel: 1, medalsRequired: 0, fit: { ref: "brow", dy: 0.55, align: "bottom", width: 1.45 } },
  { key: "faixa-cabelo", name: "Faixa de cabelo", description: "Faixa rosa fofinha", rarity: "COMMON", price: 40, minLevel: 1, medalsRequired: 0, fit: { ref: "brow", dy: 0.2, align: "bottom", width: 1.15 } },
  { key: "balao", name: "Balão", description: "Um balão vermelho", rarity: "COMMON", price: 50, minLevel: 1, medalsRequired: 0, fit: { ref: "hand", dy: 0.1, align: "bottom", width: 0.55 } },
  { key: "oculos-sol", name: "Óculos de sol", description: "Estilo total", rarity: "COMMON", price: 60, minLevel: 1, medalsRequired: 0, fit: { ref: "eyes", dy: 0, align: "center", width: 1.0 } },
  { key: "chapeu-palha", name: "Chapéu de palha", description: "Para dias de sol", rarity: "RARE", price: 100, minLevel: 5, medalsRequired: 0, fit: { ref: "brow", dy: 0.45, align: "bottom", width: 2.1 } },
  { key: "fone", name: "Fone de ouvido", description: "Para ouvir louvor", rarity: "RARE", price: 100, minLevel: 5, medalsRequired: 0, fit: { ref: "eyes", dy: -0.12, align: "center", width: 1.6 } },
  { key: "mochila", name: "Mochila", description: "Mochila de couro", rarity: "RARE", price: 120, minLevel: 5, medalsRequired: 0, fit: { ref: "shoulders", dy: -0.1, align: "top", width: 1.9, behind: true } },
  { key: "biblia", name: "Bíblia de bolso", description: "Sempre por perto", rarity: "RARE", price: 120, minLevel: 5, medalsRequired: 0, fit: { ref: "hand", dy: 0, align: "center", width: 0.45 } },
  { key: "coroa-flores", name: "Coroa de flores", description: "Linda como um jardim", rarity: "EPIC", price: 250, minLevel: 10, medalsRequired: 0, fit: { ref: "hairTop", dy: 0.35, align: "center", width: 1.3 } },
  { key: "cajado", name: "Cajado", description: "O cajado do pastor", rarity: "EPIC", price: 280, minLevel: 10, medalsRequired: 0, fit: { ref: "hand", dy: 0, align: "center", width: 0.35 } },
  { key: "harpa", name: "Harpa", description: "Como a do rei Davi", rarity: "EPIC", price: 300, minLevel: 10, medalsRequired: 1, fit: { ref: "hand", dy: 0, align: "center", width: 0.7 } },
];

// ---------------- slugs & assets ----------------

export const lookSlug = (c: CharacterKey, look: string) => `${c}-look-${look}`;
export const hairSlug = (c: CharacterKey, hair: string) => `${c}-cabelo-${hair}`;
export const accessorySlug = (key: string) => `acessorio-${key}`;

/** Relative image path for a character wearing a look (+ optional hair color). */
export const figurinePath = (c: CharacterKey, look: string = DEFAULT_LOOK, hair?: string | null) => {
  const validLook = LOOKS.some((l) => l.key === look) ? look : DEFAULT_LOOK;
  const validHair = hair && HAIR_LOOKS.includes(validLook) && CHARACTERS[c].hair.some((h) => h.key === hair);
  return `/characters/${c}/${validLook}${validHair ? `-cabelo-${hair}` : ""}.webp`;
};

export const accessoryPath = (key: string) => `/characters/acessorios/${key}.webp`;

export type CatalogItem = {
  slug: string;
  type: "CLOTHES" | "HAIR_COLOR" | "ACCESSORY";
  characterKey: CharacterKey | null;
  assetKey: string;
  name: string;
  description: string;
  imageUrl: string;
} & Pricing;

/** Flat list used by `pnpm catalog:sync`. */
export function catalogItems(): CatalogItem[] {
  const items: CatalogItem[] = [];
  for (const c of CHARACTER_KEYS) {
    for (const look of LOOKS) {
      items.push({
        slug: lookSlug(c, look.key),
        type: "CLOTHES",
        characterKey: c,
        assetKey: look.key,
        name: `${look.name} · ${CHARACTERS[c].name}`,
        description: look.description,
        imageUrl: figurinePath(c, look.key),
        rarity: look.rarity,
        price: look.price,
        minLevel: look.minLevel,
        medalsRequired: look.medalsRequired,
      });
    }
    for (const hair of CHARACTERS[c].hair) {
      items.push({
        slug: hairSlug(c, hair.key),
        type: "HAIR_COLOR",
        characterKey: c,
        assetKey: hair.key,
        name: `${hair.name} · ${CHARACTERS[c].name}`,
        description: "Aparece nos looks Original e Esporte",
        imageUrl: figurinePath(c, DEFAULT_LOOK, hair.key),
        ...HAIR_PRICING,
      });
    }
  }
  for (const acc of ACCESSORIES) {
    items.push({
      slug: accessorySlug(acc.key),
      type: "ACCESSORY",
      characterKey: null,
      assetKey: acc.key,
      name: acc.name,
      description: acc.description,
      imageUrl: accessoryPath(acc.key),
      rarity: acc.rarity,
      price: acc.price,
      minLevel: acc.minLevel,
      medalsRequired: acc.medalsRequired,
    });
  }
  return items;
}

// ---------------- resolving what to show ----------------

export type Figurine = {
  character: CharacterKey;
  /** false until the user picks a character (show the picker) */
  chosen: boolean;
  look: string;
  hair: string | null;
  accessory: string | null;
};

type EquippedRef = { characterKey?: string | null; assetKey?: string | null; slug?: string | null } | null | undefined;

export const isCharacterKey = (value: unknown): value is CharacterKey =>
  typeof value === "string" && value in CHARACTERS;

/**
 * Figurine for a user from their chosen character and equipped items. Items from another
 * character (or legacy NiceAvatar items) fall back to the defaults.
 */
export function resolveFigurine(
  characterKey: string | null | undefined,
  equipped: { clothes?: EquippedRef; hairColor?: EquippedRef; accessory?: EquippedRef } | null | undefined
): Figurine {
  const character = isCharacterKey(characterKey) ? characterKey : DEFAULT_CHARACTER;
  const mine = (item: EquippedRef) => !!item?.slug && item.characterKey === character && !!item.assetKey;
  const accessoryKey = equipped?.accessory?.slug ? equipped.accessory.assetKey ?? null : null;
  return {
    character,
    chosen: isCharacterKey(characterKey),
    look: mine(equipped?.clothes) ? equipped!.clothes!.assetKey! : DEFAULT_LOOK,
    hair: mine(equipped?.hairColor) ? equipped!.hairColor!.assetKey! : null,
    accessory: accessoryKey && !CHARACTERS[character].cannotWear.includes(accessoryKey) ? accessoryKey : null,
  };
}

/** Bump when figurine images are regenerated (busts the 30-day cache). */
export const FIGURINE_ASSET_VERSION = 1;
