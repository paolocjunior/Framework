# Checklist de Segurança — Web e API

## Autenticação

- [ ] Login usa hash seguro para senhas (bcrypt, argon2, scrypt — nunca MD5/SHA sem salt)
- [ ] Tokens de sessão gerados com entropia criptográfica (crypto.randomBytes, secrets.token_urlsafe)
- [ ] Cookies de sessão/token configurados com flags: Secure, HttpOnly, SameSite=Strict
- [ ] Tokens JWT assinados com chave forte e algoritmo seguro (RS256 ou HS256 com secret longo)
- [ ] JWT tem expiração curta (exp) e validação de expiração no server-side
- [ ] Refresh tokens armazenados de forma segura (não em localStorage)
- [ ] Falhas de login não revelam se o usuário existe ("credenciais inválidas", não "usuário não encontrado")
- [ ] Rate limiting em endpoints de login e recuperação de senha
- [ ] Logout invalida o token/sessão no server-side (não apenas remove do client)
- [ ] Sessão/token é rotacionado após login, troca de senha e eventos sensíveis
- [ ] Troca de senha invalida sessões antigas e refresh tokens ativos
- [ ] Existe mecanismo de revogação de sessão em caso de suspeita de comprometimento
- [ ] Autenticação multifator (2FA/MFA) disponível e obrigatória para contas administrativas
- [ ] Política de senhas exige complexidade mínima (maiúsculas, minúsculas, números, símbolos)
- [ ] Preferir soluções maduras de autenticação (Supabase Auth, NextAuth, Auth0, Clerk, Passport) sobre implementação artesanal; custom auth exige justificativa formal

## Superfície de Exposição

- [ ] Subdomínios, ambientes de staging/dev e aplicações legadas não estão expostos publicamente sem necessidade
- [ ] Endpoints administrativos ou internos não ficam acessíveis apenas por "esconder no frontend"
- [ ] Rotas não documentadas, legadas ou órfãs são removidas ou protegidas
- [ ] APIs internas usam autenticação/autorização mesmo quando não referenciadas na interface
- [ ] Background jobs, cron endpoints e webhooks internos protegidos por autenticação (não expostos como endpoints HTTP públicos)
- [ ] Endpoints de administração, health-check detalhado e métricas internas não acessíveis sem autenticação

## Autorização e Controle de Acesso

- [ ] TODA verificação de permissão é feita no SERVER-SIDE (nunca confiar no frontend)
- [ ] Rotas de admin protegidas por middleware de autorização no servidor
- [ ] Mudar role/permissão no client-side NÃO concede acesso real (server valida sempre)
- [ ] Cada endpoint da API verifica se o usuário autenticado tem permissão para aquela ação
- [ ] Usuário só acessa seus próprios recursos (verificar ownership: user_id == recurso.owner_id)
- [ ] Controle de acesso a conteúdo (aulas, arquivos, features) validado no server-side
- [ ] Flags como released, is_premium, is_locked validadas no servidor, não apenas no client
- [ ] Endpoints de listagem não expõem recursos de outros usuários sem permissão explícita
- [ ] Operações destrutivas (delete, update) verificam permissão antes de executar
- [ ] Proteção contra IDOR/BOLA: IDs de recursos não podem ser usados para acessar ou alterar dados de outros usuários sem validação server-side
- [ ] IDOR em recursos filhos/relacionados: se o recurso pai tem ownership validado, os recursos filhos (servings, categories, tags, attachments) também DEVEM validar ownership — não herdar implicitamente do pai
- [ ] Proteção contra mass assignment: rotas de update (PATCH/PUT) usam allowlist explícita de campos editáveis; nunca aceitar o body inteiro sem filtrar
- [ ] ID do usuário vem SEMPRE da sessão/JWT, nunca do body da requisição

## Proteção de Dados nas APIs

- [ ] Respostas de API retornam APENAS os campos necessários para aquele contexto
- [ ] Dados sensíveis (CPF, telefone, email completo, endereço) NUNCA expostos em endpoints públicos
- [ ] Endpoints de listagem/busca não vazam PII de outros usuários
- [ ] Select explícito nos queries (nunca SELECT * em endpoints que retornam para o client)
- [ ] Dados sensíveis mascarados quando exibidos (ex: email j***@gmail.com, CPF ***.456.***-12)
- [ ] Paginação implementada em endpoints de listagem (sem retornar todos os registros de uma vez)
- [ ] Respostas de erro não expõem stack traces, queries SQL ou estrutura interna
- [ ] Headers de resposta não expõem tecnologias/versões do servidor (remover X-Powered-By, Server)

## Supabase / Firebase / BaaS

- [ ] Row Level Security (RLS) HABILITADO em TODAS as tabelas com dados sensíveis
- [ ] Políticas RLS definidas explicitamente por tabela e operação (SELECT, INSERT, UPDATE, DELETE)
- [ ] Chave anon/public tem acesso restrito (não pode ler/escrever tabelas administrativas)
- [ ] Service key NUNCA exposta no frontend (apenas no server-side)
- [ ] Tabelas administrativas inacessíveis via API pública
- [ ] Storage buckets com permissões configuradas (não públicos por padrão)
- [ ] Realtime subscriptions filtradas por RLS (usuário só recebe eventos dos seus dados)

## Webhooks e Integrações de Pagamento

- [ ] Rotas de webhook SEMPRE validam assinatura/signature header do provedor (stripe-signature, x-signature, etc.)
- [ ] Webhook não processa requisições sem assinatura válida (rejeitar com 401/403)
- [ ] Secret do webhook armazenado em variável de ambiente, nunca hardcoded
- [ ] Webhook é idempotente (processar o mesmo evento duas vezes não causa efeito duplicado)
- [ ] Webhook não confia em dados do body sem validar contra o provedor (ex: confirmar status do pagamento via API, não apenas pelo body)
- [ ] Rotas de webhook não usam nomes previsíveis (/api/webhook) sem proteção adicional

## Proteção contra XSS (Cross-Site Scripting)

- [ ] Todo input do usuário sanitizado antes de renderizar no HTML
- [ ] Campos de HTML customizado (rich text, markdown) passam por sanitizador (DOMPurify, bleach)
- [ ] Nunca usar innerHTML, dangerouslySetInnerHTML ou v-html com dados não sanitizados
- [ ] Content Security Policy (CSP) configurada para bloquear scripts inline não autorizados
- [ ] Dados do usuário escapados em templates server-side (Jinja2 autoescaping, template literals)
- [ ] Campos de HTML customizado usam allowlist restrita; scripts, event handlers inline e iframes não autorizados são bloqueados
- [ ] Recursos de customização visual não permitem execução arbitrária de JavaScript sem sandbox explícito e justificativa de produto

## Upload de Arquivos

- [ ] Tipo real do arquivo verificado por conteúdo (magic bytes), não apenas extensão ou Content-Type
- [ ] Extensão validada contra allowlist de tipos permitidos
- [ ] Nome do arquivo gerado aleatoriamente no server-side (nunca usar o nome original do usuário)
- [ ] Arquivos armazenados fora do diretório raiz da aplicação (fora do webroot) ou em storage separado (S3, GCS)
- [ ] Limite de tamanho definido e aplicado no servidor (não apenas no frontend)
- [ ] Arquivos executáveis (.php, .sh, .exe, .js, .py) bloqueados mesmo com extensão dupla
- [ ] Scan de conteúdo malicioso quando aplicável (antivírus, validação de integridade)
- [ ] Acesso a arquivos enviados validado por permissão (não acessível por URL direta sem autenticação)

## Proteção contra CSRF (Cross-Site Request Forgery)

- [ ] Token CSRF em formulários que executam ações (POST, PUT, DELETE)
- [ ] SameSite cookie policy configurada (Strict ou Lax)
- [ ] Endpoints de mutação não aceitam GET (apenas POST/PUT/DELETE)
- [ ] Validação de Origin/Referer header em requisições sensíveis

## Race Conditions (TOCTOU)

- [ ] Operações financeiras (saque, transferência, compra) usam transactions atômicas no banco
- [ ] Check e use acontecem dentro da mesma transaction (sem intervalo explorável)
- [ ] Recursos críticos (saldo, estoque, tickets) usam locks ou semáforos para evitar uso simultâneo
- [ ] Lock aplicado no recurso compartilhado correto (ex: lock no saldo do usuário, não no item sendo comprado)
- [ ] Operações toggle (like/unlike, follow/unfollow, favorite) usam constraint de unicidade ou lock para evitar estado inconsistente sob concorrência
- [ ] Operações de like, voto, resgate são idempotentes (duplicata não causa efeito dobrado)
- [ ] Compras simultâneas de itens diferentes validam saldo dentro da mesma transaction (não apenas o item individual)

## Integridade de Valores e Cálculos

- [ ] Preços, descontos e totais são SEMPRE calculados no server-side (nunca aceitar valor do frontend)
- [ ] Backend recalcula e compara valores recebidos do client antes de processar
- [ ] Quantidades, limites e saldos são validados no servidor contra o banco, não contra o que o frontend informou
- [ ] Cupons e promoções são aplicados e validados no server-side

## Headers de Segurança

- [ ] Strict-Transport-Security (HSTS) configurado
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY (ou SAMEORIGIN se necessário)
- [ ] Content-Security-Policy definida e restritiva
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] X-Powered-By removido
- [ ] Permissions-Policy configurada (câmera, microfone, geolocalização)

## Testabilidade dos controles de segurança

Todo controle de segurança web declarado ou implementado (headers, CSP, auth middleware, rate limit, CSRF, CORS policy, error pages seguras) DEVE ter evidência de teste dedicado conforme `.claude/rules/testing.md` seção **Infraestrutura cross-cutting testável**. Middleware de segurança sem teste dedicado é "implementado, mas não verificado" — falsa confiança que um scanner externo vai apontar depois.

**Regra:**

- [ ] Cada header de segurança declarado no plano tem teste que asserta sua presença e valor no response
- [ ] Cada middleware de auth/rate limit/CSRF/CORS tem teste dedicado do efeito observável (bloqueio, liberação, status, headers)
- [ ] Error pages seguras têm teste que asserta ausência de stack trace/SQL/path interno no body (referência cruzada com Padrão 24 em `.claude/rules/implementation-quality.md`)
- [ ] Plano declara classificação de endpoints contra Security Regression Matrix conforme `.claude/rules/plan-construction.md` Passo 8 — subseção "Componentes críticos cross-cutting"

**Severidade contextual de headers omitidos:**

Headers omitidos exigem justificativa contextual — não há regra universal "qualquer header ausente = ALTO". A severidade depende do ambiente:

- **CSP ausente em app web público, multiusuário ou com conteúdo de terceiros** → finding ALTO
- **CSP ausente em app web com renderização de HTML dinâmico** → finding MÉDIO
- **HSTS ausente em API interna HTTP-only (ambiente local, rede privada)** → não aplicável
- **X-Frame-Options ausente em CLI servindo HTML estático local** → finding BAIXO

Middleware dedicado a headers de segurança DEVE declarar explicitamente: quais headers cobre, quais omite e por quê. Omissão não justificada de header relevante ao contexto é finding; omissão com justificativa contextual documentada é aceitável.

## CORS (Cross-Origin Resource Sharing)

- [ ] Origins permitidas são específicas (nunca wildcard * em produção com credenciais)
- [ ] Methods permitidos são apenas os necessários
- [ ] Headers expostos são apenas os necessários
- [ ] Credenciais (cookies) só permitidas para origins confiáveis
- [ ] Preflight cache (Access-Control-Max-Age) configurado

## Rate Limiting e Proteção contra Abuso

- [ ] Rate limiting implementado em endpoints públicos (login, registro, busca, APIs)
- [ ] Rate limiting por IP e por usuário autenticado
- [ ] Endpoints de upload com limite de tamanho e frequência
- [ ] Proteção contra enumeração (user enumeration, resource enumeration)
- [ ] Respostas de rate limit retornam 429 com Retry-After header

## Dependências e Componentes de Terceiros

- [ ] Inventário atualizado de todas as bibliotecas e frameworks utilizados
- [ ] Audit de vulnerabilidades executado regularmente (npm audit, pip audit, bundle audit)
- [ ] Dependências com vulnerabilidades conhecidas atualizadas ou substituídas
- [ ] Versões de dependências pinadas (sem ranges que puxem versões não testadas)
- [ ] Dependências não utilizadas removidas do projeto
- [ ] Ferramentas automatizadas de monitoramento configuradas quando aplicável (Snyk, Dependabot, Renovate)

## Auditoria e Detecção

- [ ] Tentativas de acesso negado a rotas administrativas são registradas
- [ ] Leituras massivas de dados sensíveis geram alerta
- [ ] Mudanças em configurações críticas (tema, HTML customizado, permissões) são auditadas
- [ ] Eventos de autenticação, elevação de privilégio e erro de autorização têm trilha de auditoria

## Configurações e Hardening

- [ ] Configurações padrão de frameworks e serviços alteradas antes de produção (senhas padrão, portas padrão, debug mode)
- [ ] Modo debug/development desabilitado em produção
- [ ] Serviços e portas desnecessários desabilitados
- [ ] Arquivos de configuração, logs, backups e .git NÃO acessíveis publicamente
- [ ] Páginas de erro customizadas (sem stack traces, versões ou caminhos internos)
- [ ] Listagem de diretórios desabilitada no servidor web

## Lógica de Negócio e Anti-fraude

- [ ] Fluxos com saldo, crédito, comissão, cashback, cupom, reembolso ou limite consumível possuem invariantes de negócio formalizados
- [ ] Auto-benefício bloqueado: mesma identidade econômica não pode gerar e consumir promoção/comissão no mesmo fluxo
- [ ] Comissão/cashback não fica disponível para saque antes de expirar janela de reembolso/cancelamento
- [ ] Operações financeiras fecham contabilmente em qualquer ordem de eventos (compra→reembolso, reembolso→compra, saque→cancelamento)
- [ ] Cenários de abuso documentados para cada fluxo monetário: quem pode lucrar, cancelar, reverter, duplicar ou se auto-beneficiar
- [ ] Limites de uso definidos para operações repetíveis (cupons, resgates, trials, convites)
- [ ] Detecção de padrões suspeitos não depende exclusivamente de revisão humana manual

## URLs e Recursos Armazenados

- [ ] Recursos (imagens, arquivos) exibidos a outros usuários só podem vir de storage próprio, CDN própria ou allowlist explícita de domínios
- [ ] URLs externas arbitrárias não são aceitas em campos que serão renderizados para outros usuários (risco de tracker/IP grabber)
- [ ] URLs armazenadas no banco têm tamanho máximo definido e aplicado
- [ ] Query strings desnecessárias removidas/ignoradas em URLs de recursos internos antes de persistir
- [ ] Preferir armazenar object key ou path relativo em vez de URL completa quando o recurso é interno

## Validação de Tamanho de Input

- [ ] Todos os campos de entrada de texto têm limite de tamanho (max length) definido e aplicado no server-side
- [ ] Limite de tamanho é proporcional ao uso real do campo (nome: ~200 chars, bio: ~1000 chars, não ilimitado)
- [ ] Payloads de request têm limite global de tamanho no servidor (body parser limit)
- [ ] Campos de URL armazenados têm limite de tamanho explícito
