---
description: Gerar ou atualizar documentos da knowledge base a partir de evidencia acumulada do projeto
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(jq:*), Bash(date:*), Bash(sh:*), Bash(bash:*), Bash(find:*), Bash(cat:*), Bash(wc:*), Bash(stat:*), Bash(test:*), Bash(node:*), Bash(python:*)
---

## Carregar contexto (obrigatorio antes de qualquer outra acao)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de executar:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Declarar no inicio do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`

---

## Proposito

Unico command que escreve nos documentos da knowledge base. Le artefatos-fonte do projeto (ledger, contratos, sensores, behaviours, linters, pattern-registry, auditorias) e sintetiza 4 documentos navegaveis em `.claude/runtime/knowledge/`. Segue o protocolo completo de `.claude/rules/knowledge-base.md`.

A knowledge base e **view consolidada**, nao fonte de verdade. Em caso de divergencia entre KB e fontes, as fontes prevalecem e o `/kb-update` deve ser re-executado.

## Quando usar

- Apos marcos significativos (fase concluida, auditoria realizada, sprint fechado)
- Antes de onboarding de novo contribuidor (para gerar mapa navegavel do projeto)
- Quando `/kb-status` reportar staleness em documentos criticos
- Periodicamente, a criterio do usuario — nunca automaticamente por hook

## Pre-requisitos

- `.claude/rules/knowledge-base.md` existe (contrato do protocolo)
- Pelo menos 1 artefato-fonte existe (ledger, sensores, contratos, pattern-registry, etc.)
- Projeto sem nenhum artefato-fonte gera knowledge base vazia com declaracao explicita de ausencia

## Flags suportadas

| Flag | Efeito |
|------|--------|
| `--only <doc>` | Atualizar apenas 1 documento (`architecture`, `quality`, `security`, `decisions`) |
| `--force` | Persistir mesmo sem mudanca semantica (ignora anti-churn) |
| `--dry-run` | Gerar documentos em memoria e reportar diff sem persistir |

## Execucao

### Passo 1 — Verificar estrutura

1. Verificar se `.claude/runtime/knowledge/` existe. Se nao, criar.
2. Ler `.claude/runtime/knowledge/knowledge-index.json`. Se ausente ou corrompido, criar a partir do bootstrap null-safe (ver schema em `.claude/rules/knowledge-base.md`).

### Passo 2 — Coletar fontes disponiveis

Ler (se existirem) os seguintes artefatos-fonte:

| Artefato | Path | Usado por |
|----------|------|-----------|
| Execution ledger | `runtime/execution-ledger.md` | Todos os documentos |
| Pattern registry | `runtime/pattern-registry.md` | `architecture.md`, `decisions-log.md` |
| Sensors declaration | `runtime/sensors.json` | `quality-posture.md` |
| Sensors last run | `runtime/sensors-last-run.json` | `quality-posture.md` |
| Architecture linters declaration | `runtime/architecture-linters.json` | `quality-posture.md`, `architecture.md` |
| Architecture linters last run | `runtime/architecture-linters-last-run.json` | `quality-posture.md` |
| Behaviours declaration | `runtime/behaviours.json` | `quality-posture.md` |
| Behaviours last run | `runtime/behaviours-last-run.json` | `quality-posture.md` |
| Active contract | `runtime/contracts/active.json` | `architecture.md`, `quality-posture.md` |
| Phase contracts | `runtime/contracts/phase-*.json` | `architecture.md` |
| Spec (se existir) | Especificacao do projeto | `architecture.md` |

Para cada artefato:
- Se presente: registrar path em `sources_consulted[]` do documento correspondente
- Se ausente: registrar ausencia como lacuna no documento (nao como erro)

### Passo 3 — Gerar cada documento

Para cada documento (ou apenas o solicitado via `--only`):

#### 3.1 — `architecture.md`

Fontes: spec, planos, contratos, linters, pattern-registry

Secoes obrigatorias:
- **Stack** — extrair de spec/contratos/codigo: linguagens, frameworks, runtime, banco
- **Camadas** — extrair de linters/spec/codigo: estrutura de camadas e responsabilidades
- **Invariantes declarados** — extrair de `architecture-linters.json`: cada linter = 1 invariante
- **Modulos principais** — extrair de spec/contratos: lista com proposito de cada modulo/area
- **Decisoes estruturais** — extrair de `pattern-registry.md`: decisoes com impacto arquitetural

Tamanho alvo: 50-100 linhas. Se ultrapassar ~150 linhas, refatorar — e atlas, nao mapa.

#### 3.2 — `quality-posture.md`

Fontes: sensores, linters, behaviours, cobertura de testes, ledger

Secoes obrigatorias:
- **Resumo** — 1-2 frases sintetizando postura geral
- **Sensores** — tabela com ultimo status de cada sensor (id, tipo, status, data). Derivar de `sensors-last-run.json`
- **Architecture linters** — tabela com ultimo status de cada linter (id, categoria, status, data). Derivar de `architecture-linters-last-run.json`
- **Cobertura de testes** — se sensor de testes existe, reportar; se nao, reportar ausencia
- **Divida tecnica** — open items do ledger classificados como debito

Secoes opcionais:
- **Behaviours** — tabela com ultimo status (se `behaviours-last-run.json` existir)
- **Tendencia** — se houver historico suficiente (2+ runs), indicar direcao

Tamanho alvo: 50-100 linhas.

#### 3.3 — `security-posture.md`

Fontes: auditorias (ledger), findings abertos, sensor `security-scan`, spec

Secoes obrigatorias:
- **Resumo** — 1-2 frases sintetizando postura
- **Ultimo audit** — data e veredicto do ultimo `/audit` ou `/web-audit` (buscar no ledger)
- **Findings abertos** — lista de findings nao resolvidos (buscar no ledger por entries com severidade CRITICO/ALTO sem resolucao)
- **Dependencias** — resultado do sensor `security-scan` (se existir em `sensors-last-run.json`)
- **Postura de autenticacao** — resumo de como auth esta implementada (extrair de spec/codigo)

Tamanho alvo: 50-80 linhas.

#### 3.4 — `decisions-log.md`

Fontes: pattern-registry, /justify entries no ledger, decisoes registradas

Cada entrada segue formato conciso:
```markdown
### [ID] — [Titulo]
- **Decisao:** o que foi decidido
- **Contexto:** por que foi decidido (1-2 frases)
- **Impacto:** onde isso afeta o projeto
- **Fonte:** referencia concreta (pattern-registry entry, /justify, ledger entry, data)
```

Regras:
- Cada entrada aponta para **fonte concreta** — sem decisoes sem trilha
- Sem tentativa de "recontar toda a historia" — foco em decisao/contexto/impacto/fonte
- Entradas derivadas do pattern-registry referenciam o ID do padrao
- Maximo sugerido: 30 entradas. Alem disso, consolidar ou arquivar

Tamanho alvo: 50-150 linhas.

### Passo 4 — Header padronizado

Todo documento gerado DEVE incluir no topo:

```markdown
> **Derived from:** [lista curta dos artefatos-fonte efetivamente consultados]
> **Authority:** Em caso de divergencia, prevalecem as fontes listadas acima.
> **Last semantic update:** [data ISO-8601 UTC desta geracao]
```

O header garante rastreabilidade. Documento sem header e invalido.

### Passo 5 — Deteccao de mudanca semantica (anti-churn)

Para cada documento gerado:

1. Calcular hash SHA-256 do conteudo gerado (excluindo o header `Last semantic update` — que muda a cada run)
2. Comparar com `content_hash` atual no `knowledge-index.json`
3. Se hashes sao iguais:
   - **Nao persistir** (anti-churn — evitar diffs inuteis no Git)
   - Reportar: "documento [X] sem mudanca semantica — nao atualizado"
   - Manter `generated_at` e `content_hash` inalterados no index
4. Se hashes diferem (ou documento nao existia):
   - Persistir o documento novo
   - Atualizar `generated_at`, `content_hash`, `sources_consulted`, `stale: false`, `stale_reason: null`, `exists: true` no index
5. Se `--force` foi passado: persistir independentemente do hash

### Passo 6 — Persistir documentos

Para cada documento que passou no filtro anti-churn:

1. Escrever o conteudo em `.claude/runtime/knowledge/<nome>.md`
2. Atualizar `knowledge-index.json` com:
   - `exists: true`
   - `generated_at`: ISO-8601 UTC
   - `content_hash`: primeiros 16 chars do SHA-256
   - `sources_consulted`: array de paths dos artefatos lidos
   - `stale: false`
   - `stale_reason: null`
3. Atualizar `last_full_update` no index (se todos os 4 documentos foram processados)

### Passo 7 — Atualizar ledger

Registrar no `.claude/runtime/execution-ledger.md`:

```
### Knowledge Base Update — <ISO timestamp>
- Documentos atualizados: [lista dos que mudaram]
- Documentos sem mudanca: [lista dos que nao foram persistidos por anti-churn]
- Fontes consultadas: [lista agregada]
```

### Passo 8 — Reportar ao usuario

```markdown
# /kb-update — Resultado

Contexto carregado: [fase atual], [open items: N], [bloqueios: N]

## Documentos processados

| Documento | Status | Linhas | Hash | Fontes |
|-----------|--------|--------|------|--------|
| architecture.md | atualizado | 78 | a3f7... | spec, linters, pattern-registry |
| quality-posture.md | sem mudanca | — | b2e1... | sensors-last-run, linters-last-run |
| security-posture.md | criado (primeira vez) | 45 | c9d4... | ledger |
| decisions-log.md | atualizado | 92 | d1a8... | pattern-registry, ledger |

## Fontes indisponiveis

| Artefato | Impacto |
|----------|---------|
| sensors-last-run.json | quality-posture.md sem secao de sensores |
| behaviours-last-run.json | quality-posture.md sem secao de behaviours |

## Proximos passos

- Commitar `.claude/runtime/knowledge/` no repositorio
- Rodar `/kb-status` para verificar estado consolidado
- Documentos versionados no Git; `*-last-run.json` sao efemeros
```

## Regras

1. **Unico command que escreve na KB.** Nenhum outro command, hook ou agent escreve nos documentos da knowledge base. `/kb-update` e o unico escritor.
2. **Sintetizar, nao duplicar.** Cada secao referencia e sintetiza artefatos-fonte. Nunca copiar dados completos — se o sensor `unit-tests` esta `pass`, o documento diz "unit-tests: pass (ref: sensors-last-run.json)", nao cola o output inteiro.
3. **Anti-churn obrigatorio.** So persistir quando conteudo semantico mudou (hash diff). Excecao: `--force`.
4. **Header obrigatorio.** Todo documento gerado inclui header padronizado com `Derived from`, `Authority`, `Last semantic update`.
5. **Nao tratar KB como gate.** Este command gera documentos informativos. Nenhum veredicto de nenhum command depende da knowledge base.
6. **Nao inferir conteudo.** Se a fonte nao existe, declarar ausencia — nao inventar dados. Secao de sensores sem `sensors-last-run.json` diz "sensores nao executados", nao inventa resultados.
7. **Tamanho alvo e real.** Documentos que ultrapassam ~200 linhas devem ser refatorados antes de persistir. E atlas, nao mapa.
8. **Read-only sobre fontes.** `/kb-update` le artefatos-fonte mas nunca os modifica. A KB e derivada, nao autoritativa.
