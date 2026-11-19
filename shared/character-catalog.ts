/**
 * Character "figurinhas" catalog — the single source of truth for the shop.
 *
 * Edit prices / what is free here, then run `pnpm catalog:sync` to apply it to the
 * shop_items table (upsert by slug; purchases are never deleted).
 *
 * Images live in public/characters (WebP, served by the API at /characters/...):
 *   /characters/<character>/<look>.webp
 *   /characters/<character>/<look>-cabelo-<hair>.webp   (every look; recolored by script for the newer ones)
 *   /characters/acessorios/<accessory>.webp
 */
import type { ShopRarity } from "./shop-rules";

export type CharacterKey = "davi" | "lia" | "theo";

/** Body points accessories attach to: [x, y] as fractions of the figurine image (x of width, y of height). */
export type BodyPoint = "top" | "hat" | "ears" | "eyes" | "neck" | "hand" | "back";

export type FaceAnchors = {
  /** All values are fractions of the figurine image (width for x, height for y). */
  hairTop: number;
  brow: number;
  eyes: number;
  chin: number;
  faceCx: number;
  faceWidth: number;
  /** Head width INCLUDING hair (fraction of the image width) — head accessories scale with it. */
  headWidth: number;
  /** Measured on the "original" look; the other looks share the same pose. */
  points: Record<BodyPoint, [number, number]>;
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
      headWidth: 0.42,
      points: {
        top: [0.49, 0.04],
        hat: [0.49, 0.105],
        ears: [0.49, 0.205],
        eyes: [0.49, 0.2],
        neck: [0.49, 0.3],
        hand: [0.695, 0.625],
        back: [0.495, 0.33],
      },
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
      headWidth: 0.34,
      points: {
        top: [0.47, 0.012],
        hat: [0.47, 0.085],
        ears: [0.47, 0.17],
        eyes: [0.475, 0.165],
        neck: [0.475, 0.265],
        hand: [0.745, 0.615],
        back: [0.48, 0.31],
      },
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
      headWidth: 0.32,
      points: {
        top: [0.475, 0.025],
        hat: [0.475, 0.08],
        ears: [0.475, 0.16],
        eyes: [0.475, 0.152],
        neck: [0.475, 0.255],
        hand: [0.705, 0.6],
        back: [0.48, 0.29],
      },
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
export const HAIR_LOOKS = LOOKS.map((l) => l.key);

export const HAIR_PRICING: Pricing = { rarity: "RARE", price: 80, minLevel: 5, medalsRequired: 0 };

/**
 * How an accessory sits on the figurine. Tuned visually on all 3 characters × 8 looks
 * (contact sheets), so change one value at a time and re-check.
 * - `point`: the body point it attaches to (see FaceAnchors.points)
 * - `pin`: the spot ON THE ACCESSORY (fractions of its visible content box) that lands on
 *   that point — e.g. the balloon's string end, the cap's brim, where the staff is gripped
 * - `sizeBy` "head": visible width = scale × head width (with hair);
 *   "height": visible height = scale × figurine height (held/worn objects)
 * - `box`: visible content box inside the square image [x0, y0, x1, y1] (transparent margin excluded)
 * - `behind`: drawn behind the figurine, so hands/hair overlap it (held staff, harp,
 *   headband/headphones "worn" with the ends hidden by the hair)
 */
export type AccessoryFit = {
  point: BodyPoint;
  sizeBy: "head" | "height";
  scale: number;
  pin: [number, number];
  box: [number, number, number, number];
  behind?: boolean;
};

/** Accessories shown in the head crop (rankings, headers); hand/back items are hidden there. */
export const HEAD_POINTS: BodyPoint[] = ["top", "hat", "ears", "eyes", "neck"];

export const ACCESSORIES: ({ key: string; name: string; description: string; fit: AccessoryFit } & Pricing)[] = [
  { key: "lenco", name: "Lenço", description: "Presente de boas-vindas", rarity: "COMMON", price: 0, minLevel: 1, medalsRequired: 0, fit: { point: "neck", sizeBy: "head", scale: 0.58, pin: [0.5, 0.06], box: [0.133, 0.055, 0.863, 0.945] } },
  { key: "bone", name: "Boné", description: "Boné verde-água", rarity: "COMMON", price: 40, minLevel: 1, medalsRequired: 0, fit: { point: "hat", sizeBy: "head", scale: 1.08, pin: [0.45, 0.66], box: [0.125, 0.055, 0.879, 0.672] } },
  { key: "faixa-cabelo", name: "Faixa de cabelo", description: "Faixa rosa fofinha", rarity: "COMMON", price: 40, minLevel: 1, medalsRequired: 0, fit: { point: "top", sizeBy: "head", scale: 1.02, pin: [0.5, 0.32], box: [0.082, 0.055, 0.918, 0.941], behind: true } },
  { key: "balao", name: "Balão", description: "Um balão vermelho", rarity: "COMMON", price: 50, minLevel: 1, medalsRequired: 0, fit: { point: "hand", sizeBy: "height", scale: 0.5, pin: [0.42, 1.0], box: [0.32, 0.055, 0.676, 0.941] } },
  { key: "oculos-sol", name: "Óculos de sol", description: "Estilo total", rarity: "COMMON", price: 60, minLevel: 1, medalsRequired: 0, fit: { point: "eyes", sizeBy: "head", scale: 0.72, pin: [0.5, 0.5], box: [0.055, 0.32, 0.945, 0.68] } },
  { key: "chapeu-palha", name: "Chapéu de palha", description: "Para dias de sol", rarity: "RARE", price: 100, minLevel: 5, medalsRequired: 0, fit: { point: "hat", sizeBy: "head", scale: 1.75, pin: [0.5, 0.78], box: [0.055, 0.262, 0.945, 0.738] } },
  { key: "fone", name: "Fone de ouvido", description: "Para ouvir louvor", rarity: "RARE", price: 100, minLevel: 5, medalsRequired: 0, fit: { point: "ears", sizeBy: "head", scale: 1.36, pin: [0.5, 0.63], box: [0.082, 0.051, 0.914, 0.941], behind: true } },
  { key: "mochila", name: "Mochila", description: "Mochila de couro", rarity: "RARE", price: 120, minLevel: 5, medalsRequired: 0, fit: { point: "back", sizeBy: "height", scale: 0.34, pin: [0.5, 0.15], box: [0.113, 0.055, 0.891, 0.938], behind: true } },
  { key: "biblia", name: "Bíblia de bolso", description: "Sempre por perto", rarity: "RARE", price: 120, minLevel: 5, medalsRequired: 0, fit: { point: "hand", sizeBy: "height", scale: 0.13, pin: [0.5, 0.5], box: [0.199, 0.055, 0.801, 0.938] } },
  { key: "coroa-flores", name: "Coroa de flores", description: "Linda como um jardim", rarity: "EPIC", price: 250, minLevel: 10, medalsRequired: 0, fit: { point: "hat", sizeBy: "head", scale: 1.08, pin: [0.5, 0.55], box: [0.055, 0.246, 0.941, 0.75] } },
  { key: "cajado", name: "Cajado", description: "O cajado do pastor", rarity: "EPIC", price: 280, minLevel: 10, medalsRequired: 0, fit: { point: "hand", sizeBy: "height", scale: 0.68, pin: [0.5, 0.42], box: [0.41, 0.055, 0.59, 0.941], behind: true } },
  { key: "harpa", name: "Harpa", description: "Como a do rei Davi", rarity: "EPIC", price: 300, minLevel: 10, medalsRequired: 1, fit: { point: "hand", sizeBy: "height", scale: 0.27, pin: [0.3, 0.72], box: [0.219, 0.055, 0.777, 0.945], behind: true } },
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

/**
 * Accessory poses: the character redrawn WITH the accessory (playing the harp, gripping the
 * staff, hair under the cap…) — generated by scripts/generate-accessory-poses.mjs.
 * Poses exist only for the Original look with the character's own hair, so these accessories
 * can only be worn that way: equipping one puts the Original look back, and changing the look
 * or hair color takes it off (server/db.ts equipItem; the shop warns before).
 */
export const POSE_ACCESSORIES = ["harpa", "bone", "cajado", "balao", "biblia"];

export const needsOriginalLook = (accessory: string | null | undefined) =>
  !!accessory && POSE_ACCESSORIES.includes(accessory);

/** Look this accessory can be worn with (pose accessories: Original look, any hair color). */
export const wearsWith = (f: { look: string; hair: string | null }, accessory: string | null | undefined) =>
  !needsOriginalLook(accessory) || f.look === DEFAULT_LOOK;

/** Pose image for this figurine, or null when it should be drawn as figurine + overlay. */
export const posePath = (f: { character: CharacterKey; look: string; hair: string | null; accessory: string | null }) => {
  if (!f.accessory || !POSE_ACCESSORIES.includes(f.accessory)) return null;
  if (f.look !== DEFAULT_LOOK) return null;
  const hair = f.hair && CHARACTERS[f.character].hair.some((h) => h.key === f.hair) ? `-cabelo-${f.hair}` : "";
  return `/characters/poses/${f.character}-${DEFAULT_LOOK}-${f.accessory}${hair}.webp`;
};

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
        description: "Aparece em todos os looks",
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
  const figurine: Figurine = {
    character,
    chosen: isCharacterKey(characterKey),
    look: mine(equipped?.clothes) ? equipped!.clothes!.assetKey! : DEFAULT_LOOK,
    hair: mine(equipped?.hairColor) ? equipped!.hairColor!.assetKey! : null,
    // Only pose accessories are part of looks now (wardrobe); old overlay items are not shown
    accessory: accessoryKey && POSE_ACCESSORIES.includes(accessoryKey) ? accessoryKey : null,
  };
  // Safety net for old data: a pose accessory never shows on another look / hair color
  if (!wearsWith(figurine, figurine.accessory)) figurine.accessory = null;
  return figurine;
}

/** Bump when figurine images are regenerated (busts the 30-day cache). */
export const FIGURINE_ASSET_VERSION = 3;

// ---------------- Guarda-roupa: looks unlocked by level ----------------

/**
 * A wardrobe look = one complete picture: outfit + hair color + (pose) accessory.
 * Nothing is bought: each look unlocks at a level and can then be equipped for free.
 * Holding the harp/Bible… is its own look; each look comes in every hair color, unlocked
 * at the same level (hair variants of the newer looks are recolored by script).
 *
 * Levels follow shared/progression.ts (~50 XP/day): level 5 ≈ 1 week, 10 ≈ 1 month,
 * 20 ≈ 3½ months, 30 ≈ 8 months, 35 ≈ 10–11 months — so there is always a next look.
 */
export type WardrobeLook = {
  id: string;
  /** Looks that only differ by hair color share a group (one row in the wardrobe) */
  group: string;
  groupName: string;
  name: string;
  description: string;
  look: string;
  hair: string | null;
  accessory: string | null;
  minLevel: number;
  /** 1–5: how strong the look is (grows with the level it needs) */
  power: number;
  rarity: ShopRarity;
};

/** Order of unlocks. `hair` is an index into the character's hair colors. */
const WARDROBE_PLAN: { level: number; look: string; accessory?: string; name?: string; description: string }[] = [
  { level: 1, look: "original", description: "O visual de sempre" },
  { level: 2, look: "original", accessory: "biblia", name: "Com a Bíblia", description: "A Palavra sempre por perto" },
  { level: 3, look: "esporte", description: "Boné, camiseta azul e tênis vermelho" },
  { level: 4, look: "original", accessory: "balao", name: "Com o balão", description: "Dia de festa!" },
  { level: 5, look: "moletom", description: "Moletom verde-água quentinho" },
  { level: 7, look: "original", accessory: "bone", name: "Com o boné", description: "Boné verde-água" },
  { level: 10, look: "culto", description: "Roupa caprichada para a igreja" },
  { level: 13, look: "explorador", description: "Pronto para a aventura" },
  { level: 17, look: "original", accessory: "cajado", name: "Com o cajado", description: "O cajado do pastor" },
  { level: 20, look: "tunica", description: "Como nos tempos da Bíblia" },
  { level: 27, look: "original", accessory: "harpa", name: "Tocando harpa", description: "Louvando como o rei Davi" },
  { level: 30, look: "pastor", description: "Cajado e uma ovelhinha no colo" },
  { level: 35, look: "realeza", description: "Rei Davi e rainha Ester" },
];

export const lookPower = (minLevel: number) => (minLevel >= 30 ? 5 : minLevel >= 20 ? 4 : minLevel >= 10 ? 3 : minLevel >= 5 ? 2 : 1);
const lookRarity = (minLevel: number): ShopRarity => (minLevel >= 27 ? "EPIC" : minLevel >= 10 ? "RARE" : "COMMON");

/** Every look of a character, in unlock order. */
export function wardrobeFor(c: CharacterKey): WardrobeLook[] {
  const out: WardrobeLook[] = [];
  for (const p of WARDROBE_PLAN) {
    const outfit = LOOKS.find((l) => l.key === p.look)!;
    const baseName = p.name ?? outfit.name;
    const group = [p.look, p.accessory ?? null].filter(Boolean).join("-");
    // Each look comes in the character's own hair + every hair color, all at the same level
    for (const hair of [null, ...CHARACTERS[c].hair]) {
      out.push({
        id: [p.look, hair ? `cabelo-${hair.key}` : null, p.accessory ?? null].filter(Boolean).join("-"),
        group,
        groupName: baseName,
        name: hair ? `${baseName} · ${hair.name.replace("Cabelo ", "cabelo ")}` : baseName,
        description: p.description,
        look: p.look,
        hair: hair?.key ?? null,
        accessory: p.accessory ?? null,
        minLevel: p.level,
        power: lookPower(p.level),
        rarity: lookRarity(p.level),
      });
    }
  }
  return out;
}

/** The wardrobe look a figurine is wearing (null if it matches none, e.g. old shop items). */
export const wardrobeLookOf = (f: Figurine) =>
  wardrobeFor(f.character).find(
    (w) => w.look === f.look && (w.hair ?? null) === (f.hair ?? null) && (w.accessory ?? null) === (f.accessory ?? null)
  ) ?? null;

/** Looks that become available exactly at `level` (for the level-up celebration). */
export const looksUnlockedAt = (c: CharacterKey, level: number) => wardrobeFor(c).filter((w) => w.minLevel === level);
