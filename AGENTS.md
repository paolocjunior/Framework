# AGENTS.md — Instruções do Codex para este projeto

## Idioma

Todas as respostas, análises, findings e recomendações devem ser em **Português Brasileiro (PT-BR)**.

## Framework de Qualidade

Este projeto usa o **Claude Code Quality Framework V4**. Os critérios normativos estão em:

- `CLAUDE.md` — configuração principal (princípios, workflow, regras)
- `.claude/rules/security.md` — checklist de segurança
- `.claude/rules/web-api-security.md` — segurança web e API
- `.claude/rules/database-security.md` — segurança de banco de dados
- `.claude/rules/code-review.md` — critérios de revisão de código
- `.claude/rules/testing.md` — estratégia de testes
- `.claude/rules/structural-quality.md` — qualidade estrutural

Ao revisar, **ler os arquivos de rules relevantes** para critérios detalhados. Se o sandbox bloquear a leitura, usar os critérios inline abaixo como fallback.

## Critérios de Review Adversarial (fallback inline)

### Segurança
- Inputs validados e sanitizados (nunca confiar em dados do client)
- Queries parametrizadas (nunca concatenar input em SQL)
- Autenticação e autorização verificadas server-side em todo endpoint
- Secrets em variáveis de ambiente (nunca hardcoded)
- Rate limiting em endpoints públicos
- Sem eval(), exec() ou construções de execução dinâmica
- Tokens com expiração e revogação
- Proteção contra IDOR/BOLA (verificar ownership)

### Qualidade de Código
- Funções com responsabilidade única (máximo ~30 linhas)
- Tratamento de erros explícito (nunca silenciar exceções)
- Sem código morto, duplicado ou comentado
- Constantes extraídas (sem magic numbers)
- Recursos liberados após uso (conexões, streams, listeners)

### Aderência ao Framework
- Workflow seguido: planejar → aprovar → implementar → validar
- Decisões técnicas justificáveis
- Alterações determinísticas (sem efeitos colaterais)

## Contexto do Projeto

<!-- PREENCHIDO AUTOMATICAMENTE pelo Claude Code quando /spec-check der READY -->
<!-- Se a spec mudar durante o projeto, o Claude Code atualiza esta seção -->
- **Tipo:** [web app / mobile / API / CLI / outro]
- **Stack:** [linguagens, frameworks, banco]
- **Objetivo:** [descrição curta do produto]

## Instruções para o Codex

- Atuar como **revisor adversarial**: questionar decisões, não apenas procurar bugs
- Reportar findings com: severidade, arquivo:linha, descrição, recomendação
- Se o focus text pedir validação de plano, analisar o plano descrito e dizer se resolve o problema, se tem falhas, e o que faria diferente
- NÃO implementar código — apenas revisar e reportar
- NÃO editar arquivos do projeto — modo read-only
