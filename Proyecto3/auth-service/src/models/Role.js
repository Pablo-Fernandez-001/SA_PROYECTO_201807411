/**
 * Role Model - SOA Pattern
 * Represents user roles in the authentication system
 */

class Role {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.createdAt = data.created_at || data.createdAt || new Date();
  }

  // Available roles in the system
  static ROLES = {
    ADMIN: 'ADMIN',
    CLIENTE: 'CLIENTE',
    RESTAURANTE: 'RESTAURANTE',
    REPARTIDOR: 'REPARTIDOR'
  };

  /**
   * Validate role data
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim() === '') {
      errors.push('Role name is required');
    }

    if (this.name && !Object.values(Role.ROLES).includes(this.name)) {
      errors.push(`Invalid role. Must be one of: ${Object.values(Role.ROLES).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to plain object for database operations
   * @returns {Object}
   */
  toDatabase() {
    return {
      id: this.id,
      name: this.name,
      created_at: this.createdAt
    };
  }

  /**
   * Convert to JSON for API responses
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt
    };
  }

  /**
   * Create Role instance from database row
   * @param {Object} row - Database row
   * @returns {Role}
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Role({
      id: row.id,
      name: row.name,
      created_at: row.created_at
    });
  }
}

module.exports = Role;
