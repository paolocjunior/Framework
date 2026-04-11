---
description: Criar sprint contract (granularidade intra-fase) com evaluator declarativo
allowed-tools: Read, Write, Grep, Glob, Bash(jq:*), Bash(date:*), Bash(mkdir:*), Bash(test:*), Bash(ls:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de iniciar a criação do sprint:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Identificar a fase ativa no ledger e confirmar que há phase contract ativo em `.claude/runtime/contracts/active.json`
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

## Propósito

Criar um **sprint contract** — unidade atômica de entrega intra-fase com evaluator determinístico. Enquanto um phase contract (de `/contract-create`) declara o compromisso da fase em escala de dias/semanas, um sprint declara uma entrega menor em escala de horas, com bateria de checks atômicos que produz verdict pass/fail mecânico a cada execução de `/sprint-evaluate`.

Este command **não modifica o phase contract aprovado**. O vínculo fase → sprints é derivado do filesystem (`.claude/runtime/contracts/sprints/<parent_phase_id>/`), preservando a imutabilidade do phase contract.

Ver `.claude/rules/sprint-contracts.md` para o schema completo, lifecycle e regras de hardening do `custom_command`.

## Quando usar

- Após `/contract-create` aprovar o phase contract da fase ativa
- Quando o trabalho da fase pode ser decomposto em entregas atômicas de 1-2h cada
- Para criar ciclos de feedback curtos dentro de uma fase longa
- Ao substituir um sprint anterior por scope change (criar v2 com justificativa)

## Pré-requisitos

- Phase contract ativo em `.claude/runtime/contracts/active.json` com status `approved` ou `in_progress`
- Marker `.claude/runtime/.plan-approved` presente (herdado do gate de `/plan-review`)
- (Opcional mas recomendado) `.claude/runtime/sensors.json` declarado — permite usar `sensor_subset` no evaluator
- (Opcional) último `sensors-last-run.json` recente — permite checks `sensor_subset` serem significativos na primeira execução

## Execução

### Passo 1 — Verificar pré-requisitos

1. Ler `.claude/runtime/contracts/active.json`. Se ausente ou `active_phase_id` for `null`, parar com erro:
   > "Sprint só pode ser criado quando há phase contract ativo. Execute `/contract-create` primeiro."
2. Ler o phase contract apontado. Confirmar que `status` é `approved` ou `in_progress`. Se for `draft`, parar com erro:
   > "Phase contract da fase ativa ainda está em draft. Aprove o phase contract antes de criar sprints."
3. Verificar `.claude/runtime/contracts/active-sprint.json`. Se `active_sprint_id` não for `null`, avisar:
   > "Já existe sprint ativo: `[active_sprint_id]`. Criar um novo sprint vai sobrescrever o ponteiro ativo. Considere fechar o sprint atual via `/sprint-close` antes de criar outro. Prosseguir mesmo assim? (sim/não)"
4. Verificar se já existe arquivo em `.claude/runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json`:
   - **Existe e status é `draft`** → perguntar se quer sobrescrever
   - **Existe e status é `approved | in_progress`** → pedir confirmação explícita para criar v2 com justificativa
   - **Existe e status é `passed | failed | deferred`** → permitir criar sprint novo com `sprint_id` diferente
   - **Não existe** → prosseguir

### Passo 2 — Coletar metadados do sprint

Perguntar ao usuário (ou derivar do contexto do plano se já há pistas):

1. **`sprint_id`** — kebab-case único, prefixo sugerido `sprint-NN-` (ex: `sprint-01-loginscreen-base`)
2. **`title`** — título humano curto
3. **`goal`** — 1-2 frases explicando o que o sprint entrega
4. **`estimated_duration`** — estimativa humana (`"1h"`, `"2-3h"`, `"4h"`). Sprints > 4h são sinal de que deveriam ser divididos

Validar que `sprint_id` segue kebab-case e é único no diretório de sprints da fase.

### Passo 3 — Definir deliverables

Perguntar ao usuário quais são as entregas concretas do sprint (1-3, preferencialmente 2). Cada deliverable precisa ter:

- `id`: `D1`, `D2`, ... (sequencial)
- `location`: path relativo à raiz do projeto
- `description`: o que deve existir no path

Se houver mais de 3 deliverables, alertar:
> "Sprint com 4+ deliverables costuma ser grande demais para 1-2h. Considere dividir em dois sprints."

### Passo 4 — Construir o evaluator

O evaluator é a bateria de checks atômicos. Conduzir o usuário a declarar checks cobrindo os deliverables.

#### 4.1 — Modo de agregação

Perguntar:
> "Modo de agregação do evaluator:
> - `all` (recomendado) — todos os checks com `required: true` devem passar
> - `threshold` — pelo menos N checks de qualquer tipo devem passar (exige justificativa na `goal`)"

Default: `all`. Se o usuário escolher `threshold`, pedir o valor `N` e confirmar a justificativa.

#### 4.2 — Checks

Para cada deliverable declarado, sugerir pelo menos 1 check. Tipos disponíveis:

- **`file_exists`** — `{ id, type: "file_exists", target: <path>, description, required }`
- **`grep_pattern`** — `{ id, type: "grep_pattern", target: <path>, pattern: <regex>, min_matches: N, description, required }`
- **`sensor_subset`** — `{ id, type: "sensor_subset", sensor_ids: [<ids>], description, required }` — só permitido se `sensors.json` existir e os ids estão declarados lá
- **`custom_command`** — `{ id, type: "custom_command", command, timeout_seconds, requires_network, working_dir, description, required }`

#### 4.3 — Hardening obrigatório de `custom_command`

Para cada check `custom_command`, validar mecanicamente:

1. **`timeout_seconds` é obrigatório.** Se omitido, rejeitar o check com mensagem:
   > "custom_command sem `timeout_seconds` é inválido. Declare explicitamente (recomendado: 30-120s)."
2. **`requires_network` default é `false`.** Se o comando precisa de rede, pedir confirmação explícita e declarar `requires_network: true`.
3. **Read-only por contrato.** Alertar ao usuário:
   > "Por contrato, `custom_command` deve ser read-only. Não use comandos que modificam arquivos, banco ou enviam requisições não-idempotentes. Confirma que `[command]` é read-only? (sim/não)"
4. **Sem side-effects em artefatos do framework.** Rejeitar se o comando contém paths como `.claude/runtime/`, `.claude/rules/`, `.claude/commands/` com operações de escrita.
5. **Timeout máximo sugerido: 120s.** Se o usuário declarar timeout > 120s, avisar:
   > "Timeout > 120s sugere que este check deveria ser um sensor, não um check de evaluator. Sprints são unidades curtas. Prosseguir mesmo assim? (sim/não)"
6. **Exit code é única autoridade.** Comentar ao usuário que o comando será avaliado exclusivamente pelo exit code — nenhuma interpretação de output textual será feita.

#### 4.4 — Validação de `sensor_subset`

Se houver check `sensor_subset`, validar:

1. `.claude/runtime/sensors.json` existe — senão, rejeitar o check
2. Todos os `sensor_ids` listados existem em `sensors.json` — senão, rejeitar com lista dos ids inválidos
3. Avisar ao usuário:
   > "Check `sensor_subset` consome `sensors-last-run.json`. Se os sensores não foram executados recentemente, o check retornará `unknown`. Rode `/sensors-run` antes de `/sprint-evaluate` para resultado significativo."

### Passo 5 — Sintetizar o sprint contract (draft)

Gerar o JSON conforme schema de `.claude/rules/sprint-contracts.md`:

- `schema_version`: `"1"`
- `sprint_id`: coletado no Passo 2
- `parent_phase_id`: extraído de `active.json`
- `title`, `goal`, `estimated_duration`: do Passo 2
- `status`: `"draft"`
- `created_at`: timestamp ISO-8601 (`date -u +"%Y-%m-%dT%H:%M:%SZ"`)
- `approved_at`, `started_at`, `closed_at`: `null`
- `deliverables`: do Passo 3
- `evaluator`: `{ mode, threshold, checks }` do Passo 4
- `evaluation_history`: `[]` (vazio)
- `verdict`, `verdict_reason`: `null`

Usar `jq` para construir o JSON — garante escape correto de strings e regex patterns.

### Passo 6 — Apresentar o draft ao usuário

Mostrar o contrato JSON gerado e perguntar:

> "Este é o sprint contract que vou criar em `.claude/runtime/contracts/sprints/[parent_phase_id]/[sprint_id].json`. Revise:
> - Os **deliverables** (N) refletem entregas atômicas de 1-2h?
> - O **evaluator** (N checks, modo `[mode]`) cobre todos os deliverables?
> - Os checks `custom_command` (se houver) são read-only, têm timeout explícito e não acessam rede sem declaração?
> - Os checks `sensor_subset` (se houver) referenciam sensores que existem em `sensors.json`?
>
> Responda:
> - `aprovar draft` — salvo em `status=draft`, aguardando segunda confirmação para `approved`
> - `editar [campo]` — solicito ajuste antes de salvar
> - `cancelar` — descarto o draft"

### Passo 7 — Persistir o sprint contract

Se o usuário aprovou o draft:

1. Criar diretório `.claude/runtime/contracts/sprints/<parent_phase_id>/` se não existir (via `mkdir -p`)
2. Escrever `.claude/runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json` com `status="draft"`
3. **Não atualizar `active-sprint.json` ainda** — só atualizar na transição `draft → approved`
4. **Não tocar no phase contract nem em `active.json`** — o vínculo é filesystem-based

### Passo 8 — Segunda confirmação (draft → approved)

Perguntar:

> "Sprint contract salvo como `draft`. Confirma aprovação para marcar como `approved` e autorizar início da implementação? (sim/não)"

Se `sim`:

1. Atualizar `status` para `"approved"` no arquivo do sprint
2. Preencher `approved_at` com timestamp atual
3. Re-escrever o arquivo
4. Atualizar `.claude/runtime/contracts/active-sprint.json`:
   ```json
   {
     "active_sprint_id": "<sprint_id>",
     "active_parent_phase_id": "<parent_phase_id>",
     "active_sprint_path": ".claude/runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json",
     "last_updated": "<ISO timestamp>"
   }
   ```

Se `não`: manter em `draft`, não atualizar `active-sprint.json`.

### Passo 9 — Atualizar ledger

Adicionar entrada na seção apropriada do `execution-ledger.md`:

```
### Sprint Created — <ISO timestamp>
- Sprint: <sprint_id>
- Parent phase: <parent_phase_id>
- Title: <title>
- Status: <draft | approved>
- Goal: <goal>
- Deliverables: N
- Evaluator: <N checks, modo <mode>>
- Estimated duration: <estimated_duration>
- Sprint file: `.claude/runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json`
```

### Passo 10 — Output ao usuário

```markdown
# /sprint-create — Sprint Criado

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Sprint [sprint_id] (parent: [parent_phase_id])

- **Status:** [draft | approved]
- **Title:** [title]
- **Goal:** [goal]
- **Estimated duration:** [estimated_duration]
- **Deliverables:** N
- **Evaluator:** N checks, modo [mode]

## Deliverables declarados

| ID | Location | Description |
|----|----------|-------------|
| D1 | ... | ... |
| D2 | ... | ... |

## Evaluator (N checks, modo [mode])

| ID | Type | Required | Description |
|----|------|----------|-------------|
| C1 | file_exists | true | ... |
| C2 | grep_pattern | true | ... |
| C3 | sensor_subset | true | ... |
| C4 | custom_command (timeout 60s) | true | ... |

## Próximos passos

- Se status é `draft`: rodar novamente `/sprint-create` com confirmação para `approved`
- Se status é `approved`: pode iniciar implementação. Rodar `/sprint-evaluate` a qualquer momento para ver verdict mecânico
- Ao atingir `pass` consistente e a entrega estar completa, rodar `/sprint-close passed`

## Artefatos escritos

- `.claude/runtime/contracts/sprints/[parent_phase_id]/[sprint_id].json`
- `.claude/runtime/contracts/active-sprint.json` (apenas se status=approved)
- `.claude/runtime/execution-ledger.md` (entrada de sprint creation)

## Invariantes preservadas

- Phase contract `[parent_phase_id]` **não foi modificado** — vínculo é filesystem-based
- `active.json` (phase pointer) **não foi modificado**
```

## Regras

1. **Nunca criar sprint sem phase contract ativo.** Sprint é intra-fase por definição. Sem fase, não há sprint.
2. **Nunca mutar o phase contract.** Criar sprint não adiciona nada ao phase contract — o vínculo é derivado do filesystem.
3. **Sempre pedir segunda confirmação para `draft → approved`.** O evaluator é congelado em `approved`. O usuário deve ver completo antes de comprometer-se.
4. **`custom_command` sem `timeout_seconds` é inválido.** Rejeitar mecanicamente.
5. **`custom_command` com `requires_network: true` exige confirmação explícita.** Default é `false`.
6. **`sensor_subset` só cita sensores reais.** Referências a sensores inexistentes = sprint inválido.
7. **Apenas um sprint ativo por vez.** Criar sprint com outro já ativo exige confirmação explícita para sobrescrever o ponteiro.
8. **Sprint com 4+ deliverables emite alerta.** Sprints devem ser atômicos; muitos deliverables indicam sobre-carga.
9. **Evaluator precisa de pelo menos 1 check.** Sprint sem evaluator não tem função.

## Anti-padrões

- Sprint criado sem phase contract ativo
- Tentativa de modificar o phase contract para registrar que há sprint vinculado
- `custom_command` sem `timeout_seconds` (hardening obrigatório)
- `custom_command` com comandos que modificam arquivos, banco ou estado externo
- `custom_command` que escreve em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/`
- `sensor_subset` referenciando sensor que não existe em `sensors.json`
- `evaluator.mode: threshold` sem justificativa na `goal`
- Sprint com `estimated_duration` > 4h (sprint grande demais, deveria ser dois)
- Sprint com 5+ deliverables (deveria ser dois sprints)
- Sprint aprovado sem segunda confirmação explícita
- Criar sprint novo sem fechar o sprint ativo anterior (sobrescreve o ponteiro silenciosamente)
