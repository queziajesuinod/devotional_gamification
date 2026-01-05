const CAMPO_GRANDE_TZ = "America/Campo_Grande";

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: CAMPO_GRANDE_TZ,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPO_GRANDE_TZ,
  hour12: false,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

type CampoGrandeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const toCampoGrandeParts = (date: Date): CampoGrandeParts => {
  const parts = partsFormatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const parseNumber = (value: string | undefined, fallback = 0) => {
    const parsed = Number(value ?? "");
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    year: parseNumber(map.year),
    month: parseNumber(map.month),
    day: parseNumber(map.day),
    hour: parseNumber(map.hour),
    minute: parseNumber(map.minute),
    second: parseNumber(map.second),
  };
};

const buildUtcFromParts = (parts: CampoGrandeParts) =>
  Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

const clampParts = (parts: CampoGrandeParts, overrides: Partial<CampoGrandeParts>) => ({
  ...parts,
  ...overrides,
});

const parseDateValue = (value: string | Date) => {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/.exec(value);
    if (match) {
      const [_, year, month, day, hour, minute, second] = match;
      const hasTime = typeof hour !== "undefined";
      if (hasTime) {
        return new Date(value);
      }
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
    }
  }
  return new Date(value);
};

export const formatCampoGrandeDate = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = parseDateValue(value);
  if (!Number.isFinite(date.getTime())) return "-";
  const parts = toCampoGrandeParts(date);
  const campoGrandeDate = new Date(buildUtcFromParts(parts));
  return longDateFormatter.format(campoGrandeDate);
};

export const getDelayToCampoGrandeNextMidnight = () => {
  const now = new Date();
  const currentParts = toCampoGrandeParts(now);
  const nowTimestamp = buildUtcFromParts(currentParts);
  const midnightParts = clampParts(currentParts, {
    day: currentParts.day + 1,
    hour: 0,
    minute: 0,
    second: 0,
  });
  const midnightTimestamp = buildUtcFromParts(midnightParts);
  return Math.max(midnightTimestamp - nowTimestamp, 0);
};

const padNumber = (value: number) => value.toString().padStart(2, "0");

export const getCampoGrandeDateString = (date = new Date()) => {
  const parts = toCampoGrandeParts(date);
  return `${parts.year}-${padNumber(parts.month)}-${padNumber(parts.day)}`;
};
