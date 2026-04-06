#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# pre-implementation-gate.sh
# PreToolUse hook: bloqueia criação de código-fonte sem /plan-review aprovado
#
# Lógica:
#   1. Se não é projeto gerenciado (sem ledger) → permite tudo
#   2. Se o marker .plan-approved existe → permite tudo
#   3. Se é arquivo de código-fonte → BLOQUEIA (exit 2)
#   4. Se é config/docs/framework → permite
#
# O /plan-review cria o marker quando aprova o plano.
# O /plan remove o marker antigo ao iniciar novo ciclo.
# Escape hatch: touch .claude/runtime/.plan-approved
# ==============================================================================

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
RUNTIME_DIR="$PROJECT_DIR/.claude/runtime"

# --------------------------------------------------------------------------
# 1. Projeto gerenciado? (tem ledger = passou por /spec-check)
# --------------------------------------------------------------------------
LEDGER="$RUNTIME_DIR/execution-ledger.md"
if [ ! -f "$LEDGER" ]; then
    # Não é projeto gerenciado — permite tudo
    exit 0
fi

# --------------------------------------------------------------------------
# 2. Plan aprovado? (marker criado pelo /plan-review)
# --------------------------------------------------------------------------
PLAN_APPROVED="$RUNTIME_DIR/.plan-approved"
if [ -f "$PLAN_APPROVED" ]; then
    # Plano aprovado — permite tudo
    exit 0
fi

# --------------------------------------------------------------------------
# 3. Extrair path do arquivo sendo editado
# --------------------------------------------------------------------------
FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# --------------------------------------------------------------------------
# 4. Permitir arquivos que NÃO são código-fonte
#    (configs, docs, framework, specs, ledger, etc.)
# --------------------------------------------------------------------------

# Sempre permitir edições dentro de .claude/ (framework, hooks, runtime)
case "$FILE_PATH" in
    *".claude/"*) exit 0 ;;
esac

# Permitir por extensão — configs, docs, infra
BASENAME=$(basename "$FILE_PATH")
EXT="${BASENAME##*.}"

ALLOWED_EXTENSIONS="md json yaml yml toml cfg ini env lock"
for ALLOWED in $ALLOWED_EXTENSIONS; do
    if [ "$EXT" = "$ALLOWED" ]; then
        exit 0
    fi
done

# Permitir arquivos de infra sem extensão ou com nomes conhecidos
case "$BASENAME" in
    Dockerfile|Dockerfile.*) exit 0 ;;
    docker-compose*) exit 0 ;;
    Makefile|Procfile) exit 0 ;;
    .gitignore|.gitattributes) exit 0 ;;
    .env|.env.*) exit 0 ;;
    AGENTS.md|CLAUDE.md|README.md) exit 0 ;;
esac

# --------------------------------------------------------------------------
# 5. Chegou aqui = arquivo de código-fonte em projeto gerenciado sem aprovação
# --------------------------------------------------------------------------
echo "BLOQUEADO: Codigo-fonte sem /plan-review aprovado." >&2
echo "" >&2
echo "O workflow exige /plan-review antes de implementar." >&2
echo "ExitPlanMode NAO substitui /plan-review." >&2
echo "" >&2
echo "Opcoes:" >&2
echo "  1. Rodar /plan-review para aprovar o plano" >&2
echo "  2. Escape hatch (projetos sem /plan):" >&2
echo "     touch $PLAN_APPROVED" >&2
exit 2
