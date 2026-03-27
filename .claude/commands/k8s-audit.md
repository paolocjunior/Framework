---
description: Auditoria de segurança focada em Kubernetes — manifests, Helm charts, RBAC, secrets, security contexts e configurações de deploy
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*), Bash(cat:*), Bash(kubectl:*), Bash(helm:*), Bash(npm:*), Bash(node:*)
---

Realizar auditoria de segurança de Kubernetes no projeto seguindo a checklist em `.claude/rules/kubernetes-security.md`.

Buscar evidências em todos os arquivos relevantes do projeto:

- Manifests K8s: *.yaml, *.yml em pastas k8s/, kubernetes/, manifests/, deploy/, infra/
- Kustomize: kustomization.yaml, overlays/, base/, bases/
- Helm charts: Chart.yaml, values*.yaml, templates/*.yaml, templates/*.tpl, charts/
- Recursos adicionais: Namespace, PodDisruptionBudget, HorizontalPodAutoscaler, IngressClass
- Scripts que geram/aplicam manifests: *.sh, Makefile, scripts/deploy*
- Dockerfiles: Dockerfile*, .dockerignore
- CI/CD: .github/workflows/*.yml, .gitlab-ci.yml, Jenkinsfile, skaffold.yaml, tilt, devspace.yaml
- Configs gerais: *.yaml, *.yml na raiz e subdiretórios

Buscar por padrões de risco:

- privileged: true, allowPrivilegeEscalation: true, hostNetwork: true, hostPID: true
- runAsRoot, runAsUser: 0, securityContext ausente
- image: sem tag ou com :latest
- resources sem limits ou requests
- Secrets em texto plano (stringData com valores literais, base64 decodificável)
- automountServiceAccountToken: true sem necessidade
- ClusterRoleBinding com wildcard (verbs: ["*"])
- Services tipo LoadBalancer/NodePort sem justificativa
- Probes (liveness/readiness) ausentes
- NetworkPolicy ausente
- Pod Security Admission ausente ou modo permissivo
- Secrets compartilhados entre múltiplos workloads sem necessidade
- nodeSelector/affinity ausentes em workloads críticos
- tolerations permissivas demais

Para cada item da checklist:

1. Verificar se existe no projeto
2. Se encontrar problema, reportar com:
   - Arquivo e linha exata
   - Evidência concreta (trecho de YAML, config ou referência direta)
   - O que está errado
   - Risco: CRÍTICO / ALTO / MÉDIO / BAIXO
   - Como poderia ser explorado
   - Correção recomendada com código YAML concreto
   - O que não foi verificado neste item

Ao final, gerar resumo com:
- Escopo analisado (quais arquivos, módulos, áreas)
- Escopo NÃO analisado
- Total de problemas por severidade
- Top 3 riscos mais críticos
- Nível de confiança do veredicto
- Próximas ações recomendadas (ordenadas por prioridade)

NÃO fazer correções automaticamente. Apenas reportar e aguardar aprovação.

Seguir os padrões de `.claude/rules/self-verification.md` e `.claude/rules/evidence-tracing.md` para cada achado.

---

## Itens Pendentes de Verificação

Após o resumo final, classificar TODAS as verificações que não puderam ser concluídas durante a auditoria.

### Classificação obrigatória

Cada item pendente deve ser classificado em uma das categorias:

**LOCAL (executável agora)** — verificações que podem ser executadas no ambiente atual, sem infra externa:

Subcategorias:
- **Baixo risco (read-only / não destrutivo):** pode sugerir execução direta. Exemplos: `kubectl --dry-run=client -f manifest.yaml` (validação de syntax), `helm template` (renderização local), `helm lint`, `kubeval`, `kube-score`, checagem de YAML syntax.
- **Mutável (altera ambiente):** requer aviso explícito destacado antes de sugerir execução. Exemplos: `kubectl apply`, `helm install/upgrade`, qualquer comando que altere estado de cluster.

**EXTERNO (requer ação fora do projeto)** — verificações que dependem de infraestrutura, serviços ou ambientes não disponíveis localmente:
Exemplos: cluster Kubernetes real para verificar RBAC efetivo, Pod Security Admission em runtime, NetworkPolicies aplicadas, verificação de secrets em vault externo, scan de imagens em registry real.

### Formato de apresentação

```
## Itens Pendentes de Verificação

### Executáveis localmente

#### Baixo risco (read-only)
| # | Verificação pendente | Motivo da pendência | Comando sugerido |
|---|---------------------|--------------------|-----------------:|

#### Mutáveis (alteram ambiente) ⚠️
| # | Verificação pendente | Motivo da pendência | Comando sugerido | O que será alterado |
|---|---------------------|--------------------|-----------------:|--------------------:|

> Deseja que eu execute as verificações locais agora?
> - Itens de baixo risco serão executados diretamente.
> - Itens mutáveis serão executados apenas com sua confirmação explícita para cada um.

### Requerem ação externa

| # | Verificação pendente | O que é necessário | Como fazer (passo a passo) |
|---|---------------------|-------------------|---------------------------|
```

### Fluxo após confirmação do usuário

Se o usuário confirmar execução das verificações pendentes:

1. Executar APENAS as verificações locais sugeridas (baixo risco direto; mutáveis com confirmação individual)
2. NÃO executar verificações externas — apenas manter as instruções
3. Gerar relatório complementar APENAS das verificações executadas agora, no formato:

```
## Resultado Complementar — Verificações Pendentes Executadas

| # | Verificação | Comando executado | Status | Evidência (output) | Conclusão |
|---|------------|------------------|--------|-------------------|-----------|
```

4. Atualizar o nível de confiança geral se as novas verificações alterarem o panorama
5. Se alguma verificação local falhar ou revelar novos problemas, reportar no mesmo formato de achados do relatório principal
