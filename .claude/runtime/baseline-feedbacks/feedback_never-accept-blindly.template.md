---
name: feedback-never-accept-blindly
description: Nunca aceitar informação sem validar com evidência real no código. Se discordar, mostrar evidência antes de implementar
type: feedback
---

Todo conteúdo recebido para análise deve ser obrigatoriamente validado com evidência real comprovada no código.

**Why:** Aceitar informações sem verificar leva a verify-specs otimistas, falsos positivos e conclusões incorretas. O objetivo é colaboração crítica, não concordância automática.

**How to apply:** Ao receber qualquer análise, feedback ou correção:
1. Ler os arquivos citados e verificar cada claim com evidência real
2. Se estiver certo: confirmar com evidência comprovada
3. Se estiver errado em algum ponto: devolver relatório com evidência, explicação e sugestão
4. Nunca implementar sem alinhamento mútuo
5. Nunca concluir cobertura total a partir de amostragem parcial (ver `.claude/rules/evidence-tracing.md`)
