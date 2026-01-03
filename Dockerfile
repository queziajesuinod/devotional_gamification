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


FROM node:20 AS builder
WORKDIR /app

RUN npm i -g pnpm

RUN git clone --depth 1 https://github.com/queziajesuinod/devotional_gamification.git .

RUN pnpm install --frozen-lockfile

# ✅ garante que o arquivo exista ANTES do metro iniciar
RUN mkdir -p node_modules/react-native-css-interop/.cache \
 && touch node_modules/react-native-css-interop/.cache/web.css

# ✅ evita Metro “workspace root” no container
ENV EXPO_NO_METRO_WORKSPACE_ROOT=1

# opcional: limpa cache do metro/expo durante export
RUN npx expo export -p web --output-dir web-dist --clear

FROM nginx:alpine
COPY --from=builder /app/web-dist /usr/share/nginx/html
EXPOSE 80

