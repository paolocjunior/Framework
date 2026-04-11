# Behaviour Harness Protocol

## Propósito

Definir behaviours como camada de verificação **runtime/observável** do framework. Um behaviour é uma verificação que **dispara uma ação concreta** e **compara o resultado observado contra uma expectativa declarada**, produzindo evidência estruturada `expected vs actual`. Sensores respondem "o código compila/testa/lint passa?". Behaviours respondem "quando eu executo X, o sistema faz Y?".

Esta rule resolve uma lacuna identificada pela análise de Harness Engineering: **acceptance criteria declarados no phase contract não têm verificação runtime declarativa**. Até hoje, um contrato podia dizer "AC1: login com credenciais válidas redireciona para /dashboard", mas nenhum artefato do framework disparava essa ação e capturava o resultado real — a verificação de AC runtime dependia de teste manual ou de narrativa do agente. Behaviours fecham essa lacuna: são a ponta runtime do contrato, downstream do que foi prometido.

Behaviours são **opcionais** e seguem o mesmo padrão opt-in de sensores e execution contracts: projetos que não declaram behaviours operam em modo degradado, e commands consumidores reportam a ausência como lacuna, não como erro.

## Princípios

1. **Expected vs actual é autoridade.** Cada expectation declara um valor/padrão esperado; a execução captura o valor real. A comparação determinística produz o verdict da expectation. Nenhum agente pode reinterpretar "parecia funcionar" — a comparação é mecânica.
2. **Behaviour é declarativo.** O projeto declara em `behaviours.json` o que vai ser verificado (ação + expectations). O framework não infere behaviours a partir da stack nem gera ações automaticamente.
3. **Downstream binding explícito.** Quando um behaviour é usado para satisfazer um acceptance criterion do phase contract, o campo `contract_ref` é obrigatório e aponta para o `id` do AC. Sem essa amarração, o consumer não consegue mapear "esta verificação prova aquele compromisso".
4. **Consumers nunca executam behaviours.** `/contract-check`, `/ship-check` e `/verify-spec` lêem `behaviours-last-run.json` e reportam. Execução é exclusiva de `/behaviour-run`. Consumers são read-only absolutos.
5. **Staleness é falha crítica, não ruído.** Resultado stale de behaviour é **mais prejudicial** que resultado stale de sensor — behaviour descreve comportamento observável do produto, e código pode ter mudado entre o run e a leitura. Staleness é regra de primeira classe (ver seção dedicada).
6. **Hardening obrigatório de `action.command`.** Timeout obrigatório, rede desabilitada por default, sem side-effects em artefatos do framework, exit code capturado como parte do contexto. Mesmas regras de `custom_command` do sprint evaluator.

## Schema do arquivo `behaviours.json`

O arquivo vive em `.claude/runtime/behaviours.json`. É versionado no Git como parte do contrato do projeto, igual a `sensors.json`.

```json
{
  "schema_version": "1",
  "behaviours": [
    {
      "id": "string (único, kebab-case, ex: 'b-01-login-success')",
      "description": "string (human-readable, curta)",
      "phase_id": "string opcional (phase_id do phase contract relacionado)",
      "contract_ref": "string opcional (id de acceptance_criteria[] do phase contract — obrigatório quando behaviour satisfaz AC)",
      "type": "http | cli | event | state | composite (informativo; não afeta execução)",
      "action": {
        "command": "string (comando shell que dispara a ação e captura output)",
        "timeout_seconds": "integer (obrigatório)",
        "working_dir": "string opcional (relativo à raiz do projeto)"
      },
      "expectations": [
        {
          "id": "string (único dentro do behaviour, ex: 'E1')",
          "kind": "exit_code | stdout_contains | stdout_json_path | file_content | file_exists_after | not_contains",
          "target": "string opcional (path ou expressão, depende de kind)",
          "expected": "string, número ou regex (valor literal ou padrão)",
          "required": "boolean (default true)"
        }
      ],
      "on_fail": "block | warn",
      "requires": {
        "network": "boolean (default false)",
        "database": "boolean (default false)",
        "running_server": "boolean (default false)"
      },
      "enabled": "boolean (default true)"
    }
  ]
}
```

### Campos obrigatórios

- `schema_version`
- `behaviours[]` com pelo menos 1 item
- Para cada behaviour: `id`, `description`, `action.command`, `action.timeout_seconds`, `expectations[]` com pelo menos 1 expectation, `on_fail`

### Campos opcionais

- `phase_id` — quando o behaviour está associado a uma fase específica
- `contract_ref` — torna-se **obrigatório** quando o behaviour é usado para satisfazer um AC do phase contract (ver seção "Vínculo downstream com phase contract")
- `type` — label descritivo, informativo apenas (ver nota abaixo)
- `action.working_dir`
- `requires` — default é `{network: false, database: false, running_server: false}`
- `enabled` — default true

### Nota sobre o campo `type`

O campo `type` aceita os valores `http | cli | event | state | composite` como **label informativo**. Na v1 desta rule, `type` **não afeta a execução** — o executor usa sempre `action.command` + `expectations[]`, independentemente do tipo declarado. O campo existe para legibilidade humana e categorização em relatórios. Versões futuras podem dar semântica ao tipo (ex: `http` gera request HTTP automaticamente via cliente dedicado), mas isso não é contrato vigente.

## Tipos de expectation

Cada expectation tem um `kind` que define como a comparação é feita.

| kind | Significado | Campos relevantes |
|---|---|---|
| `exit_code` | Exit code do `action.command` bate com o valor esperado | `expected` (integer, ex: `0`) |
| `stdout_contains` | stdout do comando contém o pattern (substring ou regex) | `expected` (string ou regex) |
| `stdout_json_path` | stdout é JSON válido e o filtro `jq` avaliado bate com `expected` | `target` (filtro `jq`, ex: `.data.status`), `expected` (valor literal) |
| `file_content` | Arquivo em `target` contém pattern em `expected` | `target` (path), `expected` (string/regex) |
| `file_exists_after` | Arquivo em `target` existe **após** a execução do comando (side-effect esperado e idempotente) | `target` (path) |
| `not_contains` | stdout do comando NÃO contém o pattern (assertion negativa) | `expected` (string/regex) |

### Resultado por expectation

- `pass` — comparação casou com o esperado
- `fail` — comparação não casou (valor real capturado e reportado como `actual`)
- `error` — não foi possível avaliar (timeout da ação, comando inválido, JSON malformado, file não legível, regex inválida)

### Evidência estruturada

Diferente de sensores (onde a evidência é "exit code + tail do output"), behaviours registram evidência **estruturada** com o par `expected` vs `actual`:

```json
{
  "id": "E2",
  "kind": "stdout_contains",
  "expected": "Redirect to /dashboard",
  "actual": "TypeError: undefined is not a function",
  "evidence": "exit_code=1, last 20 lines: ..."
}
```

O par `expected` vs `actual` é citado diretamente no output dos consumers, permitindo diagnóstico imediato. Sem `actual`, a evidência é considerada incompleta.

## Hardening de `action.command`

As vedações abaixo são as mesmas aplicadas a `custom_command` no sprint evaluator, transportadas para `action.command` de behaviours:

1. **Timeout obrigatório explícito.** Não há default. Behaviour sem `action.timeout_seconds` é rejeitado por `/behaviour-run` com `status: error` e `evidence: "behaviour missing required action.timeout_seconds"`.
2. **Sem rede por default.** `requires.network: false` é o padrão. Qualquer behaviour que precise de rede deve declarar `requires.network: true` explicitamente. `/behaviour-run` deve poder pular (skip) esses behaviours em modo offline via flag.
3. **Sem banco por default.** `requires.database: false` é o padrão. Quando `requires.database: true`, o behaviour só roda se o ambiente tiver o banco disponível — caso contrário, é `skipped`.
4. **Servidor em execução é declarado.** `requires.running_server: false` é o padrão. Behaviours que dependem de servidor HTTP rodando devem declarar `requires.running_server: true`. `/behaviour-run` não sobe o servidor — valida a declaração e skipa se a pré-condição não estiver satisfeita.
5. **Read-only por contrato.** O comando **não deve** modificar arquivos de projeto de forma não-idempotente. Idempotência é responsabilidade de quem declara o behaviour — violação invalida a evidência do run.
6. **Sem side-effects em artefatos do framework.** O comando não pode escrever em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/` ou qualquer arquivo do próprio framework.
7. **Exit code é sempre capturado.** `action_exit_code` do comando é sempre registrado no result, mesmo quando nenhuma expectation é do tipo `exit_code`. Isso dá contexto ao diagnóstico quando expectations falham.
8. **Timeout máximo sugerido: 120s.** Behaviours são verificações pontuais — ações que demoram mais provavelmente deveriam ser sensores (suite de testes) ou parte do próprio AC manual.

## Schema do arquivo `behaviours-last-run.json`

Após execução de `/behaviour-run`, o resultado é escrito em `.claude/runtime/behaviours-last-run.json`. Este arquivo é o **oracle de leitura** para os commands consumidores. É efêmero e pode ficar fora do Git.

```json
{
  "schema_version": "1",
  "run_id": "string (timestamp ISO compactado ou uuid)",
  "started_at": "ISO-8601",
  "finished_at": "ISO-8601",
  "duration_ms": "integer",
  "total_behaviours": "integer",
  "executed": "integer",
  "skipped": "integer",
  "passed": "integer",
  "failed": "integer",
  "verdict": "PASS | FAIL | PARTIAL | NO_BEHAVIOURS",
  "blocking_failures": "integer",
  "results": [
    {
      "id": "string (behaviour id)",
      "phase_id": "string | null",
      "contract_ref": "string | null",
      "type": "string (label informativo)",
      "status": "pass | fail | error | skipped",
      "duration_ms": "integer",
      "action_exit_code": "integer | null",
      "expectations_passed": ["array de expectation ids"],
      "expectations_failed": [
        {
          "id": "E2",
          "kind": "stdout_contains",
          "expected": "string",
          "actual": "string",
          "evidence": "string (tail do output ou motivo do error)"
        }
      ],
      "on_fail": "block | warn",
      "blocking": "boolean (true se status=fail AND on_fail=block)",
      "skip_reason": "string opcional (quando status=skipped)"
    }
  ]
}
```

### Regras de agregação do verdict

- **`PASS`** — todos os behaviours executados passaram (expectations required em pass). Behaviours com `on_fail: warn` em fail **não contam** como bloqueio
- **`FAIL`** — pelo menos 1 behaviour com `on_fail: block` falhou (`blocking_failures > 0`)
- **`PARTIAL`** — algum behaviour foi pulado (ex: `requires.network: true` e `/behaviour-run --offline` foi passado) e os executados passaram sem bloqueio
- **`NO_BEHAVIOURS`** — `behaviours.json` ausente, ou arquivo presente mas sem behaviours `enabled: true`

O campo `blocking_failures` conta explicitamente quantos behaviours falharam com `on_fail: block`. Consumers usam esse campo como gate rápido sem precisar percorrer `results[]`.

## Política de staleness (obrigatória)

Staleness em behaviours é **regra de primeira classe**. Diferente de sensores, onde resultado stale pode ser tolerado em certos contextos, behaviours stale são **tratados como risco** por todos os consumers, porque representam evidência runtime desatualizada — o produto pode ter mudado entre o run e a leitura.

### Critérios de staleness

Um `behaviours-last-run.json` é considerado stale para um consumer se **qualquer** um dos critérios abaixo for verdadeiro:

1. **`behaviours.json` foi modificado após `finished_at` do run.** Os behaviours declarados mudaram (adicionados, removidos, editados), então o run anterior não representa o contrato de verificação atual.
2. **O phase contract referenciado por algum `contract_ref` foi aprovado ou modificado após `finished_at`.** O compromisso foi atualizado; a evidência runtime capturada é do compromisso anterior, não do atual. Para cada behaviour com `contract_ref` não-nulo, o consumer compara `finished_at` contra o `approved_at` (ou mtime, se posterior) do phase contract correspondente.
3. **Algum behaviour tem `enabled: true` em `behaviours.json` mas não aparece em `results[]` do last-run.** Behaviour declarado mas não verificado — evidência ausente, não stale por si só, mas tratado como ausência que impede o uso do last-run como autoridade completa.

### Estados de ausência

- **`behaviours-last-run.json` ausente + `behaviours.json` declarado com behaviours `enabled: true`** → tratado como **stale crítico** (nunca executado). Consumers reportam como lacuna explícita e recomendam executar `/behaviour-run`.
- **`behaviours-last-run.json` ausente + `behaviours.json` ausente** → modo degradado normal (NO_BEHAVIOURS). Consumers reportam como lacuna informativa, não bloqueante.

### Contrato dos consumers em caso de stale

1. **Consumers leem e reportam staleness — nunca executam `/behaviour-run`.** Execução é sempre ação humana ou de command dedicado. Rodar um consumer **não** resolve staleness.
2. **Consumers nunca tratam resultado stale como `pass`.** Mesmo que todos os expectations estejam em pass no last-run, se o arquivo está stale, o consumer rebaixa o veredicto ou reporta lacuna:
   - `/contract-check`: AC com `verifiable_by: "behaviour"` apontando para behaviour stale é reportado como **lacuna** (não "satisfeito"), rebaixando o veredicto conforme a tabela R1-R10.
   - `/verify-spec`: cenário marcado como `IMPLEMENTADO` não pode usar behaviour stale como prova — é rebaixado para `PARCIAL` com justificativa "runtime evidence stale".
   - `/ship-check`: staleness no Bloco 0.7 não libera o gate runtime — consumer reporta **risco explícito**. Staleness **por si só** não força `NÃO PRONTO` (não há falha observada), mas é ressalva que o usuário vê antes de confirmar a entrega. O que força `NÃO PRONTO` é `blocking_failures > 0`, não staleness.
3. **Consumers reportam motivo da staleness** — qual critério foi violado, qual timestamp, qual arquivo mais novo. Sem motivo explícito, o usuário não sabe o que atualizar.
4. **Staleness de behaviour não é resolvida por outros commands.** Para atualizar a evidência runtime, o usuário deve rodar `/behaviour-run` manualmente.

## Integração com commands consumidores

| Command | Como consome | Ação em falha ou staleness |
|---|---|---|
| `/behaviour-run` | Executa behaviours, produz `behaviours-last-run.json`, atualiza ledger | Reporta verdict estruturado; não bloqueia por si só |
| `/contract-check` | Lê `behaviours-last-run.json` no Passo 7.6 (cross-reference com AC que usam `verifiable_by: "behaviour"`) | AC apontando para behaviour em `fail` → rebaixa verdict via R1-R10. AC apontando para behaviour stale → AC tratado como lacuna, não satisfeito |
| `/ship-check` | Lê `behaviours-last-run.json` no Bloco 0.7 (gate runtime downstream do contract) | `blocking_failures > 0` força `NÃO PRONTO` incondicionalmente. Staleness é ressalva, não bloqueio |
| `/verify-spec` | Lê `behaviours-last-run.json` no Passo 4.6 (cross-reference com cenários da spec) | Cenário marcado IMPLEMENTADO com behaviour em `fail` ou stale é rebaixado para PARCIAL |

Nenhum consumer dispara execução de behaviours. Execução é sempre ação explícita via `/behaviour-run`.

## Vínculo downstream com phase contract

### Expansão aditiva do schema do phase contract

O phase contract (ver `execution-contracts.md`) ganha suporte a behaviours como método de verificação de `acceptance_criteria[]`:

- `acceptance_criteria[].verifiable_by` passa a aceitar também `"behaviour"` (além de `sensor | manual_test | code_inspection`)
- Quando `verifiable_by: "behaviour"`, o novo campo `behaviour_id` é **obrigatório** e aponta para um `id` existente em `behaviours.json`
- Quando `verifiable_by: "sensor"` continua valendo o campo `sensor_id` (semântica inalterada)
- Para os outros valores (`manual_test`, `code_inspection`), nenhum campo adicional é necessário

A expansão é **aditiva**: phase contracts existentes continuam válidos sem mudança.

### Regra de binding bidirecional

Um behaviour declarado em `behaviours.json` com `contract_ref: "AC1"` está **afirmando** que cobre o acceptance criterion `AC1` do phase contract da fase. O phase contract, por sua vez, deve declarar `verifiable_by: "behaviour"` e `behaviour_id` apontando para esse behaviour. **Ambas as pontas** do vínculo devem existir para o consumer considerar o AC coberto por runtime:

- `contract_ref` no behaviour (ponta 1 — o behaviour diz "eu cubro AC1")
- `behaviour_id` no phase contract AC (ponta 2 — o AC diz "eu sou coberto por b-01-login-success")

Se só uma ponta existe, o consumer reporta **lacuna de binding** — o vínculo é incompleto e o AC não é considerado satisfeito por runtime.

### Regra de escopo

Quando um behaviour tem `contract_ref` declarado, o campo `phase_id` também deve ser declarado e deve bater com o `parent_phase_id` do AC referenciado. Behaviour com `contract_ref` mas sem `phase_id` é rejeitado pelo consumer como referência ambígua.

## Vedações

- **Não inferir behaviours a partir da stack.** Se o projeto tem Express, isso não autoriza o framework a assumir `curl localhost:3000/healthz` como behaviour. O projeto precisa declarar explicitamente.
- **Não permitir que o agente narre o verdict do behaviour.** Se o agente diz "o login funcionou" mas a expectation `stdout_contains: "Redirect"` falhou, o agente está errado — expected vs actual é autoridade.
- **Não misturar behaviours com sensores.** Sensor responde "código compila/testa/lint passa"; behaviour responde "ao executar X, o sistema produz Y". Os dois coexistem sem sobreposição.
- **Não executar behaviours dentro de sprint evaluator.** A integração com sprint evaluator não existe na v1 — behaviours são consumidos apenas por `/contract-check`, `/ship-check` e `/verify-spec`. Acoplar behaviour ao evaluator mistura camadas temporais diferentes (sprint = intra-fase horas, behaviour = downstream do phase contract).
- **Não permitir behaviour sem timeout.** `action.timeout_seconds` é obrigatório explícito. Sem timeout, o behaviour pode travar `/behaviour-run` indefinidamente.
- **Não permitir `verifiable_by: "behaviour"` sem `behaviour_id`.** O binding deve ser explícito no phase contract. Ausência de `behaviour_id` torna o AC não-verificável mecanicamente — o contract-check reporta como lacuna.
- **Não permitir `behaviour_id` apontando para id ausente em `behaviours.json`.** Referência quebrada é `error`, não `unknown`.
- **Não permitir consumer executar `/behaviour-run` automaticamente.** Consumers são read-only absolutos. Staleness é reportada, não resolvida pelo consumer.
- **Não mascarar falhas críticas com `on_fail: warn`.** Behaviours que cobrem AC de fluxo financeiro, autenticação ou permissões devem usar `on_fail: block` por default. Rebaixar para `warn` é decisão consciente que deve ser justificada via `/justify`.
- **Não permitir behaviour `enabled: true` sem cobertura no último run.** Se o behaviour está enabled mas `results[]` não contém entrada com seu `id`, consumers tratam como lacuna de cobertura.
- **Não tratar result stale como pass.** Mesmo com todos expectations verdes no last-run, staleness força rebaixamento/lacuna.

## Relação com hooks

Hooks rodam em evento (PreToolUse/PostToolUse/SessionStart/SessionEnd), são universais, baixo custo e detectam padrões estáticos durante a edição. Behaviours rodam sob demanda, são declarados pelo projeto, podem executar comandos externos para verificar runtime. Os dois não competem.

## Relação com sensores

| Aspecto | Sensores | Behaviours |
|---|---|---|
| Pergunta que respondem | "o código compila/testa/lint passa?" | "quando eu executo X, o sistema faz Y?" |
| Escopo | Codebase inteira ou subset | Ação pontual com expectation declarada |
| Evidência | Exit code + tail do output | `expected vs actual` estruturado |
| Autoridade sobre | Correção funcional, tipos, build, vulnerabilidades | Comportamento observável runtime |
| Custo típico | Médio-alto (minutos) | Baixo-médio (segundos a dezenas de segundos) |
| Downstream binding | `phase_contract.sensors_required[]` | `acceptance_criteria[].verifiable_by: "behaviour"` + `behaviour_id` |
| Consumer execution | `/sensors-run` | `/behaviour-run` |
| Política de staleness | Moderada (avisa mas permite uso) | Rigorosa (stale não libera gate runtime) |
| Tipos de check | test, lint, type-check, build, security-scan, custom | exit_code, stdout_contains, stdout_json_path, file_content, file_exists_after, not_contains |

Sensores e behaviours são **camadas complementares**. Um projeto maduro declara ambos: sensores para validação estática da codebase, behaviours para validação runtime do que foi prometido no contrato.

## Relação com execution contracts

Behaviours são a **ponta runtime** dos execution contracts. O phase contract declara upstream o que a fase promete; os sensores confirmam que o código roda; os behaviours confirmam que, quando a ação do AC é executada, o sistema produz o resultado prometido.

| Camada | Pergunta | Artefato autoritativo |
|---|---|---|
| Upstream (contract) | "o que esta fase promete entregar?" | `phase-<id>.json` — deliverables + acceptance_criteria |
| Estático (sensors) | "o código que entrega a promessa compila/testa/lint passa?" | `sensors-last-run.json` |
| Runtime (behaviours) | "quando a ação do AC é executada, o sistema se comporta como prometido?" | `behaviours-last-run.json` |
| Histórico (ledger) | "o que aconteceu durante a implementação?" | `execution-ledger.md` |

As 4 camadas coexistem sem sobreposição. Cada uma responde uma pergunta distinta, e todas juntas formam o harness completo de verificação.

## Bootstrap

Em projeto novo que quer adotar behaviours:

1. **Pré-requisito recomendado**: ter um phase contract aprovado via `/contract-create` (para poder amarrar behaviours a AC via `contract_ref`)
2. Copiar `.claude/runtime/behaviours.template.json` para `.claude/runtime/behaviours.json`
3. Editar para declarar behaviours específicos do projeto, amarrando cada um a um AC do phase contract via `contract_ref` + `phase_id`
4. Atualizar o phase contract para que AC cobertos por behaviours tenham `verifiable_by: "behaviour"` + `behaviour_id` (ponta 2 do binding bidirecional)
5. Executar `/behaviour-run` pela primeira vez para estabelecer baseline
6. Commitar `behaviours.json` (versionado); `behaviours-last-run.json` é efêmero e pode ficar fora do Git

Projetos que não declaram behaviours operam em modo degradado — consumers reportam a ausência como lacuna informativa, não bloqueante. Declaração é responsabilidade do projeto, nunca inferida pelo framework.
