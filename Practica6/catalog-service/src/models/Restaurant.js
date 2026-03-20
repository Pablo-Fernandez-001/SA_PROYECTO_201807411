/**
 * Restaurant Model - SOA Pattern
 * Represents restaurants in the catalog system
 */

class Restaurant {
  constructor(data = {}) {
    this.id = data.id || null;
    this.ownerId = data.owner_id || data.ownerId || null;
    this.name = data.name || '';
    this.address = data.address || '';
    this.isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true);
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
    
    // Related data
    this.menuItems = data.menuItems || [];
    this.ownerName = data.owner_name || data.ownerName || null;
  }

  /**
   * Validate restaurant data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate(isUpdate = false) {
    const errors = [];

    if (!isUpdate || this.name !== undefined) {
      if (!this.name || this.name.trim() === '') {
        errors.push('Restaurant name is required');
      } else if (this.name.length > 100) {
        errors.push('Restaurant name must be 100 characters or less');
      }
    }

    if (!isUpdate || this.address !== undefined) {
      if (!this.address || this.address.trim() === '') {
        errors.push('Address is required');
      }
    }

    // Owner ID is optional - default to 1 if not provided
    if (!isUpdate && !this.ownerId) {
      this.ownerId = 1;
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
    const data = {
      owner_id: this.ownerId,
      name: this.name,
      address: this.address,
      is_active: this.isActive
    };

    if (this.id) {
      data.id = this.id;
    }

    return data;
  }

  /**
   * Convert to JSON for API responses
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      name: this.name,
      address: this.address,
      isActive: this.isActive,
      is_active: this.isActive,  // Include snake_case for compatibility
      menuItems: this.menuItems,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to summary JSON (without related data)
   * @returns {Object}
   */
  toSummary() {
    return {
      id: this.id,
      name: this.name,
      address: this.address,
      isActive: this.isActive,
      is_active: this.isActive  // Include snake_case for compatibility
    };
  }

  /**
   * Create Restaurant instance from database row
   * @param {Object} row - Database row
   * @returns {Restaurant}
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Restaurant({
      id: row.id,
      owner_id: row.owner_id,
      owner_name: row.owner_name,
      name: row.name,
      address: row.address,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
}

module.exports = Restaurant;
