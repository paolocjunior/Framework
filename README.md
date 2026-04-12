# Claude Code Quality Framework V4 + Sensores Mecânicos + Execution Contracts + Sprint Contracts + Behaviour Harness + Architecture Linters + Active Handoff + Knowledge Base

Framework de qualidade para projetos no Claude Code. Combina validação automática (hooks), auditorias sob demanda (slash commands e subagents), persistência de estado (trio de sincronização), validação cross-model (Codex adversarial review), **sensores mecânicos** (exit code como autoridade sobre correção funcional, não narrativa do agente), **execution contracts** (declaração upstream estruturada do que cada fase promete entregar, mecanicamente verificável), **sprint contracts** (granularidade intra-fase com evaluator determinístico por ciclos curtos de feedback), **behaviour/runtime harness** (verificação observável de comportamento em runtime — requisição real, arquivo real, JSON path real — com evidência estruturada expected-vs-actual), **architecture linters** (invariantes estruturais cross-file com exit code como autoridade), **active handoff operacional** (resumo estruturado de sessão em 6 seções para continuidade entre sessões) e **knowledge base system-of-record** (view consolidada e navegável do estado do projeto — architecture, quality, security, decisions — derivada de evidência acumulada, nunca fonte de verdade).

## Estrutura

```
projeto/
├── CLAUDE.md                          # Regras globais (sempre carregado pelo Claude Code)
├── AGENTS.md                          # Instruções para o Codex (sempre carregado pelo Codex CLI)
└── .claude/
    ├── settings.json                  # Configuração dos hooks
    ├── rules/                         # 30 checklists de qualidade
    │   ├── agent-contracts.md         # Protocolo de invocação e parsing de agents
    │   ├── architecture-linters.md    # Protocolo de architecture linters (invariantes cross-file)
    │   ├── behaviour-harness.md       # Protocolo de behaviour/runtime harness (expected-vs-actual)
    │   ├── code-review.md             # Critérios de revisão
    │   ├── context-loading.md         # Carregamento de contexto no início de commands
    │   ├── database-security.md       # Segurança de banco de dados
    │   ├── design-system-quality.md   # Qualidade visual
    │   ├── evidence-tracing.md        # Formato de reporte
    │   ├── execution-contracts.md     # Contratos estruturados de execução por fase (upstream)
    │   ├── execution-tracking.md      # Rastreamento de fases
    │   ├── knowledge-base.md          # Protocolo de knowledge base system-of-record
    │   ├── implementation-quality.md  # Padrões de erro em implementação
    │   ├── integration-checklist.md   # Migração mock para API real
    │   ├── kubernetes-security.md     # Segurança de Kubernetes
    │   ├── observability.md           # Logging e diagnóstico
    │   ├── performance.md             # Performance e recursos
    │   ├── plan-construction.md       # Procedimento de construção de planos
    │   ├── recommended-skills.md      # Catálogo de lacunas e skills externas
    │   ├── review-quality.md          # Self-check interno de outputs de review
    │   ├── security.md                # Segurança geral
    │   ├── self-verification.md       # Padrões de verificação
    │   ├── sensors.md                 # Protocolo de sensores mecânicos (exit code como verdade)
    │   ├── spec-creation-guide.md     # Guia de criação de especificação
    │   ├── spec-quality.md            # Prontidão de especificação
    │   ├── sprint-contracts.md        # Protocolo de sprint contracts (granularidade intra-fase)
    │   ├── state-management.md        # Gestão de estado
    │   ├── state-sync.md              # Protocolo do trio de sincronização
    │   ├── structural-quality.md      # Qualidade estrutural
    │   ├── testing.md                 # Padrões de testes
    │   └── web-api-security.md        # Segurança web e API
    ├── commands/                       # 27 slash commands
    ├── agents/                         # 8 subagents (6 especializados + 2 transversais)
    ├── hooks/                          # 11 scripts de validação automática
    └── runtime/
        ├── execution-ledger.md        # Estado oficial do projeto
        ├── pattern-registry.md        # Catálogo de padrões aprovados
        ├── spec-template.md           # Template de estrutura de especificação
        ├── project-status.template.md # Template do snapshot de memória
        ├── sensors.template.json      # Template de declaração de sensores mecânicos
        ├── sensors.json               # Declaração de sensores do projeto (criado por cópia)
        ├── sensors-last-run.json      # Veredicto estruturado da última execução (efêmero)
        ├── behaviours.template.json   # Template de declaração de behaviours/runtime harness
        ├── behaviours.json            # Declaração de behaviours do projeto (criado por cópia)
        ├── behaviours-last-run.json   # Veredicto estruturado expected-vs-actual (efêmero)
        ├── architecture-linters.template.json # Template de architecture linters
        ├── architecture-linters.json  # Declaração de linters do projeto (criado por cópia)
        ├── architecture-linters-last-run.json # Veredicto estruturado (efêmero)
        ├── contracts.template.json    # Template de contrato de execução por fase
        ├── contracts/                 # Contratos estruturados por fase
        │   ├── active.json            # Ponteiro para contrato da fase ativa
        │   ├── active-sprint.json     # Ponteiro para sprint contract ativo
        │   ├── phase-<id>.json        # Um arquivo por fase (criado por /contract-create)
        │   └── sprints/               # Sprint contracts (granularidade intra-fase)
        │       └── <parent_phase_id>/ # Um diretório por fase; vínculo é filesystem-based
        │           └── <sprint_id>.json # Um arquivo por sprint (criado por /sprint-create)
        ├── knowledge/                 # Knowledge base (view consolidada)
        │   ├── knowledge-index.json   # Índice estruturado (staleness, hashes, fontes)
        │   ├── architecture.md        # Mapa arquitetural (gerado por /kb-update)
        │   ├── quality-posture.md     # Postura de qualidade (gerado por /kb-update)
        │   ├── security-posture.md    # Postura de segurança (gerado por /kb-update)
        │   └── decisions-log.md       # Log de decisões (gerado por /kb-update)
        ├── knowledge.template/        # Templates skeleton dos documentos KB
        │   ├── architecture.md
        │   ├── quality-posture.md
        │   ├── security-posture.md
        │   └── decisions-log.md
        ├── baseline-feedbacks/        # Templates de feedbacks comportamentais
        └── session-summaries/         # Resumos de sessão (gerados automaticamente)
```

## Instalação

### 1. Instalar no projeto

1. Copiar `CLAUDE.md`, `AGENTS.md` e a pasta `.claude` para a raiz do projeto
2. Editar o `AGENTS.md` preenchendo a seção "Contexto do Projeto"

### 2. Requisito: jq

```cmd
winget install jqlang.jq
```

### 3. Setup do Codex (Camada 4)

```bash
npm install -g @openai/codex        # Instalar Codex CLI
codex login                          # Autenticar com OpenAI
```

No Claude Code do projeto:
```
/install-plugin openai/codex-plugin-cc
/reload-plugins
```

## Modelo de 4 Camadas

| Camada | Mecanismo | Proteção |
|--------|-----------|----------|
| 1 — Regras | CLAUDE.md + 30 rules | Direção e padrões |
| 2 — Hooks | 11 scripts automáticos | Erros objetivos (secrets, syntax, gate de implementação) |
| 3 — Memória | Feedbacks comportamentais | Erros de julgamento |
| 4 — Cross-model | Codex adversarial review | Blind spots da IA principal |

Todos os hooks rodam sempre. Não existe modo reduzido.

### Camada de Sensores Mecânicos (ortogonal às 4 camadas)

Sensores declarativos com veredicto por **exit code**, não por narrativa do agente. Projetos declaram em `.claude/runtime/sensors.json` quais comandos (test, lint, type-check, build, audit) servem como verificação autoritativa. `/sensors-run` executa e persiste veredicto estruturado em `sensors-last-run.json`, consumido por `/ship-check` (gate do Bloco A) e `/verify-spec` (evidência mecânica de comportamento).

Princípio: **se o comando retorna 0, o sensor passou — nenhum agente pode reinterpretar.** Ver `.claude/rules/sensors.md` para o contrato completo.

## Hooks (Camada 2)

| Hook | Evento | Propósito |
|------|--------|-----------|
| `health-check.sh` | SessionStart | Valida ambiente (jq, estrutura, permissões) |
| `protect-files.sh` | PreToolUse (Edit/Write) | Bloqueia edição de lockfiles e `.git` |
| `pre-implementation-gate.sh` | PreToolUse (Edit/Write) | Bloqueia código-fonte sem `/plan-review` aprovado |
| `syntax-check.sh` | PostToolUse (Edit/Write) | Validação de sintaxe |
| `security-check.sh` | PostToolUse (Edit/Write) | Detecção de secrets e padrões inseguros |
| `quality-check.sh` | PostToolUse (Edit/Write) | Verificações de qualidade objetivas |
| `design-check.sh` | PostToolUse (Edit/Write) | Design tokens, hex hardcoded |
| `mock-determinism.sh` | PostToolUse (Edit/Write) | Determinismo em dados mockados |
| `loop-detection.sh` | PostToolUse (Edit/Write) | Detecção de loops de correção |
| `session-summary.sh` | Stop | Gera resumo da sessão |
| `session-cleanup.sh` | SessionEnd | Cleanup de temporários |

## Commands

| Comando | O que faz |
|---------|-----------|
| `/spec-create` | Criar spec do zero (workflow interativo) |
| `/spec-check` | Validar spec antes de planejar |
| `/ui-plan` | Planejar telas e navegação |
| `/design-preview` | Gerar opções de Design System |
| `/plan` | Criar plano de implementação |
| `/plan-review` | Verificar plano antes de codar |
| `/review` | Revisar qualidade do código |
| `/audit` | Auditoria geral de segurança |
| `/web-audit` | Segurança web e API |
| `/db-audit` | Segurança de banco de dados |
| `/k8s-audit` | Segurança de Kubernetes |
| `/justify` | Documentar decisões técnicas |
| `/verify-spec` | Verificar código contra spec |
| `/ship-check` | Gate final pré-entrega |
| `/status-check` | Estado atual do projeto |
| `/memory-consolidate` | Consolidar memória (ledger + feedbacks) |
| `/skills-gap` | Identificar lacunas e sugerir skills |
| `/sensors-run` | Executar sensores mecânicos e produzir veredicto por exit code |
| `/contract-create` | Criar contrato estruturado de execução a partir do plano aprovado |
| `/contract-check` | Verificar estado do projeto contra contrato ativo (read-only, veredicto R1-R10) |
| `/sprint-create` | Criar sprint contract (granularidade intra-fase) com evaluator declarativo |
| `/sprint-evaluate` | Executar evaluator do sprint ativo e registrar verdict append-only em `evaluation_history` |
| `/sprint-close` | Fechar sprint com transição human-confirmed para `passed \| failed \| deferred` |
| `/behaviour-run` | Executar behaviours declarados e produzir veredicto estruturado expected-vs-actual |
| `/lint-architecture` | Executar architecture linters e produzir veredicto estruturado por exit code |
| `/kb-update` | Gerar ou atualizar documentos da knowledge base a partir de evidência acumulada |
| `/kb-status` | Verificar estado da knowledge base (existência, staleness, lacunas) — read-only |

## Subagents

Taxonomia formal (ver `CLAUDE.md` seção Subagents):

- **Especializado**: papel específico em 1 command ou família coesa de commands.
- **Transversal**: aplica-se a múltiplos commands em domínios não relacionados.

| Agent | Tipo | Invocado por | Model |
|-------|------|-------------|-------|
| `planner` | Especializado | `/plan` | opus |
| `code-reviewer` | Especializado | `/review` | opus |
| `security-auditor` | Especializado | `/audit`, `/web-audit`, `/db-audit`, `/k8s-audit` | opus |
| `spec-creator` | Especializado | `/spec-create` | opus |
| `spec-plan-validator` | Especializado | `/plan-review` | opus |
| `consistency-checker` | Especializado | `/plan-review` | opus |
| `risk-assessment` | Transversal | `/plan` (condicional), `/ship-check` (sempre) | sonnet + override opus |
| `qa-auditor` | Especializado | `/review` (quando há código de produção) | sonnet + override opus |

## Novidades da V4

Expansão puramente aditiva sobre V3 (nada foi removido ou quebrado):

- **3 rules novas**: `context-loading.md`, `review-quality.md`, `agent-contracts.md`
- **2 agents novos**: `risk-assessment` (transversal), `qa-auditor` (especializado)
- **1 hook novo**: `pre-implementation-gate.sh` (bloqueia código-fonte sem `/plan-review` aprovado via marker `.claude/runtime/.plan-approved`)
- **Taxonomia formal de agents**: transversal × especializado
- **Política de model explícita**: `opus` por default para síntese profunda; `sonnet` default + `opus` via override para análise estrutural
- **Self-check interno de review** obrigatório antes de publicar veredicto
- **Protocolo padronizado de contratos** de agents (formato de input, output, modos de falha, paralelismo × sequencial)
- **Correções técnicas** em hooks (path normalization Windows, jq guards, Stop hook payload, session-cleanup timeout)

## Pós-V4 — Camada de Sensores Mecânicos

Resposta direta à análise de Harness Engineering (Fowler + Anthropic + OpenAI) que identificou a lacuna central: **o agente narra, o ambiente não confirma**. Com sensores, o ambiente é quem diz.

- **1 rule nova**: `sensors.md` — contrato completo de sensores mecânicos (exit code como autoridade)
- **1 command novo**: `/sensors-run` — executa sensores declarados e produz veredicto estruturado
- **2 artefatos novos em runtime**: `sensors.template.json` (bootstrap) e `sensors-last-run.json` (veredicto efêmero)
- **2 commands modificados**:
  - `/ship-check` — novo **Bloco 0** consome `sensors-last-run.json`. `blocking_failures > 0` força `NÃO PRONTO` incondicionalmente
  - `/verify-spec` — Passo 4 reescrito: verificações dinâmicas vêm de sensores, não de execução ad-hoc. Sensor de teste `fail` rebaixa cenário marcado como IMPLEMENTADO
- **1 hook corrigido**: `loop-detection.sh` — 5ª edição do mesmo arquivo agora emite `{decision: "block"}` (PostToolUse bloqueante) em vez de apenas mensagem de alerta, fechando a contradição entre promessa semântica e comportamento real

**Princípio:** hooks e sensores coexistem sem sobreposição. Hooks rodam em evento (universais, baixo custo). Sensores rodam sob demanda (declarativos por projeto, médio a alto custo). As duas camadas são complementares.

## Pós-V4 — Execution Contracts (upstream)

Terceiro item da fila de prioridades derivada da análise de Harness Engineering. Sensores fecharam a lacuna "o ambiente não confirma"; contratos fecham a lacuna complementar **"a fase não declara upstream o que está prometendo entregar"** em formato estruturado e mecanicamente verificável.

O contrato é a declaração upstream do que a fase promete. O plano continua sendo a prosa de COMO implementar. O ledger continua sendo o histórico. Os sensores continuam sendo a validação mecânica de comportamento. Contratos somam-se a esses três como a **declaração estruturada do escopo comprometido**.

- **1 rule nova**: `execution-contracts.md` — schema JSON completo, lifecycle (`draft → approved → in_progress → done/failed/rolled_back/deferred`), `verifiable_by` mecânico (file_exists, grep_pattern, sensor, manual_check), integração com sensores como autoridade
- **2 commands novos**:
  - `/contract-create` — cria contrato a partir do plano aprovado; exige segunda confirmação explícita para transicionar draft → approved
  - `/contract-check` — verificação **read-only absoluta** do estado do projeto contra o contrato ativo; veredicto determinístico via tabela R1-R10 (FAILED → AT_RISK → ON_TRACK → READY_TO_CLOSE)
- **3 artefatos novos em runtime**: `contracts.template.json`, `contracts/` (um JSON por fase), `contracts/active.json` (ponteiro)
- **2 commands modificados**:
  - `/ship-check` — novo **Bloco 0.5** consome contrato ativo. `FAILED` do contract-check força `NÃO PRONTO` incondicional; `AT_RISK` força `PRONTO COM RESSALVAS`
  - `/verify-spec` — novo **Passo 4.5** cruza deliverables do contrato com entregas da spec. Entrega mapeada a deliverable `required` com status `MISSING`/`FAIL` é **rebaixada** — o contrato é autoridade sobre compromisso da fase

**Princípio:** contrato (O QUE), plano (COMO), ledger (O QUE ACONTECEU) e sensores (SE ESTÁ FUNCIONANDO) são artefatos complementares sem sobreposição. Opt-in pattern mesmo dos sensores: projetos sem `contracts/` declarados operam em modo degradado (NO_CONTRACT como lacuna, não bloqueio).

## Pós-V4 — Sprint Contracts (granularidade intra-fase)

Quarto item da fila de prioridades derivada da análise de Harness Engineering. Enquanto o phase contract declara o compromisso da fase em escala de dias/semanas, o sprint contract declara entregas atômicas em escala de horas, com bateria de checks determinística que produz verdict `pass | fail | partial` a cada execução. Fecha o ciclo curto de feedback dentro de uma fase longa.

- **1 rule nova**: `sprint-contracts.md` — schema completo do sprint contract, lifecycle (`draft → approved → in_progress → passed/failed/deferred`), 4 tipos de check (`file_exists`, `grep_pattern`, `sensor_subset`, `custom_command`), hardening obrigatório de `custom_command`, regras de agregação `all | threshold`
- **3 commands novos**:
  - `/sprint-create` — cria sprint contract a partir de conversa com o usuário; exige segunda confirmação para transicionar `draft → approved`
  - `/sprint-evaluate` — executa evaluator do sprint ativo e registra verdict **append-only** em `evaluation_history`. Não transiciona status (transição é sempre humana via `/sprint-close`)
  - `/sprint-close` — único command que fecha sprint. Exige confirmação humana explícita; `verdict_reason` obrigatório para `failed` e `deferred`
- **2 artefatos novos em runtime**: `contracts/sprints/<parent_phase_id>/<sprint_id>.json` (um por sprint) e `contracts/active-sprint.json` (ponteiro independente do phase pointer)
- **2 commands modificados** (integração **informativa, não bloqueante**):
  - `/contract-check` — novo passo informativo lista sprints da fase no output (contagem por status, último verdict mecânico). Sprints não afetam o veredicto R1-R10 do contract-check
  - `/ship-check` — novo **Bloco 0.6** lista sprints da fase ativa. Sprints são visibilidade operacional, não gate — o phase contract (Bloco 0.5) permanece autoridade sobre compromisso da fase

**Princípio:** phase contract é imutável. O vínculo fase → sprints é **derivado do filesystem** (`contracts/sprints/<parent_phase_id>/`), não registrado no phase contract. Sprints são opt-in: projetos que preferem operar apenas com phase contracts ignoram a camada. Quando usados, sprint contract fechado é imutável — reabertura exige criar sprint novo (`sprint-01b-v2`), nunca editar o fechado. `evaluation_history` é append-only por design.

## Pós-V4 — Behaviour/Runtime Harness

Quinto item da fila de prioridades derivada da análise de Harness Engineering. Sensores fecharam "o ambiente não confirma correção funcional"; contratos fecharam "a fase não declara upstream o que promete"; sprints fecharam "ciclo curto de feedback intra-fase"; behaviours fecham a lacuna complementar **"análise estática e sensores funcionais passam, mas o comportamento runtime observável falha"**. Um sensor responde "o código compila, os testes passam, o lint passa?" — um behaviour responde "o endpoint `/api/login` retorna 200 com cookie `session=` quando POST com credenciais válidas?".

Enquanto sensores medem correção funcional por exit code de test/lint/build/audit, behaviours medem comportamento observável por **comparação estruturada expected-vs-actual** — despacham uma ação declarada (HTTP, CLI, inspeção de estado) contra o sistema rodando e comparam stdout, exit code, conteúdo de arquivo e JSON paths contra expectativas explícitas. O veredicto vem da comparação mecânica, nunca da interpretação do agente.

- **1 rule nova**: `behaviour-harness.md` — schema completo (6 tipos de expectation: `exit_code`, `stdout_contains`, `stdout_json_path`, `file_content`, `file_exists_after`, `not_contains`), hardening obrigatório de `action.command` (timeout obrigatório, read-only por contrato, sem rede por default, exit code capturado), staleness policy como first-class rule (3 critérios, nunca tratada como PASS), bidirectional binding contract_ref ↔ behaviour_id
- **1 command novo**: `/behaviour-run` — executa behaviours declarados e produz veredicto estruturado expected-vs-actual. Suporta flags `--offline`, `--only <id>`, `--skip <id>`, `--contract-ref <AC>`
- **3 artefatos novos em runtime**: `behaviours.template.json` (bootstrap com 5 exemplos), `behaviours.json` (declaração por projeto), `behaviours-last-run.json` (veredicto estruturado efêmero)
- **1 rule modificada**: `execution-contracts.md` — expansão aditiva de `acceptance_criteria[].verifiable_by` para aceitar `"behaviour"`, com 5 regras de bidirectional binding (AC → behaviour via `behaviour_id`; behaviour → AC via `contract_ref`; binding gap detectado como lacuna informativa)
- **3 commands modificados** (consumers **read-only absolutos** — nunca invocam `/behaviour-run`):
  - `/contract-check` — novo **Passo 7.6** valida behaviours contra AC com `verifiable_by: "behaviour"`; novas regras R2.1/R5.1/R6.1 estendem a tabela R1-R10 deterministic verdict para tratar behaviour `fail` como FAILED, `stale`/`unknown` como AT_RISK, `NEVER_RUN` como ON_TRACK
  - `/ship-check` — novo **Bloco 0.7** consome `behaviours-last-run.json` como gate paralelo ao Bloco 0 (sensores). `blocking_failures > 0` força `NÃO PRONTO` incondicionalmente — mesmo com sensores verdes, contrato OK e risk-assessment LOW_RISK
  - `/verify-spec` — novo **Passo 4.6** cruza behaviours com cenários da spec. Cenário `IMPLEMENTADO` por análise estática é **rebaixado** se behaviour com `on_fail: block` está em `fail`; cenário `NÃO VERIFICÁVEL` é **promovido** para `COBERTO` se behaviour `pass` fornece evidência runtime

**Princípios:**

1. **Autoridade runtime paralela.** Sensores (correção funcional estática) e behaviours (comportamento runtime observável) são gates independentes. Nenhum mascara o outro — cada um tem veredicto próprio, e qualquer um pode forçar `NÃO PRONTO` por si só.
2. **Expected-vs-actual é contrato mecânico.** O agente nunca diz "a resposta parece correta". A comparação entre `expected` (declarado) e `actual` (observado) é feita pelo executor, não narrada pelo agente.
3. **Staleness nunca é PASS.** `behaviours.json` modificado após o run, contrato aprovado/modificado após o run, ou behaviour `enabled: true` ausente de `results[]` → stale. Consumers reportam staleness, rebaixam cenários, mas **nunca** re-executam `/behaviour-run` automaticamente.
4. **Consumers read-only absolutos.** `/contract-check`, `/ship-check` e `/verify-spec` leem `behaviours-last-run.json`, nunca invocam `/behaviour-run`. Execução é responsabilidade explícita do usuário — preserva determinismo e evita loops de execução acoplados.
5. **Bidirectional binding mandatório.** AC com `verifiable_by: "behaviour"` exige `behaviour_id`; behaviour que satisfaz AC exige `contract_ref`. As duas pontas devem existir — binding gap (só um lado declarado) é lacuna informativa detectada pelos consumers.
6. **Opt-in pattern.** Projetos sem `behaviours.json` operam em modo degradado (NO_BEHAVIOURS como lacuna informativa, não bloqueio). Declaração é responsabilidade do projeto, não inferida pelo framework.

## Pós-V4 — Architecture Linters

Sétimo item da fila de prioridades. Sensores cobrem correção funcional estática (exit code de test/lint/type-check/build). Behaviours cobrem comportamento runtime observável. Architecture linters fecham a lacuna complementar: **"invariantes estruturais cross-file não têm verificação declarativa"**. Um architecture linter é um comando shell que verifica um invariante arquitetural (layering, dependências circulares, convenções de naming, alinhamento type-schema) — exit code 0 = pass, qualquer outro = fail.

- **1 rule nova**: `architecture-linters.md` — contrato completo (6 categorias: layering, circular-deps, cross-file, naming, type-schema-match, custom), hardening obrigatório de `command`, semântica dual severity vs obrigação contratual, staleness com aproximação por scope
- **1 command novo**: `/lint-architecture` — executor único dos architecture linters declarados, com flags `--offline`, `--only <id>`, `--skip <id>`, `--phase <phase_id>`
- **3 artefatos novos em runtime**: `architecture-linters.template.json` (bootstrap com 3 exemplos), `architecture-linters.json` (declaração por projeto), `architecture-linters-last-run.json` (veredicto estruturado efêmero)
- **1 rule modificada**: `execution-contracts.md` — novo campo opcional `architecture_linters_required[]` no phase contract
- **2 commands modificados** (consumers **read-only absolutos**):
  - `/ship-check` — novo **Bloco 0.8** consome `architecture-linters-last-run.json`. `blocking_failures > 0` força `NÃO PRONTO`
  - `/contract-check` — novo **Passo 7.7** valida linters listados em `architecture_linters_required[]`. Semântica dual: `severity` governa ship-check, presença no array contratual governa contract-check

**Princípio:** sensores (correção funcional), behaviours (runtime observável) e architecture linters (invariantes estruturais) são **3 camadas independentes** com gates independentes. Nenhuma mascara as outras.

## Pós-V4 — Active Handoff Operacional

Sexto item da fila de prioridades. Corrige lacuna operacional entre sessões: o hook `session-summary.sh` passou de resumo narrativo (truncava `last_assistant_message` em 500 chars) para **handoff operacional estruturado em 6 seções** que responde perguntas concretas de continuidade (onde estamos / o que está ativo / o que acabou de acontecer / o que falta fazer / o que bloqueia / fonte de verdade).

- **1 hook reescrito**: `session-summary.sh` — handoff em 6 seções com fontes citadas, ISO-8601 UTC, sem dependência de `last_assistant_message`
- **1 artefato novo**: `contracts/active.json` — ponteiro null-safe da fase ativa (bootstrap com null)
- **1 command modificado**: `/status-check` — referencia novo formato de 6 seções

**Princípio:** handoff é **view derivada**, nunca fonte de verdade. Subordinado ao trio (ledger + snapshot + MEMORY.md). Regravado a cada Stop, não editável manualmente.

## Pós-V4 — Knowledge Base System-of-Record

Oitavo item da fila de prioridades derivada da análise de Harness Engineering. O framework gera evidência em 7+ camadas (hooks, sensores, contratos, sprints, behaviours, linters, handoff), mas nenhum artefato consolida essa informação em **conhecimento navegável do projeto**. A knowledge base fecha essa lacuna: 4 documentos derivados que sintetizam o estado do projeto em mapa navegável — architecture, quality-posture, security-posture, decisions-log.

- **1 rule nova**: `knowledge-base.md` — protocolo completo (7 princípios, 4 tipos de documento, schema do knowledge-index.json, política de staleness com 3 critérios, 9 vedações, bootstrap)
- **2 commands novos**:
  - `/kb-update` — único escritor da KB. Lê artefatos-fonte (ledger, contratos, sensores, behaviours, linters, pattern-registry), sintetiza 4 documentos, aplica anti-churn por hash SHA-256 (só persiste quando conteúdo semântico muda), inclui header de rastreabilidade obrigatório
  - `/kb-status` — read-only absoluto. Avalia existência, staleness e inconsistências entre index e filesystem
- **6 artefatos novos em runtime**: `knowledge-index.json` (índice estruturado null-safe), 4 templates skeleton em `knowledge.template/`, diretório `knowledge/` para documentos gerados
- **2 commands modificados** (integração **informativa, nunca gate**):
  - `/status-check` — nova seção "Knowledge Base" com tabela de estado dos 4 documentos
  - `/ship-check` — novo **Bloco 0.9** (informativo, não-gate) apresenta estado da KB sem afetar veredicto

**Princípios:**

1. **View derivada, nunca fonte de verdade.** Em caso de divergência entre KB e fontes, as fontes prevalecem e o `/kb-update` deve ser re-executado.
2. **Mapa, não atlas.** Cada documento ~50-150 linhas. Documentos que ultrapassam ~200 linhas devem ser refatorados.
3. **Anti-churn obrigatório.** Só persiste quando conteúdo semântico muda (hash diff). Previne diffs inúteis no Git.
4. **Header de rastreabilidade obrigatório.** Todo documento gerado inclui `Derived from`, `Authority`, `Last semantic update`.
5. **Não é gate.** KB é ferramenta de navegação e contexto. Nenhum veredicto de nenhum command depende da knowledge base.
6. **Opt-in pattern.** Projetos sem KB operam normalmente. Consumers reportam ausência como lacuna informativa.

Para o changelog completo, ver seção `## Changelog` no `CLAUDE.md`.
