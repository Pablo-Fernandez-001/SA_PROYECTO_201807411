#!/usr/bin/env python3
import csv
import os
import sys
from pathlib import Path


def to_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def main():
    stats_file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("evidence/load/locust_stats.csv")
    out_file = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("evidence/load/performance-validation.md")

    if not stats_file.exists():
        print(f"Stats file not found: {stats_file}")
        return 1

    required_rps = to_float(os.getenv("REQUIRED_RPS", "1000"))
    required_p95 = to_float(os.getenv("REQUIRED_P95_MS", "500"))
    strict = os.getenv("STRICT_PERF", "false").lower() == "true"

    aggregated = None
    with stats_file.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("Name") == "Aggregated":
                aggregated = row
                break

    if not aggregated:
        print("Aggregated row not found in locust stats")
        return 1

    current_rps = to_float(aggregated.get("Requests/s", "0"))
    current_p95 = to_float(aggregated.get("95%", "0"))
    total_requests = int(to_float(aggregated.get("Request Count", "0"), 0))
    failures = int(to_float(aggregated.get("Failure Count", "0"), 0))

    rps_ok = current_rps >= required_rps
    p95_ok = current_p95 <= required_p95
    overall_ok = rps_ok and p95_ok

    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(
        "\n".join([
            "# Performance Validation Report",
            "",
            f"- Total requests: {total_requests}",
            f"- Failure count: {failures}",
            f"- Requests/s observed: {current_rps:.2f}",
            f"- p95 latency observed (ms): {current_p95:.2f}",
            "",
            "## Targets",
            f"- Required RPS: {required_rps:.2f}",
            f"- Required p95 (ms): <= {required_p95:.2f}",
            "",
            "## Result",
            f"- RPS target met: {'YES' if rps_ok else 'NO'}",
            f"- p95 target met: {'YES' if p95_ok else 'NO'}",
            f"- Overall: {'PASS' if overall_ok else 'FAIL'}",
            "",
            f"- Strict mode: {'ENABLED' if strict else 'DISABLED'}",
            ""
        ]),
        encoding="utf-8"
    )

    print(f"Performance report written: {out_file}")
    if strict and not overall_ok:
        print("Strict performance validation failed")
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
