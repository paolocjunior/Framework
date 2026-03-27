#!/usr/bin/env bash
# profile-guard.sh — Helper para controle de perfil de hook
#
# Controla quais hooks executam baseado em CLAUDE_HOOK_PROFILE:
#   minimal=1  → apenas security (este helper NÃO é usado em security-check.sh)
#   standard=2 → syntax + quality (default)
#   strict=3   → design + mock-determinism
#
# Uso em cada hook:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "$SCRIPT_DIR/lib/profile-guard.sh"
#   require_profile "standard"
#
# Requer bash 4.0+ para associative arrays

if [[ "${BASH_VERSINFO[0]}" -lt 4 ]]; then
    echo "{\"systemMessage\": \"[PROFILE-GUARD] ERRO: bash 4.0+ requerido. Versao atual: ${BASH_VERSION}\"}"
    exit 1
fi

declare -A PROFILE_LEVELS=( [minimal]=1 [standard]=2 [strict]=3 )

require_profile() {
    local REQUIRED="$1"
    local CURRENT="${CLAUDE_HOOK_PROFILE:-standard}"
    local REQUIRED_LEVEL="${PROFILE_LEVELS[$REQUIRED]:-2}"
    local CURRENT_LEVEL="${PROFILE_LEVELS[$CURRENT]:-2}"
    if (( CURRENT_LEVEL < REQUIRED_LEVEL )); then
        exit 0
    fi
}
