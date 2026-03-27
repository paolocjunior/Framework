# CLAUDE.md — Global Quality Framework

## Princípios

- Todo código deve ter qualidade de desenvolvedor senior
- Segurança primeiro: nunca introduzir vulnerabilidades conhecidas. Todo código deve ser escrito como se fosse ser submetido a pentest profissional. Aplicar defesa em profundidade — cada camada deve ser independentemente segura
- Cada decisão técnica deve ter justificativa verificável
- Alterações devem ser determinísticas: mudar apenas o que foi pedido, sem efeitos colaterais
- Código limpo, legível e autoexplicativo; comentários apenas quando a lógica não é óbvia
- Não tratar contexto ausente como permissão para adivinhar. Quando contexto é insuficiente: prosseguir com premissas explícitas e escopo limitado, ou parar e declarar o que falta, ou perguntar quando uma decisão do usuário bloqueia progresso seguro
- Hooks validam apenas um subconjunto de falhas (sintaxe, secrets, padrões proibidos). Passar nos hooks NÃO é prova de correção ou segurança — auditorias via commands e subagents são necessárias para validação profunda
- Não iniciar implementação a partir de especificação materialmente ambígua ou incompleta como se estivesse pronta. Quando uma spec contém ambiguidades bloqueantes, lacunas de integridade ou critérios de aceite não verificáveis, parar e expor os problemas antes de criar arquivos
- Não converter lacunas de especificação em expansão funcional. Correções de spec devem preferir clarificação, fechamento de contrato e limitação explícita em vez de adicionar capacidades, fluxos ou integrações não pretendidas no escopo original
- Para projetos com interface visual, não implementar o produto completo de ponta a ponta sem checkpoint visual. Preferir abordagem em fases: primeiro UI shell com navegação e layout (dados mockados), depois aprovação visual, depois implementação funcional completa
- Para produtos com UI, não fixar a identidade visual implicitamente durante a implementação. Validar a direção estética cedo, através de opções coerentes de Design System, antes de expandir para todas as telas
- Quando trabalho for dividido, adiado, parcialmente aprovado ou bloqueado, registrar explicitamente no execution ledger. Não tratar aprovação parcial como conclusão. Não iniciar fases posteriores ignorando pendências de fases anteriores
- Após 2-3 tentativas de correção na mesma área sem sucesso, parar o loop de fix e produzir diagnóstico de causa-raiz antes de continuar. Não fazer cadeia longa de correções cegas sem revisar o que mudou e por quê

## Workflow Padrão

1. **Antes de codar**: ler os arquivos relevantes do projeto, entender o contexto existente
2. **Planejar**: descrever o que será feito e por quê, antes de executar
3. **Verificar plano**: revisar o plano antes de implementar (`/plan-review`) — gate formal entre planejamento e código
4. **Implementar**: código incremental, testável, uma mudança por vez
5. **Validar**: verificações automáticas de sintaxe, secrets expostos e código inseguro (via hooks). Linters e testes específicos devem ser configurados na Camada 2 (por projeto)
6. **Justificar**: cada escolha técnica deve ter uma razão documentável

## Regras de Código (todas as linguagens)

- Nomear variáveis e funções de forma descritiva (sem abreviações crípticas)
- Funções pequenas, com responsabilidade única
- Tratamento de erros explícito (nunca silenciar exceções)
- Inputs do usuário sempre validados e sanitizados
- Sem hardcoded secrets, credenciais ou tokens
- Sem `eval()`, `exec()` ou equivalentes inseguros
- Imports organizados e sem dependências não utilizadas
- Sem código morto ou comentado

## Segurança

- Validar e sanitizar toda entrada externa
- Usar prepared statements / parameterized queries para SQL
- Nunca expor stack traces ou mensagens de erro internas ao usuário
- Nunca logar dados sensíveis (senhas, tokens, PII)
- Checar permissões antes de ações destrutivas
- Aplicar princípio do menor privilégio

## Perfis de Hook

O framework suporta 3 níveis de rigor via variável de ambiente `CLAUDE_HOOK_PROFILE`:

| Perfil | Hooks que rodam | Quando usar |
|--------|----------------|-------------|
| `minimal` | security-check, protect-files, loop-detection | Scripts, automações, projetos sem UI |
| `standard` (default) | minimal + syntax-check, quality-check | Backend, APIs, bibliotecas |
| `strict` | standard + design-check, mock-determinism | Apps com UI, design system, mocks |

- `security-check.sh` roda **sempre**, independente do perfil — nunca desligável
- Setar via: `export CLAUDE_HOOK_PROFILE=strict`
- Default: `standard` (se não setado)

### Lifecycle de Sessão

| Evento | Hook | Propósito |
|--------|------|-----------|
| `SessionStart` (startup/resume) | `health-check.sh` | Valida ambiente (jq, estrutura, permissões) |
| `PreToolUse` (Edit/Write) | `protect-files.sh` | Bloqueia edição de .env, lockfiles, .git |
| `PostToolUse` (Edit/Write) | 5 hooks decompostos + loop-detection | Validação proporcional ao perfil |
| `Stop` | `session-summary.sh` | Gera resumo da sessão em arquivo separado |
| `SessionEnd` | `session-cleanup.sh` | Cleanup de temporários (timeout 1.5s) |

### Runtime

| Arquivo | Propósito | Quem escreve |
|---------|-----------|-------------|
| `runtime/execution-ledger.md` | Estado oficial do projeto | Apenas commands (/spec-check, /ship-check, etc.) |
| `runtime/pattern-registry.md` | Catálogo de padrões aprovados | Manual ou via /justify |
| `runtime/session-summaries/latest.md` | Resumo da última sessão | Hook session-summary.sh (automático) |

## Documentação

As rules abaixo definem critérios normativos de revisão, segurança, verificação e qualidade estrutural. Consultar e aplicar conforme o tipo de tarefa:

- `.claude/rules/security.md` — checklist de segurança detalhada
- `.claude/rules/testing.md` — estratégia e padrões de testes
- `.claude/rules/code-review.md` — critérios de revisão de código
- `.claude/rules/structural-quality.md` — critérios de review para qualidade estrutural, modularização e separação de responsabilidades
- `.claude/rules/state-management.md` — critérios de gestão de estado, fonte de verdade e estados de interface
- `.claude/rules/observability.md` — critérios de logging, diagnóstico e crash reporting
- `.claude/rules/performance.md` — critérios de performance, uso de recursos e otimização
- `.claude/rules/database-security.md` — checklist de segurança de banco de dados
- `.claude/rules/kubernetes-security.md` — checklist de segurança de Kubernetes
- `.claude/rules/web-api-security.md` — checklist de segurança web e API
- `.claude/rules/self-verification.md` — padrões de verificação e evidência
- `.claude/rules/evidence-tracing.md` — formato de reporte e rastreabilidade
- `.claude/rules/spec-quality.md` — critérios de prontidão de especificação antes da implementação
- `.claude/rules/design-system-quality.md` — critérios de qualidade visual, consistência e adequação do Design System
- `.claude/rules/execution-tracking.md` — regras de rastreamento de fases, pendências e aprovações parciais
- `.claude/rules/implementation-quality.md` — padrões de erro recorrentes em planos de implementação
- `.claude/rules/plan-construction.md` — procedimento de construção de planos (self-check interno do /plan)

## Slash Commands

- `/audit` — auditoria completa de segurança e qualidade
- `/review` — revisão de código com checklist senior
- `/plan` — criar plano de implementação antes de codar
- `/plan-review` — verificar plano de implementação antes de codar (gate formal entre planejamento e implementação)
- `/justify` — documentar justificativas técnicas das decisões tomadas
- `/db-audit` — auditoria de segurança focada em banco de dados
- `/k8s-audit` — auditoria de segurança focada em Kubernetes
- `/web-audit` — auditoria de segurança focada em web e API
- `/ship-check` — verificação pré-entrega antes de distribuição ou deploy
- `/spec-check` — verificação de prontidão da especificação antes de planejar ou implementar
- `/ui-plan` — planejamento e checkpoint visual de UI antes da implementação funcional
- `/design-preview` — gerar opções visuais de Design System para aprovação antes da UI Shell
- `/status-check` — verificar estado atual do projeto, fases pendentes e bloqueios

## Subagents

- `security-auditor` — análise focada em vulnerabilidades e brechas
- `code-reviewer` — revisão de qualidade, padrões e boas práticas
- `planner` — planejamento de implementação antes da execução
- `spec-plan-validator` — cruza plano com spec e verifica qualidade técnica (usado por /plan-review)
- `consistency-checker` — verifica coerência interna do plano (usado por /plan-review)
