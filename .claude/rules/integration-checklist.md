# Checklist de Integração — Migração Mock para API Real

## Propósito

Prevenir bugs recorrentes ao migrar telas/módulos de dados mockados para API real. Baseado em análise de padrões que reincidiram em 4+ fases de integração frontend.

## Verificações obrigatórias por tela/módulo migrado

### Dados hardcoded de mock

- [ ] Buscar strings de data fixa (ex: "2024-01-15", "Janeiro 2024") no arquivo — substituir por valores dinâmicos
- [ ] Buscar IDs estáticos (ex: `id: 1`, `userId: "abc"`) — substituir por IDs reais da API
- [ ] Buscar constantes de teste (ex: `MOCK_`, `FAKE_`, `TEST_`, `DUMMY_`) — remover ou substituir
- [ ] Nenhum dado de mock pode existir em modo real — se existir, é bug

### Types do frontend vs schemas do backend

- [ ] Comparar types do frontend com schemas/models reais do backend (não apenas com a spec)
- [ ] Nomes de campos idênticos (ex: backend diz `meal_log`, frontend não pode dizer `mealEntry`)
- [ ] Enums com mesmos valores (ex: backend diz `"pending" | "done"`, frontend não pode dizer `"active" | "completed"`)
- [ ] Campos opcionais vs obrigatórios alinhados
- [ ] Se o backend retorna shape diferente do mock (paginado, nested, etc.), ajustar o acesso no frontend

### Resposta paginada vs array direto

- [ ] Se o endpoint retorna lista paginada (`{ items: [], total, page }`), acessar `.items` do response
- [ ] Não acessar response direto como array quando a API retorna objeto paginado
- [ ] Verificar se hooks de data fetching tratam a estrutura paginada corretamente

### Feedback de mutations

- [ ] Toast de sucesso APENAS em callback `onSuccess` (nunca inline antes do `mutate()`)
- [ ] Navegação para outra tela APENAS em callback `onSuccess`
- [ ] Toast de erro em callback `onError` com mensagem clara ao usuário
- [ ] Estado de loading durante a mutation (botão disabled, spinner)

### Type safety

- [ ] Zero `as any` no arquivo final de tela/componente
- [ ] Se types não compilam após reestruturação, corrigir o acesso ao campo — não silenciar o TypeScript
- [ ] `as any` é proibido como workaround de compilação em código de tela — se necessário em código de infraestrutura, deve ter justificativa documentada

### Design tokens

- [ ] Zero valores de cor hex hardcoded em telas/componentes (usar tokens do design system)
- [ ] Zero constantes de paleta locais em telas (mover para theme/tokens centralizado)

## Quando aplicar

- Ao migrar qualquer tela de dados mockados para API real
- Ao conectar formulários a endpoints reais
- Ao substituir hooks de mock por hooks de API
- Em fases de "Functional Completion" ou "Integração"

## Vedações

- [ ] Não considerar migração completa sem verificar TODOS os itens acima por tela
- [ ] Não assumir que "compilou = funciona" — types podem compilar mas shapes podem divergir
- [ ] Não copiar padrão de acesso do mock (`.data`) quando a API retorna estrutura diferente (`.data.items`)
