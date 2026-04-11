#!/usr/bin/env bash
set -euo pipefail

# Loop detection hook: detecta edicao repetida no mesmo arquivo
# Roda apos Edit/Write/MultiEdit.
#
# Comportamento em camadas:
#   3a edicao: warning via systemMessage (soft, nao bloqueia)
#   5a edicao: block via decision:block (hard, forca diagnostico de causa-raiz)
#   apos 5a:   warning periodico a cada 5 edicoes adicionais
#
# O block da 5a edicao dispara apenas uma vez por arquivo por sessao
# (condicao -eq, nao -ge). Apos isso, o hook volta para modo warning
# para nao virar spam caso o agente/usuario decidam prosseguir
# conscientemente apos diagnosticar a causa-raiz.

# Dependencia critica: jq e usado tanto para parsear stdin quanto para
# gerar o JSON de decision:block. Sem jq, o hook nao consegue bloquear
# nem parsear. health-check.sh ja valida jq no SessionStart, mas reforcamos
# aqui para falha explicita em vez de comportamento silencioso.
# Fallback (exit 0) e aceitavel: sem jq, o comportamento e "nao detectar
# loop" — equivalente a nao ter o hook, que e o estado anterior ao V4.
# Nao e regressao de seguranca (diferente do pre-implementation-gate).
if ! command -v jq &>/dev/null; then
    echo "[LOOP DETECTION] jq nao encontrado — hook desabilitado nesta sessao" >&2
    exit 0
fi

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

# 5a edicao: block mecanico — forca o modelo a parar e diagnosticar causa-raiz.
# PostToolUse aceita {"decision":"block","reason":"..."} no stdout: a edicao ja
# ocorreu (PostToolUse e pos-execucao), mas o modelo e impedido de continuar o
# ciclo sem antes processar o reason. O exit 0 e intencional — o bloqueio e
# comunicado via JSON, nao via exit code. jq -n e usado para gerar o JSON com
# escape correto do reason (evita problemas com aspas e caracteres especiais).
# Ref: docs.claude.com/en/docs/claude-code/hooks#posttooluse-output
if [ "$CURRENT_COUNT" -eq "$BLOCK_THRESHOLD" ]; then
    REASON="[LOOP BLOCK] O arquivo ${FILE_PATH} foi editado ${CURRENT_COUNT} vezes nesta sessao. PARAR imediatamente. Nao fazer mais correcoes cegas. Produzir diagnostico de causa-raiz: o que mudou em cada tentativa, por que nao resolveu, qual e a premissa falha. Considerar /plan para replanejar a abordagem antes de tocar no arquivo novamente."
    jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
    exit 0
fi

# Apos o block da 5a edicao, o agente/usuario pode decidir prosseguir (por
# exemplo, o diagnostico identificou que o loop era falso positivo). Neste
# caso, o hook volta para modo warning a cada 5 edicoes adicionais, para nao
# virar spam mas tambem nao silenciar completamente. O block mecanico NAO
# re-dispara — ele e one-shot por arquivo por sessao.
if [ "$CURRENT_COUNT" -gt "$BLOCK_THRESHOLD" ] && [ $(( (CURRENT_COUNT - BLOCK_THRESHOLD) % 5 )) -eq 0 ]; then
    echo "{\"systemMessage\": \"[LOOP PERSISTENT] O arquivo ${FILE_PATH} foi editado ${CURRENT_COUNT} vezes nesta sessao. Se o diagnostico ja foi feito e o loop persiste, parar e escalar para o usuario.\"}"
fi

exit 0
