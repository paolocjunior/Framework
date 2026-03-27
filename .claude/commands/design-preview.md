---
description: Gerar opções visuais de Design System para aprovação antes da implementação da UI Shell — cores, tipografia, componentes e estilo
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*), Bash(npm:*), Bash(npx:*), Bash(node:*)
---

Gerar 2-3 opções de Design System para o projeto, renderizadas como preview visual real, para aprovação antes da implementação da UI Shell.

Este command deve ser executado após `/ui-plan` (arquitetura de telas aprovada) e antes da implementação da Fase A (UI Shell).

## Objetivo

Permitir que o usuário escolha a direção estética do produto ANTES que o visual seja implementado em todas as telas. A escolha acontece no nível do **Design System** (paleta, tipografia, componentes), não no nível de cada tela individual.

A estrutura visual deve ser adaptada ao tipo de interface do projeto: app mobile, app desktop, tablet, jogo com HUD/cenas/menus, ou outra interface.

---

## Saída Obrigatória

### 1. Opções de Design System (2-3)

Para cada opção, definir:

- **Nome/conceito** (ex: "Clean Minimal", "Dark Premium", "Vibrant Modern")
- **Paleta de cores** — primária, secundária, fundo, superfície, texto, receita/sucesso, despesa/erro, aviso, info
- **Tipografia** — família de fontes (títulos e corpo), pesos, escala de tamanhos
- **Componentes base** — estilo de botões (raio, sombra, padding), inputs, cards, modais, listas
- **Espaçamentos** — escala de spacing (4, 8, 12, 16, 24, 32...)
- **Raio de borda** — estilo geral (reto, levemente arredondado, muito arredondado, pill)
- **Sombras/elevação** — flat, sutil, pronunciada
- **Tom geral** — leve/divertido, sério/profissional, premium/sofisticado, etc.

### 2. Preview Visual Real

Cada opção DEVE ser renderizada como preview funcional que o usuário possa ver no browser:

- HTML estático, ou
- React/Expo Web componentes, ou
- Arquivo .html abrível diretamente

O preview deve mostrar, no mínimo:
- Card de exemplo com dados mockados
- Botão primário e secundário
- Input com label
- Lista com 3-5 itens
- Header/barra de navegação
- Indicadores de cor (receita, despesa, neutro, erro)

### 3. Aplicação em Telas de Referência

Cada opção aplicada em **2 telas** do projeto (não todas):
- **1 tela principal** (a mais rica em informação — ex: dashboard)
- **1 tela de contraste** (formulário, lista, ou tela com interação diferente)

Isso permite validar o Design System em contextos diferentes sem renderizar todas as telas.

### 4. Comparativo

Tabela resumo comparando as opções:

| Aspecto | Opção A | Opção B | Opção C |
|---------|---------|---------|---------|
| Tom visual | | | |
| Melhor para | | | |
| Risco/limitação | | | |
| Recomendação | | | |

---

## Atualização do Ledger

Ao concluir o design-preview e após escolha do usuário, atualizar `.claude/runtime/execution-ledger.md`:
- Atualizar Current Status → Design com APPROVED
- Registrar design escolhido como Approval com data
- Registrar itens visuais adiados (ex: tema escuro) como Open Items com Type DEFERRED, Status DEFERRED e Revisit When
- Atualizar Last Updated em todos os itens modificados

---

## Regras

- Gerar exatamente 2 ou 3 opções — nunca apenas 1 (sem escolha) nem mais de 3 (paralisia de decisão)
- NÃO gerar 3 opções para cada tela — a escolha é no nível do Design System, aplicado em telas de referência
- NÃO deixar o Claude Code decidir sozinho a identidade visual — sempre apresentar opções e aguardar escolha
- NÃO misturar elementos de opções diferentes (ex: cores da A com fontes da B) a menos que o usuário peça explicitamente
- Cada opção deve ser coerente internamente — paleta, fonte, componentes e espaçamentos formam um sistema
- Preview deve ser funcional e abrível — não apenas descrição textual
- As ferramentas de preview devem ser adaptadas à stack do projeto. Quando React/HTML não forem a melhor representação, usar o mecanismo de preview mais adequado à tecnologia disponível
- Consultar `.claude/rules/design-system-quality.md` para critérios de qualidade visual

---

## Design Preview Verdict

Ao apresentar as opções:

| Veredicto | Significado |
|-----------|-------------|
| **OPTIONS READY** | 2-3 opções geradas e prontas para escolha do usuário |
| **NEEDS SPEC CLARIFICATION** | A spec não tem informação suficiente sobre público/objetivo para gerar opções coerentes |

## Critério Mínimo de Aprovação Visual

A direção estética só pode ser considerada aprovada quando o usuário tiver validado, no mínimo:
- Paleta principal (cores primárias, fundo, texto)
- Tipografia base (família e hierarquia de tamanhos)
- Estilo de componentes centrais (botão, input, card)
- Adequação geral ao objetivo e público do produto

Sem essa validação mínima, a UI Shell não deve ser implementada.

---

## Fluxo Após Escolha

1. Usuário escolhe uma opção (A, B ou C)
2. Claude Code registra o Design System escolhido como referência
3. A Fase A (UI Shell) usa exclusivamente o Design System aprovado
4. Ajustes pontuais de cor/fonte podem ser feitos durante a Fase A, mas mudança de Design System inteiro requer novo `/design-preview`
5. O Design System escolhido deve ser implementado como tokens/variáveis reutilizáveis (CSS variables, theme object, ou equivalente da stack)
