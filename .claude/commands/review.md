---
description: Revisão de código com critérios de desenvolvedor senior
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(wc:*), Bash(npm:*), Bash(npx:*), Bash(node:*)
---

Revisar o código recente ou os arquivos indicados usando os critérios em `.claude/rules/code-review.md` e `.claude/rules/structural-quality.md`.

Aplicar também as seguintes rules conforme o contexto do código revisado:
- `.claude/rules/state-management.md` — quando houver estado complexo, fluxo assíncrono, múltiplas telas ou sincronização
- `.claude/rules/observability.md` — quando houver integração, runtime crítico, operação em produção ou necessidade de diagnóstico
- `.claude/rules/performance.md` — quando houver renderização relevante, listas pesadas, uso intensivo de recursos, mobile ou jogo

Para cada problema encontrado:

1. Indicar arquivo e linha exata
2. Evidência concreta (trecho de código ou referência direta)
3. Classificar: bug, melhoria, estilo, segurança, performance
4. Explicar o impacto
5. Sugerir correção com código concreto
6. Indicar o que não foi verificado neste achado

Ao final:
- Escopo analisado (quais arquivos, módulos, áreas)
- Escopo NÃO analisado
- Resumo geral (aprovado / aprovado com ressalvas / precisa de revisão)
- Nível de confiança do veredicto
- Lista priorizada de mudanças recomendadas

NÃO aplicar correções. Apenas reportar para aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada achado.

Quando o objeto de revisão for um plano de implementação (não código), consultar `.claude/rules/plan-construction.md` para procedimento de verificação, ou sugerir uso de `/plan-review` para gate formal independente.

---

## Limitações desta revisão

Após o resumo final, incluir uma seção breve listando verificações dinâmicas que não foram executadas e que complementariam a revisão estática:

```
### Verificações dinâmicas não executadas
| Verificação | Motivo | Como executar |
|------------|--------|---------------|
```

Exemplos típicos: execução de testes (`npm test`), build (`npm run build`), linting (`eslint`, `ruff`), checagem de tipos (`tsc --noEmit`).

Esta seção é informativa — não inclui fluxo interativo de execução. Para verificações automatizadas completas, usar `/audit`. Para gate de entrega, usar `/ship-check`.
