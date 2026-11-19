/**
 * Admin · Guarda-roupa. Nothing is sold anymore: looks are defined in code
 * (shared/character-catalog.ts → WARDROBE_PLAN / wardrobeFor) and unlock by level.
 * This page shows the catalog per character, who is wearing what, how far players got,
 * and warns when shop_items is missing rows that equipping needs (pnpm catalog:sync).
 */
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { Figurine } from "@/components/figurine";
import { GameIcon } from "@/components/game-icon";
import { BarChart, Badge, Btn, Card, EmptyState, Grid, KpiCard, Loading, PageHeader, Pagination } from "@/components/panel/ui";
import { CHARACTERS, CHARACTER_KEYS, wardrobeFor, type CharacterKey, type WardrobeLook } from "@shared/character-catalog";

const RARITY: Record<WardrobeLook["rarity"], { label: string; tone: "neutral" | "brand" | "warn" }> = {
  COMMON: { label: "Comum", tone: "neutral" },
  RARE: { label: "Raro", tone: "brand" },
  EPIC: { label: "Épico", tone: "warn" },
};

type Group = { key: string; name: string; description: string; minLevel: number; power: number; rarity: WardrobeLook["rarity"]; items: WardrobeLook[] };

function groupLooks(looks: WardrobeLook[]): Group[] {
  const list: Group[] = [];
  for (const w of looks) {
    let g = list.find((x) => x.key === w.group);
    if (!g) {
      g = { key: w.group, name: w.groupName, description: w.description, minLevel: w.minLevel, power: w.power, rarity: w.rarity, items: [] };
      list.push(g);
    }
    g.items.push(w);
  }
  return list;
}

const PAGE_SIZE = 4; // looks per page (each with its 4 hair colors)

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

export default function AdminWardrobe() {
  const utils = trpc.useUtils();
  const overview = trpc.admin.wardrobe.overview.useQuery();
  const [character, setCharacter] = useState<CharacterKey>("lia");
  const [page, setPage] = useState(1);

  const groups = useMemo(() => groupLooks(wardrobeFor(character)), [character]);
  const looksPerCharacter = wardrobeFor(character).length;
  const data = overview.data;

  // Players that already unlocked each look (level ≥ look level)
  const unlockChart = useMemo(() => {
    const levels = data?.levels ?? [];
    return groups.map((g) => ({
      label: `${g.minLevel}`,
      full: `Nível ${g.minLevel} · ${g.name}`,
      value: levels.filter((l) => l >= g.minLevel).length,
    }));
  }, [groups, data]);

  const mostWorn = useMemo(() => {
    if (!data) return null;
    let best: { name: string; count: number; character: CharacterKey } | null = null;
    for (const c of CHARACTER_KEYS) {
      for (const w of wardrobeFor(c)) {
        const n = data.wearing[c]?.[w.id] ?? 0;
        if (n > 0 && (!best || n > best.count)) best = { name: `${w.name} · ${CHARACTERS[c].name}`, count: n, character: c };
      }
    }
    return best;
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageGroups = groups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const wearingOf = (w: WardrobeLook) => data?.wearing[character]?.[w.id] ?? 0;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Guarda-roupa"
        subtitle="Os looks não são vendidos: cada um libera num nível e o jogador veste de graça. Looks e níveis ficam em shared/character-catalog.ts."
        actions={
          <Btn
            variant="secondary"
            size="sm"
            title="Atualizar"
            onPress={() => utils.admin.wardrobe.overview.invalidate()}
            loading={overview.isFetching && !overview.isLoading}
          />
        }
      />

      {overview.isLoading ? (
        <Loading label="Carregando guarda-roupa..." />
      ) : overview.error ? (
        <EmptyState
          icon="lock"
          title="Não foi possível carregar o guarda-roupa"
          text={overview.error.message}
          action={<Btn title="Tentar de novo" onPress={() => overview.refetch()} />}
        />
      ) : data ? (
        <>
          {data.missing.length > 0 ? (
            <Card style={{ borderColor: "#F2B50C", borderWidth: 2 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <GameIcon name="lock" size={28} />
                <View style={{ flex: 1 }}>
                  <Text className="text-foreground font-extrabold">
                    Catálogo desatualizado: faltam {plural(data.missing.length, "item", "itens")} no banco
                  </Text>
                  <Text className="text-muted text-sm mt-1">
                    Sem eles os jogadores não conseguem vestir alguns looks. Rode pnpm catalog:sync no servidor.
                  </Text>
                  <Text className="text-muted text-xs mt-1" numberOfLines={2}>
                    {data.missing.slice(0, 8).join(", ")}
                    {data.missing.length > 8 ? "…" : ""}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          <Grid min={200}>
            <KpiCard icon="tab-shop" label="Looks por personagem" value={looksPerCharacter} hint={`${groups.length} looks × 4 cabelos`} />
            <KpiCard
              icon="level-shield"
              label="Jogadores com personagem"
              value={data.players - data.notChosen}
              hint={CHARACTER_KEYS.map((c) => `${CHARACTERS[c].name} ${data.perCharacter[c] ?? 0}`).join(" · ")}
            />
            <KpiCard
              icon="xp"
              label="Nível do meio"
              value={data.medianLevel}
              hint={`libera ${groups.filter((g) => g.minLevel <= data.medianLevel).length} de ${groups.length} looks`}
            />
            <KpiCard
              icon="crown"
              label="Look mais usado"
              value={mostWorn ? plural(mostWorn.count, "jogador", "jogadores") : "—"}
              hint={mostWorn?.name ?? "ninguém vestiu ainda"}
            />
          </Grid>

          {/* Personagem */}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {CHARACTER_KEYS.map((c) => {
              const active = c === character;
              return (
                <Btn
                  key={c}
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  title={`${CHARACTERS[c].name} · ${data.perCharacter[c] ?? 0}`}
                  accessibilityLabel={`Ver looks de ${CHARACTERS[c].name}`}
                  onPress={() => {
                    setCharacter(c);
                    setPage(1);
                  }}
                />
              );
            })}
          </View>

          <Card title="Quantos jogadores já liberaram cada look" subtitle="Por nível exigido · toque numa barra">
            <BarChart data={unlockChart} unit=" jogadores" />
          </Card>

          <Card title={`Looks de ${CHARACTERS[character].name}`} subtitle="Na ordem em que liberam" padded={false}>
            {pageGroups.map((g, idx) => {
              const total = g.items.reduce((sum, w) => sum + wearingOf(w), 0);
              return (
                <View
                  key={g.key}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: idx === pageGroups.length - 1 ? 0 : 1,
                    borderBottomColor: "rgba(139,90,43,0.14)",
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge label={`Nível ${g.minLevel}`} tone="brand" />
                    <Text className="text-foreground font-extrabold" style={{ flexShrink: 1 }}>
                      {g.name}
                    </Text>
                    <Badge label={RARITY[g.rarity].label} tone={RARITY[g.rarity].tone} />
                    <Text style={{ fontSize: 12 }} accessibilityLabel={`Força ${g.power} de 5`}>
                      {"⚡".repeat(g.power)}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text className="text-muted text-xs font-bold">{plural(total, "usando", "usando")}</Text>
                  </View>
                  <Text className="text-muted text-xs">{g.description}</Text>
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    {g.items.map((w) => {
                      const n = wearingOf(w);
                      const hair = w.hair ? CHARACTERS[character].hair.find((h) => h.key === w.hair) : null;
                      return (
                        <View key={w.id} style={{ alignItems: "center", width: 76 }}>
                          <View style={{ backgroundColor: "#F2F5FB", borderRadius: 12, overflow: "hidden" }}>
                            <Figurine
                              figurine={{ character, chosen: true, look: w.look, hair: w.hair, accessory: w.accessory }}
                              height={96}
                            />
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                            {hair ? (
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: hair.swatch }} />
                            ) : null}
                            <Text className="text-foreground text-[11px] font-bold" numberOfLines={1}>
                              {hair ? hair.name.replace("Cabelo ", "") : "Natural"}
                            </Text>
                          </View>
                          <Text className="text-muted text-[11px]">{n}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <Pagination page={safePage} totalPages={totalPages} total={groups.length} onChange={setPage} />
          </Card>

          {data.other > 0 || data.notChosen > 0 ? (
            <Text className="text-muted text-xs">
              {data.notChosen > 0 ? `${plural(data.notChosen, "jogador ainda não escolheu", "jogadores ainda não escolheram")} personagem. ` : ""}
              {data.other > 0
                ? `${plural(data.other, "jogador está", "jogadores estão")} com uma combinação antiga da loja (aparece como o look mais próximo até vestir um look novo).`
                : ""}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
