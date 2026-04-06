# [Nome do Projeto] — Especificacao

> Gerado via `/spec-create` | Data: [DATA] | Versao: 1.0

---

## 1. Visao Geral

### O que e
[2-3 frases descrevendo o produto/sistema. Foco no que faz, nao em como faz.]

### Valor central
[A UMA coisa mais importante que este produto entrega. Se tiver que priorizar, este e o criterio.]

### Contexto
[Motivacao, trabalho anterior, pesquisa de usuario, ou problema que originou este projeto.]

---

## 2. Usuarios e Personas

| Persona | Descricao | Objetivo principal |
|---------|-----------|-------------------|
| [Nome] | [Quem e, o que faz] | [O que quer alcançar com o produto] |

---

## 3. Requisitos

### v1 — Implementar agora

Formato: `[CATEGORIA]-[NUMERO]` (ex: AUTH-01, DASH-03)

| ID | Requisito | Criterio de aceite |
|----|-----------|-------------------|
| [CAT]-01 | [Descricao do requisito] | [Como verificar que esta pronto — comportamento observavel] |

### v2 — Implementar depois

| ID | Requisito | Justificativa do adiamento |
|----|-----------|---------------------------|
| [CAT]-01 | [Descricao] | [Por que nao entra na v1] |

### Fora do escopo

| Item | Justificativa |
|------|---------------|
| [O que NAO sera feito] | [Por que esta fora] |

---

## 4. Telas e Fluxos

### 4.1 Mapa de navegacao

[Descrever a arvore de navegacao: quais telas existem, como o usuario navega entre elas.]

### 4.2 Telas

Para cada tela:

#### [Nome da Tela]
- **Acesso:** como o usuario chega aqui
- **Conteudo:** o que aparece (campos, listas, cards, etc.)
- **Acoes:** o que o usuario pode fazer (botoes, gestos, interacoes)
- **Destinos:** para onde cada acao leva
- **Estados:** loading, vazio, erro, sucesso
- **Requisitos cobertos:** [IDs dos requisitos que esta tela atende]

### 4.3 Fluxos criticos

Para cada fluxo que envolve multiplas telas ou decisoes:

#### [Nome do Fluxo]
1. [Passo 1 — acao do usuario]
2. [Passo 2 — resposta do sistema]
3. [Passo N — resultado final]
- **Caminho feliz:** [o que acontece quando tudo da certo]
- **Caminhos de erro:** [o que acontece quando falha — para cada tipo de falha]

---

## 5. Modelo de Dados

### Entidades

Para cada entidade:

#### [Nome da Entidade]
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador unico |
| [campo] | [tipo] | [Sim/Nao] | [descricao] |

### Relacionamentos

| Entidade A | Relacao | Entidade B | Descricao |
|-----------|---------|-----------|-----------|
| [User] | 1:N | [Post] | [Usuario tem muitos posts] |

### Constraints e integridade

- [Regra de integridade 1 — ex: "saldo nunca pode ser negativo"]
- [Regra de integridade 2 — ex: "email deve ser unico por usuario"]

---

## 6. Regras de Negocio

Para cada regra:

### RN-[NUMERO]: [Nome da Regra]
- **Condicao:** quando esta regra se aplica
- **Acao:** o que o sistema faz
- **Resultado:** o que o usuario ve/recebe
- **Manual vs automatico:** [quem dispara — usuario ou sistema]
- **Edge cases:** [situacoes limite conhecidas]

---

## 7. Stack e Decisoes Tecnicas

### Stack definida

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | [ex: React, Next.js, Flutter] | [Por que esta escolha] |
| Backend | [ex: Node.js, Python/FastAPI] | [Por que] |
| Banco de dados | [ex: PostgreSQL, MongoDB] | [Por que] |
| Auth | [ex: Supabase Auth, NextAuth] | [Por que] |
| Deploy | [ex: Vercel, AWS, self-hosted] | [Por que] |

### Integracoes externas

| Servico | Proposito | Conta/credencial necessaria |
|---------|-----------|---------------------------|
| [ex: Stripe] | [Pagamentos] | [Sim — API key necessaria] |

### Estrategia de fases

| Fase | Objetivo | Requisitos cobertos | Criterio de conclusao |
|------|----------|--------------------|-----------------------|
| Fase 1 | [ex: UI Shell com navegacao] | [IDs dos requisitos] | [ex: Todas as telas navegaveis com dados mockados] |
| Fase 2 | [ex: Functional Completion] | [IDs dos requisitos] | [ex: Todos os fluxos funcionando com dados reais] |

### Estrategia de testes

| Tipo | Cobertura | Ferramentas |
|------|-----------|-------------|
| Unit | [ex: Logica de negocio, validacoes] | [ex: Jest, pytest] |
| Integration | [ex: API endpoints, banco] | [ex: Supertest, TestClient] |
| E2E | [ex: Fluxos criticos completos] | [ex: Playwright, manual] |

Fluxos criticos com cobertura obrigatoria:
- [ex: Fluxo de compra completo]
- [ex: Login → dashboard → logout]

---

## 8. Requisitos Nao-Funcionais

### Seguranca
- [Requisitos de autenticacao, autorizacao, dados sensiveis]

### Performance
- [Limites de tempo de resposta, volume esperado, etc.]

---

## 9. Limitacoes e restricoes do MVP

- [O que esta versao NAO faz, mesmo que o usuario espere]
- [Simplificacoes conscientes para entregar rapido]
- [Modo de teste: como validar sem dados reais / sem usuarios reais]

---

## 10. Decisoes tomadas

| ID | Decisao | Justificativa | Alternativa rejeitada |
|----|---------|---------------|----------------------|
| D-01 | [O que foi decidido] | [Por que] | [O que foi considerado e descartado] |

---

## 11. Criterios de aceite globais

- [ ] [Criterio verificavel 1 — ex: "Usuario consegue criar conta e fazer login"]
- [ ] [Criterio verificavel 2 — ex: "Dashboard mostra dados reais do usuario logado"]
- [ ] [Criterio verificavel N]

---

## Proximos passos

Apos aprovacao desta spec:
1. Rodar `/spec-check` para validacao formal
2. Rodar `/plan` para criar plano de implementacao
3. Rodar `/plan-review` para validar o plano antes de codar
