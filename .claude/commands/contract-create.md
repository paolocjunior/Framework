---
description: Criar contrato estruturado de fase a partir do plano aprovado
allowed-tools: Read, Write, Grep, Glob, Bash(jq:*), Bash(date:*), Bash(mkdir:*), Bash(test:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de iniciar a criação do contrato:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Identificar a fase ativa (ou a próxima fase a iniciar) no ledger
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

## Propósito

Transformar o plano aprovado em contrato estruturado — um artefato JSON que declara o que a fase promete entregar. O contrato é consumido downstream por `/contract-check`, `/ship-check` e `/verify-spec` para validação mecânica de progresso e aderência.

Este command NÃO substitui o plano. O plano continua sendo a descrição detalhada de COMO implementar. O contrato é a declaração estruturada de O QUE entregar.

Ver `.claude/rules/execution-contracts.md` para o schema completo e o lifecycle.

## Quando usar

- Após `/plan-review` aprovar o plano (marker `.plan-approved` presente)
- Antes de iniciar implementação da fase
- Ao substituir um contrato anterior por scope change (criar v2 com justificativa)

## Pré-requisitos

- Plano da fase atual existe e foi aprovado via `/plan-review`
- Marker `.claude/runtime/.plan-approved` presente
- Fase ativa identificável no ledger
- (Opcional mas recomendado) `.claude/runtime/sensors.json` declarado — permite preencher `sensors_required` com sensor ids reais

## Execução

### Passo 1 — Verificar pré-requisitos

1. Verificar se `.claude/runtime/.plan-approved` existe. Se ausente, parar com erro:
   > "Contrato só pode ser criado após `/plan-review` aprovar o plano. Execute `/plan-review` primeiro."
2. Identificar a fase ativa no ledger (ou a próxima fase no roadmap)
3. Verificar se já existe contrato para essa fase em `.claude/runtime/contracts/phase-<id>.json`:
   - **Existe e status é `draft`** → perguntar ao usuário se quer sobrescrever
   - **Existe e status é `approved | in_progress`** → pedir confirmação explícita para criar nova versão (`phase-<id>-v2.json`) com justificativa
   - **Existe e status é `done | failed | rolled_back | deferred`** → criar contrato da próxima fase
   - **Não existe** → prosseguir

### Passo 2 — Ler o plano da fase

Localizar o plano mais recente. Pode ser:
- Arquivo de plano na raiz ou em `.planning/`
- Arquivo gerado por `/plan` em sessão anterior
- Plano embedded no ledger (seção da fase ativa)

Ler o plano completo. Extrair:
- Objetivo da fase (vira `title`)
- Arquivos a criar/modificar (viram `deliverables` candidatos)
- Critérios de aceite mencionados no plano (viram `acceptance_criteria` candidatos)
- Dependências declaradas (viram `depends_on`)
- Escopo explícito "fora do escopo" (vira `out_of_scope`)
- Estratégia de rollback mencionada (vira `rollback_plan`)

### Passo 3 — Consultar sensores declarados

Ler `.claude/runtime/sensors.json` se existir:
- Listar sensor ids disponíveis
- Identificar quais são típicos para a fase (test, lint, type-check, build são candidatos padrão)
- Se `sensors.json` não existe, `sensors_required` fica vazio e recomendação é incluída no output: "Projeto sem sensores declarados — considerar rodar bootstrap de sensores antes de iniciar a fase"

### Passo 4 — Sintetizar o contrato (draft)

Gerar o contrato JSON conforme schema de `.claude/rules/execution-contracts.md`, com campos derivados do plano:

- `schema_version`: `"1"`
- `phase_id`: derivar do ledger (ex: `"phase-01-ui-shell"`)
- `title`: objetivo da fase extraído do plano
- `status`: `"draft"`
- `created_at`: timestamp ISO-8601 atual (`date -u +"%Y-%m-%dT%H:%M:%SZ"`)
- `approved_at`, `started_at`, `finished_at`: `null`
- `depends_on`: fases anteriores mencionadas como pré-requisito no plano
- `spec_references`: requisitos da spec referenciados pelo plano, com IDs formais quando a spec usa formato `CATEGORIA-NN`
- `preconditions`: mínimo `["Plano aprovado via /plan-review", "Marker .plan-approved presente"]` + outros extraídos do plano
- `deliverables`: lista de artefatos a entregar, cada um com `verifiable_by` preenchido e `required` declarado (true/false)
- `acceptance_criteria`: critérios observáveis ligados a requisitos da spec
- `sensors_required`: sensores relevantes dentre os declarados em `sensors.json`
- `out_of_scope`: lista explícita do que não será feito na fase (mínimo 1 item — se o plano não declara, perguntar ao usuário)
- `rollback_plan`: estratégia concreta de reversão (mínimo `"git revert do merge commit da fase"` se nada mais for declarado)
- `evidence`: estrutura vazia inicial (`files_created: []`, `files_modified: []`, `sensors_run_id: null`, `sensors_verdict: null`, `commits: []`)
- `verdict`, `verdict_reason`: `null`

### Passo 5 — Apresentar o draft ao usuário

Mostrar o contrato JSON gerado e perguntar:

> "Este é o contrato que vou criar para a fase `[phase_id]`. Revise os campos e confirme:
> - Os **deliverables** capturam tudo que a fase precisa entregar? Cada um tem `verifiable_by` apropriado?
> - Os **acceptance_criteria** estão ligados aos requisitos certos da spec?
> - Os **sensores** listados em `sensors_required` são os que devem estar verdes para fechar a fase?
> - O **rollback_plan** é executável?
> - O **out_of_scope** captura tudo que NÃO será feito, para evitar scope creep?
>
> Responda:
> - `aprovar draft` — salvo em `status=draft`, aguardando segunda confirmação para `approved`
> - `editar [campo]` — solicito ajuste antes de salvar
> - `cancelar` — descarto o draft"

### Passo 6 — Persistir o contrato

Se o usuário aprovou o draft:

1. Criar diretório `.claude/runtime/contracts/` se não existir
2. Escrever `.claude/runtime/contracts/phase-<phase_id>.json` com `status="draft"`
3. Atualizar `.claude/runtime/contracts/active.json` apontando para o novo contrato:
   ```json
   {
     "active_phase_id": "phase-<id>",
     "active_contract_path": ".claude/runtime/contracts/phase-<id>.json",
     "last_updated": "<ISO timestamp>"
   }
   ```
4. Perguntar ao usuário:
   > "Contrato salvo como `draft`. Confirma aprovação para marcar como `approved` e autorizar início da implementação? (sim/não)"
5. Se `sim`:
   - Atualizar `status` para `"approved"`
   - Preencher `approved_at` com timestamp atual
   - Re-escrever o arquivo

Usar `jq` para gerar/atualizar o JSON — garante escape correto de strings.

### Passo 7 — Atualizar ledger

Adicionar entrada na seção apropriada do `execution-ledger.md`:

```
### Contract Created — <ISO timestamp>
- Phase: <phase_id>
- Title: <title>
- Status: <draft | approved>
- Deliverables: N
- Acceptance criteria: N
- Sensors required: <lista ou "nenhum">
- Contract file: `.claude/runtime/contracts/phase-<id>.json`
```

### Passo 8 — Output ao usuário

```markdown
# /contract-create — Contrato Criado

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Contrato da Fase [phase_id]

- **Status:** [draft | approved]
- **Title:** [title]
- **Deliverables:** N (X obrigatórios, Y opcionais)
- **Acceptance criteria:** N
- **Sensors required:** [lista]
- **Depends on:** [lista de phase_ids ou "nenhum"]
- **Out of scope:** N items declarados

## Deliverables declarados

| ID | Descrição | Verifiable by | Required |
|----|-----------|---------------|----------|
| D1 | ... | file_exists | true |
| D2 | ... | sensor (unit-tests) | true |

## Próximos passos

- Se status é `draft`: rodar novamente `/contract-create` com confirmação para `approved`
- Se status é `approved`: pode iniciar implementação. O contrato será verificado por `/contract-check` durante o progresso e por `/ship-check` ao fechar a fase
- `/contract-check` pode ser rodado a qualquer momento para validar estado atual contra o contrato

## Artefatos escritos

- `.claude/runtime/contracts/phase-<id>.json`
- `.claude/runtime/contracts/active.json` (pointer atualizado)
- `.claude/runtime/execution-ledger.md` (entrada de contract creation)
```

## Regras

1. **Nunca criar contrato sem plan-review aprovado.** Contrato é downstream do plano. Sem plano aprovado, não há o que prometer.
2. **Sempre pedir confirmação explícita para transicionar `draft → approved`.** O usuário deve ver o contrato completo e aprovar antes de comprometer-se.
3. **Nunca editar contrato aprovado silenciosamente.** Mudança de escopo = novo contrato (v2), não edição do anterior.
4. **Deliverables devem ter `verifiable_by` preenchido.** "Verificável por magia" não é aceitável. Cada deliverable precisa dizer como será verificado mecanicamente ou manualmente.
5. **`sensors_required` só cita sensores reais.** Se o projeto tem `sensors.json`, apenas sensores declarados lá podem ser referenciados. Referência a sensor inexistente = contrato inválido e deve ser rejeitado.
6. **`out_of_scope` não pode ser vazio.** Se tudo está no escopo, o escopo não foi pensado. Forçar pelo menos 1 item — mesmo que seja "nada adicional identificado".

## Anti-padrões

- Contrato criado com deliverables genéricos ("implementar funcionalidade X") sem localização ou `verifiable_by`
- Contrato com `out_of_scope` vazio ou `["nenhum"]` genérico
- Contrato com `rollback_plan: "n/a"` ou `"não aplicável"` (sempre há um plano de rollback, mesmo que seja `git revert`)
- Contrato com `sensors_required` citando sensores não declarados em `sensors.json`
- Contrato aprovado sem segunda confirmação explícita do usuário
- Contrato criado a partir de plano que não passou por `/plan-review`
- Contrato com deliverables obrigatórios usando `verifiable_by: manual_check` sem justificativa — se pode ser verificado mecanicamente (file_exists, grep, sensor), prefira mecânica
