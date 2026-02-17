# Haishin+ HUB - Production Dockerfile
# Multi-stage build for Nuxt 3 (Node.js runtime)

# ──────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依存関係のインストール（キャッシュ活用）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ソースコードのコピーとビルド
COPY . .
RUN pnpm build

# ──────────────────────────────────────
# Stage 2: Production Runtime
# ──────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nuxt && \
    adduser --system --uid 1001 nuxt

# ビルド成果物のみコピー
COPY --from=builder /app/.output .output

USER nuxt

# Nuxt 3 production server
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# dumb-init でシグナルを適切に処理
CMD ["dumb-init", "node", ".output/server/index.mjs"]
