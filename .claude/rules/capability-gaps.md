# Capability Gap Tracking Protocol

## Proposito

Definir capability gaps como artefato persistente e estruturado do framework. Um capability gap e uma **lacuna de verificacao identificada** — algo que o harness de verificacao do projeto nao cobre (camada ausente, declaracao faltando, execucao nunca feita, referencia quebrada, ou categoria nativa nao coberta pelo framework). O capability gap tracking transforma observacoes transientes de commands (`NO_SENSORS`, `NO_BEHAVIOURS`, `NEVER_RUN`, `STALE`, `BINDING_GAP`) em registro persistente, versionavel e rastreavel.

Esta rule resolve a lacuna final identificada pela analise de Harness Engineering: **"o framework reporta lacunas de verificacao de forma transiente — cada command identifica o que falta, mas a observacao desaparece apos a sessao"**. A knowledge base (#8) sintetiza o que o projeto **e**. O capability gap tracking sintetiza o que a verificacao do projeto **nao cobre**.

Capability gaps sao **opcionais** e seguem o mesmo padrao opt-in de sensores, behaviours, linters, contracts e knowledge base: projetos que nao declaram gaps operam normalmente. Commands consumidores reportam a ausencia como lacuna informativa, nao como erro.

## Principios

1. **Persistencia sobre transitoriedade.** Gaps detectados por commands sao efemeros (vivem no output da sessao). O registro em `capability-gaps.json` persiste entre sessoes, permitindo rastreamento ao longo do tempo.
2. **Determinismo sobre inferencia.** O scanner (`/gaps-scan`) detecta gaps por verificacao objetiva (arquivo existe? campo presente? run executado?). Nunca infere necessidades por analise subjetiva de dominio ou stack.
3. **Scanner nao sobrescreve humano.** O `/gaps-scan` cria gaps novos como `open` e atualiza metadata de deteccao (`last_seen_at`, `evidence`, `severity`). Nunca sobrescreve estados de resolucao humana (`acknowledged`, `accepted`, `filled`, `deferred`) nem justificativas. Precedencia: decisao humana > scanner mecanico.
4. **Nao e gate.** Capability gaps sao ferramenta de visibilidade e navegacao. Nenhum veredicto de nenhum command depende de gaps. O `/ship-check` apresenta gaps como bloco informativo puro — gaps nao alteram `PRONTO / PRONTO COM RESSALVAS / NAO PRONTO`.
5. **Opt-in, mesmo padrao do framework.** Projetos sem `capability-gaps.json` operam normalmente. Consumers reportam ausencia como lacuna informativa, nao bloqueante.
6. **Rastreabilidade temporal obrigatoria.** Cada gap registra `first_detected_at` (quando foi visto pela primeira vez) e `last_seen_at` (quando foi visto pela ultima vez). Historico de deteccao e preservado entre scans.

## Tipos de gap

| Tipo | Semantica | Exemplo |
|---|---|---|
| `declaration_absent` | Camada de verificacao nao declarada no projeto | `sensors.json` ausente, `behaviours.json` ausente, `architecture-linters.json` ausente |
| `never_run` | Camada declarada mas nunca executada | `sensors.json` existe mas `sensors-last-run.json` ausente |
| `stale` | Camada executada mas resultado desatualizado | `sensors-last-run.json` existe mas `finished_at` anterior a modificacao de `sensors.json` |
| `binding_gap` | Referencia quebrada entre artefatos | AC com `verifiable_by: "behaviour"` mas `behaviour_id` ausente ou apontando para behaviour inexistente |
| `native_uncovered` | Categoria de verificacao que o framework nao cobre nativamente | Pen test real, testes E2E com browser, WCAG compliance, performance metrics |

### Regras para `native_uncovered`

O tipo `native_uncovered` e o unico que requer heuristica de deteccao. Para evitar inferencia subjetiva, o `/gaps-scan` so emite `native_uncovered` quando **todas** as condicoes de uma heuristica documentada sao satisfeitas.

Heuristicas permitidas (lista fechada — novas heuristicas requerem adicao explicita a esta rule):

| ID | Condicao objetiva | Gap emitido | Categoria |
|---|---|---|---|
| H1 | Projeto tem `package.json` com dependencias + nenhum sensor com `type: "security-scan"` declarado | Ausencia de scan de vulnerabilidades em dependencias | `dep_scan` |
| H2 | Projeto tem arquivos HTML/JSX/TSX + nenhum sensor ou behaviour que referencia acessibilidade | Ausencia de verificacao de acessibilidade | `accessibility` |
| H3 | Projeto tem endpoints HTTP (detectavel por presenca de router/routes/express/fastify/flask/django/gin em codigo) + nenhum behaviour com `type: "http"` e `on_fail: "block"` que execute request real | Ausencia de pen test ou teste de integracao HTTP | `pen_test` |
| H4 | Projeto tem UI (detectavel por presenca de componentes React/Vue/Svelte/HTML) + nenhum sensor que referencia performance/lighthouse/vitals | Ausencia de metricas de performance frontend | `performance` |
| H5 | Projeto tem testes unitarios (sensor `type: "test"`) mas nenhum sensor ou behaviour que execute browser real (playwright/cypress/selenium) | Ausencia de testes E2E com browser | `e2e` |
| H6 | Projeto tem CI config (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`) ausente | Ausencia de quality gates em CI/CD | `ci_cd` |

**Regra:** se nenhuma heuristica casa, nenhum `native_uncovered` e emitido. O scanner nao improvisa.

## Schema do arquivo `capability-gaps.json`

O arquivo vive em `.claude/runtime/capability-gaps.json`. E versionado no Git como parte do contrato do projeto.

```json
{
  "schema_version": "1",
  "last_scan": "ISO-8601 | null",
  "gaps": [
    {
      "id": "string (unico, kebab-case, ex: 'gap-01-no-sensors')",
      "type": "declaration_absent | never_run | stale | binding_gap | native_uncovered",
      "category": "sensors | behaviours | linters | contracts | knowledge_base | pen_test | e2e | accessibility | ci_cd | dep_scan | performance | diagrams",
      "description": "string (human-readable, curta)",
      "severity": "high | medium | low",
      "detected_by": "string (command que detectou, ex: '/gaps-scan')",
      "first_detected_at": "ISO-8601",
      "last_seen_at": "ISO-8601",
      "evidence": "string curta e auditavel (ex: 'sensors.json ausente no path .claude/runtime/')",
      "source_artifacts": ["array de paths ou referencias consultadas"],
      "status": "open | acknowledged | accepted | filled | deferred",
      "resolution": "string opcional (o que foi feito para resolver)",
      "resolution_at": "ISO-8601 | null",
      "resolution_justification": "string opcional (obrigatoria para accepted e deferred)"
    }
  ]
}
```

### Campos obrigatorios por gap

- `id`, `type`, `category`, `description`, `severity`
- `detected_by`, `first_detected_at`, `last_seen_at`
- `evidence`, `source_artifacts`
- `status`

### Campos opcionais

- `resolution` — preenchido quando `status` transiciona para `filled`
- `resolution_at` — preenchido quando `status` transiciona para `accepted`, `filled` ou `deferred`
- `resolution_justification` — obrigatorio para `accepted` e `deferred`, opcional para `filled`

## Lifecycle e ownership

### Estados e transicoes

```
open → acknowledged → accepted
                   → filled
                   → deferred
```

| Estado | Quem transiciona | Significado |
|---|---|---|
| `open` | `/gaps-scan` (automatico) | Gap detectado mecanicamente, aguardando atencao humana |
| `acknowledged` | Humano (manual) | Humano viu o gap e reconheceu sua existencia |
| `accepted` | Humano (manual, com `resolution_justification` obrigatoria) | Risco aceito conscientemente — gap nao sera preenchido |
| `filled` | Humano (manual) | Gap foi preenchido (sensor adicionado, skill instalada, verificacao criada) |
| `deferred` | Humano (manual, com `resolution_justification` obrigatoria) | Gap adiado conscientemente com justificativa |

### Regras de merge scanner × humano

O `/gaps-scan` roda multiplas vezes ao longo do projeto. A cada execucao, precisa conciliar gaps detectados com gaps ja existentes no registro:

1. **Gap novo detectado** (id nao existe em `capability-gaps.json`): scanner cria entrada com `status: "open"`, `first_detected_at` e `last_seen_at` iguais ao timestamp atual.
2. **Gap existente com `status: "open"`**: scanner atualiza `last_seen_at`, `evidence`, `severity` e `source_artifacts`. Pode mudar `severity` se a condicao mudou.
3. **Gap existente com status humano** (`acknowledged`, `accepted`, `filled`, `deferred`): scanner atualiza **apenas** `last_seen_at` e `evidence`. **Nunca** sobrescreve `status`, `resolution`, `resolution_justification` ou `severity`.
4. **Gap existente mas nao detectado no scan atual**: scanner **nao remove** o gap. Adiciona campo `last_seen_at` inalterado (preserva ultima deteccao). Gap pode ter sido resolvido ou pode estar fora do escopo do scan.
5. **Gap com `status: "filled"` e scanner re-detecta a condicao**: scanner **nao reabre** o gap. Cria **novo gap** com id incrementado (ex: `gap-01-no-sensors-v2`) e `status: "open"`. Justificativa: o humano declarou o gap preenchido — se a condicao reapareceu, e uma nova ocorrencia, nao regressao automatica.

### Vedacao de ownership

- `/gaps-scan` e o unico command que cria gaps `open`
- Transicoes para `acknowledged`, `accepted`, `filled`, `deferred` sao sempre humanas (edicao manual do JSON ou futuro command dedicado)
- Nenhum command transiciona status automaticamente alem de `open`

## Severidade

| Severidade | Criterio |
|---|---|
| `high` | Camada de verificacao bloqueante ausente (sensores com `on_fail: block`, behaviours com `on_fail: block`) ou categoria critica nao coberta (pen test em projeto com endpoints publicos) |
| `medium` | Camada de verificacao informativa ausente (linters, knowledge base) ou categoria complementar nao coberta (performance metrics, diagrams) |
| `low` | Camada declarada mas stale ou com binding gaps parciais |

O scanner atribui severidade com base no tipo de gap e na categoria. O humano pode sobrescrever via edicao manual.

## Integracao com commands consumidores

| Command | Como consome | Acao |
|---|---|---|
| `/gaps-scan` | Detecta gaps, persiste em `capability-gaps.json` | Unico command que cria gaps |
| `/gaps-status` | Le `capability-gaps.json` e apresenta resumo | Read-only absoluto |
| `/status-check` | Le `capability-gaps.json` e adiciona secao informativa | Read-only, lacuna informativa se ausente |
| `/ship-check` | Le `capability-gaps.json` e adiciona bloco informativo (nao-gate) | Read-only, **nao altera veredicto** |

**Capability gaps NUNCA sao gate.** Diferente de sensores/behaviours/linters que sao gates mecanicos, capability gaps sao ferramenta de visibilidade. Nenhum command bloqueia ou rebaixa veredicto por gaps abertos.

## Relacao com `/skills-gap`

`/skills-gap` e `/gaps-scan` coexistem com funcoes distintas:

| Aspecto | `/skills-gap` | `/gaps-scan` |
|---|---|---|
| Tipo de analise | Qualitativa (relatorio humano) | Mecanica (verificacao objetiva) |
| Output | Texto formatado para o usuario | JSON estruturado em `capability-gaps.json` |
| Persistencia | Transiente (output da sessao) | Persistente (versionado no Git) |
| Inferencia | Pode analisar dominio, stack, contexto | Apenas heuristicas documentadas na lista fechada |
| Recomendacoes | Sugere categorias de skills | Registra gaps sem recomendar solucoes |

O `/skills-gap` continua sendo o command de discovery humano. O `/gaps-scan` e o command de registro mecanico. Nenhum substitui o outro.

## Relacao com outros artefatos

| Artefato | O que responde | Relacao com gaps |
|---|---|---|
| Sensores | "O codigo compila/testa?" | Ausencia de sensor e gap `declaration_absent` |
| Behaviours | "O sistema faz o que prometeu?" | Ausencia de behaviour e gap `declaration_absent` |
| Linters | "A estrutura respeita invariantes?" | Ausencia de linter e gap `declaration_absent` |
| Contratos | "A fase entregou o prometido?" | Ausencia de contrato e gap `declaration_absent` |
| Knowledge base | "Qual e o estado consolidado?" | Ausencia de KB e gap `declaration_absent` |
| Capability gaps | "O que a verificacao NAO cobre?" | Complemento de todas as camadas |

## Vedacoes

- **Nao usar gaps como gate.** Nenhum command bloqueia ou rebaixa veredicto por gaps. Gaps sao visibilidade, nao enforcement.
- **Nao inferir gaps subjetivamente.** Scanner usa apenas heuristicas da lista fechada para `native_uncovered`. Sem heuristica documentada = sem gap emitido.
- **Nao sobrescrever decisao humana.** Scanner nunca muda `status` de gap que humano ja transicionou para `acknowledged`, `accepted`, `filled` ou `deferred`.
- **Nao remover gaps automaticamente.** Gap nao detectado num scan nao e removido — pode ter sido resolvido fora do escopo do scanner.
- **Nao reabrir gap `filled` automaticamente.** Se a condicao reaparece, scanner cria novo gap com id versionado, nao sobrescreve o anterior.
- **Nao instalar skills automaticamente.** Gaps identificam lacunas; resolucao e responsabilidade humana.
- **Nao substituir `/skills-gap`.** Os dois commands coexistem com funcoes distintas (mecanico vs qualitativo).
- **Nao permitir `accepted` ou `deferred` sem justificativa.** Campo `resolution_justification` e obrigatorio para esses estados.

## Bootstrap

Em projeto novo que quer adotar capability gap tracking:

1. Copiar `.claude/runtime/capability-gaps.template.json` para `.claude/runtime/capability-gaps.json`
2. Executar `/gaps-scan` pela primeira vez para popular gaps detectados
3. Revisar gaps detectados e transicionar estados manualmente conforme necessario
4. Commitar `capability-gaps.json` no repositorio

Projetos que nao declaram gaps operam normalmente — consumers reportam ausencia como lacuna informativa, nao bloqueante.
