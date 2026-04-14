---
description: Criar plano de implementação antes de codar
allowed-tools: Read, Grep, Glob, Bash(rm:*)
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de planejar:

1. Ler `memory/project_spec-status.md` (snapshot do estado)
2. Se ausente, ler `runtime/execution-ledger.md` diretamente
3. Verificar Open Items, pendências, bloqueios e fase atual
4. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
5. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

Sem contexto carregado, o plano pode retrabalhar o que já foi resolvido ou ignorar bloqueios ativos.

---

## Vedações deste command

> **Nota de design:** o frontmatter `allowed-tools` não é barreira suficiente para este caso — comportamento observado em produção mostrou que o modelo principal conseguiu editar `spec.md` mesmo sem `Edit` no frontmatter. Por isso, as proibições abaixo são instruções explícitas no body do command, que é a única defesa eficaz disponível.

Este command é **read-only** em relação a todos os artefatos existentes do projeto:

- **Nunca editar** `spec.md`, `execution-ledger.md`, `AGENTS.md`, código-fonte, migrations, configs ou qualquer outro arquivo já existente
- Ao encontrar bug, inconsistência ou divergência em um artefato existente durante a análise: **reportar apenas**, inserindo no plano como pré-condição explícita (ex: "Pré-condição: spec.md contém ID duplicado D-10 — corrigir manualmente antes de iniciar implementação")
- A correção de artefatos é responsabilidade do command correspondente (`/spec-check` para spec, `/review` para código) — nunca do `/plan`
- As únicas escritas permitidas por este command são: (a) o plano como output textual no contexto, e (b) `rm -f .claude/runtime/.plan-approved`

---

Antes de qualquer implementação, criar um plano estruturado:

1. **Objetivo**: o que será implementado e por quê
2. **Contexto**: arquivos e módulos afetados (listar após explorar o projeto)
3. **Abordagem**: como será implementado, passo a passo
4. **Arquivos afetados**: lista explícita de todos os arquivos que serão criados, modificados ou deletados — com ação (CRIAR/MODIFICAR/DELETAR) e responsabilidade de cada um
5. **Justificativa**: por que esta abordagem e não alternativas
6. **Riscos**: o que pode dar errado e como mitigar
7. **Critérios de sucesso**: como verificar que ficou correto
8. **Estimativa**: quantidade de arquivos e mudanças envolvidas

Apresentar o plano e aguardar aprovação ANTES de implementar qualquer código.

Se o plano for aprovado com alterações, atualizar o plano e reapresentar.

Se o projeto usa o framework (possui `.claude/runtime/`) e o plano envolve testes ou validações mecânicas, incluir nota sobre bootstrap de sensores/behaviours quando `sensors.json` ou `behaviours.json` não existirem. Não presumir que existem — verificar e sugerir criação como passo do plano quando ausentes.

Consultar `.claude/rules/implementation-quality.md` para evitar padrões de erro recorrentes ao criar planos.
Executar os 11 passos de `.claude/rules/plan-construction.md` antes de finalizar o plano.

## Avaliação condicional de risco

Após o plano estar consolidado e antes de apresentá-lo ao usuário, verificar se ele contém qualquer um dos gatilhos abaixo:

- Migração de dados
- Mudança em integração externa
- Operação irreversível (drop table, reset, delete, truncate)
- Dependência nova crítica (biblioteca de autenticação, criptografia, pagamento, persistência)

Se **qualquer gatilho** estiver ativo, invocar o agent `risk-assessment` via Agent tool com:

- **Objetivo:** "Avaliar riscos arquiteturais e operacionais do plano consolidado"
- **Contexto:** texto completo do plano + referências a arquivos afetados
- **Escopo:** apenas as 5 categorias do agent (irreversibilidade, incógnitas, ponto único de falha, débito técnico, risco de migração) — não avaliar qualidade de código, fidelidade a spec ou coerência interna
- **Critérios de veredicto:** LOW_RISK | MEDIUM_RISK | HIGH_RISK | BLOCKING_RISK conforme `.claude/rules/agent-contracts.md`

**Override de model condicional:** se o projeto é financeiro, o plano toca em código de classes B/C/D da Security Regression Matrix (`.claude/rules/testing.md`), ou envolve migração de dados de produção em larga escala, passar `model: opus` na invocação da Agent tool. Caso contrário, usar o default `sonnet` do frontmatter do agent.

Aguardar o veredicto e aplicar o mapa abaixo:

| Veredicto do agent | Ação do command |
|---|---|
| `LOW_RISK` | Plano prossegue normalmente |
| `MEDIUM_RISK` | Plano prossegue com aviso destacado no topo + matriz de riscos citada |
| `HIGH_RISK` | Plano é apresentado com seção "Riscos" destacada no topo — usuário revisa antes de aprovar |
| `BLOCKING_RISK` | Plano **não** é apresentado — retornar ao início do command para reformulação, incluindo as mitigações sugeridas pelo agent |
| `NEEDS_HUMAN_REVIEW` (falha de contrato) | Reportar a falha ao usuário e pedir decisão manual antes de prosseguir |

Se nenhum gatilho estiver ativo, pular esta etapa — não invocar o agent, poupa tokens.

## Gate de implementação

Ao finalizar o plano, remover o marker de aprovação anterior (se existir) para forçar novo ciclo de `/plan-review`:

```bash
rm -f .claude/runtime/.plan-approved
```

Isso garante que o hook `pre-implementation-gate.sh` bloqueie código-fonte até que o `/plan-review` aprove este novo plano.

---

## Codex Adversarial Review (Camada 4)

Após apresentar o plano ao usuário, invocar `/codex:adversarial-review` passando como focus text:
- O plano completo (todos os elementos 1-8)
- A spec relevante (ou as seções mais críticas para o plano)
- Instrução: "Valide o plano contra a spec e a viabilidade técnica. Identifique: (1) inconsistências entre plano e spec, (2) riscos não declarados na seção de riscos, (3) dependências circulares entre fases, (4) suposições não verificadas sobre o código existente"

Ver protocolo completo de Codex review em `CLAUDE.md` seção "Cross-Model Review (Camada 4)".
