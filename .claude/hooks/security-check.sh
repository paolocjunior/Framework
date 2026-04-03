#!/usr/bin/env bash
set -euo pipefail

# security-check.sh — Detecção de secrets hardcoded e código inseguro
# OBRIGATÓRIO: roda sempre, em qualquer perfil. NÃO usa profile-guard.
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

# --- Python ---
if [ "$EXTENSION" = "py" ]; then
    # Checar secrets hardcoded
    SECRET_HIT=$(grep -nE '(password|secret|token|api_key)\s*=\s*["'"'"'][^"'"'"']{8,}' "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$SECRET_HIT" ]; then
        ALERTAS="${ALERTAS}SECRET HARDCODED: ${FILE_PATH} - possivel credencial exposta\n"
    fi

    # Checar eval() e exec()
    EVAL_HIT=$(grep -nE '\b(eval|exec)\s*\(' "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$EVAL_HIT" ]; then
        ALERTAS="${ALERTAS}CODIGO INSEGURO: ${FILE_PATH} - uso de eval()/exec() detectado\n"
    fi

    # Checar f-string SQL injection
    FSQL_HIT=$(grep -nE 'f"(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b|f'"'"'(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b' "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$FSQL_HIT" ]; then
        ALERTAS="${ALERTAS}SQL INJECTION: ${FILE_PATH} - f-string com SQL detectado. Usar prepared statements/parameterized queries\n"
    fi
fi

# --- JavaScript/TypeScript ---
if [[ "$EXTENSION" =~ ^(js|ts|jsx|tsx)$ ]]; then
    # Checar secrets hardcoded
    SECRET_HIT=$(grep -nE '(password|secret|token|apiKey|API_KEY)\s*[:=]\s*["'"'"'][^"'"'"']{8,}' "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$SECRET_HIT" ]; then
        ALERTAS="${ALERTAS}SECRET HARDCODED: ${FILE_PATH} - possivel credencial exposta\n"
    fi

    # Checar eval(), exec() e Function()
    EVAL_HIT=$(grep -nE '\b(eval|exec|Function)\s*\(' "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$EVAL_HIT" ]; then
        ALERTAS="${ALERTAS}CODIGO INSEGURO: ${FILE_PATH} - uso de eval()/exec()/Function() detectado\n"
    fi
fi

# Se encontrou alertas, emitir JSON com systemMessage
if [ -n "$ALERTAS" ]; then
    ALERTAS_ESCAPED=$(printf '%b' "$ALERTAS" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"systemMessage\": \"[SECURITY CHECK] ${ALERTAS_ESCAPED}\"}"
fi

exit 0
