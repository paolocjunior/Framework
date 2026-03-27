# Checklist de Performance e Uso de Recursos

## Processamento

- [ ] Operações pesadas não bloqueiam a thread principal / UI thread
- [ ] Sem loops desnecessários sobre datasets grandes onde filtro/paginação resolve
- [ ] Trabalho repetido evitado (recalcular, re-renderizar, re-buscar sem necessidade)
- [ ] Processamento em background quando operação é longa e não precisa de resposta imediata

## Memória e Recursos

- [ ] Recursos alocados são liberados quando não mais necessários (listeners, timers, conexões, streams, texturas)
- [ ] Listas grandes usam virtualização ou paginação quando aplicável
- [ ] Assets carregados de forma controlada (lazy loading, sob demanda, não tudo na inicialização)
- [ ] Cache com estratégia de invalidação definida (não cache infinito nem cache ausente)

## Renderização (UI e Jogos)

- [ ] Re-renderizações desnecessárias evitadas (memoização, shouldComponentUpdate, dirty flags)
- [ ] Animações e transições não causam jank perceptível (60fps como referência)
- [ ] Degradação graciosa em hardware mais fraco (reduzir efeitos visuais, não crashar)

## Rede

- [ ] Requests desnecessários evitados (debounce em buscas, cache de respostas, batch quando possível)
- [ ] Polling substituído por push/websocket quando justificável
- [ ] Timeout definido em chamadas externas (não esperar indefinidamente)
- [ ] Payload mínimo (não transferir dados desnecessários)

## Nota sobre Otimização

Medir antes de otimizar. Esta checklist define critérios de revisão para evitar desperdício óbvio, não mandato de micro-otimização prematura. O objetivo é que o código não desperdice recursos de forma evitável, não que cada linha seja otimizada ao máximo.
