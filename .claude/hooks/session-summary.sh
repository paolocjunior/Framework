#!/usr/bin/env bash
set -euo pipefail

# session-summary.sh — Gera resumo da sessão ao parar o Claude
# Evento: Stop
# Lê last_assistant_message via JSON stdin (não env var)
# Escreve em session-summaries/latest.md — NUNCA no execution-ledger.md

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

echo "{\"systemMessage\": \"[SESSION SUMMARY] Resumo salvo em .claude/runtime/session-summaries/latest.md\"}"
exit 0
