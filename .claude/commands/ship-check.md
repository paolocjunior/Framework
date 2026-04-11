---
description: Verificação pré-entrega — gate de qualidade antes de considerar o projeto/módulo pronto para distribuição ou deploy
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(python:*), Bash(pip:*), Bash(cargo:*), Bash(rustc:*), Bash(gradle:*), Bash(gradlew:*), Bash(dotnet:*), Bash(cmake:*), Bash(make:*), Bash(go:*), Bash(yarn:*), Bash(pnpm:*), Bash(bun:*), Bash(xcodebuild:*), Bash(swift:*), Bash(unity:*), Bash(godot:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de executar a verificação pré-entrega:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Verificar Open Items, bloqueios, fases pendentes e aprovações parciais
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir
5. **Fase pendente, item `DEFERRED` ou bloqueio ativo = ship-check não pode reportar PRONTO.** Esses itens devem aparecer explicitamente no output como motivos de rebaixamento.

---

Realizar verificação pré-entrega do projeto, avaliando se está pronto para distribuição, deploy ou entrega.

Os comandos e ferramentas de verificação devem ser adaptados à stack do projeto (ex.: npm/yarn/pnpm/bun, pip/pytest, cargo, gradle/gradlew, xcodebuild/swift, dotnet, cmake/make, go, unity/godot export pipeline). Os itens da checklist são universais; os comandos específicos variam por tecnologia.

A verificação é dividida em dois blocos com semânticas distintas:

---

## Bloco A — Release Viability

Verifica se o projeto **compila, funciona e não está quebrado**. Itens deste bloco são **bloqueantes** — falha aqui significa que o projeto não está pronto.

### A1. Build
- Projeto compila sem erros (`npm run build`, `tsc`, equivalente da stack)
- Se não houver build configurado, verificar se os arquivos-fonte estão sintaticamente corretos
- Em projetos com bundler (tsup, esbuild, webpack, rollup): verificar se o arquivo source tem shebang (`#!/usr/bin/env node`) E o bundler tem `banner` configurado com shebang — ambos juntos geram double shebang no output, causando SyntaxError ao executar

### A2. Testes
- Testes existentes passam sem falha
- Se não houver testes, registrar como lacuna bloqueante se o projeto tiver lógica crítica
- Cobertura mínima em código crítico (autenticação, pagamentos, regras de negócio)

### A3. Lint e Checagem de Tipos
- Lint passa sem erros (se configurado)
- Checagem de tipos passa sem erros (se aplicável)
- Se não configurados, registrar como recomendação
- Scripts declarados em `package.json` (lint, test, build, format) têm as dependências necessárias instaladas? Um script configurado sem a ferramenta instalada falha com "command not found" — nunca com "zero errors"

### A4. Configuração por Ambiente
- Configurações separadas por ambiente (dev/staging/prod)
- Debug mode desabilitado em configuração de produção
- Variáveis de ambiente documentadas ou com template (.env.example)

### A5. Dependências
- Sem vulnerabilidades CRÍTICAS em `npm audit` / `pip audit` / equivalente
- Sem dependências deprecated com vulnerabilidades conhecidas
- Dependências pinadas (sem ranges que puxem versões não testadas)

### A6. Secrets e Segurança Básica
- Nenhum secret hardcoded no código-fonte
- `.env` e arquivos de credenciais no `.gitignore`
- Sem chaves de API, tokens ou senhas expostos em manifests, configs ou logs

---

## Bloco B — Operational Readiness

Verifica se o projeto **está preparado para operar em produção com risco controlado**. Itens deste bloco são **recomendações** — falha aqui não impede entrega, mas aumenta risco operacional.

### B1. Observabilidade Mínima
- Erros tratados com contexto suficiente para diagnóstico
- Logging básico funcional em fluxos críticos
- Crash reporting ou estratégia de captura de erros definida (quando aplicável)
- Referência: `.claude/rules/observability.md`

### B2. Tratamento de Estado
- Estados de loading/erro/vazio tratados nas telas e fluxos principais
- Fonte de verdade identificável para domínios críticos
- Referência: `.claude/rules/state-management.md`

### B3. Performance Básica
- Sem gargalos óbvios (loops em main thread, listas sem paginação, requests sem timeout)
- Assets com carregamento controlado
- Referência: `.claude/rules/performance.md`

### B4. Itens Pendentes
- TODOs/FIXMEs críticos resolvidos ou documentados como débito técnico aceito
- Sem código morto ou comentado em fluxos de produção
- Breaking changes documentados

### B5. Documentação Mínima
- README com instruções de setup e execução
- Variáveis de ambiente documentadas
- Decisões técnicas relevantes documentadas (ou disponíveis via `/justify`)

---

## Formato de Saída

Para cada item de cada bloco, reportar:

| Item | Status | Evidência | Classificação |
|------|--------|-----------|---------------|
| (id) | PASS / FAIL / N/A / NÃO VERIFICADO | output de comando, referência a arquivo, ou observação | Bloqueante / Recomendação / Info |

Definição de status:
- **PASS** — item verificado com evidência suficiente e conforme
- **FAIL** — item verificado com evidência suficiente e não conforme
- **N/A** — item não se aplica à stack, arquitetura ou escopo do projeto
- **NÃO VERIFICADO** — item se aplica, mas não pôde ser confirmado com evidência disponível

### Avaliação final de risco (sempre)

Antes de publicar o veredicto final, **sempre** invocar o agent `risk-assessment` via Agent tool — esta é a última barreira antes da entrega. Diferente do `/plan`, onde a invocação é condicional, aqui é obrigatória e incondicional.

**Invocação:**
- **Objetivo:** "Avaliação final de risco arquitetural e operacional antes de entrega"
- **Contexto:** resultados do Bloco A, fase atual do ledger, Open Items abertos, mudanças recentes registradas, classes de risco aplicáveis ao projeto
- **Escopo:** apenas as 5 categorias do agent (irreversibilidade, incógnitas, ponto único de falha, débito técnico, risco de migração) — não duplicar análise de build/testes/lint/secrets (já cobertos pelo Bloco A)
- **Critérios de veredicto:** LOW_RISK | MEDIUM_RISK | HIGH_RISK | BLOCKING_RISK conforme `.claude/rules/agent-contracts.md`

**Override de model condicional:** se o projeto é financeiro, tem operações irreversíveis em produção, migração de dados em larga escala, ou tocou código de classes B/C/D da Security Regression Matrix — passar `model: opus` na invocação. Caso contrário, usar `sonnet` default.

Aplicar mapa de veredictos ao resultado final:

| Veredicto do agent | Ação no ship-check |
|---|---|
| `LOW_RISK` | Veredicto final permanece conforme Bloco A (PRONTO / PRONTO COM RESSALVAS / NÃO PRONTO) |
| `MEDIUM_RISK` | Se o Bloco A iria reportar PRONTO, rebaixar para PRONTO COM RESSALVAS e listar os riscos em DELIVERY |
| `HIGH_RISK` | Rebaixar para PRONTO COM RESSALVAS com os riscos destacados no topo do DELIVERY, independente do Bloco A |
| `BLOCKING_RISK` | Forçar veredicto NÃO PRONTO, independente do Bloco A — nenhum ship passa com BLOCKING_RISK ativo |

### Veredicto Final

Com base nos resultados:

- **PRONTO** — Todos os bloqueantes passam, recomendações sem risco alto, risk-assessment em LOW_RISK
- **PRONTO COM RESSALVAS** — Bloqueantes passam, mas há recomendações de risco significativo OU risk-assessment reportou MEDIUM_RISK/HIGH_RISK
- **NÃO PRONTO** — Pelo menos 1 bloqueante falhou OU risk-assessment reportou BLOCKING_RISK

Incluir:
- Lista de bloqueantes que falharam (se houver)
- Lista de recomendações de risco alto
- Lista de itens não verificados com motivo
- Resultado do risk-assessment com a matriz de riscos citada

---

## Atualização do Ledger

Ao concluir o ship-check, atualizar `.claude/runtime/execution-ledger.md`:
- Atualizar Current Status → Ship-check com o veredicto (PRONTO / PRONTO COM RESSALVAS / NÃO PRONTO)
- Registrar FAILs bloqueantes como Blockers
- Registrar FAILs não-bloqueantes como Open Items
- Registrar itens NÃO VERIFICADOS como Open Items com status PENDING
- Verificar se há fases com status PENDING ou DEFERRED no ledger que deveriam ter sido concluídas antes do ship-check
- Atualizar Last Updated em todos os itens modificados

---

## Itens Pendentes de Verificação

Após o veredicto, classificar verificações que não puderam ser executadas:

### Executáveis localmente

#### Baixo risco (read-only)
| # | Verificação pendente | Motivo da pendência | Comando sugerido |
|---|---------------------|--------------------|-----------------:|

#### Mutáveis (alteram ambiente) ⚠️
| # | Verificação pendente | Motivo da pendência | Comando sugerido | O que será alterado |
|---|---------------------|--------------------|-----------------:|--------------------:|

> Deseja que eu execute as verificações locais agora?

### Requerem ação externa

| # | Verificação pendente | O que é necessário | Como fazer (passo a passo) |
|---|---------------------|-------------------|---------------------------|

---

NÃO fazer correções automaticamente. Apenas reportar e aguardar aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada item verificado.
