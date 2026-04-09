const ROLE_VALUES = ["requester", "agent", "admin"];

function validateUserPayload(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial || payload.name !== undefined) {
    if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length < 3) {
      errors.push("name must be a string with at least 3 characters");
    }
  }

  if (!partial || payload.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.email || typeof payload.email !== "string" || !emailRegex.test(payload.email)) {
      errors.push("email must be valid");
    }
  }

  if (!partial || payload.role !== undefined) {
    if (!payload.role || !ROLE_VALUES.includes(payload.role)) {
      errors.push("role must be requester, agent or admin");
    }
  }

  if (payload.is_active !== undefined && typeof payload.is_active !== "boolean") {
    errors.push("is_active must be boolean");
  }

  return errors;
}

module.exports = {
  ROLE_VALUES,
  validateUserPayload,
};
