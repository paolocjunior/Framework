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
      "verifiable_by": "sensor | manual_test | code_inspection",
      "sensor_id": "string opcional"
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
2. `sensors-last-run.json` tem `finished_at` mais recente que o último `contract-check` mas o resultado não está refletido em `evidence.sensors_verdict`
3. Plano correspondente foi modificado após `approved_at` (indicador de possível scope change)

Quando stale, consumers devem recomendar rodar `/contract-check` para atualizar evidência antes de tomar decisão.

## Vedações

- **Não editar contrato aprovado para baixar expectativas.** Moving the goalposts invalida a função do contrato. Se o escopo precisa mudar, criar novo contrato (ex: `phase-01-ui-shell-v2.json`) com justificativa em `verdict_reason` do anterior e transicionar o anterior para `deferred` ou `rolled_back`.
- **Não substituir plano por contrato.** O plano continua sendo o documento detalhado de COMO implementar. Contrato é só a declaração estruturada do QUE entregar. Ambos coexistem.
- **Não substituir ledger por contrato.** Ledger registra o histórico completo (reviews, findings, bloqueios, decisões). Contrato é a promessa upstream. Ambos coexistem.
- **Não permitir status automático.** `in_progress → done` não pode ser inferido — deve ser explícito. Razão: o agente não pode narrar "fase concluída" — o ambiente fornece evidência, mas a decisão é humana.
- **Não permitir contrato sem deliverables.** Contrato vazio não tem valor. Pelo menos 1 deliverable é obrigatório.
- **Não referenciar sensores não declarados.** `sensors_required` só pode conter sensor ids que existem em `.claude/runtime/sensors.json`. Referência a sensor inexistente = contrato inválido.

## Relação com outros artefatos

| Artefato | Escopo | Fonte de verdade para |
|---|---|---|
| Spec | Produto inteiro | O QUE o produto deve fazer |
| Plano (`plan.md`) | Fase específica | COMO implementar a fase |
| Contrato (`contracts/phase-<id>.json`) | Fase específica | O QUE a fase promete entregar |
| Ledger (`execution-ledger.md`) | Histórico inteiro | O QUE aconteceu em cada fase |
| Sensores (`sensors.json`) | Projeto inteiro | COMO validar mecanicamente |
| Sensors-last-run (`sensors-last-run.json`) | Última execução | Resultado da última validação mecânica |

Contrato é o elo entre plano (prose) e ledger (histórico): a promessa estruturada que se torna registro quando a fase fecha.

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
