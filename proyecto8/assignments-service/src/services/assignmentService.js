const { validateAssignmentPayload } = require("../models/assignmentModel");

class AssignmentService {
  constructor(assignmentRepository, usersClient, ticketsClient, eventBus) {
    this.assignmentRepository = assignmentRepository;
    this.usersClient = usersClient;
    this.ticketsClient = ticketsClient;
    this.eventBus = eventBus;
  }

  async createAssignment(payload) {
    const errors = validateAssignmentPayload(payload);
    if (errors.length) {
      return { status: 400, body: { errors } };
    }

    const ticket = await this.ticketsClient.getTicket(payload.ticket_id);
    if (!ticket) {
      return { status: 404, body: { message: "ticket not found" } };
    }

    if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return { status: 409, body: { message: "ticket cannot be assigned in current status" } };
    }

    const agent = await this.usersClient.getUser(payload.agent_id);
    if (!agent || agent.role !== "agent" || !agent.is_active) {
      return { status: 400, body: { message: "agent_id must belong to an active agent user" } };
    }

    const assigner = await this.usersClient.getUser(payload.assigned_by);
    if (!assigner || !["admin", "agent"].includes(assigner.role)) {
      return { status: 400, body: { message: "assigned_by must be admin or agent" } };
    }

    await this.assignmentRepository.deactivateByTicket(payload.ticket_id);
    const created = await this.assignmentRepository.create(payload);

    await this.ticketsClient.updateTicket(payload.ticket_id, { status: "ASSIGNED" });

    await this.eventBus.publish("ticket.assigned", {
      type: "ticket.assigned",
      occurred_at: new Date().toISOString(),
      data: created,
    });

    return { status: 201, body: created };
  }

  async getAssignments(filters) {
    return this.assignmentRepository.findAll(filters);
  }

  async getAssignmentById(id) {
    return this.assignmentRepository.findById(id);
  }

  async updateAssignment(id, payload) {
    const errors = validateAssignmentPayload(payload, { partial: true });
    if (errors.length) {
      return { status: 400, body: { errors } };
    }

    const exists = await this.assignmentRepository.findById(id);
    if (!exists) {
      return { status: 404, body: { message: "assignment not found" } };
    }

    const updated = await this.assignmentRepository.update(id, payload);
    await this.eventBus.publish("assignment.updated", {
      type: "assignment.updated",
      occurred_at: new Date().toISOString(),
      data: updated,
    });

    return { status: 200, body: updated };
  }

  async deleteAssignment(id) {
    const exists = await this.assignmentRepository.findById(id);
    if (!exists) {
      return { status: 404, body: { message: "assignment not found" } };
    }

    await this.assignmentRepository.delete(id);
    await this.eventBus.publish("assignment.deleted", {
      type: "assignment.deleted",
      occurred_at: new Date().toISOString(),
      data: { id },
    });

    return { status: 204, body: null };
  }
}

module.exports = AssignmentService;
