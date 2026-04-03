#!/usr/bin/env bash
set -euo pipefail

# quality-check.sh — Contagem de TODO/FIXME/HACK/XXX
# Roda após Edit/Write/MultiEdit — reporta via JSON systemMessage

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

ALERTAS=""

# --- Geral (todas as linguagens) ---
TODO_HIT=$(grep -cnE '(TODO|FIXME|HACK|XXX):?' "$FILE_PATH" 2>/dev/null || true)
if [ -n "$TODO_HIT" ] && [ "$TODO_HIT" -gt 0 ]; then
    ALERTAS="${ALERTAS}INFO: ${FILE_PATH} contem ${TODO_HIT} TODO/FIXME pendente(s)\n"
fi

# Se encontrou alertas, emitir JSON com systemMessage
if [ -n "$ALERTAS" ]; then
    ALERTAS_ESCAPED=$(printf '%b' "$ALERTAS" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"systemMessage\": \"[QUALITY CHECK] ${ALERTAS_ESCAPED}\"}"
fi

exit 0
