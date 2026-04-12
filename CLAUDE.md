# CLAUDE.md — Global Quality Framework V4

> **Versão V4 + Camada de Sensores Mecânicos.**
> V4 adicionou 3 rules (context-loading, review-quality, agent-contracts), 2 agents novos (risk-assessment transversal, qa-auditor especializado), taxonomia formal de agents, política de model com override sonnet/opus, self-check interno de review e protocolo padronizado de contratos.
> Pós-V4 adiciona a camada de sensores mecânicos: 1 rule (`sensors.md`), 1 command (`/sensors-run`), artefatos de runtime (`sensors.json` + `sensors-last-run.json`) e integração autoritativa com `/ship-check` e `/verify-spec` — fechando a lacuna "o agente narra, o ambiente não confirma" apontada pela análise de Harness Engineering.
> Pós-V4 adiciona também a camada de execution contracts (upstream): 1 rule (`execution-contracts.md`), 2 commands (`/contract-create`, `/contract-check`), artefatos em `runtime/contracts/` e integração com `/ship-check` (Bloco 0.5) e `/verify-spec` (Passo 4.5) — fechando a lacuna complementar "a fase não declara upstream o que está prometendo entregar".
> Pós-V4 adiciona ainda a camada de sprint contracts (granularidade intra-fase): 3 commands (`/sprint-create`, `/sprint-evaluate`, `/sprint-close`), artefatos em `runtime/contracts/sprints/<parent_phase_id>/` e integração informativa com `/contract-check` e `/ship-check` (Bloco 0.6) — fechando o ciclo curto de feedback dentro de uma fase. Phase contract permanece imutável; o vínculo fase → sprints é derivado do filesystem.
> Pós-V4 adiciona por fim a camada de behaviour/runtime harness: 1 rule (`behaviour-harness.md`), 1 command (`/behaviour-run`), artefatos em `runtime/behaviours.json` + `runtime/behaviours-last-run.json`, expansão aditiva de execution contracts (`acceptance_criteria[].verifiable_by: "behaviour"` + `behaviour_id`) e integração read-only absoluta com `/contract-check` (Passo 7.6), `/ship-check` (Bloco 0.7) e `/verify-spec` (Passo 4.6) — fechando a lacuna "análise estática passa mas comportamento runtime falha". Sensores cobrem correção funcional; behaviours cobrem comportamento observável (requisição real, arquivo real, JSON path real) com evidência estruturada expected-vs-actual.
> Pós-V4 adiciona a camada de architecture linters: 1 rule (`architecture-linters.md`), 1 command (`/lint-architecture`), artefatos em `runtime/architecture-linters.json` + `runtime/architecture-linters-last-run.json` + `runtime/architecture-linters.template.json`, expansão aditiva de execution contracts (`architecture_linters_required[]`) e integração read-only absoluta com `/contract-check` (Passo 7.7, regras R2.2/R5.2) e `/ship-check` (Bloco 0.8) — fechando a lacuna "invariantes estruturais cross-file não têm verificação declarativa". Sensores cobrem correção funcional; behaviours cobrem comportamento runtime; architecture linters cobrem invariantes estruturais (layering, circular deps, naming, type-schema match) com exit code como autoridade.
> Pós-V4 adiciona a knowledge base system-of-record: 1 rule (`knowledge-base.md`), 2 commands (`/kb-update`, `/kb-status`), artefatos em `runtime/knowledge/` (index + documentos) + `runtime/knowledge.template/` (esqueletos), integração informativa (nunca gate) com `/status-check` e `/ship-check` (Bloco 0.9) — fechando a lacuna "evidência copiosa existe em 7+ camadas mas nenhum artefato consolida isso em conhecimento navegável do projeto". 4 documentos (architecture, quality-posture, security-posture, decisions-log) sintetizam artefatos autoritativos com anti-churn via content_hash e header de rastreabilidade obrigatório.
> Mudanças puramente aditivas — nada da V3/V4 foi removido ou quebrado. Para o histórico completo, ver `## Changelog` ao final.

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

O Claude Code DEVE preencher a seção "Contexto do Projeto" do `AGENTS.md` automaticamente quando o `/spec-check` der READY — usando tipo, stack e objetivo extraídos da spec aprovada.

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

## Subagents

### Tabela de agents

| Agent | Tipo | Invocado por | Model | Gatilho |
|-------|------|-------------|-------|---------|
| `risk-assessment` | transversal | `/plan`, `/ship-check` | sonnet (opus via override) | `/plan`: condicional (migração, integração externa, operação irreversível, dependência nova crítica). `/ship-check`: sempre |
| `qa-auditor` | especializado | `/review`, standalone | sonnet (opus via override) | `/review`: quando há código de produção no escopo |
| `planner` | especializado | `/plan` | opus | sempre |
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

## Changelog

### Pos-V4 — Knowledge Base System-of-Record

Oitavo item da fila de prioridades derivada da analise de Harness Engineering. Sensores (item #2) cobrem correcao funcional. Execution contracts (item #3) declaram compromisso upstream. Sprint contracts (item #4) fecham ciclo curto. Behaviours (item #5) cobrem runtime observavel. Handoff operacional (item #6) fecha continuidade entre sessoes. Architecture linters (item #7) cobrem invariantes estruturais. Knowledge base fecha a lacuna complementar: **"evidencia copiosa existe em 7+ camadas, mas nenhum artefato consolida isso em conhecimento navegavel do projeto"**.

A knowledge base e uma **view consolidada e navegavel** — nao fonte de verdade. Sintetiza artefatos autoritativos (ledger, contratos, sensores, behaviours, linters, pattern-registry, auditorias) em 4 documentos concisos (~50-150 linhas cada) que respondem perguntas especificas: "qual a arquitetura?", "qual a postura de qualidade?", "qual a postura de seguranca?", "quais decisoes foram tomadas e por que?".

**Rules novas (1):**
- `.claude/rules/knowledge-base.md` — protocolo completo de knowledge base system-of-record. 7 principios (sintese nao duplicacao, mapa nao atlas, derivado nao autoritativo, opt-in, atualizacao explicita, idempotente anti-churn, rastreabilidade obrigatoria). 4 tipos de documento com schema (architecture.md, quality-posture.md, security-posture.md, decisions-log.md). Header padronizado obrigatorio (Derived from, Authority, Last semantic update). Knowledge index (`knowledge-index.json`) com `content_hash` (SHA-256 truncado), `sources_consulted`, `stale`, `stale_reason`, `generated_at` por documento. Politica de staleness (3 criterios). Integracao com consumers (`/kb-update` escreve, `/kb-status` le, `/status-check` e `/ship-check` leem informativamente). 9 vedacoes. Bootstrap com templates separados de documentos reais.

**Commands novos (2):**
- `.claude/commands/kb-update.md` — unico command que escreve nos documentos da knowledge base. 8 passos (context loading, verificar estrutura, coletar fontes, gerar cada documento, header padronizado, deteccao de mudanca semantica via hash SHA-256 anti-churn, persistir, atualizar ledger, reportar). Flags: `--only <doc>`, `--force`, `--dry-run`. Anti-churn: so persiste quando content_hash difere do anterior — evita diffs inuteis no Git
- `.claude/commands/kb-status.md` — read-only absoluto. Le `knowledge-index.json`, avalia staleness contra artefatos-fonte, apresenta resumo consolidado com tabela de documentos (existe/stale/motivo/fontes). Nunca modifica nenhum artefato

**Artefatos novos de runtime (6):**
- `.claude/runtime/knowledge/knowledge-index.json` — indice estruturado null-safe bootstrap (versionado no Git)
- `.claude/runtime/knowledge/*.md` — documentos reais da KB (so existem apos primeiro `/kb-update`, versionados no Git)
- `.claude/runtime/knowledge.template/architecture.md` — template esqueleto
- `.claude/runtime/knowledge.template/quality-posture.md` — template esqueleto
- `.claude/runtime/knowledge.template/security-posture.md` — template esqueleto
- `.claude/runtime/knowledge.template/decisions-log.md` — template esqueleto

**Commands modificados (2):**
- `status-check.md` — adicionado item 10 "Knowledge base" em "O que verificar" (ler `knowledge-index.json`, verificar existencia/staleness dos 4 documentos) e secao "Knowledge Base (informativo)" no formato de saida. Read-only, lacuna informativa se ausente
- `ship-check.md` — adicionado **Bloco 0.9 — Knowledge Base (informativo, nao-gate)** apos Bloco 0.8 (architecture linters). Apresenta tabela com estado dos 4 documentos (existe/stale/motivo). **Nao afeta veredicto** — KB nunca e gate. Texto introdutorio atualizado para referenciar Bloco 0.9

**Mudancas conceituais:**
- **KB e view derivada, nao fonte de verdade.** Em caso de divergencia entre KB e fontes (ledger, contratos, sensores, linters, pattern-registry), as fontes prevalecem. KB deve ser regenerada via `/kb-update`, nao editada manualmente
- **Mapa, nao atlas.** Cada documento alvo de 50-150 linhas. Documentos >200 linhas sao atlas — devem ser refatorados
- **Anti-churn via content_hash.** `/kb-update` calcula SHA-256 do conteudo gerado (excluindo header de timestamp), compara com hash anterior no index. So persiste se hash difere — evita diffs inuteis no Git e commits de ruido
- **Header padronizado de rastreabilidade.** Todo documento inclui `Derived from` (fontes consultadas), `Authority` (fontes prevalecem), `Last semantic update` (data da ultima mudanca real). Sem header = documento invalido
- **Opt-in pattern (mesmo de sensores/behaviours/linters/contracts/sprints).** Projetos sem KB operam normalmente. Consumers reportam ausencia como lacuna informativa, nao bloqueante
- **KB nunca e gate.** Diferente de sensores/behaviours/linters que sao gates mecanicos, a KB e ferramenta de navegacao e contexto. Nenhum command bloqueia veredicto por KB stale ou ausente
- **Atualizacao sempre explicita.** Nunca gerada automaticamente por hook. O usuario decide quando consolidar via `/kb-update`
- **Bootstrap: templates separados de documentos reais.** Templates vivem em `knowledge.template/`, documentos reais em `knowledge/`. Documentos reais so existem apos o primeiro `/kb-update`. Index bootstrap e null-safe (todos `exists: false`, `stale: true`, `stale_reason: "document not yet generated"`)

**Regra de auto-modificacao do framework (mantida):** trabalho sobre o proprio framework (criar rule, command, template) nao aplica o workflow padrao (`/plan-review`, Codex review, marker `.plan-approved`). O ciclo `/plan` → aprovacao direta do usuario → implementacao e suficiente.

### Pós-V4 — Architecture Linters

Setimo item da fila de prioridades derivada da analise de Harness Engineering. Sensores (item #2) cobrem correcao funcional estatica (exit code de test/lint/type-check/build). Execution contracts (item #3) declaram compromisso upstream da fase. Sprint contracts (item #4) fecham ciclo curto dentro da fase. Behaviours (item #5) cobrem comportamento runtime observavel. Handoff operacional (item #6) fecha continuidade entre sessoes. Architecture linters fecham a lacuna complementar: **"invariantes estruturais cross-file nao tem verificacao declarativa"**. Um architecture linter e um comando shell que verifica um invariante arquitetural (layering, dependencias circulares, convencoes de naming, alinhamento type-schema) — exit code 0 = pass, qualquer outro = fail. A autoridade vem do exit code, nao da narrativa do agente.

Architecture linters sao **camada paralela e independente** de sensores e behaviours: sensores cobrem "o codigo compila/testa/lint passa", behaviours cobrem "o sistema rodando responde o que prometeu", linters cobrem "a estrutura do codigo respeita os invariantes declarados". Um cenario pode ser coberto por varias camadas — quando qualquer uma falha, o rebaixamento e deterministico.

**Rules novas (1):**
- `.claude/rules/architecture-linters.md` — contrato completo de architecture linters. Schema (`architecture-linters.json` com `linters[]` contendo `id`, `description`, `category`, `command`, `working_dir`, `timeout_seconds`, `requires_network`, `severity`, `scope`, `phase_id`, `enabled`), 6 categorias (`layering | circular-deps | cross-file | naming | type-schema-match | custom`), schema de `architecture-linters-last-run.json` com verdict `PASS|FAIL|PARTIAL|NO_LINTERS` e `blocking_failures` count, 8 regras de hardening de `command` (timeout obrigatorio sem default, rede desabilitada por default, read-only por contrato, sem side-effects em artefatos do framework, exit code unica autoridade), politica de staleness com aproximacao por scope (Ajuste 2: `scope: global` → arquivos-fonte relevantes, `scope: phase` → arquivos associados ao phase_id, regra conservadora quando delimitacao e impossivel), semantica dual severity vs obrigacao contratual (Ajuste 1: `severity` governa impacto operacional no `/ship-check`, `architecture_linters_required[]` governa obrigacao contratual no `/contract-check`), vedacoes, bootstrap

**Commands novos (1):**
- `.claude/commands/lint-architecture.md` — executor unico dos architecture linters declarados. 8 passos (context loading, localizar `architecture-linters.json`, validar schema, filtrar por flags, executar cada linter sequencialmente via `sh -c` com timeout, agregar veredicto, persistir em `architecture-linters-last-run.json` via escrita atomica tmp+mv, atualizar ledger, reportar). Flags: `--offline` (pula linters com `requires_network: true`), `--only <id>`, `--skip <id>`, `--phase <phase_id>`. **Unico command que executa linters** — consumers downstream sao read-only absolutos

**Artefatos novos de runtime (2):**
- `.claude/runtime/architecture-linters.json` — declaracao dos linters do projeto (versionado no Git)
- `.claude/runtime/architecture-linters-last-run.json` — veredicto estruturado da ultima execucao (efemero, pode ficar fora do Git)
- `.claude/runtime/architecture-linters.template.json` — template de bootstrap com 3 exemplos: `lint-01-no-circular-imports` (rg-based circular deps, enabled), `lint-02-screen-no-direct-infra` (rg-based layering, enabled), `lint-03-type-schema-match` (python script, disabled)

**Rules modificadas (1):**
- `.claude/rules/execution-contracts.md` — expansao aditiva do schema. Novo campo opcional `architecture_linters_required` (array de linter ids) no phase contract. Nova subsecao com 4 regras: (1) cada id deve existir em `architecture-linters.json` com `enabled: true`, (2) compatibilidade scope/phase_id com phase_id do contrato, (3) presenca no array e gate obrigatorio independente de `severity` (Ajuste 1), (4) referencia quebrada = `INVALID_LINTER_REF` via R2.2

**Commands modificados (2):**
- `ship-check.md` — adicionado **Bloco 0.8 — Architecture linters (gate estrutural)** entre Bloco 0.7 (behaviours) e Bloco A (release viability). 7 substeps (localizar declaracao, consumir `architecture-linters-last-run.json`, aplicar staleness por scope, mapear verdict/blocking_failures, gate bloqueante por `blocking_failures > 0`, gate de ressalva por `PARTIAL`/`NEVER_RUN`/staleness/warn failures, read-only absoluto). Veredicto Final estendido: `NAO PRONTO` inclui `blocking_failures > 0` em linters; `PRONTO COM RESSALVAS` inclui `PARTIAL`, `NEVER_RUN`, staleness, warn failures; `PRONTO` exige linters `PASS` fresco (ou `NO_LINTERS` — opt-in nao bloqueia). Principio de autoridade paralela estendido para 3 gates independentes (sensores, behaviours, architecture linters)
- `contract-check.md` — adicionado **Passo 7.7 — Cruzar com architecture linters (condicional)** apos Passo 7.6 (behaviours). 7 substeps (guard check para `architecture_linters_required` nao-vazio, validar ids contra `architecture-linters.json`, ler last-run, classificar cada linter required por status, aplicar staleness por scope, semantica dual — `FAIL_WARN` promovido a `FAIL_BLOCKING` por obrigacao contratual, read-only absoluto). Tabela R1-R10 estendida com R2.2 (`FAIL_BLOCKING` ou `INVALID_LINTER_REF` em linter required → `FAILED`) e R5.2 (`NOT_RUN` / `UNSTABLE` / `STALE` → `AT_RISK`). Regras expandidas de 10 para 11

**Mudancas conceituais:**
- **Invariantes estruturais sao autoridade paralela a funcional estatico e runtime observavel.** Sensores respondem "o codigo compila/testa/lint passa". Behaviours respondem "o sistema rodando faz o que prometeu". Linters respondem "a estrutura do codigo respeita os invariantes declarados". Nenhum mascara o outro — camadas independentes com gates independentes
- **Exit code e unica autoridade.** O framework nao interpreta AST, grafos de import ou resolucao de modulos. Cada linter e um comando shell arbitrario — se retorna 0, passou; qualquer outro valor, falhou. O agente nao pode reinterpretar output textual como sucesso quando exit code diz o contrario
- **Semantica dual: severity vs obrigacao contratual.** `severity` (block/warn) e propriedade do linter e governa impacto operacional no `/ship-check`. `architecture_linters_required[]` e propriedade do contrato e governa obrigacao contratual no `/contract-check`. Duas semanticas coexistem sem conflito: um linter com `severity: warn` que esta listado em `architecture_linters_required[]` nao bloqueia o `/ship-check` mas bloqueia o `/contract-check`
- **Staleness com aproximacao por scope.** Criterio de staleness nao e "qualquer arquivo-fonte mudou" (scope amplo demais) mas sim "arquivos potencialmente cobertos pelo linter mudaram" com aproximacao: `scope: global` → arquivos-fonte relevantes; `scope: phase` → arquivos associados ao `phase_id`. Quando delimitacao e impossivel, aplicar regra conservadora e reportar explicitamente como tal
- **Consumers sao read-only absolutos.** `/contract-check` e `/ship-check` nunca invocam `/lint-architecture`. Eles apenas leem `architecture-linters-last-run.json`, aplicam staleness, cruzam com suas proprias fontes e reportam. Rodar `/lint-architecture` e responsabilidade humana — preserva determinismo
- **Opt-in pattern (mesmo de sensores/behaviours/contracts/sprints).** Projetos sem `architecture-linters.json` operam em modo degradado: consumers reportam `NO_LINTERS` como lacuna informativa e nao bloqueiam veredicto. Projetos que declaram linters mas nunca executam recebem `NEVER_RUN` — lacuna explicita, nao silenciosa
- **Hardening obrigatorio de `command`.** `timeout_seconds` obrigatorio sem default; `requires_network` default false; read-only por contrato; proibido escrever em `.claude/runtime/`/`rules/`/`commands/`; exit code e unica autoridade; output textual nao e reinterpretado

**Regra de auto-modificacao do framework (mantida):** trabalho sobre o proprio framework (criar rule, command, template) nao aplica o workflow padrao (`/plan-review`, Codex review, marker `.plan-approved`). O ciclo `/plan` → aprovacao direta do usuario → implementacao e suficiente.

### Pós-V4 — Active Handoff Operacional

Sexto item da fila de prioridades. Corrige uma lacuna operacional entre sessoes: ate agora, o hook `session-summary.sh` existia mas gerava um resumo narrativo (truncava `last_assistant_message` em 500 chars) que nao respondia as perguntas que um dev realmente faz ao retomar trabalho depois de horas/dias. O novo formato e um **handoff operacional estruturado em 6 secoes** que responde perguntas especificas de continuidade (onde estamos / o que esta ativo / o que acabou de acontecer / o que falta fazer / o que bloqueia / fonte de verdade), com cada secao citando explicitamente a fonte consultada.

**Principio central:** o handoff **nunca** e fonte de verdade. E uma **view derivada** do trio (ledger + snapshot + MEMORY.md), sobrescrita a cada Stop, subordinada a hierarquia de `state-sync.md`. Nao substitui o ledger nem a memoria — traduz o estado atual em 6 perguntas operacionais concretas.

**Hooks modificados (1):**
- `.claude/hooks/session-summary.sh` — reescrito integralmente. Adiciona 3 guards (jq disponivel / stdin lido / `stop_hook_active` guard contra loop), helpers de leitura (`read_json_field` para JSON com fallback, `extract_section` via awk por cabecalho de secao), 7 getters (`get_where_we_are`, `get_active_phase`, `get_active_sprint`, `get_active_contract`, `get_last_event`, `get_open_items`, `get_blockers`), e grava o handoff via heredoc atomico. Timestamp em ISO-8601 UTC (`date -u +"%Y-%m-%dT%H:%M:%SZ"`), alinhado com sensors-last-run.json / behaviours-last-run.json / contracts. Abandona completamente o fallback de `last_assistant_message` — o handoff nao depende mais da narrativa da ultima mensagem. Nao emite stdout (Stop hooks nao aceitam systemMessage) e sai silencioso (exit 0).

**Artefatos novos de runtime (1):**
- `.claude/runtime/contracts/active.json` — ponteiro null-safe da fase ativa. Fecha assimetria historica com `active-sprint.json` (que ja existia null-safe). Bootstrap com `{active_phase_id: null, active_contract_path: null, last_updated: null}`. O `/contract-create` atualiza ao aprovar; transicao de fechamento de fase e manual (reset para null). Consumido pelo `session-summary.sh` (secao 2) e por `/contract-check` / `/ship-check` / `/verify-spec` downstream.

**Artefatos atualizados (1):**
- `.claude/runtime/session-summaries/latest.md` — regravado em modo demonstracao para refletir o novo formato de 6 secoes. Em framework self (sem ledger proprio), todos os campos caem para fallback explicito ("projeto sem estado previo" / "nenhum evento registrado" / "sem itens abertos" / "nenhum bloqueio ativo"). O arquivo e sobrescrito na primeira execucao real do hook numa sessao com ledger carregado.

**Commands modificados (1):**
- `.claude/commands/status-check.md` — clarificacao minima de compatibilidade (sem mudanca semantica). Item 9 de "O que verificar" e entrada "Last Session Summary" no formato de saida passam a referenciar o novo formato de 6 secoes estruturadas explicitamente. O command continua lendo `latest.md` como leitor, nao como escritor — preserva o principio de que o handoff nao e fonte de verdade.

**Mudancas conceituais:**
- **Handoff e view derivada, nao fonte de verdade.** Cada uma das 6 secoes cita a fonte que consultou. Nenhuma secao afirma nada que nao esta no ledger, nos ponteiros ou no trio. Em caso de divergencia entre handoff e ledger, o ledger prevalece — e o handoff sera regravado na proxima Stop a partir do ledger correto.
- **Operacional, nao narrativo.** O formato antigo truncava a ultima mensagem do agente em 500 chars (campo `last_assistant_message` do payload Stop). O novo formato nao usa `last_assistant_message` em nenhuma parte — responde diretamente as 6 perguntas que um dev realmente faz ao retomar trabalho, com dados estruturados do ledger e dos ponteiros de contrato.
- **Complementa `context-loading.md`, nao substitui.** `context-loading.md` define o protocolo de leitura no **inicio** de commands (snapshot primeiro, ledger como fallback). O handoff e sinal gerado no **fim** da sessao (Stop hook). As duas camadas sao ortogonais: context-loading e leitor de entrada, handoff e artefato de saida.
- **Parser minimo do ledger.** O hook nao pretende ser AST completo de markdown. Usa awk por cabecalho de secao (`^## Current Status` / `^## Open Items` / `^## Blockers`), grep -oE para regex de data ISO-8601 (`[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9:]+Z?)?`) e jq para ponteiros JSON. Ledgers fora do template padrao do framework podem gerar fallback textual — esta e a primeira versao, nao pretende cobrir todas as variacoes de markdown.
- **Decisao: ultimo evento cronologico, nao Open Items.** A secao 3 ("o que acabou de acontecer") usa **a ultima linha do ledger com timestamp ISO-8601**, nao o primeiro Open Item. Razao: Open Items representam o que falta fazer (futuro), nao o que acabou de acontecer (passado). O ultimo evento cronologico e o sinal mais honesto de "onde estamos na linha do tempo do projeto".
- **ISO-8601 UTC em toda a camada de runtime.** Alinhamento explicito com sensors-last-run.json / behaviours-last-run.json / contracts / active.json — todos usam ISO-8601 UTC. `date -u +"%Y-%m-%dT%H:%M:%SZ"` e a fonte canonica de timestamp no hook.
- **Bootstrap do active.json fecha assimetria historica.** Antes deste item, `active-sprint.json` ja existia null-safe (criado com sprint system), mas `active.json` era criado apenas no momento em que `/contract-create` aprovava um contrato — o que gerava erro de leitura em projetos que nunca tinham criado contrato. Bootstrap null-safe resolve: qualquer projeto recem-clonado do framework tem os dois ponteiros disponiveis para leitura, mesmo antes de qualquer contrato/sprint ser criado.
- **Compatibilidade explicita com `/status-check`.** O command existente ja consumia `latest.md`. O novo formato preserva a mesma extensao (`.md`), mesmo path, mesma operacao de leitura — apenas o conteudo interno muda. `status-check.md` recebeu clarificacao de formato (sem mudanca semantica) para garantir que o consumidor entende as 6 secoes como handoff operacional, nao como resumo narrativo de uma mensagem.
- **Decisao: NAO criar /handoff-update.** O handoff e gerado **apenas** pelo Stop hook. Nao ha command manual para regerar o arquivo — regerar seria criar oportunidade de desatualizacao intencional vs o estado real da sessao. A proxima Stop regerara automaticamente a partir do estado vigente do ledger.
- **Decisao: NAO criar runtime/handoff.md separado.** Reusar `.claude/runtime/session-summaries/latest.md` (que ja existia, ja era consumido por `/status-check`, ja tinha diretorio criado). Criar arquivo novo geraria confusao sobre "qual handoff e o oficial" e introduziria nova fonte de verdade potencial — violando o principio central de que o handoff e subordinado ao trio.
- **Decisao: NAO ler sensors-last-run.json / behaviours-last-run.json no hook.** Razao de escopo: o hook e operacional ("onde estamos agora"), nao de verificacao mecanica ("o codigo compila/testa"). Sensores e behaviours tem seus proprios commands de leitura (`/sensors-run`, `/behaviour-run`, `/ship-check`) e os consumidores downstream ja os cruzam. Incluir essas leituras no hook duplicaria responsabilidade entre camadas.

**Regra de auto-modificacao do framework (mantida):** trabalho sobre o proprio framework (criar rule, command, template, hook) nao aplica o workflow padrao (`/plan-review`, Codex review, marker `.plan-approved`). O ciclo `/plan` → aprovacao direta do usuario → implementacao e suficiente.

### Pós-V4 — Behaviour/Runtime Harness

Quinto item da fila de prioridades derivada da análise de Harness Engineering. Sensores (item #2) cobrem correção funcional estática (exit code de test/lint/type-check/build). Execution contracts (item #3) declaram compromisso upstream da fase. Sprint contracts (item #4) fecham ciclo curto dentro da fase. Behaviours fecham a lacuna complementar: **"análise estática passa, sensor passa, mas o comportamento real em runtime não é o prometido"**. Um behaviour dispara uma ação real contra o sistema (HTTP request, CLI invocation, inspeção de estado), compara o resultado observado contra expectativas declaradas (`stdout_contains`, `stdout_json_path`, `file_content`, `file_exists_after`, `not_contains`, `exit_code`), e produz evidência estruturada expected-vs-actual — a autoridade do veredicto vem da comparação mecânica, não da narrativa do agente.

Sensores e behaviours são **camadas paralelas e independentes**: sensores cobrem "o código testa/compila/tipa", behaviours cobrem "o sistema rodando responde o que prometeu". Um cenário pode ser coberto por ambos, por um só ou por nenhum. Quando ambos cobrem o mesmo cenário e um deles falha, o rebaixamento é determinístico — o ambiente é autoridade dupla.

**Rules novas (1):**
- `.claude/rules/behaviour-harness.md` — contrato completo de behaviours. Schema (`behaviours[]` com `id`, `description`, `phase_id`, `contract_ref`, `type`, `action.command`, `action.timeout_seconds`, `expectations[]`, `on_fail`, `requires`, `enabled`), 6 tipos de expectation (`exit_code`, `stdout_contains`, `stdout_json_path`, `file_content`, `file_exists_after`, `not_contains`), 8 regras de hardening da `action.command` (timeout obrigatório, sem rede por default, read-only por contrato, exit code capturado, sem side-effects em artefatos do framework, ambiente isolado, etc.), 3 regras de staleness (`behaviours.json` modificado após run, phase contract alterado após run, behaviour `enabled: true` ausente do último run), bidirectional binding (`contract_ref` no behaviour AND `behaviour_id` no AC), vedações, bootstrap

**Commands novos (1):**
- `.claude/commands/behaviour-run.md` — executor único dos behaviours declarados. 11 passos (context loading, localizar `behaviours.json`, validar schema, filtrar por flags, resolver dependências de ambiente, executar cada behaviour sequencialmente, capturar stdout/stderr/exit_code, comparar contra `expectations[]`, agregar status B1-B3 por behaviour, agregar veredicto V1-V4 global, persistir em `behaviours-last-run.json`, atualizar ledger). Flags: `--offline` (pula behaviours com `requires.network: true`), `--no-db` (pula behaviours com `requires.database: true`), `--no-server` (pula behaviours com `requires.running_server: true`), `--only <id>`, `--skip <id>`, `--phase <phase_id>`. **Único command que executa behaviours** — consumers downstream são read-only absolutos

**Artefatos novos de runtime (3):**
- `.claude/runtime/behaviours.json` — declaração dos behaviours do projeto (versionado no Git)
- `.claude/runtime/behaviours-last-run.json` — veredicto estruturado expected-vs-actual da última execução (pode ficar fora do Git)
- `.claude/runtime/behaviours.template.json` — template de bootstrap com 5 exemplos: `b-01-login-success` (http + file_content + not_contains, linked AC1), `b-02-cli-build-idempotent` (cli + file_exists_after, linked AC2), `b-03-health-endpoint-json` (http + stdout_json_path com jq, linked AC3), `b-04-logs-no-secrets` (state + not_contains regex, on_fail: warn, sem contract_ref), `b-05-rate-limit-returns-429` (http + stdout_contains, linked AC4, disabled por default)

**Rules modificadas (1):**
- `.claude/rules/execution-contracts.md` — expansão aditiva do schema. `acceptance_criteria[].verifiable_by` agora aceita o valor `"behaviour"`; novo campo opcional `behaviour_id` referencia o behaviour em `behaviours.json`. Nova subseção com 5 regras de bidirectional binding: (1) `contract_ref` no behaviour deve bater com `phase_id` e `ac.id` do contrato, (2) `behaviour_id` no AC deve existir em `behaviours.json`, (3) o par (contract → behaviour e behaviour → contract) deve estar declarado em ambas as pontas, (4) AC com `verifiable_by: "behaviour"` sem `behaviour_id` ou apontando para behaviour ausente/desabilitado é binding gap detectável por `/contract-check`, (5) behaviour com `contract_ref` mas o contrato não declara o AC correspondente também é binding gap

**Commands modificados (3):**
- `contract-check.md` — adicionado **Passo 7.6 — Cruzar com behaviours runtime** após Passo 7.5 (sprints informativos). 6 substeps (localizar `behaviours-last-run.json`, validar schema, aplicar 3 regras de staleness, cruzar `contract_ref` de cada behaviour com ACs, classificar cada AC por status do behaviour, agregar contagens para veredicto). Tabela R1-R10 estendida com R2.1 (behaviour `FAIL_BLOCKING` / `INVALID_BEHAVIOUR_REF` / `BINDING_GAP` → `FAILED`), R5.1 (`NOT_RUN` / `UNSTABLE` / `STALE` → `AT_RISK`), R6.1 (`FAIL_WARN` → `AT_RISK`). Nova seção "Behaviours runtime" no output. Regras expandidas de 7 para 10 incluindo autoridade do behaviour, staleness-never-PASS, bidirectional binding mandatório. **Read-only absoluto** — nunca invoca `/behaviour-run`
- `ship-check.md` — adicionado **Bloco 0.7 — Behaviours runtime (gate de comportamento observável)** entre Bloco 0.6 (sprints informativos) e Bloco A (release viability). 7 substeps (localizar declaração, consumir `behaviours-last-run.json`, aplicar staleness, mapear `verdict`/`blocking_failures`, gate bloqueante por `blocking_failures > 0`, gate de ressalva por `PARTIAL`/`NEVER_RUN`/staleness/warn failures, read-only absoluto). Veredicto Final estendido: `NÃO PRONTO` inclui `blocking_failures > 0` em behaviours; `PRONTO COM RESSALVAS` inclui `PARTIAL`, `NEVER_RUN`, staleness, warn failures; `PRONTO` exige behaviours `PASS` fresco (ou `NO_BEHAVIOURS` — opt-in não bloqueia). Nova subseção "Princípio de autoridade paralela" explicando que sensores (Bloco 0) e behaviours (Bloco 0.7) são gates independentes — nenhum mascara o outro
- `verify-spec.md` — adicionado **Passo 4.6 — Cruzar com behaviours runtime** após Passo 4.5 (contrato). 7 substeps (localizar declaração, consumir último run, aplicar staleness, mapear behaviours para cenários/entregas via `contract_ref` indireto ou descrição direta, rebaixar cenários `IMPLEMENTADO` quando runtime evidence adversa, detectar binding gaps, princípio de autoridade paralela com sensores). Regras de rebaixamento na ordem: (1) behaviour `fail` block em cenário `IMPLEMENTADO` → rebaixa para `NÃO COBERTO`, (2) behaviour `fail` warn → marca informativa sem rebaixar, (3) behaviour stale → rebaixa para `PARCIAL`, (4) behaviour `unknown`/`timeout` → marca informativa, (5) behaviour `pass` em cenário `NÃO VERIFICÁVEL` → **promove** para `COBERTO`. Passo 5 (Resumo) estendido com seção "Evidência mecânica aplicada" (tabela sensores/contrato/behaviours), "Rebaixamentos por evidência runtime adversa", "Binding gaps detectados", e Veredicto reescrito com 3 regras ordenadas (`NÃO CONFORME` → `CONFORME COM LACUNAS` → `CONFORME`) considerando as 3 fontes de evidência. **Read-only absoluto**

**Mudanças conceituais:**
- **Runtime observável é autoridade paralela a funcional estático.** Sensores respondem "o código testa/compila/tipa". Behaviours respondem "o sistema rodando faz o que prometeu". Nenhum mascara o outro — cenário coberto por ambos precisa que ambos passem para ser considerado completo. A autoridade é do ambiente, não da narrativa do agente
- **Expected-vs-actual estruturado é o contrato de evidência.** O agente não diz "testei o login e funcionou" — o behaviour executa `curl -X POST /api/login`, captura stdout+stderr+exit_code, compara contra `expectations[]` declarado (`exit_code: 0`, `stdout_contains: "200"`, `file_content: "Set-Cookie: session="`, `not_contains: "error"`), e o veredicto do behaviour é a agregação mecânica da comparação
- **Hardening obrigatório da `action.command`.** `timeout_seconds` obrigatório; read-only por contrato; sem rede por default (`requires.network: false`); proibido escrever em `.claude/runtime/`, `.claude/rules/`, `.claude/commands/`; exit code é única autoridade; output textual não é reinterpretado como sucesso. Hardening enforced tanto em `/behaviour-run` (execução) quanto em `contract-check`/`ship-check`/`verify-spec` (detecção de binding gap)
- **Staleness nunca é PASS.** Se `behaviours.json` foi modificado após o run, ou se phase contract foi aprovado/modificado após o run, ou se há behaviour `enabled: true` sem entrada em `results[]`, o resultado é considerado stale. Consumers reportam staleness como lacuna informativa e rebaixam veredicto — **nunca** assumem que rodar `/behaviour-run` resolve a staleness automaticamente, porque consumers são read-only absolutos
- **Bidirectional binding obrigatório.** Se o contrato declara `verifiable_by: "behaviour"` no AC, deve declarar `behaviour_id` explícito, E o behaviour deve declarar `contract_ref` apontando para o AC. Qualquer uma das pontas ausente é binding gap detectável por `/contract-check` e `/verify-spec`. Contratos e behaviours não podem divergir silenciosamente
- **Consumers são read-only absolutos.** `/contract-check`, `/ship-check` e `/verify-spec` **nunca** invocam `/behaviour-run`. Eles apenas lêem `behaviours-last-run.json`, aplicam staleness, cruzam com suas próprias fontes (contrato/spec) e reportam. Rodar `/behaviour-run` é responsabilidade humana — é execução de ação real contra o sistema, não pode ser efeito colateral de verificação. Preserva determinismo: rodar qualquer consumer múltiplas vezes é seguro e não muda o estado do ambiente
- **Opt-in pattern (mesmo dos sensores/execution contracts/sprints).** Projetos sem `behaviours.json` operam em modo degradado: consumers reportam `NO_BEHAVIOURS` como lacuna informativa e **não bloqueiam veredicto**. Diferente de `NO_SENSORS` que é débito técnico, `NO_BEHAVIOURS` é aceitável — behaviours são ferramenta complementar para projetos com superfície runtime observável (HTTP, CLI, state), não obrigatórios para todos
- **`type` field é informativo em v1.** `http | cli | state | custom` serve apenas para categorização em relatórios. A execução é uniforme (todos via `sh -c` com timeout + captura de exit code + captura de stdout/stderr). Semântica específica por tipo (ex: parsear resposta HTTP automaticamente) é evolução futura

**Regra de auto-modificação do framework (mantida):** trabalho sobre o próprio framework (criar rule, command, template) não aplica o workflow padrão (`/plan-review`, Codex review, marker `.plan-approved`). O ciclo `/plan` → aprovação direta do usuário → implementação é suficiente.

### Pós-V4 — Sprint Contracts (granularidade intra-fase)

Quarto item da fila de prioridades derivada da análise de Harness Engineering. Sensores (item #2) fecharam "o ambiente não confirma"; execution contracts (item #3) fecharam "a fase não declara upstream o que está prometendo entregar"; sprints (item #4) fecham **"dentro da fase, não há ciclo curto de feedback mecânico sobre entregas atômicas"**. Um phase contract declara compromisso em escala de dias/semanas. Um sprint declara compromisso em escala de horas — unidade atômica de entrega com evaluator determinístico que produz verdict pass/fail a cada execução.

O sprint é a sub-unidade operacional da fase. O phase contract permanece imutável; o vínculo fase → sprints é derivado do filesystem (`runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json`), preservando o princípio de imutabilidade do compromisso de fase. Sprints são opt-in — projetos que não declaram sprints operam em modo degradado, igual ao padrão de sensores e execution contracts.

**Rules modificadas (1):**
- `.claude/rules/execution-contracts.md` — adicionada seção "Sprint contracts (granularidade intra-fase)" com invariantes (phase immutability, pointers independentes, append-only history, human-confirmed transitions), hierarquia de filesystem, comparação sprint × phase contract, lifecycle, tipos de check do evaluator, hardening do `custom_command`, modos de agregação, bootstrap. Adicionadas 2 vedações ("não mutar phase contract ao criar/avaliar/fechar sprint", "não acoplar active-sprint.json a active.json") e subseção de bootstrap adicional opcional

**Commands novos (3):**
- `.claude/commands/sprint-create.md` — cria sprint contract a partir do phase contract ativo. 10 passos (verificar pré-requisitos, coletar metadados, definir deliverables, construir evaluator com hardening de `custom_command`, sintetizar draft, apresentar ao usuário, persistir, segunda confirmação draft→approved, atualizar ledger, output). Aprovação exige segunda confirmação explícita, igual ao phase contract. Atualiza `active-sprint.json` apenas ao aprovar
- `.claude/commands/sprint-evaluate.md` — executa evaluator do sprint ativo contra o estado real. 9 passos (localizar sprint, verificar status, verificar sensors stale, executar cada check, agregar verdict, construir entrada, persistir append-only em `evaluation_history`, atualizar ledger, reportar). **Append-only estrito** — nunca transiciona status, nunca preenche `verdict`/`verdict_reason`, nunca modifica phase contract ou `active.json`. 4 tipos de check (`file_exists`, `grep_pattern`, `sensor_subset`, `custom_command`) com hardening obrigatório do `custom_command` (timeout obrigatório, read-only, exit code único). Modos de agregação `all` (default) e `threshold` (requer justificativa)
- `.claude/commands/sprint-close.md` — transiciona sprint de `approved|in_progress` para `passed | failed | deferred`. **Único command que altera `status` e `verdict`**. 9 passos (localizar, verificar fechabilidade, resolver target, consultar `evaluation_history` para coerência informativa, coletar `verdict_reason`, apresentar resumo, persistir com detecção de conflito, atualizar ledger, reportar). Sempre human-confirmed. `verdict_reason` obrigatório para `failed`/`deferred`, opcional para `passed`. Warnings fortes quando target diverge do verdict mecânico. Reset de `active-sprint.json` para null. **Nunca modifica** phase contract, `active.json` ou outros sprints

**Artefatos novos de runtime (2):**
- `runtime/contracts/sprints/<parent_phase_id>/<sprint_id>.json` — sprint contract individual (schema_version, sprint_id, parent_phase_id, title, goal, estimated_duration, status, deliverables, evaluator, evaluation_history, verdict, verdict_reason, timestamps)
- `runtime/contracts/active-sprint.json` — ponteiro para o sprint ativo (separado e independente de `active.json`; reset para null após fechamento)

**Commands modificados (2):**
- `contract-check.md` — adicionado **Passo 7.5 — Coletar sprints da fase (informativo)** entre acceptance criteria e agregação de veredicto. Estritamente informativo — sprints **não afetam a tabela R1-R10 do veredicto**. Coleta dados de cada sprint, identifica sprint ativo, agrega contagens, apresenta tabela no output. Princípio: phase contract é autoridade sobre compromisso da fase; sprints são sub-granularidade operacional
- `ship-check.md` — adicionado **Bloco 0.6 — Sprints da fase (informativo, não-bloqueante)** entre Bloco 0.5 (contrato) e Bloco A (release viability). Mesmo padrão do contract-check: coleta dados, identifica sprint ativo, agrega contagens, apresenta tabela. **Não adiciona regras ao "Veredicto Final"** — sprints nunca bloqueiam ship-check. Princípio: phase contract do Bloco 0.5 já é a autoridade sobre compromisso da fase; adicionar gating por sprint conflataria responsabilidades

**Mudanças conceituais:**
- **Phase contract permanece imutável.** O vínculo fase → sprints é derivado do filesystem (diretório `sprints/<parent_phase_id>/`), nunca por mutação do phase contract. Criar, avaliar ou fechar sprint **jamais** toca o phase contract. Este é o invariante central da implementação de sprint contracts
- **Pointers independentes.** `active.json` (phase) e `active-sprint.json` (sprint) são ponteiros separados. Fase pode continuar ativa com `active-sprint.json` resetado para null; não há "sprint automático por fase"
- **Append-only de `evaluation_history`.** `/sprint-evaluate` acumula entradas; nunca sobrescreve. Histórico de verdicts mecânicos é registro permanente e auditável
- **Transições de status são sempre human-confirmed.** `/sprint-evaluate` reporta verdict mecânico mas **nunca** transiciona status. Apenas `/sprint-close` transiciona, sempre com confirmação humana, mesmo quando verdict mecânico é `pass` consistente. Princípio: exit code é autoridade sobre comportamento mecânico, mas o compromisso de entrega é humano
- **Hardening obrigatório do `custom_command`.** `timeout_seconds` obrigatório; read-only por contrato; sem writes em `.claude/runtime/`/`rules/`/`commands/`; exit code é única autoridade; `requires_network: false` default; timeout > 120s gera aviso de que deveria ser sensor. Hardening é enforced tanto em `/sprint-create` (validação no draft) quanto em `/sprint-evaluate` (re-validação antes da execução)
- **`sensor_subset` consome, não executa.** Se `sensors-last-run.json` está ausente ou stale, o check retorna `unknown` — `/sprint-evaluate` nunca dispara `/sensors-run`. Sensores e sprints são camadas ortogonais que coexistem
- **Sprints são informativos em `/contract-check` e `/ship-check`.** Nunca afetam veredicto dos consumers downstream. O phase contract é autoridade sobre compromisso da fase; sprints são visibilidade operacional adicional

**Regra de auto-modificação do framework (mantida):** trabalho sobre o próprio framework (criar command, rule, template) não aplica o workflow padrão (`/plan-review`, Codex review, marker `.plan-approved`). O ciclo `/plan` → aprovação direta do usuário → implementação é suficiente.

### Pós-V4 — Execution Contracts (upstream)

Terceiro item da fila de prioridades derivada da análise de Harness Engineering. Sensores (item #2) fecharam a lacuna "o ambiente não confirma"; contratos fecham a lacuna complementar **"a fase não declara upstream o que está prometendo entregar"**. Até agora, o plano descrevia como implementar (prosa) e o ledger registrava o histórico (eventos), mas nada declarava formalmente o compromisso da fase em formato estruturado e mecanicamente verificável.

O contrato é a declaração upstream do que a fase promete. O plano continua sendo a prosa de COMO implementar. O ledger continua sendo o histórico. Os sensores continuam sendo a validação mecânica de comportamento. O contrato soma-se a esses três como a **declaração estruturada do escopo comprometido** — é o artefato que `/contract-check`, `/ship-check` e `/verify-spec` consomem para validar progresso e aderência ao compromisso.

**Rules novas (1):**
- `.claude/rules/execution-contracts.md` — contrato completo de execution contracts. Schema JSON (phase_id, title, status, deliverables, acceptance_criteria, sensors_required, preconditions, out_of_scope, rollback_plan, evidence), lifecycle (draft → approved → in_progress → done/failed/rolled_back/deferred), regras de verificação mecânica por `verifiable_by` (file_exists, grep_pattern, sensor, manual_check), integração com sensores como autoridade, vedações, bootstrap

**Commands novos (2):**
- `.claude/commands/contract-create.md` — cria contrato estruturado a partir do plano aprovado. 8 passos (verificar pré-requisitos, ler plano, consultar sensores, sintetizar draft, apresentar ao usuário, persistir, atualizar ledger, output). Requer plan-review aprovado como pré-requisito. Transição `draft → approved` exige segunda confirmação explícita do usuário
- `.claude/commands/contract-check.md` — verifica estado do projeto contra o contrato ativo da fase. **Estritamente read-only** — nunca modifica contrato, ledger ou active.json. 9 passos (localizar contrato, verificar staleness, verificar status, verificar preconditions, verificar deliverables, verificar sensors_required, verificar acceptance_criteria, agregar veredicto, reportar). Veredicto determinístico via tabela R1-R10 ordenada (FAILED → AT_RISK → ON_TRACK → READY_TO_CLOSE)

**Artefatos novos de runtime (3):**
- `.claude/runtime/contracts/` — diretório de contratos por fase (um arquivo JSON por phase_id, ex: `phase-01-ui-shell.json`)
- `.claude/runtime/contracts/active.json` — ponteiro para o contrato da fase ativa (atualizado automaticamente por `/contract-create` ao aprovar)
- `.claude/runtime/contracts.template.json` — template de contrato de execução com exemplos de deliverables, acceptance_criteria e sensors_required

**Commands modificados (2):**
- `ship-check.md` — adicionado **Bloco 0.5 — Contrato de execução ativo (gate contratual)** entre Bloco 0 (sensores) e Bloco A. Consome `active.json`, invoca `/contract-check` quando status é `approved` ou `in_progress`, e mapeia veredicto do contract-check para veredicto do ship-check: `FAILED` → `NÃO PRONTO` (incondicional), `AT_RISK` → `PRONTO COM RESSALVAS`, `ON_TRACK` → rebaixamento, `READY_TO_CLOSE` → libera Bloco A. Formato de saída atualizado com bloco de Contrato de Execução. Veredicto Final reescrito com 3 regras ordenadas considerando contrato + sensores + risk-assessment + Bloco A
- `verify-spec.md` — adicionado **Passo 4.5 — Cruzar com contrato de execução ativo** após consumo de sensores. Cruza entregas da spec com deliverables do contrato (mapeamento Direto/Indireto/Sem mapeamento). Entrega mapeada a deliverable `required: true` com status `MISSING`/`FAIL` é **rebaixada** para PARCIAL/NÃO IMPLEMENTADA mesmo que análise estática tenha encontrado código — o contrato é autoridade sobre compromisso da fase. Detecta scope drift positivo (código além do contrato) e scope gap (spec com entrega sem contrato)

**Mudanças conceituais:**
- **Contrato é upstream, ledger é histórico, plano é prosa, sensores são mecânica.** Os quatro artefatos coexistem sem sobreposição: contrato declara O QUE, plano descreve COMO, ledger registra O QUE ACONTECEU, sensores verificam SE ESTÁ FUNCIONANDO
- **Opt-in pattern (mesmo dos sensores):** projetos sem contratos declarados operam em modo degradado. Commands consumidores reportam a ausência como lacuna explícita (NO_CONTRACT), não bloqueiam automaticamente. Declaração é responsabilidade do projeto, não inferida pelo framework
- **Contrato approved exige segunda confirmação.** O usuário vê o draft, revisa campo por campo, e confirma explicitamente. Não é automático. Contratos aprovados representam compromisso formal — mudança de escopo exige novo contrato (v2), não edição silenciosa do anterior
- **Sensores são autoridade sobre comportamento mecânico, contratos são autoridade sobre compromisso da fase.** Se o contrato diz `deliverable D3 é required` e o sensor que o cobre está `FAIL_BLOCKING`, o `/contract-check` retorna `FAILED` — nenhum agente pode reinterpretar o output como sucesso. Princípio de autoridade do ambiente estendido: hooks + sensores + contratos são as três camadas que o agente não pode contradizer
- **`/contract-check` é read-only absoluto.** Validação estática, nunca modifica artefato. Transições de status (draft→approved, approved→in_progress, in_progress→done/failed) são feitas por `/contract-create`, pelo command de início de fase, ou manualmente pelo usuário — nunca inferidas pelo contract-check. Isso garante que rodar `/contract-check` múltiplas vezes é seguro e determinístico

**Regra de auto-modificação do framework (mantida da entrada anterior):** trabalho sobre o próprio framework (criar rule, command, template) não aplica o workflow padrão (`/plan-review`, Codex review, marker `.plan-approved`). O ciclo `/plan` → aprovação direta do usuário → implementação é suficiente.

### Pós-V4 — Camada de Sensores Mecânicos

Resposta direta à análise de Harness Engineering (Fowler + Anthropic + OpenAI) que identificou a lacuna central do framework até V4: **o agente narra "validado", mas o ambiente não confirma**. Com sensores, o ambiente é quem diz.

**Rules novas (1):**
- `.claude/rules/sensors.md` — contrato completo de sensores mecânicos. Princípios (exit code como verdade, declarativo, estruturado), schema de `sensors.json` e `sensors-last-run.json`, tipos de sensor (test/lint/type-check/build/security-scan/custom), regras de agregação de veredicto (PASS/FAIL/PARTIAL/NO_SENSORS), staleness, vedações, relação com hooks, bootstrap

**Commands novos (1):**
- `.claude/commands/sensors-run.md` — executa sensores declarados sequencialmente, captura exit code, persiste veredicto estruturado em `sensors-last-run.json`, atualiza ledger. Suporta flags `--offline`, `--no-db`, `--only <id>`, `--skip <id>`

**Artefatos novos de runtime (2):**
- `.claude/runtime/sensors.template.json` — template de bootstrap com 6 exemplos de sensor (unit-tests, lint, type-check, build, deps-audit, custom-structure-check)
- `.claude/runtime/sensors-last-run.json` — veredicto estruturado da última execução (efêmero; pode ficar fora do Git)

**Commands modificados (2):**
- `ship-check.md` — adicionado **Bloco 0 — Sensores mecânicos (gate prévio ao Bloco A)**. Consome `sensors-last-run.json`, mapeia sensores para itens do Bloco A (test→A2, lint/type→A3, build→A1, security-scan→A5), e **`blocking_failures > 0` força veredicto `NÃO PRONTO` incondicionalmente** — mesmo com risk-assessment LOW_RISK e tudo mais OK. Formato de saída atualizado para exigir citação explícita do sensor id na coluna de evidência
- `verify-spec.md` — reescrito **Passo 4 — Verificações dinâmicas**. Antes executava comandos ad-hoc; agora consome `sensors-last-run.json` como fonte autoritativa de comportamento mecânico. Cenário marcado como `IMPLEMENTADO` por análise estática é **rebaixado** automaticamente se o sensor de teste que cobre o fluxo está em `status: fail`. Regra explícita: "o agente não pode contradizer o ambiente"

**Hook corrigido (1):**
- `hooks/loop-detection.sh` — fix da contradição crítica entre promessa semântica e comportamento real. Variáveis (`BLOCK_THRESHOLD`), comentários ("5ª edição: bloqueio") e mensagem ("[LOOP BLOCK] PARAR imediatamente") prometiam bloquear a 5ª edição de um mesmo arquivo, mas o hook apenas imprimia `systemMessage` — que é informativo, não bloqueante. Agora emite `{decision: "block", reason: ...}` via stdout JSON na 5ª edição (contrato canônico de PostToolUse para bloquear continuação do modelo), preservando semântica one-shot via `-eq` (não `-ge`) e mantendo advertência persistente nas edições subsequentes. Também adicionado guard de dependência `command -v jq`

**Mudanças conceituais:**
- Sensores e hooks são camadas ortogonais e complementares. Hooks rodam em evento (universais, baixo custo, detectam padrões estáticos). Sensores rodam sob demanda (declarativos por projeto, médio a alto custo, detectam correção funcional)
- Projetos sem `sensors.json` operam em modo degradado: commands consumidores reportam a ausência como lacuna explícita mas não bloqueiam. A declaração de sensores é responsabilidade do projeto, não inferida pelo framework a partir da stack
- Princípio de autoridade do ambiente: **se o comando retorna 0, o sensor passou. Se retorna qualquer outro valor, falhou.** Nenhum agente pode reinterpretar o output textual como sucesso quando o exit code diz o contrário

**Regra de auto-modificação do framework:** trabalho sobre o próprio framework (corrigir hook, criar rule, modificar command) **não aplica** o workflow padrão (`/plan-review`, Codex review, marker `.plan-approved`). O ciclo `/plan` → aprovação direta do usuário → implementação é suficiente. O workflow padrão é para projetos que **usam** o framework, não para o framework em si.

### V4 — Expansão de agents transversais e protocolos de invocação

**Rules novas (3):**
- `.claude/rules/context-loading.md` — protocolo obrigatório de carregamento de contexto (ledger + snapshot) no início de commands de análise
- `.claude/rules/review-quality.md` — self-check interno obrigatório antes de publicar veredicto de review
- `.claude/rules/agent-contracts.md` — formato padronizado de invocação, resposta, paralelismo e modos de falha de agents

**Agents novos (2):**
- `.claude/agents/risk-assessment.md` — agent transversal (model: sonnet com override opus) invocado condicionalmente por `/plan` e incondicionalmente por `/ship-check`. Avalia irreversibilidade, incógnitas, ponto único de falha, débito técnico e risco de migração
- `.claude/agents/qa-auditor.md` — agent especializado (model: sonnet com override opus) invocado por `/review` quando há código de produção no escopo. Detecta arquivos sem teste correspondente e classifica por Security Regression Matrix (classes A/B/C/D)

**Commands modificados (10):**
- `plan.md`, `spec-check.md`, `plan-review.md`, `review.md`, `ship-check.md`, `audit.md`, `db-audit.md`, `web-audit.md`, `k8s-audit.md`, `verify-spec.md` — todos passaram a aplicar `context-loading.md` no início
- `plan.md`, `plan-review.md`, `review.md` — também aplicam `review-quality.md` como self-check antes de publicar veredicto (onde aplicável)
- `plan.md` — invoca `risk-assessment` condicionalmente; também corrigiu referência defasada "6 passos" → "8 passos" de `.claude/rules/plan-construction.md`
- `ship-check.md` — invoca `risk-assessment` incondicionalmente como gate final
- `review.md` — invoca `qa-auditor` em paralelo com `code-reviewer` e `security-auditor` quando há código de produção

**Mudanças conceituais:**
- Taxonomia formal de agents: transversal × especializado
- Política de model explícita: `opus` default para síntese profunda, `sonnet` default + `opus` via override para análise estrutural
- Checklist de critérios para criar agent novo (evita over-engineering)
- Conceito de invocações múltiplas paralelas (independentes) vs sequenciais (dependentes) documentado em `agent-contracts.md`

**Correções técnicas incluídas no mesmo ciclo:**
- `hooks/health-check.sh` — removido resíduo de profile-guard bash 4+ (profiles foram enterrados definitivamente)
- `hooks/health-check.sh` — check `[ -x ]` com guard para Windows (Git Bash/Cygwin) onde NTFS não suporta bit POSIX de execução
- `hooks/security-check.sh` — removido comentário fóssil sobre profile-guard
- `hooks/pre-implementation-gate.sh` e `hooks/protect-files.sh` — adicionado guard `command -v jq` explícito. Ambos os hooks são de bloqueio (exit 2); sem jq, o parsing do stdin falhava silenciosamente e invertia o propósito do hook (liberava edição em vez de bloquear)
- `hooks/pre-implementation-gate.sh` e `hooks/protect-files.sh` — bug de pattern Windows: o padrão `*".claude/"*` (e `.git/`) usava forward slash, não casando com paths Windows que chegam com backslash. Normalização aplicada via `${var//\\//}` antes do matching
- `hooks/session-summary.sh` — removido `echo systemMessage` no stdout (Stop hooks não aceitam `systemMessage`, apenas `decision`/`reason`). Contrato do payload Stop documentado no próprio arquivo
- `settings.json` — removido `timeout: 3` inerte do `session-cleanup.sh` (o envelope global de SessionEnd é 1.5s; 3s não tinha efeito real)
- `commands/justify.md` — reescrito para Contrato A (gera bloco formatado para inserção manual pelo usuário, já que `allowed-tools: Read, Grep, Glob` não permite escrita)
- `runtime/pattern-registry.md` — header reescrito para deixar explícito que a escrita é sempre manual pelo usuário

### V3 — snapshot anterior

Framework base com spec-create, pre-implementation gate, skills-gap, padrões de erro reais incorporados (ver commits `56a759a` e `ba61200` para histórico detalhado).
