#!/usr/bin/env bash
set -euo pipefail

# Pre-edit hook: proteger arquivos sensíveis de edição acidental
# Roda ANTES de Edit/Write/MultiEdit — BLOQUEIA com exit 2

# ------------------------------------------------------------------------------
# Dependencia critica: jq
# Este hook e de bloqueio. Se jq nao existir, o parsing do stdin falha
# silenciosamente e o hook libera qualquer edicao — inverte seu proposito.
# Bloquear explicitamente com mensagem acionavel.
# ------------------------------------------------------------------------------
if ! command -v jq &>/dev/null; then
    echo "BLOQUEADO: jq nao encontrado no PATH." >&2
    echo "Este hook de protecao de arquivos nao pode operar sem jq." >&2
    echo "Instalar jq antes de prosseguir: https://jqlang.github.io/jq/" >&2
    exit 2
fi

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# Lockfiles protegidos
PROTECTED_LOCKFILES=(
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
)

for PROTECTED in "${PROTECTED_LOCKFILES[@]}"; do
    if [ "$BASENAME" = "$PROTECTED" ]; then
        echo "BLOQUEADO: $FILE_PATH e um lockfile protegido. Editar manualmente." >&2
        exit 2
    fi
done

# Bloquear edição em diretórios protegidos
# Normalizar separadores para casar paths Windows (backslash) e POSIX
FILE_PATH_NORM="${FILE_PATH//\\//}"
if [[ "$FILE_PATH_NORM" == *"/.git/"* ]] || [[ "$FILE_PATH_NORM" == ".git/"* ]]; then
    echo "BLOQUEADO: Nao editar arquivos dentro de .git/" >&2
    exit 2
fi

exit 0
