---
description: Auditoria completa de segurança e qualidade do código
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(npm:*), Bash(npx:*), Bash(pip:*), Bash(python:*), Bash(node:*), Bash(cat:*), Bash(wc:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de iniciar a auditoria:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Verificar fase atual, Open Items e bloqueios — auditoria deve considerar estado acumulado e findings anteriores
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir

---

Realizar auditoria completa do código do projeto seguindo as checklists em:
- `.claude/rules/security.md`
- `.claude/rules/web-api-security.md` — incluindo seções de Race Conditions, Lógica de Negócio e Anti-fraude, URLs e Recursos Armazenados, e Validação de Tamanho de Input

Para cada item da checklist:

1. Verificar se o código atual atende ao critério
2. Se NÃO atende, reportar com:
   - Arquivo e linha exata
   - Evidência concreta (trecho de código, output ou referência direta)
   - O que está errado
   - Risco associado (CRÍTICO / ALTO / MÉDIO / BAIXO)
   - Sugestão de correção concreta
   - O que não foi verificado neste item

Ao final, gerar um resumo com:
- Escopo analisado (quais arquivos, módulos, áreas)
- Escopo NÃO analisado
- Total de problemas por severidade
- Top 3 riscos mais críticos
- Nível de confiança do veredicto
- Próximas ações recomendadas (ordenadas por prioridade)

NÃO fazer correções automaticamente. Apenas reportar e aguardar aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada achado.

---

## Itens Pendentes de Verificação

Após o resumo final, classificar TODAS as verificações que não puderam ser concluídas durante a auditoria.

### Classificação obrigatória

Cada item pendente deve ser classificado em uma das categorias:

**LOCAL (executável agora)** — verificações que podem ser executadas no ambiente atual, sem infra externa:

Subcategorias:
- **Baixo risco (read-only / não destrutivo):** pode sugerir execução direta. Exemplos: `npm audit`, `npm test`, `npm run build`, `npx tsc --noEmit`, `pip audit`, linters (`eslint`, `ruff`), checagem de tipos.
- **Mutável (altera ambiente):** requer aviso explícito destacado antes de sugerir execução. Exemplos: `npm install`, `pip install`, `npm audit fix`, qualquer comando que crie/altere/delete arquivos ou dependências.

**EXTERNO (requer ação fora do projeto)** — verificações que dependem de infraestrutura, serviços ou ambientes não disponíveis localmente:
Exemplos: cluster Kubernetes real, proxy reverso com TLS, pentest dinâmico com app rodando, auditoria de infra cloud, frontend em outro repositório.

### Formato de apresentação

```
## Itens Pendentes de Verificação

### Executáveis localmente

#### Baixo risco (read-only)
| # | Verificação pendente | Motivo da pendência | Comando sugerido |
|---|---------------------|--------------------|-----------------:|

#### Mutáveis (alteram ambiente) ⚠️
| # | Verificação pendente | Motivo da pendência | Comando sugerido | O que será alterado |
|---|---------------------|--------------------|-----------------:|--------------------:|

> Deseja que eu execute as verificações locais agora?
> - Itens de baixo risco serão executados diretamente.
> - Itens mutáveis serão executados apenas com sua confirmação explícita para cada um.

### Requerem ação externa

| # | Verificação pendente | O que é necessário | Como fazer (passo a passo) |
|---|---------------------|-------------------|---------------------------|
```

### Fluxo após confirmação do usuário

Se o usuário confirmar execução das verificações pendentes:

1. Executar APENAS as verificações locais sugeridas (baixo risco direto; mutáveis com confirmação individual)
2. NÃO executar verificações externas — apenas manter as instruções
3. Gerar relatório complementar APENAS das verificações executadas agora, no formato:

```
## Resultado Complementar — Verificações Pendentes Executadas

| # | Verificação | Comando executado | Status | Evidência (output) | Conclusão |
|---|------------|------------------|--------|-------------------|-----------|
```

4. Atualizar o nível de confiança geral se as novas verificações alterarem o panorama
5. Se alguma verificação local falhar ou revelar novos problemas, reportar no mesmo formato de achados do relatório principal
