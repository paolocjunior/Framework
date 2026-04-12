---
description: Detectar capability gaps do projeto e persistir registro estruturado em capability-gaps.json
allowed-tools: Read, Write, Grep, Glob, Bash(find:*), Bash(date:*), Bash(jq:*), Bash(test:*)
---

# /gaps-scan — Detectar Capability Gaps

## Proposito

Detectar lacunas de verificacao do projeto de forma mecanica e objetiva, persistir os gaps detectados em `.claude/runtime/capability-gaps.json` seguindo as regras de merge com gaps existentes. Este e o **unico command que cria gaps** — todos os outros consumers sao read-only absolutos.

Ver `.claude/rules/capability-gaps.md` para o contrato completo (schema, tipos, lifecycle, merge rules, heuristicas, vedacoes).

## Quando usar

- Ao adotar capability gap tracking pela primeira vez (bootstrap)
- Apos adicionar/remover camadas de verificacao (sensores, behaviours, linters, contratos, KB)
- Periodicamente para atualizar o registro de gaps (recomendado: antes de `/ship-check`)
- Apos mudancas significativas na configuracao do framework

## Pre-requisitos

- `jq` instalado (dependencia obrigatoria do framework)
- Projeto com `.claude/runtime/` existente

## Execucao

### Passo 1 — Carregar contexto

Aplicar o protocolo de `.claude/rules/context-loading.md`. O gaps-scan precisa saber a fase atual para contextualizar deteccoes.

### Passo 2 — Carregar registro existente

Ler `.claude/runtime/capability-gaps.json`:

- **Ausente** → inicializar registro vazio: `{ "schema_version": "1", "last_scan": null, "gaps": [] }`. Informar ao usuario: "Registro de gaps inicializado. Copie `.claude/runtime/capability-gaps.template.json` para `capability-gaps.json` se preferir bootstrap manual."
- **Presente** → ler e validar schema. Se invalido, reportar erro e sair sem sobrescrever.

Guardar o array de gaps existentes para aplicar merge rules no Passo 7.

### Passo 3 — Detectar gaps tipo `declaration_absent`

Verificar existencia de cada camada de verificacao do framework:

| Camada | Arquivo esperado | Categoria do gap |
|---|---|---|
| Sensores | `.claude/runtime/sensors.json` | `sensors` |
| Behaviours | `.claude/runtime/behaviours.json` | `behaviours` |
| Architecture linters | `.claude/runtime/architecture-linters.json` | `linters` |
| Contratos de execucao | `.claude/runtime/contracts/` com pelo menos 1 `phase-*.json` | `contracts` |
| Knowledge base | `.claude/runtime/knowledge/knowledge-index.json` | `knowledge_base` |

Para cada camada ausente, emitir gap:
- `type`: `declaration_absent`
- `severity`: `high` para sensores (build/test/lint nao verificados mecanicamente), `medium` para as demais
- `evidence`: `"<arquivo> ausente no path .claude/runtime/"`
- `source_artifacts`: `[".claude/runtime/"]`

Se o arquivo de declaracao existe mas esta vazio ou sem itens `enabled: true`, emitir gap com `description` ajustada: "Declaracao existe mas nenhum item habilitado".

### Passo 4 — Detectar gaps tipo `never_run`

Para cada camada que tem declaracao presente (Passo 3 nao emitiu `declaration_absent`), verificar se o ultimo resultado de execucao existe:

| Camada | Declaracao | Resultado esperado |
|---|---|---|
| Sensores | `sensors.json` | `sensors-last-run.json` |
| Behaviours | `behaviours.json` | `behaviours-last-run.json` |
| Architecture linters | `architecture-linters.json` | `architecture-linters-last-run.json` |

Para cada resultado ausente, emitir gap:
- `type`: `never_run`
- `severity`: `high` se a camada tem itens com `on_fail: block` / `severity: block`, `medium` caso contrario
- `evidence`: `"<declaracao> existe com N itens enabled, mas <resultado> ausente"`
- `source_artifacts`: `["<declaracao>"]`

### Passo 5 — Detectar gaps tipo `stale`

Para cada camada que tem declaracao E resultado (Passos 3 e 4 nao emitiram gap), verificar staleness:

**Sensores:**
- `sensors.json` modificado apos `finished_at` de `sensors-last-run.json`
- Arquivos-fonte do projeto modificados apos `finished_at`

**Behaviours:**
- `behaviours.json` modificado apos `finished_at` de `behaviours-last-run.json`
- Phase contract vinculado modificado apos `finished_at`
- Algum behaviour `enabled: true` ausente de `results[]`

**Architecture linters:**
- `architecture-linters.json` modificado apos `finished_at` de `architecture-linters-last-run.json`
- Arquivos potencialmente cobertos modificados apos `finished_at`
- Algum linter `enabled: true` ausente de `results[]`

Para cada camada stale, emitir gap:
- `type`: `stale`
- `severity`: `low`
- `evidence`: motivo da staleness (ex: `"sensors.json mtime 2026-04-12 > sensors-last-run finished_at 2026-04-10"`)
- `source_artifacts`: `["<declaracao>", "<resultado>"]`

### Passo 6 — Detectar gaps tipo `binding_gap`

Verificar vinculacao bidirecional entre contratos e behaviours (se ambos existem):

1. Para cada AC em phase contracts com `verifiable_by: "behaviour"`:
   - `behaviour_id` esta presente? Se ausente → binding gap
   - `behaviour_id` aponta para behaviour existente em `behaviours.json`? Se nao → binding gap
   - O behaviour referenciado tem `contract_ref` apontando de volta para este AC? Se nao → binding gap

2. Para cada behaviour com `contract_ref` declarado:
   - O AC referenciado existe no phase contract? Se nao → binding gap

Para cada binding gap, emitir:
- `type`: `binding_gap`
- `severity`: `medium`
- `evidence`: descricao do vinculo quebrado (ex: `"AC1 declara verifiable_by:behaviour com behaviour_id:b-01, mas b-01 nao tem contract_ref:AC1"`)
- `source_artifacts`: paths do contrato e do behaviours.json

### Passo 7 — Detectar gaps tipo `native_uncovered`

Executar **apenas** as heuristicas da lista fechada documentada em `.claude/rules/capability-gaps.md`. Se nenhuma heuristica casa, nenhum gap `native_uncovered` e emitido.

**H1 — Ausencia de scan de vulnerabilidades em dependencias:**
- Condicao: projeto tem `package.json` (ou `requirements.txt`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`) com dependencias + nenhum sensor com `type: "security-scan"` declarado em `sensors.json`
- Gap: `category: "dep_scan"`, `severity: "medium"`

**H2 — Ausencia de verificacao de acessibilidade:**
- Condicao: projeto tem arquivos `.html`, `.jsx`, `.tsx` + nenhum sensor ou behaviour que referencia "accessibility", "a11y", "wcag" em description ou id
- Gap: `category: "accessibility"`, `severity: "medium"`

**H3 — Ausencia de pen test ou teste de integracao HTTP:**
- Condicao: projeto tem endpoints HTTP (detectavel por presenca de `express`, `fastify`, `flask`, `django`, `gin`, `actix`, `axum`, `net/http`, `fiber` em codigo-fonte) + nenhum behaviour com `type: "http"` e `on_fail: "block"` que referencia endpoint real
- Gap: `category: "pen_test"`, `severity: "high"`

**H4 — Ausencia de metricas de performance frontend:**
- Condicao: projeto tem UI (detectavel por presenca de componentes React/Vue/Svelte/Angular/HTML significativos) + nenhum sensor que referencia "performance", "lighthouse", "vitals" em description ou id
- Gap: `category: "performance"`, `severity: "medium"`

**H5 — Ausencia de testes E2E com browser:**
- Condicao: projeto tem testes unitarios (sensor `type: "test"` presente) mas nenhum sensor ou behaviour com id/description referenciando "playwright", "cypress", "selenium", "e2e", "puppeteer"
- Gap: `category: "e2e"`, `severity: "medium"`

**H6 — Ausencia de quality gates em CI/CD:**
- Condicao: nenhum dos seguintes existe: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/`, `bitbucket-pipelines.yml`
- Gap: `category: "ci_cd"`, `severity: "medium"`

**Regra:** se nenhuma heuristica casa, nenhum `native_uncovered` e emitido. O scanner nao improvisa.

### Passo 8 — Aplicar merge rules

Para cada gap detectado nos Passos 3-7, aplicar as 5 regras de merge de `.claude/rules/capability-gaps.md`:

1. **Gap novo** (nenhum gap existente com mesmo `type` + `category`): criar com `status: "open"`, `first_detected_at` e `last_seen_at` = timestamp atual, `detected_by: "/gaps-scan"`.

2. **Gap existente com `status: "open"`**: atualizar `last_seen_at`, `evidence`, `severity`, `source_artifacts`. Preservar `first_detected_at` e `id`.

3. **Gap existente com status humano** (`acknowledged`, `accepted`, `filled`, `deferred`): atualizar **apenas** `last_seen_at` e `evidence`. **NUNCA** sobrescrever `status`, `resolution`, `resolution_justification`, `severity`.

4. **Gap existente nao detectado neste scan**: preservar intacto. Nao remover.

5. **Gap `filled` re-detectado**: criar **novo gap** com id versionado (ex: `gap-01-no-sensors-v2`), `status: "open"`. O gap `filled` anterior permanece intacto.

### Passo 9 — Gerar IDs para gaps novos

Para gaps novos, gerar id no formato `gap-NN-<slug>`:
- `NN`: sequencial baseado no maior numero existente + 1
- `<slug>`: derivado de `type` + `category` (ex: `gap-01-no-sensors`, `gap-02-never-run-behaviours`, `gap-03-stale-linters`, `gap-04-binding-ac1`, `gap-05-native-pen-test`)

### Passo 10 — Persistir resultado

Escrever `.claude/runtime/capability-gaps.json` com:
- `last_scan`: timestamp ISO-8601 atual
- `gaps`: array completo (existentes preservados + novos adicionados + atualizados conforme merge)

### Passo 11 — Atualizar ledger

Em `.claude/runtime/execution-ledger.md`, adicionar entrada:

```
### Gaps Scan — <ISO timestamp>
- Total de gaps: N (open: X, acknowledged: Y, accepted: Z, filled: W, deferred: V)
- Novos neste scan: N
- Atualizados: N
- Tipos: declaration_absent: N, never_run: N, stale: N, binding_gap: N, native_uncovered: N
- High: N | Medium: N | Low: N
- Detalhes: `.claude/runtime/capability-gaps.json`
```

### Passo 12 — Output ao usuario

```markdown
# /gaps-scan — Resultado

Contexto carregado: [fase], [open items: N], [bloqueios: N]

## Resumo

- Total de gaps registrados: N
- Novos detectados neste scan: N
- Atualizados (existentes re-detectados): N
- Preservados (nao detectados mas mantidos): N
- High: N | Medium: N | Low: N

## Gaps por tipo

### declaration_absent (N)
| ID | Categoria | Severidade | Status | Evidencia |
|----|-----------|------------|--------|-----------|

### never_run (N)
| ID | Categoria | Severidade | Status | Evidencia |
|----|-----------|------------|--------|-----------|

### stale (N)
| ID | Categoria | Severidade | Status | Evidencia |
|----|-----------|------------|--------|-----------|

### binding_gap (N)
| ID | Categoria | Severidade | Status | Evidencia |
|----|-----------|------------|--------|-----------|

### native_uncovered (N)
| ID | Categoria | Severidade | Status | Evidencia | Heuristica |
|----|-----------|------------|--------|-----------|------------|

## Gaps com status humano (preservados)

| ID | Tipo | Status | Justificativa |
|----|------|--------|---------------|
(gaps acknowledged/accepted/filled/deferred — preservados intactos)

## Artefatos escritos

- `.claude/runtime/capability-gaps.json` (registro persistente)
- `.claude/runtime/execution-ledger.md` (entrada de historico)
```

## Regras

1. **Scanner nao sobrescreve humano.** Status humano (`acknowledged`, `accepted`, `filled`, `deferred`) e intocavel. Scanner so atualiza `last_seen_at` e `evidence` nesses gaps.
2. **Scanner nao remove gaps.** Gap nao detectado permanece no registro — pode ter sido resolvido fora do escopo do scanner.
3. **Scanner nao reabre `filled`.** Se a condicao de um gap `filled` reaparece, cria gap novo com id versionado.
4. **Heuristicas de `native_uncovered` sao lista fechada.** So H1-H6 documentadas na rule. Se nenhuma casa, nenhum gap `native_uncovered` e emitido.
5. **Gaps nao sao gate.** Este command produz registro para visibilidade — nenhum consumer bloqueia veredicto por gaps.
6. **Determinismo sobre inferencia.** Todas as deteccoes sao por verificacao objetiva (arquivo existe? campo presente? run executado?). Nenhuma analise subjetiva de dominio.

## Anti-padroes

- Inferir que o projeto "precisa" de E2E sem que H5 case objetivamente
- Remover gap que o usuario marcou como `accepted` porque "nao e mais relevante"
- Sobrescrever `severity` de gap com status humano
- Criar gap sem `evidence` ou com evidence vaga ("pode ser necessario")
- Emitir `native_uncovered` fora das heuristicas H1-H6 documentadas
