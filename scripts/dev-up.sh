#!/bin/sh
set -e

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
DOCKER_DESKTOP_BIN="/Applications/Docker.app/Contents/Resources/bin"

if [ -d "$DOCKER_DESKTOP_BIN" ]; then
  export PATH="$DOCKER_DESKTOP_BIN:$PATH"
fi

cd "$PROJECT_DIR"

exec /usr/local/bin/docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up -d --build --remove-orphans
