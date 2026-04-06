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

WARNING_THRESHOLD=3
BLOCK_THRESHOLD=5
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

# 3a edicao: warning (alerta sem bloqueio)
if [ "$CURRENT_COUNT" -eq "$WARNING_THRESHOLD" ]; then
    echo "{\"systemMessage\": \"[LOOP WARNING] O arquivo ${FILE_PATH} foi editado ${CURRENT_COUNT} vezes nesta sessao. Atencao: possivel loop de correcao. Verificar se ha nova evidencia ou necessidade de mudar estrategia antes de continuar.\"}"
fi

# 5a edicao: bloqueio (parar e diagnosticar)
if [ "$CURRENT_COUNT" -eq "$BLOCK_THRESHOLD" ]; then
    echo "{\"systemMessage\": \"[LOOP BLOCK] O arquivo ${FILE_PATH} foi editado ${CURRENT_COUNT} vezes nesta sessao. PARAR e produzir diagnostico de causa-raiz antes de continuar. Nao fazer mais correcoes cegas. Considerar /plan para replanejar a abordagem.\"}"
fi

# Apos bloqueio, avisar a cada 5 edicoes adicionais
if [ "$CURRENT_COUNT" -gt "$BLOCK_THRESHOLD" ] && [ $(( (CURRENT_COUNT - BLOCK_THRESHOLD) % 5 )) -eq 0 ]; then
    echo "{\"systemMessage\": \"[LOOP PERSISTENT] O arquivo ${FILE_PATH} foi editado ${CURRENT_COUNT} vezes nesta sessao. O diagnostico de causa-raiz ja deveria ter sido feito. Parar imediatamente.\"}"
fi

exit 0
