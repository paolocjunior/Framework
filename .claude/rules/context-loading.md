# Context Loading Protocol

## Propósito

Garantir que todo command que depende de estado acumulado do projeto carregue o trio de sincronização (ledger + snapshot + índice) antes de começar a operar. Commands que ignoram o estado acumulado produzem decisões baseadas em contexto parcial e retrabalham o que já foi resolvido.

Esta rule é o "loader de contexto" do framework. Ela substitui a necessidade de um agent dedicado de gestão de contexto — a tarefa é determinística (ler arquivos do trio) e já existe snapshot pré-sintetizado, então não há ganho em delegar a um agent probabilístico.

## Commands obrigados a carregar contexto

Todo command abaixo DEVE aplicar o protocolo antes de executar sua lógica principal:

- `/plan`
- `/spec-check`
- `/plan-review`
- `/review`
- `/audit` (e todas as variantes: `/db-audit`, `/web-audit`, `/k8s-audit`)
- `/verify-spec`
- `/ship-check`

Commands fora desta lista (ex: `/spec-create`, `/justify`, `/status-check`, `/memory-consolidate`) têm seus próprios protocolos de leitura de contexto e não precisam aplicar este.

## Protocolo

O command executa na ordem:

1. **Tentar ler o snapshot** em `memory/project_spec-status.md` (fonte rápida, resumida, pré-sintetizada)
2. **Se o snapshot estiver ausente**, ler `runtime/execution-ledger.md` diretamente (fonte de verdade, mas mais custoso)
3. **Se o ledger também estiver ausente**, declarar "projeto sem estado prévio" e prosseguir — é um projeto novo ou não gerenciado pelo framework
4. **Verificar presença de**:
   - Open Items abertos
   - Pendências registradas
   - Bloqueios ativos
   - Fases em andamento
5. **Declarar explicitamente no início do output** do command:
   ```
   Contexto carregado: [fase atual], [open items: N], [bloqueios: N]
   ```
   Se nada for encontrado, declarar: `Contexto carregado: projeto sem estado prévio`

## Validação de consistência

Se o snapshot (`project_spec-status.md`) e o ledger (`execution-ledger.md`) divergirem em dados críticos (fase atual, status de Open Items, blocker ativos):

1. **Não operar** sobre estado inconsistente
2. Aplicar o protocolo de `.claude/rules/state-sync.md` para reconciliar
3. Só prosseguir após sincronização

A hierarquia de verdade do `state-sync.md` é autoritativa: o ledger prevalece sobre o snapshot em caso de conflito. O snapshot deve ser atualizado para refletir o ledger.

## Falha do protocolo

Se nenhum dos dois arquivos puder ser lido e o command exige contexto para operar:

1. **Parar** a execução do command
2. Declarar explicitamente: "Estado do projeto inacessível. Execute `/status-check` manualmente antes de continuar."
3. **Não** gerar veredicto, plano, review ou qualquer artefato sem base de contexto

Commands NÃO podem assumir estado padrão ou prosseguir com contexto vazio quando o protocolo falha — isso é fonte comprovada de retrabalho e decisões inconsistentes.

## Exceções explícitas

- **Projetos novos (bootstrap):** se o projeto ainda não rodou nenhum command com veredicto, não há ledger. Neste caso, a declaração "projeto sem estado prévio" é válida e o command prossegue normalmente.
- **Commands de verificação rápida** que não produzem veredicto (ex: apenas listagem): podem pular o protocolo se declararem explicitamente que são read-only.

## Relação com o trio de sincronização

O protocolo de leitura definido aqui é o **consumidor** do trio mantido por `.claude/rules/state-sync.md`. Commands que alteram estado (`/spec-check`, `/ship-check`, `/review`, `/audit`, `/verify-spec`) leem via este protocolo no início e atualizam o trio via `state-sync.md` ao final.

| Momento | Protocolo aplicado |
|---|---|
| Início do command | `context-loading.md` (esta rule) — leitura |
| Fim do command (se houver mudança de estado) | `state-sync.md` — escrita coordenada do trio |
