# Implementation Quality — Padrões de Erro Recorrentes

## Propósito

Catalogar padrões de erro recorrentes em planos de implementação para que sejam evitados na criação do plano, não encontrados depois na revisão. Estes padrões são genéricos e aplicam-se a qualquer projeto com especificação + plano + implementação.

O Claude Code deve consultar esta rule ao criar planos de implementação via `/plan` ou via o agent `planner`.

---

## Categoria 1 — Types e Contratos

### Padrão 1: Type diverge da spec

O type do frontend usa nomes, estados ou enums diferentes dos definidos na especificação aprovada.

- **O que acontece:** backend implementa um contrato, frontend implementa outro. TypeScript compila mas os dados não conversam.
- **Como evitar:** antes de definir types no plano, abrir a spec/micro do módulo e copiar exatamente os nomes dos campos, estados e enums. Se a spec diz 6 estados, o type tem 6 estados. Se a spec diz `wallet`, o type diz `wallet` — não `investment`.

### Padrão 2: Campo obrigatório que não se aplica a todas as variantes

Campo marcado como obrigatório no type mas que só faz sentido para algumas variantes do mesmo modelo.

- **O que acontece:** variantes que não usam o campo são forçadas a inventar valores artificiais. A UI renderiza dados falsos ou crasheia com null.
- **Como evitar:** para cada campo do type, perguntar: "Este campo se aplica a TODOS os valores possíveis do type/enum de variante?" Se não, marcar como opcional (?).

### Padrão 3: Snapshot ausente quando UI precisa de histórico

Model sem campos de cache/snapshot quando a UI precisa mostrar valores que existiam no momento do registro, não o valor atual da fonte.

- **O que acontece:** dados históricos mudam retroativamente quando a fonte é editada. Relatórios e históricos ficam inconsistentes.
- **Como evitar:** se a UI mostra dados históricos que podem mudar na fonte original (ex.: valor nutricional de alimento editado depois), o model precisa de campos de snapshot preservados no momento do registro.

### Padrão 4: Enum incompleto

Estado definido na spec mas ausente no type do frontend.

- **O que acontece:** backend envia estado que o frontend não reconhece. TypeScript dá erro de tipo em runtime. Badge/componente não sabe renderizar o estado.
- **Como evitar:** antes de finalizar types, listar todos os estados/enums da spec e verificar cobertura 1:1. Contar: spec tem N estados → type tem N estados.

---

## Categoria 2 — Fluxos de UI

### Padrão 5: Dual mode declarado sem fluxo de edição

Componente descrito como "create/edit" ou "dual mode" mas apenas o gatilho de criação está definido no plano. O botão Editar existe numa tela mas não aponta para nada.

- **O que acontece:** desenvolvedor implementa a criação e improvisa a edição (ou deixa botão sem ação). Fluxo inconsistente.
- **Como evitar:** se um componente é dual mode, o plano deve definir explicitamente: (1) qual tela tem o botão Editar, (2) que props o componente recebe em modo edição, (3) como os campos são pré-preenchidos. Se não houver fluxo de edição definido, não declarar como dual mode.

### Padrão 6: Toggle sem comportamento visual definido

Alternância existe na UI (ex.: lista/kanban, dia/semana/mês) mas o que aparece quando o modo alternativo é ativado não está descrito no plano.

- **O que acontece:** toggle existe visualmente mas não faz nada, ou o desenvolvedor improvisa um layout não planejado.
- **Como evitar:** para cada toggle no plano, definir explicitamente o que aparece em cada estado. Se um modo não será implementado na fase atual, remover o toggle ou declarar como "visual placeholder sem conteúdo".

### Padrão 7: Tela referenciando módulos não implementados

Tela mostra dados de módulos que não existem na fase atual sem regra sobre o que acontece na interação.

- **O que acontece:** tap em card leva a tela vazia, navegação quebrada, ou desenvolvedor cria telas fora do escopo.
- **Como evitar:** quando a UI mostra resumos de módulos não implementados na fase, adicionar regra explícita: "dados mockados, tap navega para placeholder, sem conteúdo real nesta fase".

### Padrão 8: Renderização única para variantes diferentes

Mesmo componente renderiza de forma idêntica para todas as variantes do model quando pelo menos uma deveria ter visual diferente.

- **O que acontece:** variante que deveria ter visual próprio (ex.: meta binária mostrando badge em vez de barra de progresso) é renderizada com o visual padrão, criando UX confusa.
- **Como evitar:** para cada componente que renderiza dados tipados com variantes (measureType, habitType, transactionType, etc.), definir explicitamente se há renderização condicional e qual visual cada variante usa.

### Padrão 9: Checklist promete fluxo não definido no corpo do plano

A seção de verificação/checklist do plano menciona funcionalidade ou fluxo que não está modelado no corpo do plano.

- **O que acontece:** desenvolvedor lê o checklist, tenta implementar o que está prometido, e não encontra definição. Improvisa ou ignora.
- **Como evitar:** nada pode aparecer na seção de verificação se não estiver explicitamente definido no corpo do plano. Cada item do checklist deve ter correspondência direta com uma tela, componente, type ou fluxo descrito anteriormente.

---

## Categoria 3 — Navegação

### Padrão 10: Rotas de stack conflitando com estado local

Rota registrada no stack de navegação para algo que deveria ser controlado por estado interno da tela (tabs internas, modos de visualização).

- **O que acontece:** duas formas de chegar ao mesmo conteúdo (rota + estado), comportamento imprevisível, navegação duplicada.
- **Como evitar:** se a decisão foi tabs internas ou estado local para alternar entre views, não criar rota no stack para o mesmo fluxo. Deep links futuros podem usar params da rota principal, não rotas separadas.

### Padrão 11: BottomSheet vs Screen ambíguo

Componente de criação listado como tela do stack E como BottomSheet overlay ao mesmo tempo. O plano descreve como "Screen" na contagem de telas e como "BottomSheet" na descrição.

- **O que acontece:** desenvolvedor não sabe se registra na stack ou renderiza inline. Pode criar os dois, duplicando fluxo.
- **Como evitar:** definir uma única abordagem por componente de criação e ser consistente no projeto inteiro. Manter padrão: se o projeto usa BottomSheet para criação, todos os formulários de criação são BottomSheet (não screen). Contagem de telas não deve incluir BottomSheets.

---

## Categoria 4 — Dados Mock

### Padrão 12: Mocks sem types definidos antes

Dados mockados como objetos soltos sem interface TypeScript definida previamente. Telas consomem o shape do mock diretamente.

- **O que acontece:** telas se acoplam a shapes improvisados. Quando o backend conecta com dados reais, types divergem e gera refactor em todas as telas.
- **Como evitar:** criar types antes dos mocks. Mocks importam e implementam os types. Telas consomem types, não shapes dos mocks. Ordem obrigatória: types → mocks → telas.

### Padrão 13: Mocks sem cobertura de variantes

Estados existem no type mas nenhum item do mock os exercita. Badge ou componente condicional nunca é testado visualmente.

- **O que acontece:** componente parece funcionar no dev mas quebra em produção quando o estado raro aparece pela primeira vez.
- **Como evitar:** para cada estado/enum no type, incluir pelo menos 1 item no mock que o exercite. Se o type tem 6 status, os mocks devem cobrir os 6.

---

## Como usar esta rule

Ao criar um plano de implementação:

1. Revisar cada type definido contra os padrões 1-4
2. Revisar cada tela e componente contra os padrões 5-9
3. Revisar a navegação contra os padrões 10-11
4. Revisar os mocks contra os padrões 12-13
5. Executar o procedimento de `.claude/rules/plan-construction.md` para verificação final
