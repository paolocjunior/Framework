# Claude Code Quality Framework V4 + Sensores Mecânicos

Framework de qualidade para projetos no Claude Code. Combina validação automática (hooks), auditorias sob demanda (slash commands e subagents), persistência de estado (trio de sincronização), validação cross-model (Codex adversarial review) e **sensores mecânicos** (exit code como autoridade sobre comportamento, não narrativa do agente).

## Estrutura

```
projeto/
├── CLAUDE.md                          # Regras globais (sempre carregado pelo Claude Code)
├── AGENTS.md                          # Instruções para o Codex (sempre carregado pelo Codex CLI)
└── .claude/
    ├── settings.json                  # Configuração dos hooks
    ├── rules/                         # 25 checklists de qualidade
    │   ├── agent-contracts.md         # Protocolo de invocação e parsing de agents
    │   ├── code-review.md             # Critérios de revisão
    │   ├── context-loading.md         # Carregamento de contexto no início de commands
    │   ├── database-security.md       # Segurança de banco de dados
    │   ├── design-system-quality.md   # Qualidade visual
    │   ├── evidence-tracing.md        # Formato de reporte
    │   ├── execution-tracking.md      # Rastreamento de fases
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
    │   ├── state-management.md        # Gestão de estado
    │   ├── state-sync.md              # Protocolo do trio de sincronização
    │   ├── structural-quality.md      # Qualidade estrutural
    │   ├── testing.md                 # Padrões de testes
    │   └── web-api-security.md        # Segurança web e API
    ├── commands/                       # 18 slash commands
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
| 1 — Regras | CLAUDE.md + 25 rules | Direção e padrões |
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

Para o changelog completo, ver seção `## Changelog` no `CLAUDE.md`.
