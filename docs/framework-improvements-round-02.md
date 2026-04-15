# Framework Improvements — Round 02 (pós-review/audit do projeto-teste)

## Contexto

Após nova rodada de `/review` e `/audit` em projeto-teste, 10 findings foram analisados não como bugs do projeto, mas como sinais de lacunas no framework. Após validação iterativa, convergiu-se em 5 melhorias concretas, 3 rejeições explícitas e 1 absorção em padrão maior.

A tese central da intervenção: **antecipar no `/plan` o que hoje só aparece em `/review` ou `/audit`**. Transformar detecção tardia em enforcement de planejamento.

---

## Decisões de escopo

| Categoria | Quantidade | O que é |
|---|---|---|
| Aprovadas | 5 | Mudanças concretas em 5 arquivos distintos |
| Rejeitadas | 3 | Findings reais mas não universalizáveis como regra de framework |
| Absorvidas | 1 | S-08 absorvido em Padrão 24 (contexto de dados externos) |

---

## Melhoria #1 — Matriz de Erros com colunas Logging e Teste

**Arquivo:** `.claude/rules/integration-checklist.md`

**Mudança:** adicionar duas colunas à Matriz de Erros existente (hoje com 5 colunas: Status HTTP, Tipo/código, Handler, UX, Recuperação). Novas colunas:

- **Logging/Diagnóstico** — o que deve ser logado (nível, campos obrigatórios, stack trace quando aplicável)
- **Teste** — referência ao teste que valida o comportamento declarado na linha

**Clarificação obrigatória:** a linha `5xx` da matriz cobre o **catch-all/fallback terminal**, não apenas erros de servidor conhecidos (ex: erro de banco). O handler que captura "qualquer exceção não-tratada" é uma linha obrigatória, não opcional.

**Findings cobertos:** F-04 (catch-all 500 sem log), QA-02 (headers sem teste), QA-03 (exception handler sem teste)

**Escopo:** ajuste pontual na tabela existente + instrução explícita sobre 5xx cobrir catch-all.

---

## Melhoria #2 — Subseção obrigatória no Passo 8 de `plan-construction.md`

**Arquivo:** `.claude/rules/plan-construction.md`

**Mudança:** adicionar subseção obrigatória dentro do Passo 8 (atualmente "Responsabilidades vs. Arquivos"). **Não criar Passo 13** — evitar churn em contagem de passos, `plan.md`, `plan-review.md`, Framework-Guide-V4 e `generate-guide.js`.

Título da subseção: **"Componentes críticos cross-cutting e classificação de risco"**

Checklist coberto:

- **Endpoint/operação** → classificar contra Security Regression Matrix (`testing.md`):
  - Classe A (toggles: like/follow/favorite) → teste de concorrência obrigatório
  - Classe B (saldo/crédito/estoque/recursos compartilhados) → teste de concorrência obrigatório
  - Classe C (jobs/webhooks/idempotência) → teste de replay e idempotência obrigatório (não necessariamente concorrência)
  - Classe D (lógica de negócio/anti-fraude) → teste de cenários de abuso e invariantes obrigatório

- **Middleware/handler global** → efeito observável declarado + teste dedicado como deliverable

- **Error handler** → preencher matriz completa de erros (status/body/log/teste) referenciando `integration-checklist.md`

- **Módulo concorrente** → declarar quais primitivas de sincronização são API pública vs internas

**Findings cobertos:** QA-04 (toggle Classe A sem teste de concorrência). Vetor principal: a regra existe em `testing.md:48` mas não é consultada no planejamento, só no review pós-implementação.

**Escopo:** subseção nova dentro de passo existente. Não mexe em contagem nem em referências cruzadas.

---

## Melhoria #3 — Padrão 24 em `implementation-quality.md`

**Arquivo:** `.claude/rules/implementation-quality.md`

**Mudança:** novo Padrão 24, escopo narrow: **"Dados externos carregados com shape assumido"**.

**Aplica-se a:** storage em arquivo (JSON/YAML), config files, cache, resposta de API externa, mensagens de fila, dados lidos de banco em colunas JSON/JSONB.

**Casos cobertos (taxonomia):**

1. **JSON/dado inválido sintaticamente** — `{` truncado, YAML malformado
2. **Válido sintaticamente mas com tipo errado** — `[]` onde se esperava `{}`
3. **Válido com shape errado** — `{"items": []}` onde se esperava `{"tasks": []}`
4. **Válido com item inválido** — `{"tasks": [{"id": "abc"}]}` onde `id` deveria ser numérico
5. **Exceções heterogêneas no mesmo `except`** — transitório (OSError) + corrupção (JSONDecodeError) + violação de schema (KeyError, TypeError) caindo no mesmo fallback sem distinção explícita de recuperação

**Regra preventiva:** validar schema do dado antes de confiar em unpacking (`data["tasks"]` direto é anti-padrão sem validação prévia).

**Regra reativa:** quando `except` captura classes heterogêneas, a estratégia de recuperação deve distinguir por classe (transitório = retry/log/reraise; corrupção = preservar dado original + criar novo; violação de schema = validation error + diagnóstico).

**Findings cobertos:** QA-01 (JSON `[]` gera TypeError não tratado → 500), S-08 (OSError transitório tratado igual a JSON corrompido, sobrescreve dados).

**Nota de escopo:** o padrão é narrow ("dados externos"). Casos de heterogeneous exceptions em contextos não-dados (ex: network timeout vs DNS vs SSL cert) ficam fora desta rodada — podem virar Padrão 25 se aparecerem em projetos futuros.

---

## Melhoria #4 — Nova seção em `testing.md`

**Arquivo:** `.claude/rules/testing.md`

**Mudança:** nova seção após a Security Regression Matrix.

Título: **"Testes de controles de segurança e infraestrutura declarados no plano"**

**Regra:** se o plano declara qualquer componente cross-cutting — middleware de headers de segurança, exception handler global, middleware de autenticação, rate limiter, logger estruturado, middleware de métrica — esse componente DEVE ter teste dedicado declarado como deliverable, assertando:

- **Efeito observável externo** — header presente no response, status correto, body sem stack trace/detalhe técnico
- **Efeito observável interno (quando aplicável)** — log emitido com campos esperados (timestamp, level, trace_id, stack trace no caso de catch-all), métrica incrementada

**Anti-padrão explícito:** testar apenas o comportamento do endpoint sem verificar se o componente cross-cutting produziu seu efeito. Ex: chamar endpoint e confirmar status 200 não prova que o middleware de `X-Frame-Options` adicionou o header.

**Findings cobertos:** QA-02 (headers sem teste), QA-03 (exception handler sem teste), F-15 (CSP ausente — seria pego aqui porque middleware de headers declarado no plano exigiria teste por header).

**Escopo:** nova seção curta, referenciada pela Melhoria #2 (Passo 8 subseção) e pela Melhoria #5 (web-api-security).

---

## Melhoria #5 — Referência cruzada em `web-api-security.md`

**Arquivo:** `.claude/rules/web-api-security.md`

**Mudança:** adicionar referência cruzada curta na seção "Headers de Segurança" apontando para:
- Melhoria #4 em `testing.md` (teste obrigatório de controles declarados)
- Melhoria #2 em `plan-construction.md` (subseção cross-cutting no Passo 8)

**Vedação explícita:** NÃO adicionar regra universal "qualquer header ausente = ALTO". Severidade de header ausente é contextual:
- CSP ausente em app web público multiusuário → ALTO
- HSTS ausente em API interna HTTP-only local → não aplicável
- X-Frame-Options ausente em CLI servindo HTML estático → BAIXO

**Formulação recomendada:** "Middleware dedicado a headers de segurança DEVE declarar quais headers cobre, quais omite e por quê. Ausência não justificada de CSP em app web que renderiza HTML dinâmico é finding MÉDIO; sobe para ALTO em app público, multiusuário ou com conteúdo de terceiros."

**Findings cobertos:** F-15 (CSP ausente) — mas a detecção real acontece via Melhoria #4 (teste obrigatório de controle declarado), não via nova severidade universal.

**Escopo:** cross-reference pontual, sem regra nova pesada.

---

## Rejeições explícitas

### F-02 — `_lock` acessado externamente

**Motivo:** o `/review` existente já captura o padrão. Adicionar regra universal em `structural-quality.md` sobre "primitivas de sincronização não vazam como API pública" gera falsos positivos em projetos onde locks são legitimamente compartilhados entre módulos coordenados (ex: `threading.Lock` num singleton coordenador).

**Condição para reversão:** se o padrão aparecer em 3+ projetos distintos sem o `/review` catching, reconsiderar.

### F-08 — `fetchJson()` descarta body de erro

**Motivo:** depende de UX/spec. Mensagens genéricas de erro são válidas em muitos contextos (APIs públicas com foco em privacidade, endpoints de saúde, CLI tools). O caso específico que importa (422 com `errors[].field` preservado para highlight de campos) está **implicitamente coberto pela Matriz de Erros** — se o handler de `VALIDATION_FAILED` precisa dos campos, o plano já força preservação do body.

**Condição para reversão:** se aparecer em projeto com validação complexa e a Matriz de Erros não for suficiente, reconsiderar.

### F-09 — Estado de edição destruído por `loadTasks()` concorrente

**Motivo:** escolha arquitetural específica de SPA (polling vs websocket, optimistic vs pessimistic updates, granularidade do merge). Já coberto genericamente em `state-management.md` ("Cancelamento ou ignorância de resposta tardia tratado quando aplicável"). Formalizar como padrão universal cria falsos positivos em apps que usam websocket com diff granular.

**Condição para reversão:** se aparecer em 3+ SPAs distintas com arquiteturas diferentes, considerar padrão específico.

---

## Absorção

### S-08 — `OSError` transitório tratado igual a JSON corrompido

**Onde foi absorvido:** Melhoria #3 (Padrão 24), parte "exceções heterogêneas no mesmo `except` com recuperação distinta".

**Justificativa:** o caso específico (arquivo JSON) é estreito demais para regra própria, mas o princípio por trás (erros transitórios + corrupção + violação de schema não podem cair no mesmo fallback sem distinção) é genérico e vale a pena ter no catálogo dentro do contexto de dados externos.

---

## Ordem sugerida de implementação

Cada item é pequeno e localizado. A ordem abaixo minimiza dependências cruzadas:

| Ordem | Melhoria | Arquivo | Depende de |
|---|---|---|---|
| 1 | #3 Padrão 24 | `implementation-quality.md` | — (auto-contido) |
| 2 | #1 Matriz + colunas | `integration-checklist.md` | — (auto-contido, referenciado por #2) |
| 3 | #2 Passo 8 subseção | `plan-construction.md` | #1 (referencia a matriz expandida), Security Regression Matrix em `testing.md` (já existe) |
| 4 | #4 Testes de controles | `testing.md` | #2 (subseção cross-cutting declara os controles que precisam de teste) |
| 5 | #5 Cross-ref | `web-api-security.md` | #2 e #4 |

---

## Métricas de verificação pós-implementação

Após aplicar as 5 mudanças, o próximo `/plan` sobre qualquer projeto-teste similar DEVE:

1. Classificar cada endpoint contra Security Regression Matrix explicitamente no plano (antes era omitido)
2. Declarar teste dedicado para cada middleware/handler global/security control (antes era implícito)
3. Preencher matriz de erros completa com colunas de logging e teste (antes só status/body/UX)
4. Aplicar validação de schema antes de unpacking de dados externos (antes era direto)
5. Distinguir estratégia de recuperação por classe de exceção em blocos `except` heterogêneos (antes era fallback único)

Se algum desses 5 comportamentos não se manifestar no próximo plano, a implementação da melhoria correspondente está incompleta.

---

## Nota final

Este documento registra **apenas** os achados validados e as decisões tomadas. Não contém histórico de iteração nem propostas rejeitadas durante a análise. O próximo passo é implementar as 5 mudanças na ordem sugerida.
