# Evidence Tracing

## Propósito

Padronizar como achados, conclusões e verificações são reportados, garantindo rastreabilidade e reprodutibilidade.

## Formato obrigatório para achados em auditorias e revisões

Cada achado deve conter:

- **Localização**: arquivo e linha exata (ex: `src/auth/login.py:34`)
- **Evidência**: trecho de código, output de comando ou referência concreta
- **Impacto**: o que acontece se não corrigir
- **Severidade**: CRÍTICO / ALTO / MÉDIO / BAIXO
- **O que não foi verificado**: lacunas explícitas na análise

## Formato obrigatório para veredictos e aprovações

Cada veredicto deve conter:

- Escopo do que foi analisado (quais arquivos, módulos, áreas)
- Escopo do que NÃO foi analisado
- Nível de confiança da conclusão
- Lista de evidências que sustentam o veredicto

## Anti-padrões de Evidência

- **Grep por import/declaração não prova uso.** Encontrar `import { assertOnline }` em 11 arquivos não significa que a função é chamada em 11 arquivos. Imports podem existir sem chamadas reais nas funções. Para confirmar uso: verificar chamadas concretas dentro do corpo das funções, não apenas presença do import.
- **Contagem de grep matches não é contagem de uso real.** Grep retorna imports, re-exports, comentários, type annotations e referências passivas — não apenas uso ativo. Filtrar falsos positivos antes de concluir cobertura.
- **Conclusão de cobertura total a partir de amostragem parcial.** Verificar 3 de 11 arquivos e concluir "11/11 MATCH" é falso positivo. Se a verificação foi amostral, declarar explicitamente: "verificado em X de Y — amostra, não cobertura total".

## Rejeitar

- Relatórios sem localização de achados
- Conclusões sem evidência concreta
- Veredictos sem escopo definido
- Uso de linguagem vaga de confiança ("parece seguro", "provavelmente ok")
- Aprovações genéricas sem indicar o que foi verificado

## Exceções

- Para verificações triviais (rename, typo fix), evidência pode ser simplificada
- Para análises exploratórias, o formato pode ser adaptado desde que a evidência esteja presente
