# Estratégia de Testes

## Princípios

- Código novo deve ter testes que cobrem o caminho feliz e os casos de erro
- Testes devem ser independentes entre si (sem dependência de ordem)
- Testes devem rodar rápido e de forma determinística
- Nomes de teste descrevem o cenário: `test_<funcao>_<cenario>_<resultado_esperado>`

## O Que Testar

- Funções com lógica de negócio
- Validações de entrada
- Tratamento de erros e exceções
- Limites e edge cases (strings vazias, listas vazias, valores nulos, overflow)
- Integrações com APIs externas (usar mocks)

## O Que NÃO Testar

- Getters/setters triviais sem lógica
- Código de terceiros/bibliotecas
- Configurações estáticas

## Padrão de Teste

Seguir o padrão Arrange-Act-Assert (AAA):

```
# Arrange: preparar dados e dependências
# Act: executar a ação sendo testada
# Assert: verificar o resultado esperado
```

## Mocks e Stubs

- Mockar dependências externas (APIs, banco, filesystem)
- Nunca mockar a unidade sendo testada
- Mocks devem refletir o comportamento real da dependência
- Verificar que mocks são chamados com os argumentos corretos
- `clearAllMocks()` (Jest/Vitest) limpa histórico de chamadas mas NÃO limpa filas de `mockOnce` — testes que falham no meio deixam entradas não consumidas que vazam para testes subsequentes. Usar `resetAllMocks()` quando o suite usa `mockOnce` e precisar de isolamento completo entre testes.

## Cobertura

- Buscar cobertura significativa, não cobertura de vaidade
- Priorizar testes em código crítico (segurança, pagamentos, dados)
- Cobertura de branches é mais importante que cobertura de linhas

## Security Regression Matrix

Quando o projeto tiver fluxos das classes abaixo, testes de concorrência e abuso são obrigatórios:

### Classe A — Toggles (like, follow, favorite, vote)

- Múltiplas requisições idênticas simultâneas não criam efeito duplicado
- Estado final é consistente independente da ordem de chegada
- Constraint de unicidade ou lock impede "likes fantasmas"

### Classe B — Saldo, crédito, estoque, recurso compartilhado

- Compra simultânea de itens diferentes não resulta em saldo negativo ou débito parcial
- Reembolso simultâneo não duplica crédito
- Consumo e reversão concorrentes mantêm invariante contábil (saldo fecha)
- Lock está no recurso compartilhado (saldo do usuário), não apenas no item

### Classe C — Jobs, webhooks, idempotência

- Replay do mesmo evento não causa efeito duplicado
- Mesma operação com mesmo request_id/idempotency_key é processada apenas uma vez
- Reprocessamento após timeout não corrompe estado

### Classe D — Lógica de negócio e anti-fraude

- Auto-benefício bloqueado (ex: afiliado não compra com próprio cupom + reembolsa)
- Fluxos monetários fecham contabilmente em qualquer ordem de operação
- Cenários de abuso documentados são cobertos por test cases

### Reforço: Security Regression Matrix é gate do plano, não da revisão

A classificação contra esta matriz é **deliverable obrigatório do plano** quando o projeto tem fluxos aplicáveis — não artefato descoberto em `/review` ou `/audit` depois que o código já está escrito. Para cada endpoint/operação/fluxo de mutação planejado, o plano declara explicitamente Classe A, B, C, D ou "fora da matriz" junto com o teste correspondente por classe. Ver `.claude/rules/plan-construction.md` Passo 8 — subseção "Componentes críticos cross-cutting".

## Infraestrutura cross-cutting testável

Componentes globais ou transversais declarados no plano DEVEM ter teste dedicado do seu efeito observável. Testes tendem a focar lógica de negócio e endpoints diretos; componentes que interceptam todas as requisições/respostas ficam sem teste dedicado e produzem falsa confiança — o endpoint responde 200, mas o middleware de segurança não adicionou o header esperado.

**Componentes cobertos:**

- Middleware de headers de segurança (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Exception handler global / catch-all / fallback terminal
- Logger global e error handler
- Auth middleware (bloqueio e liberação por permissão)
- Rate limiter (limite, status 429, headers de retry)
- CORS middleware (origins, methods, headers, credentials)
- CSRF middleware (token validation, SameSite policy)
- Outros interceptors/filters/middlewares declarados no plano

**Regra:**

Para cada controle declarado no plano, o teste dedicado valida:

1. **Efeito observável externo** — o que a requisição vê: status, header presente no response, body seguro (sem stack trace/detalhe técnico), redirect, bloqueio ou mensagem
2. **Efeito observável interno (quando aplicável)** — o que o sistema registrou: log emitido com campos esperados (`request_id`, `timestamp`, `level`, stack trace no catch-all), métrica incrementada, tracing/span criado

**Exemplos concretos:**

- **Middleware de headers de segurança** → teste assera que cada header declarado no plano aparece no response: `assert response.headers["Content-Security-Policy"] == "..."`, `assert response.headers["X-Frame-Options"] == "DENY"`
- **Exception handler global** → teste dispara exceção não-tratada e asserta: (a) response tem status 500 com body seguro (sem stack trace, sem query SQL, sem path interno); (b) log interno recebeu entrada com `level=error` + stack trace + `request_id`
- **Logger de erro terminal** → teste confirma que catch-all emite log com campos obrigatórios (`request_id`, `route`, `exception_class`, stack trace) antes de responder ao usuário
- **Auth middleware** → dois testes: (a) requisição sem token retorna 401; (b) requisição com token válido passa e chega ao handler
- **Rate limiter** → teste dispara N+1 requisições e asserta: (a) a N+1ª retorna 429; (b) response tem header `Retry-After`; (c) log registra o usuário e a rota bloqueados

**Anti-padrão explícito:**

Testar apenas o endpoint principal sem verificar se o componente cross-cutting produziu seu efeito. Chamar endpoint e confirmar status 200 **não prova** que o middleware de `X-Frame-Options` adicionou o header; prova apenas que o endpoint respondeu. A ausência do header passa despercebida até um scanner de segurança externo apontar.

**Regra de conclusão:**

Não considerar um controle cross-cutting coberto apenas porque o endpoint principal passou no teste. Cada controle tem teste dedicado — sem teste dedicado, o controle é "implementado, mas não verificado", que é o mesmo que não estar lá.
