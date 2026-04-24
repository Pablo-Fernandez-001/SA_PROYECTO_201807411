function createMetricsTracker(serviceName) {
  const startedAt = Date.now();
  const counters = new Map();
  const latencyHistograms = new Map();
  const histogramBuckets = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  function key(method, route, status) {
    return `${method}|${route}|${status}`;
  }

  function normalizePath(path) {
    if (!path) return "unknown";
    return path.replace(/\d+/g, ":id");
  }

  function middleware(req, res, next) {
    if (req.path === "/metrics") {
      return next();
    }
    const startedNs = process.hrtime.bigint();
    const route = normalizePath(req.path);
    res.on("finish", () => {
      const k = key(req.method, route, res.statusCode);
      counters.set(k, (counters.get(k) || 0) + 1);

      const durationSeconds = Number(process.hrtime.bigint() - startedNs) / 1e9;
      const hk = key(req.method, route, res.statusCode);
      const current = latencyHistograms.get(hk) || {
        count: 0,
        sum: 0,
        buckets: histogramBuckets.map(() => 0),
      };
      current.count += 1;
      current.sum += durationSeconds;
      for (let i = 0; i < histogramBuckets.length; i += 1) {
        if (durationSeconds <= histogramBuckets[i]) {
          current.buckets[i] += 1;
        }
      }
      latencyHistograms.set(hk, current);
    });
    next();
  }

  function handler(req, res) {
    const lines = [];
    lines.push("# HELP service_up Service health status");
    lines.push("# TYPE service_up gauge");
    lines.push(`service_up{service=\"${serviceName}\"} 1`);
    lines.push("# HELP process_uptime_seconds Process uptime in seconds");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(`process_uptime_seconds{service=\"${serviceName}\"} ${Math.floor((Date.now() - startedAt) / 1000)}`);
    lines.push("# HELP http_requests_total Total HTTP requests processed");
    lines.push("# TYPE http_requests_total counter");

    for (const [k, v] of counters.entries()) {
      const [method, route, status] = k.split("|");
      lines.push(`http_requests_total{service=\"${serviceName}\",method=\"${method}\",route=\"${route}\",status=\"${status}\"} ${v}`);
    }

    lines.push("# HELP http_request_duration_seconds HTTP request duration in seconds");
    lines.push("# TYPE http_request_duration_seconds histogram");
    for (const [k, v] of latencyHistograms.entries()) {
      const [method, route, status] = k.split("|");
      for (let i = 0; i < histogramBuckets.length; i += 1) {
        const le = histogramBuckets[i];
        lines.push(
          `http_request_duration_seconds_bucket{service=\"${serviceName}\",method=\"${method}\",route=\"${route}\",status=\"${status}\",le=\"${le}\"} ${v.buckets[i]}`
        );
      }
      lines.push(
        `http_request_duration_seconds_bucket{service=\"${serviceName}\",method=\"${method}\",route=\"${route}\",status=\"${status}\",le=\"+Inf\"} ${v.count}`
      );
      lines.push(
        `http_request_duration_seconds_sum{service=\"${serviceName}\",method=\"${method}\",route=\"${route}\",status=\"${status}\"} ${v.sum}`
      );
      lines.push(
        `http_request_duration_seconds_count{service=\"${serviceName}\",method=\"${method}\",route=\"${route}\",status=\"${status}\"} ${v.count}`
      );
    }

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(`${lines.join("\n")}\n`);
  }

  return { middleware, handler };
}

module.exports = { createMetricsTracker };
