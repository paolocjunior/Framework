# Pattern Registry

> **Contrato de escrita:**
> - **Escrita é sempre manual pelo usuário.** Nenhum command, hook ou agent escreve neste arquivo automaticamente — apenas o usuário colando conteúdo.
> - **Origem do conteúdo:** `/justify` apresenta blocos formatados prontos para inserção. O usuário lê o bloco e decide se cola aqui.
> - **Por que manual:** garante controle total sobre o que vira padrão oficial, evita poluição automática por sugestões fracas, e funciona sem depender das ferramentas declaradas nos `allowed-tools` dos commands.
>
> **Regras de conteúdo:**
> - Formato: blocos estruturados (ver template abaixo) com ID, Categoria, Status, Decisão, Escopo, Revisitar Quando
> - Ciclo de vida: `draft` → `approved` → `deprecated` | `superseded`
> - Leitura: `/status-check` exibe padrões com status `approved`
>
> **O que entra:** decisões arquiteturais reutilizáveis, convenções de código, anti-patterns formalizados
> **O que NÃO entra:** pendências de sessão, hipóteses, TODOs, decisões não aprovadas

## Padrões Aprovados

<!-- Formato de entrada:
## [ID] — [Título]
| Campo | Valor |
|-------|-------|
| Categoria | Arquitetura / Segurança / UI / Data Modeling / Anti-Pattern |
| Status | draft / approved / deprecated / superseded |
| Decisão | O que foi decidido |
| Alternativas Rejeitadas | O que foi considerado e descartado |
| Aprovado Em | Data e fonte (ex: 2026-01-10 via /plan) |
| Escopo | Onde se aplica |
| Revisitar Quando | Condição que invalida ou requer reavaliação |
-->

<!-- Adicionar padrões abaixo desta linha -->
