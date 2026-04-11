#!/usr/bin/env bash
# session-cleanup.sh — Cleanup leve em SessionEnd
# IMPORTANTE: Claude Code limita hooks de SessionEnd a ~1.5s (envelope global
# controlado por CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS). Qualquer trabalho
# neste hook deve ser O(ms), nao O(s).

# Limpar contadores de loop detection da sessao atual
SESSION_ID="${CLAUDE_SESSION_ID:-default}"
COUNT_FILE="/tmp/claude-loop-detection/${SESSION_ID}.counts"
[ -f "$COUNT_FILE" ] && rm -f "$COUNT_FILE"

exit 0
