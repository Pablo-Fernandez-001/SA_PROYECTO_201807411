class TicketRepository {
  constructor(db) {
    this.db = db;
  }

  async create(ticket) {
    const [result] = await this.db.execute(
      `INSERT INTO tickets (code, requester_id, title, description, priority, category, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [
        ticket.code,
        ticket.requester_id,
        ticket.title,
        ticket.description,
        ticket.priority,
        ticket.category,
        ticket.status || "OPEN",
      ]
    );

    return this.findById(result.insertId);
  }

  async findAll(filters = {}) {
    let query = "SELECT * FROM tickets WHERE 1=1";
    const params = [];

    if (filters.status) {
      query += " AND status = ?";
      params.push(filters.status);
    }

    if (filters.requester_id) {
      query += " AND requester_id = ?";
      params.push(filters.requester_id);
    }

    query += " ORDER BY id DESC";
    const [rows] = await this.db.execute(query, params);
    return rows;
  }

  async findById(id) {
    const [rows] = await this.db.execute("SELECT * FROM tickets WHERE id = ?", [id]);
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
    await this.db.execute(`UPDATE tickets SET ${fields.join(", ")} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    const [result] = await this.db.execute("DELETE FROM tickets WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}

module.exports = TicketRepository;
