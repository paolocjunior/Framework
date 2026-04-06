# Estratégia de Testes

## Princípios

- Código novo deve ter testes que cobrem o caminho feliz e os casos de erro
- Testes devem ser independentes entre si (sem dependência de ordem)
- Testes devem rodar rápido e de forma determinística
- Nomes de teste descrevem o cenário: `test_<funcao>_<cenario>_<resultado_esperado>`

## O Que Testar

- Funções com lógica de negócio
- Validações de entrada
- Tratamento de erros e exceções
- Limites e edge cases (strings vazias, listas vazias, valores nulos, overflow)
- Integrações com APIs externas (usar mocks)

## O Que NÃO Testar

- Getters/setters triviais sem lógica
- Código de terceiros/bibliotecas
- Configurações estáticas

## Padrão de Teste

Seguir o padrão Arrange-Act-Assert (AAA):

```
# Arrange: preparar dados e dependências
# Act: executar a ação sendo testada
# Assert: verificar o resultado esperado
```

## Mocks e Stubs

- Mockar dependências externas (APIs, banco, filesystem)
- Nunca mockar a unidade sendo testada
- Mocks devem refletir o comportamento real da dependência
- Verificar que mocks são chamados com os argumentos corretos
- `clearAllMocks()` (Jest/Vitest) limpa histórico de chamadas mas NÃO limpa filas de `mockOnce` — testes que falham no meio deixam entradas não consumidas que vazam para testes subsequentes. Usar `resetAllMocks()` quando o suite usa `mockOnce` e precisar de isolamento completo entre testes.

## Cobertura

- Buscar cobertura significativa, não cobertura de vaidade
- Priorizar testes em código crítico (segurança, pagamentos, dados)
- Cobertura de branches é mais importante que cobertura de linhas

## Security Regression Matrix

Quando o projeto tiver fluxos das classes abaixo, testes de concorrência e abuso são obrigatórios:

### Classe A — Toggles (like, follow, favorite, vote)

- Múltiplas requisições idênticas simultâneas não criam efeito duplicado
- Estado final é consistente independente da ordem de chegada
- Constraint de unicidade ou lock impede "likes fantasmas"

### Classe B — Saldo, crédito, estoque, recurso compartilhado

- Compra simultânea de itens diferentes não resulta em saldo negativo ou débito parcial
- Reembolso simultâneo não duplica crédito
- Consumo e reversão concorrentes mantêm invariante contábil (saldo fecha)
- Lock está no recurso compartilhado (saldo do usuário), não apenas no item

### Classe C — Jobs, webhooks, idempotência

- Replay do mesmo evento não causa efeito duplicado
- Mesma operação com mesmo request_id/idempotency_key é processada apenas uma vez
- Reprocessamento após timeout não corrompe estado

### Classe D — Lógica de negócio e anti-fraude

- Auto-benefício bloqueado (ex: afiliado não compra com próprio cupom + reembolsa)
- Fluxos monetários fecham contabilmente em qualquer ordem de operação
- Cenários de abuso documentados são cobertos por test cases
