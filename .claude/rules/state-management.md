# Checklist de Gestão de Estado

## Fonte de Verdade

- [ ] Cada domínio relevante tem fonte de verdade única e identificável
- [ ] Sem duplicação de estado entre componentes/telas que represente o mesmo dado
- [ ] Distinção clara entre estado de UI (loading, modal aberto, seleção), estado de domínio (usuário, pedido, inventário) e estado persistido (banco, storage local, save file)

## Atualização de Estado

- [ ] Atualização de estado é previsível e rastreável (não espalhada em callbacks dispersos)
- [ ] Efeitos colaterais isolados e explícitos (não escondidos em getters, renders ou constructors)
- [ ] Lógica crítica de negócio não vive em código de view/UI
- [ ] Cancelamento ou ignorância de resposta tardia tratado quando aplicável (usuário navegou, request antigo retorna)

## Estados da Interface

- [ ] Cada tela/componente com dados assíncronos trata explicitamente: loading, vazio, erro, sucesso e stale/retry
- [ ] Estado de erro distingue entre recuperável (retry, fallback) e fatal (mensagem + ação)
- [ ] Estado vazio tem tratamento visual e funcional (não tela em branco ou componente invisível)

## Persistência e Ciclo de Vida

- [ ] Estado que precisa sobreviver a restart/navegação está persistido explicitamente
- [ ] Estado temporário é descartado quando o contexto muda (não vaza entre telas/cenas)
- [ ] Save/restore de estado é testável e reversível
- [ ] Migração de schema/formato de estado persistido tem estratégia definida quando aplicável
