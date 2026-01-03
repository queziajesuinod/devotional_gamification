# Multi-stage build for Devocional Quest

# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.12.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the backend
RUN pnpm build

# Build the frontend (web)
ENV EXPO_USE_METRO_WORKSPACE_ROOT=1
RUN pnpm run export

# Stage 2: Production image
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.12.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built backend from builder
COPY --from=builder /app/dist ./dist

# Copy built frontend from builder
COPY --from=builder /app/dist-web ./dist-web

# Copy necessary files
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY server ./server

# Expose ports
EXPOSE 3000 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
