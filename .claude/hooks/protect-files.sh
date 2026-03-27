#!/usr/bin/env bash
set -euo pipefail

# Pre-edit hook: proteger arquivos sensíveis de edição acidental
# Roda ANTES de Edit/Write/MultiEdit — BLOQUEIA com exit 2

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# Bloquear TODOS os arquivos .env* (cobre .env, .env.local, .env.production,
# .env.development, .env.test, .env.staging, .env.secrets, etc.)
if [[ "$BASENAME" == .env* ]]; then
    echo "BLOQUEADO: $FILE_PATH e um arquivo de ambiente (.env*). Editar manualmente." >&2
    exit 2
fi

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
if [[ "$FILE_PATH" == *".git/"* ]]; then
    echo "BLOQUEADO: Nao editar arquivos dentro de .git/" >&2
    exit 2
fi

exit 0
