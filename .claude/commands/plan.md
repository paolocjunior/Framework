---
description: Criar plano de implementação antes de codar
allowed-tools: Read, Grep, Glob, Bash
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de planejar:

1. Ler `memory/project_spec-status.md` (snapshot do estado)
2. Se ausente, ler `runtime/execution-ledger.md` diretamente
3. Verificar Open Items, pendências, bloqueios e fase atual
4. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
5. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

Sem contexto carregado, o plano pode retrabalhar o que já foi resolvido ou ignorar bloqueios ativos.

---

Antes de qualquer implementação, criar um plano estruturado:

1. **Objetivo**: o que será implementado e por quê
2. **Contexto**: arquivos e módulos afetados (listar após explorar o projeto)
3. **Abordagem**: como será implementado, passo a passo
4. **Justificativa**: por que esta abordagem e não alternativas
5. **Riscos**: o que pode dar errado e como mitigar
6. **Critérios de sucesso**: como verificar que ficou correto
7. **Estimativa**: quantidade de arquivos e mudanças envolvidas

Apresentar o plano e aguardar aprovação ANTES de implementar qualquer código.

Se o plano for aprovado com alterações, atualizar o plano e reapresentar.

Consultar `.claude/rules/implementation-quality.md` para evitar padrões de erro recorrentes ao criar planos.
Executar os 8 passos de `.claude/rules/plan-construction.md` antes de finalizar o plano.

## Avaliação condicional de risco

Após o plano estar consolidado e antes de apresentá-lo ao usuário, verificar se ele contém qualquer um dos gatilhos abaixo:

- Migração de dados
- Mudança em integração externa
- Operação irreversível (drop table, reset, delete, truncate)
- Dependência nova crítica (biblioteca de autenticação, criptografia, pagamento, persistência)

Se **qualquer gatilho** estiver ativo, invocar o agent `risk-assessment` via Agent tool com:

- **Objetivo:** "Avaliar riscos arquiteturais e operacionais do plano consolidado"
- **Contexto:** texto completo do plano + referências a arquivos afetados
- **Escopo:** apenas as 5 categorias do agent (irreversibilidade, incógnitas, ponto único de falha, débito técnico, risco de migração) — não avaliar qualidade de código, fidelidade a spec ou coerência interna
- **Critérios de veredicto:** LOW_RISK | MEDIUM_RISK | HIGH_RISK | BLOCKING_RISK conforme `.claude/rules/agent-contracts.md`

**Override de model condicional:** se o projeto é financeiro, o plano toca em código de classes B/C/D da Security Regression Matrix (`.claude/rules/testing.md`), ou envolve migração de dados de produção em larga escala, passar `model: opus` na invocação da Agent tool. Caso contrário, usar o default `sonnet` do frontmatter do agent.

Aguardar o veredicto e aplicar o mapa abaixo:

| Veredicto do agent | Ação do command |
|---|---|
| `LOW_RISK` | Plano prossegue normalmente |
| `MEDIUM_RISK` | Plano prossegue com aviso destacado no topo + matriz de riscos citada |
| `HIGH_RISK` | Plano é apresentado com seção "Riscos" destacada no topo — usuário revisa antes de aprovar |
| `BLOCKING_RISK` | Plano **não** é apresentado — retornar ao início do command para reformulação, incluindo as mitigações sugeridas pelo agent |
| `NEEDS_HUMAN_REVIEW` (falha de contrato) | Reportar a falha ao usuário e pedir decisão manual antes de prosseguir |

Se nenhum gatilho estiver ativo, pular esta etapa — não invocar o agent, poupa tokens.

## Gate de implementação

Ao finalizar o plano, remover o marker de aprovação anterior (se existir) para forçar novo ciclo de `/plan-review`:

```bash
rm -f .claude/runtime/.plan-approved
```

Isso garante que o hook `pre-implementation-gate.sh` bloqueie código-fonte até que o `/plan-review` aprove este novo plano.
