/**
 * Admin helpers for challenges and medals (shared by app/admin/challenges and
 * app/admin/medals). Logic carried over from the legacy single-screen admin.
 */

export type ChallengeType = "READING" | "DEVOTIONAL" | "REFLECTION" | "EXTRA";
export type MedalCategory = "BIBLE_BOOK" | "STREAK" | "MILESTONE" | "SPECIAL";
export type MedalIconType = "emoji" | "image";
export type MedalRequirementType =
  | "streak"
  | "total_devotionals"
  | "first_devotional"
  | "total_reflections"
  | "multiple_books"
  | "book"
  | "early_bird"
  | "night_owl"
  | "challenge_type_count"
  | "custom";

export const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: "READING", label: "Leitura" },
  { value: "DEVOTIONAL", label: "Devocional" },
  { value: "REFLECTION", label: "Reflexão" },
  { value: "EXTRA", label: "Extra" },
];

export const challengeTypeLabel = (type: string) =>
  CHALLENGE_TYPES.find((t) => t.value === type)?.label ?? type;

export const MEDAL_CATEGORIES: { value: MedalCategory; label: string }[] = [
  { value: "BIBLE_BOOK", label: "Livro da Bíblia" },
  { value: "STREAK", label: "Sequência" },
  { value: "MILESTONE", label: "Marco" },
  { value: "SPECIAL", label: "Especial" },
];

export const medalCategoryLabel = (category: string) =>
  MEDAL_CATEGORIES.find((c) => c.value === category)?.label ?? category;

export const MEDAL_REQUIREMENT_OPTIONS: { value: MedalRequirementType; label: string }[] = [
  { value: "streak", label: "Sequência (dias)" },
  { value: "total_devotionals", label: "Total de devocionais" },
  { value: "first_devotional", label: "Primeiro devocional" },
  { value: "total_reflections", label: "Total de reflexões" },
  { value: "multiple_books", label: "Vários livros" },
  { value: "book", label: "Livro específico" },
  { value: "early_bird", label: "Madrugador" },
  { value: "night_owl", label: "Coruja da noite" },
  { value: "challenge_type_count", label: "Tipo de desafio" },
  { value: "custom", label: "Personalizado" },
];

export const MEDAL_EMOJI_OPTIONS = ["🏅", "📖", "🔥", "⭐", "🏆", "🌟", "💎", "✅", "⏰", "🌙"];

export const toInt = (value: string, fallback: number = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

export type MedalFormState = {
  name: string;
  description: string;
  category: MedalCategory;
  iconType: MedalIconType;
  iconEmoji: string;
  iconUrl: string;
  iconUrlGray: string;
  requirementType: MedalRequirementType;
  requirementDays: string;
  requirementCount: string;
  requirementHour: string;
  requirementBooks: string;
  requirementBookName: string;
  requirementChallengeType: ChallengeType;
  requirementRaw: string;
  order: string;
  isActive: boolean;
};

export const EMPTY_MEDAL_FORM: MedalFormState = {
  name: "",
  description: "",
  category: "MILESTONE",
  iconType: "emoji",
  iconEmoji: "",
  iconUrl: "",
  iconUrlGray: "",
  requirementType: "streak",
  requirementDays: "7",
  requirementCount: "1",
  requirementHour: "6",
  requirementBooks: "",
  requirementBookName: "",
  requirementChallengeType: "READING",
  requirementRaw: "",
  order: "0",
  isActive: true,
};

export const parseMedalRequirement = (value: string) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

export const buildMedalRequirement = (form: MedalFormState) => {
  switch (form.requirementType) {
    case "streak":
      return JSON.stringify({ type: "streak", days: toInt(form.requirementDays, 1) });
    case "total_devotionals":
      return JSON.stringify({ type: "total_devotionals", count: toInt(form.requirementCount, 1) });
    case "first_devotional":
      return JSON.stringify({ type: "first_devotional" });
    case "total_reflections":
      return JSON.stringify({ type: "total_reflections", count: toInt(form.requirementCount, 1) });
    case "multiple_books": {
      const books = form.requirementBooks
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return JSON.stringify({ type: "multiple_books", books });
    }
    case "book":
      return JSON.stringify({ type: "book", bookName: form.requirementBookName.trim() });
    case "early_bird":
      return JSON.stringify({ type: "early_bird", hour: toInt(form.requirementHour, 6) });
    case "night_owl":
      return JSON.stringify({ type: "night_owl", hour: toInt(form.requirementHour, 22) });
    case "challenge_type_count":
      return JSON.stringify({
        type: "challenge_type_count",
        challengeType: form.requirementChallengeType,
        count: toInt(form.requirementCount, 1),
      });
    case "custom":
    default:
      return form.requirementRaw.trim();
  }
};

type MedalRecord = {
  name: string;
  description: string;
  category: MedalCategory;
  iconEmoji: string | null;
  iconUrl: string | null;
  iconUrlGray: string | null;
  requirement: string;
  order: number;
  isActive: boolean;
};

/** Medal row → form state (requirement JSON parsed into the builder fields). */
export const medalToForm = (medal: MedalRecord): MedalFormState => {
  const req = parseMedalRequirement(medal.requirement);
  const parsedType = req && typeof req.type === "string" ? req.type : "custom";
  const num = (v: unknown, fallback: string) => (typeof v === "number" ? `${v}` : fallback);
  const form: MedalFormState = {
    ...EMPTY_MEDAL_FORM,
    name: medal.name,
    description: medal.description,
    category: medal.category,
    iconType: medal.iconUrl || medal.iconUrlGray ? "image" : "emoji",
    iconEmoji: medal.iconEmoji || "",
    iconUrl: medal.iconUrl || "",
    iconUrlGray: medal.iconUrlGray || "",
    requirementType: "custom",
    requirementRaw: medal.requirement,
    order: `${medal.order}`,
    isActive: medal.isActive,
  };
  switch (parsedType) {
    case "streak":
      form.requirementType = "streak";
      form.requirementDays = num(req?.days, form.requirementDays);
      break;
    case "total_devotionals":
    case "total_reflections":
      form.requirementType = parsedType;
      form.requirementCount = num(req?.count, form.requirementCount);
      break;
    case "first_devotional":
      form.requirementType = "first_devotional";
      break;
    case "multiple_books":
      form.requirementType = "multiple_books";
      if (Array.isArray(req?.books)) form.requirementBooks = (req.books as unknown[]).join(", ");
      break;
    case "book":
      form.requirementType = "book";
      form.requirementBookName = (req?.bookName as string | undefined) || (req?.book as string | undefined) || "";
      break;
    case "early_bird":
    case "night_owl":
      form.requirementType = parsedType;
      form.requirementHour = num(req?.hour, form.requirementHour);
      break;
    case "challenge_type_count":
      form.requirementType = "challenge_type_count";
      if (typeof req?.challengeType === "string") {
        form.requirementChallengeType = req.challengeType as ChallengeType;
      }
      form.requirementCount = num(req?.count, form.requirementCount);
      break;
    default:
      form.requirementType = "custom";
  }
  return form;
};

/** "Dia N · DD/MM · referência" for a devotional day (date is YYYY-MM-DD). */
export const devotionalDayLabel = (day: { dayNumber: number; date: string | Date; bibleReference: string }) => {
  let ddmm = "";
  if (typeof day.date === "string") {
    const [, m, d] = day.date.slice(0, 10).split("-");
    ddmm = d && m ? `${d}/${m}` : day.date;
  } else if (day.date instanceof Date && !Number.isNaN(day.date.getTime())) {
    ddmm = `${String(day.date.getUTCDate()).padStart(2, "0")}/${String(day.date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return [`Dia ${day.dayNumber}`, ddmm, day.bibleReference].filter(Boolean).join(" · ");
};
