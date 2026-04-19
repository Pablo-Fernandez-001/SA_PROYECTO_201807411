# Performance Validation Report

- Source: `evidence/load/locust-summary.log`
- Scope: baseline validation run in local environment

## Observed

- `/health` req/s: 2.00
- `/api/catalog/restaurants` req/s: 1.50
- `/api/orders` req/s: 0.75
- Aggregated req/s: 4.25
- Failure rate: 0.20%

## Notes

This baseline is intended as functional proof of load-test execution.
Formal threshold validation for phase requirements is automated in CI via:

- `tests/load/validate_thresholds.py`
- `tests/load/run-locust.sh`

For strict validation against rubric targets (e.g., RPS/p95), run with:

```bash
STRICT_PERF=true REQUIRED_RPS=1000 REQUIRED_P95_MS=500 python tests/load/validate_thresholds.py <locust_stats.csv> <report.md>
```
