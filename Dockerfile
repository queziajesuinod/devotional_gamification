FROM node:20 AS builder
WORKDIR /app

RUN npm i -g pnpm

RUN git clone --depth 1 https://github.com/queziajesuinod/devotional_gamification.git .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20
WORKDIR /app
ENV NODE_ENV=production

RUN npm i -g pnpm
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
EXPOSE 3009
CMD ["node","dist/index.js"]


    devocional-quest-web

# =========================
# 1) BUILD
# =========================
FROM node:20-bookworm AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm i -g pnpm

RUN git clone https://github.com/queziajesuinod/devotional_gamification.git .

RUN pnpm install --frozen-lockfile

RUN mkdir -p node_modules/react-native-css-interop/.cache \
 && touch node_modules/react-native-css-interop/.cache/web.css

ENV EXPO_NO_METRO_WORKSPACE_ROOT=1
ENV EXPO_NO_TELEMETRY=1

RUN npx expo export -p web --output-dir web-dist --clear


# =========================
# 2) RUNTIME (NODE STATIC SERVER)
# =========================
FROM node:20-alpine
WORKDIR /app

# servidor estático leve (SPA ok)
RUN npm i -g serve

COPY --from=builder /app/web-dist ./web-dist

EXPOSE 80
CMD ["serve", "-s", "web-dist", "-l", "80"]
