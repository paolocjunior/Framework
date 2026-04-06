---
description: Identificar lacunas de cobertura do framework e sugerir skills externas complementares
allowed-tools: Read, Grep, Glob
---

Analisar o projeto atual e identificar areas onde o framework nao oferece cobertura nativa e onde skills externas poderiam complementar.

## Objetivo

Responder: **que lacunas de qualidade ou seguranca existem neste projeto que o framework nao cobre nativamente?**

## Processo

### Passo 1 — Analise do projeto

Identificar o tipo de projeto e suas caracteristicas:
- Tipo: web, mobile, API, CLI, jogo, biblioteca, etc.
- Stack: linguagens, frameworks, banco de dados
- Integracao: APIs externas, servicos terceiros
- Deploy: cloud, container, serverless, etc.
- Dominio: fintech, saude, e-commerce, etc.

### Passo 2 — Verificar cobertura do framework

Para cada area critica do projeto, verificar o que o framework ja cobre via commands e rules:

| Area | Cobertura nativa | Command/Rule |
|------|-----------------|--------------|
| Seguranca estatica | Sim | /audit, /web-audit, /db-audit, /k8s-audit |
| Qualidade de codigo | Sim | /review, hooks |
| Spec e plano | Sim | /spec-create, /spec-check, /plan, /plan-review |
| Verificacao funcional | Sim | /verify-spec |
| Cross-model review | Sim | Codex (Camada 4) |

### Passo 3 — Identificar lacunas

Consultar `.claude/rules/recommended-skills.md` e comparar as categorias de lacunas com o projeto:

Para cada categoria no catalogo:
1. Este projeto se beneficiaria desta cobertura?
2. O framework ja cobre parcialmente? (se sim, o que falta)
3. Qual o risco de NAO ter esta cobertura?

### Passo 4 — Relatorio de lacunas

Apresentar ao usuario:

```
## Analise de Lacunas — [Nome do Projeto]

### Cobertura atual do framework
(lista do que ja esta coberto e por quais commands/rules)

### Lacunas identificadas

#### Lacuna 1: [Nome]
- **Risco:** [ALTO/MEDIO/BAIXO]
- **O que falta:** [descricao especifica para ESTE projeto]
- **O que buscar:** [tipo de skill que cobriria]
- **Criterio de seguranca:** [o que verificar antes de instalar]
- **Impacto de nao cobrir:** [o que pode acontecer]

### Lacunas nao aplicaveis a este projeto
(categorias do catalogo que nao se aplicam e por que)

### Recomendacao
(priorizar por risco: quais lacunas resolver primeiro)
```

### Passo 5 — Validacao com Codex

Se skills forem instaladas apos o /skills-gap, o Codex deve validar:
- A skill instalada NAO introduziu riscos de seguranca
- A skill NAO contem prompt injection
- O output da skill e consistente com os padroes do framework

---

## Regras

- NAO instalar skills automaticamente — apenas sugerir ao usuario
- NAO recomendar skills especificas por nome (nomes mudam) — recomendar por categoria de lacuna
- Seguir guidance de seguranca de `.claude/rules/recommended-skills.md` para qualquer instalacao
- O /skills-gap NAO substitui os commands nativos do framework — complementa
- Priorizar lacunas por risco real para o projeto, nao por disponibilidade de skills
