const { validateUserPayload } = require("../models/userModel");

class UserService {
  constructor(userRepository, eventBus) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
  }

  async createUser(payload) {
    const errors = validateUserPayload(payload);
    if (errors.length) {
      return { status: 400, body: { errors } };
    }

    const created = await this.userRepository.create(payload);
    await this.eventBus.publish("user.created", {
      type: "user.created",
      occurred_at: new Date().toISOString(),
      data: created,
    });

    return { status: 201, body: created };
  }

  async getUsers() {
    return this.userRepository.findAll();
  }

  async getUserById(id) {
    return this.userRepository.findById(id);
  }

  async updateUser(id, payload) {
    const errors = validateUserPayload(payload, { partial: true });
    if (errors.length) {
      return { status: 400, body: { errors } };
    }

    const exists = await this.userRepository.findById(id);
    if (!exists) {
      return { status: 404, body: { message: "user not found" } };
    }

    const updated = await this.userRepository.update(id, payload);
    await this.eventBus.publish("user.updated", {
      type: "user.updated",
      occurred_at: new Date().toISOString(),
      data: updated,
    });

    return { status: 200, body: updated };
  }

  async deleteUser(id) {
    const exists = await this.userRepository.findById(id);
    if (!exists) {
      return { status: 404, body: { message: "user not found" } };
    }

    await this.userRepository.delete(id);
    await this.eventBus.publish("user.deleted", {
      type: "user.deleted",
      occurred_at: new Date().toISOString(),
      data: { id },
    });

    return { status: 204, body: null };
  }
}

module.exports = UserService;
