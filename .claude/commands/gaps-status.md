---
description: Verificar estado atual dos capability gaps — registro persistente de lacunas de verificacao
allowed-tools: Read, Grep, Glob
---

# /gaps-status — Estado dos Capability Gaps

## Proposito

Apresentar ao usuario o estado atual dos capability gaps registrados em `.claude/runtime/capability-gaps.json`. Este command e **read-only absoluto** — nunca modifica o registro de gaps, nunca cria gaps, nunca transiciona status.

Ver `.claude/rules/capability-gaps.md` para o contrato completo.

## Quando usar

- Para verificar rapidamente quais lacunas de verificacao o projeto tem
- Antes de decidir quais gaps resolver ou aceitar
- Ao retomar trabalho em sessao nova para entender postura de cobertura
- Apos `/gaps-scan` para revisar o que foi detectado

## Execucao

### Passo 1 — Ler registro de gaps

Ler `.claude/runtime/capability-gaps.json`:

- **Ausente** → reportar: "Registro de capability gaps nao encontrado. Executar `/gaps-scan` para detectar gaps e criar o registro, ou copiar `.claude/runtime/capability-gaps.template.json` para `capability-gaps.json` para bootstrap manual."
- **Presente** → validar schema. Se invalido, reportar erro.

### Passo 2 — Agregar por dimensoes

Agrupar gaps em contagens por:

- **Status:** open | acknowledged | accepted | filled | deferred
- **Tipo:** declaration_absent | never_run | stale | binding_gap | native_uncovered
- **Severidade:** high | medium | low
- **Categoria:** sensors | behaviours | linters | contracts | knowledge_base | pen_test | e2e | accessibility | ci_cd | dep_scan | performance | diagrams

### Passo 3 — Verificar coerencia

Detectar inconsistencias informativas (reportar, nao corrigir):

- Gap com `status: "accepted"` ou `status: "deferred"` sem `resolution_justification` preenchida
- Gap com `status: "filled"` mas condicao ainda detectavel (informativo — nao reabrir)
- `last_scan` muito antigo (>7 dias) — sugerir re-scan
- Gaps com `first_detected_at` muito antigo e `status: "open"` (esquecidos)

### Passo 4 — Output ao usuario

```markdown
# /gaps-status — Capability Gaps

## Ultimo scan: [timestamp ou "nunca"]

## Resumo

| Dimensao | Contagem |
|----------|----------|
| Total de gaps | N |
| Open (aguardando atencao) | N |
| Acknowledged (vistos) | N |
| Accepted (risco aceito) | N |
| Filled (resolvidos) | N |
| Deferred (adiados) | N |

## Por severidade

| Severidade | Open | Acknowledged | Accepted | Filled | Deferred |
|------------|------|--------------|----------|--------|----------|
| High | N | N | N | N | N |
| Medium | N | N | N | N | N |
| Low | N | N | N | N | N |

## Gaps abertos (requerem atencao)

| ID | Tipo | Categoria | Severidade | Descricao | Primeira deteccao | Ultima deteccao |
|----|------|-----------|------------|-----------|-------------------|-----------------|
(gaps com status "open", ordenados por severidade desc, depois por first_detected_at asc)

## Gaps com decisao humana

### Accepted (risco aceito)
| ID | Categoria | Justificativa | Aceito em |
|----|-----------|---------------|-----------|

### Deferred (adiados)
| ID | Categoria | Justificativa | Adiado em |
|----|-----------|---------------|-----------|

### Filled (resolvidos)
| ID | Categoria | Resolucao | Resolvido em |
|----|-----------|-----------|--------------|

### Acknowledged (vistos, sem decisao)
| ID | Categoria | Severidade | Descricao |
|----|-----------|------------|-----------|

## Alertas

(inconsistencias detectadas no Passo 3, se houver)

## Proximos passos sugeridos

- Gaps `open` com severidade `high`: resolver ou aceitar com justificativa
- Gaps `open` antigos: revisar e transicionar para `acknowledged`, `accepted` ou `deferred`
- Para re-escanear: executar `/gaps-scan`
- Para analise qualitativa de lacunas: executar `/skills-gap`
```

## Regras

1. **Read-only absoluto.** Este command nunca modifica `capability-gaps.json`. Leitura e apresentacao apenas.
2. **Nao executar `/gaps-scan`.** Se o registro esta ausente ou stale, recomendar ao usuario — nao executar automaticamente.
3. **Nao inferir resolucoes.** Se um gap `open` parece ter sido resolvido (arquivo que faltava agora existe), nao transicionar status — recomendar que o usuario rode `/gaps-scan` ou edite manualmente.
4. **Nao julgar decisoes humanas.** Se um gap esta `accepted`, apresentar a justificativa sem questionar. A decisao foi do humano.
5. **Gaps nao sao gate.** Apresentar como ferramenta de visibilidade, nao como lista de bloqueios.
