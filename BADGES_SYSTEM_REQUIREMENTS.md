# Sistema de Badges/Conquistas - Requisitos Técnicos

**Projeto:** Devocional Quest  
**Versão:** 1.0  
**Data:** Janeiro 2026  
**Autor:** Manus AI

---

## 1. Visão Geral

O Sistema de Badges/Conquistas é um mecanismo de gamificação que recompensa usuários por atingirem marcos específicos em sua jornada espiritual. O sistema visa aumentar o engajamento, motivar a consistência e celebrar o progresso dos usuários através de conquistas visuais e recompensas tangíveis.

### 1.1 Objetivos

O sistema de badges tem como objetivos principais aumentar a retenção de usuários através de metas de longo prazo, incentivar comportamentos desejados como consistência diária e reflexões profundas, criar senso de progressão e realização pessoal, e fomentar competição saudável entre membros de células/grupos. Badges desbloqueados servem como símbolos de status e dedicação espiritual dentro da comunidade.

### 1.2 Escopo

Este documento cobre a arquitetura de dados para armazenamento de badges e progresso, regras de negócio para desbloqueio automático de conquistas, interface de usuário para exibição e notificações, e integração com sistemas existentes de XP, streak, grupos e reflexões. Não estão incluídos nesta versão inicial badges relacionados a eventos especiais sazonais, sistema de troca ou comércio de badges entre usuários, e badges premium disponíveis apenas via compra.

---

## 2. Arquitetura de Dados

### 2.1 Tabela: `badges`

Armazena a definição de todos os badges disponíveis no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK) | Identificador único do badge |
| `slug` | VARCHAR(50) | Identificador textual único (ex: `warrior_7_days`) |
| `name` | VARCHAR(100) | Nome exibido do badge (ex: "Guerreiro da Fé") |
| `description` | TEXT | Descrição da conquista |
| `icon` | VARCHAR(255) | URL ou nome do ícone/imagem |
| `category` | ENUM | Categoria: `streak`, `reflection`, `level`, `group`, `special` |
| `tier` | ENUM | Nível de raridade: `bronze`, `silver`, `gold`, `platinum`, `diamond` |
| `xpReward` | INT | XP bônus concedido ao desbloquear |
| `denarioReward` | INT | Denários bônus concedidos ao desbloquear |
| `unlockCondition` | JSON | Condições para desbloqueio (detalhado na seção 3) |
| `isActive` | BOOLEAN | Se o badge está ativo no sistema |
| `createdAt` | DATETIME | Data de criação do badge |

### 2.2 Tabela: `user_badges`

Registra os badges desbloqueados por cada usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK) | Identificador único do registro |
| `userId` | INT (FK) | Referência ao usuário |
| `badgeId` | INT (FK) | Referência ao badge |
| `unlockedAt` | DATETIME | Data e hora do desbloqueio |
| `progress` | JSON | Progresso atual para badges progressivos (opcional) |
| `notified` | BOOLEAN | Se o usuário foi notificado sobre o desbloqueio |

**Índices:**
- `idx_user_badges_user` em `userId` para consultas rápidas de badges por usuário
- `idx_user_badges_badge` em `badgeId` para estatísticas de badges
- `idx_user_badges_unlocked` em `unlockedAt` para rankings temporais

### 2.3 Tabela: `badge_progress`

Rastreia o progresso do usuário em direção a badges ainda não desbloqueados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK) | Identificador único |
| `userId` | INT (FK) | Referência ao usuário |
| `badgeId` | INT (FK) | Referência ao badge |
| `currentValue` | INT | Valor atual do progresso (ex: 5 dias de streak) |
| `targetValue` | INT | Valor necessário para desbloquear (ex: 7 dias) |
| `lastUpdated` | DATETIME | Última atualização do progresso |

---

## 3. Categorias e Regras de Desbloqueio

### 3.1 Badges de Streak (Consistência)

Recompensam usuários por manter sequências consecutivas de atividade diária.

| Badge | Slug | Tier | Condição | Recompensas |
|-------|------|------|----------|-------------|
| **Primeiro Passo** | `first_day` | Bronze | Completar desafios no primeiro dia | 10 XP, 5 Denários |
| **Dedicado** | `streak_3_days` | Bronze | 3 dias consecutivos | 25 XP, 10 Denários |
| **Guerreiro da Fé** | `streak_7_days` | Silver | 7 dias consecutivos | 75 XP, 25 Denários |
| **Perseverante** | `streak_30_days` | Gold | 30 dias consecutivos | 300 XP, 100 Denários |
| **Inabalável** | `streak_100_days` | Platinum | 100 dias consecutivos | 1000 XP, 500 Denários |
| **Lenda Viva** | `streak_365_days` | Diamond | 365 dias consecutivos | 5000 XP, 2000 Denários |

**Regra de Desbloqueio:**
```json
{
  "type": "streak",
  "metric": "currentStreak",
  "operator": ">=",
  "value": 7
}
```

### 3.2 Badges de Reflexão (Profundidade Espiritual)

Reconhecem usuários que se dedicam a escrever reflexões significativas.

| Badge | Slug | Tier | Condição | Recompensas |
|-------|------|------|----------|-------------|
| **Pensador** | `reflection_first` | Bronze | Primeira reflexão escrita | 15 XP, 5 Denários |
| **Meditador** | `reflection_10` | Silver | 10 reflexões escritas | 50 XP, 20 Denários |
| **Estudioso** | `reflection_50` | Gold | 50 reflexões escritas | 200 XP, 75 Denários |
| **Sábio** | `reflection_100` | Platinum | 100 reflexões escritas | 500 XP, 200 Denários |
| **Reflexões Profundas** | `reflection_long` | Gold | 10 reflexões com mais de 200 caracteres | 150 XP, 50 Denários |

**Regra de Desbloqueio:**
```json
{
  "type": "reflection",
  "metric": "totalReflections",
  "operator": ">=",
  "value": 10
}
```

### 3.3 Badges de Nível (Progressão)

Celebram marcos de crescimento no sistema de XP.

| Badge | Slug | Tier | Condição | Recompensas |
|-------|------|------|----------|-------------|
| **Iniciante** | `level_5` | Bronze | Alcançar nível 5 | 50 XP, 20 Denários |
| **Aprendiz** | `level_10` | Silver | Alcançar nível 10 | 100 XP, 50 Denários |
| **Experiente** | `level_25` | Gold | Alcançar nível 25 | 300 XP, 150 Denários |
| **Mestre** | `level_50` | Platinum | Alcançar nível 50 | 750 XP, 400 Denários |
| **Lendário** | `level_100` | Diamond | Alcançar nível 100 | 2000 XP, 1000 Denários |

**Regra de Desbloqueio:**
```json
{
  "type": "level",
  "metric": "userLevel",
  "operator": ">=",
  "value": 10
}
```

### 3.4 Badges de Grupo (Comunidade)

Incentivam participação ativa em células/grupos.

| Badge | Slug | Tier | Condição | Recompensas |
|-------|------|------|----------|-------------|
| **Membro Ativo** | `group_joined` | Bronze | Entrar em um grupo | 20 XP, 10 Denários |
| **Colaborador** | `group_100_points` | Silver | Contribuir 100 pontos ao grupo | 75 XP, 30 Denários |
| **Pilar da Comunidade** | `group_500_points` | Gold | Contribuir 500 pontos ao grupo | 250 XP, 100 Denários |
| **Líder Servidor** | `group_leader` | Gold | Ser líder de um grupo por 30 dias | 300 XP, 150 Denários |
| **Top 3 do Grupo** | `group_top3` | Silver | Estar entre os 3 primeiros do grupo | 100 XP, 40 Denários |

**Regra de Desbloqueio:**
```json
{
  "type": "group",
  "metric": "groupPointsContributed",
  "operator": ">=",
  "value": 100
}
```

### 3.5 Badges Especiais (Marcos Únicos)

Conquistas únicas que combinam múltiplos critérios ou eventos especiais.

| Badge | Slug | Tier | Condição | Recompensas |
|-------|------|------|----------|-------------|
| **Madrugador** | `early_bird` | Silver | Completar desafios antes das 7h da manhã (10 vezes) | 100 XP, 50 Denários |
| **Noturno** | `night_owl` | Silver | Completar desafios após 22h (10 vezes) | 100 XP, 50 Denários |
| **Perfeccionista** | `perfect_week` | Gold | Completar todos os desafios por 7 dias seguidos | 200 XP, 100 Denários |
| **Colecionador** | `shop_10_items` | Silver | Comprar 10 itens na loja | 75 XP, 0 Denários |
| **Generoso** | `spent_1000` | Gold | Gastar 1000 Denários na loja | 150 XP, 0 Denários |
| **Evangelista** | `referral_5` | Platinum | Convidar 5 amigos que completam 7 dias | 500 XP, 250 Denários |

**Regra de Desbloqueio (Perfeccionista):**
```json
{
  "type": "composite",
  "conditions": [
    {
      "metric": "consecutivePerfectDays",
      "operator": ">=",
      "value": 7
    }
  ]
}
```

---

## 4. Lógica de Desbloqueio

### 4.1 Verificação Automática

O sistema deve verificar condições de desbloqueio automaticamente após eventos relevantes. Os triggers de verificação incluem conclusão de desafio diário, escrita de reflexão, ganho de XP ou subida de nível, contribuição de pontos ao grupo, e compra de item na loja.

### 4.2 Fluxo de Desbloqueio

O fluxo de desbloqueio segue estas etapas: o evento é disparado pelo usuário (ex: completar desafio), o sistema identifica badges relacionados ao evento, verifica as condições de cada badge candidato, se todas as condições forem atendidas o badge é desbloqueado, o registro é criado em `user_badges`, recompensas (XP e Denários) são creditadas ao usuário, notificação é enviada ao usuário, e o progresso é atualizado em `badge_progress`.

### 4.3 Prevenção de Duplicatas

O sistema deve garantir que cada badge seja desbloqueado apenas uma vez por usuário através de constraint UNIQUE em `user_badges(userId, badgeId)` e verificação prévia antes de criar novo registro.

### 4.4 Badges Progressivos

Alguns badges têm múltiplos níveis (ex: streak de 7, 30, 100 dias). O sistema deve rastrear progresso em `badge_progress` e exibir barra de progresso na interface do usuário, além de desbloquear automaticamente o próximo nível ao atingir a meta.

---

## 5. Interface de Usuário

### 5.1 Tela de Badges

Uma tela dedicada deve exibir todos os badges do usuário, incluindo grid de badges desbloqueados com ícones coloridos, badges bloqueados em escala de cinza com silhueta, indicador de progresso para badges próximos do desbloqueio, filtros por categoria (Streak, Reflexão, Nível, Grupo, Especial), contador total de badges desbloqueados, e estatísticas de raridade (quantos Bronze, Silver, Gold, etc).

### 5.2 Badge Card (Detalhes)

Ao clicar em um badge, exibir modal com informações detalhadas: ícone grande e colorido, nome e descrição completa, data de desbloqueio (se aplicável), recompensas recebidas, progresso atual se ainda não desbloqueado, e botão de compartilhamento social.

### 5.3 Notificação de Desbloqueio

Quando um badge é desbloqueado, exibir notificação celebratória com animação de confete ou brilho, ícone do badge em destaque, mensagem "Você desbloqueou: [Nome do Badge]!", descrição breve, recompensas recebidas (XP e Denários), e botões "Ver Badge" e "Fechar".

### 5.4 Indicadores no Dashboard

O dashboard principal deve mostrar miniaturas dos últimos 3 badges desbloqueados, badge mais recente com destaque, e link "Ver Todos os Badges".

### 5.5 Perfil de Usuário

A tela de perfil deve incluir seção de badges destacados onde o usuário pode escolher até 3 badges para exibir, contador total de badges, e badge mais raro desbloqueado.

---

## 6. Integração com Sistemas Existentes

### 6.1 Sistema de XP e Níveis

Ao desbloquear badge, adicionar XP bônus ao `xpTotal` do usuário, recalcular nível se necessário, e verificar se o novo nível desbloqueia badges de nível.

### 6.2 Sistema de Streak

Após atualizar `currentStreak` do usuário, verificar badges de streak, e atualizar progresso em `badge_progress`.

### 6.3 Sistema de Reflexões

Ao salvar nova reflexão, incrementar contador de reflexões, verificar badges de reflexão (total e por tamanho), e atualizar progresso.

### 6.4 Sistema de Grupos

Quando usuário contribui pontos ao grupo, verificar badges de contribuição, verificar badges de ranking no grupo, e verificar badges de liderança.

### 6.5 Sistema de Loja

Após compra de item, verificar badges de colecionador e gasto total.

---

## 7. Implementação Técnica

### 7.1 Backend (Node.js + Express)

#### Funções de Banco de Dados (`server/db.ts`)

```typescript
// Criar badge
export async function createBadge(badge: BadgeData): Promise<Badge>

// Buscar todos badges
export async function getAllBadges(): Promise<Badge[]>

// Buscar badges do usuário
export async function getUserBadges(userId: number): Promise<UserBadge[]>

// Desbloquear badge
export async function unlockBadge(
  userId: number, 
  badgeId: number
): Promise<UserBadge>

// Verificar se badge está desbloqueado
export async function hasBadge(
  userId: number, 
  badgeId: number
): Promise<boolean>

// Atualizar progresso
export async function updateBadgeProgress(
  userId: number,
  badgeId: number,
  currentValue: number
): Promise<void>

// Verificar condições de desbloqueio
export async function checkBadgeUnlock(
  userId: number,
  eventType: string,
  eventData: any
): Promise<Badge[]>
```

#### Rotas da API (`server/routers.ts`)

```typescript
// GET /api/trpc/badge.getAll - Listar todos badges
// GET /api/trpc/badge.getUserBadges - Badges do usuário logado
// GET /api/trpc/badge.getProgress - Progresso de badges
// POST /api/trpc/badge.checkUnlock - Verificar desbloqueios (interno)
```

#### Lógica de Verificação

```typescript
export async function checkAndUnlockBadges(
  userId: number,
  eventType: 'challenge' | 'reflection' | 'level' | 'group' | 'shop'
): Promise<Badge[]> {
  // 1. Buscar badges relacionados ao evento
  // 2. Para cada badge, verificar condições
  // 3. Se condições atendidas, desbloquear
  // 4. Creditar recompensas
  // 5. Criar notificação
  // 6. Retornar badges desbloqueados
}
```

### 7.2 Frontend (React Native + TypeScript)

#### Componentes

```typescript
// BadgeCard.tsx - Card individual de badge
// BadgeGrid.tsx - Grid de badges
// BadgeModal.tsx - Modal de detalhes
// BadgeNotification.tsx - Notificação de desbloqueio
// BadgeProgress.tsx - Barra de progresso
```

#### Telas

```typescript
// app/badges.tsx - Tela principal de badges
// app/badge-details.tsx - Detalhes de um badge específico
```

#### Hooks

```typescript
// hooks/use-badges.ts
export function useBadges() {
  const { data: badges } = trpc.badge.getUserBadges.useQuery();
  const { data: progress } = trpc.badge.getProgress.useQuery();
  return { badges, progress };
}
```

### 7.3 Script de Seed

Criar script para popular banco de dados com todos os badges definidos:

```bash
npx tsx scripts/seed-badges.ts
```

---

## 8. Testes

### 8.1 Testes Unitários

Testar funções de verificação de condições, cálculo de progresso, e prevenção de duplicatas.

### 8.2 Testes de Integração

Testar fluxo completo de desbloqueio após eventos, creditação de recompensas, e atualização de progresso.

### 8.3 Testes de UI

Testar exibição correta de badges desbloqueados e bloqueados, animações de notificação, e navegação entre telas.

---

## 9. Considerações de Performance

### 9.1 Caching

Cachear lista de badges disponíveis em Redis com TTL de 1 hora, cachear badges do usuário em memória durante a sessão, e invalidar cache ao desbloquear novo badge.

### 9.2 Consultas Otimizadas

Usar índices em `userId` e `badgeId`, fazer JOIN apenas quando necessário exibir detalhes completos, e carregar progresso sob demanda (lazy loading).

### 9.3 Verificação Assíncrona

Processar verificação de badges em background após eventos, não bloquear resposta da API principal, e usar fila de jobs para verificações pesadas.

---

## 10. Roadmap Futuro

### Fase 2 (Futuro)

Badges sazonais para eventos especiais (Natal, Páscoa, etc.), sistema de badges secretos que não revelam condições, badges de comunidade desbloqueados coletivamente pelo grupo, e integração com sistema de títulos/ranks exibidos no perfil.

### Fase 3 (Futuro)

Badges NFT para conquistas raras, marketplace de badges (troca entre usuários), e badges personalizados criados por líderes de grupos.

---

## 11. Métricas de Sucesso

O sucesso do sistema será medido através de aumento na taxa de retenção de usuários em 30 dias, aumento no tempo médio de sessão, crescimento no número de reflexões escritas, maior engajamento em grupos, e redução na taxa de abandono após primeiros 7 dias.

---

## Apêndice A: Estrutura JSON de Condições

### Condição Simples
```json
{
  "type": "streak",
  "metric": "currentStreak",
  "operator": ">=",
  "value": 7
}
```

### Condição Composta (AND)
```json
{
  "type": "composite",
  "operator": "AND",
  "conditions": [
    { "metric": "currentStreak", "operator": ">=", "value": 7 },
    { "metric": "totalReflections", "operator": ">=", "value": 5 }
  ]
}
```

### Condição Temporal
```json
{
  "type": "temporal",
  "metric": "challengesCompletedBefore",
  "operator": ">=",
  "value": 10,
  "timeConstraint": {
    "hour": 7,
    "operator": "<"
  }
}
```

---

**Documento preparado por Manus AI**  
**Última atualização:** Janeiro 2026
