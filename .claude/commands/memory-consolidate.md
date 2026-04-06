---
description: Consolidar memoria do projeto — reorganizar ledger, merge feedbacks, sincronizar trio
allowed-tools: Read, Grep, Glob, Write, Edit
---

Reorganizar e consolidar os arquivos de memoria do projeto sem perder historico. Consolidar sim, deletar nunca.

## Objetivo

Manter a memoria do projeto saudavel ao longo do tempo: ledger legivel, feedbacks concisos, snapshot atualizado. Nenhuma informacao e perdida — itens antigos sao compactados, nao deletados.

## Processo

### Passo 1 — Diagnostico

Ler e analisar o estado atual dos 3 componentes de memoria:

1. **Ledger** (`.claude/runtime/execution-ledger.md`):
   - Contar total de linhas
   - Contar itens por status (DONE, IN PROGRESS, BLOCKED, DEFERRED, NOT STARTED)
   - Identificar itens DONE ha mais de 2 fases que nao tem relevancia para o contexto ativo
   - Identificar itens duplicados ou redundantes

2. **Feedbacks comportamentais** (memoria do Claude Code):
   - Listar todos os feedbacks existentes
   - Identificar feedbacks redundantes (mesmo conceito com fraseado diferente)
   - Identificar feedbacks obsoletos (referenciando codigo que nao existe mais)

3. **Snapshot** (`memory/project_spec-status.md`):
   - Comparar com o ledger — esta atualizado?
   - Identificar divergencias

Apresentar diagnostico ao usuario com metricas:
```
## Diagnostico de Memoria

### Ledger
- Total de linhas: X
- Itens ativos: Y (IN PROGRESS: A, BLOCKED: B, PENDING: C)
- Itens concluidos: Z (candidatos a compactacao: W)
- Itens duplicados: N

### Feedbacks
- Total: X
- Redundantes (candidatos a merge): Y
- Obsoletos: Z

### Snapshot
- Sincronizado com ledger: SIM/NAO
- Divergencias: (lista)
```

### Passo 2 — Plano de Consolidacao

Apresentar ao usuario o que sera feito, com detalhes:

1. **Compactacao do ledger:**
   - Quais itens serao movidos para a secao "Historico Compactado"
   - Formato compactado: uma linha por item com ID, status final e data
   - Os itens saem da secao ativa mas permanecem pesquisaveis no final do arquivo

2. **Merge de feedbacks:**
   - Quais feedbacks serao mergeados e o texto resultante proposto
   - Quais feedbacks serao mantidos como estao

3. **Resincronizacao do snapshot:**
   - O que sera atualizado no snapshot para refletir o ledger

**Aguardar aprovacao do usuario antes de executar.**

### Passo 3 — Execucao

Apos aprovacao:

#### 3.1 Compactar ledger

Mover itens antigos DONE para uma secao no final do arquivo:

```markdown
---

## Historico Compactado

Itens concluidos movidos da secao ativa. Preservados para analise de padroes.
Consolidado em: [DATA]

| ID | Item | Status Final | Fase | Data |
|----|------|-------------|------|------|
| OI-001 | Descricao curta | DONE | B.1 | 2025-01-15 |
| OI-002 | Descricao curta | DONE | B.2 | 2025-01-20 |
```

**Regras de compactacao:**
- Apenas itens com status DONE ha mais de 2 fases
- Itens com padrao recorrente (apareceu em 2+ fases) sao PRESERVADOS na secao ativa com nota "padrao recorrente"
- Itens DEFERRED nunca sao compactados (estao pendentes)
- Itens BLOCKED nunca sao compactados (precisam de resolucao)
- Bloqueio: se um item DONE foi a causa de um fix que gerou um padrao recorrente, ele nao e compactado

#### 3.2 Merge feedbacks

Para feedbacks redundantes:
1. Identificar feedbacks que cobrem o mesmo conceito
2. Criar um feedback consolidado que preserva todas as nuances
3. Remover os feedbacks individuais
4. Apresentar antes/depois ao usuario

Exemplo:
```
ANTES (3 feedbacks):
- "Grep por import nao prova uso"
- "Encontrar import em 11 arquivos nao significa uso em 11 arquivos"
- "Verificar chamadas concretas, nao apenas imports"

DEPOIS (1 feedback):
- "Grep por import/declaracao nao prova uso real. Imports podem existir sem chamadas. Para confirmar uso: verificar chamadas concretas no corpo das funcoes. Se a verificacao foi amostral, declarar explicitamente."
```

#### 3.3 Resincronizar snapshot

Regenerar `project_spec-status.md` a partir do ledger atualizado, seguindo o template em `.claude/runtime/project-status.template.md`.

### Passo 4 — Relatorio

Apresentar resultado ao usuario:

```
## Consolidacao Concluida

### Ledger
- Itens compactados: X (movidos para Historico Compactado)
- Itens preservados na secao ativa: Y (incluindo Z com padrao recorrente)
- Reducao de linhas ativas: de A para B

### Feedbacks
- Feedbacks mergeados: X (de Y para Z total)
- Feedbacks mantidos: W

### Snapshot
- Resincronizado: SIM
- Divergencias corrigidas: X

### Proxima consolidacao recomendada
Quando o ledger ultrapassar [THRESHOLD] linhas ou apos [N] fases concluidas.
```

---

## Regras

- **Consolidar sim, deletar nunca.** Nenhuma informacao e perdida — apenas reorganizada
- **Itens com padrao recorrente sao preservados.** Se um item DONE apareceu em 2+ fases (mesmo tipo de problema), ele fica na secao ativa com nota. E exatamente esse tipo de item que permite identificar padroes de erro
- **Aprovacao do usuario e obrigatoria.** O passo 2 apresenta o plano, o passo 3 so executa apos aprovacao
- **O ledger e a fonte de verdade.** Snapshot e feedbacks sao derivados. Se houver divergencia, o ledger prevalece
- **Seguir protocolo do trio.** Ao final, os 3 arquivos devem estar sincronizados (ver `.claude/rules/state-sync.md`)
- **Nao consolidar durante implementacao ativa.** Este command deve ser rodado entre fases, nao durante

## Quando rodar

- Quando o ledger ultrapassar ~150 linhas ativas
- Ao final de um milestone ou entrega grande
- Quando o /status-check reportar muitos itens DONE antigos
- Quando feedbacks na memoria ultrapassarem 15-20 itens
