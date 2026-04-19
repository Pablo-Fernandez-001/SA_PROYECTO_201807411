#!/usr/bin/env bash
set -euo pipefail

API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:8080}"

curl -fsS "${API_GATEWAY_URL}/health" >/dev/null
curl -fsS "${API_GATEWAY_URL}/api/health" >/dev/null
curl -fsS "${API_GATEWAY_URL}/api/catalog/restaurants" >/dev/null

echo "Smoke tests passed"
