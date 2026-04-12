# Knowledge Base System-of-Record Protocol

## Proposito

Definir a knowledge base como **view consolidada e navegavel** do conhecimento acumulado do projeto. A knowledge base nao e fonte de verdade — e uma sintese derivada de artefatos autoritativos (ledger, contratos, sensores, behaviours, linters, pattern-registry, auditorias). Fecha a lacuna identificada pela analise de Harness Engineering: **"evidencia copiosa existe em 7+ camadas, mas nenhum artefato consolida isso em conhecimento navegavel do projeto"**.

O framework gera resultados estruturados em sensores (`sensors-last-run.json`), behaviours (`behaviours-last-run.json`), linters (`architecture-linters-last-run.json`), contratos (`contracts/phase-*.json`), sprints (`contracts/sprints/`), e registra historico no ledger. Porem, nenhum artefato responde "qual e a arquitetura deste projeto, qual a postura de qualidade, quais decisoes foram tomadas e por que?" num formato conciso e sintetizado. A knowledge base preenche essa lacuna como **mapa**, nao como atlas.

A knowledge base e **opcional** e segue o mesmo padrao opt-in de sensores, behaviours, linters e execution contracts: projetos que nao declaram knowledge base operam normalmente. Commands consumidores reportam a ausencia como lacuna informativa, nao como erro.

## Principios

1. **Sintese, nao duplicacao.** Cada documento referencia e sintetiza artefatos-fonte. Nunca replica dados que existem em sensores, contratos, linters ou ledger. Se a fonte muda, o documento fica stale — nao e atualizado automaticamente.
2. **Mapa, nao atlas.** Cada documento e conciso (~50-150 linhas) e responde perguntas especificas. Documentos que crescem alem de ~200 linhas estao virando atlas e devem ser refatorados.
3. **Derivado, nao autoritativo.** Em caso de divergencia entre a knowledge base e as fontes (ledger, contratos, sensores), as fontes prevalecem. A knowledge base deve ser regenerada para refletir as fontes, nao o contrario.
4. **Opt-in, mesmo padrao do framework.** Projetos sem knowledge base operam normalmente. A declaracao e opcional.
5. **Atualizacao explicita via command.** Nunca gerada automaticamente por hook. O usuario decide quando consolidar via `/kb-update`.
6. **Idempotente e anti-churn.** `/kb-update` so persiste um documento quando o conteudo semantico mudou. Timestamps e metadata de atualizacao vivem em `knowledge-index.json`, nao nos `.md`. Isso evita diffs inuteis no Git.
7. **Rastreabilidade obrigatoria.** Cada documento gerado inclui header padronizado com fontes consultadas e declaracao de autoridade subordinada.

## Tipos de documento

A knowledge base consiste em 4 documentos com propositos distintos:

| Documento | Pergunta que responde | Fontes principais |
|---|---|---|
| `architecture.md` | "Qual e a arquitetura deste projeto?" | Spec, planos, contratos, linters, pattern-registry |
| `quality-posture.md` | "Qual a postura de qualidade agora?" | Sensores, linters, cobertura de testes, divida tecnica |
| `security-posture.md` | "Qual a postura de seguranca agora?" | Auditorias, findings abertos, dependencias, security-scan |
| `decisions-log.md` | "Quais decisoes foram tomadas e por que?" | Pattern-registry, /justify entries, ledger |

### Header padronizado (obrigatorio em todo documento)

Cada documento gerado por `/kb-update` deve incluir no topo:

```markdown
> **Derived from:** [lista curta de artefatos-fonte consultados]
> **Authority:** Em caso de divergencia, prevalecem as fontes listadas acima.
> **Last semantic update:** [data da ultima mudanca real de conteudo]
```

O header garante que qualquer leitor (humano ou agente) sabe que o documento e subordinado e rastreavel.

## Schema por tipo de documento

### `architecture.md`

Secoes obrigatorias:
- **Stack** — linguagens, frameworks, runtime, banco de dados
- **Camadas** — estrutura de camadas/modulos e responsabilidades
- **Invariantes declarados** — regras estruturais (de linters ou convencoes)
- **Modulos principais** — lista com proposito de cada modulo/area
- **Decisoes estruturais** — referencia a decisoes do pattern-registry com impacto arquitetural

Secoes opcionais:
- **Dependencias externas** — integracao com servicos/APIs
- **Diagramas** — referencia a diagramas (se existirem)

Tamanho alvo: 50-100 linhas.

### `quality-posture.md`

Secoes obrigatorias:
- **Resumo** — 1-2 frases sobre postura geral
- **Sensores** — tabela com ultimo status de cada sensor declarado (id, tipo, status, data do run)
- **Architecture linters** — tabela com ultimo status de cada linter (id, categoria, status, data do run)
- **Cobertura de testes** — se sensor de testes existe, reportar resultado; se nao, reportar ausencia
- **Divida tecnica** — open items do ledger que representam debito

Secoes opcionais:
- **Behaviours** — tabela com ultimo status de cada behaviour
- **Tendencia** — se houver historico suficiente, indicar direcao (melhorando/piorando/estavel)

Tamanho alvo: 50-100 linhas.

### `security-posture.md`

Secoes obrigatorias:
- **Resumo** — 1-2 frases sobre postura geral
- **Ultimo audit** — data e veredicto do ultimo `/audit` ou `/web-audit` (se houver registro no ledger)
- **Findings abertos** — lista de findings de seguranca nao resolvidos (do ledger)
- **Dependencias** — resultado do sensor `security-scan` (se existir)
- **Postura de autenticacao** — resumo de como auth esta implementada (se aplicavel)

Secoes opcionais:
- **Superficie de exposicao** — endpoints publicos, portas abertas
- **Decisoes de seguranca** — referencia a decisoes do pattern-registry com impacto de seguranca

Tamanho alvo: 50-80 linhas.

### `decisions-log.md`

Cada entrada deve seguir formato conciso:

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
- Entradas derivadas de /justify referenciam o bloco gerado
- Maximo sugerido: 30 entradas. Alem disso, consolidar ou arquivar entradas antigas

Tamanho alvo: 50-150 linhas.

## Knowledge Index (`knowledge-index.json`)

O indice e o artefato estruturado que consumers usam para verificar rapidamente o estado da knowledge base sem ler os `.md`:

```json
{
  "schema_version": "1",
  "documents": {
    "architecture": {
      "path": ".claude/runtime/knowledge/architecture.md",
      "exists": false,
      "generated_at": null,
      "content_hash": null,
      "sources_consulted": [],
      "stale": true,
      "stale_reason": "document not yet generated"
    },
    "quality_posture": {
      "path": ".claude/runtime/knowledge/quality-posture.md",
      "exists": false,
      "generated_at": null,
      "content_hash": null,
      "sources_consulted": [],
      "stale": true,
      "stale_reason": "document not yet generated"
    },
    "security_posture": {
      "path": ".claude/runtime/knowledge/security-posture.md",
      "exists": false,
      "generated_at": null,
      "content_hash": null,
      "sources_consulted": [],
      "stale": true,
      "stale_reason": "document not yet generated"
    },
    "decisions_log": {
      "path": ".claude/runtime/knowledge/decisions-log.md",
      "exists": false,
      "generated_at": null,
      "content_hash": null,
      "sources_consulted": [],
      "stale": true,
      "stale_reason": "document not yet generated"
    }
  },
  "last_full_update": null
}
```

### Campos por documento

- `path` — caminho relativo a raiz do projeto
- `exists` — booleano, se o arquivo existe fisicamente
- `generated_at` — ISO-8601 UTC da ultima geracao (nao da ultima tentativa — so quando conteudo mudou)
- `content_hash` — hash do conteudo (SHA-256 truncado, ex: primeiros 16 chars). Usado por `/kb-update` para detectar mudanca semantica sem diff textual completo
- `sources_consulted` — array de strings com artefatos lidos na ultima geracao (ex: `"sensors-last-run.json"`, `"execution-ledger.md"`, `"pattern-registry.md"`)
- `stale` — booleano, se o documento esta potencialmente desatualizado
- `stale_reason` — motivo da staleness (string humana, ex: `"sensors-last-run.json modified after generated_at"`)

### Staleness do index

O proprio `knowledge-index.json` pode ficar stale. Consumers que leem o index devem considerar que `stale: false` e uma afirmacao do ultimo `/kb-update`, nao uma verdade absoluta — se artefatos-fonte mudaram desde o ultimo update, os documentos podem estar stale mesmo que o index diga `stale: false`.

## Politica de staleness

Um documento da knowledge base e considerado stale se **qualquer** um dos criterios abaixo for verdadeiro:

1. **Artefato-fonte principal foi modificado apos `generated_at`.** Exemplos:
   - `architecture.md` stale se `architecture-linters.json`, `architecture-linters-last-run.json`, ou contratos foram modificados
   - `quality-posture.md` stale se `sensors-last-run.json`, `architecture-linters-last-run.json`, ou `behaviours-last-run.json` foram modificados
   - `security-posture.md` stale se ledger registrou nova auditoria ou findings apos `generated_at`
   - `decisions-log.md` stale se `pattern-registry.md` foi modificado
2. **`knowledge-index.json` nao existe ou esta corrompido.** Consumers tratam como "knowledge base em estado desconhecido".
3. **Documento `.md` nao existe mas `exists: true` no index.** Inconsistencia — tratar como stale critico.

### Contrato dos consumers em caso de stale

1. Consumers reportam staleness como **lacuna informativa**, nunca como bloqueio.
2. Consumers nunca executam `/kb-update` automaticamente. Atualizacao e responsabilidade humana.
3. Consumers nunca tratam documento stale como postura real do projeto.

## Integracao com commands consumidores

| Command | Como consome | Acao |
|---|---|---|
| `/kb-update` | Gera/atualiza documentos da knowledge base a partir de evidencia | Unico command que escreve nos documentos |
| `/kb-status` | Le `knowledge-index.json` e apresenta resumo com staleness | Read-only absoluto |
| `/status-check` | Le `knowledge-index.json` e adiciona secao informativa | Read-only, lacuna informativa se ausente |
| `/ship-check` | Le `knowledge-index.json` e adiciona bloco informativo (nao-gate) | Read-only, nao bloqueia veredicto |

**Knowledge base NUNCA e gate.** Diferente de sensores/behaviours/linters que sao gates mecanicos, a knowledge base e ferramenta de navegacao e contexto. Nenhum command bloqueia veredicto por knowledge base stale ou ausente.

## Relacao com outros artefatos

| Artefato | Escopo | Fonte de verdade para | Relacao com KB |
|---|---|---|---|
| Spec | Produto inteiro | O QUE o produto deve fazer | KB referencia, nao replica |
| Plano (`plan.md`) | Fase especifica | COMO implementar a fase | KB pode citar decisoes do plano |
| Contrato de fase | Fase especifica | O QUE a fase promete | KB sintetiza status dos contratos |
| Ledger | Historico inteiro | O QUE aconteceu | KB extrai findings e eventos |
| Sensores | Projeto inteiro | Correcao funcional mecanica | KB sintetiza postura de qualidade |
| Behaviours | Acao runtime | Comportamento observavel | KB sintetiza postura de qualidade |
| Architecture linters | Cross-file | Invariantes estruturais | KB sintetiza em arquitetura |
| Pattern registry | Projeto inteiro | Decisoes aprovadas | KB referencia em decisions-log |

A knowledge base e uma **camada de sintese** que le todas as outras e produz documentos navegaveis. Nao compete com nenhuma fonte — subordina-se a todas.

## Vedacoes

- **Nao tratar knowledge base como fonte de verdade.** Em caso de divergencia, as fontes prevalecem. Regenerar via `/kb-update`.
- **Nao duplicar dados de artefatos-fonte.** Sintetizar e referenciar, nao copiar. Se o sensor id `unit-tests` esta `pass`, o `quality-posture.md` diz "unit-tests: pass (ref: sensors-last-run.json)" — nao cola o output completo.
- **Nao permitir documentos > 200 linhas.** Documento que cresce alem e atlas, nao mapa. Refatorar ou dividir.
- **Nao criar hook para atualizacao automatica.** Atualizacao e sempre via `/kb-update` explicito.
- **Nao usar knowledge base como gate.** Nenhum command bloqueia veredicto por KB ausente ou stale.
- **Nao permitir documento sem header de rastreabilidade.** Header padronizado (Derived from, Authority, Last semantic update) e obrigatorio em todo documento gerado.
- **Nao permitir entrada em decisions-log sem fonte concreta.** Cada decisao aponta para artefato, registro ou data. Sem trilha = entrada invalida.
- **Nao executar `/kb-update` automaticamente em consumers.** Consumers sao read-only absolutos sobre a knowledge base.
- **Nao inferir knowledge base a partir da stack.** O projeto decide quais documentos gerar; o framework nao infere.

## Bootstrap

Em projeto novo que quer adotar knowledge base:

1. O framework inclui templates em `.claude/runtime/knowledge.template/` com esqueleto de cada documento
2. O framework inclui `knowledge-index.json` bootstrap null-safe em `.claude/runtime/knowledge/`
3. Ao executar `/kb-update` pela primeira vez, o command le as fontes disponiveis e gera os documentos reais em `.claude/runtime/knowledge/`
4. Documentos reais so existem apos o primeiro `/kb-update` — antes disso, apenas o index null-safe e os templates de referencia existem
5. Commitar `knowledge/` no repositorio (documentos sao versionados no Git, ao contrario de `*-last-run.json` que sao efemeros)

Projetos que nao executam `/kb-update` operam normalmente — consumers reportam ausencia como lacuna informativa, nao bloqueante.
