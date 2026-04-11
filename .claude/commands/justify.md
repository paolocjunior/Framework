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

## Pattern registry — geração de bloco para inserção manual

Se a decisão documentada for reutilizável em contextos futuros (ex: escolha de stack, padrão arquitetural, convenção de segurança, anti-pattern recorrente), **apresentar ao usuário o bloco formatado pronto para inserção** em `.claude/runtime/pattern-registry.md`.

Este command NÃO escreve no pattern-registry — suas ferramentas (`Read, Grep, Glob`) não permitem edição. A inserção é sempre manual pelo usuário: o command gera o bloco abaixo e o usuário decide se e quando colar no arquivo.

Formato obrigatório do bloco gerado (um por decisão elegível):

```markdown
### [ID]  <!-- gerar próximo ID sequencial por categoria, ex: ARCH-01, SEC-03 -->

- **Categoria:** [ex: Arquitetura, Segurança, Stack, Convenção]
- **Status:** draft
- **Decisão:** [o que foi escolhido, em 1 frase]
- **Alternativas Rejeitadas:** [o que foi descartado e por quê, em 1-2 linhas]
- **Escopo:** [onde se aplica — módulo, projeto inteiro, categoria de arquivos]
- **Aprovado Em:** YYYY-MM-DD
- **Revisitar Quando:** [condição concreta que invalida a decisão, ex: "migrar para X", "escala ultrapassar Y"]
```

Após apresentar o bloco, instruir o usuário: "Copie o bloco acima e cole em `.claude/runtime/pattern-registry.md` se quiser registrar este padrão."

Se nenhuma decisão for reutilizável, não gerar bloco.
