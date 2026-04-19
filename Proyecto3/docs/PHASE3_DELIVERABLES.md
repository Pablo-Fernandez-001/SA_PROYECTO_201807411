# Phase 3 Deliverables Checklist

This folder documents the remaining phase 3 work for DeliverEats.

## Added in Proyecto3
- Terraform baseline under `iac/terraform`
- Ansible VM bootstrap under `iac/ansible`
- Kubernetes cronjob for stale orders under `k8s`
- Smoke test script under `tests/smoke`
- Locust load test under `tests/load`

## Still expected for full phase 3 validation
- Real ELK stack manifests and dashboards
- Prometheus and Grafana manifests or exports
- External MS SQL Server provisioning if required by the final rubric
- CI pipeline jobs that run Terraform, Ansible, smoke tests and Locust
- Evidence screenshots and execution logs

## Notes
- The current Terraform baseline is inherited from the previous phase and should be aligned with the final phase 3 infrastructure target if the rubric requires it.
