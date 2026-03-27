---
description: Verificação de prontidão da especificação — gate de qualidade antes de planejar ou implementar
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*)
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

---

## Formato de Saída Obrigatório

### 1. Spec Readiness Verdict

Um dos três:

| Veredicto | Significado | Ação permitida |
|-----------|-------------|----------------|
| **READY** | Spec suficiente para implementação | Implementar |
| **READY WITH ASSUMPTIONS** | Spec suficiente apenas se premissas forem explicitadas | Implementar com premissas registradas |
| **BLOCKED** | Há lacunas ou ambiguidades materiais que impedem implementação segura | NÃO iniciar geração de arquivos |

### 2. Blocking Issues
Somente o que realmente impede começar. Cada item com:
- Localização na spec
- Problema
- Por que bloqueia
- Correção mínima recomendada

### 3. Ambiguities
Itens com múltiplas interpretações plausíveis. Cada item com:
- Localização na spec
- Interpretações possíveis
- Risco de escolher errado

### 4. Data Model Risks
Problemas de schema, integridade, tipos, constraints.

### 5. UX / Product Risks
Expectativa enganosa, fluxo incompleto, navegação indefinida, estados não previstos.

### 6. Operational / Testability Risks
Execução, validação, build, ambiente, modo de teste, critérios de aceite.

### 7. Safe Assumptions
Somente premissas de baixo risco que podem ser assumidas sem decisão do usuário. Explicitamente listadas.

### 8. Required Spec Fixes Before Implementation
Cada item obrigatoriamente classificado por tipo:

| Tipo | Significado |
|------|-------------|
| **Clarification** | Esclarecer algo já pretendido, sem mudar escopo |
| **Constraint Fix** | Fechar integridade/regra/contrato técnico |
| **Behavior Definition** | Definir comportamento já implícito no produto |
| **Scope Risk** | Ponto que pode expandir escopo se resolvido do jeito errado |
| **Out-of-Scope Suggestion** | Ideia válida, mas fora do foco da versão atual |

Formato por item:
- Tipo
- Problema
- Por que importa
- Correção mínima recomendada (preferir clarificação e fechamento de contrato, não expansão funcional)

Nota: itens classificados como `Out-of-Scope Suggestion` são registrados nesta seção para consideração futura, mas NÃO devem ser incorporados automaticamente.

---

## Atualização do Ledger

Ao concluir o spec-check, atualizar `.claude/runtime/execution-ledger.md`:
- Atualizar Current Status → Spec com o veredicto (READY / READY WITH ASSUMPTIONS / BLOCKED)
- Registrar blocking issues como Blockers com status BLOCKED
- Registrar Safe Assumptions como Accepted Assumptions com Revisit When preenchido
- Registrar Required Fixes como Open Items (Type conforme classificação: Clarification, Constraint Fix, etc.)
- Atualizar Last Updated em todos os itens modificados

---

## Regras

- NÃO fazer correções na especificação automaticamente. Apenas reportar e aguardar decisão.
- NÃO converter lacunas em expansão funcional. Preferir correção mínima suficiente.
- NÃO tratar spec BLOCKED como se fosse READY com workarounds otimistas.
- Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada achado.
- Consultar `.claude/rules/spec-quality.md` como referência de checklist.
