---
description: Verificação pós-implementação — confirma se o código entregue corresponde ao que a especificação prometeu
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(wc:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(python:*), Bash(pip:*)
context: fork
---

## Carregar contexto (obrigatório antes de qualquer outra ação)

Aplicar o protocolo de `.claude/rules/context-loading.md` antes de iniciar a verificação pós-implementação:

1. Ler `memory/project_spec-status.md` (snapshot) — se ausente, ler `runtime/execution-ledger.md`
2. Verificar fase atual, Open Items e bloqueios — a verificação precisa saber quais requisitos estão no escopo da entrega atual vs DEFERRED
3. Declarar no início do output: `Contexto carregado: [fase atual], [open items: N], [bloqueios: N]`
4. Se snapshot e ledger divergirem, aplicar `state-sync.md` antes de prosseguir
5. **Requisitos marcados como `DEFERRED` no ledger não devem ser reportados como falhas de conformidade** — devem aparecer separadamente como "fora do escopo da entrega atual, rastreados como DEFERRED"

---

Verificar se o código implementado entrega o que a especificação original prometeu.

Este comando NÃO avalia qualidade de código (use `/review` para isso) nem prontidão para deploy (use `/ship-check`). Ele avalia exclusivamente: **o que foi pedido está funcionando?**

---

## Passo 1 — Localizar a especificação

Buscar o documento de referência do projeto. Pode ser:
- Arquivo de spec/briefing (.md) na raiz ou em .planning/
- REQUIREMENTS.md, PROJECT.md, spec.md, briefing.md
- Documento indicado pelo usuário

Se não encontrar especificação, perguntar ao usuário qual documento usar como referência.

## Passo 2 — Extrair entregas testáveis e gerar cenários de teste

### 2.1 — Extrair entregas

Ler a especificação e extrair uma lista de entregas concretas e verificáveis. Cada entrega deve ser uma ação que o usuário deveria conseguir fazer.

Formato:
```
| # | Entrega esperada | Fonte na spec |
|---|-----------------|---------------|
| 1 | Usuário consegue criar conta com email e senha | Requisito funcional 1 |
| 2 | Login retorna token JWT válido | Requisito funcional 2 |
| 3 | Produto sem estoque mostra "indisponível" | Regra de negócio 5 |
```

### 2.2 — Gerar cenários de teste por entrega

Para cada entrega extraída, gerar de 2 a 5 cenários de teste concretos. Os cenários devem cobrir:

- **Caminho feliz**: o fluxo principal funciona como esperado
- **Entrada inválida**: o que acontece com dados incorretos, vazios ou malformados
- **Limites**: valores no limite do aceitável (máximo, mínimo, zero)
- **Casos de borda**: situações atípicas mas plausíveis (duplicata, concorrência, estado inesperado)

A quantidade de cenários deve ser proporcional à complexidade da entrega:
- Entrega simples (exibir texto, redirecionar): 2 cenários
- Entrega com validação ou lógica condicional: 3-4 cenários
- Entrega com regra de negócio complexa ou fluxo financeiro: 4-5 cenários

Formato:
```
### Entrega 1: Usuário consegue criar conta com email e senha

| ID | Cenário | Tipo | Resultado esperado |
|----|---------|------|--------------------|
| 1.1 | Criar conta com email válido e senha forte | Caminho feliz | Conta criada, redirecionado para dashboard |
| 1.2 | Criar conta com email já existente | Caso de borda | Erro informativo, sem duplicação no banco |
| 1.3 | Criar conta com senha menor que o mínimo | Entrada inválida | Validação rejeita, mensagem clara ao usuário |
| 1.4 | Criar conta com email malformado | Entrada inválida | Validação rejeita antes de chegar ao banco |

### Entrega 2: Login retorna token JWT válido

| ID | Cenário | Tipo | Resultado esperado |
|----|---------|------|--------------------|
| 2.1 | Login com credenciais corretas | Caminho feliz | Token JWT retornado com expiração definida |
| 2.2 | Login com senha incorreta | Entrada inválida | Erro genérico, sem revelar se email existe |
| 2.3 | Login com conta desativada | Caso de borda | Acesso negado com mensagem apropriada |
```

### 2.3 — Aprovação do usuário

Apresentar as entregas com seus cenários ao usuário e perguntar: "Essas são as entregas e cenários que vou verificar. Quer adicionar, remover ou ajustar algum?"

## Passo 3 — Verificar cada cenário contra o código

Para cada cenário de cada entrega, verificar no código se existe implementação que o suporte.

### 3.1 — Verificação por cenário

Para cada cenário, reportar:

| ID | Cenário | Status | Evidência | Lacuna |
|----|---------|--------|-----------|--------|
| 1.1 | Criar conta com email válido e senha forte | COBERTO | `src/auth/register.ts:45` — handler cria usuário e retorna 201 | — |
| 1.2 | Criar conta com email já existente | COBERTO | `src/auth/register.ts:52` — catch de unique constraint retorna 409 | — |
| 1.3 | Criar conta com senha menor que o mínimo | NÃO COBERTO | — | Sem validação de tamanho mínimo de senha no handler ou middleware |
| 1.4 | Criar conta com email malformado | PARCIAL | `src/auth/register.ts:40` — regex básica de email | Regex não cobre todos os formatos inválidos |

Definição de status por cenário:
- **COBERTO** — código trata explicitamente este cenário, evidência concreta encontrada
- **PARCIAL** — cenário parcialmente tratado, mas com lacuna identificada
- **NÃO COBERTO** — não encontrou código que trate este cenário
- **NÃO VERIFICÁVEL** — cenário depende de execução/ambiente que não pode ser testado por análise estática

### 3.2 — Resumo por entrega

Após verificar todos os cenários de uma entrega, consolidar o status da entrega:

| # | Entrega | Status | Cenários cobertos | Cenários total |
|---|---------|--------|-------------------|----------------|
| 1 | Criar conta com email e senha | PARCIAL | 2/4 | 4 |
| 2 | Login retorna token JWT | IMPLEMENTADO | 3/3 | 3 |

Regras de consolidação:
- **IMPLEMENTADO** — todos os cenários COBERTOS
- **PARCIAL** — pelo menos 1 cenário COBERTO e pelo menos 1 NÃO COBERTO ou PARCIAL
- **NÃO IMPLEMENTADO** — nenhum cenário COBERTO (caminho feliz ausente)
- **NÃO VERIFICÁVEL** — todos os cenários são NÃO VERIFICÁVEIS

## Passo 4 — Verificações dinâmicas via sensores mecânicos

Verificações dinâmicas devem vir preferencialmente da camada de sensores (`.claude/rules/sensors.md`), não de execução ad-hoc de comandos pelo agente. A camada de sensores produz `sensors-last-run.json` com exit codes verificáveis, eliminando o risco de o agente narrar "teste passou" quando na verdade falhou.

### 4.1 — Consumir `sensors-last-run.json`

Ler `.claude/runtime/sensors-last-run.json`:

- **Presente e fresco** (dentro das regras de staleness de `sensors.md`) → usar como fonte de evidência mecânica
- **Stale** (código-fonte modificado após `finished_at`, ou `sensors.json` alterado) → invocar `/sensors-run` para atualizar antes de prosseguir
- **Ausente** e `sensors.json` existe → invocar `/sensors-run` para gerar baseline
- **Ausente** e `sensors.json` também ausente → registrar lacuna: "Projeto sem sensores declarados, verificação dinâmica impossível. Cenários NÃO VERIFICÁVEIS permanecem como estão. Recomendação: declarar sensores em `.claude/runtime/sensors.json`"

### 4.2 — Mapear sensores para cenários

Para cada cenário marcado `NÃO VERIFICÁVEL` no Passo 3:

- Se há sensor do tipo `test` que cobre o fluxo do cenário e o sensor passou (`status: pass`) → promover cenário para `COBERTO` com evidência `sensors-last-run.json:<sensor_id>`
- Se o sensor de testes **falhou** (`status: fail`) → cenário permanece `NÃO COBERTO` ou rebaixa para `FALHA ATIVA`, com o output_tail do sensor como evidência
- Se há sensor de `type-check` que passou → evidência de que assinaturas e contratos estão consistentes (não prova comportamento, mas reduz risco de regressão)
- Se há sensor de `build` que passou → evidência de que o código compila; cenários que dependem exclusivamente de compilação podem ser promovidos

### 4.3 — Regra crítica: sensores são autoritativos sobre comportamento mecânico

Se `/verify-spec` concluir "entrega X está IMPLEMENTADA" mas o sensor de teste que cobre X está em `status: fail`, o veredicto final **DEVE** ser rebaixado. O sensor é autoridade sobre comportamento mecânico observável — se o teste falha, o comportamento não está conforme a spec, independente de o código "parecer coberto" por análise estática.

Esse é o ponto central da camada de sensores: o agente não pode contradizer o ambiente.

## Passo 5 — Resumo

Ao final, gerar:

### Aderência à Especificação — Entregas
- Total de entregas: X
- Implementadas: X (Y%)
- Parciais: X
- Não implementadas: X
- Não verificáveis: X

### Cobertura de Cenários
- Total de cenários gerados: X
- Cobertos: X (Y%)
- Parciais: X
- Não cobertos: X
- Não verificáveis: X

### Cenários não cobertos (por prioridade)

Lista dos cenários NÃO COBERTOS agrupados por tipo:

**Entrada inválida sem tratamento:**
- (lista de cenários de validação ausente)

**Casos de borda sem tratamento:**
- (lista de cenários de borda não cobertos)

**Limites sem verificação:**
- (lista de cenários de limite não verificados)

### Entregas que divergem da spec
Lista das entregas PARCIAIS e NÃO IMPLEMENTADAS com o que falta.

### Entregas implementadas mas não especificadas
Se encontrar funcionalidades no código que não estão na spec, listar como "Escopo extra não especificado" — podem ser boas adições ou scope creep.

### Veredicto
- **CONFORME** — todas as entregas da spec estão implementadas e todos os cenários estão cobertos
- **CONFORME COM LACUNAS** — entregas implementadas, mas cenários de validação, borda ou limite não cobertos (listar os cenários)
- **NÃO CONFORME** — entregas críticas da spec não foram implementadas

### Próximos passos
- Lista priorizada do que falta implementar (se houver)
- Cenários não cobertos que representam risco de segurança ou integridade
- Entregas que precisam de teste manual do usuário

---

NÃO fazer correções automaticamente. Apenas reportar e aguardar aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada verificação.
