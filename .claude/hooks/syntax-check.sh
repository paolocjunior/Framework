#!/usr/bin/env bash
set -euo pipefail

# syntax-check.sh — Validação de sintaxe
# Roda após Edit/Write/MultiEdit — reporta via JSON systemMessage

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

EXTENSION="${FILE_PATH##*.}"
ALERTAS=""

# --- Python: checar syntax via py_compile ---
if [ "$EXTENSION" = "py" ]; then
    SYNTAX_ERR=$(python3 -c "
import sys, py_compile
try:
    py_compile.compile(sys.argv[1], doraise=True)
except py_compile.PyCompileError as e:
    print(str(e))
" "$FILE_PATH" 2>&1 || true)

    if [ -n "$SYNTAX_ERR" ]; then
        ALERTAS="${ALERTAS}ERRO SINTAXE: ${FILE_PATH} - ${SYNTAX_ERR}\n"
    fi
fi

# Se encontrou alertas, emitir JSON com systemMessage
if [ -n "$ALERTAS" ]; then
    ALERTAS_ESCAPED=$(printf '%b' "$ALERTAS" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"systemMessage\": \"[SYNTAX CHECK] ${ALERTAS_ESCAPED}\"}"
fi

exit 0
