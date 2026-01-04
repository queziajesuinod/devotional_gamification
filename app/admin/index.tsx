
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { NiceAvatar, genNiceAvatarConfig, type NiceAvatarConfig } from "@/components/nice-avatar";
import { trpc } from "@/lib/trpc";
import { SHOP_RARITY_RULES, applyRarityDefaultPrice, type ShopRarity } from "@/shared/shop-rules";

type ToggleProps = {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
};

const Toggle = ({ label, value, onToggle }: ToggleProps) => (
  <TouchableOpacity
    className={`px-3 py-2 rounded-lg border ${
      value ? "bg-success/10 border-success" : "bg-surface border-border"
    }`}
    onPress={() => onToggle(!value)}
  >
    <Text className={value ? "text-success font-semibold" : "text-muted"}>
      {label}: {value ? "yes" : "no"}
    </Text>
  </TouchableOpacity>
);

const confirmAction = async (message: string) => {
  if (Platform.OS === "web") {
    return confirm(message);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Ok", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
};

const toInt = (value: string, fallback: number = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const formatShortDate = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const ACTIVE_DAYS = 7;

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  let output = year;
  if (month) output += `-${month}`;
  if (day) output += `-${day}`;
  return output;
};

const parseAvatarConfig = (value?: string | null): NiceAvatarConfig | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as NiceAvatarConfig;
  } catch {
    return null;
  }
};

const parseMedalRequirement = (value: string) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const buildMedalRequirement = (form: MedalFormState) => {
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
        .map((value) => value.trim())
        .filter(Boolean);
      return JSON.stringify({ type: "multiple_books", books });
    }
    case "book": {
      const bookName = form.requirementBookName.trim();
      return JSON.stringify({ type: "book", bookName });
    }
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

const parseAvatarConfigInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { config: null as NiceAvatarConfig | null, error: "" };
  }
  try {
    return { config: JSON.parse(trimmed) as NiceAvatarConfig, error: "" };
  } catch {
    return { config: null as NiceAvatarConfig | null, error: "Invalid JSON" };
  }
};

type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

const ADMIN_PAGE_LIMIT = 10;

const getPaginatedItems = <T extends unknown>(data?: PaginatedResult<T> | null) => data?.items ?? [];

const getPaginationMeta = (
  data?: PaginatedResult<unknown> | null,
  fallbackPage = 1,
  fallbackLimit = ADMIN_PAGE_LIMIT
) => ({
  page: data?.page ?? fallbackPage,
  limit: data?.limit ?? fallbackLimit,
  total: data?.total ?? 0,
});

type PaginationControlsProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

const PaginationControls = ({
  page,
  limit,
  total,
  onPageChange,
  loading,
}: PaginationControlsProps) => {
  if (total <= limit) {
    return null;
  }
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-xs text-muted">
        Página {page} de {totalPages} ({total} registros)
      </Text>
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="px-3 py-1 rounded-full border border-border bg-surface"
          disabled={page <= 1 || loading}
          onPress={() => onPageChange(Math.max(1, page - 1))}
        >
          <Text className={`text-xs ${page <= 1 || loading ? "text-muted" : "text-foreground"}`}>
            Anterior
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-3 py-1 rounded-full border border-border bg-surface"
          disabled={page >= totalPages || loading}
          onPress={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <Text className={`text-xs ${page >= totalPages || loading ? "text-muted" : "text-foreground"}`}>
            Próximo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

type ShopItemType = "BACKGROUND" | "CLOTHES" | "ACCESSORY" | "HAIR_STYLE" | "HAIR_COLOR";

type AvatarOptionKind = "color" | "text";

type ChallengeType = "READING" | "DEVOTIONAL" | "REFLECTION" | "EXTRA";

type MedalCategory = "BIBLE_BOOK" | "STREAK" | "MILESTONE" | "SPECIAL";

type MedalIconType = "emoji" | "image";

type MedalRequirementType =
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

type DayChallengeDraft = {
  id?: number;
  type: ChallengeType;
  title: string;
  description: string;
  baseXp: string;
  baseDenario: string;
};

type MedalFormState = {
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

type AvatarOptionGroup = {
  key: string;
  label: string;
  values: string[];
  type?: ShopItemType;
  kind?: AvatarOptionKind;
  note?: string;
};

const SHOP_ITEM_TYPES: ShopItemType[] = [
  "BACKGROUND",
  "HAIR_STYLE",
  "HAIR_COLOR",
  "CLOTHES",
  "ACCESSORY",
];

const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: "READING", label: "Leitura" },
  { value: "DEVOTIONAL", label: "Devocional" },
  { value: "REFLECTION", label: "Reflexao" },
  { value: "EXTRA", label: "Extra" },
];

const MEDAL_CATEGORIES: { value: MedalCategory; label: string }[] = [
  { value: "BIBLE_BOOK", label: "Bible book" },
  { value: "STREAK", label: "Streak" },
  { value: "MILESTONE", label: "Milestone" },
  { value: "SPECIAL", label: "Special" },
];

const MEDAL_REQUIREMENT_OPTIONS: { value: MedalRequirementType; label: string }[] = [
  { value: "streak", label: "Streak (dias)" },
  { value: "total_devotionals", label: "Total devocionais" },
  { value: "first_devotional", label: "Primeiro devocional" },
  { value: "total_reflections", label: "Total reflexoes" },
  { value: "multiple_books", label: "Multiplos livros" },
  { value: "book", label: "Livro especifico" },
  { value: "early_bird", label: "Madrugador" },
  { value: "night_owl", label: "Coruja da noite" },
  { value: "challenge_type_count", label: "Tipo de challenge" },
  { value: "custom", label: "Custom" },
];

const MEDAL_EMOJI_OPTIONS = ["🏅", "📖", "🔥", "⭐", "🏆", "🌟", "💎", "✅", "⏰", "🌙"];

const SHOP_ITEM_TYPE_LABELS: Record<ShopItemType, string> = {
  BACKGROUND: "Fundo",
  HAIR_STYLE: "Cabelo estilo",
  HAIR_COLOR: "Cabelo cor",
  CLOTHES: "Roupas",
  ACCESSORY: "Acessorios",
};

const USER_ROLES = ["user", "leader", "admin"] as const;

const AVATAR_OPTION_GROUPS: AvatarOptionGroup[] = [
  {
    key: "bgColor",
    label: "Fundo (bgColor)",
    type: "BACKGROUND",
    kind: "color",
    values: [
      "#9287FF",
      "#6BD9E9",
      "#FC909F",
      "#F4D150",
      "#E0DDFF",
      "#D2EFF3",
      "#FFEDEF",
      "#FFEBA4",
      "#506AF4",
      "#F48150",
      "#74D153",
    ],
  },
  {
    key: "hairStyle",
    label: "Cabelo estilo (hairStyle)",
    type: "HAIR_STYLE",
    kind: "text",
    values: ["normal", "thick", "mohawk", "womanLong", "womanShort"],
  },
  {
    key: "hairColor",
    label: "Cabelo cor (hairColor)",
    type: "HAIR_COLOR",
    kind: "color",
    values: ["#000", "#fff", "#77311D", "#FC909F", "#D2EFF3", "#506AF4", "#F48150"],
  },
  {
    key: "shirtStyle",
    label: "Roupa estilo (shirtStyle)",
    type: "CLOTHES",
    kind: "text",
    values: ["hoody", "short", "polo"],
  },
  {
    key: "shirtColor",
    label: "Roupa cor (shirtColor)",
    type: "CLOTHES",
    kind: "color",
    values: ["#9287FF", "#6BD9E9", "#FC909F", "#F4D150", "#77311D"],
  },
  {
    key: "hatStyle",
    label: "Chapeu estilo (hatStyle)",
    type: "ACCESSORY",
    kind: "text",
    values: ["beanie", "turban", "none"],
  },
  {
    key: "hatColor",
    label: "Chapeu cor (hatColor)",
    type: "ACCESSORY",
    kind: "color",
    values: ["#000", "#fff", "#77311D", "#FC909F", "#D2EFF3", "#506AF4", "#F48150"],
  },
  {
    key: "glassesStyle",
    label: "Oculos (glassesStyle)",
    type: "ACCESSORY",
    kind: "text",
    values: ["round", "square", "none"],
  },
  {
    key: "faceColor",
    label: "Pele (faceColor)",
    kind: "color",
    note: "Base avatar: nao ocupa slot.",
    values: ["#F9C9B6", "#AC6651"],
  },
  {
    key: "earSize",
    label: "Orelha (earSize)",
    kind: "text",
    note: "Base avatar: nao ocupa slot.",
    values: ["small", "big"],
  },
  {
    key: "eyeStyle",
    label: "Olho (eyeStyle)",
    kind: "text",
    note: "Base avatar: nao ocupa slot.",
    values: ["circle", "oval", "smile"],
  },
  {
    key: "eyeBrowStyle",
    label: "Sobrancelha (eyeBrowStyle)",
    kind: "text",
    note: "Base avatar: nao ocupa slot.",
    values: ["up", "upWoman"],
  },
  {
    key: "noseStyle",
    label: "Nariz (noseStyle)",
    kind: "text",
    note: "Base avatar: nao ocupa slot.",
    values: ["short", "long", "round"],
  },
  {
    key: "mouthStyle",
    label: "Boca (mouthStyle)",
    kind: "text",
    note: "Base avatar: nao ocupa slot.",
    values: ["laugh", "smile", "peace"],
  },
];
export default function AdminPanelScreen() {
  const isWebPlatform = Platform.OS === "web";

  const adminMe = trpc.admin.me.useQuery();
  const isAdmin = !!adminMe.data;
  const [usersPage, setUsersPage] = useState(1);
  const [shopPage, setShopPage] = useState(1);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupRequestsPage, setGroupRequestsPage] = useState(1);
  const [plansPage, setPlansPage] = useState(1);
  const [daysPage, setDaysPage] = useState(1);
  const [challengesPage, setChallengesPage] = useState(1);
  const [medalsPage, setMedalsPage] = useState(1);

  const usersQuery = trpc.admin.users.list.useQuery(
    { page: usersPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );
  const shopItemsQuery = trpc.admin.shopItems.list.useQuery(
    { page: shopPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );
  const groupsQuery = trpc.admin.groups.list.useQuery(
    { page: groupsPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );
  const groupRequestsQuery = trpc.admin.groupRequests.pending.useQuery(
    { page: groupRequestsPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );
  const plansQuery = trpc.admin.devotionalPlans.list.useQuery(
    { page: plansPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );
  const daysQuery = trpc.admin.devotionalDays.list.useQuery(
    { page: daysPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );
  const challengesQuery = trpc.admin.challenges.list.useQuery(
    { page: challengesPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );
  const medalsQuery = trpc.admin.medals.list.useQuery(
    { page: medalsPage, limit: ADMIN_PAGE_LIMIT },
    { enabled: isAdmin },
  );

  const userRoleUpdate = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => usersQuery.refetch(),
  });

  const shopCreate = trpc.admin.shopItems.create.useMutation({
    onSuccess: () => shopItemsQuery.refetch(),
  });
  const shopUpdate = trpc.admin.shopItems.update.useMutation({
    onSuccess: () => shopItemsQuery.refetch(),
  });
  const shopDelete = trpc.admin.shopItems.delete.useMutation({
    onSuccess: () => shopItemsQuery.refetch(),
  });

  const groupCreate = trpc.admin.groups.create.useMutation({
    onSuccess: () => groupsQuery.refetch(),
  });
  const groupUpdate = trpc.admin.groups.update.useMutation({
    onSuccess: () => groupsQuery.refetch(),
  });
  const groupDelete = trpc.admin.groups.delete.useMutation({
    onSuccess: () => groupsQuery.refetch(),
  });

  const requestApprove = trpc.admin.groupRequests.approve.useMutation({
    onSuccess: () => groupRequestsQuery.refetch(),
  });
  const requestReject = trpc.admin.groupRequests.reject.useMutation({
    onSuccess: () => groupRequestsQuery.refetch(),
  });

  const planCreate = trpc.admin.devotionalPlans.create.useMutation({
    onSuccess: () => plansQuery.refetch(),
  });
  const planUpdate = trpc.admin.devotionalPlans.update.useMutation({
    onSuccess: () => plansQuery.refetch(),
  });
  const planDelete = trpc.admin.devotionalPlans.delete.useMutation({
    onSuccess: () => plansQuery.refetch(),
  });

  const dayCreate = trpc.admin.devotionalDays.create.useMutation({
    onSuccess: () => daysQuery.refetch(),
  });
  const dayUpdate = trpc.admin.devotionalDays.update.useMutation({
    onSuccess: () => daysQuery.refetch(),
  });
  const dayDelete = trpc.admin.devotionalDays.delete.useMutation({
    onSuccess: () => daysQuery.refetch(),
  });

  const challengeCreate = trpc.admin.challenges.create.useMutation({
    onSuccess: () => challengesQuery.refetch(),
  });
  const challengeUpdate = trpc.admin.challenges.update.useMutation({
    onSuccess: () => challengesQuery.refetch(),
  });
  const challengeDelete = trpc.admin.challenges.delete.useMutation({
    onSuccess: () => challengesQuery.refetch(),
  });

  const medalCreate = trpc.admin.medals.create.useMutation({
    onSuccess: () => medalsQuery.refetch(),
  });
  const medalUpdate = trpc.admin.medals.update.useMutation({
    onSuccess: () => medalsQuery.refetch(),
  });
  const medalDelete = trpc.admin.medals.delete.useMutation({
    onSuccess: () => medalsQuery.refetch(),
  });
  const [shopEditingId, setShopEditingId] = useState<number | null>(null);
  const [shopForm, setShopForm] = useState({
    name: "",
    type: "BACKGROUND",
    rarity: "COMMON",
    priceDenario: "0",
    imageUrl: "",
    avatarConfig: "",
    description: "",
    isAvailable: true,
  });
  const [selectedAvatarGroupKey, setSelectedAvatarGroupKey] = useState(
    AVATAR_OPTION_GROUPS[0]?.key ?? "bgColor"
  );

  const [groupEditingId, setGroupEditingId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    leaderId: "",
  });

  const [planEditingId, setPlanEditingId] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    year: `${new Date().getFullYear()}`,
    description: "",
    isActive: true,
  });

  const [dayEditingId, setDayEditingId] = useState<number | null>(null);
  const [dayForm, setDayForm] = useState({
    planId: "",
    dayNumber: "",
    date: "",
    bibleReference: "",
    devotionalText: "",
    reflectionQuestion: "",
  });
  const [dayChallenges, setDayChallenges] = useState<DayChallengeDraft[]>([]);
  const [dayChallengeOriginalIds, setDayChallengeOriginalIds] = useState<number[]>([]);

  const [challengeEditingId, setChallengeEditingId] = useState<number | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    devotionalDayId: "",
    type: "READING",
    title: "",
    description: "",
    baseXp: "10",
    baseDenario: "5",
  });

  const [medalEditingId, setMedalEditingId] = useState<number | null>(null);
  const [medalForm, setMedalForm] = useState<MedalFormState>({
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
  });
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const resetShopForm = () => {
    setShopEditingId(null);
    setShopForm({
      name: "",
      type: "BACKGROUND",
      rarity: "COMMON",
      priceDenario: "0",
      imageUrl: "",
      avatarConfig: "",
      description: "",
      isAvailable: true,
    });
  };

  const resetGroupForm = () => {
    setGroupEditingId(null);
    setGroupForm({ name: "", description: "", leaderId: "" });
  };

  const resetPlanForm = () => {
    setPlanEditingId(null);
    setPlanForm({
      name: "",
      year: `${new Date().getFullYear()}`,
      description: "",
      isActive: true,
    });
  };

  const resetDayForm = () => {
    setDayEditingId(null);
    setDayForm({
      planId: "",
      dayNumber: "",
      date: "",
      bibleReference: "",
      devotionalText: "",
      reflectionQuestion: "",
    });
    setDayChallenges([]);
    setDayChallengeOriginalIds([]);
  };

  const resetChallengeForm = () => {
    setChallengeEditingId(null);
    setChallengeForm({
      devotionalDayId: "",
      type: "READING",
      title: "",
      description: "",
      baseXp: "10",
      baseDenario: "5",
    });
  };

  const resetMedalForm = () => {
    setMedalEditingId(null);
    setMedalForm({
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
    });
  };

  const addDayChallenge = () => {
    setDayChallenges((prev) => [
      ...prev,
      {
        type: "READING",
        title: "",
        description: "",
        baseXp: "10",
        baseDenario: "5",
      },
    ]);
  };

  const updateDayChallenge = (index: number, patch: Partial<DayChallengeDraft>) => {
    setDayChallenges((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const removeDayChallenge = (index: number) => {
    setDayChallenges((prev) => prev.filter((_, idx) => idx !== index));
  };

  const { width } = useWindowDimensions();
  const isWide = width >= 1200;

  const usersList = getPaginatedItems(usersQuery.data);
  const shopItems = getPaginatedItems(shopItemsQuery.data);
  const groupsList = getPaginatedItems(groupsQuery.data);
  const groupRequests = getPaginatedItems(groupRequestsQuery.data);
  const planList = getPaginatedItems(plansQuery.data);
  const daysList = getPaginatedItems(daysQuery.data);
  const challengesList = getPaginatedItems(challengesQuery.data);
  const medalsList = getPaginatedItems(medalsQuery.data);
  const usersPagination = getPaginationMeta(usersQuery.data, usersPage);
  const shopPagination = getPaginationMeta(shopItemsQuery.data, shopPage);
  const groupsPagination = getPaginationMeta(groupsQuery.data, groupsPage);
  const groupRequestsPagination = getPaginationMeta(groupRequestsQuery.data, groupRequestsPage);
  const plansPagination = getPaginationMeta(plansQuery.data, plansPage);
  const daysPagination = getPaginationMeta(daysQuery.data, daysPage);
  const challengesPagination = getPaginationMeta(challengesQuery.data, challengesPage);
  const medalsPagination = getPaginationMeta(medalsQuery.data, medalsPage);

  const leaderCandidates = useMemo(() => usersList.slice(0, 12), [usersList]);
  const activeCutoff = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);
    return cutoff;
  }, []);
  const usersWithStatus = useMemo(() => {
    return usersList.map((user) => {
      const lastSignedIn = user.lastSignedIn ? new Date(user.lastSignedIn) : null;
      const isActive = !!lastSignedIn && lastSignedIn >= activeCutoff;
      return { ...user, lastSignedIn, isActive };
    });
  }, [usersList, activeCutoff]);
  const visibleUsers = useMemo(() => {
    if (!showActiveOnly) return usersWithStatus;
    return usersWithStatus.filter((user) => user.isActive);
  }, [usersWithStatus, showActiveOnly]);
  const activeUserCount = useMemo(
    () => usersWithStatus.filter((user) => user.isActive).length,
    [usersWithStatus]
  );
  const planOptions = useMemo(() => planList, [planList]);
  const dayOptions = useMemo(() => daysList, [daysList]);
  const avatarPreviewBase = useMemo(() => genNiceAvatarConfig(), []);

  const selectedAvatarGroup = useMemo(
    () =>
      AVATAR_OPTION_GROUPS.find((group) => group.key === selectedAvatarGroupKey) ||
      AVATAR_OPTION_GROUPS[0],
    [selectedAvatarGroupKey]
  );

  const shopAvatarConfigResult = useMemo(
    () => parseAvatarConfigInput(shopForm.avatarConfig),
    [shopForm.avatarConfig]
  );
  const shopAvatarPatch = useMemo(() => {
    const config = shopAvatarConfigResult.config;
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return null;
    }
    return config as Record<string, unknown>;
  }, [shopAvatarConfigResult.config]);

  const shopPreviewConfig = useMemo(() => {
    if (!shopAvatarPatch) return null;
    return { ...avatarPreviewBase, ...shopAvatarPatch } as NiceAvatarConfig;
  }, [avatarPreviewBase, shopAvatarPatch]);

  if (!isWebPlatform) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Admin panel is available on web only.</Text>
      </ScreenContainer>
    );
  }

const applyAvatarOption = (group: AvatarOptionGroup, value: string) => {
  const patch = { [group.key]: value };
  setShopForm((prev) => ({
    ...prev,
    avatarConfig: JSON.stringify(patch),
    type: group.type ?? prev.type,
    name: prev.name || `${group.key}:${value}`,
  }));
};

const openColorPicker = (group: AvatarOptionGroup, current: string | undefined) => {
  const normalized = current ?? "#000000";
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const input = document.createElement("input");
    input.type = "color";
    input.value = normalized;
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement | null;
      if (target?.value) {
        applyAvatarOption(group, target.value);
      }
    });
    document.body.appendChild(input);
    input.click();
    const cleanup = () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    input.addEventListener("blur", cleanup, { once: true });
    input.addEventListener("input", cleanup, { once: true });
    return;
  }

  if (typeof prompt === "function") {
    const promptValue = prompt("Digite um hexadecimal para a cor", normalized);
    if (promptValue && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(promptValue)) {
      applyAvatarOption(group, promptValue);
    }
  }
};

  if (adminMe.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Loading admin panel...</Text>
      </ScreenContainer>
    );
  }

  if (adminMe.error || !adminMe.data) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-error">Access denied. Admin role required.</Text>
      </ScreenContainer>
    );
  }
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View className="bg-primary p-6">
          <Text className="text-white text-2xl font-bold">Admin Panel</Text>
          <Text className="text-white/80 mt-2">
            Logged in as {adminMe.data.nickname} ({adminMe.data.email || "no email"})
          </Text>
        </View>

        <View
          className="p-6 gap-6"
          style={{ width: "100%", maxWidth: 1200, alignSelf: "center" }}
        >
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-foreground">Users</Text>
              <Text className="text-xs text-muted">
                {visibleUsers.length} total | {activeUserCount} ativos (ult. {ACTIVE_DAYS} dias)
              </Text>
            </View>
            <View className="mb-3">
              <Toggle label="Ativos apenas" value={showActiveOnly} onToggle={setShowActiveOnly} />
            </View>
            <PaginationControls
              page={usersPagination.page}
              limit={usersPagination.limit}
              total={usersPagination.total}
              loading={usersQuery.isFetching}
              onPageChange={setUsersPage}
            />
            {usersQuery.isLoading ? (
              <ActivityIndicator />
            ) : (
              <View className="gap-2">
                {visibleUsers.map((user) => (
                  <View key={user.id} className="border border-border rounded-xl p-3">
                    <View className="flex-row items-center justify-between gap-4">
                      <View className="flex-1">
                        <Text className="text-foreground font-semibold">
                          {user.id} - {user.nickname}
                        </Text>
                        <Text className="text-xs text-muted">{user.email || "no email"}</Text>
                        <Text className="text-xs text-muted mt-1">
                          XP {user.xpTotal} | Denarios {user.denarioBalance}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          Ultimo login: {formatShortDate(user.lastSignedIn)}
                        </Text>
                      </View>
                      <View className="items-end gap-2">
                        <View
                          className={`px-2 py-1 rounded-full ${
                            user.isActive ? "bg-success/20" : "bg-border"
                          }`}
                        >
                          <Text className={user.isActive ? "text-success text-xs" : "text-muted text-xs"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap gap-2 justify-end">
                          {USER_ROLES.map((role) => {
                            const isActive = user.role === role;
                            return (
                              <TouchableOpacity
                                key={`${user.id}-${role}`}
                                className={`px-3 py-1 rounded-full border ${
                                  isActive ? "bg-primary border-primary" : "bg-surface border-border"
                                }`}
                                onPress={() => userRoleUpdate.mutateAsync({ userId: user.id, role })}
                                disabled={userRoleUpdate.isPending}
                              >
                                <Text
                                  className={
                                    isActive ? "text-white text-xs font-semibold" : "text-foreground text-xs"
                                  }
                                >
                                  {role}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="mb-4">
              <Text className="text-lg font-bold text-foreground">Shop Items</Text>
              <Text className="text-xs text-muted">
                Create item patches (free or paid) to compose avatars.
              </Text>
            </View>
            <PaginationControls
              page={shopPagination.page}
              limit={shopPagination.limit}
              total={shopPagination.total}
              loading={shopItemsQuery.isFetching}
              onPageChange={setShopPage}
            />
            <View className={isWide ? "flex-row gap-4" : "gap-4"}>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Item details</Text>
                <View className="gap-3">
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Name"
                    value={shopForm.name}
                    onChangeText={(value) => setShopForm((prev) => ({ ...prev, name: value }))}
                  />
                  <View className="gap-2">
                    <Text className="text-xs text-muted">Type</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {SHOP_ITEM_TYPES.map((type) => {
                        const isActive = shopForm.type === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            className={`px-3 py-2 rounded-lg border ${
                              isActive ? "bg-primary border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() => setShopForm((prev) => ({ ...prev, type }))}
                          >
                            <Text className={isActive ? "text-white font-semibold" : "text-foreground"}>
                              {SHOP_ITEM_TYPE_LABELS[type]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View className="gap-2">
                    <Text className="text-xs text-muted">Raridade</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(Object.keys(SHOP_RARITY_RULES) as ShopRarity[]).map((rarity) => {
                        const isActive = shopForm.rarity === rarity;
                        const rule = SHOP_RARITY_RULES[rarity];
                        return (
                          <TouchableOpacity
                            key={rarity}
                            className={`px-3 py-2 rounded-lg border ${
                              isActive ? "bg-primary border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() =>
                              setShopForm((prev) => ({
                                ...prev,
                                rarity,
                                priceDenario: `${applyRarityDefaultPrice(rarity, toInt(prev.priceDenario, 0))}`,
                              }))
                            }
                          >
                            <Text className={isActive ? "text-white font-semibold" : "text-foreground"}>
                              {rule.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text className="text-xs text-muted">
                      Preco sugerido: {SHOP_RARITY_RULES[shopForm.rarity as ShopRarity]?.defaultPrice ?? 0} denarios
                      {" | "}Nivel minimo: {SHOP_RARITY_RULES[shopForm.rarity as ShopRarity]?.minLevel ?? 1}
                      {" | "}Medalhas: {SHOP_RARITY_RULES[shopForm.rarity as ShopRarity]?.medalsRequired ?? 0}
                    </Text>
                  </View>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Price Denario"
                    value={shopForm.priceDenario}
                    onChangeText={(value) => setShopForm((prev) => ({ ...prev, priceDenario: value }))}
                  />
                  <Text className="text-xs text-muted">
                    Preco 0 aplica o valor sugerido pela raridade.
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Image URL"
                    value={shopForm.imageUrl}
                    onChangeText={(value) => setShopForm((prev) => ({ ...prev, imageUrl: value }))}
                  />
                  <View className="bg-background border border-border rounded-lg p-3 gap-3">
                    <Text className="text-sm font-semibold text-foreground">Avatar options</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {AVATAR_OPTION_GROUPS.map((group) => {
                        const isActive = selectedAvatarGroup?.key === group.key;
                        return (
                          <TouchableOpacity
                            key={group.key}
                            className={`px-3 py-2 rounded-full border ${
                              isActive ? "bg-primary border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() => setSelectedAvatarGroupKey(group.key)}
                          >
                            <Text
                              className={
                                isActive ? "text-white text-xs font-semibold" : "text-foreground text-xs"
                              }
                            >
                              {group.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {selectedAvatarGroup?.note ? (
                      <Text className="text-xs text-muted">{selectedAvatarGroup.note}</Text>
                    ) : null}
                  <View className="flex-row flex-wrap gap-2">
                    {(selectedAvatarGroup?.values || []).map((value) => {
                      const activeGroupKey = selectedAvatarGroup?.key;
                      const isSelected = activeGroupKey
                        ? shopAvatarPatch?.[activeGroupKey] === value
                        : false;
                      return (
                        <TouchableOpacity
                            key={value}
                            className={`px-3 py-2 rounded-lg border ${
                              isSelected ? "bg-primary/10 border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() => selectedAvatarGroup && applyAvatarOption(selectedAvatarGroup, value)}
                          >
                            <View className="flex-row items-center gap-2">
                              {selectedAvatarGroup?.kind === "color" ? (
                                <View
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    backgroundColor: value,
                                    borderWidth: 1,
                                    borderColor: "#e2e8f0",
                                  }}
                                />
                              ) : null}
                              <Text className="text-xs text-foreground">{value}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {selectedAvatarGroup?.kind === "color" && (
                        <TouchableOpacity
                          className="px-3 py-2 rounded-lg border bg-surface border-border flex-row items-center gap-2"
                          onPress={() =>
                            openColorPicker(
                              selectedAvatarGroup,
                              shopAvatarPatch?.[selectedAvatarGroup.key] as string | undefined,
                            )
                          }
                        >
                          <Text className="text-xs text-foreground">Cor personalizada</Text>
                          <View
                            className="w-4 h-4 rounded-full border border-border"
                            style={{
                              backgroundColor: shopAvatarPatch?.[selectedAvatarGroup.key] || "#FFFFFF",
                            }}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    {selectedAvatarGroup && !selectedAvatarGroup.type ? (
                      <Text className="text-xs text-muted">
                        Esse atributo eh do avatar base. Escolha o type manualmente.
                      </Text>
                    ) : null}
                  </View>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Avatar patch (JSON)"
                    value={shopForm.avatarConfig}
                    onChangeText={(value) => setShopForm((prev) => ({ ...prev, avatarConfig: value }))}
                    multiline
                    numberOfLines={3}
                  />
                  <View className="bg-background border border-border rounded-lg p-3 gap-3">
                    <Text className="text-sm font-semibold text-foreground">Avatar preview</Text>
                    <View className="items-center justify-center">
                      {shopPreviewConfig ? (
                        <NiceAvatar config={shopPreviewConfig} size={96} />
                      ) : (
                        <View
                          style={{
                            width: 96,
                            height: 96,
                            borderRadius: 48,
                            backgroundColor: "#e2e8f0",
                          }}
                        />
                      )}
                    </View>
                    {shopAvatarConfigResult.error ? (
                      <Text className="text-error text-xs">{shopAvatarConfigResult.error}</Text>
                    ) : null}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="bg-secondary px-3 py-2 rounded-lg"
                        onPress={() => {
                          const config = genNiceAvatarConfig();
                          setShopForm((prev) => ({ ...prev, avatarConfig: JSON.stringify(config) }));
                        }}
                      >
                        <Text className="text-primary font-semibold">Generate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-border px-3 py-2 rounded-lg"
                        onPress={() => setShopForm((prev) => ({ ...prev, avatarConfig: "" }))}
                      >
                        <Text className="text-foreground">Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Description"
                    value={shopForm.description}
                    onChangeText={(value) => setShopForm((prev) => ({ ...prev, description: value }))}
                  />
                  <Toggle
                    label="Available"
                    value={shopForm.isAvailable}
                    onToggle={(value) => setShopForm((prev) => ({ ...prev, isAvailable: value }))}
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-lg"
                      onPress={async () => {
                        const payload = {
                          name: shopForm.name,
                          type: shopForm.type as "BACKGROUND" | "CLOTHES" | "ACCESSORY",
                          rarity: shopForm.rarity as "COMMON" | "RARE" | "EPIC",
                          priceDenario: toInt(shopForm.priceDenario, 0),
                          imageUrl: shopForm.imageUrl.trim() || null,
                          avatarConfig: shopForm.avatarConfig.trim() || null,
                          description: shopForm.description.trim() || null,
                          isAvailable: shopForm.isAvailable,
                        };
                        if (shopEditingId) {
                          await shopUpdate.mutateAsync({ id: shopEditingId, ...payload });
                        } else {
                          await shopCreate.mutateAsync(payload);
                        }
                        resetShopForm();
                      }}
                      disabled={shopCreate.isPending || shopUpdate.isPending}
                    >
                      <Text className="text-white font-semibold">
                        {shopEditingId ? "Save" : "Create"}
                      </Text>
                    </TouchableOpacity>
                    {shopEditingId && (
                      <TouchableOpacity
                        className="bg-border px-4 py-2 rounded-lg"
                        onPress={resetShopForm}
                      >
                        <Text className="text-foreground">Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Existing items</Text>
                {shopItemsQuery.isLoading ? (
                  <ActivityIndicator />
                ) : (
                  shopItems.map((item) => (
                    <View key={item.id} className="border border-border rounded-xl p-3 mb-2">
                      <Text className="text-foreground font-semibold">
                        {item.name}
                      </Text>
                      {parseAvatarConfig(item.avatarConfig) ? (
                        <View className="mt-2">
                          <NiceAvatar
                            config={parseAvatarConfig(item.avatarConfig) ?? undefined}
                            size={72}
                          />
                        </View>
                      ) : null}
                      <Text className="text-muted text-xs">
                        {item.type} | {item.rarity} | {item.priceDenario} denarios | available:{" "}
                        {item.isAvailable ? "yes" : "no"}
                      </Text>
                      <View className="flex-row gap-2 mt-2">
                        <TouchableOpacity
                          className="bg-secondary px-3 py-1 rounded-lg"
                          onPress={() => {
                            setShopEditingId(item.id);
                            setShopForm({
                              name: item.name,
                              type: item.type,
                              rarity: item.rarity,
                              priceDenario: `${item.priceDenario}`,
                              imageUrl: item.imageUrl || "",
                              avatarConfig: item.avatarConfig || "",
                              description: item.description || "",
                              isAvailable: item.isAvailable,
                            });
                          }}
                        >
                          <Text className="text-primary font-semibold">Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="bg-error px-3 py-1 rounded-lg"
                          onPress={async () => {
                            const ok = await confirmAction(`Delete item ${item.name}?`);
                            if (ok) {
                              await shopDelete.mutateAsync({ id: item.id });
                            }
                          }}
                        >
                          <Text className="text-white font-semibold">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="mb-4">
              <Text className="text-lg font-bold text-foreground">Groups</Text>
              <Text className="text-xs text-muted">Manage groups and assign leaders.</Text>
            </View>
            <PaginationControls
              page={groupsPagination.page}
              limit={groupsPagination.limit}
              total={groupsPagination.total}
              loading={groupsQuery.isFetching}
              onPageChange={setGroupsPage}
            />
            <View className={isWide ? "flex-row gap-4" : "gap-4"}>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Group details</Text>
                <View className="gap-3">
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Group name"
                    value={groupForm.name}
                    onChangeText={(value) => setGroupForm((prev) => ({ ...prev, name: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Description"
                    value={groupForm.description}
                    onChangeText={(value) => setGroupForm((prev) => ({ ...prev, description: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Leader ID (select below)"
                    value={groupForm.leaderId}
                    onChangeText={(value) => setGroupForm((prev) => ({ ...prev, leaderId: value }))}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {leaderCandidates.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          className="bg-secondary/30 px-3 py-2 rounded-full"
                          onPress={() =>
                            setGroupForm((prev) => ({ ...prev, leaderId: `${user.id}` }))
                          }
                        >
                          <Text className="text-primary text-xs font-semibold">
                            {user.nickname}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {leaderCandidates.length === 0 && (
                        <Text className="text-xs text-muted">No users loaded.</Text>
                      )}
                    </View>
                  </ScrollView>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-lg"
                      onPress={async () => {
                        const payload = {
                          name: groupForm.name,
                          description: groupForm.description.trim() || null,
                          leaderId: toInt(groupForm.leaderId, 0),
                        };
                        if (groupEditingId) {
                          await groupUpdate.mutateAsync({ id: groupEditingId, ...payload });
                        } else {
                          await groupCreate.mutateAsync(payload);
                        }
                        resetGroupForm();
                      }}
                      disabled={groupCreate.isPending || groupUpdate.isPending}
                    >
                      <Text className="text-white font-semibold">
                        {groupEditingId ? "Save" : "Create"}
                      </Text>
                    </TouchableOpacity>
                    {groupEditingId && (
                      <TouchableOpacity className="bg-border px-4 py-2 rounded-lg" onPress={resetGroupForm}>
                        <Text className="text-foreground">Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Existing groups</Text>
                {groupsList.map((group) => (
                  <View key={group.id} className="border border-border rounded-xl p-3 mb-2">
                    <Text className="text-foreground font-semibold">
                      {group.name}
                    </Text>
                    <Text className="text-muted text-xs">
                      Leader: {group.leaderName} | Members: {group.memberCount} | Points: {group.totalPoints}
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        className="bg-secondary px-3 py-1 rounded-lg"
                        onPress={() => {
                          setGroupEditingId(group.id);
                          setGroupForm({
                            name: group.name,
                            description: group.description || "",
                            leaderId: `${group.leaderId}`,
                          });
                        }}
                      >
                        <Text className="text-primary font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-error px-3 py-1 rounded-lg"
                        onPress={async () => {
                          const ok = await confirmAction(`Delete group ${group.name}?`);
                          if (ok) {
                            await groupDelete.mutateAsync({ id: group.id });
                          }
                        }}
                      >
                        <Text className="text-white font-semibold">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="mb-3">
              <Text className="text-lg font-bold text-foreground">Group Requests</Text>
              <Text className="text-xs text-muted">Approve or reject pending members.</Text>
            </View>
            <PaginationControls
              page={groupRequestsPagination.page}
              limit={groupRequestsPagination.limit}
              total={groupRequestsPagination.total}
              loading={groupRequestsQuery.isFetching}
              onPageChange={setGroupRequestsPage}
            />
            {groupRequests.map((request) => (
              <View key={request.requestId} className="border border-border rounded-xl p-3 mb-2">
                <Text className="text-foreground font-semibold">
                  {request.userNickname || "User"}{" -> "}{request.groupName}
                </Text>
                <Text className="text-muted text-xs">Requested at: {String(request.requestedAt)}</Text>
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    className="bg-success px-3 py-1 rounded-lg"
                    onPress={() => requestApprove.mutateAsync({ requestId: request.requestId })}
                  >
                    <Text className="text-white font-semibold">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-error px-3 py-1 rounded-lg"
                    onPress={() => requestReject.mutateAsync({ requestId: request.requestId })}
                  >
                    <Text className="text-white font-semibold">Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {groupRequests.length === 0 && (
              <View className="border border-border rounded-xl p-3">
                <Text className="text-muted">No pending requests.</Text>
              </View>
            )}
          </View>
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="mb-4">
              <Text className="text-lg font-bold text-foreground">Devotional Plans</Text>
              <Text className="text-xs text-muted">Create and manage plan cycles.</Text>
            </View>
            <PaginationControls
              page={plansPagination.page}
              limit={plansPagination.limit}
              total={plansPagination.total}
              loading={plansQuery.isFetching}
              onPageChange={setPlansPage}
            />
            <View className={isWide ? "flex-row gap-4" : "gap-4"}>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Plan details</Text>
                <View className="gap-3">
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Plan name"
                    value={planForm.name}
                    onChangeText={(value) => setPlanForm((prev) => ({ ...prev, name: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Year"
                    value={planForm.year}
                    onChangeText={(value) => setPlanForm((prev) => ({ ...prev, year: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Description"
                    value={planForm.description}
                    onChangeText={(value) => setPlanForm((prev) => ({ ...prev, description: value }))}
                  />
                  <Toggle
                    label="Active"
                    value={planForm.isActive}
                    onToggle={(value) => setPlanForm((prev) => ({ ...prev, isActive: value }))}
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-lg"
                      onPress={async () => {
                        const payload = {
                          name: planForm.name,
                          year: toInt(planForm.year, new Date().getFullYear()),
                          description: planForm.description.trim() || null,
                          isActive: planForm.isActive,
                        };
                        if (planEditingId) {
                          await planUpdate.mutateAsync({ id: planEditingId, ...payload });
                        } else {
                          await planCreate.mutateAsync(payload);
                        }
                        resetPlanForm();
                      }}
                      disabled={planCreate.isPending || planUpdate.isPending}
                    >
                      <Text className="text-white font-semibold">
                        {planEditingId ? "Save" : "Create"}
                      </Text>
                    </TouchableOpacity>
                    {planEditingId && (
                      <TouchableOpacity className="bg-border px-4 py-2 rounded-lg" onPress={resetPlanForm}>
                        <Text className="text-foreground">Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Existing plans</Text>
                {planList.map((plan) => (
                  <View key={plan.id} className="border border-border rounded-xl p-3 mb-2">
                    <Text className="text-foreground font-semibold">
                      {plan.name} ({plan.year})
                    </Text>
                    <Text className="text-muted text-xs">Active: {plan.isActive ? "yes" : "no"}</Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        className="bg-secondary px-3 py-1 rounded-lg"
                        onPress={() => {
                          setPlanEditingId(plan.id);
                          setPlanForm({
                            name: plan.name,
                            year: `${plan.year}`,
                            description: plan.description || "",
                            isActive: plan.isActive,
                          });
                        }}
                      >
                        <Text className="text-primary font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-error px-3 py-1 rounded-lg"
                        onPress={async () => {
                          const ok = await confirmAction(`Delete plan ${plan.name}?`);
                          if (ok) {
                            await planDelete.mutateAsync({ id: plan.id });
                          }
                        }}
                      >
                        <Text className="text-white font-semibold">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="mb-4">
              <Text className="text-lg font-bold text-foreground">Devotional Days</Text>
              <Text className="text-xs text-muted">Create entries tied to a plan and date.</Text>
            </View>
            <PaginationControls
              page={daysPagination.page}
              limit={daysPagination.limit}
              total={daysPagination.total}
              loading={daysQuery.isFetching}
              onPageChange={setDaysPage}
            />
            <View className={isWide ? "flex-row gap-4" : "gap-4"}>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Day details</Text>
                <View className="gap-3">
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Plan ID (select below)"
                    value={dayForm.planId}
                    onChangeText={(value) => setDayForm((prev) => ({ ...prev, planId: value }))}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {planOptions.map((plan) => (
                        <TouchableOpacity
                          key={plan.id}
                          className="bg-secondary/30 px-3 py-2 rounded-full"
                          onPress={() =>
                            setDayForm((prev) => ({ ...prev, planId: `${plan.id}` }))
                          }
                        >
                          <Text className="text-primary text-xs font-semibold">
                            {plan.name} ({plan.year})
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {planOptions.length === 0 && (
                        <Text className="text-xs text-muted">No plans yet.</Text>
                      )}
                    </View>
                  </ScrollView>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Day number"
                    value={dayForm.dayNumber}
                    onChangeText={(value) => setDayForm((prev) => ({ ...prev, dayNumber: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Date (YYYY-MM-DD)"
                    value={dayForm.date}
                    onChangeText={(value) =>
                      setDayForm((prev) => ({ ...prev, date: formatDateInput(value) }))
                    }
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Bible reference"
                    value={dayForm.bibleReference}
                    onChangeText={(value) => setDayForm((prev) => ({ ...prev, bibleReference: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Devotional text"
                    value={dayForm.devotionalText}
                    onChangeText={(value) => setDayForm((prev) => ({ ...prev, devotionalText: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Reflection question"
                    value={dayForm.reflectionQuestion}
                    onChangeText={(value) => setDayForm((prev) => ({ ...prev, reflectionQuestion: value }))}
                  />
                  <View className="bg-background/60 border border-border rounded-lg p-3 gap-3">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm font-semibold text-foreground">
                          Challenges do dia
                        </Text>
                        {dayEditingId && (
                          <Text className="text-xs text-muted">
                            Edite ou adicione challenges e salve tudo junto.
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        className="bg-secondary px-3 py-1 rounded-full"
                        onPress={addDayChallenge}
                      >
                        <Text className="text-primary text-xs font-semibold">Adicionar</Text>
                      </TouchableOpacity>
                    </View>
                    {dayChallenges.length === 0 ? (
                      <Text className="text-xs text-muted">
                        Adicione challenges para criar junto com o devotional day.
                      </Text>
                    ) : (
                      <View className="gap-3">
                        {dayChallenges.map((challenge, index) => (
                          <View key={`day-challenge-${index}`} className="border border-border rounded-lg p-3 gap-2">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-xs text-muted">Challenge #{index + 1}</Text>
                              <TouchableOpacity
                                className="bg-border px-2 py-1 rounded-full"
                                onPress={() => removeDayChallenge(index)}
                              >
                                <Text className="text-xs text-foreground">Remover</Text>
                              </TouchableOpacity>
                            </View>
                            <View className="gap-2">
                              <Text className="text-xs text-muted">Tipo</Text>
                              <View className="flex-row flex-wrap gap-2">
                                {CHALLENGE_TYPES.map((type) => {
                                  const isActive = challenge.type === type.value;
                                  return (
                                    <TouchableOpacity
                                      key={`${index}-${type.value}`}
                                      className={`px-3 py-1 rounded-full border ${
                                        isActive ? "bg-primary border-primary" : "bg-surface border-border"
                                      }`}
                                      onPress={() => updateDayChallenge(index, { type: type.value })}
                                    >
                                      <Text
                                        className={
                                          isActive ? "text-white text-xs font-semibold" : "text-foreground text-xs"
                                        }
                                      >
                                        {type.label}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                            <TextInput
                              className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                              placeholder="Titulo"
                              value={challenge.title}
                              onChangeText={(value) => updateDayChallenge(index, { title: value })}
                            />
                            <TextInput
                              className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                              placeholder="Descricao"
                              value={challenge.description}
                              onChangeText={(value) => updateDayChallenge(index, { description: value })}
                            />
                            <View className="flex-row gap-2">
                              <TextInput
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                                placeholder="XP"
                                value={challenge.baseXp}
                                onChangeText={(value) => updateDayChallenge(index, { baseXp: value })}
                              />
                              <TextInput
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                                placeholder="Denario"
                                value={challenge.baseDenario}
                                onChangeText={(value) => updateDayChallenge(index, { baseDenario: value })}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-lg"
                      onPress={async () => {
                        const payload = {
                          planId: toInt(dayForm.planId, 0),
                          dayNumber: toInt(dayForm.dayNumber, 1),
                          date: dayForm.date,
                          bibleReference: dayForm.bibleReference,
                          devotionalText: dayForm.devotionalText.trim() || null,
                          reflectionQuestion: dayForm.reflectionQuestion.trim() || null,
                        };
                        if (!payload.planId || !payload.dayNumber || !payload.date) {
                          Alert.alert("Devotional Day", "Preencha planId, dayNumber e data.");
                          return;
                        }
                        const missingTitles = dayChallenges.filter(
                          (challenge) => challenge.title.trim().length === 0
                        );
                        if (missingTitles.length > 0) {
                          Alert.alert("Challenges", "Preencha o titulo de todos os challenges.");
                          return;
                        }
                        let dayId = dayEditingId;
                        if (dayEditingId) {
                          await dayUpdate.mutateAsync({ id: dayEditingId, ...payload });
                        } else {
                          const created = await dayCreate.mutateAsync(payload);
                          dayId = created?.id ?? null;
                          if (!dayId) {
                            const refreshed = await daysQuery.refetch();
                            const match = refreshed.data?.find(
                              (day) =>
                                day.planId === payload.planId &&
                                day.dayNumber === payload.dayNumber &&
                                String(day.date) === String(payload.date)
                            );
                            dayId = match?.id ?? null;
                          }
                          if (!dayId) {
                            Alert.alert(
                              "Devotional Day",
                              "Nao foi possivel obter o ID do day para salvar os challenges."
                            );
                            return;
                          }
                        }

                        const entries = dayChallenges.filter((challenge) =>
                          challenge.title.trim().length > 0
                        );
                        if (dayId) {
                          const usedIds = new Set<number>();
                          for (const challenge of entries) {
                            const challengePayload = {
                              devotionalDayId: dayId,
                              type: challenge.type,
                              title: challenge.title,
                              description: challenge.description.trim() || null,
                              baseXp: toInt(challenge.baseXp, 10),
                              baseDenario: toInt(challenge.baseDenario, 5),
                            };
                            if (challenge.id) {
                              await challengeUpdate.mutateAsync({
                                id: challenge.id,
                                ...challengePayload,
                              });
                              usedIds.add(challenge.id);
                            } else {
                              await challengeCreate.mutateAsync(challengePayload);
                            }
                          }

                          if (dayEditingId) {
                            const toDelete = dayChallengeOriginalIds.filter(
                              (id) => !usedIds.has(id)
                            );
                            for (const id of toDelete) {
                              await challengeDelete.mutateAsync({ id });
                            }
                          }
                        }
                        resetDayForm();
                      }}
                      disabled={dayCreate.isPending || dayUpdate.isPending}
                    >
                      <Text className="text-white font-semibold">
                        {dayEditingId ? "Save" : "Create"}
                      </Text>
                    </TouchableOpacity>
                    {dayEditingId && (
                      <TouchableOpacity className="bg-border px-4 py-2 rounded-lg" onPress={resetDayForm}>
                        <Text className="text-foreground">Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Existing days</Text>
                {daysList.map((day) => (
                  <View key={day.id} className="border border-border rounded-xl p-3 mb-2">
                    <Text className="text-foreground font-semibold">
                      Plan {day.planId} Day {day.dayNumber}
                    </Text>
                    <Text className="text-muted text-xs">
                      {day.date} | {day.bibleReference}
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        className="bg-secondary px-3 py-1 rounded-lg"
                        onPress={() => {
                          const dayChallengesForEdit = challengesList
                            .filter((challenge) => challenge.devotionalDayId === day.id)
                            .map((challenge) => ({
                              id: challenge.id,
                              type: challenge.type as ChallengeType,
                              title: challenge.title,
                              description: challenge.description || "",
                              baseXp: `${challenge.baseXp}`,
                              baseDenario: `${challenge.baseDenario}`,
                            }));
                          setDayEditingId(day.id);
                          setDayForm({
                            planId: `${day.planId}`,
                            dayNumber: `${day.dayNumber}`,
                            date: formatDateInput(String(day.date)),
                            bibleReference: day.bibleReference,
                            devotionalText: day.devotionalText || "",
                            reflectionQuestion: day.reflectionQuestion || "",
                          });
                          setDayChallenges(dayChallengesForEdit);
                          setDayChallengeOriginalIds(
                            dayChallengesForEdit
                              .map((challenge) => challenge.id)
                              .filter((id): id is number => typeof id === "number")
                          );
                        }}
                      >
                        <Text className="text-primary font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-error px-3 py-1 rounded-lg"
                        onPress={async () => {
                          const ok = await confirmAction(`Delete devotional day ${day.id}?`);
                          if (ok) {
                            await dayDelete.mutateAsync({ id: day.id });
                          }
                        }}
                      >
                        <Text className="text-white font-semibold">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="mb-4">
              <Text className="text-lg font-bold text-foreground">Challenges</Text>
              <Text className="text-xs text-muted">Attach challenges to a devotional day.</Text>
            </View>
            <PaginationControls
              page={challengesPagination.page}
              limit={challengesPagination.limit}
              total={challengesPagination.total}
              loading={challengesQuery.isFetching}
              onPageChange={setChallengesPage}
            />
            <View className={isWide ? "flex-row gap-4" : "gap-4"}>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Challenge details</Text>
                <View className="gap-3">
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Devotional Day ID (select below)"
                    value={challengeForm.devotionalDayId}
                    onChangeText={(value) => setChallengeForm((prev) => ({ ...prev, devotionalDayId: value }))}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {dayOptions.map((day) => (
                        <TouchableOpacity
                          key={day.id}
                          className="bg-secondary/30 px-3 py-2 rounded-full"
                          onPress={() =>
                            setChallengeForm((prev) => ({ ...prev, devotionalDayId: `${day.id}` }))
                          }
                        >
                          <Text className="text-primary text-xs font-semibold">
                            Plan {day.planId} Day {day.dayNumber}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {dayOptions.length === 0 && (
                        <Text className="text-xs text-muted">No devotional days yet.</Text>
                      )}
                    </View>
                  </ScrollView>
                  <View className="gap-2">
                    <Text className="text-xs text-muted">Tipo</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {CHALLENGE_TYPES.map((type) => {
                        const isActive = challengeForm.type === type.value;
                        return (
                          <TouchableOpacity
                            key={`challenge-type-${type.value}`}
                            className={`px-3 py-2 rounded-full border ${
                              isActive ? "bg-primary border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() => setChallengeForm((prev) => ({ ...prev, type: type.value }))}
                          >
                            <Text className={isActive ? "text-white text-xs font-semibold" : "text-foreground text-xs"}>
                              {type.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Title"
                    value={challengeForm.title}
                    onChangeText={(value) => setChallengeForm((prev) => ({ ...prev, title: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Description"
                    value={challengeForm.description}
                    onChangeText={(value) => setChallengeForm((prev) => ({ ...prev, description: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Base XP"
                    value={challengeForm.baseXp}
                    onChangeText={(value) => setChallengeForm((prev) => ({ ...prev, baseXp: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Base Denario"
                    value={challengeForm.baseDenario}
                    onChangeText={(value) => setChallengeForm((prev) => ({ ...prev, baseDenario: value }))}
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-lg"
                      onPress={async () => {
                        const payload = {
                          devotionalDayId: toInt(challengeForm.devotionalDayId, 0),
                          type: challengeForm.type as "READING" | "DEVOTIONAL" | "REFLECTION" | "EXTRA",
                          title: challengeForm.title,
                          description: challengeForm.description.trim() || null,
                          baseXp: toInt(challengeForm.baseXp, 10),
                          baseDenario: toInt(challengeForm.baseDenario, 5),
                        };
                        if (challengeEditingId) {
                          await challengeUpdate.mutateAsync({ id: challengeEditingId, ...payload });
                        } else {
                          await challengeCreate.mutateAsync(payload);
                        }
                        resetChallengeForm();
                      }}
                      disabled={challengeCreate.isPending || challengeUpdate.isPending}
                    >
                      <Text className="text-white font-semibold">
                        {challengeEditingId ? "Save" : "Create"}
                      </Text>
                    </TouchableOpacity>
                    {challengeEditingId && (
                      <TouchableOpacity className="bg-border px-4 py-2 rounded-lg" onPress={resetChallengeForm}>
                        <Text className="text-foreground">Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Existing challenges</Text>
                {challengesList.map((challenge) => (
                  <View key={challenge.id} className="border border-border rounded-xl p-3 mb-2">
                    <Text className="text-foreground font-semibold">
                      Day {challenge.devotionalDayId} | {challenge.type}
                    </Text>
                    <Text className="text-muted text-xs">{challenge.title}</Text>
                    <Text className="text-muted text-xs">
                      XP: {challenge.baseXp} | Denario: {challenge.baseDenario}
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        className="bg-secondary px-3 py-1 rounded-lg"
                        onPress={() => {
                          setChallengeEditingId(challenge.id);
                          setChallengeForm({
                            devotionalDayId: `${challenge.devotionalDayId}`,
                            type: challenge.type,
                            title: challenge.title,
                            description: challenge.description || "",
                            baseXp: `${challenge.baseXp}`,
                            baseDenario: `${challenge.baseDenario}`,
                          });
                        }}
                      >
                        <Text className="text-primary font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-error px-3 py-1 rounded-lg"
                        onPress={async () => {
                          const ok = await confirmAction(`Delete challenge ${challenge.title}?`);
                          if (ok) {
                            await challengeDelete.mutateAsync({ id: challenge.id });
                          }
                        }}
                      >
                        <Text className="text-white font-semibold">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="mb-4">
              <Text className="text-lg font-bold text-foreground">Medals</Text>
              <Text className="text-xs text-muted">Define achievement medals and ordering.</Text>
            </View>
            <PaginationControls
              page={medalsPagination.page}
              limit={medalsPagination.limit}
              total={medalsPagination.total}
              loading={medalsQuery.isFetching}
              onPageChange={setMedalsPage}
            />
            <View className={isWide ? "flex-row gap-4" : "gap-4"}>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Medal details</Text>
                <View className="gap-3">
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Name"
                    value={medalForm.name}
                    onChangeText={(value) => setMedalForm((prev) => ({ ...prev, name: value }))}
                  />
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Description"
                    value={medalForm.description}
                    onChangeText={(value) => setMedalForm((prev) => ({ ...prev, description: value }))}
                  />
                  <View className="gap-2">
                    <Text className="text-xs text-muted">Categoria</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {MEDAL_CATEGORIES.map((category) => {
                        const isActive = medalForm.category === category.value;
                        return (
                          <TouchableOpacity
                            key={`medal-category-${category.value}`}
                            className={`px-3 py-1 rounded-full border ${
                              isActive ? "bg-primary border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() => setMedalForm((prev) => ({ ...prev, category: category.value }))}
                          >
                            <Text
                              className={
                                isActive ? "text-white text-xs font-semibold" : "text-foreground text-xs"
                              }
                            >
                              {category.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View className="gap-2">
                    <Text className="text-xs text-muted">Icon</Text>
                    <View className="flex-row gap-2">
                      {(["emoji", "image"] as MedalIconType[]).map((value) => {
                        const isActive = medalForm.iconType === value;
                        return (
                          <TouchableOpacity
                            key={`medal-icon-${value}`}
                            className={`px-3 py-1 rounded-full border ${
                              isActive ? "bg-primary border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() => setMedalForm((prev) => ({ ...prev, iconType: value }))}
                          >
                            <Text
                              className={
                                isActive ? "text-white text-xs font-semibold" : "text-foreground text-xs"
                              }
                            >
                              {value === "emoji" ? "Emoji" : "Imagem"}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {medalForm.iconType === "emoji" ? (
                      <View className="gap-2">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View className="flex-row gap-2">
                            {MEDAL_EMOJI_OPTIONS.map((emoji) => {
                              const isActive = medalForm.iconEmoji === emoji;
                              return (
                                <TouchableOpacity
                                  key={`medal-emoji-${emoji}`}
                                  className={`w-10 h-10 rounded-full items-center justify-center border ${
                                    isActive ? "bg-primary border-primary" : "bg-surface border-border"
                                  }`}
                                  onPress={() => setMedalForm((prev) => ({ ...prev, iconEmoji: emoji }))}
                                >
                                  <Text className={isActive ? "text-white text-lg" : "text-foreground text-lg"}>
                                    {emoji}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                        <TextInput
                          className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                          placeholder="Emoji custom"
                          value={medalForm.iconEmoji}
                          onChangeText={(value) => setMedalForm((prev) => ({ ...prev, iconEmoji: value }))}
                        />
                      </View>
                    ) : (
                      <View className="gap-2">
                        <TextInput
                          className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                          placeholder="Icon URL (color)"
                          value={medalForm.iconUrl}
                          onChangeText={(value) => setMedalForm((prev) => ({ ...prev, iconUrl: value }))}
                        />
                        <TextInput
                          className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                          placeholder="Icon URL (gray)"
                          value={medalForm.iconUrlGray}
                          onChangeText={(value) => setMedalForm((prev) => ({ ...prev, iconUrlGray: value }))}
                        />
                      </View>
                    )}
                  </View>
                  <View className="gap-2">
                    <Text className="text-xs text-muted">Requisito</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {MEDAL_REQUIREMENT_OPTIONS.map((option) => {
                        const isActive = medalForm.requirementType === option.value;
                        return (
                          <TouchableOpacity
                            key={`medal-requirement-${option.value}`}
                            className={`px-3 py-1 rounded-full border ${
                              isActive ? "bg-primary border-primary" : "bg-surface border-border"
                            }`}
                            onPress={() =>
                              setMedalForm((prev) => ({ ...prev, requirementType: option.value }))
                            }
                          >
                            <Text
                              className={
                                isActive ? "text-white text-xs font-semibold" : "text-foreground text-xs"
                              }
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {medalForm.requirementType === "streak" && (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Dias de streak"
                        value={medalForm.requirementDays}
                        onChangeText={(value) =>
                          setMedalForm((prev) => ({ ...prev, requirementDays: value }))
                        }
                      />
                    )}
                    {(medalForm.requirementType === "total_devotionals" ||
                      medalForm.requirementType === "total_reflections") && (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Quantidade"
                        value={medalForm.requirementCount}
                        onChangeText={(value) =>
                          setMedalForm((prev) => ({ ...prev, requirementCount: value }))
                        }
                      />
                    )}
                    {medalForm.requirementType === "challenge_type_count" && (
                      <View className="gap-2">
                        <Text className="text-xs text-muted">Tipo de challenge</Text>
                        <View className="flex-row flex-wrap gap-2">
                          {CHALLENGE_TYPES.map((type) => {
                            const isActive = medalForm.requirementChallengeType === type.value;
                            return (
                              <TouchableOpacity
                                key={`medal-challenge-${type.value}`}
                                className={`px-3 py-1 rounded-full border ${
                                  isActive ? "bg-primary border-primary" : "bg-surface border-border"
                                }`}
                                onPress={() =>
                                  setMedalForm((prev) => ({
                                    ...prev,
                                    requirementChallengeType: type.value,
                                  }))
                                }
                              >
                                <Text
                                  className={
                                    isActive
                                      ? "text-white text-xs font-semibold"
                                      : "text-foreground text-xs"
                                  }
                                >
                                  {type.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <TextInput
                          className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                          placeholder="Quantidade"
                          value={medalForm.requirementCount}
                          onChangeText={(value) =>
                            setMedalForm((prev) => ({ ...prev, requirementCount: value }))
                          }
                        />
                      </View>
                    )}
                    {medalForm.requirementType === "multiple_books" && (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Livros (separados por virgula)"
                        value={medalForm.requirementBooks}
                        onChangeText={(value) =>
                          setMedalForm((prev) => ({ ...prev, requirementBooks: value }))
                        }
                      />
                    )}
                    {medalForm.requirementType === "book" && (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Nome do livro"
                        value={medalForm.requirementBookName}
                        onChangeText={(value) =>
                          setMedalForm((prev) => ({ ...prev, requirementBookName: value }))
                        }
                      />
                    )}
                    {(medalForm.requirementType === "early_bird" ||
                      medalForm.requirementType === "night_owl") && (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Hora (0-23)"
                        value={medalForm.requirementHour}
                        onChangeText={(value) =>
                          setMedalForm((prev) => ({ ...prev, requirementHour: value }))
                        }
                      />
                    )}
                    {medalForm.requirementType === "custom" && (
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="Requirement raw (JSON ou texto)"
                        value={medalForm.requirementRaw}
                        onChangeText={(value) =>
                          setMedalForm((prev) => ({ ...prev, requirementRaw: value }))
                        }
                        multiline
                      />
                    )}
                  </View>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    placeholder="Order"
                    value={medalForm.order}
                    onChangeText={(value) => setMedalForm((prev) => ({ ...prev, order: value }))}
                  />
                  <Toggle
                    label="Active"
                    value={medalForm.isActive}
                    onToggle={(value) => setMedalForm((prev) => ({ ...prev, isActive: value }))}
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-lg"
                      onPress={async () => {
                        const requirement = buildMedalRequirement(medalForm);
                        if (!requirement.trim()) {
                          Alert.alert("Requirement", "Preencha o requisito da medalha.");
                          return;
                        }
                        const iconEmoji =
                          medalForm.iconType === "emoji" ? medalForm.iconEmoji.trim() || null : null;
                        const iconUrl =
                          medalForm.iconType === "image" ? medalForm.iconUrl.trim() || null : null;
                        const iconUrlGray =
                          medalForm.iconType === "image" ? medalForm.iconUrlGray.trim() || null : null;
                        const payload = {
                          name: medalForm.name,
                          description: medalForm.description,
                          category: medalForm.category,
                          iconEmoji,
                          iconUrl,
                          iconUrlGray,
                          requirement,
                          order: toInt(medalForm.order, 0),
                          isActive: medalForm.isActive,
                        };
                        if (medalEditingId) {
                          await medalUpdate.mutateAsync({ id: medalEditingId, ...payload });
                        } else {
                          await medalCreate.mutateAsync(payload);
                        }
                        resetMedalForm();
                      }}
                      disabled={medalCreate.isPending || medalUpdate.isPending}
                    >
                      <Text className="text-white font-semibold">
                        {medalEditingId ? "Save" : "Create"}
                      </Text>
                    </TouchableOpacity>
                    {medalEditingId && (
                      <TouchableOpacity className="bg-border px-4 py-2 rounded-lg" onPress={resetMedalForm}>
                        <Text className="text-foreground">Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Existing medals</Text>
                {medalsList.map((medal) => (
                  <View key={medal.id} className="border border-border rounded-xl p-3 mb-2">
                    <Text className="text-foreground font-semibold">
                      {medal.name}
                    </Text>
                    <Text className="text-muted text-xs">
                      {medal.category} | order: {medal.order} | active: {medal.isActive ? "yes" : "no"}
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        className="bg-secondary px-3 py-1 rounded-lg"
                        onPress={() => {
                          const parsedRequirement = parseMedalRequirement(medal.requirement);
                          const parsedType =
                            parsedRequirement && typeof parsedRequirement.type === "string"
                              ? (parsedRequirement.type as MedalRequirementType)
                              : "custom";
                          const iconType: MedalIconType =
                            medal.iconUrl || medal.iconUrlGray ? "image" : "emoji";
                          let requirementType: MedalRequirementType = "custom";
                          let requirementDays = "7";
                          let requirementCount = "1";
                          let requirementHour = "6";
                          let requirementBooks = "";
                          let requirementBookName = "";
                          let requirementChallengeType: ChallengeType = "READING";

                          if (parsedType === "streak") {
                            requirementType = "streak";
                            requirementDays =
                              typeof parsedRequirement?.days === "number"
                                ? `${parsedRequirement?.days}`
                                : requirementDays;
                          } else if (parsedType === "total_devotionals") {
                            requirementType = "total_devotionals";
                            requirementCount =
                              typeof parsedRequirement?.count === "number"
                                ? `${parsedRequirement?.count}`
                                : requirementCount;
                          } else if (parsedType === "first_devotional") {
                            requirementType = "first_devotional";
                          } else if (parsedType === "total_reflections") {
                            requirementType = "total_reflections";
                            requirementCount =
                              typeof parsedRequirement?.count === "number"
                                ? `${parsedRequirement?.count}`
                                : requirementCount;
                          } else if (parsedType === "multiple_books") {
                            requirementType = "multiple_books";
                            const booksValue = parsedRequirement?.books;
                            if (Array.isArray(booksValue)) {
                              requirementBooks = booksValue.join(", ");
                            }
                          } else if (parsedType === "book") {
                            requirementType = "book";
                            const bookName =
                              (parsedRequirement?.bookName as string | undefined) ||
                              (parsedRequirement?.book as string | undefined) ||
                              "";
                            requirementBookName = bookName;
                          } else if (parsedType === "early_bird") {
                            requirementType = "early_bird";
                            requirementHour =
                              typeof parsedRequirement?.hour === "number"
                                ? `${parsedRequirement?.hour}`
                                : requirementHour;
                          } else if (parsedType === "night_owl") {
                            requirementType = "night_owl";
                            requirementHour =
                              typeof parsedRequirement?.hour === "number"
                                ? `${parsedRequirement?.hour}`
                                : requirementHour;
                          } else if (parsedType === "challenge_type_count") {
                            requirementType = "challenge_type_count";
                            if (typeof parsedRequirement?.challengeType === "string") {
                              requirementChallengeType = parsedRequirement
                                .challengeType as ChallengeType;
                            }
                            requirementCount =
                              typeof parsedRequirement?.count === "number"
                                ? `${parsedRequirement?.count}`
                                : requirementCount;
                          } else {
                            requirementType = "custom";
                          }
                          setMedalEditingId(medal.id);
                          setMedalForm({
                            name: medal.name,
                            description: medal.description,
                            category: medal.category,
                            iconType,
                            iconEmoji: medal.iconEmoji || "",
                            iconUrl: medal.iconUrl || "",
                            iconUrlGray: medal.iconUrlGray || "",
                            requirementType,
                            requirementDays,
                            requirementCount,
                            requirementHour,
                            requirementBooks,
                            requirementBookName,
                            requirementChallengeType,
                            requirementRaw: medal.requirement,
                            order: `${medal.order}`,
                            isActive: medal.isActive,
                          });
                        }}
                      >
                        <Text className="text-primary font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-error px-3 py-1 rounded-lg"
                        onPress={async () => {
                          const ok = await confirmAction(`Delete medal ${medal.name}?`);
                          if (ok) {
                            await medalDelete.mutateAsync({ id: medal.id });
                          }
                        }}
                      >
                        <Text className="text-white font-semibold">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
