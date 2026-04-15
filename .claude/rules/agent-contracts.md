# Protocolo de Contratos de Agents

## Propósito

Definir o formato padrão de **invocação** e **resposta** de agents do framework, evitando improvisação e permitindo tratamento determinístico de falhas. Esta rule padroniza como commands invocam agents e como parseiam o output — antes dela, cada command improvisava, o que tornava o diagnóstico de agents com comportamento inesperado praticamente impossível.

## Formato de invocação

Commands que invocam agents DEVEM enviar, na mensagem passada à Agent tool:

1. **Objetivo** — 1 frase descrevendo o que o agent deve avaliar
2. **Contexto** — referências concretas (caminhos de arquivo, trechos de código, dados específicos)
3. **Escopo** — o que está dentro e o que está fora da análise
4. **Critérios de veredicto** — lista de veredictos possíveis e o que cada um significa (ou referência à tabela no próprio command)

Invocações que omitem qualquer um desses 4 elementos são consideradas malformadas. O agent invocado com invocação malformada pode retornar `MALFORMED_INPUT` como veredicto especial.

## Formato de resposta obrigatório

Todo agent DEVE retornar resposta estruturada em pelo menos 4 seções com os títulos exatos abaixo. Agents que propõem mudanças concretas no artefato revisado (ex: agents de plan-review) adicionam uma 5ª seção opcional `APPLICABLE_DELTA` descrita ao final desta seção.

### 1. ESCOPO ANALISADO

O que foi lido/analisado concretamente. Referências a arquivos e linhas quando aplicável. Sem esta seção, o output é considerado inválido pelo command invocador.

### 2. EVIDÊNCIA

Achados concretos que sustentam o veredicto. Sem evidência = sem achado válido. Findings devem seguir o formato de `.claude/rules/evidence-tracing.md` (localização + evidência + impacto + severidade).

### 3. VEREDICTO

Um dos valores permitidos, definidos pelo command invocador na sua tabela de veredictos. Veredicto fora da lista permitida = resposta inválida.

### 4. AÇÃO SUGERIDA

Passo acionável concreto que o command invocador deve tomar com base no veredicto. Não é apenas descrição do problema — é instrução de próximo passo.

### 5. APPLICABLE_DELTA (opcional, quando aplicável)

Seção opcional usada por agents cujo contrato permite **propor mudanças concretas** no artefato revisado (ex: agents de plan-review propondo edições cirúrgicas ao plano). Quando presente, cada item DEVE seguir formato estruturado:

```
- target: <arquivo/seção/linha — referência concreta>
  operation: <add | modify | remove>
  before: <trecho ou descrição do estado atual — omitir quando operation=add>
  after: <trecho ou descrição do estado proposto — omitir quando operation=remove>
  justification: <por que a mudança é necessária, referência à evidência>
```

Regras:

- Esta seção é **opcional**. Agents que apenas reportam (sem propor mudanças) omitem a seção inteira.
- Quando presente, cada item é uma proposta concreta — não descrição em prose.
- `target` deve ser rastreável (arquivo:linha, seção:título, ou referência inequívoca ao artefato revisado).
- `operation` é um dos 3 valores literais — sem variações.
- `before` e `after` são omitidos conforme a operação (add não tem before; remove não tem after).
- `justification` aponta para a evidência na seção `EVIDÊNCIA` do mesmo output ou para regra/spec externa.
- Itens sem justificativa concreta são rejeitados pelo command invocador.

Command invocador decide como consumir a seção: aplicar as propostas automaticamente (raro), apresentar ao usuário como sugestões revisáveis (comum), ou registrar como achados para ação humana (default).

## Parsing pelo command invocador

O command que invoca o agent DEVE:

1. Localizar a seção `VEREDICTO` no output retornado
2. Validar que o veredicto está na lista permitida do command
3. Aplicar a ação mapeada para aquele veredicto (tabela no próprio command)
4. Se veredicto inválido, ausente ou fora da lista → tratar como falha (modos abaixo)

## Modos de falha e ações

| Falha | Ação do command invocador |
|---|---|
| Agent timeout (> 5 min) | Prosseguir sem o veredicto do agent, registrar `agent-timeout` no output, rebaixar confiança do resultado final |
| Output sem seção `VEREDICTO` | Rebaixar resultado para `NEEDS_HUMAN_REVIEW` |
| Output sem seção `EVIDÊNCIA` quando o veredicto é negativo (reprovação, risco alto, etc.) | Rebaixar para `NEEDS_HUMAN_REVIEW` — não aceitar reprovação sem evidência |
| Veredicto fora da lista permitida do command | Rebaixar para `NEEDS_HUMAN_REVIEW` com log do valor recebido |
| Output com `MALFORMED_INPUT` (agent reclamou da invocação) | Parar o command e reportar ao usuário — invocação malformada é bug do command, não do agent |

Nenhum desses modos de falha silencia o problema — todos levam ou a rebaixamento explícito ou a parada do command com reporte ao usuário.

## Invocações múltiplas

Commands podem invocar múltiplos agents de duas formas distintas:

### Paralelo (default quando agents são independentes)

Quando os agents **NÃO dependem** do output um do outro, o command DEVE invocá-los em paralelo — numa única mensagem com múltiplas chamadas da Agent tool. Isso reduz latência sem comprometer determinismo, porque os agents processam a mesma entrada em isolamento.

**Exemplos atuais no framework que seguem esse padrão:**
- `/plan-review` invoca `spec-plan-validator` e `consistency-checker` em paralelo — os dois analisam o mesmo plano, sem dependência entre si
- `/review` (após Fase 3) invoca `code-reviewer` + `security-auditor` + `qa-auditor` em paralelo — cada um analisa uma dimensão independente do código

### Sequencial (quando há dependência declarada)

Quando o agent `N+1` **precisa do output** do agent `N` (por exemplo: um agent consolida achados do outro, ou refina análise do anterior), o command DEVE invocá-los sequencialmente e passar explicitamente o output do anterior como contexto do próximo.

**Exemplo atual no framework:**
- `/plan` invoca `planner` primeiro para montar o plano, e só depois (se gatilho ativo) invoca `risk-assessment` passando o plano consolidado como contexto — `risk-assessment` precisa do plano pronto para avaliar risco

### Regra

- **Independentes** → paralelo (obrigatório quando há 2+ agents independentes e o ganho de latência é relevante)
- **Dependentes** → sequencial (obrigatório quando há dependência real de dados)
- O command DECLARA explicitamente qual modo usa para cada par de agents na sua documentação interna

### Vedação

- **Não** usar paralelo quando há dependência real — o agent `N+1` vai operar sem o contexto que precisa
- **Não** usar sequencial quando há independência e o custo de latência acumulada é relevante

## Custo e gatilhos condicionais

Agents podem ter custo significativo (especialmente com model `opus`). Para evitar gasto desnecessário:

- Agents com `model: opus` DEVEM ter **gatilho condicional declarado** no command invocador — não rodar sempre que o command roda, apenas quando a condição é satisfeita
- Agents com `model: sonnet` PODEM rodar incondicionalmente quando o command sempre precisa deles
- O command DEVE documentar o gatilho explicitamente: "invoca agent `X` quando `[condição]`"

### Override de model

Um agent pode ter `model: sonnet` como default no frontmatter e ser invocado com `model: opus` via parâmetro da Agent tool quando um gatilho de deep-analysis estiver ativo. Isso permite:

- **Default barato** — a invocação padrão usa sonnet (custo baixo)
- **Upgrade condicional** — em casos de alta criticidade (projetos financeiros, operações irreversíveis, classes de risco específicas), o command passa `model: opus` no ato da invocação

**Um único arquivo de agent**, duas formas de invocação. Não criar dois agents para a mesma função só para variar o model.

## Relação com o self-check de review-quality.md

Esta rule define o **protocolo de comunicação** entre command e agent. A rule `review-quality.md` define o **protocolo de publicação** do output consolidado do command ao usuário.

Ordem de aplicação pelo command invocador:

1. Aplica `context-loading.md` (carregar estado)
2. Invoca agents conforme esta rule (`agent-contracts.md`)
3. Consolida outputs dos agents
4. Aplica `review-quality.md` (self-check interno)
5. Publica veredicto final
6. (Em contexto de projeto) Codex adversarial review — Camada 4

As três rules (`context-loading`, `agent-contracts`, `review-quality`) formam a espinha dorsal do ciclo de vida de commands de review/análise.
