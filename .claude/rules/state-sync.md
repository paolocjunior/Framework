# Protocolo de Sincronização de Estado (Trio)

## Propósito

Garantir que o estado do projeto persista entre sessões do Claude Code através de 3 arquivos complementares, cada um com função distinta. A dessincronização entre eles é a principal causa de perda de contexto entre sessões.

## Os 3 Arquivos

| # | Arquivo | Onde vive | Função | Tamanho |
|---|---------|-----------|--------|---------|
| 1 | `runtime/execution-ledger.md` | Dentro do projeto (Git) | Registro oficial e completo — histórico detalhado de fases, reviews, findings, Open Items, backlog | Grande (cresce com o projeto) |
| 2 | `memory/project_spec-status.md` | Memória do Claude Code (fora do projeto) | Snapshot resumido do estado atual — contexto rápido para sessões novas | Compacto (~60 linhas) |
| 3 | `memory/MEMORY.md` | Memória do Claude Code (fora do projeto) | Índice de ponteiros para todos os arquivos de memória | Mínimo (~1 linha por entrada, max 200 linhas) |

### Por que 3 e não 1

| Problema | Solução |
|----------|---------|
| O ledger é grande demais para carregar inteiro em toda sessão | O snapshot é um resumo leve que dá contexto rápido |
| O ledger vive no Git (precisa de commit para persistir) | A memória persiste na máquina do usuário sem commit |
| O Claude Code precisa saber quais memórias existem | O MEMORY.md é o índice que lista todas |
| Sessões diferentes precisam do mesmo contexto | Os 3 sincronizados garantem que qualquer sessão nova reconstrua o estado |

## Hierarquia de Verdade

```
execution-ledger.md (fonte de verdade)
    └── project_spec-status.md (derivado do ledger)
        └── MEMORY.md (índice — aponta para o snapshot)
```

Se houver conflito entre o ledger e o snapshot, **o ledger prevalece**. O snapshot deve ser corrigido para refletir o ledger.

## Regra de Sincronização

**Quando o estado do projeto muda, os 3 arquivos devem ser atualizados juntos, na mesma operação.** Nunca atualizar apenas 1 ou 2 deles.

### Eventos que disparam atualização

- Uma fase mudou de status (NOT STARTED → IN PROGRESS → DONE)
- Um Open Item foi corrigido, adiado ou criado
- Um novo finding foi registrado
- Um bloqueio foi identificado ou resolvido
- Um command com veredicto rodou (/spec-check, /ship-check, /review, /audit, /verify-spec)
- Uma aprovação parcial ou total foi registrada

### Fluxo de atualização

```
Evento (ex: fase concluída, fix aplicado, command com veredicto)
    │
    ├─► 1. Atualizar runtime/execution-ledger.md
    │      (registro detalhado: o que mudou, evidência, data)
    │
    ├─► 2. Atualizar memory/project_spec-status.md
    │      (snapshot resumido: status atualizado, Open Items)
    │
    └─► 3. Atualizar memory/MEMORY.md (se necessário)
           (só se a descrição na linha mudou ou se um novo arquivo foi criado)
```

### Quando o MEMORY.md precisa de edição

O MEMORY.md nem sempre precisa ser editado. Só precisa quando:
- Um novo arquivo de memória é criado (adicionar ponteiro)
- A descrição de um ponteiro existente ficou desatualizada (ex: status mudou)
- Um arquivo de memória foi removido (remover ponteiro)

Se o `project_spec-status.md` já existe no índice e a descrição na linha ainda é precisa, basta atualizar o conteúdo do snapshot.

## Consequências da Dessincronização

| Cenário | Consequência |
|---------|-------------|
| Ledger atualizado mas memória não | Sessão nova lê memória desatualizada e pode retrabalhar algo já resolvido |
| Memória atualizada mas ledger não | Claude Code acha que algo foi resolvido mas o registro oficial não confirma |
| MEMORY.md sem ponteiro para arquivo novo | Claude Code não carrega a memória nova e perde o contexto |
| Todos desatualizados | Sessão nova começa sem contexto — estado do projeto perdido |

## Bootstrap (primeiro uso)

O primeiro command que gera veredicto em um projeto novo (normalmente `/spec-check`) deve:

1. Preencher o `runtime/execution-ledger.md` com os dados iniciais
2. Criar o `project_spec-status.md` na memória do Claude Code usando o template em `runtime/project-status.template.md`
3. Adicionar o ponteiro no `MEMORY.md`

O template do snapshot está em `.claude/runtime/project-status.template.md` como referência de formato.

## Localização dos Arquivos de Memória

Os arquivos de memória vivem fora do repositório Git, no diretório de memória do Claude Code:

```
<home>/.claude/projects/<slug-do-projeto>/memory/
```

O Claude Code resolve este path automaticamente — não é necessário calculá-lo. Basta usar o sistema de memória nativo (Write to memory) para criar e atualizar os arquivos.

## Regras de Integridade

1. Nunca atualizar apenas 1 dos 3 — a divergência é a principal causa de perda de contexto
2. O ledger é a fonte de verdade — em caso de conflito, vale o ledger
3. O MEMORY.md tem limite de ~200 linhas — manter conciso, 1 linha por entrada
4. Status devem usar valores normalizados (ver `.claude/rules/execution-tracking.md`)
5. Toda atualização deve incluir data para rastreabilidade temporal
6. O snapshot deve conter apenas o estado atual — para histórico, consultar o ledger
