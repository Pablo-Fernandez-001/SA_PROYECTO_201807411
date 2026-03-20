/**
 * OrderItem Model - SOA Pattern
 * Represents items within an order
 */

class OrderItem {
  constructor(data = {}) {
    this.id = data.id || null;
    this.orderId = data.order_id || data.orderId || null;
    this.menuItemExternalId = data.menu_item_external_id || data.menuItemExternalId || null;
    this.name = data.name || '';
    this.price = data.price || 0;
    this.quantity = data.quantity || 1;
    this.subtotal = data.subtotal || (this.price * this.quantity);
  }

  /**
   * Validate order item data
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.menuItemExternalId) {
      errors.push('Menu item ID is required');
    }

    if (!this.name || this.name.trim() === '') {
      errors.push('Item name is required');
    }

    if (this.price === undefined || this.price === null || this.price < 0) {
      errors.push('Price must be a positive number');
    }

    if (!this.quantity || this.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate subtotal
   * @returns {number}
   */
  calculateSubtotal() {
    this.subtotal = this.price * this.quantity;
    return this.subtotal;
  }

  /**
   * Convert to plain object for database operations
   * @returns {Object}
   */
  toDatabase() {
    const data = {
      order_id: this.orderId,
      menu_item_external_id: this.menuItemExternalId,
      name: this.name,
      price: this.price,
      quantity: this.quantity,
      subtotal: this.subtotal
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
      orderId: this.orderId,
      menuItemExternalId: this.menuItemExternalId,
      name: this.name,
      price: this.price,
      quantity: this.quantity,
      subtotal: this.subtotal
    };
  }

  /**
   * Create OrderItem instance from database row
   * @param {Object} row - Database row
   * @returns {OrderItem}
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new OrderItem({
      id: row.id,
      order_id: row.order_id,
      menu_item_external_id: row.menu_item_external_id,
      name: row.name,
      price: parseFloat(row.price),
      quantity: row.quantity,
      subtotal: parseFloat(row.subtotal)
    });
  }

  /**
   * Create OrderItem from cart item (frontend format)
   * @param {Object} cartItem
   * @returns {OrderItem}
   */
  static fromCartItem(cartItem) {
    return new OrderItem({
      menuItemExternalId: cartItem.menu_item_id || cartItem.id || cartItem.menuItemId || cartItem.menuItemExternalId,
      name: cartItem.name || `Item ${cartItem.menu_item_id || cartItem.id}`,
      price: cartItem.unit_price || cartItem.price,
      quantity: cartItem.quantity
    });
  }
}

module.exports = OrderItem;
