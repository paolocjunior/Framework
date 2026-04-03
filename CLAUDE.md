# CLAUDE.md — Global Quality Framework V3

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
- Nenhuma implementação é trivial demais para o workflow. Mesmo um fix de 1 linha deve seguir o ciclo: ler contexto, planejar, apresentar plano, aguardar aprovação, implementar, validar, justificar. Racionalizar que algo é "simples demais para planejar" é o padrão de erro mais comum — o framework existe para impedir exatamente isso
- Após corrigir um bug, buscar pelo mesmo padrão em todo o projeto antes de considerar o fix completo. Se o fix mudou `campoAntigo` para `campoNovo`, grep por `campoAntigo` em todos os arquivos. Fix parcial (corrigir 1 arquivo e deixar outros com o mesmo bug) é reincidência garantida
- Auto-verificação da IA que implementou não é confiável como gate final. O /verify-spec rodado pela mesma IA que codou pode gerar falsos positivos (reportar conformidade quando metade dos itens não está implementado). Gates de verificação devem sempre incluir validação cross-model (Codex) e aprovação do usuário

## Workflow Padrão

1. **Antes de codar**: ler os arquivos relevantes do projeto, entender o contexto existente
2. **Planejar**: descrever o que será feito e por quê, antes de executar
3. **Verificar plano**: revisar o plano antes de implementar (`/plan-review`) — gate formal entre planejamento e código
4. **Implementar**: código incremental, testável, uma mudança por vez
5. **Validar**: verificações automáticas de sintaxe, secrets expostos e código inseguro (via hooks). Linters e testes específicos devem ser configurados na Camada 2 (por projeto)
6. **Justificar**: cada escolha técnica deve ter uma razão documentável
7. **Verificar entrega**: confirmar que o código implementado corresponde ao que a especificação prometeu (`/verify-spec`) — gate de aderência funcional

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

## Hooks

Todos os 10 hooks rodam sempre, sem exceção. Não existe modo reduzido — o framework opera com poder máximo em qualquer projeto.

### Lifecycle de Sessão

| Evento | Hook | Propósito |
|--------|------|-----------|
| `SessionStart` (startup/resume) | `health-check.sh` | Valida ambiente (jq, estrutura, permissões) |
| `PreToolUse` (Edit/Write) | `protect-files.sh` | Bloqueia edição de lockfiles e .git |
| `PostToolUse` (Edit/Write) | 5 hooks decompostos + loop-detection | Validação completa em toda edição |
| `Stop` | `session-summary.sh` | Gera resumo da sessão em arquivo separado |
| `SessionEnd` | `session-cleanup.sh` | Cleanup de temporários (timeout 1.5s) |

### Runtime e Persistência de Estado

| Arquivo | Propósito | Quem escreve | Onde vive |
|---------|-----------|-------------|-----------|
| `runtime/execution-ledger.md` | Estado oficial e completo do projeto | Apenas commands (/spec-check, /ship-check, etc.) | Dentro do projeto (Git) |
| `runtime/pattern-registry.md` | Catálogo de padrões aprovados | Manual ou via /justify | Dentro do projeto (Git) |
| `runtime/session-summaries/latest.md` | Resumo da última sessão | Hook session-summary.sh (automático) | Dentro do projeto (Git) |
| `memory/project_spec-status.md` | Snapshot resumido do estado atual | Commands (junto com ledger) | Fora do projeto (memória Claude Code) |

O ledger e o snapshot formam um **trio de sincronização** com o `MEMORY.md` do sistema de memória. Quando o estado do projeto muda, os 3 devem ser atualizados juntos. Ver `.claude/rules/state-sync.md` para o protocolo completo e `.claude/runtime/project-status.template.md` para o formato do snapshot.

### Modelo de 4 Camadas de Enforcement

O framework opera em 4 camadas complementares de defesa. Nenhuma substitui as outras — cada uma pega o que as anteriores não alcançam:

| Camada | Mecanismo | Tipo de proteção | Exemplo |
|--------|-----------|-----------------|---------|
| 1 — Regras | CLAUDE.md + rules | Declarativa — define direção e padrões | "Validar entrada", "Planejar antes de codar" |
| 2 — Hooks | Scripts em PreToolUse/PostToolUse | Mecânica — bloqueia erros objetivos automaticamente | Secrets detectados, syntax inválida, hex hardcoded |
| 3 — Memória | Feedbacks comportamentais persistidos | Comportamental — corrige erros de julgamento entre sessões | "Grep por import não prova uso", "Nenhum fix é trivial" |
| 4 — Cross-model | Codex adversarial review (GPT-5.4) | Validação independente — IA diferente encontra blind spots | Bucket compartilhado, proxy hardcoded, XFF spoofável |

- **Camada 1** está sempre ativa (CLAUDE.md é carregado em toda sessão)
- **Camada 2** roda automaticamente sem decisão da IA (hooks mecânicos)
- **Camada 3** acumula-se ao longo do projeto conforme incidentes são corrigidos
- **Camada 4** requer setup do Codex CLI + plugin (ver seção Cross-Model Review)

A camada 3 começa vazia em projetos novos. Templates de referência estão disponíveis em `.claude/runtime/baseline-feedbacks/` para acelerar a construção dessa camada. O framework inclui esses templates como referência — feedbacks orgânicos (nascidos de incidentes reais) tendem a ser mais efetivos que feedbacks pré-carregados.

### Cross-Model Review (Camada 4)

O framework usa o Codex (OpenAI GPT-5.4) como revisor adversarial independente. O Claude Code implementa e o Codex questiona — duas IAs de empresas diferentes validando o trabalho uma da outra.

#### Setup necessário

1. Instalar Codex CLI: `npm install -g @openai/codex`
2. Autenticar: `codex login`
3. Instalar plugin no Claude Code: `/install-plugin openai/codex-plugin-cc`
4. Recarregar: `/reload-plugins`
5. Configurar `AGENTS.md` na raiz do projeto (template incluído no framework)

#### Preenchimento automático do AGENTS.md

O Claude Code DEVE preencher a seção "Contexto do Projeto" do `AGENTS.md` automaticamente quando o `/spec-check` der READY — usando tipo, stack e objetivo extraídos da spec aprovada.

Se a spec mudar durante o projeto (novo módulo, mudança de stack, pivô de escopo), o Claude Code DEVE atualizar o `AGENTS.md` para refletir a mudança. O AGENTS.md deve estar sempre alinhado com a spec vigente.

#### Checkpoints obrigatórios

O Claude Code DEVE chamar `/codex:adversarial-review` automaticamente em 4 momentos:

| Checkpoint | Quando | O que incluir no focus text |
|-----------|--------|---------------------------|
| Após /plan | Plano criado | Plano completo + "valide contra [spec / finding / requisito]" |
| Após implementação | Código escrito | Resumo do plano + "verifique implementação" |
| Após fix de findings | Correções aplicadas | Findings originais + resumo dos fixes |
| Antes do /ship-check | Pré-entrega | Contexto do projeto + "revisão final de segurança" |

#### Composição do focus text

O focus text é dinâmico — o Claude Code compõe com base no contexto real:

```
Focus text = [o que validar] + [contra o quê] + [contexto necessário]
```

Regras de composição:
- Cada review do Codex é sessão nova (sem memória) — incluir contexto relevante sempre
- Se validando fix, descrever o finding original no focus text
- Se validando plano, colar o plano no focus text
- Focus text vazio = review geral exploratória (usar na primeira review)
- Focus text pesa na análise mas não restringe — processar TODOS os findings do Codex

#### Protocolo de resolução de divergências

Para cada finding do Codex:

1. Claude Code verifica no código se o finding é real (evidência concreta)
2. Se evidência confirma → finding ACEITO
3. Se evidência contradiz → Claude Code reenvia ao Codex com focus text:
   - Descrever o finding reportado
   - Apresentar a evidência contrária encontrada
   - Pedir que o Codex explique ou confirme que a evidência resolve o ponto
4. Se Codex convence com argumentação sólida → finding ACEITO
5. Se Codex não convence → finding REJEITADO (com justificativa documentada)

#### Relatório de fase

Ao final de cada fase, antes de prosseguir, gerar relatório consolidado para o usuário:

```
## Relatório de Fase — [Nome da Fase]

### O que foi feito
(resumo da implementação)

### Validação Cross-Model
- Total de findings do Codex: X
- Aceitos: X (lista)
- Rejeitados: X (lista com justificativa)
- Ações tomadas: (fixes aplicados)

### Pontos de concordância
(o que ambas as IAs concordaram que está correto)

### Divergências resolvidas
(pontos onde houve discordância e como foi resolvido)

### Status
Aguardando aprovação do usuário para prosseguir.
```

O usuário revisa o relatório e autoriza a próxima fase. Nenhuma fase avança sem aprovação explícita.

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
- `.claude/rules/state-sync.md` — protocolo de sincronização de estado entre ledger, memória e índice (trio)
- `.claude/rules/implementation-quality.md` — padrões de erro recorrentes em planos de implementação
- `.claude/rules/plan-construction.md` — procedimento de construção de planos (self-check interno do /plan)
- `.claude/rules/integration-checklist.md` — checklist de migração mock para API real

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
- `/verify-spec` — verificação pós-implementação contra a especificação original
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
