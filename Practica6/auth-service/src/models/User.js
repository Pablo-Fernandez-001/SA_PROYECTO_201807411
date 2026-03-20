/**
 * User Model - SOA Pattern
 * Represents users in the authentication system
 */

const bcrypt = require('bcryptjs');

class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.roleId = data.role_id || data.roleId || null;
    this.roleName = data.role_name || data.roleName || null;
    this.isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true);
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
  }

  /**
   * Validate user data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate(isUpdate = false) {
    const errors = [];

    if (!isUpdate || this.name !== undefined) {
      if (!this.name || this.name.trim() === '') {
        errors.push('Name is required');
      } else if (this.name.length > 100) {
        errors.push('Name must be 100 characters or less');
      }
    }

    if (!isUpdate || this.email !== undefined) {
      if (!this.email || this.email.trim() === '') {
        errors.push('Email is required');
      } else if (!this.isValidEmail(this.email)) {
        errors.push('Invalid email format');
      }
    }

    if (!isUpdate) {
      if (!this.password || this.password.length < 6) {
        errors.push('Password must be at least 6 characters');
      }
    }

    if (!isUpdate || this.roleId !== undefined) {
      if (!this.roleId) {
        errors.push('Role is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   * @param {string} email
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Hash the user's password
   * @param {number} rounds - bcrypt rounds
   * @returns {Promise<void>}
   */
  async hashPassword(rounds = 12) {
    if (this.password && !this.password.startsWith('$2a$')) {
      this.password = await bcrypt.hash(this.password, rounds);
    }
  }

  /**
   * Compare password with hash
   * @param {string} plainPassword
   * @returns {Promise<boolean>}
   */
  async comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  }

  /**
   * Convert to plain object for database operations
   * @returns {Object}
   */
  toDatabase() {
    const data = {
      name: this.name,
      email: this.email,
      password: this.password,
      role_id: this.roleId,
      is_active: this.isActive
    };

    if (this.id) {
      data.id = this.id;
    }

    return data;
  }

  /**
   * Convert to JSON for API responses (excludes sensitive data)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      roleId: this.roleId,
      roleName: this.roleName,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create User instance from database row
   * @param {Object} row - Database row
   * @returns {User}
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role_id: row.role_id,
      role_name: row.role_name,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
}

module.exports = User;
