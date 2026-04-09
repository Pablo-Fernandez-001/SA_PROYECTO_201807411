class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async create(user) {
    const [result] = await this.db.execute(
      `INSERT INTO users (name, email, role, is_active) VALUES (?, ?, ?, ?)` ,
      [user.name, user.email, user.role, user.is_active ?? true]
    );
    return this.findById(result.insertId);
  }

  async findAll() {
    const [rows] = await this.db.execute("SELECT * FROM users ORDER BY id DESC");
    return rows;
  }

  async findById(id) {
    const [rows] = await this.db.execute("SELECT * FROM users WHERE id = ?", [id]);
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
    await this.db.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    const [result] = await this.db.execute("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}

module.exports = UserRepository;
