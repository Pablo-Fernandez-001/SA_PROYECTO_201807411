const { getPool } = require('../config/database');
const { Delivery } = require('../models');
const logger = require('../utils/logger');
const axios = require('axios');

// Helper — lazy pool access
const db = () => getPool();

// Service URLs
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://orders-service:3003';

/**
 * Sync order status in orders-service (fire-and-forget)
 * Also passes extra data for notifications (driverName, reason, etc.)
 */
async function syncOrderStatus(orderExternalId, status, extraData = {}) {
  try {
    await axios.patch(`${ORDERS_SERVICE_URL}/api/orders/${orderExternalId}/status`, { status, ...extraData }, { timeout: 5000 });
    logger.info(`[Delivery→Orders] Synced order ${orderExternalId} to ${status}`);
  } catch (error) {
    logger.warn(`[Delivery→Orders] Failed to sync order ${orderExternalId}: ${error.message}`);
  }
}


/**
 * Get all deliveries
 */
exports.getAllDeliveries = async (req, res) => {
  try {
    const [rows] = await db().query(`
      SELECT * FROM deliveries ORDER BY id DESC
    `);
    
    const deliveries = rows.map(row => Delivery.fromDatabase(row).toJSON());
    res.json(deliveries);
  } catch (error) {
    logger.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Error fetching deliveries' });
  }
};

/**
 * Get deliveries by courier
 */
exports.getDeliveriesByCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
    
    const [rows] = await db().query(
      'SELECT * FROM deliveries WHERE courier_id = ? ORDER BY id DESC',
      [courierId]
    );

    const deliveries = rows.map(row => Delivery.fromDatabase(row).toJSON());
    res.json(deliveries);
  } catch (error) {
    logger.error('Error fetching courier deliveries:', error);
    res.status(500).json({ error: 'Error fetching deliveries' });
  }
};

/**
 * Get active deliveries by courier
 */
exports.getActiveDeliveriesByCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
    
    const [rows] = await db().query(
      `SELECT * FROM deliveries 
       WHERE courier_id = ? AND status IN ('ASIGNADO', 'EN_CAMINO')
       ORDER BY id DESC`,
      [courierId]
    );

    const deliveries = rows.map(row => Delivery.fromDatabase(row).toJSON());
    res.json(deliveries);
  } catch (error) {
    logger.error('Error fetching active deliveries:', error);
    res.status(500).json({ error: 'Error fetching deliveries' });
  }
};

/**
 * Get delivery by ID
 */
exports.getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db().query('SELECT * FROM deliveries WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const delivery = Delivery.fromDatabase(rows[0]);
    res.json(delivery.toJSON());
  } catch (error) {
    logger.error('Error fetching delivery:', error);
    res.status(500).json({ error: 'Error fetching delivery' });
  }
};

/**
 * Get delivery by order ID
 */
exports.getDeliveryByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const [rows] = await db().query(
      'SELECT * FROM deliveries WHERE order_external_id = ?',
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found for this order' });
    }

    const delivery = Delivery.fromDatabase(rows[0]);
    res.json(delivery.toJSON());
  } catch (error) {
    logger.error('Error fetching delivery:', error);
    res.status(500).json({ error: 'Error fetching delivery' });
  }
};

/**
 * Create new delivery (assign courier to order)
 */
exports.createDelivery = async (req, res) => {
  try {
    const delivery = new Delivery(req.body);
    
    const validation = delivery.validate();
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // Check if delivery already exists for this order
    const [existing] = await db().query(
      'SELECT id FROM deliveries WHERE order_external_id = ?',
      [delivery.orderExternalId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Delivery already assigned for this order' });
    }

    const dbData = delivery.toDatabase();
    const [result] = await db().query(
      'INSERT INTO deliveries (order_external_id, courier_id, status, started_at, delivered_at) VALUES (?, ?, ?, ?, ?)',
      [dbData.order_external_id, dbData.courier_id, dbData.status, dbData.started_at, dbData.delivered_at]
    );

    delivery.id = result.insertId;
    logger.info(`Delivery created for order ${delivery.orderExternalId} (ID: ${delivery.id})`);
    
    res.status(201).json(delivery.toJSON());
  } catch (error) {
    logger.error('Error creating delivery:', error);
    res.status(500).json({ error: 'Error creating delivery' });
  }
};

/**
 * Start delivery (courier picks up order)
 */
exports.startDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const delivery = Delivery.fromDatabase(existing[0]);
    
    if (!delivery.start()) {
      return res.status(400).json({ 
        error: `Cannot start delivery with status ${delivery.status}` 
      });
    }

    await db().query(
      'UPDATE deliveries SET status = ?, started_at = ? WHERE id = ?',
      [delivery.status, delivery.startedAt, id]
    );

    logger.info(`Delivery ${id} started — order ${delivery.orderExternalId} EN_CAMINO`);

    // Sync order status to EN_CAMINO (orders-service handles notification)
    syncOrderStatus(delivery.orderExternalId, 'EN_CAMINO', { driverName: req.body.driverName || 'Repartidor asignado' });

    res.json(delivery.toJSON());
  } catch (error) {
    logger.error('Error starting delivery:', error);
    res.status(500).json({ error: 'Error starting delivery' });
  }
};

/**
 * Complete delivery — REQUIRES photo evidence
 */
exports.completeDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { photo, photoContentType } = req.body;

    // Photo is MANDATORY for completing a delivery
    if (!photo) {
      return res.status(400).json({ 
        error: 'Se requiere fotografía de evidencia para marcar como entregado. Envía el campo "photo" en base64.' 
      });
    }
    
    const [existing] = await db().query('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const delivery = Delivery.fromDatabase(existing[0]);
    
    if (!delivery.complete()) {
      return res.status(400).json({ 
        error: `Cannot complete delivery with status ${delivery.status}` 
      });
    }

    // Save photo evidence
    await db().query(
      'UPDATE deliveries SET status = ?, delivered_at = ?, photo_evidence = ?, photo_content_type = ? WHERE id = ?',
      [delivery.status, delivery.deliveredAt, photo, photoContentType || 'image/jpeg', id]
    );

    logger.info(`Delivery ${id} completed with photo evidence — order ${delivery.orderExternalId} ENTREGADO`);

    // Sync order status to ENTREGADO
    syncOrderStatus(delivery.orderExternalId, 'ENTREGADO');

    res.json({ ...delivery.toJSON(), hasPhoto: true });
  } catch (error) {
    logger.error('Error completing delivery:', error);
    res.status(500).json({ error: 'Error completing delivery' });
  }
};

/**
 * Mark delivery as failed (entrega fallida)
 */
exports.failDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Se requiere motivo de fallo' });
    }

    const [existing] = await db().query('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const delivery = Delivery.fromDatabase(existing[0]);
    
    if (!delivery.fail(reason)) {
      return res.status(400).json({ 
        error: `Cannot mark as failed delivery with status ${delivery.status}` 
      });
    }

    await db().query(
      'UPDATE deliveries SET status = ?, failure_reason = ? WHERE id = ?',
      [delivery.status, reason, id]
    );

    logger.info(`Delivery ${id} marked as FAILED — order ${delivery.orderExternalId} — reason: ${reason}`);

    // Sync order status to CANCELADO
    syncOrderStatus(delivery.orderExternalId, 'CANCELADO', {
      reason: `Entrega fallida: ${reason}`,
      providerName: 'Repartidor',
      providerType: 'REPARTIDOR'
    });

    res.json({ message: 'Entrega marcada como fallida', delivery: delivery.toJSON() });
  } catch (error) {
    logger.error('Error failing delivery:', error);
    res.status(500).json({ error: 'Error marking delivery as failed' });
  }
};

/**
 * Get delivery photo by delivery ID
 */
exports.getDeliveryPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db().query(
      'SELECT photo_evidence, photo_content_type FROM deliveries WHERE id = ?',
      [id]
    );

    if (rows.length === 0 || !rows[0].photo_evidence) {
      return res.status(404).json({ error: 'Foto no encontrada para esta entrega' });
    }

    res.json({
      photo: rows[0].photo_evidence,
      contentType: rows[0].photo_content_type || 'image/jpeg'
    });
  } catch (error) {
    logger.error('Error fetching delivery photo:', error);
    res.status(500).json({ error: 'Error fetching photo' });
  }
};

/**
 * Get delivery photo by order ID
 */
exports.getPhotoByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const [rows] = await db().query(
      'SELECT photo_evidence, photo_content_type FROM deliveries WHERE order_external_id = ? AND photo_evidence IS NOT NULL',
      [orderId]
    );

    if (rows.length === 0 || !rows[0].photo_evidence) {
      return res.status(404).json({ error: 'Foto no encontrada para esta orden' });
    }

    res.json({
      photo: rows[0].photo_evidence,
      contentType: rows[0].photo_content_type || 'image/jpeg'
    });
  } catch (error) {
    logger.error('Error fetching photo by order:', error);
    res.status(500).json({ error: 'Error fetching photo' });
  }
};

/**
 * Cancel delivery
 */
exports.cancelDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const delivery = Delivery.fromDatabase(existing[0]);
    
    if (!delivery.cancel()) {
      return res.status(400).json({ 
        error: `Cannot cancel delivery with status ${delivery.status}` 
      });
    }

    await db().query(
      'UPDATE deliveries SET status = ? WHERE id = ?',
      [delivery.status, id]
    );

    logger.info(`Delivery ${id} cancelled — order ${delivery.orderExternalId} CANCELADO`);

    // Sync order status to CANCELADO (orders-service handles notification)
    syncOrderStatus(delivery.orderExternalId, 'CANCELADO', {
      reason: 'Cancelado por el repartidor',
      providerName: 'Repartidor',
      providerType: 'REPARTIDOR'
    });

    res.json({ message: 'Delivery cancelled successfully', delivery: delivery.toJSON() });
  } catch (error) {
    logger.error('Error cancelling delivery:', error);
    res.status(500).json({ error: 'Error cancelling delivery' });
  }
};

/**
 * Reassign delivery to different courier
 */
exports.reassignDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { courierId } = req.body;
    
    if (!courierId) {
      return res.status(400).json({ error: 'New courier ID is required' });
    }

    const [existing] = await db().query('SELECT * FROM deliveries WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const delivery = Delivery.fromDatabase(existing[0]);
    
    // Can only reassign if not completed or cancelled
    if ([Delivery.STATUS.ENTREGADO, Delivery.STATUS.CANCELADO].includes(delivery.status)) {
      return res.status(400).json({ 
        error: `Cannot reassign delivery with status ${delivery.status}` 
      });
    }

    await db().query(
      'UPDATE deliveries SET courier_id = ?, status = ? WHERE id = ?',
      [courierId, Delivery.STATUS.ASIGNADO, id]
    );

    delivery.courierId = courierId;
    delivery.status = Delivery.STATUS.ASIGNADO;
    
    logger.info(`Delivery ${id} reassigned to courier ${courierId}`);
    res.json(delivery.toJSON());
  } catch (error) {
    logger.error('Error reassigning delivery:', error);
    res.status(500).json({ error: 'Error reassigning delivery' });
  }
};

/**
 * Accept order — a REPARTIDOR accepts a FINALIZADA order
 * Creates a new delivery, assigns courier, and starts delivery (EN_CAMINO)
 */
exports.acceptOrder = async (req, res) => {
  try {
    const courierId = req.body.courier_id || req.body.courierId;
    const orderExternalId = req.body.order_external_id || req.body.orderExternalId;
    const deliveryAddress = req.body.delivery_address || req.body.deliveryAddress || '';

    if (!courierId || !orderExternalId) {
      return res.status(400).json({ error: 'courier_id and order_external_id are required' });
    }

    // Check if delivery already exists for this order
    const [existing] = await db().query(
      'SELECT id FROM deliveries WHERE order_external_id = ?',
      [orderExternalId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Esta orden ya fue aceptada por otro repartidor' });
    }

    // Create delivery with status EN_CAMINO directly (driver is starting)
    const delivery = new Delivery({
      order_external_id: orderExternalId,
      courier_id: courierId,
      status: Delivery.STATUS.EN_CAMINO,
      delivery_address: deliveryAddress
    });
    delivery.startedAt = new Date();

    const dbData = delivery.toDatabase();
    const [result] = await db().query(
      'INSERT INTO deliveries (order_external_id, courier_id, status, delivery_address, started_at) VALUES (?, ?, ?, ?, ?)',
      [dbData.order_external_id, dbData.courier_id, dbData.status, deliveryAddress, delivery.startedAt]
    );

    delivery.id = result.insertId;
    logger.info(`[acceptOrder] Repartidor ${courierId} accepted order ${orderExternalId} — delivery ${delivery.id}`);

    // Sync order status to EN_CAMINO (orders-service handles notification)
    syncOrderStatus(orderExternalId, 'EN_CAMINO', { driverName: 'Repartidor asignado' });

    res.status(201).json({
      message: 'Orden aceptada exitosamente',
      delivery: delivery.toJSON()
    });
  } catch (error) {
    logger.error('Error accepting order:', error);
    res.status(500).json({ error: 'Error accepting order' });
  }
};

/**
 * Get available orders (FINALIZADA status) for repartidores to accept
 */
exports.getAvailableOrders = async (req, res) => {
  try {
    // Get FINALIZADA orders from orders-service
    const response = await axios.get(`${ORDERS_SERVICE_URL}/api/orders`, { timeout: 5000 });
    const allOrders = response.data;

    // Filter to FINALIZADA only
    const finalizadaOrders = allOrders.filter(o => o.status === 'FINALIZADA');

    // Get all order IDs that already have deliveries
    const [deliveryRows] = await db().query('SELECT order_external_id FROM deliveries WHERE status != ?', [Delivery.STATUS.CANCELADO]);
    const assignedOrderIds = new Set(deliveryRows.map(r => r.order_external_id));

    // Only return orders without a delivery assignment
    const available = finalizadaOrders.filter(o => !assignedOrderIds.has(o.id));

    res.json(available);
  } catch (error) {
    logger.error('Error fetching available orders:', error);
    res.status(500).json({ error: 'Error fetching available orders' });
  }
};
