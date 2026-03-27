---
description: Planejamento e checkpoint visual de UI — validar estrutura de telas, navegação e layout antes da implementação funcional completa
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*)
---

Planejar a arquitetura visual do projeto ANTES da implementação funcional completa.

Este command deve ser executado após `/spec-check` (spec aprovada) e antes da implementação de lógica de negócio, persistência e integrações.

## Objetivo

Produzir um plano visual validável que permita ao usuário aprovar estrutura, navegação e layout ANTES que lógica pesada seja implementada. Isso evita retrabalho em cascata quando o layout precisa mudar.

---

## Saída Obrigatória

A estrutura visual deve ser adaptada ao tipo de interface do projeto: app mobile, app desktop, tablet, jogo com HUD/cenas/menus, ou outra interface não baseada em telas tradicionais. Os itens abaixo devem ser interpretados conforme o contexto.

### 1. Mapa de Navegação

Para o projeto completo:
- Quais telas/views existem
- Como se conectam (fluxo de navegação)
- Entrada e saída de cada fluxo
- Tipo de navegação (tabs, stack, drawer, modal)
- Tela inicial e fluxos principais

### 2. Estrutura de Cada Tela

Para cada tela relevante:
- Objetivo da tela (1 frase)
- Blocos visuais na ordem de hierarquia (o que aparece primeiro, segundo, etc.)
- Ações principais (botões primários, gestos)
- Ações secundárias (menus, swipes, links)
- Estados visuais: vazio, loading, erro, com dados
- Componentes compartilhados reutilizados

### 3. Componentes Compartilhados

Lista de componentes que aparecem em mais de uma tela:
- Navegação (tab bar, header, botão flutuante)
- Cards, listas, formulários reutilizáveis
- Modais e confirmações
- Feedback (toasts, snackbars, loading indicators)

### 4. Riscos de UX Identificados

- Fluxo confuso ou navegação ambígua
- Excesso de ações na mesma tela
- Informação fora de prioridade visual
- Campos demais em um formulário
- Dependência escondida entre telas
- Inconsistência de padrão visual entre telas

### 5. Proposta de Implementação em 2 Fases

**Fase A — UI Shell (para aprovação visual):**
- Todas as telas criadas com layout e navegação funcional
- Componentes visuais com dados mockados/estáticos
- Navegação completa entre todas as telas
- Estados visuais (vazio, loading, erro) com mock
- SEM lógica de negócio, SEM banco, SEM validações reais

**Fase B — Functional Completion (após aprovação):**
- Conectar banco/persistência
- Implementar regras de negócio
- Conectar estado real
- Validações reais
- Import/export
- Polimento e ajustes finais

### 6. Ordem de Construção da UI Shell

Sequência recomendada para a Fase A, exemplo:
1. Estrutura de navegação (tabs, stacks)
2. Tela principal / Dashboard (layout base)
3. Componentes compartilhados
4. Demais telas na ordem de importância
5. Estados visuais (vazio, loading, erro)
6. Transições e micro-interações básicas

---

## Fluxo Após o `/ui-plan`

1. Claude Code apresenta o plano visual ao usuário
2. Usuário aprova, ajusta ou rejeita
3. Se aprovado: Claude Code implementa **apenas a Fase A (UI Shell)**
4. Usuário testa a casca visual no browser/emulador
5. Usuário aprova ou pede ajustes de layout/navegação
6. Após aprovação visual: Claude Code implementa **Fase B (Functional Completion)**
7. Ao finalizar: rodar `/ship-check`

---

## Atualização do Ledger

Ao concluir o ui-plan, atualizar `.claude/runtime/execution-ledger.md`:
- Atualizar Current Status → UI plan com o veredicto
- Registrar fases (A1, A2, B) como Delivery Phases com dependências e status NOT STARTED
- Registrar premissas visuais como Accepted Assumptions com Revisit When
- Registrar riscos de UX como Open Items
- Atualizar Last Updated em todos os itens modificados

---

## Regras

- NÃO implementar lógica de negócio na Fase A — apenas layout, navegação e dados mockados
- NÃO pular o checkpoint visual — Fase B só começa após aprovação explícita da UI Shell
- NÃO corrigir problemas de layout durante a Fase B — se o layout precisar mudar, voltar para a Fase A
- Correções de layout na Fase A são baratas; na Fase B são caras (afetam estado, validação, persistência)
- Seguir `.claude/rules/spec-quality.md` para garantir que a spec está pronta antes de planejar UI

---

## UI Plan Verdict

Ao final do planejamento visual, classificar:

| Veredicto | Significado | Ação permitida |
|-----------|-------------|----------------|
| **READY FOR UI SHELL** | Plano visual suficiente para implementar Fase A | Implementar UI Shell |
| **READY WITH VISUAL ASSUMPTIONS** | Plano suficiente com premissas visuais explicitadas | Implementar com premissas registradas |
| **BLOCKED** | Há ambiguidades de fluxo ou estrutura que impedem criar a UI Shell | Resolver antes de implementar |

---

## Critério Mínimo de Aprovação da Fase A

A Fase A (UI Shell) só pode ser considerada aprovada pelo usuário quando tiver sido validado, no mínimo:

- Navegação principal funcional (todas as rotas/telas acessíveis)
- Hierarquia visual das telas principais (ordem e prioridade dos blocos)
- Componentes compartilhados (header, tabs, cards, modais)
- Estados visuais críticos (vazio, loading, erro) com mock

Sem essa validação mínima, a Fase B não deve ser iniciada.
