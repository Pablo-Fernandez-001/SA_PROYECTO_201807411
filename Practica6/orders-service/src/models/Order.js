/**
 * Order Model - SOA Pattern
 * Represents orders in the order management system
 */

const { v4: uuidv4 } = require('uuid');

class Order {
  constructor(data = {}) {
    this.id = data.id || null;
    this.orderNumber = data.order_number || data.orderNumber || this.generateOrderNumber();
    this.userId = data.user_id || data.userId || null;
    this.restaurantId = data.restaurant_id || data.restaurantId || null;
    this.status = data.status || Order.STATUS.CREADA;
    this.total = data.total || 0;
    this.deliveryAddress = data.delivery_address || data.deliveryAddress || '';
    this.notes = data.notes || '';
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
    
    // Related data
    this.items = data.items || [];
    this.userName = data.user_name || data.userName || null;
    this.restaurantName = data.restaurant_name || data.restaurantName || null;
  }

  // Order statuses
  static STATUS = {
    CREADA: 'CREADA',
    PAGADO: 'PAGADO',
    EN_PROCESO: 'EN_PROCESO',
    FINALIZADA: 'FINALIZADA',
    EN_CAMINO: 'EN_CAMINO',
    ENTREGADO: 'ENTREGADO',
    CANCELADO: 'CANCELADO',
    RECHAZADA: 'RECHAZADA',
    REEMBOLSADO: 'REEMBOLSADO'
  };

  /**
   * Generate unique order number
   * @returns {string}
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Validate order data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate(isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      if (!this.userId) {
        errors.push('User ID is required');
      }
      
      if (!this.restaurantId) {
        errors.push('Restaurant ID is required');
      }
      
      if (!this.items || this.items.length === 0) {
        errors.push('Order must have at least one item');
      }
    }

    if (this.status && !Object.values(Order.STATUS).includes(this.status)) {
      errors.push(`Invalid status. Must be one of: ${Object.values(Order.STATUS).join(', ')}`);
    }

    if (this.total !== undefined && (typeof this.total !== 'number' || this.total < 0)) {
      errors.push('Total must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate total from items
   */
  calculateTotal() {
    this.total = this.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    return this.total;
  }

  /**
   * Check if order can transition to new status
   * @param {string} newStatus
   * @returns {boolean}
   */
  canTransitionTo(newStatus) {
    const validTransitions = {
      [Order.STATUS.CREADA]: [Order.STATUS.EN_PROCESO, Order.STATUS.CANCELADO, Order.STATUS.RECHAZADA],
      [Order.STATUS.PAGADO]: [Order.STATUS.EN_PROCESO, Order.STATUS.CANCELADO, Order.STATUS.RECHAZADA, Order.STATUS.REEMBOLSADO],
      [Order.STATUS.EN_PROCESO]: [Order.STATUS.FINALIZADA, Order.STATUS.CANCELADO, Order.STATUS.RECHAZADA],
      [Order.STATUS.FINALIZADA]: [Order.STATUS.EN_CAMINO, Order.STATUS.CANCELADO],
      [Order.STATUS.EN_CAMINO]: [Order.STATUS.ENTREGADO, Order.STATUS.CANCELADO],
      [Order.STATUS.ENTREGADO]: [Order.STATUS.REEMBOLSADO],
      [Order.STATUS.CANCELADO]: [Order.STATUS.REEMBOLSADO],
      [Order.STATUS.RECHAZADA]: [Order.STATUS.REEMBOLSADO],
      [Order.STATUS.REEMBOLSADO]: []
    };
    
    return validTransitions[this.status]?.includes(newStatus) || false;
  }

  /**
   * Convert to plain object for database operations
   * @returns {Object}
   */
  toDatabase() {
    const data = {
      order_number: this.orderNumber,
      user_id: this.userId,
      restaurant_id: this.restaurantId,
      restaurant_name: this.restaurantName,
      status: this.status,
      total: this.total,
      delivery_address: this.deliveryAddress,
      notes: this.notes
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
      orderNumber: this.orderNumber,
      userId: this.userId,
      userName: this.userName,
      restaurantId: this.restaurantId,
      restaurantName: this.restaurantName,
      status: this.status,
      total: this.total,
      deliveryAddress: this.deliveryAddress,
      delivery_address: this.deliveryAddress,
      notes: this.notes,
      items: this.items,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to summary JSON (for listings)
   * @returns {Object}
   */
  toSummary() {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      restaurantId: this.restaurantId,
      restaurantName: this.restaurantName,
      status: this.status,
      total: this.total,
      deliveryAddress: this.deliveryAddress,
      delivery_address: this.deliveryAddress,
      notes: this.notes,
      items: this.items,
      createdAt: this.createdAt,
      created_at: this.createdAt
    };
  }

  /**
   * Create Order instance from database row
   * @param {Object} row - Database row
   * @returns {Order}
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Order({
      id: row.id,
      order_number: row.order_number,
      user_id: row.user_id,
      user_name: row.user_name,
      restaurant_id: row.restaurant_id,
      restaurant_name: row.restaurant_name,
      status: row.status,
      total: parseFloat(row.total),
      delivery_address: row.delivery_address,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
}

module.exports = Order;
