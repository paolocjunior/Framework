# Checklist de Qualidade Estrutural

## Princípios

- [ ] Cada arquivo/módulo tem responsabilidade predominante clara e identificável
- [ ] Alta coesão interna — reúne apenas comportamentos do mesmo contexto funcional ou técnico
- [ ] Dependências entre módulos são explícitas, justificáveis e evitam circularidade desnecessária
- [ ] A organização torna previsível onde cada responsabilidade deve estar
- [ ] Mudanças locais não exigem reestruturação desproporcional de áreas não relacionadas
- [ ] Decomposição favorece validação isolada de comportamentos relevantes

## Vedações

- [ ] Sem concentração de responsabilidades heterogêneas no mesmo arquivo/classe/função quando comprometer clareza, manutenção ou testabilidade
- [ ] Sem estruturas monolíticas quando a separação produzir benefício concreto de legibilidade, manutenção, teste ou evolução
- [ ] Sem fragmentação artificial — dividir só para aparentar modularização, sem ganho real de coesão, isolamento ou entendimento
- [ ] Sem abstração desnecessária — wrappers, interfaces ou camadas que apenas deslocam complexidade sem benefício técnico claro
- [ ] Sem mistura opaca de camadas — apresentação, regra de negócio, persistência, integração e validação não devem coexistir de forma desordenada no mesmo bloco estrutural

## Quando modularizar

Em caso de dúvida, preferir a opção que melhore:
- clareza da responsabilidade predominante,
- manutenibilidade,
- testabilidade,
- isolamento de mudanças,
- coerência com a arquitetura do sistema,

sem adicionar fragmentação artificial ou abstração desnecessária.

## Nota sobre métricas

Tamanho de arquivo, número de linhas, quantidade de funções e volume de código são sinais auxiliares de revisão, nunca critério único ou absoluto de conformidade. A decisão de decompor deve ser guiada por responsabilidade, clareza e governança técnica.
