---
description: Executar evaluator do sprint contract ativo e registrar verdict no evaluation_history (append-only)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(jq:*), Bash(date:*), Bash(test:*), Bash(stat:*), Bash(sh:*), Bash(timeout:*), Bash(cat:*), Bash(ls:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de executar a avaliação:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Identificar a fase ativa no ledger e confirmar que há sprint ativo em `.claude/runtime/contracts/active-sprint.json`
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

## Propósito

Executar o **evaluator** do sprint contract ativo contra o estado real do projeto. Produz um verdict mecânico `pass | fail | partial` e adiciona uma entrada append-only em `evaluation_history` do sprint. **Não transiciona o status do sprint** — a transição para `passed/failed/deferred` é sempre via `/sprint-close` com confirmação humana.

Este command é o coração do ciclo de feedback curto dos sprints. Pode (e deve) ser rodado múltiplas vezes durante a implementação do sprint — cada execução gera uma nova entrada no histórico, permitindo acompanhar a progressão do verdict de `fail` para `pass` conforme o trabalho avança.

Ver `.claude/rules/sprint-contracts.md` para o schema dos checks, regras de agregação e hardening de `custom_command`.

## Quando usar

- Durante a implementação do sprint, para ver o verdict mecânico do trabalho atual
- Ao concluir uma entrega atômica, antes de rodar `/sprint-close`
- Para reproduzir o verdict depois de um fix — cada execução gera nova entrada no histórico
- Para validar que um check recém-declarado funciona como esperado

## Pré-requisitos

- Sprint contract ativo em `.claude/runtime/contracts/active-sprint.json` com status `approved` ou `in_progress`
- (Se houver checks `sensor_subset`) `.claude/runtime/sensors-last-run.json` recente — senão, os checks retornarão `unknown`
- Ambiente capaz de executar `custom_command` checks (ex: `jq`, `sh`, `timeout` disponíveis no PATH)

Se não há sprint ativo, o command reporta:

> "Nenhum sprint ativo encontrado em `.claude/runtime/contracts/active-sprint.json`. Execute `/sprint-create` para criar um sprint ou continue em modo degradado — o framework opera sem sprints declarados."

## Execução

### Passo 1 — Localizar o sprint contract ativo

1. Ler `.claude/runtime/contracts/active-sprint.json`
2. Se `active_sprint_id` é `null` ou arquivo não existe → reportar lacuna e encerrar
3. Ler o sprint contract apontado em `active_sprint_path`
4. Validar que o schema carrega (`jq empty`) — se inválido, reportar erro e encerrar
5. Verificar `schema_version` — se não for `"1"`, avisar
6. Ler campos essenciais:
   - `sprint_id`, `parent_phase_id`, `title`, `goal`, `status`
   - `evaluator` (mode, threshold, checks)
   - `evaluation_history` atual (para saber quantas execuções anteriores)

### Passo 2 — Verificar status do sprint

| Status do sprint | Ação |
|---|---|
| `draft` | Avisar: "Sprint em draft não pode ser avaliado. Aprovar via `/sprint-create` (segunda confirmação) antes de rodar `/sprint-evaluate`." → encerrar |
| `approved` | Prosseguir. Esta pode ser a primeira avaliação (baseline) |
| `in_progress` | Prosseguir. Execução normal de progresso |
| `passed` | Avisar: "Sprint já fechado como `passed`. `/sprint-evaluate` pode ainda rodar (read-mostly), mas apenas para regressão — o sprint não pode ser reaberto sem criar v2" |
| `failed` | Avisar: "Sprint fechado como `failed`. Avaliação roda para diagnóstico, mas não muda verdict histórico" |
| `deferred` | Avisar: "Sprint foi adiado. Para retomar, criar novo sprint com `/sprint-create`" e encerrar |

### Passo 3 — Verificar pré-requisito de sensores (se aplicável)

Se o evaluator contém pelo menos 1 check `sensor_subset`:

1. Verificar se `.claude/runtime/sensors-last-run.json` existe
2. Se ausente → avisar no output (não bloquear): "sensors-last-run.json ausente — checks `sensor_subset` retornarão `unknown`. Rode `/sensors-run` para resultado significativo."
3. Se presente, ler o JSON e validar schema (`jq empty`)

### Passo 4 — Executar cada check

Para cada check em `evaluator.checks`, executar conforme o `type`. Cada execução produz um `result` com `{ check_id, status, evidence }`.

#### Tipo `file_exists`

1. Ler `target` do check
2. Verificar se o path (relativo à raiz do projeto) existe
3. Resultado:
   - `pass` — path existe
   - `fail` — path não existe
   - `error` — path inválido (fora do projeto, absoluto, caracteres proibidos)
4. Evidência: tamanho do arquivo em bytes (via `stat`) ou "directory with N entries" se for diretório

#### Tipo `grep_pattern`

1. Verificar se `target` existe
2. Se não existe → `error` com evidência "target file missing"
3. Se existe, usar Grep tool (não Bash grep) para buscar `pattern` no arquivo
4. Contar matches. Comparar com `min_matches` (default 1)
5. Resultado:
   - `pass` — matches >= min_matches
   - `fail` — matches < min_matches
   - `error` — regex inválida ou erro de leitura
6. Evidência: `"N matches, first at <file>:<line>"` ou `"0 matches, expected >= min_matches"`

#### Tipo `sensor_subset`

1. Se `sensors-last-run.json` não existe → todos os sensores do check viram `unknown`, resultado = `unknown`
2. Se existe, para cada `sensor_id` em `sensor_ids`:
   - Validar que o id existe em `.claude/runtime/sensors.json`. Se não → `error` com evidência "invalid sensor ref: <id>"
   - Buscar o resultado em `sensors-last-run.json.results[]` pelo `id`
   - Se não encontrado → status individual `unknown` (sensor declarado mas não executado no último run)
   - Se encontrado → usar o `status` (pass/fail/timeout/error/skipped)
3. Agregar os status individuais:
   - Todos `pass` → resultado `pass`
   - Pelo menos 1 `fail` → resultado `fail`
   - Pelo menos 1 `unknown` (ou `skipped`) e nenhum `fail` → resultado `unknown`
   - Pelo menos 1 `error` ou `timeout` → resultado `error`
4. Evidência: lista `"<sensor_id>: <status> (exit_code: <N>)"` para cada sensor

#### Tipo `custom_command`

**Hardening obrigatório antes de executar:**

1. Validar que `timeout_seconds` está declarado. Se ausente → `error`, evidência "custom_command missing required timeout_seconds"
2. Validar que o comando não contém paths de escrita em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/`. Se contém → `error`, evidência "custom_command forbidden write to framework artifact"
3. Se `requires_network` é `false` (default) e o comando contém sinais óbvios de rede (`curl`, `wget`, `http://`, `https://`, `npm install` não-offline) → avisar no output "check has network-looking command but requires_network=false; treating as local"
4. Se `timeout_seconds` > 120 → avisar "timeout > 120s sugere que este check deveria ser sensor" (não bloquear)

**Execução:**

1. Resolver `working_dir` (default: raiz do projeto)
2. Executar via `timeout <timeout_seconds> sh -c "<command>"` no working_dir
3. Capturar `exit_code`, `stdout`, `stderr`
4. Medir `duration_ms`
5. Se timeout estourou → resultado `error` com evidência "timeout after <N>s"
6. Se exit code 0 → `pass`
7. Se exit code != 0 → `fail`
8. Evidência: `"exit_code=<N>, last 20 lines of output: <tail>"` (truncar output para 20 linhas últimas)

### Passo 5 — Agregar verdict

Aplicar as regras conforme `evaluator.mode`:

#### Modo `all`

Percorrer os checks:
- Contar `passed_count` = checks com `status: pass`
- Contar `failed_count` = checks com `status: fail` ou `error`
- Contar `unknown_count` = checks com `status: unknown`
- `total_count` = número total de checks

Regras de agregação (primeira que casa decide):

| Regra | Condição | Verdict |
|---|---|---|
| V1 | Pelo menos 1 check com `required: true` em `fail` ou `error` | **fail** |
| V2 | Pelo menos 1 check com `required: true` em `unknown` e nenhum required em `fail` | **partial** |
| V3 | Todos os checks `required: true` em `pass` | **pass** |

Checks `required: false` que falham aparecem no log mas **não afetam o verdict**.

#### Modo `threshold`

- `passed_count` = total de checks (de qualquer tipo de `required`) em `pass`
- Regras:

| Regra | Condição | Verdict |
|---|---|---|
| V1 | `passed_count >= evaluator.threshold` | **pass** |
| V2 | `passed_count < threshold` e `passed_count + unknown_count >= threshold` | **partial** (pode virar pass após re-execução com mais dados) |
| V3 | `passed_count + unknown_count < threshold` | **fail** |

### Passo 6 — Construir entrada de evaluation_history

Gerar o objeto:

```json
{
  "run_id": "<uuid ou timestamp>",
  "run_at": "<ISO-8601>",
  "verdict": "pass | fail | partial",
  "passed_count": N,
  "failed_count": N,
  "unknown_count": N,
  "total_count": N,
  "duration_ms": N,
  "results": [
    { "check_id": "C1", "status": "pass | fail | unknown | error", "evidence": "..." },
    ...
  ]
}
```

Usar `run_id` = timestamp ISO-8601 compactado (ex: `20260411T170500Z`) ou uuid se disponível.

### Passo 7 — Persistir append-only no sprint contract

**Única escrita permitida neste command:**

1. Ler o sprint contract atual (fresh, pode ter sido editado por humano entre o Passo 1 e agora)
2. Revalidar `jq empty` — se o arquivo foi corrompido, abortar sem escrever
3. Usar `jq` para **adicionar** a nova entrada ao final de `evaluation_history`:
   ```bash
   jq --argjson new_entry "$NEW_ENTRY" '.evaluation_history += [$new_entry]' "$SPRINT_FILE" > "$SPRINT_FILE.tmp" && mv "$SPRINT_FILE.tmp" "$SPRINT_FILE"
   ```
4. **Não modificar** `status`, `verdict`, `verdict_reason`, ou qualquer outro campo do sprint
5. **Não modificar** o phase contract
6. **Não modificar** `active.json` nem `active-sprint.json`

Esta é a única mutação de estado que `/sprint-evaluate` faz, e é estritamente append em um campo específico. Histórico nunca é sobrescrito — cada execução acumula.

### Passo 8 — Atualizar ledger

Adicionar entrada na seção apropriada do `execution-ledger.md`:

```
### Sprint Evaluated — <ISO timestamp>
- Sprint: <sprint_id>
- Parent phase: <parent_phase_id>
- Run ID: <run_id>
- Verdict: <pass | fail | partial>
- Checks: <passed_count>/<total_count> pass (<unknown_count> unknown, <failed_count> fail)
- Duration: <duration_ms>ms
```

### Passo 9 — Reportar ao usuário

Output estruturado em markdown. O verdict é **mecânico** — exit code é autoridade, nenhuma reinterpretação textual.

```markdown
# /sprint-evaluate — Verdict do Evaluator

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Sprint avaliado

- **Sprint ID:** `[sprint_id]`
- **Parent phase:** `[parent_phase_id]`
- **Title:** [title]
- **Status atual:** [approved | in_progress | ...]
- **Run number:** [N] (evaluation_history agora tem N entradas)
- **Run ID:** [run_id]

## Verdict

**[PASS | FAIL | PARTIAL]**

Razão: [regra que decidiu, ex: "V1 — check C3 (required) em fail"]

Modo de agregação: `[all | threshold]`[, threshold: N]

## Checks executados

| ID | Type | Required | Status | Evidência |
|----|------|----------|--------|-----------|
| C1 | file_exists | true | pass | `src/screens/LoginScreen.tsx` existe (2431 bytes) |
| C2 | grep_pattern | true | pass | 2 matches, first at `src/screens/LoginScreen.tsx:12` |
| C3 | sensor_subset | true | fail | `type-check: pass (0)`, `lint: fail (1)` |
| C4 | custom_command (60s) | true | pass | exit_code=0, last 20 lines: ... |

Resumo: [passed_count] pass, [failed_count] fail/error, [unknown_count] unknown / [total_count] total

## Histórico de verdicts (evaluation_history)

| Run | Timestamp | Verdict | passed/total |
|-----|-----------|---------|--------------|
| 1 | ... | fail | 1/4 |
| 2 | ... | partial | 2/4 |
| 3 | ... | pass | 4/4 |

(mostra as últimas 5 entradas)

## Próximos passos

- Se verdict é `PASS` **e** a entrega está completa: rodar `/sprint-close passed` para fechar o sprint
- Se verdict é `FAIL`: corrigir o(s) check(s) em fail/error e rodar `/sprint-evaluate` novamente (cria nova entrada no histórico)
- Se verdict é `PARTIAL` por `unknown` em `sensor_subset`: rodar `/sensors-run` e re-avaliar
- Se verdict é `PARTIAL` por sensores não declarados: validar sensors.json

## Invariantes preservadas

- Sprint contract **não** foi transicionado (status continua `[status_anterior]`)
- Phase contract `[parent_phase_id]` **não** foi modificado
- `active.json` e `active-sprint.json` **não** foram modificados
- Única mutação: append de 1 entrada em `evaluation_history` do sprint
```

## Regras

1. **Append-only em `evaluation_history`.** Nunca sobrescrever entradas antigas. Cada execução gera uma nova entrada.
2. **Nunca transicionar status do sprint.** `/sprint-evaluate` reporta verdict mas não muda `status` nem preenche `verdict`/`verdict_reason`. Transição é via `/sprint-close`.
3. **Nunca modificar o phase contract.** Mesmo que o verdict seja `pass`, o phase contract fica intacto.
4. **Exit code é autoridade sobre `custom_command`.** Nenhuma reinterpretação do stdout/stderr. Exit 0 = pass, qualquer outro = fail.
5. **Timeout em `custom_command` é bloqueante.** Comando que estoura timeout = `error`, não `fail`.
6. **`sensor_subset` consome, não executa.** Se `sensors-last-run.json` ausente ou stale, o check é `unknown` — o command nunca dispara `/sensors-run`.
7. **`custom_command` com `requires_network: false` e comando de rede óbvio é avisado mas executado.** A enforcement de read-only é por contrato, não por sandbox — o usuário é responsável.
8. **Verdict é determinístico.** Dois runs consecutivos com o mesmo estado (arquivos, sensors-last-run, comandos) produzem o mesmo verdict.
9. **Agregação segue a tabela exata.** Modo `all` usa V1–V3; modo `threshold` usa V1–V3 do threshold. A primeira regra que casa decide.

## Anti-padrões

- Sobrescrever entradas de `evaluation_history` "para manter só a última" — histórico é append-only por design
- Transicionar status do sprint automaticamente quando verdict é `pass` — transição é sempre humana via `/sprint-close`
- Modificar `verdict` ou `verdict_reason` do sprint durante `/sprint-evaluate` — esses campos são de fechamento
- Executar sensores (`/sensors-run`) dentro do `/sprint-evaluate` — sensores são executados apenas por `/sensors-run` explícito
- Modificar o phase contract para registrar que um sprint passou — phase contract é imutável
- Interpretar stdout de `custom_command` para decidir pass/fail — exit code é única autoridade
- Ignorar timeout de `custom_command` ou rodar comandos sem timeout — hardening é obrigatório
- Rodar `/sprint-evaluate` em sprint ainda em `draft` — sprint precisa estar `approved` ou `in_progress`
- Usar verdict `partial` como se fosse `pass` — partial significa "precisa rodar novamente com mais dados"
