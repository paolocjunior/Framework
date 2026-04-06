# Claude Code Quality Framework V3

Framework de qualidade para projetos no Claude Code. Combina validação automática (hooks), auditorias sob demanda (slash commands e subagents), persistência de estado (trio de sincronização) e validação cross-model (Codex adversarial review).

## Estrutura

```
projeto/
├── CLAUDE.md                          # Regras globais (sempre carregado pelo Claude Code)
├── AGENTS.md                          # Instruções para o Codex (sempre carregado pelo Codex CLI)
└── .claude/
    ├── settings.json                  # Configuração dos hooks
    ├── rules/                         # 21 checklists de qualidade
    │   ├── security.md                # Segurança geral
    │   ├── testing.md                 # Padrões de testes
    │   ├── code-review.md             # Critérios de revisão
    │   ├── structural-quality.md      # Qualidade estrutural
    │   ├── state-management.md        # Gestão de estado
    │   ├── observability.md           # Logging e diagnóstico
    │   ├── performance.md             # Performance e recursos
    │   ├── database-security.md       # Segurança de banco de dados
    │   ├── kubernetes-security.md     # Segurança de Kubernetes
    │   ├── web-api-security.md        # Segurança web e API
    │   ├── self-verification.md       # Padrões de verificação
    │   ├── evidence-tracing.md        # Formato de reporte
    │   ├── spec-quality.md            # Prontidão de especificação
    │   ├── design-system-quality.md   # Qualidade visual
    │   ├── execution-tracking.md      # Rastreamento de fases
    │   ├── state-sync.md              # Protocolo do trio de sincronização
    │   ├── implementation-quality.md  # Padrões de erro em implementação
    │   ├── plan-construction.md       # Procedimento de construção de planos
    │   ├── integration-checklist.md   # Migração mock para API real
    │   ├── spec-creation-guide.md     # Guia de criação de especificação
    │   └── recommended-skills.md      # Catálogo de lacunas e skills externas
    ├── commands/                       # 17 slash commands
    ├── agents/                         # 6 subagents especializados
    ├── hooks/                          # 10 scripts de validação automática
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
| 1 — Regras | CLAUDE.md + 21 rules | Direção e padrões |
| 2 — Hooks | 10 scripts automáticos | Erros objetivos (secrets, syntax) |
| 3 — Memória | Feedbacks comportamentais | Erros de julgamento |
| 4 — Cross-model | Codex adversarial review | Blind spots da IA principal |

Todos os hooks rodam sempre. Não existe modo reduzido.

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

| Agent | Função |
|-------|--------|
| `security-auditor` | Análise de vulnerabilidades |
| `code-reviewer` | Revisão de qualidade e padrões |
| `planner` | Planejamento de implementação |
| `spec-plan-validator` | Cruza plano com spec |
| `consistency-checker` | Coerência interna do plano |
| `spec-creator` | Questionamento e estruturação de spec |
