# Sprint Contracts Protocol

## Propósito

Definir sprint contracts como **granularidade intra-fase** dos execution contracts. Enquanto um execution contract (phase) declara o compromisso formal da fase em escala de dias a semanas, um sprint contract declara uma unidade atômica de entrega em escala de **horas a um dia**, com um **evaluator determinístico** que produz verdict pass/fail mecanicamente a cada execução.

Esta rule resolve uma lacuna de granularidade temporal apontada pela análise de Harness Engineering: **sinal de progresso só aparece no fim da fase, quando o custo de corrigir drift é alto**. Sprints fecham ciclos curtos — o usuário descobre em 1-2h se uma entrega atômica passou ou não, em vez de descobrir no contract-check final da fase que algo divergiu.

Sprints são **opcionais**. Projetos que operam em ciclo de fase inteira sem sub-divisão continuam funcionando normalmente. A declaração de sprints é responsabilidade do projeto, não inferida pelo framework.

## Princípios

1. **Sprint é intra-fase, não substitui fase.** Um execution contract (phase) continua sendo o compromisso formal e autoritativo. Sprints são granularidade interna opcional. A fase fecha mesmo sem sprints; sprints fecham mesmo sem mudar a fase.
2. **Evaluator é declarado upstream.** Assim como o execution contract declara o que a fase promete antes de começar, o sprint contract declara o evaluator — a bateria de checks atômicos que vai julgar a entrega — antes de o trabalho começar.
3. **Evaluator é composto de checks atômicos.** Cada check é uma verificação determinística independente (`file_exists`, `grep_pattern`, `sensor_subset`, `custom_command`). O verdict do evaluator é a agregação mecânica dos checks.
4. **Evaluator é executado múltiplas vezes.** Cada execução produz uma entrada append-only em `evaluation_history`. Rodar `/sprint-evaluate` 10 vezes gera 10 entradas — é log, não substituição.
5. **Status transition continua humano.** `/sprint-evaluate` produz verdict mecânico mas **não transiciona status**. A transição `passed | failed | deferred` é sempre explícita via `/sprint-close`. Preserva o princípio estabelecido em execution contracts: o agente não narra conclusão — o ambiente fornece evidência, a decisão é humana.
6. **Phase contract é imutável.** Criar ou fechar sprint **nunca** modifica o phase contract aprovado. O vínculo fase → sprints é derivado do filesystem, não registrado dentro do phase contract. Ver seção "Vínculo fase ↔ sprints".
7. **Evaluator consome sensores, não executa.** Check do tipo `sensor_subset` **lê** o resultado de `sensors-last-run.json`. Nunca dispara execução de sensores. Sensores continuam sendo executados exclusivamente por `/sensors-run`.
8. **`custom_command` é read-only, timeout obrigatório, sem rede por default.** Qualquer check de comando customizado deve respeitar essas vedações — ver seção "Hardening de custom_command".

## Vínculo fase ↔ sprints (filesystem-based)

O phase contract é imutável após aprovação. Para preservar essa imutabilidade, **o phase contract nunca é modificado ao criar ou fechar sprints**. O vínculo entre fase e sprints é derivado da estrutura de diretórios.

### Estrutura

```
.claude/runtime/contracts/
├── active.json                       # Phase contract ativo (item #3)
├── active-sprint.json                # Sprint contract ativo (item #4)
├── phase-01-ui-shell.json            # Phase contract (imutável)
└── sprints/
    ├── .gitkeep
    ├── phase-01-ui-shell/            # Subdiretório por parent_phase_id
    │   ├── sprint-01-loginscreen-base.json
    │   ├── sprint-02-navigation-wiring.json
    │   └── sprint-03-login-validation.json
    └── phase-02-auth-flows/
        └── sprint-01-jwt-wiring.json
```

### Enumeração de sprints por fase

Para listar sprints de uma fase, commands consumidores (`/contract-check`, `/ship-check`) fazem `ls .claude/runtime/contracts/sprints/<parent_phase_id>/` e leem cada arquivo.

O único vínculo canônico é o campo `parent_phase_id` dentro do sprint contract — redundante com o caminho, mas explícito para evitar ambiguidade em caso de mover arquivos entre diretórios.

### Por que filesystem e não índice

- **Preserva imutabilidade**: phase contract não é tocado
- **Sem ponto de dessincronização**: não existe índice que pode ficar inconsistente com o diretório
- **Auditável**: `git log .claude/runtime/contracts/sprints/<phase_id>/` mostra histórico completo de sprints da fase
- **Resistente a merge conflicts**: dois devs criando sprints diferentes da mesma fase criam arquivos diferentes, sem colisão

## Schema do sprint contract

O arquivo vive em `.claude/runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json`. É versionado no Git.

```json
{
  "schema_version": "1",
  "sprint_id": "sprint-01-loginscreen-base",
  "parent_phase_id": "phase-01-ui-shell",
  "title": "string (human-readable)",
  "goal": "string (o que este sprint entrega, 1-2 frases)",
  "status": "draft | approved | in_progress | passed | failed | deferred",
  "created_at": "ISO-8601 timestamp",
  "approved_at": "ISO-8601 | null",
  "started_at": "ISO-8601 | null",
  "closed_at": "ISO-8601 | null",
  "estimated_duration": "string (human-readable, ex: '1-2h', '4h')",
  "deliverables": [
    {
      "id": "D1",
      "location": "string (path relativo à raiz do projeto)",
      "description": "string (o que deve existir neste path)"
    }
  ],
  "evaluator": {
    "mode": "all | threshold",
    "threshold": 0,
    "checks": [
      {
        "id": "C1",
        "type": "file_exists | grep_pattern | sensor_subset | custom_command",
        "description": "string (o que este check verifica, human-readable)",
        "required": true,
        "target": "string opcional (path para file_exists e grep_pattern)",
        "pattern": "string opcional (regex para grep_pattern)",
        "min_matches": "integer opcional (default 1 para grep_pattern)",
        "sensor_ids": ["array opcional (para sensor_subset)"],
        "command": "string opcional (para custom_command)",
        "timeout_seconds": "integer opcional (obrigatório para custom_command)",
        "requires_network": "boolean opcional (default false, para custom_command)",
        "working_dir": "string opcional (para custom_command, relativo à raiz)"
      }
    ]
  },
  "evaluation_history": [
    {
      "run_id": "string (uuid ou timestamp)",
      "run_at": "ISO-8601",
      "verdict": "pass | fail | partial",
      "passed_count": 0,
      "failed_count": 0,
      "unknown_count": 0,
      "total_count": 0,
      "duration_ms": 0,
      "results": [
        {
          "check_id": "C1",
          "status": "pass | fail | unknown | error",
          "evidence": "string (trecho do output, path verificado, exit code, etc.)"
        }
      ]
    }
  ],
  "verdict": "null | passed | failed | deferred",
  "verdict_reason": "string opcional"
}
```

### Campos obrigatórios

- `schema_version`
- `sprint_id`
- `parent_phase_id` (deve bater com um phase contract existente em `approved` ou `in_progress`)
- `title`
- `goal`
- `status`
- `created_at`
- `estimated_duration`
- `deliverables` (pelo menos 1)
- `evaluator` (pelo menos 1 check)

### Campos opcionais

- `approved_at`, `started_at`, `closed_at` — preenchidos em transições de status
- `evaluation_history` — começa vazio, recebe append a cada execução de `/sprint-evaluate`
- `verdict`, `verdict_reason` — preenchidos no fechamento via `/sprint-close`

## Tipos de check do evaluator

### `file_exists`

Verifica se um arquivo ou diretório existe.

**Campos:**
- `target`: path relativo à raiz do projeto
- `required`: boolean

**Resultado:**
- `pass` — path existe
- `fail` — path não existe
- `error` — path inválido (fora do projeto, absoluto)

**Evidência:** tamanho do arquivo em bytes ou "directory with N entries".

### `grep_pattern`

Verifica se um arquivo contém um padrão (regex).

**Campos:**
- `target`: path do arquivo
- `pattern`: regex (compatível com ripgrep/grep)
- `min_matches`: integer (default 1)
- `required`: boolean

**Resultado:**
- `pass` — pattern casa pelo menos `min_matches` vezes no arquivo
- `fail` — pattern casa menos que `min_matches` vezes
- `error` — arquivo não existe ou regex inválida

**Evidência:** contagem de matches e primeira linha que casou (ex: `3 matches, first at src/screens/LoginScreen.tsx:12`).

### `sensor_subset`

Consulta o resultado de sensores específicos em `sensors-last-run.json`.

**Campos:**
- `sensor_ids`: array de strings com sensor ids
- `required`: boolean

**Resultado:**
- `pass` — **todos** os sensores listados estão `status: pass` no último run
- `fail` — pelo menos 1 sensor da lista está `status: fail`
- `unknown` — pelo menos 1 sensor não foi encontrado em `sensors-last-run.json` (não executado ainda) e nenhum falhou
- `error` — `sensors-last-run.json` ausente, ou sensor referenciado não existe em `sensors.json`

**Evidência:** lista de `sensor_id: status` com exit codes.

### `custom_command`

Executa um comando shell e usa o exit code como verdict.

**Campos obrigatórios:**
- `command`: string (comando bash executado via `sh -c`)
- `timeout_seconds`: integer (obrigatório — sem default)
- `required`: boolean

**Campos opcionais:**
- `working_dir`: path relativo à raiz (default: raiz)
- `requires_network`: boolean (default `false`)

**Resultado:**
- `pass` — exit code 0 dentro do timeout
- `fail` — exit code != 0 dentro do timeout
- `error` — timeout estourado, comando inválido, working_dir inexistente

**Evidência:** exit code + últimas 20 linhas de stdout/stderr.

### Hardening de `custom_command`

Checks do tipo `custom_command` devem respeitar as seguintes vedações:

1. **Read-only obrigatório (por contrato).** O comando **não deve** modificar arquivos, estado de banco, ou enviar requisições não-idempotentes. A enforcement mecânica é impossível — é responsabilidade do usuário declarar apenas comandos read-only. Violação = evaluator inválido, sprint contract deve ser revisado.
2. **Timeout obrigatório explícito.** Não há default. O sprint contract é rejeitado se `custom_command` omitir `timeout_seconds`.
3. **Sem rede por default.** `requires_network: false` é o padrão. Qualquer check que precise de rede deve declarar `requires_network: true` explicitamente. `/sprint-evaluate` deve ser capaz de pular (skip) esses checks se executado em modo offline.
4. **Exit code é única autoridade.** Nenhuma interpretação de output textual é permitida. Exit 0 = pass, qualquer outro = fail.
5. **Sem side-effects em artefatos do framework.** O comando não pode escrever em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/`, ou qualquer arquivo do próprio framework.
6. **Timeout máximo sugerido: 120s.** Sprints são unidades curtas — checks que precisam de mais que 2 minutos provavelmente deveriam ser sensores, não checks de evaluator.

## Modos de agregação do evaluator

O campo `evaluator.mode` determina como o verdict é agregado:

### `all` (recomendado, default)

Todos os checks com `required: true` devem passar. Checks `required: false` que falham não bloqueiam o verdict mas aparecem no log.

- Verdict `pass` — todos os required passaram
- Verdict `fail` — pelo menos 1 required falhou
- Verdict `partial` — pelo menos 1 required ficou `unknown` (ex: sensor não executado) e nenhum required falhou

### `threshold`

Pelo menos N checks (de qualquer tipo) devem passar. `evaluator.threshold` é o N.

- Verdict `pass` — `passed_count >= threshold`
- Verdict `fail` — `passed_count < threshold` e não há `unknown_count > 0` que poderia mudar o resultado
- Verdict `partial` — `passed_count < threshold` mas há checks `unknown` suficientes para potencialmente atingir o threshold após re-execução

Modo `threshold` existe para casos onde o sprint aceita "melhoria progressiva" — ex: 3 de 5 checks é aceitável para considerar a sprint viável.

Modo default é `all`. Usar `threshold` exige justificativa explícita na `goal` ou `verdict_reason`.

## Lifecycle

Estados permitidos e transições:

```
draft → approved → in_progress → passed
                              → failed → deferred
                              → deferred
```

| Estado | Significado | Quem transiciona |
|---|---|---|
| `draft` | Rascunho criado por `/sprint-create`, aguardando aprovação humana | `/sprint-create` |
| `approved` | Sprint aprovado, evaluator congelado, pode começar implementação | Usuário via segunda confirmação em `/sprint-create` |
| `in_progress` | Implementação começou | Manual (usuário) ao iniciar trabalho |
| `passed` | `/sprint-evaluate` mais recente retornou `pass` E usuário rodou `/sprint-close passed` | `/sprint-close` manual |
| `failed` | `/sprint-evaluate` retornou `fail` E usuário decidiu encerrar sem resolver | `/sprint-close failed` manual |
| `deferred` | Sprint adiado conscientemente antes de concluir | `/sprint-close deferred` manual |

**Nenhum estado transiciona automaticamente.** `/sprint-evaluate` só produz verdict mecânico no log — a transição é sempre via `/sprint-close` com confirmação humana.

Uma vez em `passed`, `failed` ou `deferred`, o sprint é terminal. Mudanças exigem criar novo sprint (v2 com justificativa no `verdict_reason` do anterior).

## Integração com commands

| Command | Como interage |
|---|---|
| `/sprint-create` | Cria sprint em `draft` vinculado a um phase contract ativo; aguarda aprovação explícita para `approved` |
| `/sprint-evaluate` | Executa o evaluator contra estado atual; append em `evaluation_history`; reporta verdict sem transicionar status |
| `/sprint-close` | Transição manual para `passed/failed/deferred` baseada na última entrada de `evaluation_history` |
| `/contract-check` | Ao validar phase contract, lê sprints de `contracts/sprints/<parent_phase_id>/` como evidência complementar de progresso (não bloqueante) |
| `/ship-check` | Ao preparar entrega, reporta status dos sprints da fase ativa como bloco informativo. Sprints `in_progress` residuais ou `failed` sem justificativa geram ressalva |

## Pointer de sprint ativo

Para acesso rápido, `.claude/runtime/contracts/active-sprint.json` contém o ponteiro para o sprint em andamento:

```json
{
  "active_sprint_id": "sprint-01-loginscreen-base",
  "active_parent_phase_id": "phase-01-ui-shell",
  "active_sprint_path": ".claude/runtime/contracts/sprints/phase-01-ui-shell/sprint-01-loginscreen-base.json",
  "last_updated": "ISO-8601"
}
```

Se o arquivo não existe ou `active_sprint_id` é `null`, não há sprint ativo — só operações de phase contract estão em curso.

Apenas **um sprint por vez** pode estar ativo. Para mudar o sprint ativo, `/sprint-create` sobrescreve `active-sprint.json`, e `/sprint-close` reseta para `null`.

## Vedações

- **Não mutar o phase contract.** Criar, avaliar ou fechar sprint nunca modifica o phase contract aprovado. O vínculo fase → sprints é derivado do filesystem.
- **Não transicionar status automaticamente.** `/sprint-evaluate` produz verdict mas não transiciona. `passed/failed/deferred` exigem `/sprint-close` explícito.
- **Não executar sensores dentro do evaluator.** Check `sensor_subset` consome `sensors-last-run.json`. Se o sensor não foi executado, o check é `unknown` — não dispara execução.
- **Não permitir sprint sem evaluator.** Pelo menos 1 check é obrigatório. Sprint sem evaluator é sprint sem validação — não tem função.
- **Não permitir `custom_command` sem timeout.** Timeout é obrigatório explícito. Sem timeout, o check pode travar indefinidamente.
- **Não permitir `custom_command` que modifica estado.** Read-only por contrato. Violação invalida o evaluator.
- **Não editar evaluator de sprint aprovado.** Uma vez `approved`, o evaluator é congelado. Mudança = novo sprint (v2).
- **Não executar sprints em paralelo.** Um sprint ativo por vez. Paralelismo foi explicitamente excluído do escopo atual.
- **Não permitir sprint órfão.** `parent_phase_id` deve bater com um phase contract existente em `approved` ou `in_progress`. Sprint sem fase ativa é inválido.

## Relação com outros artefatos

| Artefato | Escopo | Granularidade temporal | Autoridade |
|---|---|---|---|
| Spec | Produto | Meses | O QUE o produto deve fazer |
| Phase contract | Fase | Dias-semanas | O QUE a fase promete entregar |
| **Sprint contract** | **Sub-fase** | **Horas** | **O QUE o sprint atômico promete entregar** |
| Plano (`plan.md`) | Fase | Dias-semanas | COMO implementar a fase |
| Ledger | Histórico | Projeto inteiro | O QUE aconteceu |
| Sensores | Projeto | Sob demanda | COMO validar mecanicamente |
| Evaluator | Sprint | Cada execução | VERDICT pass/fail atômico do sprint |

Sprint contracts são a **granularidade operacional** intra-fase. Eles não substituem nem competem com phase contracts — complementam.

## Relação com sensores

Sensores e evaluators têm escopos distintos:

| Aspecto | Sensores | Evaluators |
|---|---|---|
| Escopo | Projeto inteiro | Sprint atômico (1-3 deliverables) |
| Execução | `/sensors-run` | `/sprint-evaluate` |
| Custo típico | Médio-alto (minutos) | Baixo-médio (segundos) |
| Frequência | Sob demanda (baseline, pré-ship) | Intra-fase (múltiplas vezes por dia) |
| Output | `sensors-last-run.json` | `evaluation_history` no próprio sprint |

Evaluators **consomem** sensores via check `sensor_subset` mas não executam. Um sprint pode ter evaluator que consulta 2 sensores específicos (ex: `type-check` e `lint`) sem precisar rodar a suite completa de testes. Isso é intencional: evaluators devem ser rápidos para servir ao ciclo de feedback curto.

## Bootstrap

Em projeto novo que quer adotar sprints:

1. **Pré-requisito**: ter um phase contract aprovado via `/contract-create`
2. Criar diretório `.claude/runtime/contracts/sprints/` (existe por default no framework via `.gitkeep`)
3. Executar `/sprint-create` para criar o primeiro sprint da fase ativa
4. Revisar o draft gerado e aprovar para transicionar a `approved`
5. Durante implementação, rodar `/sprint-evaluate` periodicamente para ver o verdict mecânico
6. Ao atingir `pass` consistente, rodar `/sprint-close passed` para encerrar o sprint
7. Criar próximo sprint com `/sprint-create` — repetir até a fase estar pronta para `/ship-check`

Projetos que não declaram sprints operam em modo degradado — commands consumidores (`/contract-check`, `/ship-check`) reportam a ausência como lacuna informativa, não bloqueante.
