#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-http://localhost:8080}"
OUT_DIR="${2:-Proyecto3/evidence/load}"
RUN_TIME="${RUN_TIME:-2m}"

if [[ -f "Proyecto3/tests/load/locustfile.py" ]]; then
  LOCUST_FILE="Proyecto3/tests/load/locustfile.py"
elif [[ -f "tests/load/locustfile.py" ]]; then
  LOCUST_FILE="tests/load/locustfile.py"
else
  echo "Unable to find locustfile.py"
  exit 1
fi

mkdir -p "$OUT_DIR"

locust -f "$LOCUST_FILE" \
  --host "$HOST" \
  --headless \
  --users 20 \
  --spawn-rate 5 \
  --run-time "$RUN_TIME" \
  --csv "$OUT_DIR/locust" \
  --only-summary | tee "$OUT_DIR/locust-summary.log"

echo "Locust report generated in $OUT_DIR"
