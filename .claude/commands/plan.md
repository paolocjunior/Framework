---
description: Criar plano de implementação antes de codar
allowed-tools: Read, Grep, Glob, Bash
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
Executar os 6 passos de `.claude/rules/plan-construction.md` antes de finalizar o plano.

## Gate de implementação

Ao finalizar o plano, remover o marker de aprovação anterior (se existir) para forçar novo ciclo de `/plan-review`:

```bash
rm -f .claude/runtime/.plan-approved
```

Isso garante que o hook `pre-implementation-gate.sh` bloqueie código-fonte até que o `/plan-review` aprove este novo plano.
