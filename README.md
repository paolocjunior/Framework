# Claude Code Quality Framework

Framework de qualidade para projetos no Claude Code. Combina validação automática leve (hooks) com auditorias pesadas sob demanda (slash commands e subagents).

## Estrutura

```
projeto/
├── CLAUDE.md                          # Regras globais (sempre carregado)
└── .claude/
    ├── settings.json                  # Configuração dos hooks
    ├── rules/
    │   ├── security.md                # Checklist de segurança geral
    │   ├── testing.md                 # Padrões de testes
    │   ├── code-review.md             # Critérios de revisão
    │   ├── structural-quality.md      # Qualidade estrutural e modularização
    │   ├── state-management.md        # Gestão de estado e fonte de verdade
    │   ├── observability.md           # Logging, diagnóstico e crash reporting
    │   ├── performance.md             # Performance e uso de recursos
    │   ├── database-security.md       # Checklist de segurança de banco de dados
    │   ├── kubernetes-security.md     # Checklist de segurança de Kubernetes
    │   ├── web-api-security.md        # Checklist de segurança web e API
    │   ├── self-verification.md       # Padrões de verificação e evidência
    │   ├── spec-quality.md            # Prontidão de especificação
    │   ├── design-system-quality.md   # Qualidade visual e Design System
    │   ├── execution-tracking.md      # Rastreamento de fases e pendências
    │   ├── evidence-tracing.md        # Formato de reporte e rastreabilidade
    │   ├── implementation-quality.md  # Padrões de erro recorrentes em implementação
    │   └── plan-construction.md       # Procedimento de construção de planos (self-check do /plan)
    ├── commands/
    │   ├── audit.md                   # /audit — auditoria de segurança
    │   ├── review.md                  # /review — revisão de código
    │   ├── plan.md                    # /plan — plano antes de codar
    │   ├── justify.md                 # /justify — justificativas técnicas
    │   ├── db-audit.md                # /db-audit — auditoria de banco de dados
    │   ├── k8s-audit.md               # /k8s-audit — auditoria de Kubernetes
    │   ├── web-audit.md               # /web-audit — auditoria web e API
    │   ├── ship-check.md             # /ship-check — verificação pré-entrega
    │   ├── spec-check.md             # /spec-check — verificação de prontidão da spec
    │   ├── ui-plan.md                # /ui-plan — checkpoint visual de UI
    │   ├── design-preview.md         # /design-preview — opções visuais de Design System
    │   └── status-check.md          # /status-check — estado do projeto e pendências
    ├── agents/
    │   ├── security-auditor.md        # Subagent de segurança
    │   ├── code-reviewer.md           # Subagent de revisão
    │   └── planner.md                 # Subagent de planejamento
    ├── hooks/
    │   ├── post-edit-check.sh         # Validação leve após cada edição
    │   ├── protect-files.sh           # Proteção de arquivos sensíveis
    │   └── loop-detection.sh          # Detecção de edição repetitiva
    └── runtime/
        └── execution-ledger.md        # Estado vivo do projeto (fases, pendências, aprovações)
```

## Instalação

### Como instalar em um projeto novo

1. Abra `C:\Github\Framework\claude-code-quality-framework\`
2. Selecione `CLAUDE.md` e a pasta `.claude`
3. Copie (Ctrl+C)
4. Abra a pasta do projeto novo
5. Cole (Ctrl+V)

Obs: a pasta `.claude` começa com ponto e pode estar oculta. Pressione Ctrl+H no Explorer para mostrar itens ocultos.

### Requisito: jq (instalar uma única vez)

```cmd
winget install jqlang.jq
```

Após instalar, feche e reabra o CMD para o comando ficar disponível.

## Como Funciona

### Automático (hooks — sempre ativo)

Após cada edição de arquivo, o hook `post-edit-check.sh` verifica automaticamente:
- Erros de sintaxe Python
- Secrets hardcoded (senhas, tokens, API keys)
- Uso de eval(), exec() e Function() (Python e JS/TS)
- TODOs/FIXMEs pendentes

Os alertas são emitidos via JSON `systemMessage`, garantindo visibilidade
ao Claude e ao usuário no fluxo normal (sem precisar de modo verbose).

O hook `protect-files.sh` bloqueia edição acidental em:
- Todos os arquivos .env* (.env, .env.local, .env.production, .env.development, .env.staging, .env.test, .env.secrets, e qualquer outra variante)
- Lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml)
- Diretório .git/

O hook `loop-detection.sh` monitora edições repetitivas:
- Se o mesmo arquivo for editado 8+ vezes na sessão, injeta aviso sugerindo reavaliação
- Não bloqueia — apenas sugere replanejamento via /plan
- Tratado como heurística (edição repetida pode ser legítima)

**Importante:** Os hooks fazem verificações básicas de sintaxe e segurança.
Passar nos hooks NÃO é prova de correção — auditorias via commands e subagents
são necessárias para validação profunda. Linters (ruff, eslint, etc.) e testes
automatizados devem ser configurados na Camada 2 (por projeto).

### Sob Demanda (slash commands)

| Comando     | O que faz                                           |
|-------------|-----------------------------------------------------|
| `/audit`    | Auditoria completa de segurança                     |
| `/review`   | Revisão de código com checklist senior               |
| `/plan`     | Plano de implementação antes de codar                |
| `/justify`  | Documentar justificativas das decisões técnicas      |
| `/db-audit` | Auditoria de segurança focada em banco de dados       |
| `/k8s-audit`| Auditoria de segurança focada em Kubernetes            |
| `/web-audit`| Auditoria de segurança focada em web e API             |
| `/ship-check`| Verificação pré-entrega antes de distribuição ou deploy |
| `/spec-check`| Verificação de prontidão da especificação antes de implementar |
| `/ui-plan`   | Planejamento e checkpoint visual de UI antes da implementação funcional |
| `/design-preview`| Gerar opções visuais de Design System para aprovação |
| `/status-check`| Verificar estado atual do projeto, fases pendentes e bloqueios |

### Subagents (delegação automática ou explícita)

O Claude Code delega tarefas automaticamente para o subagent adequado
ou você pode invocar explicitamente:

- "Use o security-auditor para verificar este módulo"
- "Peça ao planner para planejar esta feature"
- "Envie para o code-reviewer analisar estas mudanças"

## Personalização por Projeto (Camada 2)

Para regras específicas de um projeto, crie ou edite o `CLAUDE.md` na raiz
daquele projeto adicionando instruções que complementam (não substituem) este framework.

Exemplo para um projeto Python + FastAPI:

```markdown
# CLAUDE.md (projeto específico)

## Stack
- Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL

## Comandos
- `uvicorn app.main:app --reload` — servidor dev
- `pytest -v` — rodar testes
- `alembic upgrade head` — aplicar migrations
- `ruff check .` — linter

## Padrões do Projeto
- Rotas em app/routes/, schemas em app/schemas/
- Toda rota nova precisa de teste em tests/
- Usar Pydantic para validação de request/response
```

Na Camada 2, você pode adicionar hooks de lint e teste específicos da stack.
