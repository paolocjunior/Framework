---
name: feedback-update-trio
description: Sempre atualizar ledger + project_spec-status + MEMORY.md juntos ao mudar estado do projeto
type: feedback
---

## Regra de Sincronização

Ao concluir, avançar ou mudar status de qualquer fase, sub-fase, Open Item ou bloqueio, atualizar os 3 arquivos de estado em conjunto — nunca apenas 1 ou 2.

| # | Arquivo | O que atualizar | Quando |
|---|---------|-----------------|--------|
| 1 | `runtime/execution-ledger.md` | Status de fases, datas, review/audit log, Open Items | Ao final de cada command com veredicto |
| 2 | `memory/project_spec-status.md` | Pipeline status resumido, Open Items, bloqueios | Ao final de cada fase concluída ou mudança significativa |
| 3 | `memory/MEMORY.md` | Linha que aponta para project_spec-status.md | Sempre que project_spec-status.md for atualizado e a descrição mudar |

**Why:** Quando o ledger é atualizado mas a memória não, a sessão seguinte começa com contexto desatualizado e pode retrabalhar itens já resolvidos ou ignorar novos bloqueios.

**How to apply:** Ver `.claude/rules/state-sync.md` para o protocolo completo. O ledger é a fonte de verdade. O snapshot é derivado do ledger. Os 3 devem ser consistentes entre si.
