# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20.19.5-alpine3.22 AS builder

RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma:generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# ── Production ───────────────────────────────────────────────────────────────
FROM node:20.19.5-alpine3.22 AS production

RUN apk add --no-cache openssl
RUN npm install -g pnpm
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

ENV NODE_ENV=production

# Instalar dependencias de producción (incluye prisma CLI para migraciones)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Schema y migraciones necesarios para prisma migrate deploy
COPY prisma ./prisma

# Generar Prisma client en la imagen de producción
RUN pnpm prisma:generate

# Código compilado
COPY --from=builder /app/dist ./dist

# Entrypoint
COPY docker/gateway/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
RUN chown -R app:app /app

USER app

EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4005/health/ready || exit 1

ENTRYPOINT ["./entrypoint.sh"]
