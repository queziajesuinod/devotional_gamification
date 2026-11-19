/** Helpers shared by the leader panel pages. */
import { getCampoGrandeDateString } from "@shared/_core/time";

export type ActivityStatus = "today" | "week" | "idle" | "never";

/** Days since a YYYY-MM-DD (or Date) activity day, in Campo Grande days. */
export function daysSince(value?: string | Date | null): number | null {
  if (!value) return null;
  const iso = typeof value === "string" ? value.slice(0, 10) : getCampoGrandeDateString(value);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const today = getCampoGrandeDateString();
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d);
  return Math.max(0, Math.round(diff / 86_400_000));
}

export function activityStatus(value?: string | Date | null): ActivityStatus {
  const days = daysSince(value);
  if (days === null) return "never";
  if (days === 0) return "today";
  if (days <= 6) return "week";
  return "idle";
}

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  today: "Ativo hoje",
  week: "Ativo na semana",
  idle: "Sumido",
  never: "Nunca jogou",
};

export const STATUS_TONE = {
  today: "good",
  week: "brand",
  idle: "warn",
  never: "neutral",
} as const;

export function lastActivityText(value?: string | Date | null) {
  const days = daysSince(value);
  if (days === null) return "Sem atividade ainda";
  if (days === 0) return "Jogou hoje";
  if (days === 1) return "Jogou ontem";
  return `Última atividade há ${days} dias`;
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}
