# Plan Construction — Procedimento de Construção de Planos

## Nota

Esta rule define o self-check interno que o `/plan` e o agent `planner` executam ao CONSTRUIR um plano.
Para verificacao formal e independente de um plano ja finalizado, usar o command `/plan-review`.
Total de passos: 12, mais pré-check obrigatório.

## Propósito

Definir o procedimento que o Claude Code deve executar antes de finalizar um plano de implementação. Este procedimento complementa `.claude/rules/implementation-quality.md` (que define o que pode estar errado) com instruções de como encontrar e corrigir problemas antes de apresentar o plano.

O Claude Code deve executar o pré-check obrigatório e os 12 passos ao criar planos via `/plan` ou via o agent `planner`.

---

## Pré-check Obrigatório (antes do Passo 1)

Antes de iniciar os 12 passos, executar duas verificações independentes que podem bloquear ou alterar o escopo do plano.

### Verificação 1 — OIs antes_do_plan

Carregar o ledger e listar nominalmente todos os Open Items com tag `antes_do_plan`. Para cada um:

- Status `DONE` → prosseguir
- Status diferente de `DONE` → parar e declarar: `"OI-XX está pendente e marcado como antes_do_plan — resolver antes de prosseguir com o planejamento."`

Não reportar apenas contagem; listar os IDs verificados e seus status.

### Verificação 2 — Artefatos do Framework Prometidos pela Spec

Varrer a spec por gatilhos específicos abaixo. Para cada gatilho encontrado, verificar se o plano cobre o artefato correspondente.

| Gatilho na spec | Artefato esperado no plano |
|---|---|
| `sensors.json`, `/sensors-run` | criação/validação de `.claude/runtime/sensors.json` + `/sensors-run` pós-implementação |
| `behaviours.json`, `/behaviour-run`, `runtime observável` | criação de `.claude/runtime/behaviours.json` + `/behaviour-run` |
| `execution contract`, `contrato de execução`, `/contract-create` | prever execução de `/contract-create` após aprovação do plano |
| `architecture-linters.json`, `/lint-architecture` | criação de `.claude/runtime/architecture-linters.json` + `/lint-architecture` |
| `capability gaps`, `capability-gaps.json`, `/gaps-scan` | `/gaps-scan` |

Se encontrar menção a artefato não coberto no plano, registrar como pendência explícita: `"Artefato prometido pela spec não incluído no plano: [artefato]. Incluir ou documentar como fora do escopo desta fase."` Nunca omitir silenciosamente.

### Nota sobre `.claude/runtime`

Artefatos declarativos do framework (`sensors.json`, `behaviours.json`, `architecture-linters.json`, contratos) vivem em `.claude/runtime/` e são parte do projeto, não código do produto. O plano não deve incluir `.claude/runtime/*.json` em listas de restrição como "Não modificar: .claude/" — essa restrição aplica-se ao código do framework em `.claude/hooks/`, `.claude/commands/` e `.claude/rules/`, não aos artefatos declarativos que o projeto cria e mantém.

---

## Passo 1 — Types vs Spec

Para cada type definido no plano, comparar com a especificação/micro do módulo correspondente.

### Perguntas obrigatórias

- Todos os campos do type batem em nome e tipo com a spec?
- Todos os enums e estados estão completos? (contar: spec tem N → type tem N)
- Campos opcionais vs obrigatórios estão corretos para todas as variantes?
- Existe campo obrigatório que não se aplica a alguma variante do type?
- Se a spec define snapshot ou cache, o type inclui esses campos?
- O plano reproduz decisões da spec **literalmente** (nomes, comportamentos, políticas)? Se a spec diz "preservar arquivo corrompido e criar novo", o plano não pode dizer "reinicializar com []" — isso é regressão de spec, não simplificação.

### Se a resposta for "não"

Corrigir o type antes de finalizar o plano. Não apresentar plano com type divergente da spec. Se a divergência é intencional (decisão técnica legítima), documentar explicitamente como desvio justificado na seção de Justificativa do plano — nunca alterar silenciosamente uma decisão da spec.

---

## Passo 2 — Fluxos de UI vs Navegação

Para cada tela e componente no plano, verificar que toda ação do usuário tem destino definido.

### Perguntas obrigatórias

- Todo botão Editar aponta para componente ou sheet explícito com props definidas?
- Todo botão Criar aponta para sheet ou tela com campos definidos?
- Todo botão Excluir tem ConfirmationDialog?
- Todo componente declarado como dual mode tem gatilho de criação E de edição?
- Todo toggle ou modo alternativo tem definição visual de ambos os estados?
- Telas que mostram dados de módulos não implementados na fase têm regra explícita (mockado, tap para placeholder)?

### Se a resposta for "não"

Adicionar o fluxo ausente ao corpo do plano, ou remover a referência ao fluxo que não será implementado.

---

## Passo 3 — Componentes vs Variantes do Model

Para cada componente que renderiza dados tipados, verificar se variantes do model estão cobertas.

### Perguntas obrigatórias

- O componente renderiza diferente para variantes diferentes do model? (ex.: binary vs numeric, income vs transfer)
- Campos opcionais são tratados? (ex.: chip de categoria aparece só quando categoryId existe)
- O componente trata todos os estados do enum? (ex.: badge para cada status)
- Existe variante no type que não tem tratamento visual no componente?

### Se a resposta for "não"

Adicionar renderização condicional ao componente no plano, ou documentar explicitamente que a variante usa o visual padrão.

---

## Passo 4 — Mocks vs Types

Verificar que mocks são tipados e cobrem variantes.

### Perguntas obrigatórias

- Existe type/interface definido ANTES de cada mock?
- O mock importa e implementa o type correspondente?
- Para cada estado/enum no type, existe pelo menos 1 item no mock?
- Os mocks têm exports separados por entidade (não um objeto monolítico)?
- Helpers de acesso estão definidos para consultas comuns?

### Se a resposta for "não"

Adicionar types antes dos mocks. Adicionar itens mock para estados não cobertos. Separar exports.

---

## Passo 5 — Navegação vs Decisões Arquiteturais

Verificar que rotas não conflitam com decisões de tabs internas, estado local ou BottomSheet.

### Perguntas obrigatórias

- Há rota de stack registrada para algo que deveria ser controlado por estado local? (tabs internas, modos de visualização)
- Há componente de criação listado como screen de stack E como BottomSheet?
- A contagem de telas no plano exclui BottomSheets? (sheets não são screens de stack)
- O padrão de criação é consistente no projeto? (se outros módulos usam BottomSheet, este também deve usar)

### Se a resposta for "não"

Remover rotas conflitantes. Definir abordagem única. Corrigir contagem.

---

## Passo 6 — Contagens vs Código Real

Verificar que contagens no plano (endpoints, telas, tabelas, rotas) batem com o código real do projeto.

### Perguntas obrigatórias

- Se o plano diz "X endpoints", contar endpoints reais no código do backend (grep nos routers/routes) — não confiar na spec ou em contagem mental
- Se o plano diz "Y telas", contar telas reais na navegação — não confiar na listagem do plano anterior
- Se o plano diz "Z tabelas", contar tabelas reais no schema/migrations — não confiar na spec
- Se o plano declara "N veredictos", "N estados", "N eventos" ou qualquer contagem de itens de uma tabela: listar todos explicitamente e contar — nunca estimativa. Se total declarado diverge da contagem real, o declarado está errado.

### Se a contagem divergir

Corrigir **o texto do plano em elaboração** para refletir a contagem real. Se o backend tem 18 endpoints e o plano diz 12, o número citado no plano está errado — não o backend.

**Vedação:** se a divergência está em um artefato existente (spec.md com ID duplicado, ledger com contagem errada, código com comentário desatualizado), **NÃO editar o artefato**. Registrar no plano como pré-condição: `"Pré-condição: [artefato] contém [divergência X] — corrigir manualmente antes de iniciar implementação"`. A correção do artefato-fonte é responsabilidade do command correspondente (`/spec-check` para spec, `/review` para código) — nunca do `/plan`.

---

## Passo 7 — Checklist vs Corpo do Plano

Verificar que a seção de verificação/checklist do plano não promete nada que não esteja definido no corpo.

### Perguntas obrigatórias

- Para cada item da seção de verificação, existe definição explícita no corpo do plano?
- Há fluxo mencionado na verificação que não tem tela, componente, type ou mock correspondente?
- Há funcionalidade prometida na verificação que está no "Fora do Escopo"?
- Há componente mencionado como "dual mode" na verificação sem que o fluxo de edição esteja definido no corpo?
- Há resultado esperado não-determinístico na verificação? Expressões como "200 ou 204", "retorna X ou Y", "pode ser A ou B" não são mecanicamente verificáveis — escolher um valor exato ou definir regra precisa de quando cada valor se aplica
- Há fork de implementação não resolvido no plano? Expressões como "usar A ou B", "via X ou dependência Y", "decidir durante implementação" deixam ambiguidade que afeta a arquitetura (ex: fixtures de teste, conftest.py, imports). Cada fork deve ser resolvido no plano, não delegado ao implementador

### Se a resposta for "não"

Remover o item da verificação, ou expandir o corpo do plano para incluir a definição ausente. Nunca apresentar verificação que prometa algo não modelado. Para resultados não-determinísticos e forks, resolver antes de apresentar o plano — não são decisões de implementação, são decisões de design.

---

## Passo 8 — Responsabilidades vs. Arquivos

Verificar que toda responsabilidade de negócio relevante tem arquivo designado com função e responsabilidades explícitas.

### Perguntas obrigatórias

- Existe responsabilidade descrita como "será feito em X" sem especificar quais funções e responsabilidades X terá?
- Etapas de inicialização, setup ou bootstrap do pipeline têm arquivo próprio, ou estão todas caindo em um arquivo de entry point genérico?
- Lógica de recuperação, descoberta de dados ou configuração crítica tem arquivo designado?
- Mapas de decisão (tabela de veredictos, dispatch de eventos, mapeamento de estados) têm arquivo designado E cobertura verificada contra todos os casos definidos na spec?

### Se a resposta for "não"

Criar o arquivo designado e listar suas responsabilidades explicitamente no plano. "Será feito em X" sem especificar o quê é planejamento incompleto — o implementador improvisa ou concentra responsabilidades heterogêneas em um arquivo de entry point.

---

## Passo 9 — Scope Creep vs Spec

Verificar que o plano não puxa funcionalidades de versões futuras (v2, v3, "Fora do Escopo") para o escopo atual.

### Perguntas obrigatórias

- O plano inclui funcionalidade que a spec classifica como v2, "Fora do Escopo" ou "Implementar depois"?
- O plano adiciona capacidade, fluxo, integração ou campo que a spec não menciona em nenhuma versão?
- O plano implementa variante ou opção que a spec lista como futura (ex: "filtros avançados na v2" mas o plano inclui filtros)?
- Se o plano cobre múltiplas fases, cada fase inclui apenas o que a spec atribui àquela fase?

### Se a resposta for "sim"

Remover a funcionalidade do escopo do plano ou mover para seção explícita "Fora do escopo deste plano — previsto para fase/versão futura". Não incluir implementação de itens futuros "por conveniência" ou "porque já estamos aqui".

**Princípio:** o plano implementa exatamente o que a spec aprovou para a versão/fase atual. Scope creep silencioso é o padrão de erro mais comum em planos — o implementador aceita o escopo expandido sem perceber que saiu do contrato.

---

## Passo 10 — IDs e Referências Cruzadas

Verificar que todo ID citado no plano (requisitos, decisões, deliverables, cenários de teste) existe na spec e é usado corretamente.

### Perguntas obrigatórias

- Para cada ID de requisito citado no plano (ex: `DATA-02`, `AUTH-01`), o ID existe na spec com esse exato código?
- O conteúdo associado ao ID no plano bate com o conteúdo da spec? (ex: se o plano diz "D-14: filtro por data", a spec diz a mesma coisa para D-14?)
- Há IDs no plano que não existem na spec (inventados durante o planejamento)?
- Há IDs da spec relevantes para o escopo do plano que não foram referenciados?

### Se a resposta for "não"

Corrigir o ID ou a referência no plano. Se o ID não existe na spec, remover a referência ou registrar como pré-condição: `"Pré-condição: spec não define ID X — definir antes de iniciar implementação"`. Nunca inventar IDs que não estão na spec — isso cria rastreabilidade falsa.

---

## Passo 11 — Fidelidade Literal à Spec

Verificar que o plano não enfraquece, altera ou reinterpreta decisões explícitas da spec.

### Perguntas obrigatórias

- Para cada comportamento descrito no plano que corresponde a uma regra ou decisão da spec, o plano reproduz a decisão **literalmente**?
- Há caso onde a spec define comportamento X mas o plano implementa comportamento Y (mais simples, diferente, ou contraditório)?
- Há decisão da spec (marcada com ID de decisão, D-XX) que o plano ignora ou contradiz?
- Há caso onde o plano "simplifica" uma regra da spec de forma que muda o comportamento observável?

### Se a resposta for "sim"

Se a divergência é **acidental** (o plano não percebeu a decisão da spec): corrigir o plano para alinhar com a spec.

Se a divergência é **intencional** (razão técnica legítima para diferir): documentar explicitamente na seção de Justificativa do plano como desvio declarado: `"Desvio da spec [ID]: spec diz X, plano implementa Y porque [razão técnica]"`. O desvio é apresentado ao usuário para aprovação — nunca aplicado silenciosamente.

**Princípio:** a spec é o contrato aprovado. O plano é a execução do contrato. Mudar o contrato silenciosamente durante a execução é a definição de regressão de spec.

---

## Passo 12 — Delta pós-Codex

Após o Codex adversarial review completar (invocado via `plan.md` antes da apresentação ao usuário), incorporar os findings ao plano de forma estruturada.

### Seção obrigatória "Delta pós-Codex" no output do plano

| Campo | Conteúdo |
|---|---|
| Findings aceitos | ID + severidade + mudança aplicada (arquivo afetado, natureza da mudança) |
| Findings rejeitados | ID + evidência concreta que contradiz o finding |
| Mudanças na lista de arquivos | Arquivos adicionados, removidos ou alterados em relação ao plano pré-Codex |
| Itens para /plan-review | Pontos que o /plan-review deve inspecionar com atenção adicional |

### Regras

- Cada finding aceito resulta em mudança concreta no plano — não apenas "foi aceito"
- Findings rejeitados incluem a evidência que os contradiz — não apenas "foi rejeitado"
- Se o Codex não rodou (timeout, erro), declarar explicitamente na seção e documentar como limitação — não silenciar a ausência
- A lista de arquivos do plano é atualizada para refletir adições/remoções pós-Codex
- O plano apresentado ao usuário para aprovação reflete o estado pós-Codex

---

## Formato de saída

Ao executar esta verificação, o Claude Code não precisa reportar cada passo explicitamente ao usuário. Deve apenas:

1. Executar o pré-check obrigatório e os 12 passos internamente antes de finalizar o plano
2. Corrigir problemas encontrados antes de apresentar
3. Se houver problema que dependa de decisão do usuário, apresentar o problema com opções antes de finalizar o plano

O objetivo é que o plano apresentado ao usuário já esteja limpo — não que o usuário receba um relatório de verificação junto com o plano.

### Prioridade dos passos

- **Passos 9-11** (scope creep, IDs, fidelidade literal) são a primeira defesa contra regressão de spec — se falharem, o plano implementa algo diferente do que foi aprovado, independente de como os passos 1-8 ficaram
- **Passos 1-8** garantem consistência interna do plano
- **Ambos os grupos** devem passar antes de apresentar
- **Pré-check obrigatório** valida precondições antes de construir — OIs bloqueantes e artefatos prometidos pela spec devem estar resolvidos ou cobertos antes de avançar para os passos 1-12
- **Passo 12** (Delta pós-Codex) é executado após o Codex review — integra findings ao plano antes de apresentar ao usuário

---

## Quando usar esta rule

- Ao criar plano de implementação via `/plan`
- Ao planejar via agent `planner`
- Ao revisar plano existente via `/review` (quando o objeto é um plano, não código)
- Ao criar plano de fase de UI Shell, Functional Completion ou qualquer fase com telas + types + mocks
