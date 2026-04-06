---
description: Criar especificacao de projeto do zero — workflow interativo de discovery e estruturacao
allowed-tools: Read, Grep, Glob, Agent, AskUserQuestion
---

Criar uma especificacao completa de projeto a partir de uma ideia, conceito ou briefing do usuario. Este command guia o usuario desde a visao inicial ate um documento de spec pronto para validacao via `/spec-check`.

## Filosofia

Consultar `.claude/rules/spec-creation-guide.md` para abordagem de questionamento, anti-padroes e criterios de qualidade. A regra principal: **extracao colaborativa de visao, nao interrogatorio burocratico.**

## Workflow

### Fase 1 — Discovery (Questionamento Aberto)

**Objetivo:** Entender O QUE o usuario quer construir, POR QUE, e PARA QUEM.

1. Comecar com a pergunta aberta: ler o que o usuario ja forneceu (mensagem, arquivo, briefing) e fazer 2-3 perguntas iniciais focadas no que falta para entender a visao
2. Seguir a energia do usuario — aprofundar onde ele tem mais a dizer
3. Usar perguntas com opcoes concretas, nao genericas
4. Capturar: produto, motivacao, usuarios, restricoes, o que NAO e
5. Maximo de 3-4 rodadas de perguntas antes de passar para a proxima fase
6. Se o usuario forneceu um documento extenso (briefing, PRD, anotacoes), extrair informacao primeiro e perguntar apenas o que falta

**Saida:** Entendimento claro do produto, seus usuarios e seu valor central.

### Fase 2 — Estruturacao de Requisitos

**Objetivo:** Transformar o entendimento em requisitos classificados.

1. Listar todos os requisitos capturados durante o discovery
2. Classificar cada um com o usuario: **v1** (implementar agora), **v2** (depois), **fora do escopo**
3. Atribuir IDs unicos: `CATEGORIA-NUMERO` (categorias derivadas do dominio do produto)
4. Para cada requisito v1, definir criterio de aceite como **comportamento observavel do usuario**
5. Apresentar a classificacao ao usuario para aprovacao

**Saida:** Lista de requisitos classificada, com IDs e criterios de aceite.

### Fase 3 — Telas, Fluxos e Modelo de Dados

**Objetivo:** Definir a estrutura do produto — o que o usuario ve e como os dados se organizam.

1. Mapear telas/paginas/views principais com base nos requisitos v1
2. Para cada tela: conteudo, acoes, destinos, estados (loading/vazio/erro/sucesso)
3. Definir fluxos criticos: caminho feliz + caminhos de erro
4. Definir entidades do modelo de dados com campos e tipos
5. Definir relacionamentos entre entidades
6. Definir constraints de integridade ("o que nunca pode acontecer")
7. Apresentar ao usuario para validacao — ajustar conforme feedback

**Saida:** Mapa de telas, fluxos criticos e modelo de dados.

### Fase 4 — Regras de Negocio e Gray Areas

**Objetivo:** Fechar ambiguidades e definir comportamentos nao-obvios.

1. Definir regras de negocio com formato: condicao + acao + resultado + manual/automatico
2. Identificar gray areas (ownership indefinido, comportamento de borda, conflitos, permissoes implicitas)
3. Para cada gray area: apresentar 2-3 opcoes concretas com consequencias
4. Registrar cada decisao com ID: D-01, D-02, etc.
5. Definir limitacoes do MVP explicitamente
6. Definir modo de teste (como validar sem dados reais / sem usuarios reais)

**Saida:** Regras de negocio definidas, gray areas resolvidas, decisoes registradas.

### Fase 5 — Decisoes Tecnicas e Estrategia de Implementacao

**Objetivo:** Resolver TODAS as decisoes tecnicas na spec para que o /plan seja execucao pura — zero perguntas.

1. **Stack e tecnologia:**
   - Perguntar ao usuario se tem preferencia de linguagem, framework, banco de dados
   - Se nao tem preferencia, recomendar stack com justificativa baseada nos requisitos
   - Registrar como decisao (D-XX)

2. **Restricoes de infraestrutura:**
   - Plataforma alvo (web, mobile, desktop, CLI, API)
   - Deploy/hosting (cloud, self-hosted, serverless, etc.)
   - CI/CD (se aplicavel)
   - Registrar restricoes como decisoes

3. **Estrategia de fases** (para projetos nao-triviais):
   - Propor divisao em fases com base nos requisitos v1
   - Para projetos com UI: Fase A (UI Shell) e Fase B (Functional Completion) ja definidas
   - Para projetos backend: fases por dominio ou por camada
   - Cada fase com requisitos mapeados (quais REQ-IDs entram em cada fase)
   - Criterios de conclusao por fase

4. **Estrategia de testes:**
   - Que tipos de testes sao necessarios (unit, integration, E2E, manual)
   - Quais fluxos criticos precisam de cobertura obrigatoria
   - Se ha necessidade de mocks, fixtures ou dados de teste
   - Registrar como secao na spec

5. **Integracoes externas:**
   - Listar servicos externos necessarios (APIs, auth providers, payment gateways, etc.)
   - Para cada integracao: o que sera usado, como, e se ha conta/credencial necessaria
   - Registrar como secao na spec

6. Apresentar decisoes ao usuario para aprovacao

**Saida:** Stack definida, fases planejadas, estrategia de testes clara, integracoes mapeadas. O /plan recebera tudo decidido.

### Fase 6 — Geracao do Documento

**Objetivo:** Gerar o documento de spec completo.

1. Usar o template em `.claude/runtime/spec-template.md` como estrutura base
2. Preencher todas as secoes com as informacoes capturadas nas fases 1-5
3. Executar validacao lightweight (ver `.claude/rules/spec-creation-guide.md` secao "Validacao em Construcao"):
   - Todo requisito v1 tem criterio de aceite?
   - Toda tela tem conteudo, acoes e destinos?
   - Todo fluxo critico tem caminho feliz E erro?
   - Toda entidade tem campos com tipos?
   - Toda regra de negocio tem condicao + acao + resultado?
   - Stack e fases estao definidas (Fase 5)?
   - Estrategia de testes esta clara?
4. Se houver lacunas na validacao, resolver com o usuario ANTES de gerar
5. Gerar o documento final como arquivo `.md` no diretorio do projeto

**Saida:** Arquivo de especificacao completo, incluindo decisoes tecnicas e estrategia de fases.

### Fase 7 — Handoff

**Objetivo:** Conectar com o restante do workflow do framework.

1. Apresentar resumo ao usuario:
   - Total de requisitos: X v1, Y v2, Z fora do escopo
   - Total de telas: N
   - Total de fluxos criticos: M
   - Total de decisoes registradas: K
   - Gray areas resolvidas: todas / pendentes (listar)
2. Sugerir proximos passos:
   - `/spec-check` — validacao formal da spec (obrigatorio antes de implementar)
   - Revisao manual pelo usuario (se quiser ajustar antes do spec-check)
3. NAO rodar `/spec-check` automaticamente — o usuario decide quando

---

## Modos de Entrada

### Interativo (padrao)
Usuario descreve a ideia em linguagem natural. O command faz discovery completo com perguntas.

### Baseado em documento
Usuario fornece arquivo existente (briefing, PRD, anotacoes, rascunho). O command:
1. Le e analisa o documento inteiro
2. Extrai o maximo de informacao possivel
3. Identifica lacunas
4. Faz perguntas apenas sobre o que falta (skip discovery de informacao ja presente)
5. Prossegue normalmente a partir da Fase 2

Para ativar: mencionar o arquivo na mensagem (ex: "crie a spec baseada em @briefing.md")

---

## Regras

- NAO inventar requisitos que o usuario nao mencionou. Capturar apenas o que foi dito ou confirmado
- NAO adicionar complexidade que o usuario nao pediu. Se ele quer algo simples, manter simples
- Decisoes tecnicas (stack, fases, testes, integracoes) SAO parte da spec — a Fase 5 cobre isso. O /plan nao deve precisar perguntar nada; tudo ja deve estar decidido na spec
- NAO pular fases. Mesmo que o usuario queira ir direto para o codigo, o workflow e: spec-create → spec-check → plan → implement
- NAO gerar spec sem ter resolvido gray areas identificadas. Ambiguidade na spec vira bug no codigo
- NAO tratar este workflow como burocracia — e a fundacao do projeto. Spec ruim = implementacao ruim
- Seguir `.claude/rules/spec-creation-guide.md` para abordagem de questionamento e anti-padroes
- Usar `.claude/runtime/spec-template.md` como estrutura base do documento gerado
- Se o usuario mencionar fluxos financeiros (saldo, credito, pagamento, comissao, cashback, cupom, reembolso), capturar invariantes de negocio e cenarios de abuso conforme `.claude/rules/spec-quality.md`
