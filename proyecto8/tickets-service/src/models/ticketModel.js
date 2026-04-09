const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUS_VALUES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function validateTicketPayload(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial || payload.requester_id !== undefined) {
    if (!Number.isInteger(payload.requester_id) || payload.requester_id <= 0) {
      errors.push("requester_id must be a positive integer");
    }
  }

  if (!partial || payload.title !== undefined) {
    if (!payload.title || typeof payload.title !== "string" || payload.title.trim().length < 5) {
      errors.push("title must contain at least 5 characters");
    }
  }

  if (!partial || payload.description !== undefined) {
    if (!payload.description || typeof payload.description !== "string" || payload.description.trim().length < 10) {
      errors.push("description must contain at least 10 characters");
    }
  }

  if (!partial || payload.priority !== undefined) {
    if (!payload.priority || !PRIORITY_VALUES.includes(payload.priority)) {
      errors.push("priority must be LOW, MEDIUM, HIGH or CRITICAL");
    }
  }

  if (!partial || payload.category !== undefined) {
    if (!payload.category || typeof payload.category !== "string" || payload.category.trim().length < 3) {
      errors.push("category must contain at least 3 characters");
    }
  }

  if (payload.status !== undefined && !STATUS_VALUES.includes(payload.status)) {
    errors.push("status value is invalid");
  }

  return errors;
}

module.exports = {
  PRIORITY_VALUES,
  STATUS_VALUES,
  validateTicketPayload,
};
