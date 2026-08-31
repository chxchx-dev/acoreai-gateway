#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
failures=0

require_file() {
  if [[ ! -f "$ROOT_DIR/$1" ]]; then
    echo "FALTA: $1"
    failures=$((failures + 1))
  fi
}

require_dir() {
  if [[ ! -d "$ROOT_DIR/$1" ]]; then
    echo "FALTA: $1/"
    failures=$((failures + 1))
  fi
}

for file in \
  AGENTS.md \
  CLAUDE.md \
  README.md \
  docs/README.md \
  docs/ARCHITECTURE.md \
  docs/RULES.md \
  docs/DECISIONS.md \
  docs/RISKS.md \
  docs/BACKLOG.md \
  docs/ai/PROJECT_STATE.md \
  docs/ai/DOCUMENTATION_MAP.md; do
  require_file "$file"
done

for dir in docs/ai/workflows docs/ai/agents; do
  require_dir "$dir"
done

for file in \
  docs/ai/workflows/FEATURE.md \
  docs/ai/workflows/BUGFIX.md \
  docs/ai/workflows/ARCHITECTURE_CHANGE.md \
  docs/ai/workflows/SECURITY_REVIEW.md \
  docs/ai/workflows/RELEASE.md \
  docs/ai/workflows/DOCS_SYNC.md \
  docs/ai/agents/architect.md \
  docs/ai/agents/implementer.md \
  docs/ai/agents/debugger.md \
  docs/ai/agents/reviewer.md \
  docs/ai/agents/security-reviewer.md; do
  require_file "$file"
done

if find "$ROOT_DIR" -type f \( -name '.env.example' -o -name '*.env.example' \) -not -path "$ROOT_DIR/.git/*" | grep -q .; then
  echo "FALTA: se encontró una plantilla de configuración retirada"
  failures=$((failures + 1))
fi

if rg -n --glob '*.md' --glob '!AGENT-GOVERNANCE-PLAYBOOK.md' '\.env([./`]|$)|env\.example' "$ROOT_DIR"; then
  echo "FALTA: la documentación activa contiene referencias a archivos de configuración local"
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  echo "Doctor: FALLÓ ($failures comprobación(es))"
  exit 1
fi

echo "Doctor: OK"
