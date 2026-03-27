#!/usr/bin/env bash
# session-cleanup.sh — Cleanup leve em SessionEnd
# IMPORTANTE: SessionEnd tem timeout padrao de 1.5s. Manter operacoes minimas.
# Override via CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS se necessario.

# Limpar contadores de loop detection da sessao atual
SESSION_ID="${CLAUDE_SESSION_ID:-default}"
COUNT_FILE="/tmp/claude-loop-detection/${SESSION_ID}.counts"
[ -f "$COUNT_FILE" ] && rm -f "$COUNT_FILE"

exit 0
