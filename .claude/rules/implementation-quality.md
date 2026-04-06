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

## Categoria 5 — Integração Frontend ↔ Backend

### Padrão 14: Types do frontend vs schemas reais do backend

Frontend cria types baseados na spec ou no mock. Backend implementa schemas independentemente. Na integração, campos têm nomes diferentes, enums têm valores diferentes, shapes divergem.

- **O que acontece:** Tudo compila mas falha em runtime (`undefined`, dados não renderizam, filtros não funcionam). Pode afetar 30+ campos numa única fase.
- **Como evitar:** Antes de planejar integração, comparar types do frontend com schemas/models reais do backend (não com a spec). Nomes, enums e shapes devem ser idênticos. Se divergem, alinhar ANTES de implementar.

### Padrão 15: Resposta paginada acessada como array direto

Mock retorna array simples (`[item1, item2]`). API retorna objeto paginado (`{ items: [], total, page }`). Tela mantém o acesso do mock sem ajustar.

- **O que acontece:** Tela quebra em runtime porque `.map()` é chamado num objeto, não num array. Ou renderiza "[object Object]".
- **Como evitar:** Ao migrar de mock para API, verificar o shape real da resposta do endpoint. Se é paginado, ajustar acesso para `.data.items` (ou equivalente). Ver `.claude/rules/integration-checklist.md`.

---

## Categoria 6 — React Native / Mobile

> Padrões desta categoria aplicam-se especificamente a projetos que usam React Native.

### Padrão 16: Provider de overlay interceptando todos os toques

Providers de overlay (BottomSheet, Portal, Modal, Toast, etc.) de certas bibliotecas criam containers invisíveis de tela inteira na hierarquia nativa que interceptam TODOS os eventos de toque, mesmo quando nenhum overlay está aberto.

- **O que acontece:** FABs, botões e qualquer elemento interativo param de responder ao toque em todas as telas. O `onPress` nunca dispara. O componente está visível mas inerte. Afeta toda a árvore abaixo do Provider.
- **Por que não é detectado:** TypeScript compila, o componente renderiza visualmente, testes unitários passam. O container invisível só é visível via inspeção da hierarquia nativa (Android: `adb shell uiautomator dump`).
- **Como evitar:** Antes de adicionar qualquer Provider de overlay/sheet/portal, verificar na documentação da biblioteca se o componente específico que será usado realmente exige aquele Provider. Providers de variantes modais são geralmente desnecessários quando se usa apenas a variante não-modal. Não adicionar Provider "por precaução".
- **Como diagnosticar:** `adb shell uiautomator dump /dev/tty` — procurar por View/ScrollView de tela inteira que não corresponde a nenhum componente visível. `adb logcat -s ReactNativeJS` — se o `onPress` não aparece no log, o toque está sendo interceptado antes de chegar ao componente React (distingue "toque interceptado" de "handler não registrado").

### Padrão 17: BottomSheet emitindo evento de fechamento durante inicialização

Certas versões de bibliotecas de BottomSheet emitem o evento `onChange` com índice de fechamento (`-1`) durante a inicialização, antes de atingir o primeiro snap point. Se o handler trata qualquer índice de fechamento como sinal para fechar, o sheet abre e fecha instantaneamente — invisível para o usuário.

- **O que acontece:** O estado é definido como "aberto", o sheet monta com índice `0`, mas `onChange(-1)` dispara durante a inicialização, chamando `onClose()` e desmontando o sheet antes de ser visível. Ciclo: mount → onChange(-1) → unmount.
- **Como evitar:** Usar guard que rastreia se o sheet já alcançou um snap point aberto antes de aceitar eventos de fechamento como fechamento real. Processar `onChange(-1)` como fechamento válido somente se `index >= 0` já foi recebido anteriormente:
  ```tsx
  const hasReachedOpenRef = useRef(false);
  const handleSheetChanges = (index: number) => {
    if (index >= 0) hasReachedOpenRef.current = true;
    else if (index === -1 && hasReachedOpenRef.current) {
      hasReachedOpenRef.current = false;
      onClose();
    }
  };
  ```

### Padrão 18: Focus cycling em TextInput por mudança de estilo do View pai

Alterar propriedades do View pai de um TextInput nos callbacks `onFocus`/`onBlur` (backgroundColor, borderColor, elevation, shadow) pode causar loop infinito de foco no Android com New Architecture. O TextInput perde e re-ganha foco repetidamente, fazendo a tela tremer e o teclado abrir/fechar em loop.

- **O que acontece:** A tela treme sem parar, o teclado não permanece aberto. Em casos severos, o bug pode afetar o teclado do sistema mesmo após navegar para outra tela ou fechar o app. Afeta todos os componentes que usam o mesmo padrão de focus styling.
- **Causa raiz:** Relacionado ao React Native issue #45798 — mudar propriedades do View pai (elevation, backgroundColor, borderColor) em `onFocus`/`onBlur` faz o TextInput perder foco, disparando `onBlur`, que reverte os estilos, que restaura o foco — loop infinito. O comportamento é mais severo com New Architecture habilitada.
- **Como evitar:** Nunca mudar estilos do View pai em `onFocus`/`onBlur`. Para feedback visual de foco, usar props do próprio TextInput (`outline*`, `underlineColorAndroid`) que não causam re-layout do pai.
- **Como diagnosticar:** Se o teclado pisca repetidamente ou a tela treme ao focar em um TextInput, verificar se o componente muda estilos do View pai em `onFocus`/`onBlur`.

### Padrão 19: Campo de ícone renderizado como texto em vez de componente visual

Campo `icon: string` contendo nome de ícone de uma biblioteca (ex: "coffee", "star", "moon") renderizado diretamente em um componente de texto, exibindo o nome textual em vez do ícone visual.

- **O que acontece:** A UI exibe o nome do ícone como texto em vez do ícone correspondente.
- **Por que não é detectado:** Se os mocks usam emojis e a API real retorna strings de nomes, o bug só aparece ao integrar com a API real. TypeScript aceita ambos como `string`.
- **Como evitar:** Quando um campo `icon: string` pode conter nomes de ícones de uma biblioteca, criar um utilitário de mapeamento (nome → componente) e usá-lo em todos os pontos de renderização. Incluir fallback para nomes desconhecidos. Testar com dados reais da API — mocks com emojis mascaram este bug.

---

## Categoria 7 — Arquitetura e Fluxo de Controle

### Padrão 20: Dependência circular entre fases de implementação

Arquivo planejado para Fase N importa módulo planejado para Fase N+1. O projeto não compila ao final da Fase N porque o módulo importado ainda não existe.

- **O que acontece:** A Fase N não atinge o critério de aceite (compilação limpa). Corrigir na Fase N+1 cria retrabalho cascata e invalida o critério de aceite retroativamente.
- **Como evitar:** Para cada arquivo em Fase N, todos os seus imports devem existir em Fase 1..N — nenhum import aponta para Fase N+1 ou posterior. A dependência entre fases é estritamente unidirecional: Fase N+1 pode depender de N, nunca o contrário.
- **Após corrigir:** Varrer sistematicamente TODOS os outros arquivos da mesma fase antes de considerar o fix completo. O mesmo padrão de dependência circular tipicamente existe em mais de um ponto — corrigir apenas o primeiro sem varrer os demais é reincidência garantida.

### Padrão 21: Comunicação de controle de fluxo via exception

Função usa `throw` para sinalizar ao caller que ele deve fazer retry, continuar o loop ou tomar outra ação de controle — em vez de comunicar via valor de retorno.

- **O que acontece:** Qualquer bloco `catch` intermediário na pilha de chamadas captura a exception sem entender a semântica de "sinal de retry". O caller original nunca recebe a mensagem. O comportamento resultante é o oposto do pretendido: o sistema para onde deveria continuar.
- **Como evitar:** `throw` é para erros não-recuperáveis ou propagação de falha — não para comunicar "pode continuar". Para sinalizar ao caller que ele deve fazer retry ou loop: usar valor de retorno (`null`, enum, `Result<T>`). Regra: se a "exception" é esperada e o caller precisa agir sobre ela diferentemente de outros erros, não é exception — é valor de retorno.
- **Sinal de alerta:** Se um `catch` decide entre "fazer retry" vs "reportar erro" baseado no conteúdo da exception capturada, o design está comunicando controle via exception — refatorar para valor de retorno.

---

## Como usar esta rule

Ao criar um plano de implementação:

1. Revisar cada type definido contra os padrões 1-4
2. Revisar cada tela e componente contra os padrões 5-9
3. Revisar a navegação contra os padrões 10-11
4. Revisar os mocks contra os padrões 12-13
5. Revisar integração frontend↔backend contra os padrões 14-15
6. Em projetos React Native: revisar componentes e bibliotecas de overlay contra os padrões 16-19
7. Em projetos com implementação faseada ou fluxo de controle assíncrono: revisar arquitetura e controle de fluxo contra os padrões 20-21
8. Executar o procedimento de `.claude/rules/plan-construction.md` para verificação final
