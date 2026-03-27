# Self-verification

## Propósito

Garantir que conclusões, veredictos e entregas sejam sustentados por evidência verificável, não por argumentação textual.

## Obrigatório

- Verificação deve ser proporcional à força do claim sendo feito
- Claims fortes exigem evidência forte
- Se a verificação é parcial, declarar isso explicitamente
- Cada conclusão deve estar ancorada em pelo menos um tipo de evidência aceitável

## Evidência aceitável (em ordem decrescente de força)

- Teste executado e resultado confirmado (passou/falhou)
- Output de comando verificado (lint, build, validação)
- Resultado de análise estática com ferramenta
- Inspeção direta de código com referência a arquivo e linha
- Confirmação de diff ou configuração verificada
- Comparação com especificação ou requisito documentado

## Rejeitar

- "O código parece correto" sem evidência concreta
- "A lógica está coerente" sem referência a arquivo ou teste
- "Não encontrei problemas" sem indicar o que foi verificado
- Aprovação genérica sem escopo do que foi analisado
- Evidência inventada ou fabricada para satisfazer formato

## Quando verificação completa não é possível

- Declarar explicitamente o que foi verificado e o que não foi
- Indicar o nível de confiança da conclusão
- Não apresentar evidência fraca como se fosse evidência conclusiva
