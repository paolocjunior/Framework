#!/usr/bin/env bash
set -euo pipefail

# mock-determinism.sh — Validação de determinismo em mocks e componentes
# Perfil: strict (não roda em minimal nem standard)
# Roda após Edit/Write/MultiEdit — reporta via JSON systemMessage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/profile-guard.sh"
require_profile "strict"

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

EXTENSION="${FILE_PATH##*.}"
ALERTAS=""

# --- JavaScript/TypeScript apenas ---
if [[ "$EXTENSION" =~ ^(js|ts|jsx|tsx)$ ]]; then

    # 1. Math.random() em arquivos de mock/fixture (dados não determinísticos)
    if [[ "$FILE_PATH" == *"/mocks/"* || "$FILE_PATH" == *"/fixtures/"* || "$FILE_PATH" == *"__mocks__"* ]]; then
        RANDOM_HIT=$(grep -nE 'Math\.random\s*\(' "$FILE_PATH" 2>/dev/null || true)
        if [ -n "$RANDOM_HIT" ]; then
            ALERTAS="${ALERTAS}MOCK NAO DETERMINISTICO: ${FILE_PATH} - Math.random() detectado. Mocks devem usar valores fixos para reprodutibilidade\n"
        fi
    fi

    # 2. new Date() sem argumento em telas/componentes (não reproduzível)
    if [[ "$FILE_PATH" == *"/screens/"* || "$FILE_PATH" == *"/components/"* || "$FILE_PATH" == *"/views/"* ]]; then
        RAW_DATE=$(grep -nE 'new Date\(\s*\)' "$FILE_PATH" 2>/dev/null || true)
        if [ -n "$RAW_DATE" ]; then
            ALERTAS="${ALERTAS}DATA NAO REPRODUZIVEL: ${FILE_PATH} - new Date() sem argumento detectado. Usar data mock centralizada ou argumento explicito\n"
        fi
    fi
fi

# Se encontrou alertas, emitir JSON com systemMessage
if [ -n "$ALERTAS" ]; then
    ALERTAS_ESCAPED=$(printf '%b' "$ALERTAS" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"systemMessage\": \"[MOCK DETERMINISM] ${ALERTAS_ESCAPED}\"}"
fi

exit 0
