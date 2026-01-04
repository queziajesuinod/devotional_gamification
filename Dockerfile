
devocional-quest-web

FROM node:20-bookworm AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm i -g pnpm

RUN git clone https://github.com/queziajesuinod/devotional_gamification.git .

RUN pnpm install --frozen-lockfile

# evita erro do react-native-css-interop
RUN mkdir -p node_modules/react-native-css-interop/.cache \
 && touch node_modules/react-native-css-interop/.cache/web.css

ENV EXPO_NO_METRO_WORKSPACE_ROOT=1
ENV EXPO_NO_TELEMETRY=1

# 1) build da API (precisa existir script build -> dist/)
RUN pnpm build

# 2) export do web
RUN npx expo export -p web --output-dir web-dist --clear

# deixa só deps de produção (ajuda muito)
RUN pnpm prune --prod


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3009
ENV HOST=0.0.0.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web-dist ./web-dist

EXPOSE 3009
CMD ["node", "dist/index.js"]
