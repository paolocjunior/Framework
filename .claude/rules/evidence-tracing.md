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

## Rejeitar

- Relatórios sem localização de achados
- Conclusões sem evidência concreta
- Veredictos sem escopo definido
- Uso de linguagem vaga de confiança ("parece seguro", "provavelmente ok")
- Aprovações genéricas sem indicar o que foi verificado

## Exceções

- Para verificações triviais (rename, typo fix), evidência pode ser simplificada
- Para análises exploratórias, o formato pode ser adaptado desde que a evidência esteja presente
