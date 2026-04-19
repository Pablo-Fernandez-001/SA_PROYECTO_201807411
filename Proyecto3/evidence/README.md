# DeliverEats Evidence Pack (Phase 3)

## Runtime logs
- `cronjob/reject-stale-orders.log`
- `smoke/smoke-run.log`
- `load/locust-summary.log`
- `load/performance-validation.md`

## Dashboard exports
- `dashboards/grafana-dashboard-export.json`
- `dashboards/kibana-saved-objects.ndjson`

## Visual evidence
- `screenshots/grafana-overview.png`
- `screenshots/kibana-logs.png`
- `screenshots/prometheus-targets.png`
- `screenshots/cronjob-history.png`

## Frontend E2E evidence (Cypress)
- `E2E UI - baseline auth`: `cypress/screenshots/frontend-evidence.cy.js/e2e-ui-base-01-login-page.png`
- `E2E UI - baseline register`: `cypress/screenshots/frontend-evidence.cy.js/e2e-ui-base-02-register-page.png`
- `E2E UI - baseline protected-route`: `cypress/screenshots/frontend-evidence.cy.js/e2e-ui-base-03-protected-route-redirect.png`

## Frontend Full Program Flow evidence (Cypress)
- `E2E UI - auth and roles`: `cypress/screenshots/auth-roles-flow.cy.js/*`
- `E2E UI - client complete flow (catalog, cart, order, payment)`: `cypress/screenshots/client-full-flow.cy.js/*`
- `E2E UI - admin flow (operations, users, FX, payments)`: `cypress/screenshots/admin-full-flow.cy.js/*`
- `E2E UI - restaurant flow (orders, promos, coupons)`: `cypress/screenshots/restaurant-full-flow.cy.js/*`
- `E2E UI - courier flow (available, active, history)`: `cypress/screenshots/courier-full-flow.cy.js/*`
- `Detalle de tipo de prueba por captura`: `cypress/TEST_TYPES.md`
