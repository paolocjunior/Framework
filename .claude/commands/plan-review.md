---
description: Verificar plano de implementacao antes de codar
allowed-tools: Read, Grep, Glob, Agent
---

# /plan-review — Revisao de Plano de Implementacao

## Proposito

Revisar um plano de implementacao antes de autorizar execucao. Lanca 2 agents especializados, consolida achados e produz veredito com instrucao de correcao.

Este command NAO implementa nada. Apenas revisa o plano e reporta.

## Quando usar

- Apos `/plan` gerar um plano de implementacao
- Antes de autorizar implementacao
- Quando um plano for corrigido e precisar ser revalidado

## Execucao

### Passo 1 — Identificar contexto

Antes de lancar os agents, identificar:
- Qual modulo/feature esta sendo revisado
- Se existe spec formal correspondente
- Quais fases/modulos anteriores ja estao implementados
- O plano a ser revisado

Determinar REVIEW_MODE:
- **FULL**: existe spec formal (documento de especificacao com entidades, regras, limites)
- **TECHNICAL_ONLY**: nao existe spec formal, OU tarefa e refactor/bugfix/ajuste localizado

Se REVIEW_MODE=TECHNICAL_ONLY e o plano descreve feature nova com schema/API/jobs:
- Registrar achado NON-BLOCKING recomendando criacao de spec antes de implementar

### Passo 2 — Lancar 2 agents

Executar duas revisoes independentes:

```
Agent 1: spec-plan-validator
  → Recebe: plano + spec (se houver) + REVIEW_MODE
  → Foco: fidelidade a spec + qualidade tecnica
  → Output: SPV-01, SPV-02...

Agent 2: consistency-checker
  → Recebe: plano + estado atual do projeto
  → Foco: coerencia interna, contagens, dependencias, scope drift
  → Output: IC-01, IC-02...
```

### Passo 3 — Consolidar

#### 3a. Deduplicar
Se ambos agents reportaram o mesmo problema, manter o achado com melhor evidencia.

#### 3b. Resolver conflitos
Se agents discordam, aplicar precedencia documental (spec > projeto > plano).
Se evidencia e ambigua, marcar CONFIDENCE: MEDIA e recomendar revisao humana.

#### 3c. Classificar severidade

```
BLOCKING     → Impede implementacao. Divergencia com spec. Schema errado.
               Regra de negocio ausente. Source of truth ambigua.

NON-BLOCKING → Melhoria importante mas nao impede implementacao.
               Padrao inconsistente. Teste faltante. Contagem errada.

EDITORIAL    → Texto/wording. Nao afeta implementacao.
```

#### 3d. Produzir veredito

```
APPROVED                    → Zero BLOCKING. Zero NON-BLOCKING.
APPROVED_WITH_CORRECTIONS   → Zero BLOCKING. 1+ NON-BLOCKING.
NEEDS_REVISION              → 1+ BLOCKING.
NEEDS_HUMAN_REVIEW          → Conflito nao resolvivel entre agents.
                               Confianca baixa em achado critico.
                               Spec ambigua em ponto critico.
                               Trecho essencial ausente.
```

NEEDS_HUMAN_REVIEW NAO deve ser usado para: achados banais, melhorias editoriais, duvidas que poderiam ser resolvidas lendo melhor os arquivos.

### Passo 4 — Output

Formato obrigatorio:

```markdown
# /plan-review — [Modulo/Feature]

## Veredito: [APPROVED | APPROVED_WITH_CORRECTIONS | NEEDS_REVISION | NEEDS_HUMAN_REVIEW]
## Review Mode: [FULL | TECHNICAL_ONLY]

## Resumo
- Agents: 2/2 completaram
- Achados: X BLOCKING, Y NON-BLOCKING, Z EDITORIAL
- Open scan achados: X/6 possiveis

## Achados BLOCKING
[lista ou "Nenhum"]

## Achados NON-BLOCKING
[lista ou "Nenhum"]

## Achados EDITORIAL
[lista ou "Nenhum"]

## Conflitos entre agents
[lista de divergencias resolvidas e como, ou "Nenhum"]

## Instrucao de correcao
[Se NEEDS_REVISION ou APPROVED_WITH_CORRECTIONS: instrucao aplicavel diretamente]
[Se APPROVED: "Plano pronto para implementacao."]
```

## Regras

1. Nunca pular a checklist. Cada agent percorre todos os itens aplicaveis ao REVIEW_MODE.
2. Nunca inventar achados sem evidencia. Cada achado precisa de citacao da spec ou referencia concreta.
3. Open scan controlado: maximo 3 achados extras por agent (6 total).
4. Consolidator nao adiciona achados novos. Apenas deduplica, resolve conflitos e classifica.
5. Output e acionavel. Instrucao de correcao deve ser aplicavel diretamente.
6. Se REVIEW_MODE=TECHNICAL_ONLY, nao fingir que fidelidade a spec foi validada.

## Gatilhos para revisao humana adicional

Mesmo que o pipeline de APPROVED, recomendar revisao humana se:
- Modulo e complexo (financeiro, pagamentos, integracao externa, autenticacao)
- Pipeline encontrou 5+ achados NON-BLOCKING
- Houve conflito entre agents nao resolvivel por precedencia
- Algum achado tem CONFIDENCE: DEPENDE_DE_TRECHO_NAO_ENCONTRADO
