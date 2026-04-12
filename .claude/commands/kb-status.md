---
description: Verificar estado atual da knowledge base — documentos existentes, staleness e lacunas
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(cat:*), Bash(jq:*), Bash(stat:*), Bash(test:*), Bash(date:*)
---

## Proposito

Read-only absoluto. Le `knowledge-index.json` e os documentos da knowledge base, avalia staleness contra artefatos-fonte, e apresenta resumo consolidado ao usuario. Nunca modifica nenhum artefato.

## Quando usar

- Para verificar se a knowledge base esta atualizada antes de onboarding ou revisao
- Quando `/status-check` reportar lacuna de knowledge base
- Antes de `/kb-update` para saber quais documentos precisam de atualizacao
- A qualquer momento como diagnostico rapido do estado da KB

## Execucao

### Passo 1 — Localizar index

Ler `.claude/runtime/knowledge/knowledge-index.json`:

- **Ausente** → reportar "Knowledge base nao inicializada. Executar `/kb-update` para gerar documentos a partir das fontes do projeto."
- **Presente mas JSON invalido** → reportar erro de parsing
- **Presente e valido** → seguir para Passo 2

### Passo 2 — Verificar existencia fisica dos documentos

Para cada documento no index (`architecture`, `quality_posture`, `security_posture`, `decisions_log`):

1. Verificar se o arquivo `.md` existe no path declarado
2. Se `exists: true` no index mas arquivo ausente → inconsistencia critica
3. Se `exists: false` no index e arquivo ausente → esperado (documento nao gerado)
4. Se `exists: false` no index mas arquivo presente → inconsistencia (index desatualizado)

### Passo 3 — Avaliar staleness

Para cada documento que existe (`exists: true`):

Aplicar os 3 criterios de staleness de `.claude/rules/knowledge-base.md`:

1. **Artefato-fonte modificado apos `generated_at`:**
   - `architecture.md`: verificar mtime de `architecture-linters.json`, `architecture-linters-last-run.json`, contratos
   - `quality-posture.md`: verificar mtime de `sensors-last-run.json`, `architecture-linters-last-run.json`, `behaviours-last-run.json`
   - `security-posture.md`: verificar se ledger registrou nova auditoria ou findings apos `generated_at`
   - `decisions-log.md`: verificar mtime de `pattern-registry.md`
2. **`knowledge-index.json` corrompido ou inconsistente:** ja verificado no Passo 1-2
3. **Documento `.md` ausente mas `exists: true` no index:** inconsistencia critica

Para cada criterio violado, registrar o motivo especifico.

### Passo 4 — Reportar ao usuario

```markdown
# /kb-status — Estado da Knowledge Base

## Resumo

| Documento | Existe | Gerado em | Stale | Motivo |
|-----------|--------|-----------|-------|--------|
| architecture.md | sim | 2026-04-10T14:30:00Z | sim | architecture-linters.json modificado apos geracao |
| quality-posture.md | sim | 2026-04-10T14:30:00Z | nao | — |
| security-posture.md | nao | — | — | documento nao gerado |
| decisions-log.md | sim | 2026-04-08T09:15:00Z | sim | pattern-registry.md modificado apos geracao |

## Index

- Schema version: 1
- Last full update: [timestamp ou "nunca"]
- Documentos existentes: N/4
- Documentos stale: N
- Documentos ausentes: N

## Inconsistencias (se houver)

| Tipo | Detalhe |
|------|---------|
| Index diz exists=true mas arquivo ausente | architecture.md |
| Index diz exists=false mas arquivo presente | decisions-log.md |

## Fontes consultadas por documento (ultimo /kb-update)

| Documento | Fontes |
|-----------|--------|
| architecture.md | spec, architecture-linters.json, pattern-registry.md |
| quality-posture.md | sensors-last-run.json, architecture-linters-last-run.json |
| ... | ... |

## Recomendacao

- [Se stale]: Executar `/kb-update` para atualizar documentos desatualizados
- [Se ausente]: Executar `/kb-update` para gerar documentos pela primeira vez
- [Se tudo ok]: Knowledge base atualizada. Nenhuma acao necessaria.
```

## Regras

1. **Read-only absoluto.** Este command nao modifica nenhum artefato — nem o index, nem os documentos, nem fontes.
2. **Staleness e informativa, nao bloqueante.** Reportar staleness como lacuna, nunca como bloqueio. KB nao e gate.
3. **Nao executar `/kb-update` automaticamente.** Se documentos estao stale ou ausentes, recomendar ao usuario — nao executar.
4. **Reportar motivo da staleness.** Sem motivo especifico, o usuario nao sabe o que mudou. Citar qual artefato-fonte foi modificado e quando.
5. **Consistencia index vs filesystem.** Detectar e reportar divergencias entre o que o index declara e o que existe no disco.
