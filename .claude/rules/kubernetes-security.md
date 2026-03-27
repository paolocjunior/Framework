# Checklist de Segurança — Kubernetes

## Containers e Imagens

- [ ] Imagens usam tag fixa com versão específica (nunca :latest)
- [ ] Imagens vêm de registries confiáveis (não imagens públicas desconhecidas)
- [ ] Containers NÃO rodam como root (runAsNonRoot: true)
- [ ] runAsUser definido com UID não-root (ex: 1000)
- [ ] readOnlyRootFilesystem: true quando possível
- [ ] Sem imagePullPolicy: Always em produção (exceto com digest)

## Privilégios e Security Context

- [ ] privileged: false em todos os containers
- [ ] allowPrivilegeEscalation: false
- [ ] Capabilities desnecessárias removidas (drop: ["ALL"])
- [ ] Apenas capabilities estritamente necessárias adicionadas explicitamente
- [ ] hostNetwork: false (não compartilhar rede do node)
- [ ] hostPID: false (não compartilhar PID do node)
- [ ] hostIPC: false (não compartilhar IPC do node)

## Recursos e Limites

- [ ] resources.requests definido para CPU e memória em todos os containers
- [ ] resources.limits definido para CPU e memória em todos os containers
- [ ] Limites proporcionais e realistas (não 999Gi de memória)
- [ ] Sem pods sem limits que possam consumir recursos do cluster inteiro

## Policy Enforcement e Admissão

- [ ] Namespaces usam Pod Security Admission com nível apropriado
- [ ] Labels de Pod Security estão definidas explicitamente por namespace
- [ ] Há política para bloquear workloads inseguros na admissão
- [ ] Exceções de segurança são raras, documentadas e justificadas

## Secrets e Configuração

- [ ] Secrets NÃO estão em texto plano nos manifests YAML
- [ ] Usar Kubernetes Secrets, Sealed Secrets, ou vault externo (Vault, SOPS, etc.)
- [ ] Secrets montados como volumes ou envFrom, não como args de command
- [ ] ConfigMaps não contêm credenciais ou tokens
- [ ] Valores sensíveis em Helm charts usam .Values com referência a Secrets
- [ ] Secrets no cluster usam proteção adequada em repouso quando aplicável
- [ ] Apenas workloads autorizados acessam cada Secret
- [ ] Secrets não são compartilhados amplamente entre workloads sem necessidade
- [ ] Variáveis de ambiente sensíveis são minimizadas quando volume/secret mount for mais seguro
- [ ] Segredos não aparecem em logs, eventos ou saídas de debug

## Health Checks

- [ ] livenessProbe configurado em todos os containers de longa duração
- [ ] readinessProbe configurado para controlar quando o pod recebe tráfego
- [ ] startupProbe configurado para containers com inicialização lenta
- [ ] Probes com timeouts e thresholds razoáveis (não defaults cegos)

## Rede e Exposição

- [ ] NetworkPolicies definidas para restringir tráfego entre pods
- [ ] Services do tipo LoadBalancer/NodePort apenas quando necessário
- [ ] Ingress com TLS configurado (não tráfego HTTP exposto)
- [ ] Sem portas expostas desnecessárias nos containers
- [ ] Annotations de Ingress não expõem headers ou configs internas

## RBAC e Service Accounts

- [ ] Pods NÃO usam o ServiceAccount default sem necessidade
- [ ] automountServiceAccountToken: false quando o pod não precisa da API do K8s
- [ ] Roles e ClusterRoles seguem princípio do menor privilégio
- [ ] Sem ClusterRoleBindings com permissões wildcard (verbs: ["*"], resources: ["*"])
- [ ] ServiceAccounts específicos por workload, não compartilhados

## Namespaces e Isolamento

- [ ] Workloads organizados em namespaces por ambiente ou domínio
- [ ] ResourceQuotas definidas por namespace para evitar consumo excessivo
- [ ] LimitRanges configurados para defaults de recursos em pods sem limits
- [ ] Workloads de produção isolados de dev/staging

## Scheduling e Isolamento de Node

- [ ] Workloads críticos usam regras explícitas de scheduling quando necessário
- [ ] Afinidade/anti-affinity é usada quando melhora isolamento ou disponibilidade
- [ ] Tolerations e node selectors não concedem acesso indevido a nodes especiais
- [ ] Não há dependência implícita de agendamento aleatório para workloads sensíveis

## Deploy e Disponibilidade

- [ ] Replicas > 1 para workloads críticos (alta disponibilidade)
- [ ] PodDisruptionBudget configurado para manutenção sem downtime
- [ ] Strategy do Deployment definida (RollingUpdate com maxUnavailable/maxSurge)
- [ ] Sem uso de pods soltos (bare pods) em produção — usar Deployments/StatefulSets
