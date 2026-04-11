---
description: Fechar sprint contract ativo com transição human-confirmed para passed | failed | deferred
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(jq:*), Bash(date:*), Bash(test:*), Bash(cat:*), Bash(ls:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de executar o fechamento:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Identificar a fase ativa no ledger e confirmar que há sprint ativo em `.claude/runtime/contracts/active-sprint.json`
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

## Propósito

Transicionar o sprint contract ativo de `approved | in_progress` para um estado terminal: `passed | failed | deferred`. Este é o **único command que altera o `status` e o `verdict` do sprint**, e a transição é sempre **confirmada por humano** — o verdict mecânico produzido por `/sprint-evaluate` informa a decisão, mas não a dita.

Esta é a contrapartida do Passo 8 de `/sprint-create` (draft → approved): assim como a aprovação do sprint exige confirmação explícita, o fechamento também exige. Não há fechamento automático baseado em verdict mecânico — o humano confirma que a entrega está completa (ou aceita o failure/deferral) antes da transição.

Após o fechamento:

- O sprint contract fica **imutável** (o arquivo permanece no filesystem, mas nenhum outro command escreve nele)
- O `active-sprint.json` é **resetado para null** (não há mais sprint ativo)
- O phase contract **não é modificado** — o vínculo continua sendo filesystem-based
- O ledger recebe uma entrada `Sprint Closed` registrando o fechamento

Ver `.claude/rules/sprint-contracts.md` para o schema, lifecycle e regras de transição.

## Quando usar

- Quando `/sprint-evaluate` reportou `PASS` consistente e a entrega está completa → `/sprint-close passed`
- Quando `/sprint-evaluate` reportou `FAIL` reincidente e a decisão é abandonar o sprint (ex: mudança de escopo, invalidação da premissa) → `/sprint-close failed`
- Quando o sprint foi iniciado mas o trabalho precisa ser adiado (outra prioridade, bloqueio externo) → `/sprint-close deferred`
- **Nunca** para "resetar" um sprint que vai ser retomado — deferred é final; retomar = criar sprint novo

## Pré-requisitos

- Sprint contract ativo em `.claude/runtime/contracts/active-sprint.json` com status `approved` ou `in_progress`
- Para `passed`: recomenda-se ter pelo menos 1 entrada em `evaluation_history` com verdict `pass` — o command avisa mas não bloqueia se estiver ausente
- Para `failed` ou `deferred`: `verdict_reason` é obrigatório (texto humano explicando por quê)

Se não há sprint ativo, o command reporta:

> "Nenhum sprint ativo encontrado em `.claude/runtime/contracts/active-sprint.json`. Não há o que fechar."

## Argumentos aceitos

O command aceita o target status como argumento opcional:

- `/sprint-close passed`
- `/sprint-close failed`
- `/sprint-close deferred`
- `/sprint-close` (sem argumento) — o command pergunta qual status aplicar

Valores fora de `{passed, failed, deferred}` são rejeitados.

## Execução

### Passo 1 — Localizar o sprint contract ativo

1. Ler `.claude/runtime/contracts/active-sprint.json`
2. Se `active_sprint_id` é `null` ou arquivo não existe → reportar "nenhum sprint ativo" e encerrar
3. Ler o sprint contract apontado em `active_sprint_path`
4. Validar schema via `jq empty` — se inválido, abortar
5. Ler campos essenciais:
   - `sprint_id`, `parent_phase_id`, `title`, `goal`, `status`
   - `approved_at`, `started_at`
   - `evaluation_history` (última entrada para informar a decisão)
   - `verdict` atual (deve ser `null` — se já estiver preenchido, o sprint já foi fechado)

### Passo 2 — Verificar que o sprint é fechável

Consultar a tabela de status:

| Status atual | Ação |
|---|---|
| `draft` | Rejeitar: "Sprint em draft não pode ser fechado. Draft é descartado por edição/recriação via `/sprint-create`, não por `/sprint-close`." → encerrar |
| `approved` | Prosseguir. Válido fechar sprint aprovado sem ter iniciado (ex: fechamento como `deferred` antes de começar) |
| `in_progress` | Prosseguir. Caminho mais comum |
| `passed` | Rejeitar: "Sprint já fechado como `passed` em `[closed_at]`. Sprints fechados são imutáveis. Para retomar, criar sprint novo com `/sprint-create`." → encerrar |
| `failed` | Rejeitar: "Sprint já fechado como `failed` em `[closed_at]`. Sprints fechados são imutáveis." → encerrar |
| `deferred` | Rejeitar: "Sprint já foi adiado em `[closed_at]`. Para retomar, criar sprint novo." → encerrar |

### Passo 3 — Resolver o target status

Se o command foi invocado com argumento (`passed`, `failed` ou `deferred`):

1. Validar que o argumento está na lista permitida
2. Se inválido, rejeitar com mensagem clara dos valores aceitos

Se o command foi invocado sem argumento:

1. Apresentar ao usuário um resumo do sprint e do histórico de evaluation
2. Perguntar:
   > "Qual status aplicar no fechamento?
   > - `passed` — entrega completa, verdict mecânico em `pass`, sprint concluído com sucesso
   > - `failed` — sprint abandonado por falha não recuperável ou mudança de premissa (exige motivo)
   > - `deferred` — sprint adiado por prioridade externa ou bloqueio (exige motivo)"
3. Aguardar resposta. Rejeitar valores fora da lista.

### Passo 4 — Consultar evaluation_history (informativo, não bloqueante)

Ler a última entrada de `evaluation_history` (se existir) e verificar coerência com o target status:

| Target | Última evaluation | Ação |
|---|---|---|
| `passed` | ausente (history vazio) | **Aviso forte**: "Sprint marcado como `passed` sem nenhuma execução de `/sprint-evaluate`. Recomendação: rodar `/sprint-evaluate` antes de fechar. Prosseguir mesmo assim? (sim/não)" |
| `passed` | `verdict: pass` | OK — verdict mecânico confirma o fechamento |
| `passed` | `verdict: partial` | **Aviso**: "Último verdict mecânico foi `partial` (checks em unknown). Confirmar que a entrega está completa mesmo com lacuna mecânica? (sim/não)" |
| `passed` | `verdict: fail` | **Aviso forte**: "Último verdict mecânico foi `fail` — checks required estão falhando. Fechar como `passed` contradiz o verdict mecânico. Confirmar explicitamente? (sim/não)" |
| `failed` | qualquer | OK — fechamento como failed não exige evidência de `pass` |
| `deferred` | qualquer | OK — deferral é decisão operacional, não mecânica |

O verdict mecânico **informa mas não dita** a decisão. O humano pode fechar como `passed` mesmo com último verdict `fail` (caso raro, ex: checks declarados eram incorretos e o trabalho real foi concluído) — mas o aviso forte obriga confirmação explícita.

### Passo 5 — Coletar verdict_reason

- **Se target é `passed`**: `verdict_reason` é opcional. Se omitido, usar `null`. Se fornecido, registrar (ex: "todos os deliverables confirmados em review manual além do verdict mecânico")
- **Se target é `failed`**: `verdict_reason` é **obrigatório**. Perguntar:
  > "Motivo do fechamento como `failed` (texto livre, obrigatório):"
  Rejeitar resposta vazia.
- **Se target é `deferred`**: `verdict_reason` é **obrigatório**. Perguntar:
  > "Motivo do adiamento (texto livre, obrigatório). Incluir: por que adiar, para quando revisitar, qual sprint/fase retoma:"
  Rejeitar resposta vazia.

### Passo 6 — Apresentar resumo e pedir confirmação final

Mostrar ao usuário:

```
## Fechamento de sprint pendente

- Sprint: [sprint_id]
- Parent phase: [parent_phase_id]
- Title: [title]
- Status atual: [approved | in_progress]
- Target status: [passed | failed | deferred]
- Verdict reason: [verdict_reason ou "(nenhum)"]
- Evaluation history: [N entradas, último verdict: pass|fail|partial|unknown]

Ao confirmar:
- status: [status atual] → [target]
- closed_at: [ISO timestamp agora]
- verdict: [passed | failed | deferred]
- verdict_reason: [texto]
- active-sprint.json: resetado para null (nenhum sprint ativo)
- Phase contract [parent_phase_id]: NÃO será modificado
- evaluation_history: preservado (append-only, nada removido)

Confirma fechamento? (sim/não)
```

Se `não` → encerrar sem alterações. Se `sim` → prosseguir.

### Passo 7 — Persistir o fechamento

Executar **na ordem**, com jq para garantir escape correto:

1. **Ler o sprint contract atual (fresh)** — pode ter sido editado por humano desde o Passo 1. Revalidar `jq empty`.
2. **Verificar que o status ainda é `approved` ou `in_progress`** — se mudou entre Passo 1 e agora, abortar com mensagem "conflito detectado: sprint foi alterado durante a operação"
3. **Atualizar os campos do sprint contract**:
   ```bash
   jq --arg status "$TARGET_STATUS" \
      --arg closed_at "$NOW_ISO" \
      --arg verdict "$TARGET_STATUS" \
      --arg reason "$VERDICT_REASON" \
      '.status = $status | .closed_at = $closed_at | .verdict = $verdict | .verdict_reason = (if $reason == "" then null else $reason end)' \
      "$SPRINT_FILE" > "$SPRINT_FILE.tmp" && mv "$SPRINT_FILE.tmp" "$SPRINT_FILE"
   ```
4. **Resetar `.claude/runtime/contracts/active-sprint.json`** para o estado null:
   ```json
   {
     "_comment": "...(manter o comment original)...",
     "active_sprint_id": null,
     "active_parent_phase_id": null,
     "active_sprint_path": null,
     "last_updated": "<ISO timestamp>"
   }
   ```
5. **NÃO modificar** `.claude/runtime/contracts/<parent_phase_id>.json` (phase contract) — vínculo é filesystem-based
6. **NÃO modificar** `.claude/runtime/contracts/active.json` (phase pointer)
7. **NÃO modificar** nenhum outro sprint contract (sprints anteriores da mesma fase continuam intactos)
8. **NÃO truncar** `evaluation_history` — todas as entradas permanecem como evidência histórica

### Passo 8 — Atualizar ledger

Adicionar entrada na seção apropriada do `execution-ledger.md`:

```
### Sprint Closed — <ISO timestamp>
- Sprint: <sprint_id>
- Parent phase: <parent_phase_id>
- Verdict: <passed | failed | deferred>
- Verdict reason: <reason ou "(nenhum)">
- Status transition: <approved | in_progress> → <target>
- Evaluation history count: <N>
- Last mechanical verdict: <pass | fail | partial | unknown | nenhum>
- Closed at: <ISO timestamp>
- Sprint file: .claude/runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json
```

Aplicar também o protocolo de `state-sync.md` para atualizar o snapshot `memory/project_spec-status.md` se o fechamento do sprint é evento significativo para o resumo da fase.

### Passo 9 — Reportar ao usuário

Output estruturado em markdown:

```markdown
# /sprint-close — Sprint Fechado

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Sprint fechado

- **Sprint ID:** `[sprint_id]`
- **Parent phase:** `[parent_phase_id]`
- **Title:** [title]
- **Verdict:** **[PASSED | FAILED | DEFERRED]**
- **Verdict reason:** [reason ou "(nenhum)"]
- **Status transition:** `[status anterior]` → `[target]`
- **Closed at:** [ISO timestamp]

## Evaluation history (preservado)

| Run | Timestamp | Verdict | passed/total |
|-----|-----------|---------|--------------|
| 1 | ... | fail | 1/4 |
| 2 | ... | partial | 2/4 |
| 3 | ... | pass | 4/4 |

[últimas 5 entradas, nenhuma removida]

## Artefatos modificados

- `.claude/runtime/contracts/sprints/[parent_phase_id]/[sprint_id].json` — status, closed_at, verdict, verdict_reason atualizados
- `.claude/runtime/contracts/active-sprint.json` — resetado para null (nenhum sprint ativo)
- `.claude/runtime/execution-ledger.md` — entrada de Sprint Closed adicionada

## Invariantes preservadas

- Phase contract `[parent_phase_id]` **não foi modificado** — vínculo é filesystem-based
- `.claude/runtime/contracts/active.json` (phase pointer) **não foi modificado**
- `evaluation_history` do sprint **preservado integralmente** (append-only)
- Sprints anteriores da mesma fase **não foram tocados**

## Próximos passos

- **Se verdict é `passed`:** a fase continua ativa. Para iniciar o próximo sprint, rodar `/sprint-create`. Para validar a fase completa antes de fechar, rodar `/contract-check` (deliverables da fase) e `/ship-check` (gate pré-entrega)
- **Se verdict é `failed`:** revisar o motivo registrado em `verdict_reason`. Se o trabalho precisa ser retomado com premissas novas, criar sprint novo via `/sprint-create` (não reabrir o fechado)
- **Se verdict é `deferred`:** revisitar quando a condição registrada em `verdict_reason` for satisfeita. Para retomar, criar sprint novo via `/sprint-create` — deferred é final para este sprint

## Sprint contract agora é imutável

O arquivo `[sprint_id].json` permanece no filesystem como registro histórico. Nenhum command do framework vai escrever nele novamente. Se o escopo muda e o trabalho precisa ser refeito, criar sprint novo (ex: `sprint-01b-loginscreen-v2`) — nunca editar o fechado.
```

## Regras

1. **Fechamento é sempre human-confirmed.** Nenhum command fecha sprint automaticamente, mesmo quando `/sprint-evaluate` reporta `pass`. O humano confirma que a entrega está completa.
2. **Sprint fechado é imutável.** Uma vez que `status` é `passed | failed | deferred`, nenhum command do framework escreve no arquivo. Re-trabalho exige novo sprint.
3. **`verdict_reason` é obrigatório para `failed` e `deferred`.** Sem motivo explícito, fechamento é rejeitado. Para `passed`, é opcional.
4. **Nunca modificar o phase contract.** Mesmo que o sprint seja o último da fase, fechar o sprint não fecha a fase. Fechamento da fase é via `/contract-check` + decisão humana separada.
5. **Nunca modificar `active.json` (phase pointer).** A fase continua ativa após o fechamento do sprint. O único pointer afetado é `active-sprint.json`.
6. **Reset de `active-sprint.json` é obrigatório no fechamento bem-sucedido.** Após qualquer fechamento (`passed`, `failed`, `deferred`), não há mais sprint ativo até `/sprint-create` novo.
7. **`evaluation_history` é preservado integralmente.** Nunca truncar, reordenar ou remover entradas durante o fechamento. O histórico é registro permanente.
8. **Aviso forte quando target diverge do verdict mecânico.** Fechar como `passed` com último verdict `fail` ou sem evaluation_history exige confirmação explícita do humano — não bloquear, mas alertar.
9. **Sprint em `draft` não é fechável.** Draft é descartado por recriação via `/sprint-create`, não por `/sprint-close`. `/sprint-close` opera apenas em sprints aprovados ou em andamento.
10. **Detectar conflito entre Passo 1 e Passo 7.** Se o sprint foi modificado entre a leitura inicial e a escrita final, abortar — preferir consistência sobre força bruta.

## Anti-padrões

- Fechar sprint automaticamente baseado em verdict mecânico de `/sprint-evaluate` — transição é humana por design
- Omitir `verdict_reason` em `failed` ou `deferred` — motivo é obrigatório para rastreabilidade
- Modificar o phase contract para registrar "sprint X fechado" — phase contract é imutável, ledger é histórico
- Modificar `active.json` (phase pointer) ao fechar sprint — sprint e fase são ponteiros independentes
- Truncar `evaluation_history` para "limpar" antes do fechamento — histórico é append-only
- Reabrir sprint fechado editando o arquivo manualmente — reabertura = criar sprint novo
- Fechar sprint em `draft` — draft é descartado por `/sprint-create`, não por `/sprint-close`
- Fechar sprint como `passed` sem ter rodado `/sprint-evaluate` ao menos uma vez — verdict mecânico deveria informar a decisão
- Rebaixar um fechamento `failed` para `deferred` "para não registrar falha" — se o sprint falhou, registrar como failed; deferred é adiamento consciente, não atenuação de falha
- Fechar um sprint e iniciar outro no mesmo comando — são duas operações distintas, cada uma com sua confirmação
