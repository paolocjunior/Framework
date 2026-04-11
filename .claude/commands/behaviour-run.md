---
description: Executar behaviours declarados em behaviours.json e produzir veredicto runtime estruturado (expected vs actual)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(jq:*), Bash(date:*), Bash(test:*), Bash(stat:*), Bash(sh:*), Bash(timeout:*), Bash(cat:*), Bash(ls:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de executar os behaviours:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Identificar a fase ativa no ledger e declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
3. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

## Propósito

Executar a camada de **behaviours** do projeto: verificações runtime que disparam uma ação declarada e comparam o resultado real contra uma expectativa declarada. Produz um `behaviours-last-run.json` estruturado que é consumido por `/contract-check`, `/ship-check` e `/verify-spec` como evidência runtime downstream dos phase contracts.

Este é o **único command que executa behaviours**. Consumers (`contract-check`, `ship-check`, `verify-spec`) são read-only absolutos — nunca disparam execução, apenas lêem `behaviours-last-run.json` e reportam.

Ver `.claude/rules/behaviour-harness.md` para o contrato completo (schema, staleness, hardening).

## Quando usar

- Após declarar ou editar `.claude/runtime/behaviours.json` — estabelecer baseline
- Após implementar código que satisfaz um acceptance criterion do phase contract com `verifiable_by: "behaviour"` — confirmar que a ação executa e produz o resultado esperado
- Antes de rodar `/contract-check` ou `/ship-check` — renovar evidência runtime para evitar staleness
- Após mudanças relevantes no código do produto que afetam comportamento observável — re-validar que as promessas continuam sendo cumpridas

## Pré-requisitos

- `.claude/runtime/behaviours.json` existente e com schema válido (`jq empty`)
- Ambiente capaz de executar `action.command` (shell, `timeout`, `jq` no PATH)
- Para behaviours com `requires.network: true`: conectividade externa (a menos que `--offline` seja passado)
- Para behaviours com `requires.database: true`: banco disponível (a menos que `--no-db` seja passado)
- Para behaviours com `requires.running_server: true`: servidor em execução no host/porta esperados (a menos que `--no-server` seja passado)

Se `behaviours.json` não existe, o command reporta:

> "Nenhum `behaviours.json` declarado em `.claude/runtime/`. Projeto em modo degradado (sem behaviours). Para adotar behaviours, copiar `behaviours.template.json` para `behaviours.json` e editar. O framework continua operando normalmente sem essa camada."

E produz um `behaviours-last-run.json` mínimo com `verdict: NO_BEHAVIOURS`.

## Flags aceitas

- `--offline` — pular behaviours com `requires.network: true` (status `skipped`, reason `"requires network, offline mode"`)
- `--no-db` — pular behaviours com `requires.database: true`
- `--no-server` — pular behaviours com `requires.running_server: true`
- `--only <id>` — executar apenas o behaviour com o id informado (pode ser repetido)
- `--skip <id>` — pular o behaviour com o id informado (pode ser repetido)
- `--phase <phase_id>` — executar apenas behaviours com `phase_id` igual ao informado

Flags combinam-se por intersecção (ex: `--offline --phase phase-02-auth` roda apenas behaviours da phase-02-auth que não exigem rede).

## Execução

### Passo 1 — Ler e validar `behaviours.json`

1. Ler `.claude/runtime/behaviours.json`
2. Se ausente → produzir `behaviours-last-run.json` com `verdict: NO_BEHAVIOURS`, reportar e encerrar
3. Validar `jq empty` — se inválido, abortar com erro explícito
4. Verificar `schema_version` — se não for `"1"`, avisar
5. Validar estrutura de cada behaviour:
   - `id`, `description`, `action.command`, `action.timeout_seconds`, `expectations[]` presentes
   - `id` único dentro do array
   - Expectations com `id` único dentro de cada behaviour
   - `on_fail` ∈ {`block`, `warn`}
6. Para cada behaviour inválido estruturalmente, registrar `status: error` com `evidence: "schema violation: <descrição>"` e **não executar** a ação

### Passo 2 — Aplicar filtros de flags

1. Se `--only` foi passado, filtrar behaviours para apenas os ids informados
2. Se `--skip` foi passado, remover ids informados
3. Se `--phase` foi passado, filtrar por `phase_id`
4. Behaviours com `enabled: false` são pulados silenciosamente (não aparecem em `results[]`)

### Passo 3 — Validar hardening de cada behaviour (pré-execução)

Para cada behaviour que vai executar, **antes de rodar o comando**:

1. **Timeout obrigatório**: se `action.timeout_seconds` ausente ou ≤ 0 → `status: error`, `evidence: "missing required action.timeout_seconds"`, não executar
2. **Timeout máximo sugerido 120s**: se > 120 → avisar no output "behaviour <id> tem timeout > 120s; provavelmente deveria ser sensor", mas prosseguir
3. **Working dir válido**: se `action.working_dir` está declarado e o path não existe ou é absoluto → `status: error`, `evidence: "invalid working_dir"`, não executar
4. **Comando não escreve em artefato do framework**: se `action.command` contém writes óbvios para `.claude/runtime/`, `.claude/rules/`, `.claude/commands/` → `status: error`, `evidence: "forbidden write to framework artifact"`, não executar
5. **Rede declarada**: se `action.command` contém sinais óbvios de rede (`curl`, `wget`, `http://`, `https://`) e `requires.network: false` → avisar "behaviour <id> tem comando de rede mas requires.network=false; tratando como local" (não bloquear, usuário é responsável)
6. **Binding com contract**: se `contract_ref` está declarado, validar que `phase_id` também está declarado (regra de escopo). Se não → `status: error`, `evidence: "contract_ref declared without phase_id"`

### Passo 4 — Avaliar requisitos de ambiente

Para cada behaviour aprovado no hardening:

1. Se `requires.network: true` e `--offline` foi passado → `status: skipped`, `skip_reason: "requires network, offline mode"`
2. Se `requires.database: true` e `--no-db` foi passado → `status: skipped`, `skip_reason: "requires database, --no-db flag"`
3. Se `requires.running_server: true` e `--no-server` foi passado → `status: skipped`, `skip_reason: "requires running server, --no-server flag"`
4. Caso contrário, prosseguir para execução

### Passo 5 — Executar `action.command` para cada behaviour

Para cada behaviour que passou todas as validações:

1. Resolver `working_dir` (default: raiz do projeto, resolvido via `CLAUDE_PROJECT_DIR` ou cwd)
2. Registrar `started_at` do behaviour
3. Executar via `timeout <timeout_seconds> sh -c "<command>"` no `working_dir`
4. Capturar:
   - `exit_code` (como `action_exit_code`)
   - `stdout` (string completa — a avaliação de expectations usa isso)
   - `stderr` (para evidência em caso de erro)
5. Registrar `duration_ms`
6. Se timeout estourou → registrar o behaviour com `status: error` para todas expectations que dependem do output, e `evidence: "action timed out after <N>s"`
7. Se exit code capturado normalmente → prosseguir para avaliar expectations

### Passo 6 — Avaliar cada expectation do behaviour

Para cada expectation em `expectations[]`:

#### `kind: exit_code`

- `actual` = valor de `action_exit_code`
- Comparar com `expected` (integer)
- `pass` se igual, `fail` se diferente
- Evidência: `"exit_code=<actual>, expected=<expected>"`

#### `kind: stdout_contains`

- Buscar `expected` (como substring OU regex se delimitado por `/.../`) no stdout
- `pass` se encontrado, `fail` se não
- `actual` = primeiro trecho não casante relevante (ou "" se stdout vazio)
- Evidência: `"match found at offset N"` ou `"pattern not found in <N> chars stdout, last 20 lines: ..."`

#### `kind: stdout_json_path`

- Parse stdout como JSON (via `jq`)
- Se parse falhar → `error`, evidência `"stdout is not valid JSON"`
- Aplicar filtro `jq` a partir de `target` (ex: `.data.status`)
- `actual` = valor retornado pelo filtro `jq`
- `pass` se `actual == expected`, `fail` se diferente
- Evidência: `"jq filter <target> returned <actual>, expected <expected>"`

#### `kind: file_content`

- Ler arquivo em `target` (path relativo à raiz do projeto)
- Se arquivo não existe → `error`, evidência `"target file missing: <target>"`
- Buscar `expected` (substring ou regex) no conteúdo
- `pass` se encontrado, `fail` se não
- Evidência: `"N matches"` ou `"pattern not found in <file> (<size> bytes)"`

#### `kind: file_exists_after`

- Verificar se `target` existe **após** a execução do comando
- `pass` se existe, `fail` se não
- Evidência: `"file exists: <size> bytes"` ou `"file missing after action: <target>"`

#### `kind: not_contains`

- Buscar `expected` no stdout
- `pass` se **não** encontrado, `fail` se encontrado
- `actual` = "" se pass, trecho encontrado se fail
- Evidência: `"forbidden pattern not found"` ou `"forbidden pattern found at offset N: <snippet>"`

### Passo 7 — Determinar status do behaviour

Regras de agregação por behaviour:

| Regra | Condição | Status |
|---|---|---|
| B1 | Toda expectation `required: true` em `pass`, e nenhuma em `error` | `pass` |
| B2 | Pelo menos 1 expectation `required: true` em `fail` | `fail` |
| B3 | Pelo menos 1 expectation `required: true` em `error` e nenhuma em `fail` | `error` |

Expectations com `required: false` que falham são reportadas mas não afetam o status do behaviour.

Construir o objeto result do behaviour:

```json
{
  "id": "b-01-login-success",
  "phase_id": "phase-02-auth",
  "contract_ref": "AC1",
  "type": "http",
  "status": "pass | fail | error | skipped",
  "duration_ms": N,
  "action_exit_code": N,
  "expectations_passed": ["E1", "E3"],
  "expectations_failed": [
    {
      "id": "E2",
      "kind": "stdout_contains",
      "expected": "...",
      "actual": "...",
      "evidence": "..."
    }
  ],
  "on_fail": "block",
  "blocking": true
}
```

`blocking` é `true` somente quando `status == fail` E `on_fail == block`.

### Passo 8 — Agregar verdict do run

Percorrer todos os results e calcular:

- `total_behaviours` = behaviours enabled
- `executed` = count de `status ∈ {pass, fail, error}`
- `skipped` = count de `status == skipped`
- `passed` = count de `status == pass`
- `failed` = count de `status ∈ {fail, error}`
- `blocking_failures` = count de `blocking == true`

Aplicar regras de agregação (primeira que casa decide):

| Regra | Condição | Verdict |
|---|---|---|
| V1 | `total_behaviours == 0` ou `behaviours.json` ausente | `NO_BEHAVIOURS` |
| V2 | `blocking_failures > 0` | `FAIL` |
| V3 | `skipped > 0` e demais passaram | `PARTIAL` |
| V4 | `executed > 0` e tudo ok | `PASS` |

### Passo 9 — Persistir `behaviours-last-run.json`

1. Construir o objeto final com schema_version, run_id, timestamps, contadores, verdict, blocking_failures e results[]
2. Usar `run_id` = timestamp ISO compactado (ex: `20260411T170500Z`)
3. Escrever em `.claude/runtime/behaviours-last-run.json` (sobrescrever se existe — este arquivo é efêmero, histórico não é preservado nesta versão)
4. Validar com `jq empty` após escrita

### Passo 10 — Atualizar ledger

Adicionar entrada na seção apropriada do `execution-ledger.md`:

```
### Behaviours Run — <ISO timestamp>
- Run ID: <run_id>
- Verdict: <PASS | FAIL | PARTIAL | NO_BEHAVIOURS>
- Total: <executed>/<total> executed, <skipped> skipped
- Passed: <passed>
- Failed: <failed> (blocking: <blocking_failures>)
- Duration: <duration_ms>ms
- Flags: <flags usadas ou "(none)">
```

Aplicar protocolo de `state-sync.md` se o run afeta o snapshot da fase.

### Passo 11 — Reportar ao usuário

Output estruturado em markdown. O verdict é **mecânico** — `expected vs actual` é autoridade, nenhuma reinterpretação textual.

```markdown
# /behaviour-run — Verdict Runtime

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Resumo

- **Verdict:** **[PASS | FAIL | PARTIAL | NO_BEHAVIOURS]**
- **Run ID:** [run_id]
- **Behaviours:** [executed]/[total] executados ([skipped] skipped)
- **Passed:** [passed]
- **Failed:** [failed] (blocking: [blocking_failures])
- **Duration:** [duration_ms]ms

## Behaviours executados

| ID | Phase | Contract Ref | Type | Status | Blocking | Evidência resumida |
|----|-------|--------------|------|--------|----------|--------------------|
| b-01-login-success | phase-02-auth | AC1 | http | pass | — | 3/3 expectations pass |
| b-02-logout | phase-02-auth | AC2 | http | fail | yes | E2 stdout_contains: expected "session cleared", actual "error: not logged in" |
| b-03-rate-limit | phase-02-auth | AC3 | http | skipped | — | requires network, --offline |

## Falhas bloqueantes (se houver)

### b-02-logout (phase-02-auth, AC2)

- **Status:** fail
- **Action exit code:** 1
- **Expectation falhada:** E2 (stdout_contains)
  - **Expected:** `session cleared`
  - **Actual:** `error: not logged in`
  - **Evidence:** exit_code=1, last 20 lines: ...

## Próximos passos

- Se verdict é `FAIL`: investigar cada falha bloqueante. Expected vs actual dá diagnóstico direto.
- Se verdict é `PARTIAL` por skipped: rodar novamente sem flags restritivas (ex: remover `--offline`) para completar a cobertura
- Se verdict é `PASS`: evidência runtime está fresca. `/contract-check` e `/ship-check` podem consumir `behaviours-last-run.json` sem reportar staleness
- Se verdict é `NO_BEHAVIOURS`: projeto não declara behaviours. Para adotar, copiar `behaviours.template.json` para `behaviours.json` e editar

## Invariantes preservadas

- `behaviours.json` **não** foi modificado
- Phase contract **não** foi modificado
- Sprint contracts **não** foram modificados
- Única escrita: `.claude/runtime/behaviours-last-run.json` + entrada no ledger
```

## Regras

1. **Expected vs actual é autoridade.** Nenhuma expectation tem verdict baseado em interpretação textual. Comparação é mecânica e determinística.
2. **Timeout em `action.command` é bloqueante.** Comando que estoura timeout = behaviour em `error`, não `fail`.
3. **Read-only por contrato.** `action.command` não deve modificar estado do projeto de forma não-idempotente. Violação é responsabilidade do usuário que declarou o behaviour — o framework não sandboxa.
4. **Sem side-effects em artefatos do framework.** Hardening pré-execução rejeita comandos que escrevem em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/`.
5. **Requires declara pré-condições, não executa setup.** `/behaviour-run` não sobe servidor, não provisiona banco, não abre rede. Apenas valida que as pré-condições estão satisfeitas ou skipa com reason.
6. **Expectation `required: false` não bloqueia.** Falha em expectation não-required é reportada mas não afeta status do behaviour.
7. **`blocking` é derivado.** `status == fail` + `on_fail == block` → `blocking: true`. Qualquer outra combinação → `blocking: false`.
8. **Sobrescrever `behaviours-last-run.json` é ok.** Histórico não é preservado nesta versão — cada run substitui o anterior.
9. **Determinístico por run.** Dois runs consecutivos com o mesmo estado (código, behaviours.json, ambiente) produzem o mesmo verdict.
10. **Consumers nunca disparam este command.** `/contract-check`, `/ship-check` e `/verify-spec` lêem `behaviours-last-run.json` mas nunca executam `/behaviour-run`. Execução é sempre ação explícita.

## Anti-padrões

- Interpretar stdout do `action.command` textualmente para decidir pass/fail — expectations são autoridade
- Executar `/behaviour-run` dentro de consumer para "renovar evidência" — consumers são read-only absolutos
- Declarar behaviour sem timeout "para não cortar a execução" — timeout obrigatório explícito
- Usar behaviour para o que deveria ser sensor (suite de testes completa) — timeout > 120s é sinal de mistura de camadas
- Rebaixar `on_fail` para `warn` em fluxos financeiros/auth/permissões sem justificar — mascarar falha crítica
- Modificar `behaviours.json` dentro de `/behaviour-run` — este command é executor, não editor
- Modificar phase contract ao ver behaviour em fail — phase contract é imutável após approved; correção é no código ou novo contrato v2
- Transicionar status de phase contract baseado em `behaviours-last-run.json` — transição é sempre humana
- Truncar `results[]` para "limpar falhas" — evidência é registro completo do run
