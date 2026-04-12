# Plan Construction — Procedimento de Construção de Planos

## Nota

Esta rule define o self-check interno que o `/plan` e o agent `planner` executam ao CONSTRUIR um plano.
Para verificacao formal e independente de um plano ja finalizado, usar o command `/plan-review`.

## Propósito

Definir o procedimento que o Claude Code deve executar antes de finalizar um plano de implementação. Este procedimento complementa `.claude/rules/implementation-quality.md` (que define o que pode estar errado) com instruções de como encontrar e corrigir problemas antes de apresentar o plano.

O Claude Code deve executar estes 8 passos ao criar planos via `/plan` ou via o agent `planner`.

---

## Passo 1 — Types vs Spec

Para cada type definido no plano, comparar com a especificação/micro do módulo correspondente.

### Perguntas obrigatórias

- Todos os campos do type batem em nome e tipo com a spec?
- Todos os enums e estados estão completos? (contar: spec tem N → type tem N)
- Campos opcionais vs obrigatórios estão corretos para todas as variantes?
- Existe campo obrigatório que não se aplica a alguma variante do type?
- Se a spec define snapshot ou cache, o type inclui esses campos?

### Se a resposta for "não"

Corrigir o type antes de finalizar o plano. Não apresentar plano com type divergente da spec.

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

### Se a resposta for "não"

Remover o item da verificação, ou expandir o corpo do plano para incluir a definição ausente. Nunca apresentar verificação que prometa algo não modelado.

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

## Formato de saída

Ao executar esta verificação, o Claude Code não precisa reportar cada passo explicitamente ao usuário. Deve apenas:

1. Executar os 8 passos internamente antes de finalizar o plano
2. Corrigir problemas encontrados antes de apresentar
3. Se houver problema que dependa de decisão do usuário, apresentar o problema com opções antes de finalizar o plano

O objetivo é que o plano apresentado ao usuário já esteja limpo — não que o usuário receba um relatório de verificação junto com o plano.

---

## Quando usar esta rule

- Ao criar plano de implementação via `/plan`
- Ao planejar via agent `planner`
- Ao revisar plano existente via `/review` (quando o objeto é um plano, não código)
- Ao criar plano de fase de UI Shell, Functional Completion ou qualquer fase com telas + types + mocks
