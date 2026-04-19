function createMetricsTracker(serviceName) {
  const startedAt = Date.now();
  const counters = new Map();

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
    const route = normalizePath(req.path);
    res.on("finish", () => {
      const k = key(req.method, route, res.statusCode);
      counters.set(k, (counters.get(k) || 0) + 1);
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

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(`${lines.join("\n")}\n`);
  }

  return { middleware, handler };
}

module.exports = { createMetricsTracker };
