#!/usr/bin/env bash
set -euo pipefail

# session-summary.sh — Gera handoff operacional ao encerrar sessao (Stop event)
#
# Proposito: responder as 6 perguntas de continuidade entre sessoes:
#   1. onde estamos agora            — Current Status do ledger
#   2. o que esta ativo              — active.json + active-sprint.json
#   3. o que acabou de acontecer     — ultima linha com data ISO-8601 no ledger
#   4. o que falta fazer em seguida  — Open Items do ledger (max 3)
#   5. o que esta bloqueando         — Blockers do ledger (max 3)
#   6. qual artefato e a fonte de verdade — citacao explicita do trio
#
# Principios (ver .claude/rules/state-sync.md):
#   - Read-only estrito: le ledger, active.json, active-sprint.json do disco.
#     Nunca escreve em nenhum deles.
#   - Subordinado ao trio (ledger > snapshot > MEMORY.md). Cada secao cita a
#     fonte. O handoff nao e fonte de verdade — e view derivada sobrescrevivel.
#   - Degradacao graciosa: qualquer arquivo ausente ou vazio vira "projeto sem
#     estado previo" / "nenhum evento registrado" / "nenhum bloqueio ativo".
#   - Sem prose livre: cada secao e estruturada, limitada em bullets.
#     Sem copy-paste do ledger.
#
# Contrato do Stop hook (docs.claude.com/en/docs/claude-code/hooks#stop-input):
#   - Input stdin: {session_id, stop_hook_active, last_assistant_message, transcript_path}
#   - Output stdout: silencio OU {"decision": "block", "reason": "..."}
#   - Este hook nao bloqueia: sem output stdout, exit 0.
#   - Guard contra loop infinito via stop_hook_active.
#   - Timestamp em ISO-8601 UTC (alinhado com sensors/behaviours/contracts).
#
# Parser do ledger e intencionalmente minimo:
#   - awk por cabecalho de secao (## Current Status, ## Open Items, ## Blockers)
#   - grep -oE para regex de data ISO-8601
#   - jq para ponteiros JSON
#   - Ledgers fora do template do framework podem gerar fallback textual.
#     Esta e primeira versao — nao pretende ser AST completo de markdown.

# ---- Guards ----

# Guard 1: jq disponivel (hook nao e de bloqueio, falha silenciosa)
if ! command -v jq &>/dev/null; then
    exit 0
fi

# Guard 2: ler stdin
INPUT=$(cat)

# Guard 3: nao re-executar em loop
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")
if [ "$STOP_ACTIVE" = "true" ]; then
    exit 0
fi

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LEDGER="$PROJECT_DIR/.claude/runtime/execution-ledger.md"
ACTIVE_PHASE_FILE="$PROJECT_DIR/.claude/runtime/contracts/active.json"
ACTIVE_SPRINT_FILE="$PROJECT_DIR/.claude/runtime/contracts/active-sprint.json"
SUMMARY_DIR="$PROJECT_DIR/.claude/runtime/session-summaries"
SUMMARY_FILE="$SUMMARY_DIR/latest.md"

mkdir -p "$SUMMARY_DIR"

# ---- Helpers de leitura (read-only) ----

# Ler campo JSON com fallback
read_json_field() {
    local file="$1"
    local filter="$2"
    local fallback="$3"
    if [ ! -f "$file" ]; then
        echo "$fallback"
        return
    fi
    local value
    value=$(jq -r "$filter // empty" "$file" 2>/dev/null || echo "")
    if [ -z "$value" ] || [ "$value" = "null" ]; then
        echo "$fallback"
    else
        echo "$value"
    fi
}

# Extrair bloco de secao do ledger (entre "## HEADER" e proximo "## ")
extract_section() {
    local ledger="$1"
    local header="$2"
    [ ! -f "$ledger" ] && return 0
    awk -v hdr="^## $header" '
        $0 ~ hdr {flag=1; next}
        /^## / {flag=0}
        flag' "$ledger" 2>/dev/null || true
}

# Secao 1: onde estamos agora
get_where_we_are() {
    if [ ! -f "$LEDGER" ]; then
        echo "projeto sem estado previo (ledger ausente)"
        return
    fi
    local block
    block=$(extract_section "$LEDGER" "Current Status" | grep -E '^- ' || true)
    if [ -z "$block" ]; then
        echo "projeto sem estado previo (ledger vazio)"
        return
    fi
    local active_gate
    active_gate=$(echo "$block" | grep -vE 'NOT STARTED|NOT_STARTED' | head -1 | sed 's/^- //' || true)
    if [ -z "$active_gate" ]; then
        echo "nenhum gate iniciado (todos em NOT STARTED)"
    else
        echo "$active_gate"
    fi
}

# Secao 2: o que esta ativo
get_active_phase() {
    read_json_field "$ACTIVE_PHASE_FILE" ".active_phase_id" "nenhuma fase ativa"
}

get_active_sprint() {
    read_json_field "$ACTIVE_SPRINT_FILE" ".active_sprint_id" "nenhum sprint ativo"
}

get_active_contract() {
    read_json_field "$ACTIVE_PHASE_FILE" ".active_contract_path" "—"
}

# Secao 3: o que acabou de acontecer (ultima linha com data ISO-8601)
get_last_event() {
    if [ ! -f "$LEDGER" ]; then
        echo "nenhum evento registrado (ledger ausente)"
        return
    fi
    local dates
    dates=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9:]+Z?)?' "$LEDGER" 2>/dev/null || true)
    if [ -z "$dates" ]; then
        echo "nenhum evento registrado"
        return
    fi
    local max_date
    max_date=$(echo "$dates" | sort -r | head -1 || true)
    if [ -z "$max_date" ]; then
        echo "nenhum evento registrado"
        return
    fi
    local line
    line=$(grep -n -F "$max_date" "$LEDGER" 2>/dev/null | head -1 || true)
    if [ -z "$line" ]; then
        echo "nenhum evento registrado"
        return
    fi
    echo "$line" | sed 's/^[0-9]*://' | awk '{print substr($0, 1, 120)}'
}

# Secao 4: o que falta fazer (Open Items max 3)
get_open_items() {
    if [ ! -f "$LEDGER" ]; then
        echo "sem itens abertos (ledger ausente)"
        return
    fi
    local block
    block=$(extract_section "$LEDGER" "Open Items" \
        | grep -E '^\|' \
        | tail -n +3 \
        | head -3 || true)
    if [ -z "$block" ]; then
        echo "sem itens abertos"
        return
    fi
    echo "$block"
}

# Secao 5: o que esta bloqueando (Blockers max 3)
get_blockers() {
    if [ ! -f "$LEDGER" ]; then
        echo "nenhum bloqueio ativo (ledger ausente)"
        return
    fi
    local block
    block=$(extract_section "$LEDGER" "Blockers" \
        | grep -E '^\|' \
        | tail -n +3 \
        | head -3 || true)
    if [ -z "$block" ]; then
        echo "nenhum bloqueio ativo"
        return
    fi
    echo "$block"
}

# ---- Coleta de dados (nenhuma escrita parcial) ----

WHERE_WE_ARE=$(get_where_we_are)
ACTIVE_PHASE=$(get_active_phase)
ACTIVE_SPRINT=$(get_active_sprint)
ACTIVE_CONTRACT=$(get_active_contract)
LAST_EVENT=$(get_last_event)
OPEN_ITEMS=$(get_open_items)
BLOCKERS=$(get_blockers)

# ---- Escrever handoff (overwrite atomico) ----
#
# Padrao: escrever em arquivo auxiliar no mesmo diretorio e renomear via mv.
# rename(2) e atomico por contrato POSIX dentro do mesmo filesystem, entao
# consumidores (ex: /status-check) nunca observam latest.md parcial ou
# truncado, mesmo se o hook for interrompido (SIGKILL, disk full, OOM) no
# meio do heredoc. O trap garante limpeza do .tmp se o cat falhar antes do mv.

TMP_FILE="${SUMMARY_FILE}.tmp.$$"
trap 'rm -f "$TMP_FILE"' EXIT

cat > "$TMP_FILE" << EOF
# Session Handoff — ${TIMESTAMP}

**Session ID:** ${SESSION_ID}
**Generated by:** session-summary.sh (Stop hook, read-only)
**Sources consulted:** execution-ledger.md, contracts/active.json, contracts/active-sprint.json

---

## 1. Onde estamos agora
${WHERE_WE_ARE}
→ Fonte: \`.claude/runtime/execution-ledger.md\` (Current Status)

## 2. O que esta ativo
- **Phase:** ${ACTIVE_PHASE}
- **Sprint:** ${ACTIVE_SPRINT}
- **Contrato:** ${ACTIVE_CONTRACT}
→ Fontes: \`.claude/runtime/contracts/active.json\`, \`.claude/runtime/contracts/active-sprint.json\`

## 3. O que acabou de acontecer
${LAST_EVENT}
→ Fonte: \`.claude/runtime/execution-ledger.md\` (ultima linha com timestamp ISO-8601)

## 4. O que falta fazer em seguida
${OPEN_ITEMS}
→ Fonte: \`.claude/runtime/execution-ledger.md\` (Open Items, max 3)

## 5. O que esta bloqueando
${BLOCKERS}
→ Fonte: \`.claude/runtime/execution-ledger.md\` (Blockers, max 3)

## 6. Qual artefato e a fonte de verdade
Hierarquia de verdade (ver \`.claude/rules/state-sync.md\`):
1. \`.claude/runtime/execution-ledger.md\` — estado oficial e completo
2. \`memory/project_spec-status.md\` — snapshot resumido
3. \`memory/MEMORY.md\` — indice de ponteiros

**Regra:** este handoff e subordinado ao trio. Em caso de divergencia, o ledger prevalece. Este arquivo e sobrescrito a cada Stop e nao e fonte de verdade para decisao alguma.
EOF

# Rename atomico: substitui latest.md pelo tmp. Se mv falhar, set -e propaga
# o erro e o trap EXIT limpa o tmp. Se mv suceder, limpar o trap para nao
# tentar remover um arquivo que ja nao existe mais.
mv "$TMP_FILE" "$SUMMARY_FILE"
trap - EXIT

# Stop hooks nao emitem systemMessage no stdout — sair limpo.
exit 0
