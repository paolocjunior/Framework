#!/usr/bin/env bash
set -euo pipefail

# health-check.sh — Validação de saúde do ambiente no início da sessão
# Evento: SessionStart (matcher: startup|resume)
# Não roda em /clear nem /compact — apenas no início real da sessão

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
ERRORS=""

# 1. jq instalado (todos os hooks dependem dele)
if ! command -v jq &>/dev/null; then
    ERRORS="${ERRORS}CRITICO: jq nao instalado. Hooks de validacao nao funcionarao. Instalar jq antes de prosseguir.\n"
fi

# 2. Estrutura .claude/ completa
REQUIRED_DIRS=("hooks" "rules" "commands" "runtime")
for DIR in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$PROJECT_DIR/.claude/$DIR" ]; then
        ERRORS="${ERRORS}AVISO: Diretorio .claude/${DIR}/ ausente.\n"
    fi
done

# 3. settings.json existe e é JSON válido
if [ -f "$PROJECT_DIR/.claude/settings.json" ]; then
    if command -v jq &>/dev/null; then
        if ! jq empty "$PROJECT_DIR/.claude/settings.json" 2>/dev/null; then
            ERRORS="${ERRORS}ERRO: .claude/settings.json nao e JSON valido.\n"
        fi
    fi
else
    ERRORS="${ERRORS}AVISO: .claude/settings.json nao encontrado.\n"
fi

# 4. Hooks referenciados existem e têm permissão de execução
if command -v jq &>/dev/null && [ -f "$PROJECT_DIR/.claude/settings.json" ]; then
    HOOKS=$(jq -r '.. | .command? // empty' "$PROJECT_DIR/.claude/settings.json" 2>/dev/null | tr -d '\r' || true)
    for HOOK_CMD in $HOOKS; do
        RESOLVED="${HOOK_CMD/\$CLAUDE_PROJECT_DIR/$PROJECT_DIR}"
        if [ ! -f "$RESOLVED" ]; then
            ERRORS="${ERRORS}ERRO: Hook referenciado nao existe: ${HOOK_CMD}\n"
        elif [ ! -x "$RESOLVED" ]; then
            ERRORS="${ERRORS}AVISO: Hook sem permissao de execucao: ${HOOK_CMD}\n"
        fi
    done
fi

# 5. Ledger existe
if [ ! -f "$PROJECT_DIR/.claude/runtime/execution-ledger.md" ]; then
    ERRORS="${ERRORS}INFO: execution-ledger.md nao encontrado. Copiar template do framework se necessario.\n"
fi

# 6. Profile-guard requer bash 4+
if [[ "${BASH_VERSINFO[0]}" -lt 4 ]]; then
    ERRORS="${ERRORS}AVISO: bash ${BASH_VERSION} detectado. profile-guard.sh requer bash 4.0+ para associative arrays.\n"
fi

# Emitir resultado apenas se houver problemas
if [ -n "$ERRORS" ]; then
    ERRORS_ESCAPED=$(printf '%b' "$ERRORS" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"systemMessage\": \"[HEALTH CHECK] ${ERRORS_ESCAPED}\"}"
fi

exit 0
