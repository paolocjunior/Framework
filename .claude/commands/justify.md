---
description: Documentar justificativas técnicas das decisões tomadas
allowed-tools: Read, Grep, Glob
---

Analisar o código recente ou os arquivos indicados e documentar as decisões técnicas:

Para cada decisão relevante:

1. **Decisão**: o que foi escolhido
2. **Alternativas consideradas**: o que mais poderia ter sido feito
3. **Justificativa**: por que esta opção e não as alternativas
4. **Trade-offs**: o que se ganha e o que se perde
5. **Evidência**: dados, benchmarks, referências ou lógica que sustentam a escolha

Formato de saída: lista clara e concisa, organizada por arquivo ou módulo.

Se alguma decisão não tiver justificativa sólida, apontar como ponto de atenção.

Se a decisão documentada for reutilizável em contextos futuros (ex: escolha de stack, padrão arquitetural, convenção de segurança, anti-pattern recorrente), sugerir ao usuário registrar como padrão em `.claude/runtime/pattern-registry.md` com formato estruturado (ID, Categoria, Status, Decisão, Alternativas Rejeitadas, Escopo, Aprovado Em, Revisitar Quando).
