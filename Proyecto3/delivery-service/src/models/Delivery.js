/**
 * Delivery Model - SOA Pattern
 * Represents deliveries in the delivery management system
 */

class Delivery {
  constructor(data = {}) {
    this.id = data.id || null;
    this.orderExternalId = data.order_external_id || data.orderExternalId || null;
    this.courierId = data.courier_id || data.courierId || null;
    this.status = data.status || Delivery.STATUS.ASIGNADO;
    this.startedAt = data.started_at || data.startedAt || null;
    this.deliveredAt = data.delivered_at || data.deliveredAt || null;
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
    
    // Photo evidence (base64)
    this.photoEvidence = data.photo_evidence || data.photoEvidence || null;
    this.photoContentType = data.photo_content_type || data.photoContentType || null;
    this.failureReason = data.failure_reason || data.failureReason || null;
    
    // Related data (from other services)
    this.courierName = data.courier_name || data.courierName || null;
    this.orderNumber = data.order_number || data.orderNumber || null;
    this.deliveryAddress = data.delivery_address || data.deliveryAddress || null;
  }

  // Delivery statuses
  static STATUS = {
    ASIGNADO: 'ASIGNADO',
    EN_CAMINO: 'EN_CAMINO',
    ENTREGADO: 'ENTREGADO',
    CANCELADO: 'CANCELADO',
    FALLIDO: 'FALLIDO'
  };

  /**
   * Validate delivery data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate(isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      if (!this.orderExternalId) {
        errors.push('Order ID is required');
      }
      
      if (!this.courierId) {
        errors.push('Courier ID is required');
      }
    }

    if (this.status && !Object.values(Delivery.STATUS).includes(this.status)) {
      errors.push(`Invalid status. Must be one of: ${Object.values(Delivery.STATUS).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if delivery can transition to new status
   * @param {string} newStatus
   * @returns {boolean}
   */
  canTransitionTo(newStatus) {
    const validTransitions = {
      [Delivery.STATUS.ASIGNADO]: [Delivery.STATUS.EN_CAMINO, Delivery.STATUS.CANCELADO],
      [Delivery.STATUS.EN_CAMINO]: [Delivery.STATUS.ENTREGADO, Delivery.STATUS.CANCELADO, Delivery.STATUS.FALLIDO],
      [Delivery.STATUS.ENTREGADO]: [],
      [Delivery.STATUS.CANCELADO]: [],
      [Delivery.STATUS.FALLIDO]: []
    };
    
    return validTransitions[this.status]?.includes(newStatus) || false;
  }

  /**
   * Start delivery (set started timestamp)
   */
  start() {
    if (this.status === Delivery.STATUS.ASIGNADO) {
      this.status = Delivery.STATUS.EN_CAMINO;
      this.startedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Complete delivery (set delivered timestamp)
   */
  complete() {
    if (this.status === Delivery.STATUS.EN_CAMINO) {
      this.status = Delivery.STATUS.ENTREGADO;
      this.deliveredAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Cancel delivery
   */
  cancel() {
    if (this.canTransitionTo(Delivery.STATUS.CANCELADO)) {
      this.status = Delivery.STATUS.CANCELADO;
      return true;
    }
    return false;
  }

  /**
   * Calculate delivery duration in minutes
   * @returns {number|null}
   */
  getDurationMinutes() {
    if (this.startedAt && this.deliveredAt) {
      const start = new Date(this.startedAt);
      const end = new Date(this.deliveredAt);
      return Math.round((end - start) / (1000 * 60));
    }
    return null;
  }

  /**
   * Mark delivery as failed
   */
  fail(reason) {
    if (this.canTransitionTo(Delivery.STATUS.FALLIDO)) {
      this.status = Delivery.STATUS.FALLIDO;
      this.failureReason = reason;
      return true;
    }
    return false;
  }

  /**
   * Convert to plain object for database operations
   * @returns {Object}
   */
  toDatabase() {
    const data = {
      order_external_id: this.orderExternalId,
      courier_id: this.courierId,
      status: this.status,
      started_at: this.startedAt,
      delivered_at: this.deliveredAt,
      photo_evidence: this.photoEvidence,
      photo_content_type: this.photoContentType,
      failure_reason: this.failureReason
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
      orderExternalId: this.orderExternalId,
      orderNumber: this.orderNumber,
      courierId: this.courierId,
      courierName: this.courierName,
      status: this.status,
      deliveryAddress: this.deliveryAddress,
      hasPhoto: !!this.photoEvidence,
      photoContentType: this.photoContentType,
      failureReason: this.failureReason,
      startedAt: this.startedAt,
      deliveredAt: this.deliveredAt,
      durationMinutes: this.getDurationMinutes(),
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
      courierName: this.courierName,
      status: this.status,
      createdAt: this.createdAt
    };
  }

  /**
   * Create Delivery instance from database row
   * @param {Object} row - Database row
   * @returns {Delivery}
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Delivery({
      id: row.id,
      order_external_id: row.order_external_id,
      order_number: row.order_number,
      courier_id: row.courier_id,
      courier_name: row.courier_name,
      status: row.status,
      delivery_address: row.delivery_address,
      photo_evidence: row.photo_evidence,
      photo_content_type: row.photo_content_type,
      failure_reason: row.failure_reason,
      started_at: row.started_at,
      delivered_at: row.delivered_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
}

module.exports = Delivery;
