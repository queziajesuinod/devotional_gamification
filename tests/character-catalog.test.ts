import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCESSORIES,
  CHARACTER_KEYS,
  HAIR_LOOKS,
  LOOKS,
  accessoryPath,
  catalogItems,
  figurinePath,
  resolveFigurine,
} from "../shared/character-catalog";
import { getItemLock } from "../shared/shop-rules";

const publicFile = (p: string) => path.join(__dirname, "..", "public", p);

describe("catalog", () => {
  const items = catalogItems();

  it("has unique slugs", () => {
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length);
  });

  it("has an image for every item, look and hair variant", () => {
    for (const item of items) expect(fs.existsSync(publicFile(item.imageUrl)), item.imageUrl).toBe(true);
    for (const c of CHARACTER_KEYS) {
      for (const look of LOOKS) expect(fs.existsSync(publicFile(figurinePath(c, look.key)))).toBe(true);
    }
    for (const acc of ACCESSORIES) expect(fs.existsSync(publicFile(accessoryPath(acc.key)))).toBe(true);
  });

  it("keeps the starter items free", () => {
    const free = items.filter((i) => i.price === 0).map((i) => i.slug);
    expect(free).toEqual(expect.arrayContaining(["davi-look-original", "lia-look-original", "theo-look-original", "acessorio-lenco"]));
    expect(free).toHaveLength(4);
  });

  it("only uses hair variants on hair looks", () => {
    expect(figurinePath("lia", "tunica", "rosa")).toBe("/characters/lia/tunica.webp");
    expect(figurinePath("lia", HAIR_LOOKS[0], "rosa")).toBe("/characters/lia/original-cabelo-rosa.webp");
    expect(figurinePath("lia", "nope", "nope")).toBe("/characters/lia/original.webp");
  });
});

describe("resolveFigurine", () => {
  it("defaults when nothing is chosen", () => {
    expect(resolveFigurine(null, null)).toEqual({ character: "theo", chosen: false, look: "original", hair: null, accessory: null });
  });

  it("ignores items from another character and legacy items", () => {
    const fig = resolveFigurine("lia", {
      clothes: { slug: "theo-look-tunica", characterKey: "theo", assetKey: "tunica" },
      hairColor: { slug: null, characterKey: null, assetKey: "x" },
      accessory: { slug: "acessorio-bone", characterKey: null, assetKey: "bone" },
    });
    expect(fig).toEqual({ character: "lia", chosen: true, look: "original", hair: null, accessory: "bone" });
  });

  it("hides accessories a character cannot wear", () => {
    const fig = resolveFigurine("davi", { accessory: { slug: "acessorio-oculos-sol", assetKey: "oculos-sol" } });
    expect(fig.accessory).toBeNull();
  });
});

describe("item locks", () => {
  it("uses the item's own level and medals when present", () => {
    expect(getItemLock({ rarity: "EPIC", minLevel: 15, medalsRequired: 2 }, 12, 5).reason).toBe("Requer nível 15");
    expect(getItemLock({ rarity: "EPIC", minLevel: 15, medalsRequired: 2 }, 15, 1).reason).toBe("Requer 2 medalha(s)");
    expect(getItemLock({ rarity: "EPIC", minLevel: 15, medalsRequired: 2 }, 15, 2).isLocked).toBe(false);
    expect(getItemLock({ rarity: "RARE" }, 1, 0).reason).toBe("Requer nível 5");
  });
});
