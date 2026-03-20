/**
 * MenuItem Model - SOA Pattern
 * Represents menu items for restaurants
 */

class MenuItem {
  constructor(data = {}) {
    this.id = data.id || null;
    this.restaurantId = data.restaurant_id || data.restaurantId || null;
    this.name = data.name || '';
    this.description = data.description || '';
    // Ensure price is always a number
    this.price = typeof data.price === 'string' ? parseFloat(data.price) : (data.price || 0);
    this.stock = data.stock !== undefined ? parseInt(data.stock) : 100;
    this.isAvailable = data.is_available !== undefined ? data.is_available : (data.isAvailable !== undefined ? data.isAvailable : true);
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
    
    // Related data
    this.restaurantName = data.restaurant_name || data.restaurantName || null;
  }

  /**
   * Validate menu item data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate(isUpdate = false) {
    const errors = [];

    if (!isUpdate || this.name !== undefined) {
      if (!this.name || this.name.trim() === '') {
        errors.push('Item name is required');
      } else if (this.name.length > 100) {
        errors.push('Item name must be 100 characters or less');
      }
    }

    if (!isUpdate || this.price !== undefined) {
      if (this.price === undefined || this.price === null) {
        errors.push('Price is required');
      } else if (typeof this.price !== 'number' || this.price < 0) {
        errors.push('Price must be a positive number');
      }
    }

    if (!isUpdate) {
      if (!this.restaurantId) {
        errors.push('Restaurant ID is required');
      }
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
      restaurant_id: this.restaurantId,
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      is_available: this.isAvailable
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
      restaurantId: this.restaurantId,
      restaurantName: this.restaurantName,
      name: this.name,
      description: this.description,
      stock: this.stock,
      price: this.price,
      isAvailable: this.isAvailable,
      is_available: this.isAvailable,  // Include snake_case for compatibility
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to order item format (for denormalization)
   * @param {number} quantity
   * @returns {Object}
   */
  toOrderItem(quantity) {
    return {
      menuItemExternalId: this.id,
      name: this.name,
      price: this.price,
      quantity: quantity,
      subtotal: this.price * quantity
    };
  }

  /**
   * Create MenuItem instance from database row
   * @param {Object} row - Database row
   * @returns {MenuItem}
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new MenuItem({
      id: row.id,
      restaurant_id: row.restaurant_id,
      restaurant_name: row.restaurant_name,
      name: row.name,
      description: row.description,
      stock: row.stock,
      price: parseFloat(row.price),
      is_available: row.is_available,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
}

module.exports = MenuItem;
