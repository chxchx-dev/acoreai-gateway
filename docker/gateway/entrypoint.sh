#!/bin/sh
set -e

echo "[acoreai-gateway] Aplicando migraciones de base de datos..."
pnpm exec prisma migrate deploy

echo "[acoreai-gateway] Iniciando servidor en puerto ${PORT:-4005}..."
export NODE_PATH=dist
exec node dist/src/main
