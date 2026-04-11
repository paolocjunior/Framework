---
description: Revisão de código com critérios de desenvolvedor senior
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(wc:*), Bash(npm:*), Bash(npx:*), Bash(node:*)
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de revisar código:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Verificar fase atual, Open Items e bloqueios — revisão deve considerar estado acumulado
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

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

## Auditoria de cobertura de testes (QA)

Se o escopo da revisão incluir **código de produção** (não apenas arquivos de teste ou documentação), invocar o agent `qa-auditor` via Agent tool em paralelo com os demais agents de análise.

**Invocação:**
- **Objetivo:** "Auditar cobertura real de testes — detectar arquivos de produção sem teste correspondente e classificar por Security Regression Matrix"
- **Contexto:** lista de arquivos de produção no escopo da review + referência a `.claude/rules/testing.md` para as classes A/B/C/D
- **Escopo:** apenas detecção de ausência de testes e classificação por classe de risco — NÃO avaliar qualidade do código de produção (isso é do `code-reviewer`) nem buscar vulnerabilidades (isso é do `security-auditor`)
- **Critérios de veredicto:** COBERTURA_ADEQUADA | COBERTURA_PARCIAL | COBERTURA_INSUFICIENTE | COBERTURA_CRITICA conforme `.claude/rules/agent-contracts.md`

**Override de model condicional:** se o código em review toca classes B, C ou D da Security Regression Matrix (saldo/crédito/estoque, jobs/webhooks/idempotência, anti-fraude), passar `model: opus` na invocação do `qa-auditor`. Caso contrário, usar `sonnet` default.

**Paralelismo:** o `qa-auditor` é invocado **em paralelo** com `code-reviewer` e `security-auditor` (todos independentes, analisam o mesmo código de dimensões distintas) — conforme `.claude/rules/agent-contracts.md` seção "Invocações múltiplas".

Mapa de veredictos:

| Veredicto | Ação da review |
|---|---|
| `COBERTURA_ADEQUADA` | Review prossegue sem aviso de QA |
| `COBERTURA_PARCIAL` | Review registra aviso informativo |
| `COBERTURA_INSUFICIENTE` | Review adiciona finding `MÉDIO` de cobertura de testes |
| `COBERTURA_CRITICA` | Review adiciona finding `ALTO` — código de classe de risco sem teste correspondente, não aprova |
| `NEEDS_HUMAN_REVIEW` (falha de contrato) | Reportar a falha ao usuário e pedir decisão manual |

Se o escopo for apenas arquivos de teste, documentação ou configuração, pular esta etapa — não invocar o agent, poupa tokens.

---

## Self-check antes de publicar veredito

Antes de publicar o resultado final da revisão ao usuário, aplicar o checklist de `.claude/rules/review-quality.md`:

- Escopo analisado declarado (arquivos, módulos, funções)?
- Escopo NÃO analisado declarado (o que ficou fora e por quê)?
- Tipo de análise declarado (FULL / PARTIAL / SAMPLE)?
- Cada finding tem localização concreta (`arquivo:linha`)?
- Cada finding tem evidência verificável (trecho citado, não descrição vaga)?
- Nenhuma aprovação genérica ("o código está bom") — aprovações dizem o que foi verificado?
- Severidade declarada por finding (CRÍTICO / ALTO / MÉDIO / BAIXO)?
- Cada finding tem recomendação concreta com código de exemplo quando aplicável?

Se qualquer item falhar, corrigir o output e re-aplicar o checklist antes de publicar. Se cobertura efetiva < 80% e o veredicto for `APROVADO`, rebaixar para `APROVADO PARCIAL` ou declarar "requer análise adicional antes de aprovação final".

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
