# Checklist de Qualidade de Especificação

## Required (obrigatórios para implementação)

- [ ] Fluxos, telas e ações relevantes têm objetivo e comportamento definidos
- [ ] Navegação e transições não têm ambiguidade material
- [ ] Entidades, campos e regras de integridade estão explícitos
- [ ] Regras distinguem comportamento manual vs automático quando aplicável
- [ ] Limitações de MVP/teste estão explícitas para evitar falsa expectativa
- [ ] Existe forma objetiva de validar a implementação (critérios de aceite verificáveis)
- [ ] Para fluxos com saldo, crédito, comissão, cashback, cupom, reembolso ou limites consumíveis: invariantes de negócio e cenários de abuso estão documentados (o que nunca pode acontecer, quem pode lucrar/cancelar/reverter/duplicar)

## Flag (sinalizar quando encontrar)

- [ ] Ambiguidade de navegação, ownership de estado ou fluxo
- [ ] Regra descrita na UX mas não fechada em persistência/modelo
- [ ] Tipo técnico inadequado ao domínio (ex: REAL para dinheiro)
- [ ] Política de importação/exportação/sync insuficiente
- [ ] Feature parcial descrita como se fosse completa
- [ ] Critério de aceite insuficiente ou não verificável
- [ ] Regra que diz "X determina Y" sem especificar o mecanismo de transmissão — qual campo, arquivo, formato ou como Y lê o dado de X
- [ ] Exemplos concretos (JSON, valores de enum, campos de artefato) escritos manualmente sem verificação contra as tabelas normativas da mesma spec — exemplos e tabelas divergem sistematicamente quando escritos em momentos diferentes
- [ ] Valor que aparecerá em código (string comparada, campo de artefato, enum) especificado como descrição em linguagem natural em vez de token literal exato
- [ ] Mapa de decisão (tabela de veredictos, mapeamento de status, dispatch de eventos) não verificado contra todos os casos que o sistema pode gerar — lacunas causam falhas ou pausas silenciosas em casos legítimos
- [ ] Sistema com múltiplos timeouts, contadores ou limites com nomes similares e contextos diferentes — nomes ambíguos garantem conflação durante a implementação

## Block implementation when

- Fluxo central não está definido
- Há ambiguidade material de navegação ou regra crítica
- Integridade de dados depende apenas de UI (sem constraint no modelo)
- Modo de teste não permite validar a entrega prometida
- Critérios de aceite são insuficientes para confirmar a implementação

## Classificação obrigatória de cada recomendação

Cada item reportado pelo `/spec-check` deve ser classificado por tipo:

| Tipo | Significado |
|------|-------------|
| **Clarification** | Esclarecer algo já pretendido, sem mudar escopo |
| **Constraint Fix** | Fechar integridade/regra/contrato técnico |
| **Behavior Definition** | Definir comportamento já implícito no produto |
| **Scope Risk** | Ponto que pode expandir escopo se resolvido do jeito errado |
| **Out-of-Scope Suggestion** | Ideia válida, mas fora do foco da versão atual |

## Princípio de correção mínima

Correções de especificação devem preferir **clarificação, fechamento de contrato e limitação explícita** em vez de adicionar novas capacidades, fluxos, automações ou integrações não já implícitas no escopo pretendido do produto.

Não converter lacunas de especificação em expansão funcional.

## Nota de proporcionalidade

A profundidade da checagem deve ser proporcional ao tipo de software e ao risco da spec:

- Utilitário simples → menor profundidade
- App multi-tela com persistência e regras → profundidade média/alta
- Jogo, mobile, sync, integrações, persistência crítica → profundidade alta
