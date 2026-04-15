# Checklist de Integração — Migração Mock para API Real

## Propósito

Prevenir bugs recorrentes ao migrar telas/módulos de dados mockados para API real. Baseado em análise de padrões que reincidiram em 4+ fases de integração frontend.

## Verificações obrigatórias por tela/módulo migrado

### Dados hardcoded de mock

- [ ] Buscar strings de data fixa (ex: "2024-01-15", "Janeiro 2024") no arquivo — substituir por valores dinâmicos
- [ ] Buscar IDs estáticos (ex: `id: 1`, `userId: "abc"`) — substituir por IDs reais da API
- [ ] Buscar constantes de teste (ex: `MOCK_`, `FAKE_`, `TEST_`, `DUMMY_`) — remover ou substituir
- [ ] Nenhum dado de mock pode existir em modo real — se existir, é bug

### Types do frontend vs schemas do backend

- [ ] Comparar types do frontend com schemas/models reais do backend (não apenas com a spec)
- [ ] Nomes de campos idênticos (ex: backend diz `meal_log`, frontend não pode dizer `mealEntry`)
- [ ] Enums com mesmos valores (ex: backend diz `"pending" | "done"`, frontend não pode dizer `"active" | "completed"`)
- [ ] Campos opcionais vs obrigatórios alinhados
- [ ] Se o backend retorna shape diferente do mock (paginado, nested, etc.), ajustar o acesso no frontend

### Resposta paginada vs array direto

- [ ] Se o endpoint retorna lista paginada (`{ items: [], total, page }`), acessar `.items` do response
- [ ] Não acessar response direto como array quando a API retorna objeto paginado
- [ ] Verificar se hooks de data fetching tratam a estrutura paginada corretamente

### Feedback de mutations

- [ ] Toast de sucesso APENAS em callback `onSuccess` (nunca inline antes do `mutate()`)
- [ ] Navegação para outra tela APENAS em callback `onSuccess`
- [ ] Toast de erro em callback `onError` com mensagem clara ao usuário
- [ ] Estado de loading durante a mutation (botão disabled, spinner)

### Type safety

- [ ] Zero `as any` no arquivo final de tela/componente
- [ ] Se types não compilam após reestruturação, corrigir o acesso ao campo — não silenciar o TypeScript
- [ ] `as any` é proibido como workaround de compilação em código de tela — se necessário em código de infraestrutura, deve ter justificativa documentada

### Design tokens

- [ ] Zero valores de cor hex hardcoded em telas/componentes (usar tokens do design system)
- [ ] Zero constantes de paleta locais em telas (mover para theme/tokens centralizado)

### Contrato de formato de erro

- [ ] O projeto declara em um único local (constantes, tipos, documento de contrato) o shape do corpo de erro retornado pela API
- [ ] Todas as rotas seguem o mesmo shape de erro — sem mistura de `{detail: "msg"}`, `{message: "msg"}`, `{errors: [{field, message}]}` no mesmo backend
- [ ] O shape cobre pelo menos: código de erro estável (string ou enum), mensagem legível para humano, lista de erros de validação por campo quando aplicável, identificador de correlação/request-id
- [ ] Frontend consome o shape único — parser de erro é compartilhado entre telas, não reimplementado por tela
- [ ] Divergência entre o shape declarado e o shape real retornado por uma rota específica é flag — rota precisa alinhar com o contrato, não o contrato com a rota
- [ ] Estrutura do shape não expõe stack traces, queries SQL, paths internos ou nomes de variáveis do backend em produção
- [ ] Códigos de erro estáveis (ex: `INSUFFICIENT_FUNDS`, `EMAIL_ALREADY_EXISTS`) são declarados como enum no contrato — frontend compara contra o enum, não contra a mensagem em linguagem natural
- [ ] Mensagens em linguagem natural podem mudar sem breaking change; códigos de erro estáveis não mudam sem versionamento

### Matriz de erros como deliverable do plano

Planos que envolvem integração frontend↔backend devem declarar uma matriz de erros explícita antes da implementação. Formato expandido com 8 colunas — cada linha preenche todas as colunas, sem "ver depois":

| Status HTTP | Tipo/código | Handler | Body | UX | Recuperação | Logging/Diagnóstico | Teste |
|---|---|---|---|---|---|---|---|
| 400 | `VALIDATION_FAILED` | `onValidationError` | `{code, message, errors: [{field, message}]}` | Highlight dos campos + mensagens inline | Usuário corrige e reenvia | `level=info`, campos: `request_id, route, field_errors_count` | `test_validation_highlights_fields` |
| 401 | `TOKEN_EXPIRED` | `onAuthError` | `{code, message, request_id}` | Redirect para login com mensagem | Refresh token ou novo login | `level=info`, campos: `request_id, user_id, route` | `test_expired_token_redirects_to_login` |
| 403 | `PERMISSION_DENIED` | `onPermissionError` | `{code, message, request_id}` | Toast de acesso negado | Contatar admin ou voltar | `level=warning`, campos: `request_id, user_id, resource, attempted_action` | `test_denied_permission_shows_toast` |
| 404 | `RESOURCE_NOT_FOUND` | `onNotFound` | `{code, message, request_id}` | Empty state específico da tela | Voltar ou buscar outro | `level=info`, campos: `request_id, resource_type, resource_id` | `test_missing_resource_shows_empty_state` |
| 409 | `CONFLICT` / `DUPLICATE` | `onConflict` | `{code, message, conflict_with, request_id}` | Modal explicando colisão | Resolver conflito manualmente | `level=info`, campos: `request_id, resource_type, conflict_key` | `test_conflict_opens_resolution_modal` |
| 422 | `BUSINESS_RULE_VIOLATED` | `onBusinessError` | `{code, message, rule, request_id}` | Toast com mensagem de negócio | Ajustar ação conforme regra | `level=info`, campos: `request_id, rule_id, user_id` | `test_business_rule_rejects_with_toast` |
| 429 | `RATE_LIMITED` | `onRateLimited` | `{code, message, retry_after, request_id}` | Toast + disable botão por N segundos | Esperar e tentar de novo | `level=warning`, campos: `request_id, user_id, route, retry_after` | `test_rate_limit_disables_button` |
| 5xx (catch-all/fallback terminal) | `SERVER_ERROR` | `onServerError` | `{code, message, request_id}` — mensagem genérica segura, sem detalhe técnico | Toast genérico + retry opcional | Retry automático ou manual | `level=error`, campos: `request_id, route, exception_class`, **stack trace obrigatório no log interno** | `test_unhandled_exception_logs_and_returns_safe_body` |

Regras:

- [ ] Toda rota do plano tem os status de erro esperados listados na matriz
- [ ] Cada status tem handler declarado no frontend — não "trata erros" genérico
- [ ] Cada linha declara o shape do body retornado pelo backend, não apenas o status
- [ ] Cada handler tem UX definida — sem "mostra toast" sem especificar mensagem, posição, duração
- [ ] Cada erro tem estratégia de recuperação — usuário corrige, sistema retry, operação volta
- [ ] Cada linha declara política de logging: nível (`info`/`warning`/`error`), campos obrigatórios no log, e se stack trace é obrigatório (sempre para 5xx)
- [ ] Cada linha referencia um teste que valida o comportamento declarado, ou marca `n/a` com justificativa explícita
- [ ] A linha `5xx` cobre o **catch-all/fallback terminal**, não apenas erros de servidor conhecidos (ex: erro de banco). O handler que captura "qualquer exceção não-tratada" é uma linha obrigatória da matriz, não opcional
- [ ] Erros que NÃO devem ser expostos ao usuário final (5xx com detalhe técnico) são mapeados para mensagem genérica segura no body — o diagnóstico vai para log, não para response
- [ ] Matriz incluída como deliverable do plano, não deixada para "ver depois" no implementador

Referência cruzada: o preenchimento das colunas `Body` e `Logging/Diagnóstico` depende da preservação estrutural do erro pelo cliente HTTP — ver seção **Contrato do cliente HTTP** abaixo. Sem preservação do body no wrapper HTTP, a matriz é promessa sem execução.

### Contrato do cliente HTTP

Wrappers de HTTP (`fetchJson`, `apiClient`, `axiosClient`, `httpClient`) DEVEM preservar informação estruturada em respostas de erro. Matriz de erros e contrato de body perdem valor se o wrapper descarta o corpo da resposta em erros 4xx/5xx e entrega ao frontend apenas uma string genérica.

**Regras:**

- [ ] Em erro 4xx/5xx, o erro propagado pelo wrapper carrega (quando disponível): `status` HTTP, `body` parseado, `code` de erro estável, lista de `errors` por campo quando aplicável, `request_id`/`correlation_id`
- [ ] O wrapper expõe uma classe/tipo de erro único (ex: `HttpError`) que carrega esses campos, em vez de lançar `Error("HTTP 422")` genérico
- [ ] Parser de erro é **compartilhado** entre telas — frontend consome `error.body.code`, `error.body.errors`, `error.request_id`, não reimplementa parser em cada tela
- [ ] Contrato do wrapper é testado: teste dedicado valida que erro 422 com body `{code, errors: []}` chega no caller com todos os campos preservados

**Vedações:**

- [ ] Não reduzir `422` com detalhes de validação a `Error("HTTP 422")` — o frontend perde os campos que permitem highlight de validação por campo
- [ ] Não descartar body de `409`, `422`, `429` ou `5xx` se a matriz de erros depende dele (campos `conflict_with`, `rule`, `retry_after`, `request_id`)
- [ ] Não forçar cada tela a reimplementar parser de erro — o wrapper é o único ponto de parsing
- [ ] Não silenciar erros de parse: se o body não casa com o shape esperado do contrato, o wrapper registra isso no log (Padrão 25 — dados externos com shape assumido) e propaga erro com status preservado

**Exceção (UX genérica):**

Quando a spec exige deliberadamente mensagem genérica e nenhum detalhe por campo ao usuário (ex: API pública com foco em privacidade, endpoints de saúde, CLI tools), o wrapper ainda DEVE preservar `status` e `request_id` para diagnóstico interno. A UX genérica é responsabilidade do caller (mostrar "Erro ao processar" em vez de `body.message`), não do wrapper (que segue preservando o body estruturalmente para log e suporte).

## Quando aplicar

- Ao migrar qualquer tela de dados mockados para API real
- Ao conectar formulários a endpoints reais
- Ao substituir hooks de mock por hooks de API
- Em fases de "Functional Completion" ou "Integração"

## Vedações

- [ ] Não considerar migração completa sem verificar TODOS os itens acima por tela
- [ ] Não assumir que "compilou = funciona" — types podem compilar mas shapes podem divergir
- [ ] Não copiar padrão de acesso do mock (`.data`) quando a API retorna estrutura diferente (`.data.items`)
- [ ] Não deixar matriz de erros para descobrir durante a implementação — matriz é deliverable do plano, não artefato emergente
- [ ] Não ter shapes de erro divergentes entre rotas do mesmo backend — o contrato de erro é único por backend
