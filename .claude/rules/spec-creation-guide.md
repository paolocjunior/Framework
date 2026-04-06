# Guia de Criacao de Especificacao

## Proposito

Orientar o Claude Code durante o processo de criacao de especificacoes via `/spec-create`. Define a abordagem de questionamento, anti-padroes, e criterios de qualidade para specs em construcao.

---

## Filosofia de Questionamento

A criacao de spec e uma **extracao colaborativa de visao**, nao um interrogatorio burocrtico.

### Principios

1. **Comecar aberto, depois afunilar.** Primeira pergunta: "O que voce quer construir?" — nao um formulario de 50 campos
2. **Seguir a energia do usuario.** Se ele esta animado com a UI, explorar UI. Se fala de regras de negocio, aprofundar regras. A ordem dos topicos segue o que o usuario traz, nao um roteiro fixo
3. **Desafiar vagueza com opcoes concretas.** "Quando voce diz 'gerenciar tarefas', quer dizer (A) lista simples com checkbox, (B) kanban com colunas, ou (C) algo mais complexo com dependencias?"
4. **Tornar o abstrato concreto.** "Me da um exemplo real de como um usuario usaria isso no dia a dia"
5. **Nunca assumir — sempre confirmar.** Se algo parece obvio, perguntar: "Estou assumindo que X. Isso esta correto?"
6. **Mostrar consequencias, nao so opcoes.** "Se escolhermos A, significa que Y nao sera possivel. Se escolhermos B, ganhamos Y mas com custo Z"

### O que capturar (obrigatorio)

| Dimensao | Pergunta-chave | Por que importa |
|----------|---------------|-----------------|
| O que | "O que este produto faz?" | Define escopo |
| Por que | "Que problema resolve? Por que agora?" | Define prioridade e valor central |
| Para quem | "Quem vai usar? Quais perfis diferentes?" | Define personas e permissoes |
| Como parece sucesso | "Como voce sabe que o produto deu certo?" | Define criterios de aceite |
| O que NAO e | "O que parece parte do produto mas nao e?" | Define limites de escopo |
| Como testa | "Como validar sem usuarios reais?" | Define modo de teste |

### O que capturar (quando relevante)

- Integracao com sistemas externos
- Requisitos de seguranca e privacidade
- Restricoes de stack ou infraestrutura
- Requisitos de performance ou escala
- Fluxos monetarios (se houver)
- Offline/sync (se aplicavel)

---

## Anti-padroes de Questionamento

### NAO fazer

| Anti-padrao | Por que e ruim | Fazer em vez disso |
|------------|----------------|-------------------|
| Caminhar por checklist | Usuario se desliga, respostas ficam superficiais | Conversar naturalmente, usar checklist internamente |
| Perguntas genericas ("Conte mais") | Nao direciona, usuario nao sabe o que voce precisa | Perguntas especificas com opcoes: "A, B ou C?" |
| Assumir complexidade | Adiciona escopo que o usuario nao pediu | Perguntar se precisa antes de adicionar |
| Linguagem corporativa | Afasta usuario nao-tecnico | Linguagem simples e direta |
| Perguntar tudo de uma vez | Sobrecarrega, respostas ficam superficiais | 2-4 perguntas por rodada, aprofundar iterativamente |
| Pular para solucao tecnica | Fecha opcoes antes de entender o problema | Entender o problema primeiro, tecnologia depois |
| Aceitar "sim" generico | "Sim" nao prova que o usuario entendeu as consequencias | Reformular com consequencia: "Entao X significa que Y, certo?" |

---

## Processo de 3 Camadas de Escopo

Inspirado no GSD: todo requisito capturado deve ser classificado em uma de 3 camadas:

### v1 — Implementar agora
- Requisitos essenciais para o produto funcionar
- Criterio: "Sem isso, o produto nao tem valor"
- Cada requisito tem ID unico: `CATEGORIA-NUMERO` (ex: AUTH-01, DASH-03)
- Cada requisito tem criterio de aceite como **comportamento observavel do usuario**

### v2 — Implementar depois
- Requisitos validos mas nao essenciais para a primeira versao
- Criterio: "O produto funciona sem isso, mas fica melhor com isso"
- Justificativa do adiamento explicitada

### Fora do escopo
- Coisas que parecem parte do produto mas NAO serao feitas
- Criterio: "Alguem pode esperar isso, entao vamos dizer explicitamente que nao"
- Justificativa da exclusao explicitada

### Regra de ouro
Quando o usuario menciona algo novo durante o questionamento:
1. Capturar imediatamente
2. Classificar com o usuario: "Isso e v1, v2 ou fora do escopo?"
3. Se v1, definir criterio de aceite
4. Nunca descartar silenciosamente — tudo vai para uma das 3 camadas

---

## Criterios de Aceite como Comportamentos

### Formato correto
"Usuario consegue [acao] e ve [resultado]"

Exemplos:
- "Usuario consegue criar conta com email e senha e e redirecionado para o dashboard"
- "Admin consegue bloquear usuario e o usuario bloqueado nao consegue fazer login"
- "Sistema calcula total do pedido com desconto e mostra valor final antes de confirmar"

### Formato errado
- "Sistema funciona corretamente" (vago, nao verificavel)
- "Boa performance" (sem metrica)
- "Interface bonita" (subjetivo)
- "Seguro" (nao e criterio, e requisito nao-funcional)

---

## IDs de Requisitos

### Formato
`[CATEGORIA]-[NUMERO]` onde:
- CATEGORIA: sigla de 2-5 letras derivada do dominio (nao pre-definida)
- NUMERO: sequencial dentro da categoria, com zero padding de 2 digitos

### Exemplos por dominio
- App de tarefas: `TASK-01`, `PROJ-01`, `NOTIF-01`
- E-commerce: `AUTH-01`, `CART-01`, `PAY-01`, `SHIP-01`
- SaaS: `DASH-01`, `TEAM-01`, `BILL-01`, `API-01`
- Jogo: `CHAR-01`, `COMBAT-01`, `INVENTORY-01`, `SAVE-01`

### Regra
Categorias sao derivadas do produto, nao de uma lista fixa. Se o produto tem um dominio de "receitas", a categoria e `RECIPE`, nao `FEAT` generico.

---

## Eliminacao de Gray Areas

Antes de finalizar a spec, identificar e resolver ambiguidades:

### O que procurar
1. **Ownership indefinido:** "Quem decide X? O usuario ou o sistema?"
2. **Comportamento de borda:** "O que acontece quando Y chega a zero?"
3. **Conflito entre regras:** "Se A e B acontecem ao mesmo tempo, qual tem prioridade?"
4. **Transicoes indefinidas:** "O que acontece entre o estado X e o estado Y?"
5. **Permissoes implicitas:** "Quem pode ver/editar/deletar isso?"

### Como resolver
Para cada gray area, apresentar ao usuario:
- O problema encontrado
- 2-3 opcoes concretas com consequencias
- Recomendacao (se houver)
- Decisao do usuario registrada com ID (D-01, D-02, etc.)

---

## Decisoes Tecnicas no Spec-Create

A spec deve cobrir decisoes tecnicas o suficiente para que o /plan seja **execucao pura** — sem perguntas.

### O que definir na spec
- Stack quando o usuario tem preferencia
- Restricoes de plataforma (mobile, web, desktop)
- Integracao com servicos existentes
- Requisitos de deploy/hosting
- Estrategia de fases (quais requisitos em cada fase, criterio de conclusao)
- Estrategia de testes (tipos, cobertura obrigatoria, ferramentas)

### O que NAO definir na spec
- Arquitetura interna (e do /plan)
- Estrutura de pastas (e do /plan)
- Bibliotecas especificas (e do /plan ou pesquisa)
- Patterns de implementacao (e do /plan)

### Regra
A spec define **O QUE** o produto faz e **COM QUE** sera construido. O plano define **COMO** sera construido. Se o /plan precisa perguntar algo ao usuario, a spec esta incompleta.

---

## Validacao em Construcao (Lightweight)

Durante a criacao da spec, verificar continuamente (sem reportar ao usuario a cada passo):

- [ ] Todo requisito v1 tem criterio de aceite verificavel?
- [ ] Toda tela tem pelo menos: conteudo, acoes e destinos definidos?
- [ ] Todo fluxo critico tem caminho feliz E pelo menos um caminho de erro?
- [ ] Toda entidade tem campos com tipos definidos?
- [ ] Toda regra de negocio tem condicao + acao + resultado?
- [ ] Nenhum requisito depende apenas de UI para integridade?
- [ ] Limitacoes do MVP estao explicitas?

Se algo falhar nesta checagem, resolver durante a criacao — nao deixar para o `/spec-check`.

---

## Handoff para /spec-check

A spec gerada pelo `/spec-create` DEVE ser submetida ao `/spec-check` como gate formal. O `/spec-create` gera o rascunho; o `/spec-check` valida a prontidao.

Nenhuma spec e considerada pronta apenas por ter sido gerada pelo `/spec-create` — a validacao formal e obrigatoria.
