# CLAUDE.md — Global Quality Framework V4+

> Para o histórico completo de versões e mudanças, ver [`.claude/reference/CHANGELOG.md`](.claude/reference/CHANGELOG.md).

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
- Correções repetidas no mesmo arquivo são sinal de loop de fix cego. O hook `loop-detection.sh` materializa esse princípio em duas etapas: na 3ª edição do mesmo arquivo emite alerta explícito para revisar o que mudou e por quê; na 5ª edição bloqueia mecanicamente (`{decision: "block"}`) e exige diagnóstico de causa-raiz antes de continuar. Ao receber o alerta da 3ª edição, parar, produzir diagnóstico e só retomar com hipótese nova — não esperar o bloqueio da 5ª para repensar
- Nenhuma implementação é trivial demais para o workflow. Mesmo um fix de 1 linha deve seguir o ciclo: ler contexto, planejar, apresentar plano, aguardar aprovação, implementar, validar, justificar. Racionalizar que algo é "simples demais para planejar" é o padrão de erro mais comum — o framework existe para impedir exatamente isso
- Após corrigir um bug, buscar pelo mesmo padrão em todo o projeto antes de considerar o fix completo. Se o fix mudou `campoAntigo` para `campoNovo`, grep por `campoAntigo` em todos os arquivos. Fix parcial (corrigir 1 arquivo e deixar outros com o mesmo bug) é reincidência garantida
- Auto-verificação da IA que implementou não é confiável como gate final. O /verify-spec rodado pela mesma IA que codou pode gerar falsos positivos (reportar conformidade quando metade dos itens não está implementado). Gates de verificação devem sempre incluir validação cross-model (Codex) e aprovação do usuário
- Nenhum gate de workflow pode ser substituído por inferência. `/spec-check`, `/plan-review` e `/verify-spec` são execuções explícitas de commands — sair de um modo (ExitPlanMode), ler sem comentar, ou o usuário dizer "ok" não substitui rodar o command. Cada gate deve ser executado formalmente para produzir seu veredicto. O hook `pre-implementation-gate.sh` reforça mecanicamente o gate `/plan-review` → implementação

## Workflow Padrão

0. **Criar spec** (se não existir): usar `/spec-create` para construir a especificação do zero com o usuário — discovery, requisitos, telas, modelo de dados, regras de negócio
1. **Validar spec**: rodar `/spec-check` para confirmar que a especificação está pronta para implementação
2. **Antes de codar**: ler os arquivos relevantes do projeto, entender o contexto existente
3. **Planejar**: descrever o que será feito e por quê, antes de executar
4. **Verificar plano**: `/plan-review` é OBRIGATÓRIO antes de qualquer implementação. ExitPlanMode NÃO substitui `/plan-review`. Implementação sem plan-review é violação de workflow. O hook `pre-implementation-gate.sh` bloqueia mecanicamente a criação de código-fonte até que `/plan-review` crie o marker `.claude/runtime/.plan-approved`
5. **Implementar**: código incremental, testável, uma mudança por vez
6. **Validar**: duas camadas complementares. Hooks (Camada 2) rodam automaticamente por evento e pegam erros objetivos em cada edição — sintaxe, secrets expostos, padrões inseguros, loop de fix, gate de implementação. Sensores mecânicos (camada ortogonal) rodam sob demanda via `/sensors-run` e cobrem correção funcional declarativa — testes, lint, type-check, build, audit de dependências — com o exit code do comando como autoridade sobre o veredicto. Sensores são declarados por projeto em `.claude/runtime/sensors.json`; consumidores downstream (`/ship-check`, `/verify-spec`) leem o resultado estruturado em `sensors-last-run.json`
7. **Justificar**: cada escolha técnica deve ter uma razão documentável
8. **Verificar entrega**: confirmar que o código implementado corresponde ao que a especificação prometeu (`/verify-spec`) — gate de aderência funcional

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

Todos os 11 hooks rodam sempre, sem exceção. Não existe modo reduzido — o framework opera com poder máximo em qualquer projeto.

### Lifecycle de Sessão

| Evento | Hook | Propósito |
|--------|------|-----------|
| `SessionStart` (startup/resume) | `health-check.sh` | Valida ambiente (jq, estrutura, permissões) |
| `PreToolUse` (Edit/Write) | `protect-files.sh` | Bloqueia edição de lockfiles e .git |
| `PreToolUse` (Edit/Write) | `pre-implementation-gate.sh` | Bloqueia código-fonte sem /plan-review aprovado |
| `PostToolUse` (Edit/Write) | 5 hooks decompostos + loop-detection | Validação completa em toda edição |
| `Stop` | `session-summary.sh` | Gera resumo da sessão em arquivo separado |
| `SessionEnd` | `session-cleanup.sh` | Cleanup de temporários (timeout 1.5s) |

### Protocolo de Markers de Gate

Commands que representam gates de workflow criam marker files para enforcement mecânico via hooks:

| Marker | Criado por | Verificado por | Propósito |
|--------|-----------|---------------|-----------|
| `.claude/runtime/.plan-approved` | `/plan-review` (quando aprova) | `pre-implementation-gate.sh` | Libera criação de código-fonte |

Regras:
- O marker é criado apenas quando o gate produz veredicto positivo (APPROVED)
- O marker persiste até ser removido manualmente ou por um novo ciclo de `/plan`
- Em projetos sem ledger (não gerenciados pelo framework), o hook não interfere
- Escape hatch para projetos que não usam `/plan`: `touch .claude/runtime/.plan-approved`
- O `/plan` deve remover o marker antigo (se existir) ao iniciar, forçando novo ciclo de aprovação

### Runtime e Persistência de Estado

| Arquivo | Propósito | Quem escreve | Onde vive |
|---------|-----------|-------------|-----------|
| `runtime/execution-ledger.md` | Estado oficial e completo do projeto | Apenas commands (/spec-check, /ship-check, etc.) | Dentro do projeto (Git) |
| `runtime/pattern-registry.md` | Catálogo de padrões aprovados | Manual ou via /justify | Dentro do projeto (Git) |
| `runtime/spec-template.md` | Template de estrutura de especificação | Referência para /spec-create | Dentro do projeto (Git) |
| `runtime/session-summaries/latest.md` | Resumo da última sessão | Hook session-summary.sh (automático) | Dentro do projeto (Git) |
| `runtime/sensors.json` | Declaração de sensores mecânicos do projeto (test/lint/build/audit) | Manual, copiado de `sensors.template.json` | Dentro do projeto (Git) |
| `runtime/sensors-last-run.json` | Veredicto estruturado da última execução dos sensores | `/sensors-run` (automático) | Dentro do projeto (efêmero, pode ficar fora do Git) |
| `runtime/contracts/phase-<id>.json` | Contrato estruturado de execução da fase — declara upstream o que a fase promete entregar | `/contract-create` (inicial) + edição manual para transições de status | Dentro do projeto (Git) |
| `runtime/contracts/active.json` | Ponteiro para o contrato da fase ativa | `/contract-create` (atualização automática ao aprovar) | Dentro do projeto (Git) |
| `runtime/contracts.template.json` | Template de contrato de execução | Referência para `/contract-create` | Dentro do projeto (Git) |
| `runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json` | Sprint contract — unidade atômica de entrega intra-fase com evaluator determinístico | `/sprint-create` (criação e aprovação) + `/sprint-evaluate` (append em `evaluation_history`) + `/sprint-close` (transição terminal) | Dentro do projeto (Git) |
| `runtime/contracts/active-sprint.json` | Ponteiro para o sprint contract ativo | `/sprint-create` (ao aprovar) + `/sprint-close` (reset para null) | Dentro do projeto (Git) |
| `runtime/behaviours.json` | Declaração de behaviours runtime do projeto (ações disparadas + expectativas observadas) | Manual, copiado de `behaviours.template.json` | Dentro do projeto (Git) |
| `runtime/behaviours-last-run.json` | Veredicto estruturado (expected vs actual) da última execução dos behaviours | `/behaviour-run` (automático) | Dentro do projeto (efêmero, pode ficar fora do Git) |
| `runtime/behaviours.template.json` | Template de behaviours com 5 exemplos cobrindo http/cli/state + 6 tipos de expectation | Referência para bootstrap de `behaviours.json` | Dentro do projeto (Git) |
| `runtime/architecture-linters.json` | Declaração de architecture linters do projeto (invariantes estruturais cross-file) | Manual, copiado de `architecture-linters.template.json` | Dentro do projeto (Git) |
| `runtime/architecture-linters-last-run.json` | Veredicto estruturado da última execução dos architecture linters | `/lint-architecture` (automático) | Dentro do projeto (efêmero, pode ficar fora do Git) |
| `runtime/architecture-linters.template.json` | Template de architecture linters com 3 exemplos (circular-deps, layering, type-schema-match) | Referência para bootstrap de `architecture-linters.json` | Dentro do projeto (Git) |
| `runtime/knowledge/knowledge-index.json` | Índice estruturado da knowledge base — existência, staleness, hash, fontes por documento | `/kb-update` (automático) | Dentro do projeto (Git) |
| `runtime/knowledge/*.md` | Documentos da knowledge base (architecture, quality-posture, security-posture, decisions-log) | `/kb-update` (automático) | Dentro do projeto (Git) |
| `runtime/knowledge.template/*.md` | Templates de esqueleto dos 4 documentos da knowledge base | Referência para `/kb-update` na primeira geração | Dentro do projeto (Git) |
| `runtime/capability-gaps.json` | Registro persistente de capability gaps — lacunas de verificação detectadas e decisões humanas | `/gaps-scan` (detecção e merge) | Dentro do projeto (Git) |
| `runtime/capability-gaps.template.json` | Template de capability gaps para bootstrap | Referência para `/gaps-scan` na primeira execução | Dentro do projeto (Git) |
| `memory/project_spec-status.md` | Snapshot resumido do estado atual | Commands (junto com ledger) | Fora do projeto (memória Claude Code) |

O ledger e o snapshot formam um **trio de sincronização** com o `MEMORY.md` do sistema de memória. Quando o estado do projeto muda, os 3 devem ser atualizados juntos. Ver `.claude/rules/state-sync.md` para o protocolo completo e `.claude/runtime/project-status.template.md` para o formato do snapshot.

### Modelo de 4 Camadas de Enforcement

O framework opera em 4 camadas complementares de defesa. Nenhuma substitui as outras — cada uma pega o que as anteriores não alcançam:

| Camada | Mecanismo | Tipo de proteção | Exemplo |
|--------|-----------|-----------------|---------|
| 1 — Regras | CLAUDE.md + rules | Declarativa — define direção e padrões | "Validar entrada", "Planejar antes de codar" |
| 2 — Hooks | Scripts em PreToolUse/PostToolUse | Mecânica — bloqueia erros objetivos automaticamente | Secrets detectados, syntax inválida, hex hardcoded, código sem plan-review |
| 3 — Memória | Feedbacks comportamentais persistidos | Comportamental — corrige erros de julgamento entre sessões | "Grep por import não prova uso", "Nenhum fix é trivial" |
| 4 — Cross-model | Codex adversarial review (GPT-5.4) | Validação independente — IA diferente encontra blind spots | Bucket compartilhado, proxy hardcoded, XFF spoofável |

- **Camada 1** está sempre ativa (CLAUDE.md é carregado em toda sessão)
- **Camada 2** roda automaticamente sem decisão da IA (hooks mecânicos)
- **Camada 3** acumula-se ao longo do projeto conforme incidentes são corrigidos
- **Camada 4** requer setup do Codex CLI + plugin (ver seção Cross-Model Review)

A camada 3 começa vazia em projetos novos. Templates de referência estão disponíveis em `.claude/runtime/baseline-feedbacks/` para acelerar a construção dessa camada. O framework inclui esses templates como referência — feedbacks orgânicos (nascidos de incidentes reais) tendem a ser mais efetivos que feedbacks pré-carregados.

### Camada de Sensores Mecânicos

Sensores são verificações declarativas executadas pelo ambiente, cujo veredicto vem do **exit code de um comando** — não da narrativa do agente. A camada de sensores resolve uma lacuna estrutural: até hoje, o agente podia "dizer que validou" sem que o ambiente confirmasse. Com sensores, o ambiente é quem diz.

| Aspecto | Hooks | Sensores |
|---|---|---|
| Quando rodam | Automaticamente em evento (edit, write, session-start) | Sob demanda (via `/sensors-run` ou dentro de commands consumidores) |
| Declaração | `settings.json` (universal, parte do framework) | `sensors.json` (por projeto, versionado com o código) |
| Custo típico | Baixíssimo (<1s por hook) | Médio a alto (testes E2E podem levar minutos) |
| Escopo | Arquivo ou sessão | Codebase inteira ou subset declarado |
| O que detectam | Padrões estáticos, violações sintáticas, secrets, loops | Correção funcional, tipos, build, vulnerabilidades, comportamento |

**Princípio central:** Se o comando de um sensor retorna 0, o sensor passou. Se retorna qualquer outro valor, falhou. Nenhum agente pode reinterpretar o output textual como sucesso quando o exit code diz o contrário.

**Arquivos envolvidos:**
- `.claude/runtime/sensors.json` — declaração dos sensores do projeto (versionado no Git)
- `.claude/runtime/sensors.template.json` — template inicial com exemplos de 6 tipos de sensor
- `.claude/runtime/sensors-last-run.json` — veredicto estruturado da última execução (efêmero)

**Commands consumidores:**
- `/sensors-run` — executa os sensores declarados e produz `sensors-last-run.json`
- `/ship-check` — lê `sensors-last-run.json` no Bloco 0 como gate prévio ao Bloco A; `blocking_failures > 0` força `NÃO PRONTO`
- `/verify-spec` — usa sensores como evidência mecânica de comportamento; cenário marcado IMPLEMENTADO com sensor de teste `fail` é rebaixado automaticamente

**Bootstrap:** em projeto novo, copiar `.claude/runtime/sensors.template.json` para `.claude/runtime/sensors.json`, editar para refletir a stack real e rodar `/sensors-run` para estabelecer baseline. Projetos que não declaram `sensors.json` operam em modo degradado (sem sensores) — os commands consumidores reportam a ausência como lacuna explícita, sem bloquear automaticamente.

Ver `.claude/rules/sensors.md` para o contrato completo (schema, tipos, regras de staleness, verdict aggregation).

### Cross-Model Review (Camada 4)

O framework usa o Codex (OpenAI GPT-5.4) como revisor adversarial independente. O Claude Code implementa e o Codex questiona — duas IAs de empresas diferentes validando o trabalho uma da outra.

#### Setup necessário

1. Instalar Codex CLI: `npm install -g @openai/codex`
2. Autenticar: `codex login`
3. Instalar plugin no Claude Code: `/install-plugin openai/codex-plugin-cc`
4. Recarregar: `/reload-plugins`
5. Configurar `AGENTS.md` na raiz do projeto (template incluído no framework)

#### Preenchimento automático do AGENTS.md

O Claude Code DEVE preencher a seção "Contexto do Projeto" do `AGENTS.md` automaticamente quando o `/spec-check` der READY ou READY WITH ASSUMPTIONS — usando tipo, stack e objetivo extraídos da spec aprovada. Veredicto BLOCKED não autoriza o preenchimento do AGENTS.md.

Se a spec mudar durante o projeto (novo módulo, mudança de stack, pivô de escopo), o Claude Code DEVE atualizar o `AGENTS.md` para refletir a mudança. O AGENTS.md deve estar sempre alinhado com a spec vigente.

#### Checkpoints obrigatórios

O Claude Code DEVE chamar `/codex:adversarial-review` automaticamente após CADA command do framework que produz veredicto ou artefato. O Codex valida 100% do que o Claude Code faz — não apenas em momentos-chave, mas em todo output significativo:

| Checkpoint | Quando | O que incluir no focus text |
|-----------|--------|---------------------------|
| Após /spec-create | Spec criada | Spec completa + "valide completude, ambiguidades e viabilidade" |
| Após /spec-check | Spec validada | Resultado do spec-check + "valide se os findings são reais e se há lacunas não detectadas" |
| Após /plan | Plano criado | Plano completo + "valide contra spec e viabilidade técnica" |
| Após /plan-review | Plano revisado | Resultado do plan-review + "valide se a revisão foi rigorosa" |
| Após implementação | Código escrito | Resumo do plano + "verifique implementação completa" |
| Após /review | Review feito | Resultado do review + "valide se a revisão foi completa e rigorosa" |
| Após /audit (e variantes) | Auditoria feita | Resultado da auditoria + "valide findings e busque vulnerabilidades não detectadas" |
| Após fix de findings | Correções aplicadas | Findings originais + resumo dos fixes + "valide que os fixes são corretos" |
| Após /verify-spec | Verificação feita | Resultado do verify-spec + "valide se a verificação foi fidedigna" |
| Antes do /ship-check | Pré-entrega | Contexto do projeto + "revisão final de segurança e qualidade" |

**Regra:** O Codex é a segunda opinião obrigatória. Todo output do Claude Code que afeta o projeto passa pelo Codex. A experiência mostrou que o Codex consistentemente encontra mais apontamentos que o Claude Code sozinho.

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

**Vedação:** Nunca usar `/codex:review` quando houver focus text — esse subcomando não aceita instruções focadas. Para validações com focus text, usar sempre `/codex:adversarial-review`.

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

#### Timeouts e comportamento assíncrono

O Codex opera com 3 timeouts independentes que o desenvolvedor deve conhecer:

| Timeout | Duração | O que acontece quando expira |
|---------|---------|----------------------------|
| Bash timeout | 5 min | Claude Code mata o processo — mas o Codex continua rodando em background |
| Status wait timeout | 4 min | Plugin para de esperar resposta — resultado ainda será entregue |
| Stop review gate | 15 min | Codex continua análise — resultado disponível via `/codex:status` |

**Comportamento prático:**
- Se o Codex "travar" por mais de 5 min, usar `/codex:status` para verificar se ainda está rodando
- O Codex NÃO para quando o timeout do Bash expira — ele continua a análise em background
- Para projetos grandes, o Codex pode levar mais de 5 min — isso é normal, não é erro
- O resultado do Codex em background permanece acessível mesmo após timeout do Claude Code
- Para reviews longas, considerar focus text mais específico para reduzir o tempo de análise

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
- `.claude/rules/spec-creation-guide.md` — guia de criação de especificação (questionamento, anti-padrões, escopo)
- `.claude/rules/recommended-skills.md` — catálogo de lacunas e skills externas complementares
- `.claude/rules/context-loading.md` — protocolo de carregamento de contexto no início de commands de review e análise
- `.claude/rules/review-quality.md` — critérios de qualidade de outputs de review (self-check interno obrigatório)
- `.claude/rules/agent-contracts.md` — protocolo de invocação e parsing de agents (formato de input, output, modos de falha)
- `.claude/rules/sensors.md` — protocolo de sensores mecânicos (exit code é autoridade, não narrativa do agente)
- `.claude/rules/execution-contracts.md` — protocolo de contratos de execução estruturados por fase (upstream declaration of phase commitments)
- `.claude/rules/sprint-contracts.md` — protocolo de sprint contracts (granularidade intra-fase com evaluator determinístico, ciclos curtos de feedback)
- `.claude/rules/behaviour-harness.md` — protocolo de behaviour/runtime harness (ação disparada contra o sistema + expected-vs-actual estruturado, complementar aos sensores)
- `.claude/rules/architecture-linters.md` — protocolo de architecture linters (invariantes estruturais cross-file, exit code como autoridade, complementar a sensores e behaviours)
- `.claude/rules/knowledge-base.md` — protocolo de knowledge base system-of-record (view consolidada e navegável do conhecimento acumulado, derivada de artefatos autoritativos, nunca gate)
- `.claude/rules/capability-gaps.md` — protocolo de capability gap tracking (registro persistente de lacunas de verificação, scanner determinístico, decisões humanas preservadas, nunca gate)

## Slash Commands

- `/spec-create` — criar especificação de projeto do zero (workflow interativo de discovery e estruturação)
- `/spec-check` — verificação de prontidão da especificação antes de planejar ou implementar
- `/plan` — criar plano de implementação antes de codar
- `/plan-review` — verificar plano de implementação antes de codar (gate formal entre planejamento e implementação)
- `/ui-plan` — planejamento e checkpoint visual de UI antes da implementação funcional
- `/design-preview` — gerar opções visuais de Design System para aprovação antes da UI Shell
- `/review` — revisão de código com checklist senior
- `/audit` — auditoria completa de segurança e qualidade (context: fork)
- `/justify` — documentar justificativas técnicas das decisões tomadas
- `/db-audit` — auditoria de segurança focada em banco de dados (context: fork)
- `/k8s-audit` — auditoria de segurança focada em Kubernetes
- `/web-audit` — auditoria de segurança focada em web e API (context: fork)
- `/verify-spec` — verificação pós-implementação contra a especificação original (context: fork)
- `/ship-check` — verificação pré-entrega antes de distribuição ou deploy (context: fork)
- `/status-check` — verificar estado atual do projeto, fases pendentes e bloqueios
- `/memory-consolidate` — consolidar memória do projeto (reorganizar ledger, merge feedbacks)
- `/skills-gap` — identificar lacunas de cobertura e sugerir skills externas complementares
- `/sensors-run` — executar sensores mecânicos declarados em `sensors.json` e produzir veredicto estruturado por exit code
- `/contract-create` — criar contrato estruturado de execução a partir do plano aprovado (upstream declaration de deliverables, acceptance criteria, sensors required e out_of_scope)
- `/contract-check` — verificar estado atual do projeto contra o contrato ativo da fase (validação determinística read-only, veredicto via tabela R1-R10)
- `/sprint-create` — criar sprint contract (granularidade intra-fase) com evaluator declarativo — unidade atômica de entrega de 1-2h com checks mecânicos (file_exists, grep_pattern, sensor_subset, custom_command)
- `/sprint-evaluate` — executar evaluator do sprint contract ativo e registrar verdict no `evaluation_history` (append-only). Não transiciona status do sprint
- `/sprint-close` — fechar sprint contract ativo com transição human-confirmed para `passed | failed | deferred`. Único command que altera `status` e `verdict` do sprint
- `/behaviour-run` — executar behaviours declarados em `behaviours.json`, disparar a ação de cada um contra o sistema real, comparar observado contra `expectations[]` e produzir veredicto estruturado expected-vs-actual em `behaviours-last-run.json`
- `/lint-architecture` — executar architecture linters declarados em `architecture-linters.json` e produzir veredicto estruturado por exit code em `architecture-linters-last-run.json`
- `/kb-update` — gerar ou atualizar documentos da knowledge base a partir de evidência acumulada do projeto (architecture, quality-posture, security-posture, decisions-log). Único command que escreve nos documentos da KB. Anti-churn: só persiste quando conteúdo semântico mudou
- `/kb-status` — verificar estado atual da knowledge base — documentos existentes, staleness e lacunas. Read-only absoluto
- `/gaps-scan` — detectar capability gaps do projeto (lacunas de verificação) e persistir registro estruturado em `capability-gaps.json`. Único command que cria gaps. Scanner determinístico com heurísticas H1-H6 para `native_uncovered`. Decisões humanas nunca sobrescritas
- `/gaps-status` — verificar estado atual dos capability gaps — registro persistente de lacunas de verificação. Read-only absoluto, nunca modifica `capability-gaps.json`

## Subagents

### Tabela de agents

| Agent | Tipo | Invocado por | Model | Gatilho |
|-------|------|-------------|-------|---------|
| `risk-assessment` | transversal | `/plan`, `/ship-check` | sonnet (opus via override) | `/plan`: condicional (migração, integração externa, operação irreversível, dependência nova crítica). `/ship-check`: sempre |
| `qa-auditor` | especializado | `/review`, standalone | sonnet (opus via override) | `/review`: quando há código de produção no escopo |
| `planner` | especializado | delegação direta | opus | invocação explícita via Agent tool — `/plan` opera com o modelo principal seguindo `plan-construction.md`; `planner` é invocado quando o command quer delegar planejamento a contexto isolado |
| `code-reviewer` | especializado | `/review` | opus | sempre |
| `security-auditor` | especializado | `/audit`, `/web-audit`, `/db-audit`, `/k8s-audit` | opus | sempre |
| `spec-creator` | especializado | `/spec-create` | opus | sempre |
| `spec-plan-validator` | especializado | `/plan-review` | opus | sempre |
| `consistency-checker` | especializado | `/plan-review` | opus | sempre |

### Taxonomia

- **Transversal:** aplica-se a múltiplos commands em domínios não relacionados. Critério: se o agent tem papel em 2+ commands não relacionados, é transversal.
- **Especializado:** tem papel específico em 1 command ou 1 família coesa de commands (ex: `/audit` e variantes).

### Critérios para criar um novo agent

Antes de criar um agent novo, verificar nesta ordem:

1. **A tarefa exige síntese probabilística?** Se não (é determinística — ler, contar, validar formato), criar rule ou hook, não agent
2. **Já existe agent com papel similar?** Se sim, ampliar o existente em vez de criar um novo
3. **O output tem contrato definível?** Se não, refinar o papel antes de criar o agent (ver `.claude/rules/agent-contracts.md`)
4. **Há gatilho condicional claro?** Se não, o agent vai rodar sempre e custar tokens desnecessariamente — definir o gatilho antes
5. **O que acontece se o agent falhar?** Se não há plano de fallback, definir antes de criar (ver seção "Modos de falha" em `agent-contracts.md`)

### Política de model

Os agents legados do framework foram criados com `model: opus` como padrão, partindo da premissa de que análises do framework exigem síntese profunda. A partir da expansão que incluiu `risk-assessment` e `qa-auditor`, o framework adota uma política mais granular de custo-benefício:

- **`opus` por default:** agents que fazem síntese crítica de texto denso — `security-auditor`, `spec-plan-validator`, `code-reviewer`, `planner`, `spec-creator`, `consistency-checker`
- **`sonnet` por default + `opus` via override:** agents que fazem análise estrutural (presença de arquivos, categorização por regras determinísticas, matrizes de classificação) com gatilhos de deep-analysis declarados — `risk-assessment`, `qa-auditor`

O command invocador pode sobrescrever o model via parâmetro `model` da Agent tool quando um gatilho de deep-analysis for ativado (por exemplo: projeto financeiro, operações irreversíveis, código em Classes B/C/D da Security Regression Matrix). Isso permite economizar tokens em casos comuns e investir em análise profunda apenas quando o risco justifica.

**Critério para escolher model ao criar agent novo:**

1. Se a tarefa exige raciocínio causal complexo, trade-offs multi-dimensionais ou detecção de padrões sutis em texto denso → `opus` default
2. Se a tarefa é estrutural (presença, contagem, classificação por regras determinísticas) → `sonnet` default com override condicional para `opus` quando a criticidade do contexto justificar
