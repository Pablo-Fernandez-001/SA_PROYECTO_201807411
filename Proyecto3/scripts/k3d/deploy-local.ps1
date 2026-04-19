Param(
  [string]$ClusterName = "delivereats-k3d"
)

$ErrorActionPreference = "Stop"
kubectl config use-context "k3d-$ClusterName"

$manifests = @(
  "Proyecto3/k8s/00-namespace.yaml",
  "Proyecto3/k8s/01-secrets.yaml",
  "Proyecto3/k8s/02-configmaps.yaml",
  "Proyecto3/k8s/10-auth-db.yaml",
  "Proyecto3/k8s/11-catalog-db.yaml",
  "Proyecto3/k8s/12-orders-db.yaml",
  "Proyecto3/k8s/13-delivery-db.yaml",
  "Proyecto3/k8s/14-payment-db.yaml",
  "Proyecto3/k8s/20-rabbitmq.yaml",
  "Proyecto3/k8s/21-redis.yaml",
  "Proyecto3/k8s/30-auth-service.yaml",
  "Proyecto3/k8s/31-catalog-service.yaml",
  "Proyecto3/k8s/32-orders-service.yaml",
  "Proyecto3/k8s/33-delivery-service.yaml",
  "Proyecto3/k8s/34-notification-service.yaml",
  "Proyecto3/k8s/35-payment-service.yaml",
  "Proyecto3/k8s/36-fx-service.yaml",
  "Proyecto3/k8s/40-api-gateway.yaml",
  "Proyecto3/k8s/41-frontend.yaml",
  "Proyecto3/k8s/50-ingress.yaml",
  "Proyecto3/k8s/60-cronjob-reject-old-orders.yaml",
  "Proyecto3/monitoring/prometheus/k8s-prometheus.yaml",
  "Proyecto3/monitoring/grafana/k8s-grafana.yaml",
  "Proyecto3/monitoring/elk/elasticsearch.yaml",
  "Proyecto3/monitoring/elk/kibana.yaml",
  "Proyecto3/monitoring/elk/k8s-fluent-bit.yaml"
)

foreach ($file in $manifests) {
  kubectl apply -f $file
}

kubectl get pods -n delivereats
Write-Host "Local deployment complete" -ForegroundColor Green
