---
description: Verificação de prontidão da especificação — gate de qualidade antes de planejar ou implementar
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*)
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de auditar a spec:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Verificar Open Items, bloqueios e fase atual do projeto
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

Auditar a especificação do projeto/produto ANTES de qualquer plano de implementação, seguindo a checklist em `.claude/rules/spec-quality.md`.

## Objetivo

Responder com evidência: **esta especificação está pronta para ser implementada?**

Verificar sistematicamente:

### 1. Completude funcional
- Telas, fluxos e ações relevantes têm objetivo e comportamento definidos?
- Campos, validações e estados previstos?
- Critérios mínimos de aceite presentes?

### 2. Contradições internas
- Conflitos entre seções?
- Tela/fluxo descrito de forma incompatível?
- Regra de negócio contraditória?

### 3. Ambiguidades materiais
- Múltiplas interpretações plausíveis?
- Decisão crítica implícita?
- Ownership de navegação/estado indefinido?
- Feature descrita sem comportamento operacional suficiente?
- Valores que aparecerão em código (enums, códigos de erro, nomes de eventos, chaves de artefato, strings comparadas, nomes de campos de API) estão marcados com notação explícita `[literal]"X"` / `[example]"X"` / `[equivalent]"X"` conforme `.claude/rules/spec-quality.md#Convenção-de-notação-literal`? Ausência de notação em valor que aparecerá em código é Flag — registrar em Required Actions como Clarification.

### 4. Modelo de dados e integridade
- Entidades principais definidas?
- Schema compatível com as features?
- Constraints cobrem regras relevantes (não depende só de UI)?
- Tipos adequados ao domínio?

### 5. Regras de negócio e edge cases
- Condição + ação + resultado claros?
- Comportamento manual vs automático explícito?
- Políticas de erro/conflito/importação definidas quando aplicável?
- Casos limite relevantes cobertos?

### 6. Viabilidade técnica
- Stack escolhida suporta tudo que foi pedido?
- Limitações conhecidas explicitadas?
- Trade-offs críticos claros?

### 7. Testabilidade e prontidão de entrega
- Existe forma objetiva de validar a implementação?
- Modo de teste está definido?
- Limitações do modo de teste explícitas?

### 8. Cobertura cruzada — regras, fluxos e testes (obrigatório)

Verificar paridade entre as três camadas da spec. Para cada elemento encontrado, verificar se está refletido nas demais:

- Toda regra de negócio definida na spec aparece em pelo menos 1 fluxo que a aplica explicitamente?
- Todo constraint (validação, limite, formato) está coberto por pelo menos 1 cenário de teste quando o modo de teste promete validação objetiva?
- Todo código de erro ou comportamento de falha definido na API/contrato aparece nos fluxos relevantes?
- Caminho de erro previsto em qualquer endpoint/operação aparece no fluxo de UI correspondente?
- Regra existente na spec mas ausente no fluxo aplicável → Flag
- Constraint existente na spec mas sem cenário de teste correspondente → Flag
- Erro previsto na API mas ausente nos fluxos → Flag

---

## Formato de Saída Obrigatório

### 1. Spec Readiness Verdict

Um dos três — usando as regras de mapeamento abaixo para chegar ao veredicto de forma determinística:

| Veredicto | Critério normativo | Ação permitida |
|-----------|-------------------|----------------|
| **BLOCKED** | Qualquer item da seção "Block implementation when" de `.claude/rules/spec-quality.md` está presente | NÃO iniciar geração de arquivos |
| **READY WITH ASSUMPTIONS** | Nenhum item bloqueante + ao menos 1 Safe Assumption necessária OU ao menos 1 Required Action aberta | Implementar com premissas e ações registradas |
| **READY** | Nenhum item bloqueante + nenhuma assumption necessária + nenhuma Required Action aberta | Implementar |

**Regra de aplicação:** verificar os critérios na ordem BLOCKED → READY WITH ASSUMPTIONS → READY. O primeiro critério satisfeito define o veredicto. Não há exceções — o veredicto não pode ser rebaixado por julgamento qualitativo do modelo se os critérios objetivos não forem satisfeitos.

### 2. Blocking Issues

Somente o que se enquadra nos critérios de "Block implementation when" de `.claude/rules/spec-quality.md`. Cada item com:
- **Localização:** arquivo e seção exata
- **Evidência:** trecho da spec ou ausência concreta que justifica o bloqueio
- **Impacto:** o que acontece se iniciar implementação assim
- **Severidade:** CRÍTICO / ALTO
- **Correção mínima:** ação específica para desbloquear

Se nenhum item se enquadra nos critérios normativos, colapsar em: `✓ Nenhum blocking issue — critérios de spec-quality.md#Block não acionados.`

### 3. Ambiguities

Itens com múltiplas interpretações plausíveis que não bloqueiam mas exigem decisão. Cada item com:
- **Localização:** arquivo e seção exata
- **Evidência:** trecho da spec que gera a ambiguidade
- **Interpretações possíveis:** listar as variantes plausíveis
- **Impacto:** o que acontece se escolher a interpretação errada
- **Severidade:** ALTO / MÉDIO / BAIXO
- **Correção mínima:** como resolver (preferir clarificação que feche a ambiguidade sem expandir escopo)

Se nenhum encontrado: `✓ Nenhuma ambiguidade material encontrada.`

### 4. Data Model Risks

Problemas de schema, integridade, tipos, constraints. Cada item com:
- **Localização:** arquivo e seção
- **Evidência:** campo, tipo ou constraint problemático
- **Impacto:** consequência técnica
- **Severidade:** ALTO / MÉDIO / BAIXO
- **Correção mínima:** ajuste específico

Se nenhum encontrado: `✓ Nenhum risco no modelo de dados.`

### 5. UX / Product Risks

Expectativa enganosa, fluxo incompleto, navegação indefinida, estados não previstos, caminhos de erro ausentes (incluindo findings do Passo 8 — cobertura cruzada). Cada item com:
- **Localização:** arquivo e seção
- **Evidência:** o que está faltando ou divergindo
- **Impacto:** consequência para o usuário ou implementador
- **Severidade:** ALTO / MÉDIO / BAIXO
- **Correção mínima:** ação específica

Se nenhum encontrado: `✓ Nenhum risco de UX/produto.`

### 6. Operational / Testability Risks

Execução, validação, build, ambiente, modo de teste, critérios de aceite, cobertura de testes (incluindo gaps de paridade regra↔teste do Passo 8). Cada item com:
- **Localização:** arquivo e seção
- **Evidência:** o que não pode ser validado ou está ausente
- **Impacto:** o que fica sem cobertura
- **Severidade:** ALTO / MÉDIO / BAIXO
- **Correção mínima:** ação específica

Se nenhum encontrado: `✓ Nenhum risco operacional ou de testabilidade.`

### 7. Safe Assumptions

Somente premissas de baixo risco que podem ser assumidas **sem exigir edição da spec** e sem decisão do usuário. Se um ponto exige edição da spec, vai para Required Actions — não aqui.

Regra de exclusão mútua: um achado não pode aparecer simultaneamente como Safe Assumption e como Required Action. Se exige mudança na spec → Required Action. Se pode ser assumido sem mudança → Safe Assumption.

### 8. Required Actions and Timing

Ações necessárias classificadas por tipo E por momento de execução:

| Tipo | Significado |
|------|-------------|
| **Clarification** | Esclarecer algo já pretendido, sem mudar escopo |
| **Constraint Fix** | Fechar integridade/regra/contrato técnico |
| **Behavior Definition** | Definir comportamento já implícito no produto |
| **Scope Risk** | Ponto que pode expandir escopo se resolvido do jeito errado |
| **Out-of-Scope Suggestion** | Ideia válida, mas fora do foco da versão atual |

Formato por item:
- **Tipo**
- **Momento:** `antes_do_plan` | `durante_implementacao` | `antes_do_ship`
- **Problema:** o que está faltando ou incorreto na spec
- **Por que importa:** consequência se não corrigir
- **Correção mínima:** ação específica (preferir clarificação e fechamento de contrato, não expansão funcional)

Nota: itens `Out-of-Scope Suggestion` são registrados para consideração futura, mas NÃO devem ser incorporados automaticamente. Itens `antes_do_plan` devem ser resolvidos antes do `/plan`. Itens `durante_implementacao` podem ser endereçados enquanto o código é escrito. Itens `antes_do_ship` são pré-requisito para o `/ship-check`.

---

## Atualização do Ledger

Ao concluir o spec-check, atualizar `.claude/runtime/execution-ledger.md`:
- Atualizar Current Status → Spec com o veredicto (READY / READY WITH ASSUMPTIONS / BLOCKED)
- Registrar blocking issues como Blockers com status BLOCKED
- Registrar Safe Assumptions como Accepted Assumptions com Revisit When preenchido
- Registrar Required Actions como Open Items (Type conforme classificação: Clarification, Constraint Fix, etc.) com o campo Timing preenchido
- Atualizar Last Updated em todos os itens modificados

Aplicar o protocolo de `.claude/rules/state-sync.md` para sincronizar ledger + snapshot de memória + MEMORY.md index na mesma operação.

---

## Atualizar AGENTS.md

Se o veredicto for READY ou READY WITH ASSUMPTIONS, preencher a seção "Contexto do Projeto" do `AGENTS.md` na raiz do projeto com:
- Tipo de projeto (ex: API REST, app mobile, CLI, etc.)
- Stack principal (linguagens, frameworks, banco de dados)
- Objetivo em 1-2 frases

Se o AGENTS.md não existir, registrar como Open Item no ledger: "AGENTS.md ausente — criar antes do /plan".

---

## Codex Adversarial Review (Camada 4)

Após publicar o veredicto, invocar `/codex:adversarial-review` passando como focus text:
- O veredicto e os achados principais do spec-check
- A spec completa (ou as seções relevantes para os findings)
- Instrução: "Valide se os findings são reais e se há lacunas não detectadas pelo spec-check"

Ver protocolo completo de Codex review em `CLAUDE.md` seção "Cross-Model Review (Camada 4)".

---

## Regras

- NÃO fazer correções na especificação automaticamente. Apenas reportar e aguardar decisão.
- NÃO converter lacunas em expansão funcional. Preferir correção mínima suficiente.
- NÃO tratar spec BLOCKED como se fosse READY com workarounds otimistas.
- O veredicto é determinístico: aplicar os critérios da tabela na ordem BLOCKED → READY WITH ASSUMPTIONS → READY. Nenhum julgamento qualitativo substitui os critérios objetivos.
- Um achado não pode ser simultaneamente Safe Assumption e Required Action — escolher a classificação mais apropriada.
- Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada achado.
- Consultar `.claude/rules/spec-quality.md` como referência de checklist, em especial a seção "Block implementation when" para determinar Blocking Issues.
