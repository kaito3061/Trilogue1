# Trilogue サーバー（Next.js / Node.js）を1コマンドで起動するためのイメージ。
# Node も git もホストに入れずに、Docker さえあれば `docker compose up` で動く。

# --- ビルド段階 -------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- 実行段階 ---------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# 実行に必要なものだけを持ち込む（ビルド成果物・依存・設定）
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
# next start は 0.0.0.0 で待受するため、ポート公開すれば同一PC/LANの双方から到達可能。
CMD ["npm", "run", "start"]
