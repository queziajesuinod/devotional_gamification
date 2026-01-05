import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { challenges, devotionalDays, devotionalPlans } from "../drizzle/schema";
import { getDb } from "../server/db";

type InputDay = {
  dia?: number;
  day?: number;
  leitura?: string;
  reading?: string;
  reference?: string;
};

type InputMonth = {
  mes?: string;
  month?: string;
  dias?: InputDay[];
  days?: InputDay[];
};

type InputPayload = {
  meses?: InputMonth[];
  months?: InputMonth[];
};

type ParsedEntry = {
  dateStr: string;
  dayNumber: number;
  bibleReference: string;
  monthLabel: string;
  dayOfMonth: number;
};

const monthMap: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const pad2 = (value: number) => String(value).padStart(2, "0");

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const getDaysInMonth = (year: number, monthIndex: number) =>
  monthIndex === 1 && isLeapYear(year) ? 29 : MONTH_LENGTHS[monthIndex];

const getDayOfYear = (year: number, monthIndex: number, dayNumber: number) => {
  let sum = 0;
  for (let i = 0; i < monthIndex; i++) {
    sum += getDaysInMonth(year, i);
  }
  return sum + dayNumber;
};

const getCampoGrandeDateInfo = (
  year: number,
  monthIndex: number,
  dayNumber: number
) => {
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error("Invalid month");
  }

  const daysInMonth = getDaysInMonth(year, monthIndex);
  if (dayNumber < 1 || dayNumber > daysInMonth) {
    throw new Error("Invalid day");
  }

  const dateStr = `${year}-${pad2(monthIndex + 1)}-${pad2(dayNumber)}`;
  return {
    dateStr,
    dayOfYear: getDayOfYear(year, monthIndex, dayNumber),
  };
};

const normalizeMonthName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getArg = (name: string, args: string[]) => {
  const key = `--${name}`;
  const idx = args.indexOf(key);
  if (idx === -1) return undefined;
  return args[idx + 1];
};

const hasFlag = (name: string, args: string[]) => args.includes(`--${name}`);

async function main() {
  const args = process.argv.slice(2);
  const fileArg = getArg("file", args) ?? getArg("path", args);
  if (!fileArg) {
    throw new Error("Missing --file <path>");
  }

  const planIdArg = getArg("plan-id", args) ?? getArg("planId", args);
  const yearArg = getArg("year", args);
  const updateExisting = hasFlag("update-existing", args);

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available. Check DATABASE_URL.");
  }

  let planId: number | null = null;
  let year: number | null = null;

  if (planIdArg) {
    planId = Number.parseInt(planIdArg, 10);
    if (Number.isNaN(planId)) {
      throw new Error("Invalid --plan-id value");
    }
    const plan = await db
      .select()
      .from(devotionalPlans)
      .where(eq(devotionalPlans.id, planId))
      .limit(1);
    if (!plan.length) {
      throw new Error(`Plan id ${planId} not found`);
    }
    year = yearArg ? Number.parseInt(yearArg, 10) : plan[0].year;
  } else {
    const activePlan = await db
      .select()
      .from(devotionalPlans)
      .where(eq(devotionalPlans.isActive, true))
      .limit(1);
    if (!activePlan.length) {
      throw new Error("No active plan found. Use --plan-id.");
    }
    planId = activePlan[0].id;
    year = yearArg ? Number.parseInt(yearArg, 10) : activePlan[0].year;
  }

  if (!year || Number.isNaN(year)) {
    throw new Error("Invalid --year value");
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as InputPayload | InputMonth[];
  const months = Array.isArray(parsed)
    ? parsed
    : parsed.meses ?? parsed.months ?? [];

  if (!Array.isArray(months) || months.length === 0) {
    throw new Error("No months found. Expected { meses: [...] } or an array of months.");
  }

  const entriesByDate = new Map<string, ParsedEntry>();

  for (const month of months) {
    const label = month.mes ?? month.month ?? "";
    const normalized = label ? normalizeMonthName(label) : "";
    const monthIndex = normalized ? monthMap[normalized] : undefined;
    if (monthIndex === undefined) {
      console.warn(`[Import] Unknown month: "${label}" - skipping`);
      continue;
    }

    const days = month.dias ?? month.days ?? [];
    if (!Array.isArray(days)) {
      console.warn(`[Import] Month "${label}" has no days array - skipping`);
      continue;
    }

    for (const day of days) {
      const dayNumber = day.dia ?? day.day;
      const bibleReference = day.leitura ?? day.reading ?? day.reference;
      if (!dayNumber || !bibleReference) {
        console.warn(`[Import] Missing day or reading in month "${label}" - skipping`);
        continue;
      }

      let dateInfo;
      try {
        dateInfo = getCampoGrandeDateInfo(year, monthIndex, dayNumber);
      } catch {
        console.warn(`[Import] Invalid date for ${label} ${dayNumber} - skipping`);
        continue;
      }

      entriesByDate.set(dateInfo.dateStr, {
        dateStr: dateInfo.dateStr,
        dayNumber: dateInfo.dayOfYear,
        bibleReference: bibleReference.trim(),
        monthLabel: label,
        dayOfMonth: dayNumber,
      });
    }
  }

  const entries = Array.from(entriesByDate.values()).sort((a, b) =>
    a.dateStr.localeCompare(b.dateStr)
  );

  let createdDays = 0;
  let updatedDays = 0;
  let existingDays = 0;
  let createdChallenges = 0;

  for (const entry of entries) {
    const existingByDayNumber = await db
      .select({ id: devotionalDays.id })
      .from(devotionalDays)
      .where(
        and(eq(devotionalDays.planId, planId), eq(devotionalDays.dayNumber, entry.dayNumber))
      )
      .limit(1);

    const existingByDate =
      existingByDayNumber.length > 0
        ? []
        : await db
            .select({ id: devotionalDays.id })
            .from(devotionalDays)
            .where(and(eq(devotionalDays.planId, planId), eq(devotionalDays.date, entry.dateStr as any)))
            .limit(1);

    let dayId: number;
    if (existingByDayNumber.length === 0 && existingByDate.length === 0) {
      const inserted = await db
        .insert(devotionalDays)
        .values({
          planId,
          dayNumber: entry.dayNumber,
          date: entry.dateStr as any,
          bibleReference: entry.bibleReference,
          devotionalText: null,
          reflectionQuestion: null,
        })
        .returning({ id: devotionalDays.id });

      dayId = inserted[0].id;
      createdDays += 1;
    } else {
      const existingId = existingByDayNumber[0]?.id ?? existingByDate[0]?.id;
      dayId = existingId;
      existingDays += 1;

      if (updateExisting) {
        await db
          .update(devotionalDays)
          .set({
            dayNumber: entry.dayNumber,
            date: entry.dateStr as any,
            bibleReference: entry.bibleReference,
          })
          .where(eq(devotionalDays.id, dayId));
        updatedDays += 1;
      }
    }

    const readingChallenge = await db
      .select({ id: challenges.id })
      .from(challenges)
      .where(and(eq(challenges.devotionalDayId, dayId), eq(challenges.type, "READING")))
      .limit(1);

    if (readingChallenge.length === 0) {
      await db.insert(challenges).values({
        devotionalDayId: dayId,
        type: "READING",
        title: "Ler o texto biblico",
        description: "Leia a passagem biblica do dia com atencao",
        baseXp: 10,
        baseDenario: 5,
      });
      createdChallenges += 1;
    }
  }

  console.log(
    `[Import] Done. Plan ${planId}, year ${year}, days: ${entries.length}, created: ${createdDays}, updated: ${updatedDays}, existing: ${existingDays}, reading challenges: ${createdChallenges}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Import] Failed:", error);
    process.exit(1);
  });
