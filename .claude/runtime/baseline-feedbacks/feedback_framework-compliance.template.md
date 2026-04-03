---
name: feedback-framework-compliance
description: Nenhuma implementação é trivial demais para o workflow. Sempre planejar, justificar e validar — sem exceções
type: feedback
---

Nenhuma implementação é pequena demais para pular o workflow padrão do CLAUDE.md.

Mesmo um fix de 1 linha deve seguir:
1. Ler arquivos relevantes
2. Planejar (descrever o que será feito e por quê)
3. Apresentar plano ao usuário para aprovação
4. Implementar somente após aprovação
5. Validar (hooks, testes, evidência)
6. Justificar escolhas técnicas (parâmetros, valores, abordagem)

**Why:** Padrão de erro recorrente: a IA racionaliza que um fix é "trivial demais para planejar" e pula etapas do workflow. Quando isso acontece, o framework perde valor — o objetivo do framework é garantir qualidade em TODA implementação, não apenas nas complexas.

**How to apply:** Antes de qualquer Edit/Write de implementação, verificar mentalmente: (1) apresentei plano? (2) usuário aprovou? (3) justifiquei parâmetros? Se qualquer resposta for "não", parar e corrigir o processo antes de codar. Isso vale para fixes de segurança, refatorações, novas features — tudo sem exceção.
