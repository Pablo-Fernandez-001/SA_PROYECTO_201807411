function validateAssignmentPayload(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial || payload.ticket_id !== undefined) {
    if (!Number.isInteger(payload.ticket_id) || payload.ticket_id <= 0) {
      errors.push("ticket_id must be a positive integer");
    }
  }

  if (!partial || payload.agent_id !== undefined) {
    if (!Number.isInteger(payload.agent_id) || payload.agent_id <= 0) {
      errors.push("agent_id must be a positive integer");
    }
  }

  if (!partial || payload.assigned_by !== undefined) {
    if (!Number.isInteger(payload.assigned_by) || payload.assigned_by <= 0) {
      errors.push("assigned_by must be a positive integer");
    }
  }

  if (payload.reason !== undefined && typeof payload.reason !== "string") {
    errors.push("reason must be string");
  }

  if (payload.is_active !== undefined && typeof payload.is_active !== "boolean") {
    errors.push("is_active must be boolean");
  }

  return errors;
}

module.exports = {
  validateAssignmentPayload,
};
