# Observability (Phase 3)

This folder contains runnable observability assets for DeliverEats.

See `ARCHITECTURE.md` for the project-oriented observability design, rationale, and differences versus the lab implementation in `practicas`.

## Included stack
- Prometheus manifests and scrape configuration under `prometheus/`
- Grafana deployment + datasource/dashboard provisioning under `grafana/`
- ELK manifests (Elasticsearch + Kibana) and Fluent Bit shipping under `elk/`
- Exported evidence under `../evidence/dashboards/`

## Apply in Kubernetes
```bash
kubectl apply -f Proyecto3/monitoring/prometheus/k8s-prometheus.yaml
kubectl apply -f Proyecto3/monitoring/grafana/k8s-grafana.yaml
kubectl apply -f Proyecto3/monitoring/elk/elasticsearch.yaml
kubectl apply -f Proyecto3/monitoring/elk/kibana.yaml
kubectl apply -f Proyecto3/monitoring/elk/k8s-fluent-bit.yaml
```

## Basic checks
```bash
kubectl get pods -n delivereats | grep -E "prometheus|grafana|elasticsearch|kibana|fluent-bit"
kubectl port-forward -n delivereats svc/prometheus 9090:9090
kubectl port-forward -n delivereats svc/grafana 3000:3000
kubectl port-forward -n delivereats svc/kibana 5601:5601
```

## Notes
- The stack is focused on phase 3 validation and local/lab clusters.
- For production, add persistent storage, auth, TLS, and retention policies.
