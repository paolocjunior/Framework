---
description: Executar sensores mecanicos declarados em .claude/runtime/sensors.json e produzir veredito estruturado
allowed-tools: Read, Write, Bash(jq:*), Bash(date:*), Bash(sh:*), Bash(bash:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(pnpm:*), Bash(yarn:*), Bash(bun:*), Bash(python:*), Bash(pip:*), Bash(pytest:*), Bash(ruff:*), Bash(mypy:*), Bash(cargo:*), Bash(rustc:*), Bash(go:*), Bash(gradle:*), Bash(gradlew:*), Bash(dotnet:*), Bash(make:*), Bash(cmake:*), Bash(test:*)
---

# /sensors-run — Executar Sensores Mecanicos

## Proposito

Executar os sensores declarados em `.claude/runtime/sensors.json`, capturar exit code de cada comando, agregar veredito estruturado e persistir o resultado em `.claude/runtime/sensors-last-run.json` para consumo por outros commands (`/ship-check`, `/verify-spec`, `/plan-review`).

Este command NAO interpreta output textual dos sensores nem narra resultados: o veredito vem exclusivamente do exit code. Ver `.claude/rules/sensors.md` para o contrato completo.

## Quando usar

- Antes de `/ship-check` para garantir que a validacao mecanica esta fresca
- Apos implementar mudancas significativas para validar que testes/lint/types ainda passam
- Em CI/CD como etapa mecanica de validacao
- Ao investigar regressao — rodar sensores antes de analise manual

## Pre-requisitos

- `.claude/runtime/sensors.json` existe e contem pelo menos 1 sensor com `enabled: true`
- `jq` instalado (dependencia obrigatoria do framework)
- Stack de cada sensor declarado esta instalada (npm, python, cargo, etc — o sensor falha com exit != 0 se a ferramenta nao esta disponivel, o que e o comportamento correto)

## Execucao

### Passo 1 — Carregar contexto

Aplicar o protocolo de `.claude/rules/context-loading.md`. Este command nao exige estado complexo do projeto, mas registra o resultado no ledger, entao deve saber a fase atual.

### Passo 2 — Validar declaracao

Ler `.claude/runtime/sensors.json`. Verificar:

1. Arquivo existe. Se ausente:
   - Reportar veredito `NO_SENSORS`
   - Escrever `sensors-last-run.json` com `verdict: "NO_SENSORS"` e `total_sensors: 0`
   - Recomendar ao usuario: "Projeto sem sensores declarados. Copiar `.claude/runtime/sensors.template.json` para `sensors.json` e editar conforme a stack."
   - Sair (exit 0 logico — nao e erro, e estado)

2. JSON valido. Se invalido:
   - Reportar erro de parsing com localizacao
   - NAO escrever `sensors-last-run.json` (nao corromper estado anterior)
   - Sair com erro

3. Cada sensor tem campos obrigatorios (`id`, `description`, `type`, `command`, `on_fail`). Sensores malformados sao reportados e pulados.

4. IDs sao unicos dentro do array `sensors`. IDs duplicados = erro de schema.

### Passo 3 — Filtrar sensores executaveis

Para cada sensor em `sensors[]`:

- Se `enabled: false` → pular (`status: skipped`, razao: disabled)
- Se `requires.network: true` e o usuario passou `--offline` → pular (`status: skipped`, razao: offline)
- Se `requires.database: true` e o usuario passou `--no-db` → pular (`status: skipped`, razao: no-db)
- Caso contrario → executar

### Passo 4 — Executar cada sensor sequencialmente

Para cada sensor filtrado, na ordem de declaracao:

1. Registrar `started_at` (timestamp ISO)
2. Executar via `bash -c "<command>"` no `working_dir` declarado (ou raiz)
3. Aplicar timeout conforme `timeout_seconds` (default 300)
4. Capturar:
   - `exit_code` (inteiro; `null` em caso de timeout antes de terminar)
   - `stdout + stderr` concatenados, mantendo as ultimas ~50 linhas como `output_tail`
   - `duration_ms` (inteiro, tempo decorrido)
5. Classificar `status`:
   - `pass` se exit_code == 0
   - `fail` se exit_code > 0
   - `timeout` se excedeu `timeout_seconds`
   - `error` se o processo nao pode ser iniciado (comando nao encontrado, permissao, etc)
6. Calcular `blocking`:
   - `true` se `status != pass` AND `on_fail == "block"`
   - `false` caso contrario

Sensores sao executados **sequencialmente** (nao em paralelo). Razoes:
- Alguns sensores compartilham recursos (node_modules, build cache)
- Sequencial facilita leitura de output ao usuario
- Paralelismo e otimizacao futura, nao requisito inicial

### Passo 5 — Agregar veredito

Calcular:

- `total_sensors` = len(sensors[])
- `executed` = count de sensores com status in {pass, fail, timeout, error}
- `skipped` = count de sensores com status == skipped
- `passed` = count de sensores com status == pass
- `failed` = count de sensores com status != pass (exclui skipped)
- `blocking_failures` = count de sensores com blocking == true

Aplicar regras de `sensors.md`:

- `verdict = "PASS"` se `blocking_failures == 0` e `executed > 0`
- `verdict = "FAIL"` se `blocking_failures > 0`
- `verdict = "PARTIAL"` se `skipped > 0` e `blocking_failures == 0`
- `verdict = "NO_SENSORS"` se `total_sensors == 0`

### Passo 6 — Persistir resultado

Escrever `.claude/runtime/sensors-last-run.json` conforme schema de `sensors.md`:

```json
{
  "run_id": "<ISO timestamp>",
  "started_at": "...",
  "finished_at": "...",
  "duration_ms": N,
  "total_sensors": N,
  "executed": N,
  "skipped": N,
  "passed": N,
  "failed": N,
  "verdict": "PASS | FAIL | PARTIAL | NO_SENSORS",
  "blocking_failures": N,
  "results": [ ... ]
}
```

Usar `jq` para gerar o JSON (garante escape correto de caracteres especiais em `output_tail`).

### Passo 7 — Atualizar ledger

Em `.claude/runtime/execution-ledger.md`, adicionar entrada na secao apropriada:

```
### Sensors Run — <ISO timestamp>
- Verdict: <PASS | FAIL | PARTIAL | NO_SENSORS>
- Executed: N | Passed: N | Failed: N | Blocking failures: N
- Duration: Ns
- Details: `.claude/runtime/sensors-last-run.json`
```

Se houver `blocking_failures > 0`, registrar cada um como Open Item com status BLOCKED e referencia ao sensor id.

### Passo 8 — Output ao usuario

Formato obrigatorio:

```markdown
# /sensors-run — Resultado

Contexto carregado: [fase], [open items: N], [bloqueios: N]

## Veredito: [PASS | FAIL | PARTIAL | NO_SENSORS]

## Resumo
- Total declarados: N
- Executados: N
- Pulados: N (disabled / offline / no-db)
- Passaram: N
- Falharam: N
- Falhas bloqueantes: N
- Duracao total: Ns

## Resultados por sensor

| ID | Tipo | Status | Exit | Duracao | on_fail | Blocking |
|----|------|--------|------|---------|---------|----------|
| unit-tests | test | pass | 0 | 12.3s | block | — |
| lint | lint | fail | 1 | 2.1s | block | SIM |
| type-check | type-check | pass | 0 | 4.5s | block | — |

## Falhas detalhadas

### [ID do sensor que falhou]
- **Tipo:** [type]
- **Exit code:** [N]
- **Duracao:** [Ns]
- **Output (tail):**
  ```
  [ultimas ~50 linhas de output]
  ```
- **Recomendacao:** [o que fazer — corrigir codigo, ajustar sensor, investigar]

## Pulados

| ID | Razao |
|----|-------|
| [id] | [disabled / offline / no-db] |

## Artefatos escritos

- `.claude/runtime/sensors-last-run.json` (veredito estruturado para consumo por outros commands)
- `.claude/runtime/execution-ledger.md` (entrada de registro historico)
```

## Flags suportadas

| Flag | Efeito |
|------|--------|
| `--offline` | Pular sensores com `requires.network: true` |
| `--no-db` | Pular sensores com `requires.database: true` |
| `--only <id>` | Executar apenas 1 sensor especifico (util para debugging) |
| `--skip <id>` | Pular 1 sensor especifico |

Flags sao opcionais. Sem flags, executar todos os sensores `enabled: true` sem restricao.

## Regras

1. **Exit code manda.** O veredito vem do exit code, nao da interpretacao do output. Se o comando retornar 0, o sensor passou — mesmo se o output tem a palavra "error".
2. **Nao inventar sensores.** Se o sensor nao esta declarado em `sensors.json`, ele nao existe. `/sensors-run` nao infere comandos a partir da stack.
3. **Nao corromper estado anterior.** Se a execucao falhar no meio (timeout, erro de shell), preservar `sensors-last-run.json` anterior ate que uma nova execucao completa possa substitui-lo.
4. **Nao narrar falsos positivos.** Se um sensor falhou, reportar fielmente o exit code e output. Nao reinterpretar como "provavelmente ok".
5. **Timeout nao e falha logica.** `status: timeout` e distinto de `status: fail`. Timeout significa "nao pudemos concluir", nao "o codigo esta quebrado". Blocking ainda e aplicado (timeout com on_fail=block e blocking), mas a classificacao e preservada.
6. **Output tail e cru, nao interpretado.** Nao filtrar, nao sumarizar, nao reordenar. O usuario precisa ver o output real para diagnosticar.

## Anti-padroes

- Reportar `PASS` quando um sensor teve `status: error` (comando nao encontrado)
- Reportar `PASS` quando um sensor teve `status: timeout` com `on_fail: block`
- Omitir sensores pulados do relatorio — usuario precisa saber o que NAO rodou
- Re-interpretar exit code diferente de 0 como "warning" quando `on_fail: block`
- Executar sensores em paralelo sem declarar isso (quebra sequencialidade documentada)
