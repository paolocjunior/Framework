---
description: Auditoria de segurança focada em aplicações web e APIs — autenticação, autorização, proteção de dados, XSS, CSRF, CORS, headers e rate limiting
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(curl:*)
---

Realizar auditoria de segurança web e API no projeto seguindo a checklist em `.claude/rules/web-api-security.md`.

Buscar evidências em todos os arquivos relevantes do projeto:

- Rotas e controllers: routes/, controllers/, api/, endpoints/, handlers/, views/, pages/api/
- Middleware: middleware/, auth/, guards/, policies/, decorators/
- Webhooks e pagamento: webhook/, hooks/, stripe/, payment/, billing/, checkout/
- Configuração de servidor: server.js, app.js, app.py, main.py, settings.py, config/
- Configuração de segurança: cors.*, helmet.*, csp.*, security.*, auth.*
- Frontend que renderiza dados: components/, templates/, views/, pages/
- BaaS config: supabase/, firebase/, .firebaserc, supabase/migrations/, policies/
- Variáveis e secrets: .env*, config.*, settings.*
- Schemas e models: models/, schemas/, entities/, prisma/schema.prisma
- Descoberta de superfície: subdomínios, apps paralelos, staging/dev, rotas legadas, endpoints admin não referenciados no frontend

Buscar por padrões de risco:

- innerHTML, dangerouslySetInnerHTML, v-html com dados dinâmicos
- SELECT * em queries que retornam para o client
- Verificação de role/permissão apenas no frontend (if user.role === 'admin' sem server-side)
- Cookies sem Secure, HttpOnly ou SameSite
- localStorage.setItem com tokens de acesso
- CORS com origin: '*' e credentials: true simultaneamente
- Respostas de API retornando campos sensíveis (cpf, phone, password, ssn, credit_card)
- Endpoints sem middleware de autenticação ou autorização
- RLS desabilitado ou ausente em tabelas Supabase/Firebase
- Chaves de serviço (service_key, service_role) expostas no frontend
- Acesso por IDs previsíveis sem validação de ownership (IDOR / BOLA)
- Campos de HTML customizado aceitando scripts ou event handlers sem sanitização/allowlist
- Sessões não rotacionadas após login ou troca de senha
- Ausência de logging em tentativas de acesso admin negado ou leituras massivas
- Rate limiting ausente em endpoints públicos
- Flags de controle (released, is_premium, locked) sem validação server-side
- Senhas armazenadas com MD5, SHA1 ou SHA256 sem salt
- Tokens JWT sem expiração ou com secret fraco
- Webhooks sem validação de signature header (stripe-signature, x-signature)
- Rotas PATCH/PUT aceitando body inteiro sem allowlist de campos (mass assignment)
- User ID vindo do body da requisição em vez da sessão/JWT
- Operações financeiras sem transaction atômica (race condition / TOCTOU)
- Preços, totais ou descontos calculados no frontend e aceitos pelo backend sem recalcular
- Saldo, estoque ou limites validados contra valor enviado pelo client em vez do banco
- Upload de arquivos sem validação de conteúdo real (magic bytes), aceitando apenas extensão/Content-Type
- Arquivos enviados armazenados dentro do webroot ou acessíveis por URL direta sem auth
- Ausência de 2FA/MFA para contas administrativas
- Dependências com vulnerabilidades conhecidas (verificar package.json, requirements.txt, Gemfile)
- Debug mode ou configurações de desenvolvimento ativas em produção
- Arquivos de configuração, .git/, logs ou backups acessíveis publicamente
- Listagem de diretórios habilitada no servidor

Para cada item da checklist:

1. Verificar se existe no projeto
2. Se encontrar problema, reportar com:
   - Arquivo e linha exata
   - Evidência concreta (trecho de código, config ou referência direta)
   - O que está errado
   - Risco: CRÍTICO / ALTO / MÉDIO / BAIXO
   - Como poderia ser explorado (cenário real de ataque)
   - Correção recomendada com código concreto
   - O que não foi verificado neste item

Ao final, gerar resumo com:
- Escopo analisado (quais arquivos, módulos, áreas)
- Escopo NÃO analisado
- Total de problemas por severidade
- Top 3 riscos mais críticos
- Nível de confiança do veredicto
- Próximas ações recomendadas (ordenadas por prioridade)

NÃO fazer correções automaticamente. Apenas reportar e aguardar aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada achado.

---

## Itens Pendentes de Verificação

Após o resumo final, classificar TODAS as verificações que não puderam ser concluídas durante a auditoria.

### Classificação obrigatória

Cada item pendente deve ser classificado em uma das categorias:

**LOCAL (executável agora)** — verificações que podem ser executadas no ambiente atual, sem infra externa:

Subcategorias:
- **Baixo risco (read-only / não destrutivo):** pode sugerir execução direta. Exemplos: `npm audit`, `npx eslint .`, checagem de headers com `curl -I`, validação de dependências, `npm run build`, `npm test`.
- **Mutável (altera ambiente):** requer aviso explícito destacado antes de sugerir execução. Exemplos: `npm install`, `npm audit fix`, iniciar servidor para teste dinâmico.

**EXTERNO (requer ação fora do projeto)** — verificações que dependem de infraestrutura, serviços ou ambientes não disponíveis localmente:
Exemplos: testar CORS real com browser, verificar headers em produção, pentest dinâmico com OWASP ZAP, verificar TLS/HTTPS em proxy reverso, testar rate limiting sob carga real, auditoria de CDN/WAF, validação de CSP em navegador real.

### Formato de apresentação

```
## Itens Pendentes de Verificação

### Executáveis localmente

#### Baixo risco (read-only)
| # | Verificação pendente | Motivo da pendência | Comando sugerido |
|---|---------------------|--------------------|-----------------:|

#### Mutáveis (alteram ambiente) ⚠️
| # | Verificação pendente | Motivo da pendência | Comando sugerido | O que será alterado |
|---|---------------------|--------------------|-----------------:|--------------------:|

> Deseja que eu execute as verificações locais agora?
> - Itens de baixo risco serão executados diretamente.
> - Itens mutáveis serão executados apenas com sua confirmação explícita para cada um.

### Requerem ação externa

| # | Verificação pendente | O que é necessário | Como fazer (passo a passo) |
|---|---------------------|-------------------|---------------------------|
```

### Fluxo após confirmação do usuário

Se o usuário confirmar execução das verificações pendentes:

1. Executar APENAS as verificações locais sugeridas (baixo risco direto; mutáveis com confirmação individual)
2. NÃO executar verificações externas — apenas manter as instruções
3. Gerar relatório complementar APENAS das verificações executadas agora, no formato:

```
## Resultado Complementar — Verificações Pendentes Executadas

| # | Verificação | Comando executado | Status | Evidência (output) | Conclusão |
|---|------------|------------------|--------|-------------------|-----------|
```

4. Atualizar o nível de confiança geral se as novas verificações alterarem o panorama
5. Se alguma verificação local falhar ou revelar novos problemas, reportar no mesmo formato de achados do relatório principal
