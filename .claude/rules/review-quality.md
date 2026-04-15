# Critérios de Qualidade de Review

## Propósito

Definir o que um output de review (feito por `/review`, `/plan-review`, `/audit` e variantes, `/verify-spec`) precisa conter para ser aceito como válido. Este é um **self-check interno obrigatório** aplicado pelo próprio command antes de publicar veredicto final.

Esta rule substitui a necessidade de um agent dedicado de "reviewer gate". Os critérios que um agent de meta-review aplicaria são determinísticos (o output declara escopo? cita evidência? dá recomendação acionável?) — melhor implementados como checklist no próprio command do que delegados a outro agent probabilístico.

O Codex (Camada 4) continua sendo o revisor externo cross-model. Esta rule é a camada interna que pega erros óbvios antes do Codex rodar. As duas camadas coexistem.

## Quando aplicar

Todo command de review DEVE aplicar o checklist abaixo **antes** de publicar veredicto final ao usuário. Se qualquer item falhar, o command DEVE corrigir o output e re-aplicar o checklist antes de publicar.

## Checklist obrigatório

### Escopo declarado

- [ ] O escopo analisado foi declarado explicitamente (quais arquivos, módulos, áreas, fases)
- [ ] O escopo NÃO analisado foi declarado explicitamente (o que ficou fora da análise e por quê)
- [ ] O tipo de análise foi declarado: `FULL` (cobertura total), `PARTIAL` (parcial por opção), ou `SAMPLE` (amostragem)
- [ ] Para análise `PARTIAL` ou `SAMPLE`, a cobertura foi justificada (por que parcial, qual o critério de amostragem)

### Evidência por finding

- [ ] Cada finding tem **localização concreta** (`arquivo:linha` ou referência específica)
- [ ] Cada finding tem **evidência verificável** (trecho de código citado, output de comando, referência a linha específica)
- [ ] Nenhuma aprovação é genérica — toda aprovação diz **o que foi verificado** (ex: não "o código está bom", mas "validou entrada em 4/4 endpoints, checou parameterização em 6/6 queries")
- [ ] Nenhuma frase vaga de confiança ("parece seguro", "provavelmente ok", "está coerente")

### Acionabilidade

- [ ] Cada finding tem recomendação **concreta** (o que fazer para resolver), não apenas descrição do problema
- [ ] **Severidade declarada** por finding, usando o vocabulário definido na tabela de veredictos/severidades do command invocador (ex: `/review` e `/audit` usam `CRÍTICO | ALTO | MÉDIO | BAIXO`; `/plan-review` usa `BLOCKING | NON-BLOCKING | EDITORIAL`). Esta rule não fixa um vocabulário universal — cada command declara o seu na própria documentação e o self-check valida apenas que a severidade declarada pertence àquele vocabulário
- [ ] Findings com confiança baixa foram escalados explicitamente como "requer verificação adicional" em vez de publicados como certeza

### Cobertura declarada

- [ ] `filesAnalyzed` / `filesTotal` declarados quando aplicável (ou equivalente para o domínio: `endpoints analisados / total`, `fases verificadas / total`)
- [ ] Se cobertura efetiva < 80% e o veredicto preliminar é `APROVADO` → rebaixar para `PARCIAL` ou declarar "requer análise adicional antes de aprovação final"

### Veredicto válido

- [ ] O veredicto publicado está na lista de veredictos permitidos para aquele command específico
- [ ] Veredicto fora da lista = output inválido → corrigir antes de publicar

## Protocolo de falha do self-check

Se **qualquer item** do checklist falhar:

1. **NÃO publicar** o veredicto como final
2. Corrigir o output (adicionar escopo faltante, adicionar evidência, concretizar recomendação, corrigir severidade, etc.)
3. **Re-aplicar** o checklist inteiro
4. Só publicar quando **todos** os itens passarem

Se após correção ainda falhar (por exemplo: evidência requerida não pode ser obtida porque o arquivo não foi lido):

1. Publicar veredicto **rebaixado** para `NEEDS_HUMAN_REVIEW` (ou equivalente do command específico)
2. Listar explicitamente o que não pôde ser verificado e por quê
3. Recomendar ação humana para suprir a lacuna

## Reforço externo (Camada 4)

O Codex (`/codex:adversarial-review`) é o revisor externo obrigatório da Camada 4 em contexto de projeto. Esta rule é a camada interna. A sequência de validação é:

1. Command executa análise principal
2. Command aplica **este** self-check antes de publicar
3. Command publica veredicto preliminar
4. Codex roda adversarial review (Camada 4) — pega blind spots cross-model
5. Findings do Codex são processados conforme protocolo em `CLAUDE.md`

Uma rule não substitui a outra. O self-check pega os erros óbvios internos antes do Codex; o Codex pega os blind spots que o self-check não alcança porque vem de outra família de modelo.

## Veredictos permitidos por command

Cada command de review usa sua própria tabela de veredictos. Veredicto fora da tabela de um command específico = output inválido. As tabelas vivem dentro dos próprios commands (`/review`, `/plan-review`, `/audit`, `/verify-spec`, etc.), não nesta rule — para evitar duplicação e drift.

## Anti-padrões explicitamente proibidos

Os seguintes padrões são considerados **falha de self-check automática**, independente do command:

- **"Não encontrei problemas"** sem dizer o que foi verificado
- **Grep por import ou declaração usado como prova de uso real** (ver `.claude/rules/evidence-tracing.md` — "Anti-padrões de Evidência")
- **Contagem de grep matches como contagem de uso efetivo** (matches incluem imports, re-exports, comentários, type annotations — não apenas uso)
- **Conclusão de cobertura total a partir de amostragem parcial** sem declarar que foi amostra
- **Severidade implícita** ("isso seria bom arrumar" sem declarar o nível explícito no vocabulário do command invocador)
- **Recomendação sem destino** ("deveria ser melhor" sem arquivo/linha/ação específica)

Estes anti-padrões estão catalogados em `.claude/rules/evidence-tracing.md` — esta rule apenas reforça que commands de review devem rejeitá-los no self-check.
