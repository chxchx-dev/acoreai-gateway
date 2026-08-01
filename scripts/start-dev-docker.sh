#!/bin/sh
set -e

cleanup() {
  kill "$TSC_PID" "$NODE_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

pnpm exec tsc -p tsconfig.build.json --watch --preserveWatchOutput &
TSC_PID=$!

while [ ! -f dist/src/main.js ]; do
  sleep 1
done

NODE_PATH=dist node --watch dist/src/main.js &
NODE_PID=$!

wait "$TSC_PID" "$NODE_PID"
