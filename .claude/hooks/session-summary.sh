#!/usr/bin/env bash
set -euo pipefail

# session-summary.sh — Gera resumo da sessao ao parar o Claude
# Evento: Stop
#
# Contrato do payload Stop (oficialmente documentado em
# docs.claude.com/en/docs/claude-code/hooks#stop-input):
#   - session_id           — identificador da sessao
#   - stop_hook_active     — boolean para evitar loop infinito
#   - last_assistant_message — string, conteudo da ultima resposta de Claude
#   - transcript_path      — caminho para o JSONL completo (nao usado aqui)
#
# Este hook le last_assistant_message diretamente pois e o campo oficial
# do contrato. Nao ha necessidade de parsear transcript_path.
#
# Stop hooks NAO aceitam systemMessage no stdout — apenas {"decision": "block",
# "reason": "..."} ou ausencia de output. Este hook nao bloqueia o stop,
# entao nao emite nada no stdout. O artefato escrito em session-summaries/
# e o unico output observavel.

# Dependencia jq: se nao existe, nao ha como parsear o payload.
# Este hook nao e de bloqueio (Stop event), entao falha silenciosa com
# exit 0 e preserva comportamento normal de encerramento da sessao.
if ! command -v jq &>/dev/null; then
    exit 0
fi

# Ler JSON do stdin
INPUT=$(cat)

# Evitar loop infinito: se já está em stop hook, sair
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")
if [ "$STOP_ACTIVE" = "true" ]; then
    exit 0
fi

LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null || echo "")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SUMMARY_DIR="$PROJECT_DIR/.claude/runtime/session-summaries"
mkdir -p "$SUMMARY_DIR"
SUMMARY_FILE="$SUMMARY_DIR/latest.md"

# Truncar mensagem para resumo prático (~500 chars)
SUMMARY_CONTENT=""
if [ -n "$LAST_MSG" ]; then
    SUMMARY_CONTENT=$(echo "$LAST_MSG" | head -c 500)
fi

cat > "$SUMMARY_FILE" << EOF
# Session Summary — ${TIMESTAMP}

**Session ID:** ${SESSION_ID}

## Ultimo Contexto
${SUMMARY_CONTENT:-"(sem conteudo capturado)"}

## Proxima Sessao Deve
- Verificar execution-ledger.md para estado oficial do projeto
- Verificar pattern-registry.md para decisoes aprovadas
- Retomar de onde parou com base no contexto acima
EOF

# Stop hooks nao emitem systemMessage no stdout — sair limpo.
exit 0
