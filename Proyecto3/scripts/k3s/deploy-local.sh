#!/usr/bin/env bash
set -euo pipefail

export KUBECONFIG=${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}

kubectl apply -f Proyecto3/k8s/00-namespace.yaml
kubectl apply -f Proyecto3/k8s/01-secrets.yaml
kubectl apply -f Proyecto3/k8s/02-configmaps.yaml
kubectl apply -f Proyecto3/k8s/10-auth-db.yaml
kubectl apply -f Proyecto3/k8s/11-catalog-db.yaml
kubectl apply -f Proyecto3/k8s/12-orders-db.yaml
kubectl apply -f Proyecto3/k8s/13-delivery-db.yaml
kubectl apply -f Proyecto3/k8s/14-payment-db.yaml
kubectl apply -f Proyecto3/k8s/20-rabbitmq.yaml
kubectl apply -f Proyecto3/k8s/21-redis.yaml
kubectl apply -f Proyecto3/k8s/30-auth-service.yaml
kubectl apply -f Proyecto3/k8s/31-catalog-service.yaml
kubectl apply -f Proyecto3/k8s/32-orders-service.yaml
kubectl apply -f Proyecto3/k8s/33-delivery-service.yaml
kubectl apply -f Proyecto3/k8s/34-notification-service.yaml
kubectl apply -f Proyecto3/k8s/35-payment-service.yaml
kubectl apply -f Proyecto3/k8s/36-fx-service.yaml
kubectl apply -f Proyecto3/k8s/40-api-gateway.yaml
kubectl apply -f Proyecto3/k8s/41-frontend.yaml
kubectl apply -f Proyecto3/k8s/50-ingress.yaml
kubectl apply -f Proyecto3/k8s/60-cronjob-reject-old-orders.yaml
kubectl apply -f Proyecto3/monitoring/prometheus/k8s-prometheus.yaml
kubectl apply -f Proyecto3/monitoring/grafana/k8s-grafana.yaml
kubectl apply -f Proyecto3/monitoring/elk/elasticsearch.yaml
kubectl apply -f Proyecto3/monitoring/elk/kibana.yaml
kubectl apply -f Proyecto3/monitoring/elk/k8s-fluent-bit.yaml

kubectl get pods -n delivereats
