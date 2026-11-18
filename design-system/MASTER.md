# 🐑 Sistema de Design — "Reino da Palavra" (3D fofo bíblico-medieval)

> Fonte da verdade do visual do app. Público: **10–14 anos**. Princípio-mãe: **cada tela é um nível de uma aventura** — movimento, surpresa e recompensa.
>
> **Estilo:** render **3D "claymorphism"** (fofo, arredondado, brilho suave) — a mesma linguagem dos ícones já existentes e do **mascote ovelhinha**. Referência: jogos tipo Duolingo / Royal Match, com tema **bíblico-medieval** (castelo-templo, cruz, baú, escudo, coroa, pergaminho). Moderno, premium, alegre.
>
> Ao construir uma tela, leia antes `design-system/pages/<tela>.md` (se existir, sobrepõe este arquivo); senão, use só este MASTER.

---

## 1. Conceito visual

O app é a **jornada por um reino**: fundo ilustrado 3D (colinas verdes, caminho serpenteando, castelo-templo com cruz dourada — ver [assets/images/reino-bg.png](../assets/images/reino-bg.png)) e uma interface feita de **peças 3D fofas** com cantos arredondados, volume e brilho suave. A **ovelhinha** é o guia/mascote (a ovelha e o rebanho = sentido bíblico de cuidado e célula).

| Elemento (ícone 3D) | Significado no app |
|---|---|
| 🪙 Moeda (com carinha de ovelha) | Denário (moeda do app) |
| ⭐ Escudo com estrela | Nível / progresso |
| 🗝️ Baú (fechado/aberto) | Recompensa surpresa, missão |
| 👑 Coroa / 💎 Gema | Raridade, prêmios especiais |
| 🏅 Medalhas (bronze→diamante) | Conquistas por tier |
| 📜 Pergaminho | Devocional / versículo (a gerar) |
| 🕯️ Selo de cera | Confirmar / concluir (a gerar) |
| 🚩 Estandarte · 🏛️ Arco | Seções, navegação (a gerar) |
| 🐑 Ovelhinha | Mascote, feedback, celebração |

---

## 2. Cores (paleta do reino)

Paleta nova: **azul real + vermelho estandarte + ouro**, apoiada em **madeira** e **verde**. **Sem teal** (o `#4ECDC4` antigo sai; ícones que ainda usam teal serão recoloridos). Tokens mapeiam o `theme.config.js`.

### Ação, recompensa e marca

| Papel | Token | Light | Dark | Uso |
|---|---|---|---|---|
| Primária (CTA/estandarte) | `primary` | `#C1272D` | `#E24B50` | Botões principais, "Concluir/Comprar" |
| Primária escura | `primaryDark` | `#8E1B1F` | `#A32A2E` | Sombra/estado pressionado do botão |
| Acento (azul real) | `accent` | `#3D6FD6` | `#5C94FC` | Barra de XP, links, destaque de fé |
| Secundária (floresta) | `secondary` | `#2E8B57` | `#43B36E` | Sucesso, confirmação |
| Ouro / recompensa | `gold` | `#F2B50C` | `#FFCB3D` | Denário, badges, brilho de conquista |
| Estrela | `star` | `#FFD64E` | `#FFE27A` | Nível, destaque máximo |
| Realeza (épico) | `royal` | `#7B3FA0` | `#9B5BC4` | Raridade épica, elementos nobres |

### Estrutura e neutros

| Papel | Token | Light | Dark |
|---|---|---|---|
| Fundo (céu do reino) | `background` | `#6FA8DC` | `#0B1733` |
| Superfície (card branco) | `surface` | `#FFFFFF` | `#17213D` |
| Pergaminho (leitura) | `parchment` | `#F4E4C1` | `#2A2415` |
| Madeira (baú/moldura) | `wood` | `#8B5A2B` | `#6B451F` |
| Texto | `foreground` | `#241A12` | `#F2EFE6` |
| Texto suave | `muted` | `#6B5E4C` | `#B8AF9C` |
| Borda | `border` | `#D8C9A8` | `#2B3550` |

Semânticos: Sucesso `#2E8B57` · Aviso `#F2B50C` · Erro `#C1272D`.
Raridades: Comum `#9CA3AF` · Raro `#3D6FD6` · Épico `#7B3FA0` · **Lendário `#F2B50C`** (ouro com brilho).

> ⚠️ **Contraste & legibilidade sobre o fundo:** o fundo ilustrado é vibrante — todo texto fica sobre **card branco** ou **pergaminho** (≥ 4.5:1). Sobre o céu, usar **scrim** suave (overlay claro) ou blocos. Nunca texto solto sobre a parte detalhada da imagem.

---

## 3. Tipografia

| Papel | Fonte | Peso | Tamanho (mobile) |
|---|---|---|---|
| Título épico de tela | **Cinzel** | 600–700 | 26–32 |
| Heading de card / UI | **Baloo 2** | 600–700 | 18–24 |
| Corpo / devocional | **Comic Neue** | 400 | 16 (mín.) |
| Números (XP, moeda, nível) | **Baloo 2** | 700 | — |

- **Cinzel** = clima bíblico/medieval "entalhado", mas limpo/moderno (só títulos; nunca parágrafo).
- **Baloo 2** = voz amigável e chunky, legível pra criança (UI, botões, números).
- **Comic Neue** = corpo acolhedor; devocional longo com entrelinha 1.5–1.6.
- *(Press Start 2P foi descartado — era do estilo flat 16-bit, que não seguimos.)*
- Google Fonts via `expo-font` em `app/_layout.tsx`.

---

## 4. Forma, profundidade e sombra (a assinatura 3D)

O que amarra o estilo é o **volume fofo + brilho suave + sombra macia** (claymorphism) — e **não** contorno preto/sombra dura.

- **Cantos:** bem arredondados (`radius 16–24`), formas "infláveis".
- **Sombra macia:** suave e difusa, ex. `0 8px 20px rgba(40,30,15,.18)` (RN: `shadowOpacity .18, shadowRadius 14, shadowOffset {0,8}, elevation 6`).
- **Brilho/gloss:** leve highlight no topo das peças (como nos ícones 3D).
- **Ícones:** PNGs 3D em [assets/icons/game/](../assets/icons/game/) via `<GameIcon>` ([components/game-icon.tsx](../components/game-icon.tsx)). Tamanhos padrão `ICON_SIZE` (xs 16 → hero 96). **Nunca emoji** como ícone estrutural (emojis desta doc são ilustrativos).
- **Grid 8px:** espaçamentos em múltiplos de 8 (8/16/24/32).

---

## 5. Movimento (vida e comemoração)

Mola/bounce, feedback instantâneo, recompensas comemorativas. Respeitar `Reduce Motion` (trocar bounce por fade). Reutilizar e estender os helpers em [components/juice.tsx](../components/juice.tsx) (`PressableScale`, `PopIn`, `Pulse`, `AnimatedBar`, `CountUp`, `Flame`) — **não recriar**.

| Interação | Animação | Duração |
|---|---|---|
| Tocar botão/card | `PressableScale`: afunda com bounce (0.96→1) | 120–180ms |
| Ganhar Denário | moeda salta + `CountUp` do saldo | 400ms |
| Subir de nível | escudo/estrela gira + brilho + confete (CelebrationModal) | 600ms |
| Abrir baú | baú troca p/ `chest-open` + item salta | 500ms |
| Entrada de lista | itens escalonados de baixo (`PopIn`) | 40ms/item |
| Barra de XP | `AnimatedBar` enche com ease-out + brilho | 300ms |
| Mascote | a ovelhinha reage a conquistas (`MascotCard`) | — |

Curvas: spring (preferir) / ease-out ao entrar, ease-in ao sair. Nunca linear.

---

## 6. Receitas de componentes

**Fundo de tela:** imagem `reino-bg.png` em `cover` atrás do conteúdo, com **scrim** claro suave; conteúdo rola por cima. Dá pra ter variações por seção (loja/ranking/noite).

**Botão primário:** fundo `primary`, cantos 16–20, sombra macia, brilho no topo; texto Baloo 2 700 branco; `PressableScale` no toque. Altura ≥ 48.

**Pílula de Denário:** cápsula branca, sombra macia, ícone `coin` 3D à esquerda, número Baloo 2 700. Fixa no topo.

**Card de conteúdo:** `surface` branca, radius 20, sombra macia. Devocional usa fundo `parchment`. Recompensa surpresa usa ícone `chest`/`gift`.

**Barra de XP:** trilho claro arredondado; preenchimento `accent` (azul real) com brilho; `level-shield` (estrela) na ponta.

**Nav inferior:** ícones 3D `tab-home / tab-shop / tab-profile / tab-ranking / tab-cells`; aba ativa com destaque (escala + brilho). Ícone **+ label**, safe-area.

**Mascote:** ovelhinha em celebrações, estados vazios e dicas (`MascotCard`).

---

## 7. Acessibilidade (não negociável)

- Toque ≥ 44×44pt; espaçamento ≥ 8px.
- Texto ≥ 4.5:1 — sempre sobre card/pergaminho/scrim, nunca sobre a parte cheia da imagem.
- Cor nunca é o único indicador (ícone + texto).
- Dynamic Type sem quebrar; `Reduce Motion` → fades.
- `accessibilityLabel` em ícone sem texto (prop `label` do `GameIcon`).

---

## 8. Anti-padrões (evitar)

- **Contorno preto grosso + sombra dura 16-bit** (era o conceito flat descartado) — usar sombra macia 3D.
- Teal `#4ECDC4` na nova paleta (está saindo).
- Emoji como ícone de navegação/ação.
- Texto sobre a área detalhada do fundo sem scrim/card.
- Cinzel em parágrafo; fontes de sistema no lugar das do app.
- Misturar estilos de ícone (todos seguem o render 3D fofo).

---

## 9. Mapa de aplicação por tela

| Tela | Destaques |
|---|---|
| Login/Registro | Fundo do reino; título Cinzel; botão vermelho; ovelhinha |
| Dashboard | Fundo + scrim; Denário (moeda); devocional em pergaminho; desafios com ícones 3D; XP com escudo-estrela |
| Loja | Itens em cards; raridade lendária com brilho; preço em moeda |
| Perfil/Avatar | Nível como escudo-estrela; inventário em grid; mascote |
| Ranking | Pódio do reino; top 3 com medalhas; coroa no 1º |
| Medalhas | Tiers bronze/prata/ouro/diamante (ícones já existentes) |

---

### Status
- **v2** — direção confirmada: **3D fofo (claymorphism) bíblico-medieval**, paleta **azul real + vermelho estandarte + ouro** (sem teal), fontes Cinzel + Baloo 2 + Comic Neue, assets 3D via Meshy.
- Feito: fundos gerados (6 cenas × retrato 9:16 + largo 16:9, responsivos); ícones novos (scroll, seal, banner, arch) e recolor teal→azul (reading, level-shield, mascote); **nova paleta aplicada no `theme.config.js`**; fundos ligados nas abas via [lib/kingdom-bg.ts](../lib/kingdom-bg.ts) + `ScreenContainer` responsivo (coluna centralizada no PC/tablet).
- Pendente: repaginar tela a tela usando os novos ícones/paleta (pergaminho no devocional, selo no "concluir" etc.) e refinar contraste sobre os fundos.
