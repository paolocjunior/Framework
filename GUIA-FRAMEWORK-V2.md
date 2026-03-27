# Guia Pratico — Framework de Qualidade V2

## Como Usar Este Guia

Este documento e o passo a passo completo para usar o framework em qualquer projeto. Cada secao explica o que fazer, quando fazer, que comando rodar e o que escrever no prompt.

---

## PASSO 0 — Instalar o Framework no Projeto

### O que fazer

Copiar os arquivos do framework template para a pasta do projeto.

### Como fazer

```
1. Abrir o terminal
2. Navegar ate a pasta do projeto
3. Copiar .claude/ e CLAUDE.md do framework para la
```

```bash
cp -r C:/Github/Framework/.claude/ ./
cp C:/Github/Framework/CLAUDE.md ./
```

### O que foi copiado

```
MeuProjeto/
  .claude/
    settings.json          <- configuracao dos hooks
    hooks/                 <- 10 scripts de validacao automatica
    commands/              <- 14 slash commands
    agents/                <- 5 subagents especializados
    rules/                 <- 17 checklists de qualidade
    runtime/               <- ledger, pattern registry, session summaries
  CLAUDE.md                <- configuracao principal do framework
  src/                     <- seu codigo (ja existia)
```

### Escolher o perfil de hooks

Antes de abrir o Claude Code, definir qual nivel de rigor o projeto precisa:

| Perfil | Para que tipo de projeto | Comando |
|---|---|---|
| `minimal` | Scripts, automacoes, CLIs, projetos sem UI | `export CLAUDE_HOOK_PROFILE=minimal` |
| `standard` | Backend, APIs, bibliotecas (DEFAULT — nao precisa setar) | Nao precisa fazer nada |
| `strict` | Apps com UI, mobile, jogos, design system | `export CLAUDE_HOOK_PROFILE=strict` |

O `security-check.sh` roda SEMPRE, em qualquer perfil. Nao da pra desligar.

---

## PASSO 1 — Especificacao

### Quando

Antes de planejar ou codar qualquer coisa. E o primeiro passo de todo projeto.

### O que fazer

Escrever a especificacao do que sera construido. Pode ser:
- Um documento de texto (Micro-spec, PRD, briefing)
- Uma descricao detalhada no chat
- Um arquivo .md no projeto

### Como rodar o gate

Abrir o Claude Code na pasta do projeto e digitar:

```
/spec-check
```

### O que escrever no prompt (exemplos)

**Se a spec e um arquivo:**
```
/spec-check

Analise a especificacao em docs/spec-modulo-auth.md
```

**Se a spec e uma descricao no chat:**
```
/spec-check

Quero construir um sistema de autenticacao com:
- Login por email/senha
- Recuperacao de senha por email
- JWT com refresh token
- Rate limiting em login (5 tentativas por minuto)
- Roles: admin, user, viewer
```

### O que esperar

O /spec-check analisa em 7 categorias e da um veredicto:

| Veredicto | Significado | O que fazer |
|---|---|---|
| READY | Spec completa, pode planejar | Ir para o Passo 2 |
| READY WITH ASSUMPTIONS | Pode planejar com premissas registradas | Revisar premissas, aceitar ou corrigir, depois Passo 2 |
| BLOCKED | Lacunas que impedem comecar | Corrigir a spec e rodar /spec-check de novo |

### Regra

Nunca pular o /spec-check achando que "a spec e simples demais". Se for simples demais para um spec-check, provavelmente e simples demais para um /plan tambem — pode codar direto.

---

## PASSO 2 — Planejamento Visual (APENAS para projetos com UI)

### Quando

Depois do /spec-check dar READY. APENAS se o projeto tem interface visual (app, site, dashboard, jogo com HUD).

Se o projeto e backend puro, API, CLI ou script — **pular para o Passo 4**.

### 2a — Estrutura de Telas (/ui-plan)

```
/ui-plan
```

**O que escrever no prompt:**
```
/ui-plan

Planejar a estrutura de telas para o modulo de autenticacao conforme spec aprovada.
```

**O que esperar:** mapa de navegacao, estrutura de cada tela, componentes compartilhados, proposta de Fase A (UI Shell) e Fase B (logica).

**Veredicto:**
| Veredicto | O que fazer |
|---|---|
| READY FOR UI SHELL | Ir para 2b (design-preview) |
| BLOCKED | Resolver ambiguidade de fluxo e rodar de novo |

### 2b — Design System (/design-preview)

```
/design-preview
```

**O que escrever no prompt:**
```
/design-preview

Gerar 2-3 opcoes de Design System para o projeto.
Tipo de app: dashboard web corporativo.
Tom desejado: profissional, limpo, sem exageros.
```

**O que esperar:** 2-3 opcoes visuais com preview real no browser. Paleta de cores, tipografia, estilo de componentes.

**O que fazer:** Escolher uma opcao (A, B ou C). Responder:
```
Vou com a opcao B. Aprovar e aplicar como Design System do projeto.
```

### 2c — Construir a UI Shell

Depois de aprovar o Design System, pedir a construcao da Fase A:

```
Construir a UI Shell (Fase A) do modulo de autenticacao:
- Todas as telas com layout aprovado
- Navegacao funcionando
- Design System da opcao B aplicado
- Dados mockados para simular conteudo
- Estados visuais: vazio, loading, erro, com dados
```

**Revisar:** Abrir no browser, navegar por todas as telas, testar fluxos. Se precisar ajustar, pedir ajustes na UI Shell. Aprovar antes de continuar.

---

## PASSO 3 — Planejamento Tecnico

### Quando

- Projetos sem UI: depois do /spec-check (Passo 1)
- Projetos com UI: depois da UI Shell aprovada (Passo 2c)

### Como rodar

```
/plan
```

### O que escrever no prompt (exemplos por cenario)

**Backend/API:**
```
/plan

Implementar o modulo de autenticacao conforme spec aprovada:
- Endpoints de login, registro, logout, refresh, forgot-password
- Tabelas: users, sessions, password_resets
- Middleware de auth com JWT
- Rate limiting
- Testes
```

**Functional Completion (Fase B de projeto com UI):**
```
/plan

Implementar a Fase B (Functional Completion) do modulo de autenticacao:
- Conectar formularios da UI Shell ao backend
- Validacoes reais nos campos
- Estado persistente (banco conectado)
- Regras de negocio funcionando
- Testes
```

**Bugfix ou refatoracao:**
```
/plan

Corrigir vulnerabilidade de SQL injection encontrada pelo /audit em:
- src/routes/users.js:34 (query concatenada)
- src/routes/products.js:78 (query concatenada)
Converter para prepared statements.
```

### O que esperar

O plano inclui: objetivo, contexto, abordagem passo a passo, arquivos afetados, justificativa, riscos, criterios de verificacao.

**O que fazer:** Ler o plano. Se concordar:
```
Plano aprovado. Pode implementar.
```

Se quiser ajustar:
```
Ajustar o plano: trocar bcrypt por argon2 para hash de senhas. Reapresentar.
```

---

## PASSO 4 — Verificar o Plano (NOVO no V2)

### Quando

Depois do /plan gerar o plano e ANTES de aprovar a implementacao.

### Como rodar

```
/plan-review
```

### O que escrever no prompt

```
/plan-review

Revisar o plano de implementacao do modulo de autenticacao gerado acima.
Spec de referencia: docs/spec-auth.md
```

**Se nao tem spec formal:**
```
/plan-review

Revisar o plano de refatoracao acima. Nao existe spec formal para este modulo.
```

### O que esperar

O command lanca 2 agents em paralelo:
- **spec-plan-validator** — cruza plano com spec + qualidade tecnica
- **consistency-checker** — coerencia interna do plano

Resultado: relatorio consolidado com achados classificados e veredito.

| Veredicto | Significado | O que fazer |
|---|---|---|
| APPROVED | Plano OK | Aprovar implementacao |
| APPROVED_WITH_CORRECTIONS | OK mas tem ajustes | Aplicar correcoes e aprovar |
| NEEDS_REVISION | Tem problemas bloqueantes | Corrigir plano, rodar /plan-review de novo |
| NEEDS_HUMAN_REVIEW | Conflito que precisa decisao sua | Ler achados e decidir |

**Se tem achados NON-BLOCKING:**
```
Correcoes aplicadas. Plano aprovado. Pode implementar.
```

**Se tem achados BLOCKING:**
```
Corrigir o plano conforme os achados BLOCKING e reapresentar.
```

### REVIEW_MODE

O relatorio mostra REVIEW_MODE: FULL ou TECHNICAL_ONLY.
- **FULL** = spec foi cruzada com o plano (validacao completa)
- **TECHNICAL_ONLY** = sem spec formal, so qualidade tecnica foi verificada

Se TECHNICAL_ONLY e o plano descreve feature nova com schema/API, considerar criar uma spec antes.

---

## PASSO 5 — Implementacao

### Quando

Depois do /plan-review dar APPROVED ou APPROVED_WITH_CORRECTIONS com correcoes aplicadas.

### O que fazer

Aprovar o plano para o Claude Code implementar:

```
Plano aprovado pelo /plan-review. Implementar conforme planejado.
```

### O que acontece automaticamente

Durante a implementacao, os hooks rodam sozinhos a cada arquivo editado:

| Hook | O que faz | Quando alerta |
|---|---|---|
| security-check.sh | Detecta secrets e eval/exec | Senha hardcoded, token no codigo, eval() |
| syntax-check.sh | Verifica sintaxe | Erro de compilacao (Python, JS, TS) |
| quality-check.sh | Detecta TODO/FIXME | Codigo com pendencias |
| design-check.sh | Cores hex hardcoded | Cor fora do theme (so perfil strict) |
| mock-determinism.sh | Math.random em mocks | Mock nao-deterministico (so perfil strict) |
| protect-files.sh | Bloqueia arquivos criticos | Tentativa de editar .env, lockfiles, .git |
| loop-detection.sh | Detecta loop de correcao | Mesmo arquivo editado 5+ vezes |

Voce nao precisa fazer nada — se um hook encontrar problema, ele alerta automaticamente no chat.

---

## PASSO 6 — Revisao de Codigo

### Quando

Depois da implementacao estar concluida (Passo 5).

### Como rodar

```
/review
```

### O que escrever no prompt

```
/review

Revisar o codigo implementado do modulo de autenticacao.
Foco: qualidade, padroes, robustez.
```

### O que esperar

Relatorio com achados em 6 categorias: clareza, estrutura, robustez, performance, compatibilidade, justificativa. Cada achado com localizacao exata (arquivo:linha), evidencia e correcao.

**Veredicto:**
| Veredicto | O que fazer |
|---|---|
| APROVADO | Ir para Passo 7 (seguranca) |
| APROVADO COM RESSALVAS | Corrigir achados e rodar /review de novo |
| REQUER REVISAO | Corrigir tudo e rodar /review de novo |

---

## PASSO 7 — Auditoria de Seguranca

### Quando

Junto com ou depois do /review (Passo 6).

### Qual audit rodar

| Tipo de projeto | Comando |
|---|---|
| Qualquer projeto | `/audit` (auditoria geral) |
| Projeto com banco de dados | `/audit` + `/db-audit` |
| Projeto web/API | `/audit` + `/web-audit` |
| Projeto com Kubernetes | `/audit` + `/k8s-audit` |
| Projeto web com banco | `/audit` + `/web-audit` + `/db-audit` |

### O que escrever no prompt

```
/audit

Auditar seguranca do modulo de autenticacao implementado.
```

```
/web-audit

Auditoria de seguranca web focada em:
- Autenticacao e sessao
- Protecao de dados
- Headers HTTP
- CORS
- Rate limiting
```

### O que esperar

Achados com severidade CRITICO/ALTO/MEDIO/BAIXO, arquivo e linha exata, evidencia e correcao.

**Corrigir achados criticos e altos antes de continuar.** Medios e baixos podem ser tratados depois.

---

## PASSO 8 — Documentar Decisoes

### Quando

Depois das correcoes do /review e /audit estarem aplicadas.

### Como rodar

```
/justify
```

### O que escrever no prompt

```
/justify

Documentar as decisoes tecnicas do modulo de autenticacao:
- Por que bcrypt e nao argon2?
- Por que JWT e nao sessao server-side?
- Por que rate limiting no middleware e nao no reverse proxy?
```

### O que esperar

Para cada decisao: o que foi escolhido, alternativas, justificativa, trade-offs, evidencia.

---

## PASSO 9 — Gate Final

### Quando

Ultimo passo antes de considerar o trabalho entregue.

### Como rodar

```
/ship-check
```

### O que escrever no prompt

```
/ship-check

Verificar se o modulo de autenticacao esta pronto para deploy.
```

### O que esperar

Dois blocos:
- **Bloco A (bloqueante):** build, testes, lint, secrets, dependencias
- **Bloco B (recomendacao):** observabilidade, estado, performance, documentacao

| Veredicto | Significado |
|---|---|
| PRONTO | Pode entregar |
| PRONTO COM RESSALVAS | Pode entregar, mas com riscos anotados |
| NAO PRONTO | Pelo menos 1 bloqueante falhou — corrigir primeiro |

---

## PASSO 10 — Verificar Estado do Projeto

### Quando

A qualquer momento. Util para:
- Retomar trabalho depois de um tempo parado
- Verificar pendencias entre fases
- Entender onde o projeto esta

### Como rodar

```
/status-check
```

### O que escrever no prompt

```
/status-check

Qual o estado atual do projeto? O que falta fazer?
```

---

## RESUMO DO PIPELINE COMPLETO

```
                    QUALQUER PROJETO
                          |
                    PASSO 1: /spec-check
                          |
              +-----------+-----------+
              |                       |
         TEM UI?                 SEM UI?
              |                       |
     PASSO 2a: /ui-plan               |
     PASSO 2b: /design-preview        |
     PASSO 2c: UI Shell               |
              |                       |
              +-----------+-----------+
                          |
                    PASSO 3: /plan
                          |
                    PASSO 4: /plan-review
                          |
                    PASSO 5: implementacao
                          |
                    PASSO 6: /review
                          |
                    PASSO 7: /audit (+ /web-audit, /db-audit, /k8s-audit)
                          |
                    PASSO 8: /justify
                          |
                    PASSO 9: /ship-check
                          |
                        PRONTO
```

---

## CENARIOS PRATICOS

### Cenario 1 — API Backend simples

```
export CLAUDE_HOOK_PROFILE=standard   # ou nao setar (e o default)
/spec-check                          # validar spec
/plan                                # planejar
/plan-review                         # verificar plano
> Aprovar implementacao
/review                              # revisar codigo
/audit + /web-audit + /db-audit      # seguranca
/justify                             # documentar decisoes
/ship-check                          # gate final
```

### Cenario 2 — App com UI (mobile, web, desktop)

```
export CLAUDE_HOOK_PROFILE=strict
/spec-check                          # validar spec
/ui-plan                             # estrutura de telas
/design-preview                      # escolher design system
> Construir UI Shell (Fase A)
> Aprovar UI Shell
/plan                                # planejar Fase B
/plan-review                         # verificar plano
> Implementar Fase B
/review                              # revisar codigo
/audit + /web-audit                  # seguranca
/justify                             # documentar decisoes
/ship-check                          # gate final
```

### Cenario 3 — Script/CLI/automacao

```
export CLAUDE_HOOK_PROFILE=minimal
/spec-check                          # (opcional para scripts simples)
/plan                                # planejar
/plan-review                         # verificar plano (TECHNICAL_ONLY)
> Implementar
/review                              # revisar
/audit                               # seguranca basica
/ship-check                          # gate final
```

### Cenario 4 — Bugfix ou correcao de seguranca

```
/plan                                # planejar a correcao
/plan-review                         # verificar plano (TECHNICAL_ONLY)
> Implementar correcao
/review                              # confirmar que nao quebrou nada
/audit                               # confirmar que vulnerabilidade sumiu
```

### Cenario 5 — Refatoracao grande

```
/plan                                # planejar refatoracao
/plan-review                         # verificar plano
> Implementar
/review                              # qualidade
/ship-check                          # nada quebrou
```

---

## REFERENCIA RAPIDA DE COMANDOS

| Comando | O que faz | Quando usar |
|---|---|---|
| `/spec-check` | Valida spec antes de planejar | Sempre primeiro |
| `/ui-plan` | Planeja telas e navegacao | Projetos com UI |
| `/design-preview` | Gera opcoes de Design System | Projetos com UI |
| `/plan` | Cria plano de implementacao | Antes de codar |
| `/plan-review` | Verifica plano antes de codar | Depois do /plan |
| `/review` | Revisa qualidade do codigo | Depois de codar |
| `/audit` | Auditoria geral de seguranca | Depois de codar |
| `/web-audit` | Seguranca web e API | Projetos web |
| `/db-audit` | Seguranca de banco | Projetos com banco |
| `/k8s-audit` | Seguranca Kubernetes | Projetos com K8s |
| `/justify` | Documenta decisoes tecnicas | Depois de correcoes |
| `/ship-check` | Gate final pre-entrega | Ultimo passo |
| `/status-check` | Estado atual do projeto | Qualquer momento |

---

## O QUE ACONTECE AUTOMATICAMENTE (HOOKS)

Voce nao precisa rodar nada — os hooks funcionam sozinhos:

| Momento | O que acontece |
|---|---|
| Abrir sessao | health-check.sh valida ambiente (jq, estrutura .claude/) |
| Editar arquivo | security-check.sh detecta secrets e eval |
| Editar arquivo | syntax-check.sh verifica sintaxe (standard/strict) |
| Editar arquivo | quality-check.sh detecta TODO/FIXME (standard/strict) |
| Editar arquivo .tsx/.jsx | design-check.sh detecta cores hardcoded (strict) |
| Editar mock | mock-determinism.sh detecta Math.random (strict) |
| Tentar editar .env | protect-files.sh bloqueia a edicao |
| Editar mesmo arquivo 5x | loop-detection.sh alerta loop de correcao |
| Claude terminar resposta | session-summary.sh salva resumo da sessao |
| Sessao encerrar | session-cleanup.sh limpa temporarios |

---

## RUNTIME — ARQUIVOS QUE MUDAM DURANTE O USO

| Arquivo | Quem escreve | O que contem |
|---|---|---|
| `runtime/execution-ledger.md` | Commands (/spec-check, /ship-check, etc.) | Estado oficial do projeto, fases, pendencias |
| `runtime/pattern-registry.md` | Voce via /justify | Decisoes tecnicas aprovadas e reutilizaveis |
| `runtime/session-summaries/latest.md` | Hook session-summary.sh | Resumo da ultima sessao (automatico) |

**Regra:** O execution-ledger so e escrito por commands que geram veredicto. Hooks nunca escrevem no ledger.

---

## DICAS IMPORTANTES

1. **Nunca pular o /spec-check** para projetos nao-triviais. E o gate que evita implementar a coisa errada.

2. **Sempre rodar /plan-review antes de aprovar o plano.** E o gate que evita implementar o plano errado.

3. **Se o /plan-review der NEEDS_REVISION, nao aprovar o plano.** Corrigir e rodar de novo.

4. **Se um hook alertar durante a implementacao, parar e corrigir.** Nao ignorar alertas de security-check.

5. **Se ficar preso num loop de correcoes (mesmo arquivo 5x), parar e diagnosticar a causa raiz.** O loop-detection.sh vai alertar, mas voce precisa parar.

6. **O framework template em C:\Github\Framework nunca deve ser usado como projeto.** Sempre copiar para a pasta do projeto.

7. **Perfil strict so faz sentido para projetos com UI.** Para backend puro, standard e suficiente.

8. **/status-check e seu melhor amigo para retomar trabalho.** Se ficou dias sem mexer no projeto, comece por ele.
