# Achados Atualizados de Melhoria do Framework V4+

Data: 2026-04-15

Origem: evidencias observadas no programa teste `mini_task` durante `/plan`,
`/plan-review`, implementacao, `/review`, `/audit`, `/verify-spec` e `/ship-check`.

Objetivo: registrar melhorias genericas para o framework, sem termos ou regras
especificas do `mini_task`. O foco e elevar a capacidade do framework de prever no
plano problemas que hoje aparecem apenas em review/audit.

---

## 1. Tese Central

O principal ganho nao esta em adicionar mais uma checklist de review. O ganho real e
fazer o `/plan` exigir decisoes explicitas antes da implementacao.

Achado recorrente:

- Muitos problemas encontrados em `/review` e `/audit` nao eram bugs imprevisiveis.
- Eram lacunas de planejamento: error handlers sem contrato completo, middleware sem
  teste dedicado, operacoes concorrentes sem classificacao de risco, dados externos
  consumidos com shape assumido.

Conclusao:

> O framework deve mover esses riscos para o plano. O proximo projeto deve sair do
> `/plan` com concorrencia, error handlers, logging, headers, middleware e contratos de
> erro testaveis ja previstos antes de qualquer codigo.

---

## 2. Melhorias Recomendadas

### Melhoria 1 - Padrao 24: handlers terminais e excecoes heterogeneas

Arquivo alvo: `.claude/rules/implementation-quality.md`

Problema:

Handlers de ultimo recurso, catch-all handlers e blocos `except` amplos podem silenciar
falhas criticas ou aplicar a mesma recuperacao para erros de naturezas diferentes.

Padrao a adicionar:

```markdown
### Padrao 24: Handler terminal sem diagnostico e excecoes heterogeneas

Handlers de ultimo recurso (`catch-all`, global exception handler, fallback generico)
sao a ultima chance de preservar diagnostico. Se retornam erro sem logar, a falha se
torna silenciosa.

- Todo handler terminal DEVE registrar log com stack trace ou equivalente interno antes
  de responder.
- O usuario final nunca recebe stack trace, query SQL, path interno ou detalhe tecnico.
- Blocos que capturam excecoes heterogeneas, como `except (JsonError, OSError,
  TypeError)`, DEVEM distinguir a estrategia de recuperacao por classe.
- Erro transitorio, erro de formato, erro de permissao e violacao de schema nao podem
  cair no mesmo fallback sem justificativa explicita.

Sinal de alerta:
- `except Exception` retorna 500 sem `_logger.exception`, `logger.error(exc_info=True)`
  ou equivalente.
- `except (A, B, C)` agrupa I/O transitorio, corrupcao de formato e erro logico.
- Handler 5xx existe, mas nao ha teste ou evidencia de log interno.
```

Impacto esperado:

- Reduz falhas silenciosas.
- Melhora diagnostico sem expor detalhes internos ao usuario.
- Obriga diferenciar recuperacao por causa raiz.

---

### Melhoria 2 - Padrao 25: dados externos com shape assumido

Arquivo alvo: `.claude/rules/implementation-quality.md`

Problema:

Codigo frequentemente carrega dados externos validos sintaticamente, mas invalidos
semanticamente, e acessa campos diretamente sem validar estrutura.

Padrao a adicionar:

```markdown
### Padrao 25: Dados externos carregados com shape assumido

Todo dado vindo de arquivo, cache, fila, storage local, API externa ou config deve ser
tratado como entrada externa. JSON valido nao significa schema valido.

Casos obrigatorios a considerar:

1. Conteudo invalido: arquivo contem `{` ou bytes truncados.
2. Tipo raiz errado: esperado objeto, recebido array ou string.
3. Shape errado: esperado `{ "tasks": [] }`, recebido `{ "items": [] }`.
4. Item invalido: lista existe, mas seus elementos nao respeitam o schema.

Como evitar:

- Validar schema antes de desempacotar campos.
- Usar parser/modelo/validator quando existir no stack.
- Separar recuperacao de formato invalido de erro transitorio de I/O.
- Testar os quatro casos quando o dado e persistido fora do processo.

Sinal de alerta:
- `data["field"]` logo apos `json.load()` sem validar tipo raiz e presenca do campo.
- `response.data.items` assumido sem checar contrato real da API.
- Cache/config usado como se fosse confiavel porque foi escrito pelo proprio sistema.
```

Impacto esperado:

- Evita 500 por `TypeError`, `KeyError` ou equivalente.
- Torna storage/config/cache robustos contra corrupcao parcial e dados antigos.
- Complementa, mas nao substitui, o Padrao 24.

---

### Melhoria 3 - Passo 8 do plano: componentes criticos cross-cutting

Arquivo alvo: `.claude/rules/plan-construction.md`

Problema:

O plano hoje ja verifica responsabilidades por arquivo, DI e matriz de erro, mas ainda
nao forca classificacao sistematica de endpoints/operacoes contra risco de seguranca e
concorrencia.

Adicionar no Passo 8 uma subsecao obrigatoria:

```markdown
### Componentes criticos cross-cutting

Para cada endpoint, operacao ou fluxo de mutacao planejado:

- Classificar contra a Security Regression Matrix de `.claude/rules/testing.md`.
- Declarar se pertence a Classe A, B, C, D ou "fora da matriz".
- Para Classe A/B, declarar teste de concorrencia quando houver estado compartilhado,
  toggle, contador, estoque, saldo ou operacao reversivel.
- Para Classe C/D, declarar teste de abuso, replay, idempotencia ou invariante conforme
  a classe.

Para cada middleware, interceptor, handler global, rate limiter, auth middleware,
security header middleware ou logger global:

- Declarar efeito observavel externo.
- Declarar efeito interno observavel quando aplicavel (log, metrica, tracing,
  request_id).
- Declarar teste dedicado que prova o efeito, nao apenas que um endpoint respondeu.

Para cada error handler:

- Mapear status, tipo/codigo, body, UX, recuperacao, logging/diagnostico e teste.
- Incluir uma linha explicita para o catch-all/fallback terminal.

Se qualquer item acima for aplicavel e nao estiver no plano, o plano esta incompleto.
```

Impacto esperado:

- Faz riscos de concorrencia e infraestrutura aparecerem antes do codigo.
- Evita que middleware/handlers globais fiquem "implementados, mas nao testados".
- Reduz achados tardios em `/review` e `/audit`.

Observacao:

Nao criar um novo "Passo 13" neste momento. Isso geraria churn em contagens,
documentacao e comandos. A subsecao no Passo 8 entrega o mesmo enforcement com menor
impacto.

---

### Melhoria 4 - Testes de infraestrutura cross-cutting

Arquivo alvo: `.claude/rules/testing.md`

Problema:

Testes tendem a focar logica de negocio e endpoints diretos. Componentes que interceptam
todas as requisicoes/respostas ficam sem teste dedicado.

Secao a adicionar:

```markdown
## Infraestrutura cross-cutting testavel

Componentes globais ou transversais declarados no plano DEVEM ter teste dedicado do seu
efeito observavel.

Exemplos:

- Middleware de headers de seguranca: testar headers esperados na resposta.
- Exception handler global: testar body seguro, status correto e ausencia de stack
  trace na resposta.
- Logger/error handler: testar que erro terminal emite log interno quando o stack
  permite capturar logs.
- Auth middleware: testar bloqueio e liberacao por permissao.
- Rate limiter: testar limite, status 429 e headers de retry quando aplicavel.

Para cada controle declarado no plano, testar:

1. Efeito externo observavel: status, header, body, redirect, bloqueio ou mensagem.
2. Efeito interno observavel quando aplicavel: log, metrica, tracing ou request_id.

Nao considerar um controle coberto apenas porque o endpoint principal passou.
```

Impacto esperado:

- Garante que controles de seguranca e observabilidade sao verificaveis.
- Evita falsa confianca em middleware parcial.
- Fecha lacunas como headers sem teste e exception handler sem teste.

---

### Melhoria 5 - Contrato do cliente HTTP

Arquivo alvo: `.claude/rules/integration-checklist.md`

Problema:

Matriz de erros e contrato de body perdem valor se o wrapper HTTP descarta o corpo da
resposta em erros 4xx/5xx e entrega ao frontend apenas uma string generica.

Secao a adicionar:

```markdown
### Contrato do cliente HTTP

Wrappers de HTTP (`fetchJson`, `apiClient`, `axiosClient`, `httpClient`) DEVEM preservar
informacao estruturada em respostas de erro.

Em erro 4xx/5xx, o erro propagado deve carregar, quando disponivel:

- status HTTP
- body parseado
- codigo de erro estavel
- lista de erros por campo quando aplicavel
- request_id/correlation_id quando fornecido

Vedacoes:

- Nao reduzir `422` com detalhes de validacao a `Error("HTTP 422")`.
- Nao descartar body de `409`, `422`, `429` ou `5xx` se a matriz de erros depende dele.
- Nao forcar cada tela a reimplementar parser de erro.

Excecao:

Quando a spec exige deliberadamente mensagem generica e nenhum detalhe por campo, o
wrapper ainda deve preservar `status` e, se existir, `request_id` para diagnostico.
```

Impacto esperado:

- Mantem coerencia entre matriz de erros, backend e frontend.
- Permite UX de validacao por campo.
- Evita que o contrato de erro exista no papel, mas seja perdido no cliente HTTP.

---

### Melhoria 6 - Referencia cruzada leve para controles web

Arquivo alvo: `.claude/rules/web-api-security.md`

Problema:

Headers e controles web ja existem no checklist, mas a regra nao aponta explicitamente
que controles declarados precisam de teste dedicado conforme `testing.md`.

Adicionar referencia curta:

```markdown
## Testabilidade dos controles de seguranca

Todo controle de seguranca web declarado ou implementado (headers, CSP, auth middleware,
rate limit, CSRF, CORS policy, error pages seguras) deve ter evidencia de teste conforme
`.claude/rules/testing.md#Infraestrutura-cross-cutting-testavel`.

Headers omitidos devem ter justificativa contextual. Exemplo: HSTS pode ser omitido em
ambiente local HTTP-only, mas CSP ausente em app web publico ou multiusuario deve ser
tratado como finding relevante.
```

Impacto esperado:

- Evita regra universal agressiva como "qualquer header ausente = ALTO".
- Mantem severidade contextual.
- Reforca que middleware de seguranca parcial precisa ser explicito.

---

## 3. Itens Deliberadamente Fora do Plano

### Lock vazando como API publica

Motivo para nao incluir agora:

- O `/review` ja detectou o caso.
- Formalizar como regra universal pode gerar ruido em projetos onde locks sao detalhes
  locais e nao atravessam fronteira de modulo.
- E um code smell real, mas nao mostrou ser lacuna estrutural do framework.

Reavaliar se o padrao reaparecer em outros projetos.

### Estado de edicao destruido por refresh concorrente

Motivo para nao incluir agora:

- E mais especifico de UI com edicao inline, polling, websockets ou refresh de lista.
- `state-management.md` ja cobre cancelamento de resposta tardia e estado concorrente
  de forma geral.
- Pode virar padrao futuro se reaparecer em mais apps com UI rica.

### Regra universal de severidade para headers ausentes

Motivo para nao incluir:

- Gera falso positivo em app local, API interna, prototipo HTTP-only ou CLI com preview
  web local.
- Melhor abordagem: header omitido exige justificativa contextual; CSP ausente em app
  web publico/multiusuario sobe severidade.

---

## 4. Ordem Recomendada de Implementacao

1. `implementation-quality.md`
   - Adicionar Padrao 24.
   - Adicionar Padrao 25.

2. `integration-checklist.md`
   - Expandir matriz de erros com `Logging/Diagnostico` e `Teste`.
   - Adicionar contrato do cliente HTTP.

3. `testing.md`
   - Adicionar "Infraestrutura cross-cutting testavel".
   - Reforcar que classificacao da Security Regression Matrix precisa aparecer no plano
     quando aplicavel.

4. `plan-construction.md`
   - Inserir subsecao obrigatoria no Passo 8.
   - Referenciar Padroes 24/25, matriz de erros e Security Regression Matrix.

5. `web-api-security.md`
   - Adicionar referencia cruzada leve para testes de controles web.

---

## 5. Criterios de Aceite das Melhorias

As melhorias estarao bem aplicadas quando:

- Um plano com endpoint toggle, saldo, estoque, contador ou operacao reversivel declarar
  explicitamente classificacao na Security Regression Matrix e teste correspondente.
- Um plano com middleware/header/handler global declarar teste dedicado do efeito
  observavel.
- Uma matriz de erros incluir status, tipo/codigo, body, UX, recuperacao,
  logging/diagnostico e teste.
- Todo fallback 5xx/catch-all tiver linha propria na matriz e politica de log.
- Projetos que carregam JSON/config/cache/API externa planejem validacao de schema antes
  de acessar campos.
- Wrappers HTTP preservem erro estruturado quando a UX ou matriz de erros depende do
  payload.

---

## 6. Resultado Esperado

Depois dessas mudancas, o framework deve detectar mais cedo as seguintes classes de
problema:

- Handler global retornando 500 sem log.
- Error handler sem teste.
- Middleware de seguranca sem teste.
- Header de seguranca declarado mas nao verificado.
- Operacao Classe A/B sem teste concorrente ou invariante planejado.
- Storage/config/cache confiando em shape de dados externos.
- Cliente HTTP descartando payload estruturado de erro.

Essas melhorias sao genericas e aplicaveis a projetos web, API, CLI com config/cache,
backends com storage local, e frontends que consomem APIs. Nenhuma depende do dominio
especifico do programa teste.
