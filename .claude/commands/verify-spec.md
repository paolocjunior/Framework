---
description: Verificação pós-implementação — confirma se o código entregue corresponde ao que a especificação prometeu
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(python:*), Bash(pip:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de iniciar a verificação pós-implementação:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Verificar fase atual, Open Items e bloqueios — a verificação precisa saber quais requisitos estão no escopo da entrega atual vs DEFERRED
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir
5. **Requisitos marcados como `DEFERRED` no ledger não devem ser reportados como falhas de conformidade** — devem aparecer separadamente como "fora do escopo da entrega atual, rastreados como DEFERRED"

---

Verificar se o código implementado entrega o que a especificação original prometeu.

Este comando NÃO avalia qualidade de código (use `/review` para isso) nem prontidão para deploy (use `/ship-check`). Ele avalia exclusivamente: **o que foi pedido está funcionando?**

---

## Passo 1 — Localizar a especificação

Buscar o documento de referência do projeto. Pode ser:
- Arquivo de spec/briefing (.md) na raiz ou em .planning/
- REQUIREMENTS.md, PROJECT.md, spec.md, briefing.md
- Documento indicado pelo usuário

Se não encontrar especificação, perguntar ao usuário qual documento usar como referência.

## Passo 2 — Extrair entregas testáveis e gerar cenários de teste

### 2.1 — Extrair entregas

Ler a especificação e extrair uma lista de entregas concretas e verificáveis. Cada entrega deve ser uma ação que o usuário deveria conseguir fazer.

Formato:
```
| # | Entrega esperada | Fonte na spec |
|---|-----------------|---------------|
| 1 | Usuário consegue criar conta com email e senha | Requisito funcional 1 |
| 2 | Login retorna token JWT válido | Requisito funcional 2 |
| 3 | Produto sem estoque mostra "indisponível" | Regra de negócio 5 |
```

### 2.2 — Gerar cenários de teste por entrega

Para cada entrega extraída, gerar de 2 a 5 cenários de teste concretos. Os cenários devem cobrir:

- **Caminho feliz**: o fluxo principal funciona como esperado
- **Entrada inválida**: o que acontece com dados incorretos, vazios ou malformados
- **Limites**: valores no limite do aceitável (máximo, mínimo, zero)
- **Casos de borda**: situações atípicas mas plausíveis (duplicata, concorrência, estado inesperado)

A quantidade de cenários deve ser proporcional à complexidade da entrega:
- Entrega simples (exibir texto, redirecionar): 2 cenários
- Entrega com validação ou lógica condicional: 3-4 cenários
- Entrega com regra de negócio complexa ou fluxo financeiro: 4-5 cenários

Formato:
```
### Entrega 1: Usuário consegue criar conta com email e senha

| ID | Cenário | Tipo | Resultado esperado |
|----|---------|------|--------------------|
| 1.1 | Criar conta com email válido e senha forte | Caminho feliz | Conta criada, redirecionado para dashboard |
| 1.2 | Criar conta com email já existente | Caso de borda | Erro informativo, sem duplicação no banco |
| 1.3 | Criar conta com senha menor que o mínimo | Entrada inválida | Validação rejeita, mensagem clara ao usuário |
| 1.4 | Criar conta com email malformado | Entrada inválida | Validação rejeita antes de chegar ao banco |

### Entrega 2: Login retorna token JWT válido

| ID | Cenário | Tipo | Resultado esperado |
|----|---------|------|--------------------|
| 2.1 | Login com credenciais corretas | Caminho feliz | Token JWT retornado com expiração definida |
| 2.2 | Login com senha incorreta | Entrada inválida | Erro genérico, sem revelar se email existe |
| 2.3 | Login com conta desativada | Caso de borda | Acesso negado com mensagem apropriada |
```

### 2.3 — Aprovação do usuário

Apresentar as entregas com seus cenários ao usuário e perguntar: "Essas são as entregas e cenários que vou verificar. Quer adicionar, remover ou ajustar algum?"

## Passo 3 — Verificar cada cenário contra o código

Para cada cenário de cada entrega, verificar no código se existe implementação que o suporte.

### 3.1 — Verificação por cenário

Para cada cenário, reportar:

| ID | Cenário | Status | Evidência | Lacuna |
|----|---------|--------|-----------|--------|
| 1.1 | Criar conta com email válido e senha forte | COBERTO | `src/auth/register.ts:45` — handler cria usuário e retorna 201 | — |
| 1.2 | Criar conta com email já existente | COBERTO | `src/auth/register.ts:52` — catch de unique constraint retorna 409 | — |
| 1.3 | Criar conta com senha menor que o mínimo | NÃO COBERTO | — | Sem validação de tamanho mínimo de senha no handler ou middleware |
| 1.4 | Criar conta com email malformado | PARCIAL | `src/auth/register.ts:40` — regex básica de email | Regex não cobre todos os formatos inválidos |

Definição de status por cenário:
- **COBERTO** — código trata explicitamente este cenário, evidência concreta encontrada
- **PARCIAL** — cenário parcialmente tratado, mas com lacuna identificada
- **NÃO COBERTO** — não encontrou código que trate este cenário
- **NÃO VERIFICÁVEL** — cenário depende de execução/ambiente que não pode ser testado por análise estática

### 3.2 — Resumo por entrega

Após verificar todos os cenários de uma entrega, consolidar o status da entrega:

| # | Entrega | Status | Cenários cobertos | Cenários total |
|---|---------|--------|-------------------|----------------|
| 1 | Criar conta com email e senha | PARCIAL | 2/4 | 4 |
| 2 | Login retorna token JWT | IMPLEMENTADO | 3/3 | 3 |

Regras de consolidação:
- **IMPLEMENTADO** — todos os cenários COBERTOS
- **PARCIAL** — pelo menos 1 cenário COBERTO e pelo menos 1 NÃO COBERTO ou PARCIAL
- **NÃO IMPLEMENTADO** — nenhum cenário COBERTO (caminho feliz ausente)
- **NÃO VERIFICÁVEL** — todos os cenários são NÃO VERIFICÁVEIS

## Passo 4 — Verificações dinâmicas via sensores mecânicos

Verificações dinâmicas devem vir preferencialmente da camada de sensores (`.claude/rules/sensors.md`), não de execução ad-hoc de comandos pelo agente. A camada de sensores produz `sensors-last-run.json` com exit codes verificáveis, eliminando o risco de o agente narrar "teste passou" quando na verdade falhou.

### 4.1 — Consumir `sensors-last-run.json`

Ler `.claude/runtime/sensors-last-run.json`:

- **Presente e fresco** (dentro das regras de staleness de `sensors.md`) → usar como fonte de evidência mecânica
- **Stale** (código-fonte modificado após `finished_at`, ou `sensors.json` alterado) → invocar `/sensors-run` para atualizar antes de prosseguir
- **Ausente** e `sensors.json` existe → invocar `/sensors-run` para gerar baseline
- **Ausente** e `sensors.json` também ausente → registrar lacuna: "Projeto sem sensores declarados, verificação dinâmica impossível. Cenários NÃO VERIFICÁVEIS permanecem como estão. Recomendação: declarar sensores em `.claude/runtime/sensors.json`"

### 4.2 — Mapear sensores para cenários

Para cada cenário marcado `NÃO VERIFICÁVEL` no Passo 3:

- Se há sensor do tipo `test` que cobre o fluxo do cenário e o sensor passou (`status: pass`) → promover cenário para `COBERTO` com evidência `sensors-last-run.json:<sensor_id>`
- Se o sensor de testes **falhou** (`status: fail`) → cenário permanece `NÃO COBERTO` ou rebaixa para `FALHA ATIVA`, com o output_tail do sensor como evidência
- Se há sensor de `type-check` que passou → evidência de que assinaturas e contratos estão consistentes (não prova comportamento, mas reduz risco de regressão)
- Se há sensor de `build` que passou → evidência de que o código compila; cenários que dependem exclusivamente de compilação podem ser promovidos

### 4.3 — Regra crítica: sensores são autoritativos sobre comportamento mecânico

Se `/verify-spec` concluir "entrega X está IMPLEMENTADA" mas o sensor de teste que cobre X está em `status: fail`, o veredicto final **DEVE** ser rebaixado. O sensor é autoridade sobre comportamento mecânico observável — se o teste falha, o comportamento não está conforme a spec, independente de o código "parecer coberto" por análise estática.

Esse é o ponto central da camada de sensores: o agente não pode contradizer o ambiente.

## Passo 4.5 — Cruzar com contrato de execução ativo

Após consumir sensores, cruzar as entregas da spec com os deliverables declarados no contrato ativo da fase (se existir). O contrato é a declaração formal upstream do que a fase promete entregar — se há divergência entre spec e contrato, é sinal de scope drift que precisa ser explícito no output.

### 4.5.1 — Localizar o contrato ativo

Ler `.claude/runtime/contracts/active.json`:

- **Ausente** ou `active_phase_id` é `null` → lacuna: "Projeto não declara contrato ativo. Cobertura de deliverables não pode ser cruzada — verificação opera apenas sobre spec + sensores." Não bloqueia veredicto, apenas documenta.
- **Presente** → ler o contrato apontado e extrair os `deliverables` (com `id`, `description`, `location`, `verifiable_by`, `required`).

### 4.5.2 — Cruzar deliverables com entregas

Para cada `deliverable` do contrato, tentar mapear para uma das **entregas** identificadas no Passo 2.1. O mapeamento pode ser:

- **Direto** — o deliverable descreve o mesmo comportamento de uma entrega da spec
- **Indireto** — o deliverable suporta uma entrega (ex: "navegação stack" suporta "usuário navega entre telas")
- **Sem mapeamento** — o deliverable não tem entrega correspondente na spec (ex: infraestrutura pura, documentação interna)

Tabela de cruzamento:

| Deliverable ID | Descrição | Mapeia para entrega # | Status no contract | Status na spec |
|---|---|---|---|---|
| D1 | LoginScreen | Entrega 1 (criar conta) | PASS | IMPLEMENTADO |
| D2 | Navigation stack | — (infra) | PASS | n/a |
| D3 | Testes | Entrega 1 + 2 | FAIL (sensor) | PARCIAL (rebaixado por sensor) |

### 4.5.3 — Rebaixar entregas com deliverable required faltando

Se uma entrega da spec está mapeada a um `deliverable` do contrato com `required: true` e o deliverable está `MISSING`, `MISSING_FILE`, `MISSING_PATTERN` ou `FAIL`:

- A entrega da spec DEVE ser rebaixada para `PARCIAL` ou `NÃO IMPLEMENTADA`, mesmo que análise estática tenha encontrado código que parece cobrir o cenário
- Evidência do rebaixamento: "deliverable `<D_id>` declarado como required no contrato `<phase_id>` está `<status>`"

Razão: o contrato é o compromisso formal da fase. Se o contrato declara que um deliverable é obrigatório e ele está ausente, a fase não entregou — mesmo que o código pareça cobrir o comportamento por outras vias.

### 4.5.4 — Detectar entregas sem deliverable correspondente

Se uma entrega da spec não tem nenhum deliverable do contrato apontando para ela, isso é sinal de:

- **Scope drift positivo** — o projeto implementou algo além do contrato (listar como "escopo extra não declarado no contrato")
- **Lacuna de contrato** — o contrato não capturou uma entrega essencial da spec (listar como "entrega da spec sem contrato correspondente — scope gap")

Ambos são reportados, mas não bloqueiam veredicto. Indicam que `/contract-create` deveria gerar v2 para alinhar com o escopo real.

## Passo 4.6 — Cruzar com behaviours runtime

Após cruzar com o contrato, consumir `behaviours-last-run.json` como camada adicional de evidência runtime observável. Behaviours são verificações declarativas que disparam ações reais contra o sistema e comparam resultado observado contra expectativa declarada — complementam sensores (que cobrem correção funcional estática) com **evidência de comportamento observável em runtime**.

Este passo é **read-only absoluto**: nunca invoca `/behaviour-run`, nunca edita `behaviours.json` ou `behaviours-last-run.json`, nunca modifica contrato ou `active.json`. Apenas lê, cruza e rebaixa status quando runtime evidence contradiz análise estática.

### 4.6.1 — Localizar declaração de behaviours

Ler `.claude/runtime/behaviours.json`:

- **Ausente** → lacuna informativa: "Projeto sem behaviours declarados. Cenários permanecem com evidência apenas estática (+ sensores se aplicável). Behaviours são opt-in — não bloqueia veredicto." Registrar `behaviours_status: NO_BEHAVIOURS` e prosseguir para o Passo 5.
- **Presente** → validar com `jq empty`. Se inválido, registrar lacuna e prosseguir sem rebaixamentos por behaviour.

### 4.6.2 — Consumir `behaviours-last-run.json`

Ler `.claude/runtime/behaviours-last-run.json`:

- **Ausente** e `behaviours.json` declara pelo menos 1 behaviour com `enabled: true` → `behaviours_status: NEVER_RUN`. Entregas mapeadas a esses behaviours não ganham evidência runtime; cenários cobertos permanecem apenas com evidência estática. Registrar lacuna: "Behaviours declarados mas nunca executados — rodar `/behaviour-run` para obter evidência runtime observável."
- **Presente** → validar com `jq empty`. Se inválido, registrar lacuna e tratar como `NEVER_RUN`.
- **Presente e válido** → extrair `run_id`, `finished_at`, `verdict`, `blocking_failures`, `results[]`.

### 4.6.3 — Aplicar staleness (ver `.claude/rules/behaviour-harness.md`)

Aplicar as 3 regras de staleness **sem nunca executar** `/behaviour-run`:

1. **Stale por declaração alterada** — se `behaviours.json` foi modificado (`mtime`) após `finished_at`, o conjunto de behaviours pode ter divergido do run. Marcar `staleness.reason: declaration_changed`.
2. **Stale por contrato revisado** — se algum phase contract referenciado por `contract_ref` tem `approved_at` (ou `mtime`) posterior a `finished_at`, os ACs que os behaviours deveriam cobrir podem ter mudado. Marcar `staleness.reason: contract_revised`.
3. **Stale por cobertura incompleta** — se há behaviour com `enabled: true` em `behaviours.json` que não aparece em `results[]` do último run, a evidência não cobre a declaração atual. Marcar `staleness.reason: incomplete_coverage`.

Se qualquer regra de staleness é disparada, registrar o estado como `behaviours_status: STALE` e **nunca tratar resultados stale como PASS válido**. Cenários que dependem de behaviour stale têm sua evidência runtime rebaixada a "stale — requer re-execução".

### 4.6.4 — Mapear behaviours para cenários da spec

Para cada behaviour em `results[]`, tentar mapear para um **cenário** do Passo 2.2 ou uma **entrega** do Passo 2.1. Dois caminhos de mapeamento:

- **Via contrato (indireto)** — se o behaviour tem `contract_ref` apontando para um AC do phase contract, e o AC já foi mapeado a uma entrega no Passo 4.5, o behaviour herda o mapeamento: behaviour → AC → entrega/cenário.
- **Via descrição (direto)** — se o behaviour descreve ação ou efeito alinhado a um cenário da spec (ex: "POST /api/login retorna cookie de sessão" mapeia para "Login retorna token JWT válido"), mapear diretamente com confiança menor. Registrar o tipo de mapeamento na evidência.

Tabela de cruzamento behaviour → cenário/entrega:

| Behaviour ID | Descrição curta | Status | on_fail | contract_ref | Mapeia para | Evidência |
|---|---|---|---|---|---|---|
| b-01-login-success | POST /api/login + cookie | pass | block | AC1 (phase-02) | Cenário 2.1 (login happy path) | exit_code=0, stdout_contains=200, file_content=Set-Cookie |
| b-03-health-endpoint | /healthz JSON status=ok | pass | block | AC3 (phase-02) | Entrega 3 (health check) | stdout_json_path=.status=ok |
| b-04-logs-no-secrets | logs sem tokens | pass | warn | — | Cenário 4.2 (logs sanitizados) | not_contains pattern OK |
| b-05-rate-limit-429 | 20 POSTs → 429 | fail | block | AC4 (phase-02) | Cenário 2.4 (rate limit) | stdout_contains=429 falhou: recebeu 200 |

### 4.6.5 — Rebaixamento por evidência runtime adversa

Este é o **princípio central** do cruzamento com behaviours: quando runtime evidence contradiz análise estática, runtime evidence vence.

Aplicar as seguintes regras de rebaixamento **na ordem**:

1. **Behaviour `fail` com `on_fail: block` cobrindo cenário IMPLEMENTADO** → cenário é rebaixado para `NÃO COBERTO` (evidência: "behaviour `<id>` falhou mesmo com código presente — comportamento não observável em runtime"). A entrega correspondente é rebaixada para `PARCIAL` ou `NÃO IMPLEMENTADO` conforme proporção de cenários afetados.
2. **Behaviour `fail` com `on_fail: warn`** → cenário permanece `COBERTO` mas com marca "behaviour warn em fail — requer atenção". Não força rebaixamento mas aparece no relatório.
3. **Behaviour `stale` cobrindo cenário IMPLEMENTADO** → cenário é rebaixado para `PARCIAL` com evidência "runtime evidence stale — análise estática indica cobertura mas último run de behaviour é obsoleto". Nunca marcar como COBERTO baseado em behaviour stale.
4. **Behaviour `unknown` ou `timeout` cobrindo cenário IMPLEMENTADO** → cenário permanece `COBERTO` com marca informativa. Não força rebaixamento (ambiente pode estar indisponível, não é evidência adversa).
5. **Behaviour `pass` cobrindo cenário NÃO VERIFICÁVEL** → cenário é **promovido** para `COBERTO` com evidência runtime (`behaviours-last-run.json:<behaviour_id>`). Este é o caso positivo: behaviour supriu a lacuna que análise estática não conseguiu fechar.

### 4.6.6 — Detectar binding gap

Se o contrato ativo declara algum AC com `verifiable_by: "behaviour"` mas o `behaviour_id` referenciado **não existe** em `behaviours.json`, ou o behaviour existe mas está `enabled: false`, registrar como **binding gap**:

> "AC `<id>` do contrato `<phase_id>` declara `verifiable_by: behaviour` apontando para `<behaviour_id>`, mas o behaviour está ausente ou desabilitado. A evidência runtime prometida pelo contrato não existe — contrato e declaração de behaviours estão dessincronizados."

Binding gaps **não rebaixam entregas individuais** (a spec pode estar coberta por outras vias), mas **são reportados no veredicto final** como sinal forte de que o contrato precisa ser revisado (v2) ou `behaviours.json` atualizado.

### 4.6.7 — Princípio de autoridade

Behaviours e sensores são **camadas paralelas e independentes** de evidência mecânica:

- **Sensores** (Passo 4) cobrem correção funcional: testes passam, lint limpo, type-check válido, build compila
- **Behaviours** (Passo 4.6) cobrem comportamento observável: requisição retorna o código esperado, arquivo contém o conteúdo esperado, JSON path tem o valor esperado

Um cenário pode ser coberto por apenas sensores, apenas behaviours, ambos, ou nenhum. Quando ambos cobrem o mesmo cenário:

- Se ambos passam → confiança máxima (análise estática + runtime observável + funcional mecânico)
- Se sensor passa mas behaviour falha → rebaixamento (runtime contradiz funcional — bug de integração ou contrato)
- Se behaviour passa mas sensor falha → rebaixamento (funcional falha apesar de runtime observável — flag de regressão escondida)
- Se ambos falham → rebaixamento máximo + evidência cruzada

O agente **nunca** pode dizer "mas o código parece correto" quando sensor OU behaviour reporta falha. O ambiente é autoridade dupla.

## Passo 5 — Resumo

Ao final, gerar:

### Aderência à Especificação — Entregas
- Total de entregas: X
- Implementadas: X (Y%)
- Parciais: X
- Não implementadas: X
- Não verificáveis: X

### Cobertura de Cenários
- Total de cenários gerados: X
- Cobertos: X (Y%)
- Parciais: X
- Não cobertos: X
- Não verificáveis: X

### Evidência mecânica aplicada

Consolidar em uma tabela as fontes mecânicas que contribuíram ao veredicto:

| Fonte | Status | Resumo |
|---|---|---|
| Sensores (`sensors-last-run.json`) | PASS / FAIL / PARTIAL / NO_SENSORS / STALE | ex: 4/4 passed, 0 blocking_failures |
| Contrato (`contracts/active.json`) | READY_TO_CLOSE / ON_TRACK / AT_RISK / FAILED / NO_CONTRACT | ex: phase-02-auth-flows em `in_progress`, 3/5 deliverables OK |
| Behaviours (`behaviours-last-run.json`) | PASS / FAIL / PARTIAL / NO_BEHAVIOURS / NEVER_RUN / STALE | ex: 4/5 passed, 1 blocking_failure em b-05-rate-limit-429 |

Se qualquer fonte está `STALE` ou `NEVER_RUN`, marcar explicitamente como **evidência incompleta** — o veredicto é rebaixado a "CONFORME COM LACUNAS" no mínimo.

### Rebaixamentos por evidência runtime adversa

Lista dos cenários/entregas que foram rebaixados por evidência runtime contradizer análise estática:

| Cenário/Entrega | Status estático original | Status final | Fonte do rebaixamento |
|---|---|---|---|
| Cenário 2.4 (rate limit) | IMPLEMENTADO | NÃO COBERTO | behaviour `b-05-rate-limit-429` status=fail, on_fail=block |
| Entrega 3 (health check) | IMPLEMENTADO | PARCIAL | behaviour `b-03-health-endpoint` stale (declaration_changed) |

### Binding gaps detectados

Lista dos ACs do contrato com `verifiable_by: "behaviour"` cujo `behaviour_id` está ausente, desabilitado ou sem entrada em `results[]`:

| AC ID | Contrato | Behaviour esperado | Estado atual |
|---|---|---|---|
| AC4 | phase-02-auth-flows | b-05-rate-limit-429 | enabled=false em `behaviours.json` |

Binding gaps não rebaixam entregas mas sinalizam que contrato e behaviours estão dessincronizados. Recomendação: revisar `behaviours.json` (enable o behaviour ausente) ou revisar o contrato (remover a promessa de `verifiable_by: behaviour`).

### Cenários não cobertos (por prioridade)

Lista dos cenários NÃO COBERTOS agrupados por tipo:

**Entrada inválida sem tratamento:**
- (lista de cenários de validação ausente)

**Casos de borda sem tratamento:**
- (lista de cenários de borda não cobertos)

**Limites sem verificação:**
- (lista de cenários de limite não verificados)

**Comportamento runtime divergente:**
- (cenários rebaixados por behaviour `fail` com `on_fail: block`)

### Entregas que divergem da spec
Lista das entregas PARCIAIS e NÃO IMPLEMENTADAS com o que falta.

### Entregas implementadas mas não especificadas
Se encontrar funcionalidades no código que não estão na spec, listar como "Escopo extra não especificado" — podem ser boas adições ou scope creep.

### Veredicto

Regras de decisão (aplicar **na ordem**, primeira que casa vence):

1. **NÃO CONFORME** — pelo menos uma das condições:
   - Entregas críticas da spec não foram implementadas (nenhum caminho feliz coberto)
   - Sensor com `on_fail: block` em `fail` cobrindo entrega crítica da spec
   - Behaviour com `on_fail: block` em `fail` cobrindo entrega crítica da spec (runtime evidence adversa)
   - Contrato ativo com veredicto `FAILED` no Passo 4.5

2. **CONFORME COM LACUNAS** — entregas implementadas mas pelo menos uma das condições:
   - Cenários de validação, borda ou limite não cobertos
   - Sensor com `on_fail: warn` em `fail`
   - Behaviour com `on_fail: warn` em `fail`
   - Behaviours declarados mas `NEVER_RUN`
   - Evidência runtime `STALE` (sensor ou behaviour)
   - Binding gaps entre contrato e behaviours
   - Contrato ativo com veredicto `AT_RISK` ou `ON_TRACK`
   - Scope drift detectado (spec sem deliverable ou deliverable sem entrega)

3. **CONFORME** — todas as condições:
   - Todas as entregas da spec estão `IMPLEMENTADO`
   - Todos os cenários estão `COBERTO` (nenhum `PARCIAL` ou `NÃO COBERTO`)
   - Sensores em `PASS` fresco (ou `NO_SENSORS` declarado como débito técnico)
   - Behaviours em `PASS` fresco (ou `NO_BEHAVIOURS` — opt-in)
   - Contrato em `READY_TO_CLOSE` (ou `NO_CONTRACT`)
   - Sem binding gaps

### Princípio de autoridade do ambiente

O veredicto final **nunca** pode contradizer evidência mecânica adversa. Se qualquer das 3 fontes (sensores, contrato, behaviours) reporta falha em cobertura de uma entrega, a entrega **deve** ser rebaixada mesmo que análise estática tenha encontrado código que "parece cobrir" o cenário.

O agente **não narra conformidade** — o ambiente fornece evidência. `/verify-spec` consolida as 3 fontes e reporta o veredicto determinístico.

### Próximos passos
- Lista priorizada do que falta implementar (se houver)
- Cenários não cobertos que representam risco de segurança ou integridade
- Entregas que precisam de teste manual do usuário

---

NÃO fazer correções automaticamente. Apenas reportar e aguardar aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada verificação.
