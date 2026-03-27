# Checklist de Segurança

## Validação de Entrada

- [ ] Toda entrada do usuário é validada antes de uso
- [ ] Tipos, tamanhos e formatos são verificados
- [ ] Caracteres especiais são escapados/sanitizados
- [ ] Listas de permissão (allowlist) preferidas sobre listas de bloqueio (denylist)

## Autenticação e Autorização

- [ ] Senhas nunca armazenadas em texto plano (usar bcrypt, argon2)
- [ ] Tokens de sessão são aleatórios e com expiração
- [ ] Permissões verificadas em cada endpoint/ação
- [ ] Princípio do menor privilégio aplicado

## Dados Sensíveis

- [ ] Secrets em variáveis de ambiente, nunca no código
- [ ] Logs não contêm senhas, tokens, PII ou dados de cartão
- [ ] Dados sensíveis criptografados em trânsito (TLS) e em repouso
- [ ] .env e arquivos de credenciais no .gitignore

## SQL e Banco de Dados

- [ ] Queries parametrizadas (prepared statements) sempre
- [ ] Nunca concatenar input do usuário em queries
- [ ] Migrations versionadas e reversíveis
- [ ] Backups configurados e testados

## API e Rede

- [ ] Rate limiting implementado em endpoints públicos
- [ ] CORS configurado com origens específicas (nunca wildcard em produção)
- [ ] Headers de segurança configurados (X-Frame-Options, CSP, etc.)
- [ ] Respostas de erro não expõem detalhes internos

## Dependências

- [ ] Dependências pinadas com versão exata
- [ ] Audit de vulnerabilidades rodado antes de deploy
- [ ] Dependências não utilizadas removidas
- [ ] Licenças compatíveis com o projeto

## Código

- [ ] Sem eval(), exec() ou construções de execução dinâmica
- [ ] Sem deserialização de dados não confiáveis (pickle, unserialize)
- [ ] File paths validados contra path traversal (../)
- [ ] Uploads de arquivo validados (tipo, tamanho, extensão)

## Componentes Críticos de Segurança

- [ ] Não reinventar autenticação, sessão, recuperação de senha, verificação de e-mail ou billing/webhook validation quando houver solução madura e adequada ao stack
- [ ] Implementação custom de auth ou mecanismos criptográficos exige justificativa formal (via /justify)
- [ ] Preferir bibliotecas e serviços battle-tested (ex: Supabase Auth, NextAuth, Passport, Auth0, Clerk) sobre implementação artesanal
- [ ] Não implementar criptografia própria — usar bibliotecas padrão (crypto, bcrypt, libsodium)
