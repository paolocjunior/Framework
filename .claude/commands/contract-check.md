---
description: Validar contrato ativo de fase contra o estado do projeto — verificação read-only sem modificar o contrato
allowed-tools: Read, Grep, Glob, Bash(jq:*), Bash(find:*), Bash(test:*), Bash(stat:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de iniciar a verificação do contrato:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Identificar a fase ativa no ledger
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

## Propósito

Validar o contrato ativo da fase atual contra o estado real do projeto. O command é **read-only** — nunca modifica o contrato, o ledger ou o estado. Produz um veredicto estruturado sobre o progresso da fase em relação ao que foi prometido.

Este é o consumidor primário de `.claude/rules/execution-contracts.md`. Enquanto `/contract-create` declara a promessa, `/contract-check` confere a entrega. O command responde a uma pergunta única: **a fase está cumprindo o que prometeu entregar?**

## Quando usar

- Durante a implementação, para validar progresso incremental contra o contrato
- Antes de pedir revisão ou merge — confirmar que os deliverables obrigatórios estão presentes
- Antes de `/ship-check` — o ship-check consome o veredicto do contract-check no Bloco 0.5
- Ao retomar trabalho após interrupção longa — alinhar o que falta com o que foi prometido
- Quando há dúvida se um sensor falhado está dentro ou fora do escopo da fase atual

## Pré-requisitos

- Contrato ativo em `.claude/runtime/contracts/active.json` apontando para um contrato válido
- Status do contrato ativo em `approved`, `in_progress`, `done`, `failed` ou `deferred` (contratos em `draft` são ignorados com aviso)
- (Opcional) `.claude/runtime/sensors-last-run.json` — necessário apenas se o contrato declara `sensors_required`

Se não há contrato ativo, o command reporta imediatamente:

> "Nenhum contrato ativo encontrado em `.claude/runtime/contracts/active.json`. Execute `/contract-create` para declarar o contrato da fase atual, ou continue em modo degradado — o framework opera sem contratos declarados, mas o gate contratual fica ausente."

Esta é uma lacuna, não um erro. Contratos são opt-in.

## Execução

### Passo 1 — Localizar o contrato ativo

1. Ler `.claude/runtime/contracts/active.json`:
   ```json
   {
     "active_phase_id": "phase-01-ui-shell",
     "active_contract_path": ".claude/runtime/contracts/phase-01-ui-shell.json",
     "last_updated": "<ISO>"
   }
   ```
2. Se o arquivo não existe ou `active_phase_id` é `null` → reportar lacuna e encerrar (ver pré-requisitos)
3. Ler o contrato apontado em `active_contract_path`
4. Validar que o schema carrega (`jq empty` no arquivo) — se inválido, reportar erro de schema e encerrar
5. Verificar `schema_version` — se não for `"1"`, avisar sobre possível incompatibilidade mas seguir
6. Ler os campos essenciais:
   - `phase_id`, `title`, `status`
   - `deliverables`, `acceptance_criteria`, `sensors_required`, `preconditions`, `out_of_scope`, `rollback_plan`
   - `created_at`, `approved_at`, `started_at`, `finished_at`
   - `evidence` (estrutura atual, pode estar vazia)

### Passo 2 — Verificar staleness do contrato

Aplicar as 3 regras de staleness definidas em `.claude/rules/execution-contracts.md`:

1. **Arquivos referenciados foram modificados após a última atualização do contrato?**
   - Para cada `deliverable.location` que aponta para um arquivo existente, comparar `mtime` do arquivo com `last_updated` em `active.json`. Se arquivo é mais recente → possível staleness.
2. **`sensors-last-run.json` é mais recente que o registro de evidência no contrato?**
   - Se `evidence.sensors_run_id` está vazio mas `sensors-last-run.json` existe e é posterior a `approved_at` → staleness.
3. **O plano correspondente foi modificado após `approved_at`?**
   - Verificar mtime do plano (se localizável) contra `approved_at`. Se mais recente → possível scope change não capturado.

Staleness **não** bloqueia o command — o contract-check roda mesmo com contrato stale. Apenas adicionar ao output um bloco:

```markdown
## Aviso de staleness
- [tipo] — [descrição]
- Recomendação: rodar `/contract-create` v2 se houve scope change, ou aceitar staleness como trivial
```

### Passo 3 — Verificar status do contrato

| Status do contrato | Ação do command |
|---|---|
| `draft` | Avisar: "Contrato em draft não pode ser verificado. Aprovar via `/contract-create` antes de rodar `/contract-check`." → encerrar |
| `approved` | Verificar preconditions e deliverables. Acceptance criteria e sensors são verificados mas o foco é "pode começar?" |
| `in_progress` | Verificação completa de todos os blocos. Foco: "está no caminho para fechar?" |
| `done` | Verificação completa + confirmar que todos os bloqueantes estão `PASS`. Foco: "o fechamento é sustentável pela evidência?" |
| `failed` | Verificação informativa — reportar o que falhou, sem tentar promover |
| `rolled_back` | Reportar status histórico, sem verificar deliverables (o rollback desfez a fase) |
| `deferred` | Reportar status histórico + lista do que ficou pendente |

### Passo 4 — Verificar preconditions

Para cada item em `preconditions`:

- **Mecanicamente verificável** (contém palavra-chave reconhecível: "marker", "arquivo existe", "spec aprovada"):
  - Marker `.plan-approved` → verificar `.claude/runtime/.plan-approved`
  - Spec aprovada → verificar `memory/project_spec-status.md` ou `execution-ledger.md` por registro de `/spec-check READY`
  - Contrato anterior `done` → verificar `active.json` histórico ou dependência em `depends_on`
- **Manual** (qualquer outra descrição): marcar como `MANUAL_CHECK` — não tentar interpretar prosa

| Precondition | Tipo | Status | Evidência |
|---|---|---|---|
| (texto da precondition) | auto / manual | PASS / FAIL / MANUAL_CHECK | arquivo verificado ou "requer confirmação humana" |

### Passo 5 — Verificar deliverables

Para cada `deliverable`, aplicar o método declarado em `verifiable_by`:

#### `file_exists`
- Verificar se o arquivo/diretório em `location` existe no repositório
- `PASS` se existe, `MISSING` se não existe
- Se for diretório, verificar também se contém pelo menos 1 arquivo (diretório vazio = `EMPTY`)

#### `grep_pattern`
- Verificar se o arquivo em `location` existe
- Se existe, rodar grep pelo `pattern` declarado
- `PASS` se o pattern casa pelo menos 1 vez, `MISSING_PATTERN` se não casa, `MISSING_FILE` se o arquivo nem existe

#### `sensor`
- Verificar se o `sensor_id` declarado está presente em `.claude/runtime/sensors.json`
  - Se não está → deliverable inválido, reportar `INVALID_SENSOR_REF` e tratar como FAIL
- Ler `.claude/runtime/sensors-last-run.json` e encontrar o resultado do `sensor_id`
- `PASS` se o sensor está `pass`, `FAIL` se está `fail`, `NOT_RUN` se ainda não foi executado, `STALE` se o last-run é mais antigo que a última modificação do código relevante

#### `manual_check`
- Sempre `MANUAL_CHECK` — o command não pode decidir mecanicamente
- Incluir no output a descrição do deliverable para o humano verificar

Tabela de saída:

| ID | Descrição | Verifiable by | Required | Status | Evidência |
|----|-----------|---------------|----------|--------|-----------|
| D1 | LoginScreen.tsx | file_exists | true | PASS | `src/screens/LoginScreen.tsx` existe (2431 bytes) |
| D2 | Navigation stack | grep_pattern | true | PASS | `AppNavigator.tsx:12` — `createNativeStackNavigator` encontrado |
| D3 | Testes | sensor(unit-tests) | true | FAIL | `sensors-last-run.json:unit-tests` exit_code=1 (2 suites failing) |
| D4 | Docs | file_exists | false | MISSING | `docs/navigation.md` não existe |

### Passo 6 — Verificar sensors_required

Para cada sensor em `sensors_required`:

1. Validar que o sensor existe em `.claude/runtime/sensors.json`:
   - Se não existe → `INVALID_SENSOR_REF` (contrato referencia sensor inexistente — isso é inválido por construção)
2. Ler o resultado do sensor em `.claude/runtime/sensors-last-run.json`:
   - Sensor não executado → `NOT_RUN`
   - Sensor `pass` → `PASS`
   - Sensor `fail` com `on_fail: block` → `FAIL_BLOCKING`
   - Sensor `fail` com `on_fail: warn` → `FAIL_WARN`
   - Sensor `timeout` ou `error` → `UNSTABLE`

Tabela de saída:

| Sensor ID | Tipo | Status | Exit code | Observação |
|-----------|------|--------|-----------|------------|
| unit-tests | test | FAIL_BLOCKING | 1 | 2 suites failing em `src/screens/__tests__/LoginScreen.test.tsx` |
| type-check | type-check | PASS | 0 | — |
| lint | lint | NOT_RUN | — | sensor declarado mas nunca executado |

Se `sensors-last-run.json` não existe e o contrato declara `sensors_required`:
- Recomendar rodar `/sensors-run` antes de prosseguir
- Todos os sensores viram `NOT_RUN`
- Isso impede veredicto `READY_TO_CLOSE`

### Passo 7 — Verificar acceptance_criteria

Para cada critério:

- **`verifiable_by: sensor`** — mesma lógica do Passo 6 (consultar `sensors-last-run.json`)
- **`verifiable_by: manual_test`** — `MANUAL_CHECK`; incluir descrição no output
- **`verifiable_by: code_inspection`** — `MANUAL_CHECK`; incluir descrição no output

Tabela:

| ID | Descrição | Linked requirement | Verifiable by | Status |
|----|-----------|--------------------|---------------|--------|
| AC1 | Usuário abre app e vê tela de login | AUTH-01 | manual_test | MANUAL_CHECK |
| AC3 | TypeScript compila sem erros | — | sensor(type-check) | PASS |

### Passo 8 — Agregar veredicto

Aplicar a tabela de agregação **determinística** abaixo. A ordem das regras importa — a primeira regra que casa decide o veredicto.

| Regra | Condição | Veredicto |
|---|---|---|
| R1 | Qualquer `deliverable.required=true` com status `MISSING`, `MISSING_FILE`, `MISSING_PATTERN`, `EMPTY` ou `INVALID_SENSOR_REF` | **FAILED** |
| R2 | Qualquer `sensors_required` com status `FAIL_BLOCKING` ou `INVALID_SENSOR_REF` | **FAILED** |
| R3 | Qualquer `deliverable.required=true` com status `FAIL` (de sensor) | **FAILED** |
| R4 | Qualquer precondition `FAIL` (mecanicamente verificável) | **FAILED** |
| R5 | Qualquer `sensors_required` com status `NOT_RUN` ou `UNSTABLE` | **AT_RISK** |
| R6 | Qualquer `sensors_required` com status `FAIL_WARN` | **AT_RISK** |
| R7 | Qualquer `deliverable.required=false` com status `MISSING` ou `FAIL` | **AT_RISK** |
| R8 | Qualquer precondition `MANUAL_CHECK` ainda não confirmado (em status `approved`) | **AT_RISK** |
| R9 | Todos os `deliverable.required=true` `PASS`, todos `sensors_required` `PASS`, todas preconditions `PASS` ou `MANUAL_CHECK`, e `acceptance_criteria` sem nenhum `FAIL` mecânico | **READY_TO_CLOSE** |
| R10 | Nenhuma regra acima casa (progresso parcial, nada bloqueante) | **ON_TRACK** |

**Princípios da agregação:**
- **Sensores são autoridade.** Se um sensor `FAIL_BLOCKING`, o veredicto não pode ser `READY_TO_CLOSE` — não importa quantos deliverables estão `PASS` por análise estática.
- **Manual check nunca vira PASS automaticamente.** Manual checks mantêm o contrato em `AT_RISK` ou `ON_TRACK`; só a promoção humana para `done` via `/contract-create` (v2 ou ação manual) pode fechar.
- **Deliverables opcionais não bloqueiam** `READY_TO_CLOSE` — mas aparecem em `AT_RISK` se ausentes, para visibilidade.
- **Agregação é determinística.** Dois runs consecutivos com o mesmo estado produzem o mesmo veredicto. Nenhum componente probabilístico.

### Passo 9 — Reportar ao usuário

Output estruturado em markdown. **NÃO modificar o contrato, o ledger ou o `active.json`.** O command é read-only.

```markdown
# /contract-check — Veredicto do Contrato

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Contrato verificado

- **Phase ID:** `[phase_id]`
- **Title:** [title]
- **Status atual:** [draft | approved | in_progress | done | failed | rolled_back | deferred]
- **Approved at:** [timestamp ou null]
- **Schema version:** 1
- **Arquivo:** `.claude/runtime/contracts/phase-<id>.json`

## Veredicto

**[FAILED | AT_RISK | ON_TRACK | READY_TO_CLOSE]**

Razão: [regra que decidiu o veredicto, ex: "R2 — sensor `unit-tests` em FAIL_BLOCKING"]

## Preconditions

| Precondition | Tipo | Status | Evidência |
|---|---|---|---|
| ... | ... | ... | ... |

## Deliverables

| ID | Descrição | Verifiable by | Required | Status | Evidência |
|----|-----------|---------------|----------|--------|-----------|
| ... | ... | ... | ... | ... | ... |

Resumo: X required PASS / Y required FAIL / Z opcionais MISSING

## Sensors required

| Sensor ID | Tipo | Status | Exit code | Observação |
|-----------|------|--------|-----------|------------|
| ... | ... | ... | ... | ... |

## Acceptance criteria

| ID | Descrição | Linked requirement | Verifiable by | Status |
|----|-----------|--------------------|---------------|--------|
| ... | ... | ... | ... | ... |

## Out of scope (declarado no contrato)

- [lista de itens explicitamente fora do escopo da fase]

## Aviso de staleness (se aplicável)

- [tipo] — [descrição]

## Próximos passos

- Se veredicto é `FAILED`: [lista acionável do que precisa ser corrigido para sair do FAILED]
- Se veredicto é `AT_RISK`: [lista do que falta para chegar a ON_TRACK ou READY_TO_CLOSE]
- Se veredicto é `ON_TRACK`: [itens pendentes + sensores a rodar]
- Se veredicto é `READY_TO_CLOSE`: [instrução: rodar `/ship-check` para validação final e transicionar manualmente o status do contrato para `done` após aprovação]

## Observações

- Este command é read-only. O contrato não foi modificado.
- Para atualizar evidência (`evidence.sensors_run_id`, `evidence.files_created`), editar o contrato manualmente ou criar novo contrato v2 se houver scope change.
- Para transicionar o status, usar o procedimento manual descrito em `.claude/rules/execution-contracts.md`.
```

## Regras

1. **Read-only absoluto.** `/contract-check` nunca escreve em `.claude/runtime/contracts/*`, nunca modifica `execution-ledger.md`, nunca atualiza `active.json`. A única saída é o relatório ao usuário.
2. **Sensores são autoridade sobre comportamento mecânico.** Se o contrato diz `sensors_required: ["unit-tests"]` e o sensor está `FAIL_BLOCKING`, o veredicto não pode ser `READY_TO_CLOSE`. Mesmo que todos os outros deliverables estejam `PASS`.
3. **Agregação é determinística.** A tabela de regras R1–R10 é aplicada na ordem; a primeira que casa decide. Não há heurística probabilística.
4. **Manual check nunca vira automático.** `MANUAL_CHECK` é um estado terminal até confirmação humana — o command apenas reporta, nunca assume.
5. **Deliverable com `INVALID_SENSOR_REF` é FAIL.** Contrato que referencia sensor inexistente é inválido por construção e deve ser tratado como falha crítica — não ignorado.
6. **Staleness não bloqueia.** O command roda mesmo com contrato stale; apenas avisa. A decisão de atualizar evidência é humana.
7. **Contrato em `draft` não é verificado.** `/contract-check` exige aprovação explícita do contrato antes de operar — senão está validando uma promessa ainda não comprometida.

## Anti-padrões

- **Modificar o contrato "só para atualizar evidência"** durante o `/contract-check` — qualquer modificação invalida a semântica read-only e abre porta para moving-the-goalposts silencioso
- **Promover um deliverable para `PASS` com base em análise textual do código** quando o `verifiable_by` declarado é `sensor` e o sensor falhou — contrato diz sensor, sensor é autoridade
- **Tratar `MANUAL_CHECK` como `PASS` "porque provavelmente está ok"** — manual check só vira PASS com ação humana explícita
- **Veredicto `READY_TO_CLOSE` com `sensors_required` vazio ou `NOT_RUN`** — se nenhum sensor rodou, não há evidência mecânica suficiente para fechar
- **Ignorar contratos em `draft` silenciosamente** — avisar explicitamente que o contrato não foi aprovado e o gate contratual está ausente
- **Rodar `/contract-check` sem contrato ativo e falhar silenciosamente** — reportar explicitamente que não há contrato ativo e explicar que projetos sem contratos operam em modo degradado
