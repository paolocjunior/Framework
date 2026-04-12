# Architecture Linters Protocol

## Proposito

Definir architecture linters como camada de verificacao **estrutural cross-file** do framework. Um architecture linter e uma verificacao declarativa que valida **invariantes arquiteturais entre arquivos** — regras que nenhuma ferramenta nativa de lint/test/type-check cobre, porque operam em escopo de arquivo unico ou de modulo. Hooks pegam erros por arquivo editado. Sensores validam build/test/lint nativo. Behaviours validam runtime observavel. Architecture linters preenchem a lacuna restante: **invariantes estruturais que cruzam fronteiras de arquivo** (dependencias circulares, violacoes de layering, schemas divergentes de types, convencoes de naming cross-project).

Esta rule resolve uma lacuna identificada pela analise comparativa de camadas: **nenhuma camada existente valida invariantes arquiteturais declarativos cross-file com exit code como autoridade**. Hooks rodam por evento em arquivo unico. Sensores delegam para ferramentas nativas (que operam por modulo/suite). Behaviours disparam acoes runtime. Architecture linters disparam verificacoes estruturais estaticas contra o codebase inteiro ou subset declarado — com o exit code do comando como veredicto.

Architecture linters sao **opcionais** e seguem o mesmo padrao opt-in de sensores, behaviours e execution contracts: projetos que nao declaram linters operam em modo degradado, e commands consumidores reportam a ausencia como lacuna, nao como erro.

## Principios

1. **Exit code e fonte de verdade.** Se o comando retorna 0, o linter passou. Se retorna qualquer outro valor, falhou. Nenhum agente pode reinterpretar o output textual como sucesso quando o exit code diz o contrario. Mesmo principio de sensores e behaviours.
2. **Linter e declarativo.** O projeto declara em `architecture-linters.json` o que vai ser verificado. O framework nao infere linters a partir da stack nem gera comandos automaticamente.
3. **Sem semantica implicita de linguagem.** O framework nao interpreta AST, import graphs ou module resolution internamente. Cada linter e um comando shell arbitrario que o projeto declara. O framework fornece template com exemplos bash (grep/rg/find), mas aceita qualquer comando — Python, Node, Rust, etc. A semantica do check e responsabilidade do comando, nao do framework.
4. **Consumers nunca executam linters.** `/ship-check` e `/contract-check` leem `architecture-linters-last-run.json` e reportam. Execucao e exclusiva de `/lint-architecture`. Consumers sao read-only absolutos.
5. **Staleness e regra de primeira classe.** Resultado stale de architecture linter e tratado como risco — o codebase pode ter mudado entre o run e a leitura. Staleness e reportada, nunca ignorada.
6. **Hardening obrigatorio de `command`.** Timeout obrigatorio (sem default), rede desabilitada por default, read-only por contrato, sem side-effects em artefatos do framework, exit code e unica autoridade.

## Schema do arquivo `architecture-linters.json`

O arquivo vive em `.claude/runtime/architecture-linters.json`. E versionado no Git como parte do contrato do projeto, igual a `sensors.json` e `behaviours.json`.

```json
{
  "schema_version": "1",
  "linters": [
    {
      "id": "string (unico, kebab-case, ex: 'lint-01-no-circular-imports')",
      "description": "string (human-readable, curta)",
      "category": "layering | circular-deps | cross-file | naming | type-schema-match | custom",
      "command": "string (comando shell executado via sh -c)",
      "working_dir": "string opcional (relativo a raiz do projeto; default: raiz)",
      "timeout_seconds": "integer (obrigatorio, sem default)",
      "requires_network": "boolean (default false)",
      "severity": "block | warn",
      "scope": "global | phase",
      "phase_id": "string opcional (obrigatorio se scope == phase)",
      "enabled": "boolean (default true)"
    }
  ]
}
```

### Campos obrigatorios

- `schema_version`
- `linters[]` com pelo menos 1 item
- Para cada linter: `id`, `description`, `category`, `command`, `timeout_seconds`, `severity`

### Campos opcionais

- `working_dir` — se o linter precisa rodar em subdiretorio (ex: monorepo com `packages/api`)
- `requires_network` — default false. Qualquer linter que precise de rede deve declarar `requires_network: true` explicitamente
- `scope` — default `global`. Quando `phase`, o campo `phase_id` torna-se obrigatorio
- `phase_id` — obrigatorio quando `scope == phase`, ignorado quando `scope == global`
- `enabled` — default true. Permite desligar linter temporariamente sem remove-lo

### Categorias de linter

| Categoria | Semantica | Exemplo |
|---|---|---|
| `layering` | Camada X nao pode importar camada Y | Screens nao importam diretamente de infra/database |
| `circular-deps` | Arquivo A nao pode depender de arquivo B que depende de A | Deteccao de ciclos de import |
| `cross-file` | Invariante que cruza fronteira de arquivo | Todas as rotas registradas no router existem como arquivos |
| `naming` | Convencao de nomes cross-project | Componentes em PascalCase, hooks comecam com use |
| `type-schema-match` | Types do frontend batem com schemas do backend | Campos, enums e shapes alineados |
| `custom` | Qualquer verificacao estrutural | Scripts customizados |

A categoria e uma etiqueta semantica — o framework usa para categorizar resultados em relatorios, mas nao muda a forma de execucao (todos sao `sh -c <command>` com captura de exit code).

## Hardening de `command`

As vedacoes abaixo sao analogas as aplicadas em `custom_command` do sprint evaluator e `action.command` de behaviours:

1. **Timeout obrigatorio explicito.** Nao ha default. Linter sem `timeout_seconds` e rejeitado por `/lint-architecture` com `status: error` e `evidence: "linter missing required timeout_seconds"`.
2. **Sem rede por default.** `requires_network: false` e o padrao. Qualquer linter que precise de rede deve declarar `requires_network: true` explicitamente. `/lint-architecture` deve poder pular (skip) esses linters em modo offline via flag `--offline`.
3. **Read-only por contrato.** O comando **nao deve** modificar arquivos do projeto de forma nao-idempotente. Idempotencia e responsabilidade de quem declara o linter — violacao invalida a evidencia do run.
4. **Sem side-effects em artefatos do framework.** O comando nao pode escrever em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/` ou qualquer arquivo do proprio framework.
5. **Exit code e sempre capturado.** `exit_code` do comando e registrado no result e e a unica autoridade sobre pass/fail.
6. **Timeout maximo sugerido: 120s.** Architecture linters sao verificacoes estruturais — acoes que demoram mais provavelmente deveriam ser sensores (suite de testes) ou parte de pipeline CI.

## Schema do arquivo `architecture-linters-last-run.json`

Apos execucao de `/lint-architecture`, o resultado e escrito em `.claude/runtime/architecture-linters-last-run.json`. Este arquivo e o **oracle de leitura** para os commands consumidores. E efemero e pode ficar fora do Git.

```json
{
  "schema_version": "1",
  "run_id": "string (timestamp ISO compactado ou uuid)",
  "started_at": "ISO-8601",
  "finished_at": "ISO-8601",
  "duration_ms": "integer",
  "total_linters": "integer",
  "executed": "integer",
  "skipped": "integer",
  "passed": "integer",
  "failed": "integer",
  "verdict": "PASS | FAIL | PARTIAL | NO_LINTERS",
  "blocking_failures": "integer",
  "results": [
    {
      "id": "string (linter id)",
      "category": "string (linter category)",
      "status": "pass | fail | timeout | error | skipped",
      "exit_code": "integer | null",
      "duration_ms": "integer",
      "output_tail": "string (ultimas N linhas de stdout+stderr, default 50)",
      "severity": "block | warn",
      "blocking": "boolean (true se status=fail AND severity=block)"
    }
  ]
}
```

### Regras de agregacao do verdict

- **`PASS`** — todos os linters executados passaram (ou os que falharam tem `severity: warn`)
- **`FAIL`** — pelo menos 1 linter falhou com `severity: block` (`blocking_failures > 0`)
- **`PARTIAL`** — algum linter foi pulado (ex: requer network e `--offline` foi passado) e os executados passaram sem bloqueio
- **`NO_LINTERS`** — `architecture-linters.json` ausente, ou arquivo presente mas sem linters `enabled: true`

O campo `blocking_failures` conta explicitamente quantos linters falharam com `severity: block`. Consumers usam esse campo como gate rapido sem precisar percorrer `results[]`.

## Politica de staleness (obrigatoria)

Staleness em architecture linters e regra de primeira classe, analogamente a sensores e behaviours.

### Criterios de staleness

Um `architecture-linters-last-run.json` e considerado stale para um consumer se **qualquer** um dos criterios abaixo for verdadeiro:

1. **`architecture-linters.json` foi modificado apos `finished_at` do run.** Os linters declarados mudaram (adicionados, removidos, editados), entao o run anterior nao representa o contrato de verificacao atual.
2. **Arquivos potencialmente cobertos pelo linter mudaram apos `finished_at`.** O criterio de cobertura varia por escopo:
   - Se `scope: global` → qualquer arquivo-fonte relevante do projeto (ex: `*.ts`, `*.py`, `*.go`, conforme a stack) modificado apos `finished_at`. O consumer usa heuristica conservadora: se nao e possivel delimitar os arquivos cobertos pelo linter, assume staleness e reporta como tal.
   - Se `scope: phase` → apenas arquivos associados ao `phase_id` (por convencao de diretorio, deliverables da fase, ou mapeamento explicito no contrato). Quando a delimitacao e impossivel, aplica-se a regra conservadora do escopo global.
   - **Nota v1:** esta regra usa aproximacao por escopo em vez de tracking individual de arquivos. O framework declara explicitamente quando aplica a regra conservadora, para que o usuario saiba que a staleness reportada pode ser falso-positivo e decida se re-executa.
3. **Phase contract ativo foi aprovado ou modificado apos `finished_at`** (aplicavel a linters com `scope: phase`). O compromisso da fase mudou; a verificacao estrutural anterior pode nao cobrir o escopo novo.
4. **Algum linter tem `enabled: true` em `architecture-linters.json` mas nao aparece em `results[]` do last-run.** Linter declarado mas nao verificado — evidencia ausente.

### Estados de ausencia

- **`architecture-linters-last-run.json` ausente + `architecture-linters.json` declarado com linters `enabled: true`** → tratado como **stale critico** (nunca executado). Consumers reportam como lacuna explicita e recomendam executar `/lint-architecture`.
- **`architecture-linters-last-run.json` ausente + `architecture-linters.json` ausente** → modo degradado normal (NO_LINTERS). Consumers reportam como lacuna informativa, nao bloqueante.

### Contrato dos consumers em caso de stale

1. **Consumers leem e reportam staleness — nunca executam `/lint-architecture`.** Execucao e sempre acao humana ou de command dedicado. Rodar um consumer **nao** resolve staleness.
2. **Consumers nunca tratam resultado stale como `pass`.** Mesmo que todos os linters estejam pass no last-run, se o arquivo esta stale, o consumer rebaixa o veredicto ou reporta lacuna.
3. **Consumers reportam motivo da staleness** — qual criterio foi violado, qual timestamp, qual arquivo mais novo. Sem motivo explicito, o usuario nao sabe o que atualizar.

## Semantica dual: severity vs obrigacao contratual

O campo `severity` e o campo `architecture_linters_required[]` do phase contract tem semanticas independentes que coexistem:

### No `/ship-check` (Bloco 0.8)

`severity` governa o impacto operacional do fail:
- `severity: block` → linter fail forca `NAO PRONTO` incondicionalmente (via `blocking_failures > 0`)
- `severity: warn` → linter fail e reportado como risco, rebaixa `PRONTO` → `PRONTO COM RESSALVAS`

### No `/contract-check` (Passo 7.7)

Qualquer linter listado em `architecture_linters_required[]` do phase contract e tratado como **gate obrigatorio da fase**, independentemente da `severity` declarada no catalogo `architecture-linters.json`. A presenca no array contratual sobrescreve a semantica operacional:
- Linter com `severity: warn` que falha → no `/ship-check` e apenas ressalva. No `/contract-check`, se esta em `architecture_linters_required[]`, rebaixa o veredicto da fase via tabela R1-R10.
- Linter com `severity: block` que falha → no `/ship-check` e bloqueante. No `/contract-check`, se esta em `architecture_linters_required[]`, tambem e bloqueante. Semanticas convergem.

**Regra:** `severity` e propriedade do linter (como ele impacta o ship-check). `architecture_linters_required[]` e propriedade do contrato (como a fase se compromete com o linter). As duas semanticas coexistem sem conflito — o `/ship-check` usa `severity`, o `/contract-check` usa a presenca no array contratual.

## Integracao com commands consumidores

| Command | Como consome | Acao em falha ou staleness |
|---|---|---|
| `/lint-architecture` | Executa linters, produz `architecture-linters-last-run.json`, atualiza ledger | Reporta verdict estruturado; nao bloqueia por si so |
| `/ship-check` | Le `architecture-linters-last-run.json` no Bloco 0.8 (gate estrutural) | `blocking_failures > 0` forca `NAO PRONTO` incondicionalmente. Staleness e ressalva, nao bloqueio |
| `/contract-check` | Le `architecture-linters-last-run.json` no Passo 7.7 (apenas se o contrato declara `architecture_linters_required[]` nao-vazio) | Linter required em fail → rebaixa veredicto via R2.2. Linter required stale/not_run → rebaixa via R5.2 |

Nenhum consumer dispara execucao de linters. Execucao e sempre acao explicita via `/lint-architecture`.

**Nota:** `/verify-spec` **nao** integra com architecture linters na v1. Integracao futura e possivel mas nao e contrato vigente.

## Relacao com outras camadas

| Aspecto | Hooks | Sensores | Behaviours | Architecture Linters |
|---|---|---|---|---|
| Quando rodam | Automaticamente em evento | Sob demanda | Sob demanda | Sob demanda |
| Escopo | Arquivo unico | Codebase (suite nativa) | Acao runtime pontual | Cross-file estrutural |
| Pergunta | "Este arquivo tem erro?" | "O codigo compila/testa?" | "O sistema responde certo?" | "A estrutura do projeto e valida?" |
| Declaracao | `settings.json` | `sensors.json` | `behaviours.json` | `architecture-linters.json` |
| Custo tipico | Baixissimo (<1s) | Medio-alto (minutos) | Baixo-medio (segundos) | Baixo (segundos) |
| Autoridade | Padroes estaticos por arquivo | Exit code de ferramentas nativas | Expected-vs-actual runtime | Exit code de comando cross-file |
| Consumer execution | Automatico | `/sensors-run` | `/behaviour-run` | `/lint-architecture` |

Architecture linters e hooks, sensores e behaviours sao **camadas complementares**. Nenhuma substitui as outras — cada uma pega o que as anteriores nao alcancam.

## Vedacoes

- **Nao inferir linters a partir da stack.** Se o projeto tem TypeScript, isso nao autoriza o framework a assumir verificacao de dependencias circulares como linter. O projeto precisa declarar explicitamente em `architecture-linters.json`.
- **Nao permitir que o agente narre o verdict do linter.** Se o agente diz "a arquitetura esta consistente" mas o exit code foi 1, o agente esta errado — o exit code e autoridade.
- **Nao misturar linters com sensores.** Sensor responde "o codigo compila/testa/lint nativo passa"; linter responde "a estrutura cross-file respeita os invariantes declarados". Os dois coexistem sem sobreposicao.
- **Nao misturar linters com behaviours.** Behaviour responde "ao executar X, o sistema produz Y" (runtime); linter responde "a estrutura estatica do codigo segue as regras" (compile-time). Camadas ortogonais.
- **Nao permitir linter sem timeout.** `timeout_seconds` e obrigatorio explicito. Sem timeout, o linter pode travar `/lint-architecture` indefinidamente.
- **Nao permitir `scope: phase` sem `phase_id`.** Escopo de fase requer referencia explicita. Linter com `scope: phase` e `phase_id` ausente e rejeitado.
- **Nao permitir consumer executar `/lint-architecture` automaticamente.** Consumers sao read-only absolutos. Staleness e reportada, nao resolvida pelo consumer.
- **Nao tratar result stale como pass.** Mesmo com todos os linters verdes no last-run, staleness forca rebaixamento/lacuna.
- **Nao interpretar AST ou import graphs no framework.** O framework executa comandos shell. A semantica de "circular import" ou "layering violation" vem do comando declarado pelo projeto, nao de analise interna do framework.

## Relacao com hooks

Hooks rodam em evento (PreToolUse/PostToolUse/SessionStart/SessionEnd), sao universais, baixo custo e detectam padroes estaticos durante a edicao de um unico arquivo. Architecture linters rodam sob demanda, sao declarados pelo projeto, e validam invariantes que cruzam fronteiras de arquivo. Os dois nao competem.

## Bootstrap

Em projeto novo que quer adotar architecture linters:

1. Copiar `.claude/runtime/architecture-linters.template.json` para `.claude/runtime/architecture-linters.json`
2. Editar para declarar linters especificos do projeto (remover exemplos nao aplicaveis, ajustar comandos para a stack real)
3. Executar `/lint-architecture` pela primeira vez para estabelecer baseline
4. Commitar `architecture-linters.json` no repositorio (`architecture-linters-last-run.json` e efemero e pode ficar fora do Git)

Projetos que nao declaram linters operam em modo degradado — consumers reportam `NO_LINTERS` como lacuna informativa, nao bloqueante. Declaracao e responsabilidade do projeto, nunca inferida pelo framework.
