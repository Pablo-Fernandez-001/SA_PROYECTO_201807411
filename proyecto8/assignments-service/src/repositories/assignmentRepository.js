class AssignmentRepository {
  constructor(db) {
    this.db = db;
  }

  async deactivateByTicket(ticketId) {
    await this.db.execute("UPDATE assignments SET is_active = false WHERE ticket_id = ?", [ticketId]);
  }

  async create(assignment) {
    const [result] = await this.db.execute(
      `INSERT INTO assignments (ticket_id, agent_id, assigned_by, reason, is_active)
       VALUES (?, ?, ?, ?, ?)` ,
      [
        assignment.ticket_id,
        assignment.agent_id,
        assignment.assigned_by,
        assignment.reason || null,
        assignment.is_active ?? true,
      ]
    );
    return this.findById(result.insertId);
  }

  async findAll(filters = {}) {
    let query = "SELECT * FROM assignments WHERE 1=1";
    const params = [];

    if (filters.ticket_id) {
      query += " AND ticket_id = ?";
      params.push(filters.ticket_id);
    }

    if (filters.agent_id) {
      query += " AND agent_id = ?";
      params.push(filters.agent_id);
    }

    if (filters.is_active !== undefined) {
      query += " AND is_active = ?";
      params.push(filters.is_active);
    }

    query += " ORDER BY id DESC";
    const [rows] = await this.db.execute(query, params);
    return rows;
  }

  async findById(id) {
    const [rows] = await this.db.execute("SELECT * FROM assignments WHERE id = ?", [id]);
    return rows[0] || null;
  }

  async update(id, updates) {
    const fields = [];
    const params = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value);
    });

    if (!fields.length) {
      return this.findById(id);
    }

    params.push(id);
    await this.db.execute(`UPDATE assignments SET ${fields.join(", ")} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    const [result] = await this.db.execute("DELETE FROM assignments WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}

module.exports = AssignmentRepository;
