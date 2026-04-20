#!/usr/bin/env bash
set -euo pipefail

if command -v k3s >/dev/null 2>&1; then
  KUBECTL_CMD=(sudo k3s kubectl)
elif command -v kubectl >/dev/null 2>&1; then
  KUBECTL_CMD=(kubectl)
else
	echo "kubectl or k3s command not found"
	exit 1
fi

"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/00-namespace.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/01-secrets.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/02-configmaps.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/10-auth-db.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/11-catalog-db.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/12-orders-db.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/13-delivery-db.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/14-payment-db.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/20-rabbitmq.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/21-redis.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/30-auth-service.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/31-catalog-service.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/32-orders-service.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/33-delivery-service.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/34-notification-service.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/35-payment-service.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/36-fx-service.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/40-api-gateway.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/41-frontend.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/50-ingress.yaml
"${KUBECTL_CMD[@]}" apply -f Proyecto3/k8s/60-cronjob-reject-old-orders.yaml

if [[ "${APPLY_MONITORING:-false}" == "true" ]]; then
	"${KUBECTL_CMD[@]}" apply -f Proyecto3/monitoring/prometheus/k8s-prometheus.yaml
	"${KUBECTL_CMD[@]}" apply -f Proyecto3/monitoring/grafana/k8s-grafana.yaml
	"${KUBECTL_CMD[@]}" apply -f Proyecto3/monitoring/elk/elasticsearch.yaml
	"${KUBECTL_CMD[@]}" apply -f Proyecto3/monitoring/elk/kibana.yaml
	"${KUBECTL_CMD[@]}" apply -f Proyecto3/monitoring/elk/k8s-fluent-bit.yaml
fi

"${KUBECTL_CMD[@]}" get pods -n delivereats
