/**
 * Baús de Desafio (Mercado → Tesouro).
 *
 * Chest types are configured by the admin (table chest_types): name, color, price, deadline,
 * how many challenges are drawn, the reward, and the POOL of challenges to draw from.
 * When a player buys one, `challengeCount` challenges are drawn from the pool and stored
 * in the player's chest (snapshot), so editing a chest type never changes chests in progress.
 *
 * Most challenges are tracked by the app from real activity since the purchase; "honor"
 * ones are marked by the player ("Eu fiz!") — at most one per chest.
 */

export type ChallengeKind =
  | "ENCOURAGE_PEOPLE"
  | "PRAY_FOR"
  | "DEVOTIONAL_DAYS"
  | "REFLECTIONS"
  | "EARN_XP"
  | "STREAK"
  | "SEND_MESSAGE"
  | "HONOR";

export const CHALLENGE_KINDS: {
  kind: ChallengeKind;
  label: string;
  emoji: string;
  /** what the target number means (admin form) */
  targetLabel: string;
  /** default player-facing text when the admin leaves it empty */
  text: (n: number, messageLabel?: string) => string;
}[] = [
  {
    kind: "ENCOURAGE_PEOPLE",
    label: "Encorajar pessoas",
    emoji: "💌",
    targetLabel: "Pessoas diferentes",
    text: (n) => (n === 1 ? "Encoraje 1 pessoa da sua célula" : `Encoraje ${n} pessoas diferentes da sua célula`),
  },
  {
    kind: "PRAY_FOR",
    label: "Orar por amigos",
    emoji: "🙏",
    targetLabel: "Amigos",
    text: (n) => (n === 1 ? `Mande "Estou orando por você" para 1 amigo` : `Mande "Estou orando por você" para ${n} amigos`),
  },
  {
    kind: "DEVOTIONAL_DAYS",
    label: "Dias de devocional",
    emoji: "📖",
    targetLabel: "Dias",
    text: (n) => (n === 1 ? "Faça o devocional de hoje" : `Faça o devocional em ${n} dias`),
  },
  {
    kind: "REFLECTIONS",
    label: "Escrever reflexões",
    emoji: "✍️",
    targetLabel: "Reflexões",
    text: (n) => (n === 1 ? "Escreva 1 reflexão" : `Escreva ${n} reflexões`),
  },
  { kind: "EARN_XP", label: "Ganhar XP", emoji: "⭐", targetLabel: "XP", text: (n) => `Ganhe ${n} XP` },
  {
    kind: "STREAK",
    label: "Dias de sequência",
    emoji: "🔥",
    targetLabel: "Dias seguidos",
    text: (n) => `Chegue a ${n} dias de sequência`,
  },
  {
    kind: "SEND_MESSAGE",
    label: "Enviar uma mensagem específica",
    emoji: "💌",
    targetLabel: "Amigos diferentes",
    text: (n, messageLabel) =>
      `Mande "${messageLabel ?? "a mensagem"}" para ${n === 1 ? "1 amigo" : `${n} amigos`}`,
  },
  {
    kind: "HONOR",
    label: "Desafio de confiança (a criança marca)",
    emoji: "🤝",
    targetLabel: "—",
    text: () => "Faça uma boa ação escondido",
  },
];

export const challengeKindInfo = (kind: string) => CHALLENGE_KINDS.find((k) => k.kind === kind) ?? CHALLENGE_KINDS[0];

/** One entry of a chest type's pool (as the admin configures it). */
export type PoolChallenge = {
  kind: ChallengeKind;
  target: number;
  /** optional custom text; required for HONOR */
  text?: string;
  emoji?: string;
  /** SEND_MESSAGE: which encouragement message (encouragement_messages.id) + its label snapshot */
  messageId?: number;
  messageLabel?: string;
};

/** A challenge as stored in the player's chest. */
export type ChestChallenge = {
  id: string;
  kind: ChallengeKind;
  target: number;
  text: string;
  emoji: string;
  /** only for HONOR: the player said they did it */
  done?: boolean;
  /** only for SEND_MESSAGE */
  messageId?: number;
};

export const toChestChallenge = (p: PoolChallenge, index: number): ChestChallenge => {
  const info = challengeKindInfo(p.kind);
  const target = p.kind === "HONOR" ? 1 : Math.max(1, Math.round(p.target));
  return {
    id: `${p.kind}-${index}`,
    kind: p.kind,
    target,
    text: p.text?.trim() || info.text(target, p.messageLabel),
    emoji: p.emoji?.trim() || info.emoji,
    ...(p.kind === "SEND_MESSAGE" && p.messageId ? { messageId: p.messageId } : {}),
  };
};

/** Draws `count` different challenges from the pool, at most one honor challenge. */
export function drawChallenges(pool: PoolChallenge[], count: number, random: () => number = Math.random): ChestChallenge[] {
  const indexed = pool.map((p, i) => ({ p, i })).sort(() => random() - 0.5);
  const picked: ChestChallenge[] = [];
  let honor = false;
  for (const { p, i } of indexed) {
    if (picked.length >= count) break;
    if (p.kind === "HONOR") {
      if (honor) continue;
      honor = true;
    }
    picked.push(toChestChallenge(p, i));
  }
  return picked;
}

/** At most this many chests in progress at once (and one of each type). */
export const MAX_ACTIVE_CHESTS = 3;

/** Colors the admin can pick for a chest. */
export const CHEST_COLORS: { value: string; label: string }[] = [
  { value: "#B87333", label: "Bronze" },
  { value: "#8E9AAF", label: "Prata" },
  { value: "#E0A800", label: "Ouro" },
  { value: "#3D6FD6", label: "Azul real" },
  { value: "#2E8B57", label: "Verde" },
  { value: "#7B3FA0", label: "Roxo realeza" },
  { value: "#C1272D", label: "Vermelho" },
  { value: "#3AA6A8", label: "Verde-água" },
];

/** A chest type as the Mercado shows it. */
export type ChestTypeView = {
  id: number;
  name: string;
  description: string;
  color: string;
  price: number;
  days: number;
  challengeCount: number;
  reward: { xp: number; denario: number };
};

export type ChestStatus = "ACTIVE" | "READY" | "CLAIMED" | "EXPIRED";

/** A player's chest as the Tesouro shows it (server fills progress). */
export type ChestView = {
  id: number;
  chestTypeId: number | null;
  name: string;
  color: string;
  status: ChestStatus;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  reward: { xp: number; denario: number };
  challenges: (ChestChallenge & { progress: number; complete: boolean })[];
};

export const deadlineLabel = (days: number) => (days === 1 ? "1 dia" : `${days} dias`);
