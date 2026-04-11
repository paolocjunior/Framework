# Execution Contracts Protocol

## Propósito

Definir contratos de execução como artefato estruturado de fase. Um contrato é a **declaração formal upstream** do que uma fase de implementação promete entregar, antes de a implementação começar. Enquanto o plano (`/plan`) descreve **como** a fase será implementada em linguagem natural, o contrato descreve **o que** a fase promete entregar em linguagem estruturada, mecanicamente verificável.

Esta rule resolve uma lacuna identificada pela análise de Harness Engineering: **o que a fase promete não é versionável nem verificável mecanicamente**. Planos são prose; o execution-ledger registra o que aconteceu; mas não existe artefato estruturado dizendo "ao final da fase X, os seguintes deliverables devem existir, os seguintes sensores devem estar verdes, os seguintes critérios devem ser observáveis". O contrato fecha essa lacuna.

Contratos são **opcionais**: projetos que não declaram contratos operam em modo degradado (sem contrato = sem gate contratual), igual ao modelo de sensores. A declaração é responsabilidade do projeto, não inferida pelo framework.

## Princípios

1. **Contrato é upstream, não post-mortem.** É criado ANTES de a implementação começar, derivado do plano aprovado. Não é um resumo do que foi feito — é uma promessa estruturada do que será feito.
2. **Contrato é estruturado, não prose.** JSON com schema definido. Consumidores mecânicos (`/contract-check`, `/ship-check`, `/verify-spec`) lêem os campos, não interpretam texto.
3. **Contrato é versionado.** Vive em `.claude/runtime/contracts/phase-<id>.json`, commitado no Git junto com o código. Histórico de fases é auditável via git log.
4. **Contrato é imutável após aprovação.** Uma vez aprovado, o contrato não deve ser editado para baixar expectativas (moving the goalposts). Mudança de escopo = novo contrato (v2, v3) com justificativa registrada no `verdict_reason` do anterior.
5. **Contrato não substitui o plano nem o ledger.** Plano = COMO. Contrato = O QUE. Ledger = O QUE ACONTECEU. Os três coexistem com funções distintas.

## Schema do contrato

O arquivo vive em `.claude/runtime/contracts/phase-<phase_id>.json`. É versionado no Git.

```json
{
  "schema_version": "1",
  "phase_id": "kebab-case-unique-id",
  "title": "string (human-readable)",
  "status": "draft | approved | in_progress | done | failed | rolled_back | deferred",
  "created_at": "ISO-8601 timestamp",
  "approved_at": "ISO-8601 | null",
  "started_at": "ISO-8601 | null",
  "finished_at": "ISO-8601 | null",
  "depends_on": ["array de phase_ids"],
  "spec_references": [
    {
      "requirement_id": "string (ex: AUTH-01)",
      "description": "string (resumo do requisito)"
    }
  ],
  "preconditions": [
    "string descrevendo condição verificável antes do start"
  ],
  "deliverables": [
    {
      "id": "D1",
      "description": "string (o que deve existir)",
      "artifact_type": "file | code | config | data | doc",
      "location": "string (path ou referência)",
      "verifiable_by": "file_exists | grep_pattern | sensor | manual_check",
      "pattern": "string opcional (se verifiable_by == grep_pattern)",
      "sensor_id": "string opcional (se verifiable_by == sensor)",
      "required": true
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "description": "string (comportamento observável)",
      "linked_requirement": "string opcional (ex: AUTH-01)",
      "verifiable_by": "sensor | behaviour | manual_test | code_inspection",
      "sensor_id": "string opcional (obrigatório quando verifiable_by == sensor)",
      "behaviour_id": "string opcional (obrigatório quando verifiable_by == behaviour)"
    }
  ],
  "sensors_required": ["array de sensor ids de sensors.json"],
  "out_of_scope": [
    "string descrevendo o que explicitamente NÃO está no escopo"
  ],
  "rollback_plan": "string (como desfazer se a fase falhar)",
  "evidence": {
    "files_created": [],
    "files_modified": [],
    "sensors_run_id": null,
    "sensors_verdict": null,
    "commits": []
  },
  "verdict": "null | done | failed | rolled_back | deferred",
  "verdict_reason": "string opcional"
}
```

### Campos obrigatórios

- `schema_version`
- `phase_id`
- `title`
- `status`
- `created_at`
- `depends_on` (pode ser array vazio)
- `deliverables` (pelo menos 1, com `required` declarado)
- `acceptance_criteria` (pelo menos 1)
- `sensors_required` (pode ser array vazio)
- `out_of_scope`
- `rollback_plan`

### Campos opcionais

- `spec_references` — se a fase está ligada a requisitos formais da spec
- `preconditions` — se a fase depende de estado específico antes do start
- `evidence` — populado durante a execução
- `verdict`, `verdict_reason` — populados ao fechar a fase

### Verificação de acceptance_criteria por behaviour (expansão aditiva)

A partir da camada de behaviour harness (ver `.claude/rules/behaviour-harness.md`), o campo `acceptance_criteria[].verifiable_by` aceita o valor `"behaviour"`, além dos existentes `sensor | manual_test | code_inspection`. A expansão é **aditiva**: phase contracts antigos que usam apenas os valores anteriores continuam válidos sem mudança.

**Regras:**

1. Quando `verifiable_by: "behaviour"`, o campo `behaviour_id` é **obrigatório** e deve apontar para um `id` existente em `.claude/runtime/behaviours.json`. Referência ausente ou quebrada torna o contrato inválido.
2. Quando `verifiable_by: "sensor"`, continua obrigatório o campo `sensor_id` apontando para um sensor declarado em `sensors.json`. Semântica inalterada.
3. Quando `verifiable_by: "manual_test"` ou `"code_inspection"`, nenhum campo de binding adicional é requerido.
4. **Binding bidirecional obrigatório.** Se um AC usa `verifiable_by: "behaviour"` + `behaviour_id: "b-01-login-success"`, o behaviour correspondente em `behaviours.json` deve declarar `contract_ref: "AC1"` (o id deste AC) **e** `phase_id: "<parent_phase_id>"` (o id desta fase). Ambas as pontas do vínculo devem existir para o consumer (`/contract-check`) considerar o AC coberto por runtime. Se só uma ponta existe, o consumer reporta **lacuna de binding** e o AC não é considerado satisfeito.
5. `behaviour_id` nunca é inferido pelo framework. O valor é declarado manualmente pelo usuário ao criar ou editar o phase contract.

**Interação com `/contract-check`:** Para cada AC com `verifiable_by: "behaviour"`, o command lê `behaviours-last-run.json` (read-only), localiza a entrada com id igual a `behaviour_id`, valida o binding bidirecional, aplica a política de staleness da camada de behaviours (ver `behaviour-harness.md`) e rebaixa o veredicto do contrato conforme a tabela R1-R10 se o behaviour está em `fail`, `error` ou stale. O command nunca dispara `/behaviour-run` — staleness é reportada, não resolvida.

## Lifecycle

Estados permitidos e transições:

```
draft → approved → in_progress → done
                              → failed → rolled_back
                              → deferred
```

| Estado | Significado | Quem transiciona |
|---|---|---|
| `draft` | Rascunho criado por `/contract-create`, aguardando aprovação do usuário | `/contract-create` (passo de criação) |
| `approved` | Aprovado pelo usuário, pronto para execução | Usuário (confirmação explícita no `/contract-create`) |
| `in_progress` | Implementação da fase começou | Manual (usuário) ao iniciar implementação |
| `done` | Fase concluída, todos deliverables presentes, sensores verdes | Manual (usuário) após `/contract-check` reportar READY_TO_CLOSE e `/ship-check` aprovar |
| `failed` | Fase concluída mas com deliverables faltando ou sensores vermelhos | Manual (usuário) quando decide não prosseguir |
| `rolled_back` | Fase revertida via rollback_plan | Manual (usuário) após executar o rollback |
| `deferred` | Fase adiada conscientemente antes de concluir | Manual (usuário) com justificativa |

**Nenhum estado transiciona automaticamente por hook.** Transições são explícitas via command ou edição manual. Razão: o agente não pode narrar "fase concluída" — o ambiente (sensores + verificação estrutural) fornece evidência, mas a decisão de fechar é humana.

## Integração com commands

| Command | Como interage |
|---|---|
| `/contract-create` | Cria contrato em `draft` a partir do plano aprovado; aguarda aprovação do usuário para transicionar a `approved` |
| `/contract-check` | Valida contrato ativo contra estado do projeto: deliverables presentes? sensores verdes? preconditions satisfeitas? Reporta veredicto estruturado sem modificar o contrato |
| `/ship-check` | Lê contrato ativo como parte da verificação pré-entrega (Bloco 0.5). Contrato ausente = lacuna reportada, não bloqueante. Contrato com deliverables `missing` ou sensores `fail` → rebaixa veredicto |
| `/verify-spec` | Cruza deliverables do contrato com cenários da spec. Deliverable prometido mas ausente = cenário NÃO COBERTO com evidência contratual |

## Pointer de contrato ativo

Para acesso rápido, `.claude/runtime/contracts/active.json` contém um ponteiro para o contrato da fase em andamento:

```json
{
  "active_phase_id": "phase-01-ui-shell",
  "active_contract_path": ".claude/runtime/contracts/phase-01-ui-shell.json",
  "last_updated": "ISO-8601"
}
```

Se o arquivo não existe ou `active_phase_id` é null, não há fase ativa — nenhum contrato está sendo verificado.

## Staleness

Um contrato em `approved` ou `in_progress` é considerado stale se:

1. Arquivos referenciados em `deliverables[].location` foram modificados mas `evidence.files_modified` não foi atualizado
2. `sensors-last-run.json` existe e o `run_id` diverge de `evidence.sensors_run_id` registrado no contrato (inclui o caso `evidence.sensors_run_id == null` quando um run posterior a `approved_at` já existe), indicando que a evidência do contrato não reflete a última execução mecânica
3. Plano correspondente foi modificado após `approved_at` (indicador de possível scope change)

Quando stale, `/contract-check` **detecta e reporta** o estado stale no output — mas não atualiza evidência. O command é read-only absoluto e nunca modifica o contrato, o ledger ou `active.json`. A atualização da evidência é responsabilidade humana: o usuário deve **editar manualmente** os campos de `evidence` no contrato (ex: `evidence.sensors_run_id`, `evidence.files_modified`, `evidence.sensors_verdict`) para refletir o estado atual, ou, se o stale indicar scope change material (ex: plano modificado após `approved_at`), **criar um contrato v2** via `/contract-create` com justificativa registrada no `verdict_reason` do contrato anterior. Consumers downstream (`/ship-check`, `/verify-spec`) que encontrem um contrato stale devem reportar a staleness como lacuna informativa e recomendar a atualização humana antes da decisão final — nunca assumir que rodar `/contract-check` resolve a staleness, porque não resolve.

## Vedações

- **Não editar contrato aprovado para baixar expectativas.** Moving the goalposts invalida a função do contrato. Se o escopo precisa mudar, criar novo contrato (ex: `phase-01-ui-shell-v2.json`) com justificativa em `verdict_reason` do anterior e transicionar o anterior para `deferred` ou `rolled_back`.
- **Não substituir plano por contrato.** O plano continua sendo o documento detalhado de COMO implementar. Contrato é só a declaração estruturada do QUE entregar. Ambos coexistem.
- **Não substituir ledger por contrato.** Ledger registra o histórico completo (reviews, findings, bloqueios, decisões). Contrato é a promessa upstream. Ambos coexistem.
- **Não permitir status automático.** `in_progress → done` não pode ser inferido — deve ser explícito. Razão: o agente não pode narrar "fase concluída" — o ambiente fornece evidência, mas a decisão é humana.
- **Não permitir contrato sem deliverables.** Contrato vazio não tem valor. Pelo menos 1 deliverable é obrigatório.
- **Não referenciar sensores não declarados.** `sensors_required` só pode conter sensor ids que existem em `.claude/runtime/sensors.json`. Referência a sensor inexistente = contrato inválido.
- **Não mutar phase contract ao criar, avaliar ou fechar sprint.** Sprints são sub-granularidade opcional; o vínculo fase → sprints é derivado do filesystem (`contracts/sprints/<parent_phase_id>/`), nunca por campo adicionado ao phase contract. Phase contract aprovado permanece imutável mesmo quando dezenas de sprints são criados dentro dele.
- **Não acoplar `active-sprint.json` a `active.json`.** Sprint pointer e phase pointer são independentes. Fechar sprint reseta apenas `active-sprint.json`; a fase continua ativa em `active.json` até que o humano explicitamente transicione o phase contract.

## Relação com outros artefatos

| Artefato | Escopo | Fonte de verdade para |
|---|---|---|
| Spec | Produto inteiro | O QUE o produto deve fazer |
| Plano (`plan.md`) | Fase específica | COMO implementar a fase |
| Contrato de fase (`contracts/phase-<id>.json`) | Fase específica | O QUE a fase promete entregar |
| Contrato de sprint (`contracts/sprints/<parent_phase_id>/<sprint_id>.json`) | Entrega atômica intra-fase (horas) | O QUE o sprint promete entregar + evaluator mecânico |
| Ledger (`execution-ledger.md`) | Histórico inteiro | O QUE aconteceu em cada fase/sprint |
| Sensores (`sensors.json`) | Projeto inteiro | COMO validar mecanicamente |
| Sensors-last-run (`sensors-last-run.json`) | Última execução | Resultado da última validação mecânica |

Contrato é o elo entre plano (prose) e ledger (histórico): a promessa estruturada que se torna registro quando a fase fecha. Sprint contracts adicionam uma camada de granularidade fina (horas-escala) **dentro** da fase, permitindo ciclos de feedback curtos sem mutar o phase contract.

## Sprint contracts (granularidade intra-fase)

Sprint contracts são uma **sub-granularidade opcional** do contrato de execução. Enquanto um phase contract declara o compromisso da fase em escala de dias/semanas, um sprint contract declara uma entrega atômica de 1-2h com **evaluator declarativo** — uma bateria de checks que produz verdict mecânico `pass | fail | partial` a cada execução.

### Invariantes críticos

1. **Phase contract é imutável por sprint.** Criar, avaliar ou fechar um sprint **nunca** modifica o phase contract aprovado. O vínculo fase → sprints é derivado do filesystem:
   ```
   .claude/runtime/contracts/
   ├── phase-01-ui-shell.json          # phase contract (imutável após approved)
   ├── active.json                      # phase pointer
   ├── active-sprint.json               # sprint pointer (separado)
   └── sprints/
       └── phase-01-ui-shell/           # diretório derivado do parent_phase_id
           ├── sprint-01-loginscreen-base.json
           ├── sprint-02-loginscreen-validation.json
           └── sprint-03-homescreen-skeleton.json
   ```
2. **`active-sprint.json` é pointer independente de `active.json`.** Fase e sprint têm ponteiros separados. Fechar sprint não fecha fase.
3. **Append-only `evaluation_history`.** Cada execução de `/sprint-evaluate` adiciona uma entrada — nunca substitui. O histórico é preservado integralmente até o fechamento.
4. **Transição de status é sempre human-confirmed.** `/sprint-evaluate` produz verdict mecânico mas não transiciona. Só `/sprint-close` transiciona, e exige confirmação explícita do humano.

### Sprint contract vs phase contract

| Dimensão | Phase contract | Sprint contract |
|---|---|---|
| Escopo temporal | Dias a semanas | 1-2h (máximo 4h) |
| Deliverables típicos | 3-10 | 1-3 |
| Verificação | `/contract-check` via tabela R1-R10 | `/sprint-evaluate` via evaluator declarativo |
| Atomicidade | Agregado de sprints | Unidade atômica |
| Mutabilidade | Imutável após `approved` | Imutável após `passed/failed/deferred` |
| Vínculo | `active.json` pointer | `active-sprint.json` pointer + filesystem folder |
| Autoridade | Spec + plano da fase | Plano da fase + delivery do dia |

### Lifecycle do sprint

```
draft → approved → in_progress → passed
                              → failed
                              → deferred
```

Transições:

- `draft → approved`: confirmação humana em `/sprint-create` (Passo 8)
- `approved → in_progress`: implícito ao começar o trabalho (ou explícito via edição manual)
- `in_progress → passed|failed|deferred`: confirmação humana em `/sprint-close` (nunca automático)

### Evaluator: tipos de check

Cada sprint declara um `evaluator` com bateria de checks atômicos. Tipos suportados:

| Tipo | Verdict vem de | Uso típico |
|---|---|---|
| `file_exists` | path existe no filesystem | Confirmar criação de arquivo-chave |
| `grep_pattern` | contagem de matches em arquivo | Confirmar uso de tokens/API esperada |
| `sensor_subset` | consumo de `sensors-last-run.json` (subset de sensor_ids) | Reutilizar verdict mecânico de sensores |
| `custom_command` | exit code de comando (timeout obrigatório) | Teste isolado, validação estrutural |

### Hardening de `custom_command`

Checks do tipo `custom_command` têm regras mecanicamente enforced (em `/sprint-create` na declaração e em `/sprint-evaluate` na execução):

1. **`timeout_seconds` é obrigatório.** Declaração sem timeout é rejeitada.
2. **`requires_network` default é `false`.** Rede exige declaração explícita.
3. **Read-only por contrato.** Comandos não devem modificar arquivos, banco ou estado externo.
4. **Proibido escrever em artefatos do framework** (`.claude/runtime/`, `.claude/rules/`, `.claude/commands/`).
5. **Timeout máximo sugerido: 120s.** Acima disso, o check deveria ser sensor, não check de evaluator.
6. **Exit code é única autoridade.** Nenhuma reinterpretação de stdout/stderr. Exit 0 = pass, qualquer outro = fail.

### Agregação de verdict

Dois modos suportados:

- **`all` (default):** todos os checks `required: true` devem passar. Pelo menos 1 required em fail/error → verdict `fail`. Pelo menos 1 required em unknown → verdict `partial`. Todos required em pass → verdict `pass`.
- **`threshold`:** pelo menos N checks de qualquer tipo devem passar. Exige justificativa explícita na goal. `passed_count >= threshold` → pass. `passed_count + unknown_count >= threshold` → partial. Caso contrário → fail.

A primeira regra que casa decide o verdict.

### Commands do sprint

| Command | Função | Mutação |
|---|---|---|
| `/sprint-create` | Cria sprint contract em draft, aprova para active após segunda confirmação | Escreve sprint file + `active-sprint.json` (apenas ao aprovar) |
| `/sprint-evaluate` | Executa evaluator, reporta verdict mecânico | Append-only em `evaluation_history` — nada mais |
| `/sprint-close` | Transiciona sprint para passed/failed/deferred com confirmação humana | Atualiza sprint file (status, closed_at, verdict, verdict_reason) + reseta `active-sprint.json` |

Ver `.claude/rules/sprint-contracts.md` para o contrato completo (schema, lifecycle, hardening).

### Modo degradado

Projetos que não criam sprints operam normalmente — phase contracts continuam funcionando sem sprints. Sprint é opcional: é uma ferramenta para fases longas que se beneficiam de ciclos de feedback curtos, não uma obrigação. Projetos simples ou fases atômicas podem operar apenas com phase contract + plano + sensores.

## Relação com sensores

Contratos e sensores são camadas complementares:

- **Sensores** respondem "o código compila / testa / lint / type-check passou?" — mecânica por exit code
- **Contratos** respondem "a fase entregou o que prometeu?" — estrutural por schema

Um contrato pode declarar `sensors_required: ["unit-tests", "lint", "type-check"]` — isso significa que para a fase poder ser considerada `done`, esses sensores devem estar `pass` no `sensors-last-run.json` mais recente. O contrato **não executa** os sensores — consome o resultado deles via `/contract-check`.

Se um contrato referencia um sensor que falhou, `/contract-check` reporta veredicto `FAILED` ou `AT_RISK` e o usuário decide se corrige o código ou investiga o sensor antes de avançar.

## Bootstrap

Em projeto novo que quer adotar contratos:

1. Criar diretório `.claude/runtime/contracts/` (copiar `.gitkeep` do template)
2. Ao aprovar o primeiro plano via `/plan-review`, rodar `/contract-create` para gerar o primeiro contrato
3. Revisar o draft gerado e aprovar para transicionar a `approved`
4. Durante a implementação, rodar `/contract-check` periodicamente para validar progresso
5. Ao concluir a fase, rodar `/contract-check` para confirmar READY_TO_CLOSE, depois `/ship-check` para validação final, e então transicionar manualmente o status para `done`

Projetos que não declaram contratos operam em modo degradado — `/ship-check` e `/verify-spec` reportam a ausência como lacuna mas não bloqueiam veredicto.

### Bootstrap adicional — sprint contracts (opcional)

Se a fase é longa e se beneficia de ciclos de feedback curtos (horas, não dias), adicionar camada de sprints:

1. Após aprovar o phase contract, rodar `/sprint-create` para declarar a primeira entrega atômica (1-2h) com evaluator
2. Revisar o draft do sprint e aprovar para transicionar a `approved` (Passo 8 do `/sprint-create`)
3. Durante a implementação do sprint, rodar `/sprint-evaluate` tantas vezes quanto necessário — cada execução adiciona uma entrada em `evaluation_history` (append-only)
4. Quando a entrega está completa e o último verdict mecânico é `pass`, rodar `/sprint-close passed` para transicionar
5. Criar sprint seguinte via `/sprint-create` e repetir até completar a fase
6. Quando todos os sprints da fase estão fechados e a fase está pronta, executar o fluxo normal de fechamento da fase (`/contract-check` → `/ship-check` → transição manual do phase contract)

Projetos que não criam sprints continuam funcionando normalmente com phase contracts + plano + sensores. Sprint é uma ferramenta opcional, não obrigatória.
