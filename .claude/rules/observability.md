# Checklist de Observabilidade e Diagnóstico

## Logging

- [ ] Logs estruturados onde necessário (não apenas strings soltas sem contexto)
- [ ] Eventos-chave do fluxo de negócio registrados (login, compra, erro de pagamento, mudança de estado crítico)
- [ ] Mensagens de log incluem contexto suficiente para diagnóstico (userId, action, timestamp, correlationId quando aplicável)
- [ ] Sem logar secrets, tokens, senhas ou PII (referência cruzada com `.claude/rules/security.md`)
- [ ] Distinção entre níveis de log: debug, info, warn, error — usados com semântica consistente

## Tratamento de Erros para Diagnóstico

- [ ] Erros capturados incluem contexto suficiente para reproduzir o problema
- [ ] Distinção entre erro recuperável (retry, fallback, degradação) e erro fatal (crash report, mensagem ao usuário)
- [ ] Erros silenciados são documentados com justificativa (nunca catch vazio sem razão explícita)
- [ ] Stack traces preservados internamente para diagnóstico, mas nunca expostos ao usuário final

## Crash Reporting e Telemetria

- [ ] Estratégia de crash reporting definida quando aplicável (Sentry, Crashlytics, equivalente)
- [ ] Eventos críticos rastreáveis sem depender do usuário reportar
- [ ] Métricas mínimas de saúde identificadas para o contexto do projeto (error rate, latência de operações-chave, uptime)

## Nota sobre Proporcionalidade

Observabilidade deve ser proporcional à criticidade e ao contexto do projeto. Um script utilitário não precisa de Sentry. Um app com milhares de usuários não pode depender de `console.log`. O objetivo é garantir que, quando algo falhar, exista informação suficiente para diagnosticar sem depender de adivinhação.
