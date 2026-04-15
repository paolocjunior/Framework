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

## Categoria 8 — Backend / Testing

> Padrões desta categoria aplicam-se a projetos backend que inicializam a aplicação completa em testes de integração.

### Padrão 22: Recurso validado no startup ausente no ambiente de teste

Frameworks backend frequentemente validam diretórios, arquivos de configuração, templates, clients externos e middleware quando a aplicação é criada (startup), não quando a rota correspondente é chamada. Testes que inicializam a aplicação completa (`TestClient(app)`, `supertest(app)`, `createTestApp()`) precisam satisfazer todos os requisitos de startup, incluindo componentes não exercitados pelo teste.

- **O que acontece:** o teste falha antes da primeira asserção, durante import ou criação da app. A mensagem de erro aponta para o mount/middleware/config, não para o endpoint testado. O comportamento varia por framework: Starlette/FastAPI podem lançar exceção na criação/mount da aplicação quando `StaticFiles(check_dir=True)` aponta para diretório ausente; Express/Koa geralmente falham silenciosamente na primeira request para aquela rota.
- **Exemplos:** `StaticFiles(directory="frontend")` com diretório inexistente; loader de templates ou assets configurado no startup; client de banco ou cache inicializado no import antes de env de teste; middleware que exige secret ou config ausente.
- **Como evitar:** ao planejar, listar recursos validados no startup e garantir que existem antes de criar a app nos testes. Para apps com frontend estático, criar o diretório via fixture antes de instanciar `TestClient`, ou condicionar o mount com verificação de existência. Preferir factory `create_app(config)` com overrides de storage/config para testes.
- **Sinal de alerta:** `app.mount()`, `StaticFiles()`, loader de templates/assets, client externo ou middleware com configuração obrigatória no mesmo arquivo em que a app global é criada, sem factory ou variante de configuração para testes.

---

## Categoria 9 — Tempo e Relógios

> Padrões desta categoria aplicam-se a código e testes que dependem de tempo, datas, expirações, TTLs, agendamentos ou qualquer lógica temporal.

### Padrão 23: Hierarquia de relógios em código e testes

Código que consulta tempo via chamadas globais diretas (`Date.now()`, `datetime.now()`, `time.time()`, `System.currentTimeMillis()`) acopla lógica de negócio a relógio de parede não-determinístico. Testes que dependem de tempo tendem a usar `sleep()` ou `setTimeout()` para "esperar o evento acontecer", introduzindo flakiness (testes falham esporadicamente quando a máquina está lenta) e lentidão (suite leva minutos por somar esperas).

- **O que acontece:** testes ficam flakes em CI com carga variável, bugs de fuso/DST aparecem em produção mas não em dev, expirações testadas com `sleep(5)` exigem teste de 5s para cada cenário, timeouts agregados fazem suite levar minutos. Código de produção mistura lógica de negócio com leitura direta do relógio, dificultando reuso e teste.

- **Como evitar — hierarquia de 4 níveis em ordem decrescente de preferência:**

  1. **Injectable clock (preferido)** — lógica de negócio recebe uma abstração de relógio (interface `Clock`, função `now()`, callable). Implementação de produção usa relógio real; testes injetam relógio controlado (`FakeClock`, `FrozenTime`, `TestClock`). Permite avançar tempo em saltos determinísticos (`clock.advance(timedelta(hours=2))`) sem esperar.

  2. **Fixed timestamp fixture (segundo melhor)** — teste congela o tempo em valor fixo via mock do relógio global (`mock.patch('module.datetime')`, `freezegun`, `MockDate`). Útil quando refatorar para injectable clock não é viável. Menos robusto que injectable porque depende do local exato onde o módulo importa a função de tempo.

  3. **Sleep com tolerância explícita (último recurso)** — quando não há alternativa (teste de integração end-to-end real, verificação de throttling efetivo), usar `sleep()` com margem declarada e comentário justificando. Tolerância deve ser relaxada (ex: `sleep(2.0)` para evento de 1s, com asserção `elapsed >= 1.0 and elapsed < 3.0`).

  4. **Proibido:** relógio global direto (`Date.now()`, `datetime.now()`, `time.time()`) embutido em lógica testável, sem camada de abstração, combinado com `sleep()` calibrado no limite (`sleep(1.0)` para evento de 1s sem margem). Garante flakiness.

- **Regras operacionais:**
  - Qualquer módulo novo com lógica temporal (expiração, TTL, janela de rate limit, agendamento, snapshot temporal) DEVE usar injectable clock desde o primeiro commit — retrofit custa mais.
  - Suites de teste que somam mais que ~5s em `sleep()` são sintoma de fuga do padrão. Rebaixar para injectable clock ou fixed timestamp.
  - Código que gera timestamps para persistir em banco deve registrar timezone explícito (UTC preferido) — nunca timestamps naive.
  - Comparações de tempo devem usar tolerância explícita quando envolvem serialização/round-trip (precisão de milissegundos perdida em JSON, banco pode truncar para segundos).

- **Sinal de alerta:** teste falha apenas em CI e passa localmente; suite de testes leva mais de 30s em projeto pequeno; bug só aparece entre 23:00 e 01:00 UTC; código contém `Date.now() - lastTime > THRESHOLD_MS` sem mock no teste.

---

## Categoria 10 — Tratamento de Erros e Dados Externos

> Padrões desta categoria aplicam-se a qualquer projeto que tenha handlers de último recurso (catch-all, global exception handlers, fallbacks genéricos) ou que consuma dados externos (arquivos, cache, fila, API externa, storage JSON/JSONB em banco).

### Padrão 24: Handler terminal sem diagnóstico e exceções heterogêneas

Handlers de último recurso são a última chance de preservar diagnóstico antes de responder ao usuário. Se retornam erro sem registrar o que aconteceu internamente, a falha vira silenciosa — ninguém descobre que algo quebrou até o comportamento degradado ser percebido muito depois. Blocos `except` que capturam classes heterogêneas de erro com a mesma estratégia de recuperação transformam causas distintas (transitório, corrupção, violação de schema, permissão) em um único fallback que esconde o que realmente aconteceu.

- **O que acontece:** catch-all retorna 500 ao usuário sem gravar stack trace nem contexto; erro transitório de I/O é tratado igual a corrupção permanente de dado, sobrescrevendo o arquivo corrompido com um estado "limpo" que destrói evidência; violação de schema é tratada como erro de permissão, levando a mensagens de UX inadequadas; o time de ops descobre o problema horas ou dias depois sem saber onde começar a investigar.
- **Por que não é detectado:** testes focam no caminho feliz; handler terminal é exercitado apenas em incidentes reais; ausência de log é invisível até o incidente acontecer; agrupamento heterogêneo de exceções compila e passa em testes porque cada cenário é testado individualmente, não em conjunto.
- **Como evitar:**
  - Todo handler de último recurso (catch-all, global exception handler, fallback genérico) DEVE registrar log com stack trace ou equivalente interno antes de responder
  - Usuário final nunca recebe stack trace, query SQL, path interno ou detalhe técnico — recebe mensagem segura; diagnóstico vai para log, não para response
  - Blocos com `except (X, Y, Z)` heterogêneo DEVEM distinguir a estratégia de recuperação por classe de erro; se o bloco captura `(JsonError, OSError, TypeError)`, cada classe tem tratamento próprio (transitório = retry/log/reraise; corrupção = preservar dado original + criar novo; violação de schema = validation error + diagnóstico específico)
  - Erro transitório, erro de formato, erro de permissão e violação de schema não podem cair no mesmo fallback sem justificativa explícita documentada
- **Sinais de alerta:**
  - `except Exception` retorna 500 sem `_logger.exception`, `logger.error(exc_info=True)` ou equivalente
  - `except (A, B, C)` agrupa I/O transitório, corrupção de formato e erro lógico com a mesma linha de recuperação
  - Handler 5xx existe mas nenhum teste exercita caminho de erro e nenhum log é emitido em ambiente de teste

### Padrão 25: Dados externos carregados com shape assumido

Todo dado proveniente de arquivo (JSON, YAML, config), cache local, fila de mensagens, resposta de API externa ou coluna JSON/JSONB em banco DEVE ser tratado como entrada externa não-confiável — mesmo quando foi escrito pelo próprio sistema em execução anterior. JSON válido sintaticamente não significa schema válido. Código que faz `data["field"]` direto após `json.load()` sem validação prévia assume shape que pode não existir.

- **O que acontece:** `TypeError: list indices must be integers, not str` em produção quando arquivo JSON contém `[]` onde o código esperava `{}`; `KeyError: 'tasks'` quando API externa mudou nome do campo para `items` sem avisar; 500 silencioso quando cache local foi corrompido por crash do processo anterior; código "funciona em dev" e quebra apenas com dados reais acumulados em produção.
- **Por que não é detectado:** mocks em teste têm shape sempre correto; fixture de desenvolvimento nunca tem dado corrompido ou desatualizado; TypeScript/type checker aceita porque o type foi declarado manualmente, não derivado do dado real; primeira vez que o formato real diverge do esperado é em produção.
- **Casos obrigatórios a cobrir (taxonomia de 4 cenários):**
  1. **Conteúdo inválido sintaticamente** — arquivo contém `{` truncado, bytes quebrados, YAML malformado, JSON com vírgula extra
  2. **Tipo raiz errado** — esperado `{}`, recebido `[]`; esperado objeto, recebido string; esperado array, recebido `null`
  3. **Shape errado (válido mas semanticamente diferente)** — esperado `{"tasks": []}`, recebido `{"items": []}`; campo renomeado; campo obrigatório ausente; campo com tipo diferente (`string` onde esperado `number`)
  4. **Item inválido dentro de lista válida** — `{"tasks": [{"id": "abc"}]}` onde `id` deveria ser numérico; item parcialmente populado; item com enum fora do vocabulário esperado
- **Regra preventiva:** validar schema do dado antes de confiar em unpacking. Usar parser/modelo/validator adequado ao stack (pydantic, zod, joi, jsonschema, serde). `data["field"]` direto após `json.load()`/`JSON.parse()` sem validação prévia é anti-padrão.
- **Regra reativa:** quando recuperação é necessária, separar formato inválido de erro transitório de I/O (referência cruzada com Padrão 24). Recuperação de corrupção permanente preserva dado original + cria novo; recuperação de erro transitório faz retry/log/reraise.
- **Sinais de alerta:**
  - `data["field"]` ou `data.field` logo após `json.load()` / `JSON.parse()` / `yaml.safe_load()` sem validação intermediária
  - `response.data.items` assumido sem checar contrato real da API externa (status, shape, presença do campo)
  - Cache, config ou storage local usado como se fosse confiável porque "foi escrito pelo próprio sistema"
  - Ausência de teste para shape errado, tipo raiz errado ou item inválido quando o dado é persistido fora do processo

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
8. Em projetos backend com testes de integração: revisar recursos validados no startup contra o padrão 22
9. Em qualquer projeto com lógica temporal (expiração, TTL, agendamento, rate limit): revisar contra o padrão 23
10. Em qualquer projeto com handlers de último recurso, catch-all, fallback genérico ou blocos `except` heterogêneos: revisar contra o padrão 24
11. Em qualquer projeto que consome dados externos (arquivos, cache, fila, API externa, JSON/JSONB em banco): revisar contra o padrão 25
12. Executar o procedimento de `.claude/rules/plan-construction.md` para verificação final
