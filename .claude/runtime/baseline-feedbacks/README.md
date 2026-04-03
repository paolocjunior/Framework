# Baseline Feedbacks — Templates de Referência

Estes arquivos são **templates** de feedbacks comportamentais (Camada 3) que todo projeto pode usar como referência para construir sua camada de reforço comportamental.

## Como usar

Estes templates NÃO são carregados automaticamente. Eles servem como referência para quando o Claude Code ou o usuário decidir criar feedbacks na memória do projeto.

Para ativar um feedback baseline:
1. Ler o template desejado
2. Copiar o conteúdo para a memória do Claude Code (sistema de memória nativo)
3. Adaptar o conteúdo ao contexto específico do projeto se necessário

## Feedbacks disponíveis

| Template | Propósito |
|----------|-----------|
| `feedback_framework-compliance.template.md` | Impedir que a IA racionalize pular etapas do workflow |
| `feedback_never-accept-blindly.template.md` | Garantir validação com evidência real antes de aceitar claims |
| `feedback_update-trio.template.md` | Manter sincronização entre ledger, snapshot e índice de memória |

## Por que templates e não feedbacks automáticos

Feedbacks nascidos de incidentes reais (orgânicos) tendem a ser mais efetivos que feedbacks pré-carregados. O `**Why:**` de um feedback orgânico referencia um incidente concreto que a IA viveu — isso tem mais peso do que uma regra genérica.

Estes templates existem para acelerar o bootstrapping da Camada 3, não para substituir a construção orgânica de feedbacks ao longo do projeto.
