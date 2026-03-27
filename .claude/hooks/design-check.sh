#!/usr/bin/env bash
set -euo pipefail

# design-check.sh — Validação de design system (hex hardcoded, paleta local)
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

    # 1. Hex hardcoded em telas/views (não em arquivos de theme/tokens/config)
    if [[ "$FILE_PATH" == *"/screens/"* || "$FILE_PATH" == *"/views/"* || "$FILE_PATH" == *"/pages/"* ]]; then
        HEX_COUNT=$(grep -cE "'#[0-9A-Fa-f]{3,8}'|\"#[0-9A-Fa-f]{3,8}\"" "$FILE_PATH" 2>/dev/null || echo "0")
        if [ "$HEX_COUNT" -gt 0 ]; then
            ALERTAS="${ALERTAS}DESIGN SYSTEM: ${FILE_PATH} - ${HEX_COUNT} cor(es) hex hardcoded. Usar tokens do theme em vez de cores literais em telas\n"
        fi
    fi

    # 2. Constantes de paleta de cor locais em telas (duplicação de theme)
    if [[ "$FILE_PATH" == *"/screens/"* || "$FILE_PATH" == *"/views/"* || "$FILE_PATH" == *"/pages/"* ]]; then
        LOCAL_PALETTE=$(grep -nE '^const\s+[A-Z_]*(ACCENT|COLORS|COLOR|PALETTE|TINT)\s*=' "$FILE_PATH" 2>/dev/null || true)
        if [ -n "$LOCAL_PALETTE" ]; then
            MATCH_COUNT=$(echo "$LOCAL_PALETTE" | wc -l | tr -d ' ')
            ALERTAS="${ALERTAS}PALETA LOCAL: ${FILE_PATH} - ${MATCH_COUNT} constante(s) de cor definida(s) localmente. Considerar mover para theme/tokens centralizado\n"
        fi
    fi
fi

# Se encontrou alertas, emitir JSON com systemMessage
if [ -n "$ALERTAS" ]; then
    ALERTAS_ESCAPED=$(printf '%b' "$ALERTAS" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"systemMessage\": \"[DESIGN CHECK] ${ALERTAS_ESCAPED}\"}"
fi

exit 0
