# Mechanical Sensors Protocol

## Propósito

Definir sensores mecânicos como artefato first-class do framework. Um sensor é uma **verificação declarativa executada pelo ambiente**, cujo veredicto vem do **exit code de um comando**, não da narrativa do agente. Esta rule institui o contrato entre a declaração (`sensors.json`), a execução (`/sensors-run`) e o consumo pelos demais commands (`/ship-check`, `/verify-spec`, `/plan-review`).

Esta rule existe para fechar a lacuna central apontada na análise de Harness Engineering: **o agente não pode mais dizer que validou; o ambiente precisa dizer**. Hooks já pegam erros objetivos por evento (secrets, syntax, gate de implementação). Sensores pegam validação mecânica sob demanda — testes, lint, type-check, build, audit — e elevam isso a contrato declarativo versionado junto com o código.

## Princípios

1. **Exit code é fonte de verdade.** Se o comando retorna 0, o sensor passou. Se retorna qualquer outro valor, falhou. Nenhum agente pode "interpretar" o output como sucesso quando o exit code diz o contrário.
2. **Sensor é declarativo.** O projeto declara em `sensors.json` o que vai ser executado. O framework não inventa sensores nem infere comandos a partir da stack. Se o projeto não declarou, o sensor não existe.
3. **Agente não narra veredicto — reporta execução.** O resultado de um sensor é estruturado (JSON), não prosa. Commands que consomem sensores leem o JSON, não a descrição textual do agente.
4. **Falha de sensor tem semântica declarada.** Cada sensor declara `on_fail`: `block` (falha bloqueia veredicto do command consumidor) ou `warn` (falha é reportada mas não bloqueia).
5. **Sensores são reexecutáveis e determinísticos.** Rodar duas vezes o mesmo sensor na mesma árvore de código deve produzir o mesmo resultado. Sensores que dependem de estado externo (rede, banco) devem declarar isso explicitamente.
6. **Ausência de `sensors.json` não é falha — é estado "projeto sem sensores declarados".** Commands consumidores devem lidar graciosamente com essa ausência, reportando-a como lacuna (não como erro).

## Contrato do arquivo `sensors.json`

O arquivo vive em `.claude/runtime/sensors.json` (mesma pasta do execution-ledger). É versionado no Git — é parte do contrato do projeto, não do framework universal.

### Schema

```json
{
  "version": "1",
  "sensors": [
    {
      "id": "string (único, kebab-case)",
      "description": "string (human-readable, curta)",
      "type": "test | lint | type-check | build | security-scan | custom",
      "command": "string (bash command, será executado via sh -c)",
      "working_dir": "string (opcional, relativo à raiz do projeto; default: raiz)",
      "timeout_seconds": "integer (opcional, default: 300)",
      "on_fail": "block | warn",
      "enabled": "boolean (opcional, default: true)",
      "requires": {
        "network": "boolean (opcional, default: false)",
        "database": "boolean (opcional, default: false)"
      }
    }
  ]
}
```

### Campos obrigatórios

- `id` — identificador único, usado para referenciar o sensor em outros artefatos (execution contracts, ledger, reports)
- `description` — descrição curta para relatórios
- `type` — categoria do sensor (determina como o consumer categoriza o resultado)
- `command` — comando bash que será executado
- `on_fail` — política de falha

### Campos opcionais

- `working_dir` — se o sensor precisa rodar em subdiretório (ex: monorepo com `packages/api`)
- `timeout_seconds` — default 300s; sensores lentos (E2E, integration) podem precisar mais
- `enabled` — permite desligar um sensor temporariamente sem removê-lo
- `requires` — declara dependências de ambiente (usado pelo `/sensors-run` para decidir se pode executar)

### Tipos de sensor

| Tipo | Semântica | Exemplo de comando |
|---|---|---|
| `test` | Executa testes; exit 0 = todos passaram | `npm test`, `pytest`, `cargo test`, `go test ./...` |
| `lint` | Executa linter; exit 0 = sem violações | `npm run lint`, `ruff check`, `cargo clippy -- -D warnings` |
| `type-check` | Verifica tipos; exit 0 = tipos válidos | `npm run typecheck`, `mypy src`, `tsc --noEmit` |
| `build` | Compila; exit 0 = build limpo | `npm run build`, `cargo build --release`, `go build ./...` |
| `security-scan` | Audit de dependências/código; exit 0 = sem vulnerabilidades críticas | `npm audit --audit-level=high`, `pip-audit`, `cargo audit` |
| `custom` | Qualquer verificação; semântica definida pelo comando | scripts shell, checks customizados |

O tipo é uma etiqueta semântica — o framework usa para categorizar resultados em relatórios, mas não muda a forma de execução (todos são `sh -c <command>` com captura de exit code).

## Contrato do arquivo `sensors-last-run.json`

Após execução de `/sensors-run`, o resultado é escrito em `.claude/runtime/sensors-last-run.json`. Este arquivo é o **oracle de leitura** para outros commands.

### Schema

```json
{
  "run_id": "string (timestamp ISO ou uuid)",
  "started_at": "ISO-8601 timestamp",
  "finished_at": "ISO-8601 timestamp",
  "duration_ms": "integer",
  "total_sensors": "integer",
  "executed": "integer",
  "skipped": "integer",
  "passed": "integer",
  "failed": "integer",
  "verdict": "PASS | FAIL | PARTIAL | NO_SENSORS",
  "blocking_failures": "integer",
  "results": [
    {
      "id": "string (sensor id)",
      "type": "string (sensor type)",
      "status": "pass | fail | timeout | error | skipped",
      "exit_code": "integer | null",
      "duration_ms": "integer",
      "output_tail": "string (últimas N linhas de stdout+stderr, default 50)",
      "on_fail": "block | warn",
      "blocking": "boolean (true se status=fail AND on_fail=block)"
    }
  ]
}
```

### Regras de agregação do veredicto

- **`PASS`** — todos os sensores executados passaram (ou os que falharam têm `on_fail: warn`)
- **`FAIL`** — pelo menos 1 sensor falhou com `on_fail: block`
- **`PARTIAL`** — algum sensor foi pulado (ex: requer network e `--offline` foi passado) e os executados passaram
- **`NO_SENSORS`** — `sensors.json` ausente ou vazio

O campo `blocking_failures` conta explicitamente quantos sensores falharam com `on_fail: block`. Consumers usam esse campo como gate rápido.

## Integração com commands consumidores

| Command | Como consome | Ação em falha |
|---|---|---|
| `/sensors-run` | Executa sensores, produz `sensors-last-run.json`, atualiza ledger | Reporta veredicto estruturado; não bloqueia por si só |
| `/ship-check` | Lê `sensors-last-run.json`; se ausente ou stale, executa `/sensors-run` primeiro | `FAIL` do sensor bloqueia veredicto `PRONTO` |
| `/verify-spec` | Lê `sensors-last-run.json` como evidência mecânica de que o código roda; cruza com cobertura funcional | `FAIL` do sensor rebaixa veredicto; teste fail = cenário NÃO COBERTO |

Nota sobre `/plan-review`: atualmente não consome sensores. Verificação de cobertura de sensores em planos novos é possibilidade futura, não contrato vigente — a integração só passa a valer quando `plan-review.md` declarar explicitamente o passo de leitura de `sensors.json` e a tabela acima for atualizada em conjunto.

### Staleness do `sensors-last-run.json`

Consumers devem considerar o resultado stale se:
1. `sensors.json` foi modificado após `sensors-last-run.json` — os sensores declarados mudaram
2. Arquivos-fonte foram modificados após `finished_at` — o código rodado pelos sensores mudou
3. `finished_at` é maior que 24h atrás — resultado antigo demais para confiar

Em caso de staleness, o consumer deve re-executar `/sensors-run` antes de tomar decisão.

## Vedações

- **Não inferir sensores a partir da stack.** Se o projeto tem `package.json`, isso não autoriza o framework a assumir `npm test` como sensor. O projeto precisa declarar explicitamente em `sensors.json`.
- **Não permitir que o agente narre o veredicto do sensor.** Se o agente diz "os testes passaram" mas o exit code foi 1, o agente está errado — o exit code é autoridade.
- **Não misturar sensores com hooks.** Hooks rodam em evento (edit, write, session-start) e são universais. Sensores rodam sob demanda (via command) e são declarados pelo projeto. Os dois coexistem sem sobreposição.
- **Não mascarar falhas críticas com `on_fail: warn`.** Sensores de segurança (audit, security-scan) devem usar `on_fail: block` por default. Rebaixar para `warn` é decisão consciente que deve ser justificada via `/justify`.
- **Não permitir sensor sem timeout.** Timeout default é 300s, mas nunca omitir o campo em sensores customizados que podem travar.

## Relação com hooks

| Aspecto | Hooks | Sensores |
|---|---|---|
| Quando rodam | Automaticamente em evento (edit, write, session-start) | Sob demanda (via `/sensors-run` ou dentro de commands consumidores) |
| Declaração | `settings.json` (universal, parte do framework) | `sensors.json` (por projeto, versionado com o código) |
| Custo típico | Baixíssimo (<1s por hook) | Médio a alto (testes E2E podem levar minutos) |
| Escopo | Arquivo ou sessão | Codebase inteira ou subset declarado |
| O que detectam | Padrões estáticos, violações sintáticas, secrets, loops | Correção funcional, tipos, build, vulnerabilidades, comportamento |

Hooks e sensores são camadas complementares, não substitutas.

## Bootstrap

Em projeto novo:

1. Copiar `.claude/runtime/sensors.template.json` para `.claude/runtime/sensors.json`
2. Editar para refletir a stack real do projeto (remover sensores não aplicáveis, ajustar comandos)
3. Executar `/sensors-run` pela primeira vez para estabelecer baseline
4. Commitar `sensors.json` no repositório (`sensors-last-run.json` pode ficar fora do Git — é efêmero)

Em projeto sem sensores declarados, `/ship-check` e `/verify-spec` funcionam em modo degradado: reportam "sensores não declarados" como lacuna explícita, mas não bloqueiam veredicto automaticamente. A ausência é tratada como débito técnico, não como erro.
