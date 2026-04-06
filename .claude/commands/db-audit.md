---
description: Auditoria de segurança focada em banco de dados — credenciais, exposição de portas, queries inseguras, privilégios, auditoria e configurações
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(docker:*)
context: fork
---

Realizar auditoria de segurança de banco de dados no projeto seguindo a checklist em `.claude/rules/database-security.md`.

Buscar evidências em todos os arquivos relevantes do projeto:

- Arquivos de configuração: docker-compose*.yml, .env*, *.conf, *.cfg, *.ini, *.toml, *.yaml
- Código fonte: *.py, *.js, *.ts, *.go, *.java, *.rb, *.php
- Migrations e schemas: pastas migrations/, alembic/, prisma/, knex/, sequelize/, typeorm/
- Artefatos SQL e schema: *.sql, schema.sql, seed.sql, prisma/schema.prisma, supabase/, db/, sql/, hasura/
- Políticas e acesso: arquivos contendo RLS, policies, grants, roles, permissions, auth mappings
- Infra: Dockerfile*, nginx.conf, supervisord.conf, terraform/, k8s/

Buscar também por padrões de credenciais e conexão:
- DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- postgres://, postgresql://, mysql://, mysql2://, mongodb://, redis://
- sslmode=, ssl=, rejectUnauthorized, trustServerCertificate

Para cada item da checklist:

1. Verificar se existe no projeto
2. Se encontrar problema, reportar com:
   - Arquivo e linha exata
   - Evidência concreta (trecho de código, config ou referência direta)
   - O que está errado
   - Risco: CRÍTICO / ALTO / MÉDIO / BAIXO
   - Como poderia ser explorado
   - Correção recomendada com código concreto
   - O que não foi verificado neste item

Atenção especial para:
- SQL inseguro em arquivos .sql soltos (fora de ORMs)
- Seeds com credenciais ou dados sensíveis reais
- Grants excessivos embutidos em migrations
- Políticas RLS ausentes em tabelas com dados sensíveis
- Roles com privilégios de superuser usadas pela aplicação

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
- **Baixo risco (read-only / não destrutivo):** pode sugerir execução direta. Exemplos: `npm audit`, validação de schema SQL, checagem de migrations, `docker compose config --quiet` (validação de syntax).
- **Mutável (altera ambiente):** requer aviso explícito destacado antes de sugerir execução. Exemplos: `npm install`, `docker compose up`, aplicar migrations, executar seeds.

**EXTERNO (requer ação fora do projeto)** — verificações que dependem de infraestrutura, serviços ou ambientes não disponíveis localmente:
Exemplos: conectar ao banco real para verificar grants/roles, verificar SSL real da conexão, testar backup/restore, verificar rede Docker em ambiente de produção, validar RLS com dados reais.

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
