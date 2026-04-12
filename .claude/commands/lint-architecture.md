---
description: Executar architecture linters declarados e produzir veredicto estruturado por exit code
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(sh:*), Bash(bash:*), Bash(find:*), Bash(test:*), Bash(stat:*), Bash(jq:*), Bash(cat:*), Bash(date:*), Bash(wc:*), Bash(timeout:*), Bash(node:*), Bash(python:*), Bash(rg:*), Bash(grep:*), Bash(mv:*)
---

## Carregar contexto (obrigatorio antes de qualquer outra acao)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de executar os linters:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Declarar no inicio do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`

---

## Proposito

Executor unico dos architecture linters declarados em `.claude/runtime/architecture-linters.json`. Cada linter e um comando shell que verifica um invariante arquitetural cross-file. O veredicto vem do **exit code** — exit 0 = pass, qualquer outro = fail.

Este command e analogo a `/sensors-run` (sensores) e `/behaviour-run` (behaviours). Os consumers downstream (`/ship-check`, `/contract-check`) sao read-only e **nunca** invocam este command automaticamente.

## Flags suportadas

- `--offline` — pula linters com `requires_network: true`
- `--only <id>` — executa apenas o linter com o id especificado
- `--skip <id>` — pula o linter com o id especificado
- `--phase <phase_id>` — executa apenas linters com `scope: phase` e `phase_id` correspondente, alem de todos os linters com `scope: global`

## Execucao

### Passo 1 — Localizar `architecture-linters.json`

Ler `.claude/runtime/architecture-linters.json`:

- **Ausente** → reportar `NO_LINTERS` e encerrar:
  > "Arquivo `.claude/runtime/architecture-linters.json` nao encontrado. O projeto nao declara architecture linters. Copiar `.claude/runtime/architecture-linters.template.json` para `architecture-linters.json` e declarar linters da stack."
- **Presente** → seguir para Passo 2.

### Passo 2 — Validar schema

Verificar via `jq empty` que o arquivo e JSON valido. Verificar presenca de `schema_version` e `linters[]`.

- Schema invalido → reportar erro e encerrar (nao executar nenhum linter com declaracao malformada).

### Passo 3 — Filtrar linters

Aplicar filtros na ordem:

1. Remover linters com `enabled: false`
2. Se `--only <id>` foi passado, manter apenas o linter com esse id
3. Se `--skip <id>` foi passado, remover o linter com esse id
4. Se `--offline` foi passado, marcar linters com `requires_network: true` como `skipped` com `skip_reason: "requires_network e --offline ativo"`
5. Se `--phase <phase_id>` foi passado, manter linters com `scope: global` (sempre rodam) + linters com `scope: phase` cujo `phase_id` casa com o argumento. Linters `scope: phase` com `phase_id` diferente sao `skipped` com `skip_reason: "phase_id nao casa com --phase"`

Validar cada linter restante:
- `timeout_seconds` presente? Se nao → `status: error`, `evidence: "linter missing required timeout_seconds"`. Nao executar.
- `scope: phase` sem `phase_id`? Se sim → `status: error`, `evidence: "scope phase requer phase_id"`. Nao executar.

### Passo 4 — Executar cada linter sequencialmente

Para cada linter que passou na filtragem:

1. Registrar `started_at` (ISO-8601 UTC)
2. Executar via `sh -c "<command>"` com:
   - Timeout: `timeout_seconds` declarado
   - Working dir: `working_dir` se declarado, senao raiz do projeto
3. Capturar:
   - `exit_code` do comando
   - `stdout + stderr` (ultimas 50 linhas como `output_tail`)
   - `duration_ms`
4. Determinar `status`:
   - Exit code 0 → `pass`
   - Exit code != 0 (dentro do timeout) → `fail`
   - Timeout estourado → `timeout`
   - Comando invalido / working_dir inexistente → `error`
5. Determinar `blocking`:
   - `true` se `status == fail` AND `severity == block`
   - `false` em todos os outros casos

### Passo 5 — Agregar veredicto

Calcular contagens:
- `total_linters` — total de linters declarados e habilitados
- `executed` — linters efetivamente executados (excluindo skipped e error pre-execucao)
- `skipped` — linters pulados por flag ou pre-condicao
- `passed` — linters com `status: pass`
- `failed` — linters com `status: fail`
- `blocking_failures` — linters com `blocking: true`

Aplicar regras de agregacao:
- `PASS` — todos executados passaram (ou os que falharam tem `severity: warn`)
- `FAIL` — pelo menos 1 linter falhou com `severity: block`
- `PARTIAL` — algum linter foi pulado e os executados passaram sem bloqueio
- `NO_LINTERS` — nenhum linter habilitado encontrado

### Passo 6 — Persistir resultado atomicamente

Escrever `.claude/runtime/architecture-linters-last-run.json` usando escrita atomica (tmp + mv):

1. Gerar `run_id` (timestamp ISO compactado)
2. Construir JSON completo com schema de `architecture-linters-last-run.json` (ver `.claude/rules/architecture-linters.md`)
3. Escrever em arquivo temporario `architecture-linters-last-run.json.tmp.$$`
4. Renomear atomicamente via `mv` para `architecture-linters-last-run.json`

### Passo 7 — Atualizar ledger

Registrar no `.claude/runtime/execution-ledger.md`:
- Veredicto do run (PASS/FAIL/PARTIAL)
- Contagem de linters executados/passados/falhados
- Linters bloqueantes que falharam (se houver)
- Timestamp

### Passo 8 — Reportar ao usuario

Output estruturado em markdown:

```markdown
# /lint-architecture — Veredicto

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Veredicto: [PASS | FAIL | PARTIAL | NO_LINTERS]

- Run ID: [id]
- Started at: [timestamp]
- Duration: [ms]
- Total: N | Executados: X | Passaram: Y | Falharam: Z | Pulados: W
- Blocking failures: N

## Resultados

| ID | Categoria | Status | Exit code | Severity | Duracao | Evidencia |
|----|-----------|--------|-----------|----------|---------|-----------|
| lint-01-... | circular-deps | pass | 0 | block | 1.2s | (limpo) |
| lint-02-... | layering | fail | 1 | block | 0.8s | src/screens/Home.tsx importa de database |
| lint-03-... | type-schema-match | skipped | — | block | — | linter desabilitado |

## Proximos passos

- Se FAIL: [lista de linters bloqueantes + output_tail para diagnostico]
- Se PASS: [resultado pronto para consumo por /ship-check e /contract-check]
- Se PARTIAL: [linters pulados listados + recomendacao de re-executar sem flags restritivas]
```

## Regras

1. **Read-only no ambiente.** O comando do linter **nao deve** modificar arquivos do projeto. `/lint-architecture` nao enforce isso mecanicamente (impossivel em caso geral), mas violacao invalida a evidencia.
2. **Sem side-effects em artefatos do framework.** O comando do linter nao pode escrever em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/`.
3. **Exit code e unica autoridade.** Nenhuma reinterpretacao de stdout/stderr. Exit 0 = pass, qualquer outro = fail.
4. **Execucao sequencial.** Linters rodam um apos o outro, nao em paralelo. Simplicidade e determinismo sobre velocidade.
5. **Escrita atomica do resultado.** O last-run e escrito via tmp + mv para evitar leitura de arquivo parcial por consumers.
6. **Este command e o unico executor.** `/ship-check` e `/contract-check` **nunca** invocam `/lint-architecture`. Consumers sao read-only absolutos.
