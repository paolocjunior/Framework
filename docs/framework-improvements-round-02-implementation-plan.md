# Plano de Implementação — Framework Improvements Round 02

Data: 2026-04-15

Documentos de origem:
- `docs/framework-improvements-round-02.md` (meus achados consolidados)
- `docs/framework-improvement-findings-2026-04-15.md` (seus achados atualizados)

Objetivo: unificar os dois documentos, resolver divergências, produzir plano concreto de implementação para aprovação antes de qualquer edit.

---

## 1. Resolução de divergências entre os dois documentos

Os dois documentos convergem em 80% do escopo. Três pontos divergem; segue a resolução:

| Divergência | Meu doc | Seu doc | Resolução final | Justificativa |
|---|---|---|---|---|
| Padrão 24 vs 25 | Merger em padrão único (dados externos + heterogeneous exceptions) | Separados: Padrão 24 (handlers terminais + heterogeneous) + Padrão 25 (dados externos com shape) | **SEPARADOS (seu doc vence)** | Sua separação é mais precisa: handlers terminais + heterogeneous exceptions é **reativo** (aplicável a qualquer contexto, não só dados); dados externos com shape é **preventivo** (escopo narrow de dados externos). Merger perderia aplicabilidade do reativo em contextos não-dados (network, IO). |
| Contrato do cliente HTTP (F-08) | Rejeitado (UX-dependent) | Incluído como Melhoria 5 | **INCLUÍDO (seu doc vence)** | Sua formulação resolve minha preocupação: a regra preserva `status` e `request_id` mesmo em UX que exige mensagem genérica. Não força body público, força preservação estrutural para diagnóstico. Isso torna a Matriz de Erros operacionalmente verdadeira — sem preservação do body, a matriz é promessa sem execução. |
| Ordem de implementação | implementation-quality → integration-checklist → plan-construction → testing → web-api-security | implementation-quality → integration-checklist → testing → plan-construction → web-api-security | **Seu doc vence** | Sua ordem respeita melhor a dependência: plan-construction Passo 8 referencia tanto matriz expandida (integration-checklist) quanto seção de testes cross-cutting (testing). Faz sentido as duas existirem antes do Passo 8. |

**Escopo final unificado: 7 mudanças em 5 arquivos.**

---

## 2. Escopo final das mudanças

### Mudança 1 — Padrão 24 em `implementation-quality.md`

**Arquivo:** `.claude/rules/implementation-quality.md`

**Ação:** inserir novo Padrão 24 em nova Categoria ou estender Categoria 9 existente. Verificar posicionamento ideal.

**Conteúdo (baseado em seu doc, seção Melhoria 1):**

Título: **"Handler terminal sem diagnóstico e exceções heterogêneas"**

Regras:
- Todo handler de último recurso (catch-all, global exception handler, fallback genérico) DEVE registrar log com stack trace antes de responder
- Usuário final nunca recebe stack trace, query SQL, path interno ou detalhe técnico
- Blocos com `except (X, Y, Z)` heterogêneo DEVEM distinguir recuperação por classe
- Erro transitório, erro de formato, erro de permissão e violação de schema não podem cair no mesmo fallback sem justificativa explícita

Sinal de alerta:
- `except Exception` retorna 500 sem log estruturado
- `except (A, B, C)` agrupa I/O transitório + corrupção + lógico
- Handler 5xx existe mas sem teste ou evidência de log interno

**Critério de aceite:** o padrão está documentado e testável contra código real (pode ser grep'ado ou inspecionado num review).

---

### Mudança 2 — Padrão 25 em `implementation-quality.md`

**Arquivo:** `.claude/rules/implementation-quality.md`

**Ação:** inserir Padrão 25 logo após Padrão 24 (mesma Categoria ou adjacente).

**Conteúdo (baseado em seu doc, seção Melhoria 2):**

Título: **"Dados externos carregados com shape assumido"**

Escopo: arquivos (JSON, YAML, config), cache local, fila, resposta de API externa, storage de banco em coluna JSON/JSONB.

Casos obrigatórios (4 cenários):
1. Conteúdo inválido sintaticamente (`{` truncado, bytes quebrados)
2. Tipo raiz errado (`[]` onde esperado `{}`, string onde esperado objeto)
3. Shape errado (`{"items": []}` onde esperado `{"tasks": []}`)
4. Item inválido (lista existe mas item não respeita schema)

Regra preventiva: validar schema antes de desempacotar. `data["field"]` direto após `json.load()` é anti-padrão.

Regra reativa: recuperação de formato inválido é distinta de erro transitório de I/O.

**Critério de aceite:** padrão testável com os 4 cenários; implementador sabe claramente que `data["tasks"]` precisa de validação prévia.

---

### Mudança 3 — Matriz de Erros expandida em `integration-checklist.md`

**Arquivo:** `.claude/rules/integration-checklist.md`

**Ação:** editar tabela existente da Matriz de Erros (atualmente 5 colunas).

**Mudança concreta:**

| De (5 colunas) | Para (8 colunas) |
|---|---|
| Status HTTP \| Tipo/código \| Handler \| UX \| Recuperação | Status HTTP \| Tipo/código \| Handler \| Body \| UX \| Recuperação \| Logging/Diagnóstico \| Teste |

Nota: a coluna **Recuperação** já existe na matriz atual (`integration-checklist.md:63`) e DEVE ser preservada. A expansão adiciona três colunas novas (`Body`, `Logging/Diagnóstico`, `Teste`), não substitui colunas existentes.

Ajustes adicionais:
- Regra explícita: "linha 5xx cobre o catch-all/fallback terminal, não apenas erros de servidor conhecidos"
- Cada linha preenche a coluna Logging com nível + campos obrigatórios + stack trace quando aplicável
- Cada linha referencia um teste na coluna Teste (ou marca "n/a" com justificativa)

**Critério de aceite:** tabela expandida + instrução sobre 5xx cobrir catch-all + exemplos atualizados das 8 linhas (400, 401, 403, 404, 409, 422, 429, 5xx).

---

### Mudança 4 — Contrato do cliente HTTP em `integration-checklist.md`

**Arquivo:** `.claude/rules/integration-checklist.md`

**Ação:** adicionar nova seção após a Matriz de Erros expandida.

**Conteúdo (baseado em seu doc, seção Melhoria 5):**

Título: **"Contrato do cliente HTTP"**

Regras:
- Wrappers de HTTP (fetchJson, apiClient, axiosClient, httpClient) DEVEM preservar informação estruturada em respostas de erro
- Em erro 4xx/5xx, o erro propagado deve carregar (quando disponível): status, body parseado, código de erro estável, lista de erros por campo, request_id/correlation_id

Vedações:
- Não reduzir 422 com detalhes de validação a `Error("HTTP 422")`
- Não descartar body de 409, 422, 429, 5xx se a matriz depende dele
- Não forçar cada tela a reimplementar parser de erro

Exceção: quando a spec exige mensagem genérica, wrapper ainda preserva `status` e `request_id` para diagnóstico.

**Critério de aceite:** seção documentada + referência cruzada para a Matriz de Erros (que depende da preservação do body para funcionar).

---

### Mudança 5 — Nova seção em `testing.md`

**Arquivo:** `.claude/rules/testing.md`

**Ação:** adicionar nova seção após a Security Regression Matrix.

**Conteúdo (baseado em seu doc, seção Melhoria 4):**

Título: **"Infraestrutura cross-cutting testável"**

Componentes cobertos: middleware de headers, exception handler global, logger, auth middleware, rate limiter, CORS middleware, CSRF middleware.

Regras:
- Cada controle declarado no plano DEVE ter teste dedicado do efeito observável
- Teste assertar: (a) efeito externo observável (header, status, body, redirect, bloqueio) e (b) efeito interno observável quando aplicável (log, métrica, tracing, request_id)
- Não considerar um controle coberto apenas porque o endpoint principal passou

Exemplos enumerados: middleware de headers → testar headers esperados; exception handler global → testar body seguro + ausência de stack trace; logger → testar que erro terminal emite log interno; auth middleware → testar bloqueio e liberação; rate limiter → testar limite, 429, retry headers.

Reforço adicional: classificação da Security Regression Matrix precisa aparecer no plano, não só ser auditada depois.

**Critério de aceite:** seção documentada + 5 exemplos concretos + reforço sobre Security Regression Matrix ser gate do plano.

---

### Mudança 6 — Subseção obrigatória no Passo 8 de `plan-construction.md`

**Arquivo:** `.claude/rules/plan-construction.md`

**Ação:** inserir subseção obrigatória dentro do Passo 8 existente. **NÃO criar Passo 13.**

**Conteúdo (baseado em seu doc, seção Melhoria 3, consolidando meu doc):**

Título da subseção: **"Componentes críticos cross-cutting"**

Checklist obrigatório:

Para cada endpoint/operação/fluxo de mutação:
- Classificar contra Security Regression Matrix de `testing.md`
- Declarar Classe A, B, C, D ou "fora da matriz"
- Classe A/B com estado compartilhado, toggle, contador, estoque, saldo ou operação reversível → teste de concorrência declarado
- Classe C/D → teste de abuso, replay, idempotência ou invariante conforme classe

Para cada middleware/interceptor/handler global/rate limiter/auth middleware/security header middleware/logger global:
- Efeito observável externo
- Efeito interno observável quando aplicável (log, métrica, tracing, request_id)
- Teste dedicado que prova o efeito, não apenas que o endpoint respondeu

Para cada error handler:
- Mapear status, tipo/código, body, UX, recuperação, logging/diagnóstico, teste (referência à Matriz expandida em `integration-checklist.md`)
- Linha explícita para catch-all/fallback terminal

Regra de conclusão: se qualquer item aplicável não estiver no plano, o plano está incompleto.

**Critério de aceite:** subseção obrigatória no Passo 8 + referências cruzadas para `testing.md` (Security Regression Matrix e Infraestrutura cross-cutting) + referência para Matriz de Erros expandida em `integration-checklist.md`.

---

### Mudança 7 — Referência cruzada em `web-api-security.md`

**Arquivo:** `.claude/rules/web-api-security.md`

**Ação:** adicionar seção leve de cross-reference na área de headers de segurança. **NÃO adicionar regra universal de severidade** ("qualquer header ausente = ALTO").

**Conteúdo (baseado em seu doc, seção Melhoria 6):**

Título: **"Testabilidade dos controles de segurança"**

Regra:
- Todo controle de segurança web declarado ou implementado (headers, CSP, auth middleware, rate limit, CSRF, CORS policy, error pages seguras) deve ter evidência de teste conforme `testing.md#Infraestrutura-cross-cutting-testavel`
- Headers omitidos exigem justificativa contextual
- Exemplo: HSTS omitido em ambiente local HTTP-only é aceitável; CSP ausente em app web público ou multiusuário é finding relevante

**Critério de aceite:** seção curta, cross-reference funcional para `testing.md` e `plan-construction.md` Passo 8, severidade explicitamente contextual.

---

## 3. Ordem de execução (com dependências)

Seguindo a ordem validada no seu doc:

| # | Mudança | Arquivo | Depende de | Risco |
|---|---|---|---|---|
| 1 | Padrão 24 | `implementation-quality.md` | — | Baixo |
| 2 | Padrão 25 | `implementation-quality.md` | Mudança 1 (mesma categoria/arquivo) | Baixo |
| 3 | Matriz expandida | `integration-checklist.md` | — | Baixo |
| 4 | Contrato cliente HTTP | `integration-checklist.md` | Mudança 3 (mesmo arquivo, adjacente) | Baixo |
| 5 | Seção cross-cutting | `testing.md` | — | Baixo |
| 6 | Passo 8 subseção | `plan-construction.md` | Mudanças 3, 5 (referências cruzadas) | Médio (maior volume textual) |
| 7 | Cross-ref | `web-api-security.md` | Mudanças 5, 6 | Baixo |

**Estratégia de aplicação:**

1. Aplicar mudanças 1-2 em um único edit por conveniência (mesmo arquivo, padrões adjacentes)
2. Aplicar mudanças 3-4 em dois edits separados no mesmo arquivo (matriz é edit na tabela existente; HTTP contract é nova seção)
3. Aplicar mudança 5 isolada
4. Aplicar mudança 6 (maior em volume — cuidado com preservação do Passo 8 existente)
5. Aplicar mudança 7 por último

---

## 4. Critérios de aceite globais

Após aplicar as 7 mudanças, o framework deve produzir os seguintes comportamentos em qualquer projeto futuro:

1. **No `/plan`:** classificação explícita de cada endpoint/operação contra Security Regression Matrix, com teste apropriado por classe (concorrência para A/B, idempotência/replay para C, abuso/invariantes para D)

2. **No `/plan`:** declaração de teste dedicado para cada middleware/handler global/security control, cobrindo efeito externo e interno

3. **No `/plan`:** matriz de erros completa com 8 colunas (status/tipo/handler/body/UX/recuperação/logging/teste), com linha 5xx cobrindo catch-all

4. **No código:** validação de schema antes de unpacking de dados externos (reflete Padrão 25); catch-all e exceções heterogêneas com distinção de recuperação (reflete Padrão 24)

5. **Em clientes HTTP:** preservação estruturada de erro (status, body, código, request_id)

6. **Em `/review`:** menos findings que deveriam ter sido previstos no plano

7. **Em `/audit`:** middleware parcial (CSP omitido) ou handler sem log é pego por teste dedicado declarado no plano, não por inspeção posterior

Se algum desses 7 comportamentos não aparecer no próximo projeto-teste, a melhoria correspondente está incompleta.

---

## 5. Rejeições confirmadas (fora do escopo desta rodada)

Ambos os documentos concordam em rejeitar:

| Finding | Motivo |
|---|---|
| F-02 `_lock` externo | /review pega. Regra universal gera ruído em projetos com locks legitimamente internos |
| F-09 edit state lost | Específico de SPA com arquitetura de polling; já coberto genericamente em `state-management.md` |
| Regra universal de severidade de header ausente | Gera falso positivo em app local, API interna, HTTP-only; severidade é contextual |

Condição para reversão: se qualquer padrão reaparecer em 3+ projetos distintos sem o /review ou /audit catching, reconsiderar.

---

## 6. Pontos específicos para sua atenção antes de aprovar

Três pontos onde minhas escolhas anteriores foram revertidas neste plano final. Confirmar que essas reversões são o que você quer:

1. **Padrão 24 e 25 separados (não mais merged).** Seu doc venceu. Duas entradas em `implementation-quality.md`.

2. **Melhoria 4 (Contrato HTTP) incluída.** Seu doc venceu. Meu doc anterior rejeitava F-08 como UX-dependent; sua formulação resolve a preocupação porque preserva `status` e `request_id` mesmo em UX que exige mensagem genérica.

3. **Ordem de execução: testing.md antes de plan-construction.md.** Seu doc venceu. Minha ordem anterior tinha plan-construction antes; reordeno porque o Passo 8 referencia a seção cross-cutting que precisa existir primeiro.

---

## 7. Solicitação de aprovação

**Status:** plano pronto para implementação após aprovação.

**Escopo total:** 7 mudanças em 5 arquivos.

**Estimativa de risco:** baixo em 6 mudanças, médio em 1 (Passo 8 subseção, maior volume textual).

**Próximo passo se aprovado:** aplicar as 7 mudanças na ordem listada na seção 3, uma por edit ou agrupadas quando o arquivo é o mesmo.

**Aguardando:** confirmação de aprovação e eventuais ajustes no escopo antes de iniciar os edits.
