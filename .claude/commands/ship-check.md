---
description: Verificação pré-entrega — gate de qualidade antes de considerar o projeto/módulo pronto para distribuição ou deploy
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(python:*), Bash(pip:*), Bash(cargo:*), Bash(rustc:*), Bash(gradle:*), Bash(gradlew:*), Bash(dotnet:*), Bash(cmake:*), Bash(make:*), Bash(go:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(xcodebuild:*), Bash(swift:*), Bash(unity:*), Bash(godot:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de executar a verificação pré-entrega:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Verificar Open Items, bloqueios, fases pendentes e aprovações parciais
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir
5. **Fase pendente, item `DEFERRED` ou bloqueio ativo = ship-check não pode reportar PRONTO.** Esses itens devem aparecer explicitamente no output como motivos de rebaixamento.

---

Realizar verificação pré-entrega do projeto, avaliando se está pronto para distribuição, deploy ou entrega.

Os comandos e ferramentas de verificação devem ser adaptados à stack do projeto (ex.: npm/yarn/pnpm/bun, pip/pytest, cargo, gradle/gradlew, xcodebuild/swift, dotnet, cmake/make, go, unity/godot export pipeline). Os itens da checklist são universais; os comandos específicos variam por tecnologia.

A verificação é dividida em dois blocos com semânticas distintas. **O Bloco A é precedido pela camada de sensores mecânicos** (`.claude/rules/sensors.md`), que substitui a execução ad-hoc de `npm test`, `tsc`, `npm run build` etc. por resultados estruturados vindos de exit code.

---

## Bloco 0 — Sensores mecânicos (gate prévio ao Bloco A)

Antes de avaliar qualquer item do Bloco A, este command **deve consumir o veredicto estruturado de sensores mecânicos**. A camada de sensores é autoritativa sobre build, testes, lint, type-check e audit de dependências — quando existe.

### Passo 0.1 — Verificar existência de `sensors.json`

Ler `.claude/runtime/sensors.json`:

- **Ausente** → projeto não declara sensores. Registrar como **lacuna explícita** no output (recomendação: "Copiar `sensors.template.json` para `sensors.json` e declarar sensores da stack"). O Bloco A roda no modo ad-hoc tradicional (execução direta de comandos pelo agente), mas o veredicto final do ship-check inclui a lacuna como débito técnico. Não bloqueia veredicto `PRONTO`, mas deve aparecer no output.
- **Presente** → seguir para Passo 0.2.

### Passo 0.2 — Verificar frescor de `sensors-last-run.json`

Ler `.claude/runtime/sensors-last-run.json`:

- **Ausente** → nunca foi executado. Invocar `/sensors-run` antes de prosseguir.
- **Presente** mas stale (ver regras de staleness em `sensors.md`: `sensors.json` modificado após a última run, ou código-fonte modificado após `finished_at`, ou `finished_at > 24h atrás`) → invocar `/sensors-run` para atualizar.
- **Presente e fresco** → consumir diretamente.

### Passo 0.3 — Aplicar veredicto de sensores ao Bloco A

Mapear o `verdict` do `sensors-last-run.json` para itens do Bloco A:

| Sensor `type` | Item do Bloco A coberto |
|---|---|
| `test` | A2 (Testes) |
| `lint` | A3 (parte — lint) |
| `type-check` | A3 (parte — types) |
| `build` | A1 (Build) |
| `security-scan` | A5 (parte — audit de dependências) |

Para cada item do Bloco A coberto por sensor, o status vem diretamente do sensor:
- Sensor `pass` → item `PASS` com evidência `sensors-last-run.json:<sensor_id>` e exit_code 0
- Sensor `fail` com `on_fail: block` → item `FAIL` bloqueante
- Sensor `fail` com `on_fail: warn` → item `FAIL` não-bloqueante
- Sensor `timeout` ou `error` → item `NÃO VERIFICADO` com razão

Itens do Bloco A NÃO cobertos por sensor (A4 Configuração, A6 Secrets, parte de A5 que não é audit) continuam sendo verificados pelo agente na forma tradicional.

### Passo 0.4 — Veredicto de sensores bloqueante

Se `sensors-last-run.json` reporta `blocking_failures > 0`, o ship-check **NÃO pode reportar PRONTO**, independente de qualquer outro sinal. Rebaixar imediatamente para `NÃO PRONTO` e listar os sensores que falharam como bloqueadores.

Razão: o princípio de sensores é que o ambiente é autoritativo. Se o agente concluísse PRONTO contra o sensor dizendo FAIL, o framework estaria voltando ao modelo self-evaluation que sensores existem para eliminar.

---

## Bloco 0.5 — Contrato de execução ativo (gate contratual)

Após consumir o veredicto de sensores, o ship-check **deve consumir o veredicto do contrato ativo da fase atual**, quando houver. O contrato é a declaração formal upstream do que a fase promete entregar — ignorá-lo significa ignorar o compromisso declarado pelo próprio projeto.

Este bloco é complementar ao Bloco 0: sensores dizem se o código compila/testa/lint passa; o contrato diz se os deliverables prometidos existem. As duas camadas coexistem e são autoritativas em seus respectivos domínios.

### Passo 0.5.1 — Verificar existência de contrato ativo

Ler `.claude/runtime/contracts/active.json`:

- **Ausente** ou `active_phase_id` é `null` → projeto não declara contrato da fase atual. Registrar como **lacuna explícita** no output (recomendação: "Rodar `/contract-create` para declarar o contrato da fase corrente"). Não bloqueia `PRONTO`, mas aparece como débito contratual no output. Seguir para Bloco A.
- **Presente** → seguir para Passo 0.5.2.

### Passo 0.5.2 — Verificar status do contrato ativo

Ler o contrato apontado por `active_contract_path`:

- **Status `draft`** → contrato não aprovado. Avisar: "Fase tem contrato em draft, não aprovado. Gate contratual ausente." Seguir para Bloco A, mas tratar como lacuna (similar a `NO_SENSORS`).
- **Status `approved` ou `in_progress`** → contrato vigente. Invocar `/contract-check` para obter o veredicto atual.
- **Status `done`** → contrato já fechado. Verificar se a fase fechada corresponde ao escopo que o ship-check está avaliando. Se sim, consumir o veredicto histórico (deve estar `READY_TO_CLOSE` ou equivalente). Se há novas mudanças após o fechamento, avisar staleness.
- **Status `failed`, `rolled_back` ou `deferred`** → contrato histórico indicando que a fase não foi concluída com sucesso. Isso é sinal forte de que o projeto **não está pronto** — rebaixar para `NÃO PRONTO` e citar o `verdict_reason` no output.

### Passo 0.5.3 — Consumir veredicto de `/contract-check`

Invocar `/contract-check` (ou aplicar a lógica dele internamente) sobre o contrato ativo. Mapear o veredicto para o ship-check:

| Veredicto do contract-check | Ação no ship-check |
|---|---|
| `FAILED` | Rebaixar para `NÃO PRONTO` incondicionalmente. O contrato declara que deliverables required estão ausentes ou que sensores required falharam. Listar os itens bloqueantes no output. |
| `AT_RISK` | Rebaixar para `PRONTO COM RESSALVAS` se o Bloco A fosse reportar `PRONTO`. Listar os deliverables opcionais ausentes, sensores não rodados e manual checks pendentes. |
| `ON_TRACK` | Permitir que o Bloco A siga normalmente. O contrato está em progresso consistente mas não há evidência de fechamento. Se o ship-check iria reportar `PRONTO`, rebaixar para `PRONTO COM RESSALVAS` com observação "contrato em progresso, sem evidência de READY_TO_CLOSE". |
| `READY_TO_CLOSE` | Sinal verde do gate contratual. O Bloco A pode reportar `PRONTO` se todos os outros blocos permitirem. |

**Princípio:** o contrato é declarativo e assinado pelo próprio projeto antes da implementação. Se o contrato declara que um deliverable é required e o deliverable está missing, a fase não entregou o que prometeu — ship-check não pode contradizer o compromisso declarado.

### Passo 0.5.4 — Staleness do contrato

Se `/contract-check` reportar staleness (arquivos modificados após a última atualização do contrato, ou `sensors-last-run.json` mais recente que `evidence.sensors_run_id`), adicionar ao output do ship-check o bloco de staleness e recomendar:

- Atualizar manualmente `evidence` do contrato, OU
- Criar contrato v2 via `/contract-create` se o scope mudou

Staleness por si só não bloqueia `PRONTO`, mas aparece como observação no output.

---

## Bloco 0.6 — Sprints da fase (informativo, não-bloqueante)

Após consumir o veredicto do contrato ativo (Bloco 0.5), o ship-check **coleta o estado dos sprints contracts da fase corrente — estritamente para visibilidade**. Sprints são granularidade intra-fase opcional (ver `.claude/rules/execution-contracts.md`, seção "Sprint contracts"); eles não mutam o phase contract e não participam da decisão de veredicto do ship-check.

**Princípio:** o phase contract (Bloco 0.5) é autoridade única sobre o compromisso da fase. Sprints são sub-unidades de feedback curto dentro da fase; seu estado aparece no output apenas para contexto operacional.

### Passo 0.6.1 — Verificar existência do diretório de sprints

A partir do `parent_phase_id` lido do contrato ativo (ou do `active_phase_id` de `active.json` quando o contrato não existe), procurar `.claude/runtime/contracts/sprints/<parent_phase_id>/`:

- **Diretório ausente ou vazio** → a fase não usa sprint contracts. Registrar no output como "Sprints: não declarados para esta fase". Não é débito técnico, não é recomendação — é operação normal. Seguir para Bloco A.
- **Diretório presente com 1+ sprint contracts** → seguir para Passo 0.6.2.

### Passo 0.6.2 — Coletar dados dos sprints

Para cada arquivo `<sprint_id>.json` no diretório:

1. Validar schema via `jq empty`. Arquivos inválidos aparecem no output como `INVALID` mas não bloqueiam nada.
2. Extrair campos informativos:
   - `sprint_id`
   - `title`
   - `status` (`draft | approved | in_progress | passed | failed | deferred`)
   - `created_at`
   - `closed_at` (se existe)
   - `evaluation_history` → contagem de entradas e último verdict mecânico (`pass | fail | partial` ou "nenhum" se vazio)
   - `verdict` (se existe — preenchido por `/sprint-close`)
   - `verdict_reason` (se existe)

### Passo 0.6.3 — Identificar sprint ativo

Ler `.claude/runtime/contracts/active-sprint.json`:

- `active_sprint_id` é `null` ou arquivo ausente → nenhum sprint ativo no momento
- `active_sprint_id` preenchido → registrar qual sprint é o corrente. Validar que o `active_parent_phase_id` bate com a fase sendo avaliada; se divergir, reportar como inconsistência (informativa, não bloqueante).

### Passo 0.6.4 — Agregar contagens

Agrupar sprints por status final:
- `passed` — fechados com sucesso
- `failed` — fechados como falha
- `deferred` — adiados
- `in_progress` — em andamento
- `approved` — aprovados mas ainda não iniciados
- `draft` — rascunhos

Nenhuma regra de agregação vira veredicto. Não existe "sprint fail bloqueia ship-check" — o phase contract é que decide.

### Passo 0.6.5 — Regra de read-only absoluto

Este bloco **nunca modifica** nada:
- Não edita sprints contracts
- Não edita `active-sprint.json`
- Não edita o phase contract
- Não invoca `/sprint-evaluate` nem `/sprint-close`
- Não escreve no ledger (a atualização do ledger no final do ship-check é responsabilidade da seção "Atualização do Ledger" e pode citar sprints, mas o Bloco 0.6 em si é read-only)

---

## Bloco A — Release Viability

Verifica se o projeto **compila, funciona e não está quebrado**. Itens deste bloco são **bloqueantes** — falha aqui significa que o projeto não está pronto.

### A1. Build
- Projeto compila sem erros (`npm run build`, `tsc`, equivalente da stack)
- Se não houver build configurado, verificar se os arquivos-fonte estão sintaticamente corretos
- Em projetos com bundler (tsup, esbuild, webpack, rollup): verificar se o arquivo source tem shebang (`#!/usr/bin/env node`) E o bundler tem `banner` configurado com shebang — ambos juntos geram double shebang no output, causando SyntaxError ao executar

### A2. Testes
- Testes existentes passam sem falha
- Se não houver testes, registrar como lacuna bloqueante se o projeto tiver lógica crítica
- Cobertura mínima em código crítico (autenticação, pagamentos, regras de negócio)

### A3. Lint e Checagem de Tipos
- Lint passa sem erros (se configurado)
- Checagem de tipos passa sem erros (se aplicável)
- Se não configurados, registrar como recomendação
- Scripts declarados em `package.json` (lint, test, build, format) têm as dependências necessárias instaladas? Um script configurado sem a ferramenta instalada falha com "command not found" — nunca com "zero errors"

### A4. Configuração por Ambiente
- Configurações separadas por ambiente (dev/staging/prod)
- Debug mode desabilitado em configuração de produção
- Variáveis de ambiente documentadas ou com template (.env.example)

### A5. Dependências
- Sem vulnerabilidades CRÍTICAS em `npm audit` / `pip audit` / equivalente
- Sem dependências deprecated com vulnerabilidades conhecidas
- Dependências pinadas (sem ranges que puxem versões não testadas)

### A6. Secrets e Segurança Básica
- Nenhum secret hardcoded no código-fonte
- `.env` e arquivos de credenciais no `.gitignore`
- Sem chaves de API, tokens ou senhas expostos em manifests, configs ou logs

---

## Bloco B — Operational Readiness

Verifica se o projeto **está preparado para operar em produção com risco controlado**. Itens deste bloco são **recomendações** — falha aqui não impede entrega, mas aumenta risco operacional.

### B1. Observabilidade Mínima
- Erros tratados com contexto suficiente para diagnóstico
- Logging básico funcional em fluxos críticos
- Crash reporting ou estratégia de captura de erros definida (quando aplicável)
- Referência: `.claude/rules/observability.md`

### B2. Tratamento de Estado
- Estados de loading/erro/vazio tratados nas telas e fluxos principais
- Fonte de verdade identificável para domínios críticos
- Referência: `.claude/rules/state-management.md`

### B3. Performance Básica
- Sem gargalos óbvios (loops em main thread, listas sem paginação, requests sem timeout)
- Assets com carregamento controlado
- Referência: `.claude/rules/performance.md`

### B4. Itens Pendentes
- TODOs/FIXMEs críticos resolvidos ou documentados como débito técnico aceito
- Sem código morto ou comentado em fluxos de produção
- Breaking changes documentados

### B5. Documentação Mínima
- README com instruções de setup e execução
- Variáveis de ambiente documentadas
- Decisões técnicas relevantes documentadas (ou disponíveis via `/justify`)

---

## Formato de Saída

O output DEVE começar com um sumário da camada de sensores:

```markdown
## Camada de Sensores (Bloco 0)

- Status: [PASS | FAIL | PARTIAL | NO_SENSORS | STALE_REFRESHED]
- Fonte: `.claude/runtime/sensors-last-run.json` (run_id: <id>, finished_at: <timestamp>)
- Executados: N | Passaram: N | Falharam: N | Bloqueantes: N
- Itens do Bloco A cobertos mecanicamente: [lista: A1 build, A2 test, A3 lint+types, A5 deps-audit]
- Itens do Bloco A verificados pelo agente: [lista: A4, A6, parte de A5]
```

Se o projeto não declara sensores, substituir por:

```markdown
## Camada de Sensores (Bloco 0)

- Status: NO_SENSORS (lacuna — projeto não declara `sensors.json`)
- Impacto: Bloco A roda em modo ad-hoc (agente executa comandos sem contrato mecânico)
- Recomendação: copiar `.claude/runtime/sensors.template.json` para `sensors.json` e declarar sensores da stack
- Registrado como débito técnico no ledger
```

Depois do sumário de sensores, incluir o sumário do contrato ativo (Bloco 0.5):

```markdown
## Contrato de Execução (Bloco 0.5)

- Status: [FAILED | AT_RISK | ON_TRACK | READY_TO_CLOSE | NO_CONTRACT | DRAFT_ONLY]
- Phase: `[phase_id]`
- Title: [title]
- Deliverables required: X PASS / Y FAIL
- Sensors required: X PASS / Y FAIL / Z NOT_RUN
- Acceptance criteria: X PASS / Y MANUAL_CHECK / Z FAIL
- Regra que decidiu o veredicto: [R1-R10 conforme `/contract-check`]
- Contract file: `.claude/runtime/contracts/phase-<id>.json`
```

Se o projeto não declara contrato ativo, substituir por:

```markdown
## Contrato de Execução (Bloco 0.5)

- Status: NO_CONTRACT (lacuna — projeto não declara contrato ativo em `.claude/runtime/contracts/active.json`)
- Impacto: Gate contratual ausente. Ship-check não pode validar aderência da fase ao compromisso declarado.
- Recomendação: rodar `/contract-create` para declarar o contrato da fase corrente
- Registrado como débito contratual no ledger
```

Depois do contrato, incluir o sumário dos sprints da fase (Bloco 0.6). **Este bloco é estritamente informativo** — não afeta o veredicto do ship-check.

```markdown
## Sprints da Fase (Bloco 0.6 — informativo)

- Parent phase: `[parent_phase_id]`
- Total de sprints: N (passed: X | failed: Y | deferred: Z | in_progress: W | approved: V | draft: U)
- Sprint ativo agora: `[sprint_id]` ou "(nenhum)"
- Diretório: `.claude/runtime/contracts/sprints/[parent_phase_id]/`

| Sprint ID | Título | Status | Último verdict mecânico | Eval runs | Closed at |
|-----------|--------|--------|-------------------------|-----------|-----------|
| `sprint-01-foo` | Foo base | passed | pass | 3 | 2026-04-10T... |
| `sprint-02-bar` | Bar flow | in_progress | partial | 2 | — |
| `sprint-03-baz` | Baz polish | draft | (nenhum) | 0 | — |

> **Observação:** sprints não afetam o veredicto do ship-check. O phase contract (Bloco 0.5) é a autoridade sobre o compromisso da fase. Sprints aparecem aqui apenas para visibilidade operacional — um sprint em `failed` ou `in_progress` pode coexistir com fase pronta para entrega se o phase contract já alcançou `READY_TO_CLOSE`.
```

Se a fase não declara sprints, substituir por:

```markdown
## Sprints da Fase (Bloco 0.6 — informativo)

- Sprints: não declarados para esta fase
- Diretório `.claude/runtime/contracts/sprints/[parent_phase_id]/` ausente ou vazio
- Sprints são granularidade intra-fase opcional. A ausência é operação normal, não é débito técnico.
```

Depois dos Blocos 0, 0.5 e 0.6, para cada item dos Blocos A e B, reportar:

| Item | Status | Evidência | Classificação |
|------|--------|-----------|---------------|
| (id) | PASS / FAIL / N/A / NÃO VERIFICADO | output de sensor (`sensors-last-run.json:<sensor_id>`), output de comando ad-hoc, referência a arquivo, ou observação | Bloqueante / Recomendação / Info |

Itens cobertos por sensor DEVEM citar explicitamente o sensor id na coluna Evidência. Itens verificados ad-hoc pelo agente DEVEM citar o comando executado e o exit code.

Definição de status:
- **PASS** — item verificado com evidência suficiente e conforme
- **FAIL** — item verificado com evidência suficiente e não conforme
- **N/A** — item não se aplica à stack, arquitetura ou escopo do projeto
- **NÃO VERIFICADO** — item se aplica, mas não pôde ser confirmado com evidência disponível

### Avaliação final de risco (sempre)

Antes de publicar o veredicto final, **sempre** invocar o agent `risk-assessment` via Agent tool — esta é a última barreira antes da entrega. Diferente do `/plan`, onde a invocação é condicional, aqui é obrigatória e incondicional.

**Invocação:**
- **Objetivo:** "Avaliação final de risco arquitetural e operacional antes de entrega"
- **Contexto:** resultados do Bloco A, fase atual do ledger, Open Items abertos, mudanças recentes registradas, classes de risco aplicáveis ao projeto
- **Escopo:** apenas as 5 categorias do agent (irreversibilidade, incógnitas, ponto único de falha, débito técnico, risco de migração) — não duplicar análise de build/testes/lint/secrets (já cobertos pelo Bloco A)
- **Critérios de veredicto:** LOW_RISK | MEDIUM_RISK | HIGH_RISK | BLOCKING_RISK conforme `.claude/rules/agent-contracts.md`

**Override de model condicional:** se o projeto é financeiro, tem operações irreversíveis em produção, migração de dados em larga escala, ou tocou código de classes B/C/D da Security Regression Matrix — passar `model: opus` na invocação. Caso contrário, usar `sonnet` default.

Aplicar mapa de veredictos ao resultado final:

| Veredicto do agent | Ação no ship-check |
|---|---|
| `LOW_RISK` | Veredicto final permanece conforme Bloco A (PRONTO / PRONTO COM RESSALVAS / NÃO PRONTO) |
| `MEDIUM_RISK` | Se o Bloco A iria reportar PRONTO, rebaixar para PRONTO COM RESSALVAS e listar os riscos em DELIVERY |
| `HIGH_RISK` | Rebaixar para PRONTO COM RESSALVAS com os riscos destacados no topo do DELIVERY, independente do Bloco A |
| `BLOCKING_RISK` | Forçar veredicto NÃO PRONTO, independente do Bloco A — nenhum ship passa com BLOCKING_RISK ativo |

### Veredicto Final

Com base nos resultados, aplicar regras de rebaixamento na ordem (primeira que casa decide):

1. **NÃO PRONTO** se:
   - Qualquer bloqueante do Bloco A falhou, OU
   - `sensors-last-run.json` reporta `blocking_failures > 0`, OU
   - Contrato ativo (Bloco 0.5) está em `FAILED`, `failed`, `rolled_back` ou `deferred`, OU
   - `risk-assessment` reportou `BLOCKING_RISK`

2. **PRONTO COM RESSALVAS** se:
   - Todos os bloqueantes passam, mas há recomendações de risco significativo, OU
   - `risk-assessment` reportou `MEDIUM_RISK` ou `HIGH_RISK`, OU
   - Contrato ativo (Bloco 0.5) está em `AT_RISK` ou `ON_TRACK`, OU
   - Contrato ativo ausente (lacuna `NO_CONTRACT`) ou apenas `DRAFT_ONLY`, OU
   - `sensors.json` ausente (lacuna `NO_SENSORS`)

3. **PRONTO** se:
   - Todos os bloqueantes do Bloco A passam, E
   - `sensors-last-run.json` reporta `PASS` (ou lacuna NO_SENSORS com veredicto consciente), E
   - Contrato ativo (Bloco 0.5) está em `READY_TO_CLOSE` ou já `done`, E
   - Recomendações do Bloco B sem risco alto, E
   - `risk-assessment` em `LOW_RISK`

Incluir no output:
- Lista de bloqueantes que falharam (se houver)
- Lista de recomendações de risco alto
- Lista de itens não verificados com motivo
- Resultado do `risk-assessment` com a matriz de riscos citada
- Veredicto do contrato ativo do Bloco 0.5 com a regra que decidiu (R1–R10 do `/contract-check`)

---

## Atualização do Ledger

Ao concluir o ship-check, atualizar `.claude/runtime/execution-ledger.md`:
- Atualizar Current Status → Ship-check com o veredicto (PRONTO / PRONTO COM RESSALVAS / NÃO PRONTO)
- Registrar FAILs bloqueantes como Blockers
- Registrar FAILs não-bloqueantes como Open Items
- Registrar itens NÃO VERIFICADOS como Open Items com status PENDING
- Verificar se há fases com status PENDING ou DEFERRED no ledger que deveriam ter sido concluídas antes do ship-check
- Atualizar Last Updated em todos os itens modificados

---

## Itens Pendentes de Verificação

Após o veredicto, classificar verificações que não puderam ser executadas:

### Executáveis localmente

#### Baixo risco (read-only)
| # | Verificação pendente | Motivo da pendência | Comando sugerido |
|---|---------------------|--------------------|-----------------:|

#### Mutáveis (alteram ambiente) ⚠️
| # | Verificação pendente | Motivo da pendência | Comando sugerido | O que será alterado |
|---|---------------------|--------------------|-----------------:|--------------------:|

> Deseja que eu execute as verificações locais agora?

### Requerem ação externa

| # | Verificação pendente | O que é necessário | Como fazer (passo a passo) |
|---|---------------------|-------------------|---------------------------|

---

NÃO fazer correções automaticamente. Apenas reportar e aguardar aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada item verificado.
