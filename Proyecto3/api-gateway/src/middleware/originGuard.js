function buildAllowedOrigins() {
  const base = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ].filter(Boolean);

  const extra = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return new Set([...base, ...extra]);
}

function originGuard(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  const allowed = buildAllowedOrigins();
  if (allowed.has(origin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Origin not allowed"
  });
}

module.exports = { originGuard };
