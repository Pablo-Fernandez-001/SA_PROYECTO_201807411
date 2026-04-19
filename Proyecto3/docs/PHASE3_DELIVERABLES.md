# Phase 3 Deliverables Checklist

This folder documents the implemented phase 3 scope for DeliverEats.

## Added in Proyecto3
- Terraform baseline under `iac/terraform`
- Ansible VM bootstrap under `iac/ansible`
- Kubernetes cronjob for stale orders under `k8s`
- Smoke test script under `tests/smoke`
- Locust load test under `tests/load`
- Real observability manifests (Prometheus, Grafana, Elasticsearch, Kibana, Fluent Bit) under `monitoring/`
- k3s/k3d local automation scripts under `scripts/k3s` and `scripts/k3d`
- Kubernetes manifests for `payment-service` and `fx-service` under `k8s/`
- Execution evidence under `evidence/` (cronjob, load, smoke, dashboards)
- CI pipeline validation stage running Terraform, Ansible, smoke and Locust

## Validation status
- [x] Real ELK stack manifests and dashboards
- [x] Prometheus and Grafana manifests or exports
- [x] External MS SQL Server provisioning bootstrap (automated startup-script in Terraform)
- [x] CI pipeline jobs that run Terraform, Ansible, smoke tests and Locust
- [x] Evidence logs and dashboard exports
- [x] Visual evidence screenshots under `evidence/screenshots`

## Notes
- The Terraform baseline is inherited from previous phases and now includes automatic MS SQL bootstrap for lab validation.
- For production hardening, apply secrets rotation, TLS and stronger credential management.
