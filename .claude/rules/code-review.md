# Critérios de Revisão de Código

## Clareza e Legibilidade

- [ ] Nomes de variáveis e funções são autoexplicativos
- [ ] Funções têm responsabilidade única (máximo ~30 linhas)
- [ ] Complexidade ciclomática baixa (sem aninhamento excessivo de if/else)
- [ ] Sem código duplicado (DRY aplicado onde faz sentido)
- [ ] Comentários explicam o "porquê", não o "o quê"

## Estrutura e Organização

- [ ] Arquivos e módulos têm responsabilidade clara
- [ ] Imports organizados e sem dependências circulares
- [ ] Separação entre lógica de negócio, I/O e apresentação
- [ ] Estrutura, modularização e separação de responsabilidades seguem `.claude/rules/structural-quality.md`
- [ ] Constantes extraídas (sem magic numbers)
- [ ] Configurações externalizadas (não hardcoded)

## Robustez

- [ ] Erros tratados explicitamente (try/catch com ações específicas)
- [ ] Recursos liberados após uso (conexões, arquivos, streams)
- [ ] Condições de borda tratadas (null, undefined, vazio, overflow)
- [ ] Timeouts configurados em chamadas externas
- [ ] Fallbacks definidos quando dependências falham

## Performance (quando relevante)

- [ ] Sem operações O(n²) evitáveis
- [ ] Queries de banco otimizadas (sem N+1)
- [ ] Recursos pesados com caching quando apropriado
- [ ] Sem memory leaks óbvios (listeners removidos, referências limpas)

## Compatibilidade

- [ ] Mudanças são retrocompatíveis (ou breaking changes são documentadas)
- [ ] APIs seguem contrato existente
- [ ] Migrations são reversíveis
- [ ] Sem dependências de ambiente específico (funciona em dev e prod)

## Justificativa Técnica

- [ ] Cada decisão de design tem razão verificável
- [ ] Trade-offs documentados (por que A e não B)
- [ ] Complexidade adicional justificada pelo benefício
- [ ] Padrões escolhidos são apropriados para o problema
