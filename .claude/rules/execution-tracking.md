# Regras de Rastreamento de Execução

## Registro Obrigatório

- [ ] Toda divisão de trabalho em fases deve ser registrada no ledger com status, dependências e data
- [ ] Todo item adiado deve ter: descrição, motivo, escopo em que foi adiado, quando revisitar e status DEFERRED
- [ ] Toda aprovação parcial deve registrar o que foi aprovado E o que ficou pendente
- [ ] Toda premissa aceita (Safe Assumption) deve ter escopo de validade e condição de revisita
- [ ] Todo bloqueio deve registrar o que está bloqueado, por que e o que precisa ser resolvido

## Vedações

- [ ] Não tratar aprovação parcial como conclusão
- [ ] Não iniciar fase posterior ignorando pendências de fases anteriores
- [ ] Não assumir que item adiado foi resolvido sem evidência no ledger
- [ ] Não tratar item DEFERRED como se fosse DONE

## Status Permitidos

Usar exclusivamente os seguintes valores normalizados ao atualizar o ledger:

| Status | Significado | Quando usar |
|--------|-------------|-------------|
| NOT STARTED | Ainda não iniciado | Fase ou item registrado mas não começou |
| IN PROGRESS | Em andamento | Fase sendo implementada ativamente |
| PENDING | Aguardando ação ou decisão | Espera aprovação do usuário ou resolução de dependência |
| APPROVED | Aprovado pelo usuário | Gate ou entrega parcial aprovada |
| DONE | Concluído e verificado | Fase finalizada com evidência |
| BLOCKED | Impedido de prosseguir | Há dependência ou problema não resolvido |
| DEFERRED | Adiado conscientemente | Item válido mas movido para fase futura com justificativa |
| NOT RUN | Verificação não executada | Gate que deveria rodar mas ainda não rodou |

## Atualização

- O ledger deve ser atualizado ao final de cada command que gere veredicto, aprovação ou divisão de escopo
- Em sessão nova, o Claude Code deve ler o ledger antes de qualquer ação para entender o estado do projeto
- Cada atualização deve incluir a data (Last Updated) no item modificado

## Bootstrap

O template do ledger faz parte do framework base e é copiado junto com `.claude/` para cada novo projeto. O primeiro command que gera veredicto (normalmente `/spec-check`) preenche os dados iniciais.
