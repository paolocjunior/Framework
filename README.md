# Claude Code Quality Framework V4

Framework de qualidade para projetos no Claude Code. Combina validação automática (hooks), auditorias sob demanda (slash commands e subagents), persistência de estado (trio de sincronização) e validação cross-model (Codex adversarial review).

## Estrutura

```
projeto/
├── CLAUDE.md                          # Regras globais (sempre carregado pelo Claude Code)
├── AGENTS.md                          # Instruções para o Codex (sempre carregado pelo Codex CLI)
└── .claude/
    ├── settings.json                  # Configuração dos hooks
    ├── rules/                         # 24 checklists de qualidade
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
    │   ├── spec-creation-guide.md     # Guia de criação de especificação
    │   ├── spec-quality.md            # Prontidão de especificação
    │   ├── state-management.md        # Gestão de estado
    │   ├── state-sync.md              # Protocolo do trio de sincronização
    │   ├── structural-quality.md      # Qualidade estrutural
    │   ├── testing.md                 # Padrões de testes
    │   └── web-api-security.md        # Segurança web e API
    ├── commands/                       # 17 slash commands
    ├── agents/                         # 8 subagents (6 especializados + 2 transversais)
    ├── hooks/                          # 11 scripts de validação automática
    └── runtime/
        ├── execution-ledger.md        # Estado oficial do projeto
        ├── pattern-registry.md        # Catálogo de padrões aprovados
        ├── spec-template.md           # Template de estrutura de especificação
        ├── project-status.template.md # Template do snapshot de memória
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
| 1 — Regras | CLAUDE.md + 24 rules | Direção e padrões |
| 2 — Hooks | 11 scripts automáticos | Erros objetivos (secrets, syntax, gate de implementação) |
| 3 — Memória | Feedbacks comportamentais | Erros de julgamento |
| 4 — Cross-model | Codex adversarial review | Blind spots da IA principal |

Todos os hooks rodam sempre. Não existe modo reduzido.

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

Para o changelog completo, ver seção `## Changelog` no `CLAUDE.md`.
