# Checklist de Segurança — Banco de Dados

## Credenciais e Conexão

- [ ] Strings de conexão usam variáveis de ambiente (nunca hardcoded)
- [ ] Senhas de banco não aparecem em código, configs ou logs
- [ ] Usuário de conexão NÃO é root/admin/sa (princípio do menor privilégio)
- [ ] Conexão usa SSL/TLS (sslmode=require, ssl=true, ou equivalente)
- [ ] Validação TLS configurada corretamente; não usar modos inseguros como sslmode=disable ou equivalentes sem verificação adequada do certificado

## Privilégios, Roles e Permissões

- [ ] Cada serviço usa role própria, sem compartilhar credenciais entre aplicações
- [ ] Usuário da aplicação não possui privilégios de superuser
- [ ] Permissões limitadas ao schema/tabelas realmente necessárias
- [ ] Operações de DDL não estão disponíveis para usuários de runtime
- [ ] Grants revisados explicitamente; sem permissões amplas por conveniência
- [ ] Acesso read-only separado quando aplicável para relatórios/consultas
- [ ] Credenciais de runtime, migration e administração são segregadas; a aplicação não reutiliza credenciais administrativas

## Portas e Exposição

- [ ] Porta do banco NÃO exposta publicamente em docker-compose.yml (sem "0.0.0.0:5432:5432" ou "3306:3306")
- [ ] Se precisa expor porta, usa bind em 127.0.0.1 (ex: "127.0.0.1:5432:5432")
- [ ] Arquivos de firewall/nginx não expõem porta do banco ao mundo externo
- [ ] Banco acessível apenas pela rede interna ou via VPN/tunnel

## Queries e Injeção

- [ ] Todas as queries usam prepared statements / parameterized queries
- [ ] Nunca concatenar input do usuário em SQL (f-string, format, +, template literals)
- [ ] ORMs configurados para parametrizar por padrão
- [ ] Queries dinâmicas (ORDER BY, nomes de tabela) validadas contra allowlist

## Dados Sensíveis

- [ ] Senhas de usuários armazenadas com hash seguro (bcrypt, argon2, scrypt)
- [ ] Nunca usar MD5 ou SHA1/SHA256 sem salt para senhas
- [ ] Dados sensíveis (PII, cartão, documentos) criptografados em repouso
- [ ] Campos sensíveis excluídos de logs e respostas de API (select explícito, não select *)

## Auditoria e Monitoramento

- [ ] Falhas de autenticação e acesso negado são registradas
- [ ] Ações administrativas e mudanças críticas possuem trilha de auditoria
- [ ] Logs do banco não expõem segredos ou payloads sensíveis
- [ ] Logs possuem retenção definida e destino centralizado quando aplicável
- [ ] Existe monitoramento básico de disponibilidade, uso anômalo e erro de conexão

## Migrations e Schema

- [ ] Migrations versionadas e rastreáveis
- [ ] Migrations reversíveis (down/rollback definido)
- [ ] Sem DDL destrutivo sem confirmação (DROP TABLE, TRUNCATE)
- [ ] Índices em colunas usadas em WHERE e JOIN

## Docker e Infraestrutura (análise de arquivos de config)

- [ ] Imagem do banco usa tag fixa (não :latest)
- [ ] Volumes do banco mapeados para persistência (dados não perdidos em restart)
- [ ] Variáveis sensíveis em docker-compose usam env_file ou secrets (não inline)
- [ ] Health check configurado para o serviço de banco
- [ ] Banco em rede Docker isolada (não na rede default/host)

## Concorrência e Locks

- [ ] Operações que modificam recursos compartilhados (saldo, estoque, contadores) usam transactions atômicas
- [ ] Advisory locks ou SELECT FOR UPDATE em operações que exigem exclusão mútua
- [ ] Lock aplicado desde o início do módulo — não adicionado retroativamente quando race condition é descoberta
- [ ] Operações de toggle (like/unlike, follow/unfollow) usam constraint de unicidade ou lock
- [ ] Módulos novos que manipulam recursos concorrentes devem ter lock planejado no /plan, não descoberto no /review

## Row Level Security (RLS)

- [ ] RLS habilitado em tabelas com dados de usuários quando o banco suporta (PostgreSQL, Supabase)
- [ ] Políticas RLS definidas por operação (SELECT, INSERT, UPDATE, DELETE)
- [ ] Tabelas filhas e auxiliares (categories, tags, servings, attachments) também têm RLS — não apenas a tabela principal
- [ ] RLS não depende apenas do frontend para filtrar dados — é enforcement no banco

## Tipos de Dados

- [ ] Valores monetários (amount, balance, price, total, discount) usam DECIMAL/NUMERIC — nunca FLOAT/REAL/DOUBLE
- [ ] Campos de percentual que participam de cálculos financeiros usam DECIMAL
- [ ] Timestamps com timezone quando o sistema opera em múltiplos fusos

## Backup e Recuperação

- [ ] Estratégia de backup mencionada ou configurada
- [ ] Backups NÃO armazenados no mesmo volume/servidor do banco
- [ ] Credenciais de backup não hardcoded
