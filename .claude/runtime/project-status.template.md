---
name: project-pipeline-status
description: Status do pipeline [NOME_DO_PROJETO] — [último gate] [resultado] ([data])
type: project
---

## Pipeline Status

| Phase | Status | Last Updated |
|-------|--------|--------------|
| Spec Check | NOT STARTED | |
| UI Plan | NOT STARTED | |
| Design Preview | NOT STARTED | |
| Implementation | NOT STARTED | |
| /ship-check | NOT RUN | |

## Ledger

- **Arquivo canônico:** `runtime/execution-ledger.md` (dentro do repositório)
- Regra de sincronização: ao mudar fase, atualizar o trio (ledger + project_spec-status.md + MEMORY.md)
- Ver `.claude/rules/state-sync.md` para protocolo completo

## Open Items (não bloqueantes)

(preenchido conforme findings são registrados)

## Bloqueios Ativos

(preenchido se houver)

**Why:** Snapshot resumido para contexto rápido em sessões novas. Para histórico completo, consultar o ledger.
**How to apply:** Ler este arquivo para contexto rápido no início de cada sessão. Para detalhes, consultar runtime/execution-ledger.md. Se este snapshot conflitar com o ledger, o ledger é a fonte de verdade.
