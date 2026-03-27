#!/usr/bin/env bash
set -euo pipefail

# Loop detection hook: detecta edição repetida no mesmo arquivo
# Roda após Edit/Write/MultiEdit — avisa via systemMessage quando
# o mesmo arquivo é editado muitas vezes na mesma sessão
# NÃO bloqueia, apenas injeta aviso como contexto

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")
JSON_SESSION=$(jq -r '.session_id // empty' 2>/dev/null || echo "")
SESSION_ID="${JSON_SESSION:-${CLAUDE_SESSION_ID:-default}}"

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

THRESHOLD=8
COUNT_DIR="/tmp/claude-loop-detection"
mkdir -p "$COUNT_DIR"

# Arquivo de contagem por sessão
COUNT_FILE="${COUNT_DIR}/${SESSION_ID}.counts"

# Sanitizar path para usar como chave (substituir / por _)
FILE_KEY=$(echo "$FILE_PATH" | tr '/' '_')

# Ler contagem atual
CURRENT_COUNT=0
if [ -f "$COUNT_FILE" ]; then
    CURRENT_COUNT=$(grep -c "^${FILE_KEY}$" "$COUNT_FILE" 2>/dev/null || echo "0")
fi

# Incrementar contagem
echo "$FILE_KEY" >> "$COUNT_FILE"
CURRENT_COUNT=$((CURRENT_COUNT + 1))

# Se passou do threshold, emitir aviso
if [ "$CURRENT_COUNT" -eq "$THRESHOLD" ] || [ "$CURRENT_COUNT" -eq $((THRESHOLD + 5)) ]; then
    echo "{\"systemMessage\": \"[LOOP DETECTION] O arquivo ${FILE_PATH} foi editado ${CURRENT_COUNT} vezes nesta sessao. Isso pode ser iteracao legitima ou repeticao improdutiva. Reavalie se ha nova evidencia, mudanca de estrategia ou necessidade de replanejamento via /plan.\"}"
fi

exit 0
