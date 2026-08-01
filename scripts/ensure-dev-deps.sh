#!/bin/sh
set -e

LOCKFILE="pnpm-lock.yaml"
STAMP_FILE="node_modules/.pnpm-lock.sha256"

CURRENT_SUM="$(sha256sum "$LOCKFILE" | awk '{print $1}')"
SAVED_SUM=""

if [ -f "$STAMP_FILE" ]; then
  SAVED_SUM="$(cat "$STAMP_FILE")"
fi

if [ ! -d node_modules/.pnpm ] || [ "$CURRENT_SUM" != "$SAVED_SUM" ]; then
  CI=true pnpm install --frozen-lockfile --config.confirmModulesPurge=false
  mkdir -p "$(dirname "$STAMP_FILE")"
  printf '%s' "$CURRENT_SUM" > "$STAMP_FILE"
fi

pnpm prisma:generate
exec pnpm start:dev:docker
