---
description: Verificar estado atual do projeto — fases, pendências, bloqueios e próximos passos
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(cat:*), Bash(wc:*)
---

Ler `.claude/runtime/execution-ledger.md` e reportar o estado atual do projeto de forma clara e acionável.

## O que verificar

1. Status de cada gate (spec, ui-plan, design, implementation, ship-check)
2. Fases concluídas vs pendentes vs bloqueadas vs adiadas
3. Itens adiados (DEFERRED) que ainda não foram retomados
4. Premissas aceitas que precisam ser revisitadas (verificar coluna Revisit When)
5. Bloqueios ativos
6. Itens abertos mais antigos (verificar Last Updated)
7. Padrões aprovados no pattern registry (ler `.claude/runtime/pattern-registry.md` se existir)
8. Padrões `deprecated` que ainda podem estar em uso no código
9. Resumo da última sessão (ler `.claude/runtime/session-summaries/latest.md` se existir — segue formato de handoff operacional com 6 seções estruturadas: onde estamos, o que está ativo, o que acabou de acontecer, o que falta fazer, o que bloqueia, fonte de verdade)
10. Knowledge base (ler `.claude/runtime/knowledge/knowledge-index.json` se existir — verificar existência, staleness e lacunas dos 4 documentos: architecture, quality-posture, security-posture, decisions-log)
11. Próxima ação recomendada com base no estado atual

## Formato de Saída

```md
## Project Status — [Nome do Projeto]

### Last Updated: [data do ledger]

### Gates
| Gate | Status | Last Updated |
|------|--------|--------------|

### Delivery Phases
| Phase | Status | Notes |
|-------|--------|-------|

### Pending Items (X total)
(lista resumida dos itens NOT STARTED, IN PROGRESS ou PENDING)

### Deferred Items (X total)
(lista resumida dos itens DEFERRED com condição de revisita)

### Assumptions to Revisit (X total)
(lista de assumptions cuja condição de revisita pode ter sido atingida)

### Active Blockers (X total)
(lista de blockers ativos)

### Active Patterns (X total)
(lista de padrões approved do pattern-registry com ID, decisão e escopo)

### Last Session Summary
(citar seções 1-3 do handoff de latest.md: onde estamos, o que está ativo, o que acabou de acontecer. Se latest.md não existir, reportar "Nenhum resumo de sessão encontrado")

### Knowledge Base (informativo)
| Documento | Existe | Stale | Ultima geracao |
|-----------|--------|-------|----------------|
(tabela derivada de knowledge-index.json. Se index ausente, reportar "Knowledge base nao inicializada — executar /kb-update para gerar")

### Next Recommended Action
(o que deveria ser feito agora, baseado no estado do ledger)
```

## Regras

- Se o ledger não existir, informar que o projeto não tem rastreamento ativo e sugerir copiar o template de `.claude/runtime/execution-ledger.md`
- Se o ledger estiver vazio (sem fases nem itens), reportar que nenhuma fase foi iniciada e sugerir rodar `/spec-check`
- NÃO alterar o ledger — este command é read-only
- Destacar itens DEFERRED que estão há muito tempo sem revisita
- Destacar assumptions cujo Revisit When já pode ter sido atingido
- Seguir `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md`
