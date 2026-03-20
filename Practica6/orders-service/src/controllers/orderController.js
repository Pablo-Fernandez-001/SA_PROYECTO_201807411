const { getPool } = require('../config/database');
const { Order, OrderItem } = require('../models');
const { validateOrderItems } = require('../grpc/catalogClient');
const { publishOrderCreated } = require('../messaging/rabbitmqPublisher');
const logger = require('../utils/logger');
const axios = require('axios');

// Helper — lazy pool access
const db = () => getPool();

// Notification service URL
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';
// Auth service gRPC URL for user info
const AUTH_SERVICE_URL = process.env.AUTH_GRPC_URL || 'auth-service:50051';

/**
 * Send notification (fire-and-forget, never blocks order flow)
 */
async function sendNotification(endpoint, data) {
  try {
    await axios.post(`${NOTIFICATION_URL}/api/notifications/${endpoint}`, data, { timeout: 5000 });
    logger.info(`[Notification] Sent ${endpoint} for order ${data.orderNumber}`);
  } catch (error) {
    logger.warn(`[Notification] Failed to send ${endpoint}: ${error.message}`);
  }
}

/**
 * Get user email by userId — queries auth_db indirectly via orders_db stored info
 * Falls back to a placeholder if not available
 */
async function getUserEmail(userId) {
  try {
    // Try to get from auth service via gRPC
    const grpc = require('@grpc/grpc-js');
    const protoLoader = require('@grpc/proto-loader');
    const path = require('path');
    const fs = require('fs');

    let PROTO_PATH = path.join(__dirname, '../../protos/auth.proto');
    if (!fs.existsSync(PROTO_PATH)) {
      PROTO_PATH = path.join(__dirname, '../../../protos/auth.proto');
    }

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
    });
    const authProto = grpc.loadPackageDefinition(packageDefinition).auth;
    const client = new authProto.AuthService(AUTH_SERVICE_URL, grpc.credentials.createInsecure());

    return new Promise((resolve) => {
      client.GetUserById({ id: userId }, { deadline: new Date(Date.now() + 5000) }, (error, response) => {
        if (error || !response?.user) {
          logger.warn(`Could not get user email for userId=${userId}: ${error?.message || 'no user'}`);
          resolve({ email: null, name: null });
        } else {
          resolve({ email: response.user.email, name: response.user.name });
        }
      });
    });
  } catch (error) {
    logger.warn(`getUserEmail error: ${error.message}`);
    return { email: null, name: null };
  }
}

/**
 * Get all orders
 */
exports.getAllOrders = async (req, res) => {
  try {
    const [rows] = await db().query(`
      SELECT * FROM orders ORDER BY created_at DESC
    `);
    
    const orders = rows.map(row => Order.fromDatabase(row).toSummary());
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
};

/**
 * Get orders by user
 */
exports.getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [rows] = await db().query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Load items for each order
    const orders = await Promise.all(rows.map(async (row) => {
      const order = Order.fromDatabase(row);
      
      // Get order items
      const [itemRows] = await db().query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      
      order.items = itemRows.map(itemRow => OrderItem.fromDatabase(itemRow).toJSON());
      
      return order.toSummary();
    }));

    res.json(orders);
  } catch (error) {
    logger.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
};

/**
 * Get orders by restaurant
 */
exports.getOrdersByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const [rows] = await db().query(
      'SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC',
      [restaurantId]
    );

    const orders = rows.map(row => Order.fromDatabase(row).toSummary());
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching restaurant orders:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
};

/**
 * Get order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [orderRows] = await db().query('SELECT * FROM orders WHERE id = ?', [id]);

    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = Order.fromDatabase(orderRows[0]);
    
    // Get order items
    const [itemRows] = await db().query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );
    
    order.items = itemRows.map(row => OrderItem.fromDatabase(row).toJSON());
    
    res.json(order.toJSON());
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Error fetching order' });
  }
};

/**
 * Get order by order number
 */
exports.getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const [orderRows] = await db().query(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = Order.fromDatabase(orderRows[0]);
    
    // Get order items
    const [itemRows] = await db().query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );
    
    order.items = itemRows.map(row => OrderItem.fromDatabase(row).toJSON());
    
    res.json(order.toJSON());
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Error fetching order' });
  }
};

/**
 * Create new order — WITH gRPC catalog validation
 *
 * Flow:
 *  1. Build order items from request body
 *  2. Call CatalogService.ValidateOrderItems via gRPC
 *     - Checks existence, belongingness, price, availability
 *  3. If validation fails → reject with detailed errors
 *  4. If validation passes → persist order + items in orders_db
 */
exports.createOrder = async (req, res) => {
  let connection;
  
  try {
    // Accept both camelCase and snake_case field names
    const userId = req.body.userId || req.body.user_id;
    const restaurantId = req.body.restaurantId || req.body.restaurant_id;
    const restaurantName = req.body.restaurantName || req.body.restaurant_name || '';
    const deliveryAddress = req.body.deliveryAddress || req.body.delivery_address || '';
    const notes = req.body.notes || '';
    const items = req.body.items;

    // ── Basic input validation ───────────────────────────────────────────────
    if (!userId || !restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos. Se requiere userId, restaurantId y al menos un item.',
        received: { userId, restaurantId, itemsCount: items?.length },
        details: []
      });
    }

    // ── Build gRPC request items ─────────────────────────────────────────────
    const grpcItems = items.map(item => ({
      menu_item_id: item.menu_item_id || item.id || item.menuItemId || item.menuItemExternalId,
      requested_price: item.unit_price || item.price || item.requested_price,
      quantity: item.quantity || 1
    }));

    // ── gRPC VALIDATION — call catalog service ──────────────────────────────
    logger.info(`[createOrder] Initiating gRPC validation — restaurant=${restaurantId}, items=${grpcItems.length}`);
    
    let validationResponse;
    try {
      validationResponse = await validateOrderItems(restaurantId, grpcItems);
    } catch (grpcError) {
      logger.error('[createOrder] gRPC communication error:', grpcError.message);
      return res.status(503).json({
        success: false,
        error: 'No se pudo comunicar con el servicio de catálogo para validar la orden. Intente nuevamente.',
        grpcError: grpcError.message
      });
    }

    // ── Handle validation failure ────────────────────────────────────────────
    if (!validationResponse.valid) {
      const failedItems = (validationResponse.item_results || [])
        .filter(r => r.error_message)
        .map(r => ({
          menuItemId: r.menu_item_id,
          itemName: r.item_name || `ID ${r.menu_item_id}`,
          exists: r.exists,
          belongsToRestaurant: r.belongs_to_restaurant,
          priceMatches: r.price_matches,
          isAvailable: r.is_available,
          currentPrice: r.current_price,
          requestedPrice: r.requested_price,
          errorMessage: r.error_message
        }));

      logger.warn(`[createOrder] ORDER REJECTED - restaurant=${restaurantId}, reason: ${validationResponse.message}`);
      logger.warn(`[createOrder] Failed items detail: ${JSON.stringify(failedItems)}`);

      return res.status(400).json({
        success: false,
        error: 'La orden no pudo ser procesada debido a errores de validación con el catálogo.',
        validationMessage: validationResponse.message,
        failedItems
      });
    }

    // Validation passed - persist the order
    logger.info(`[createOrder] gRPC validation passed - total=Q${validationResponse.total_calculated}`);

    connection = await db().getConnection();
    await connection.beginTransaction();

    // Create order items from validated data
    const orderItems = items.map(item => {
      const oi = OrderItem.fromCartItem(item);
      oi.calculateSubtotal();
      return oi;
    });

    // Use restaurant name and address from gRPC response (trusted source)
    const finalRestaurantName = validationResponse.restaurant_name || restaurantName || '';
    const finalRestaurantAddress = validationResponse.restaurant_address || '';

    // Use the server-calculated total from gRPC (trusted source)
    const order = new Order({
      userId,
      restaurantId,
      restaurantName: finalRestaurantName,
      deliveryAddress,
      notes,
      items: orderItems
    });

    order.total = validationResponse.total_calculated || order.calculateTotal();

    // Insert order
    const orderData = order.toDatabase();
    const [orderResult] = await connection.query(
      'INSERT INTO orders (order_number, user_id, restaurant_id, restaurant_name, status, total, delivery_address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [orderData.order_number, orderData.user_id, orderData.restaurant_id, finalRestaurantName, orderData.status, order.total, deliveryAddress || '', notes || '']
    );

    order.id = orderResult.insertId;

    // Insert order items
    for (const item of orderItems) {
      item.orderId = order.id;
      const itemData = item.toDatabase();
      await connection.query(
        'INSERT INTO order_items (order_id, menu_item_external_id, name, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [itemData.order_id, itemData.menu_item_external_id, itemData.name, itemData.price, itemData.quantity, itemData.subtotal]
      );
    }

    await connection.commit();

    order.items = orderItems.map(item => item.toJSON());

    logger.info(`[createOrder] ORDER CREATED - number=${order.orderNumber}, id=${order.id}, total=Q${order.total}, items=${orderItems.length}`);

    // ── PRÁCTICA 4: Publish order event to RabbitMQ ─────────────────────────
    try {
      await publishOrderCreated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId,
        restaurantName: finalRestaurantName,
        userId,
        items: orderItems.map(item => ({
          itemId: item.menuItemExternalId,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: order.total,
        deliveryAddress
      });
      logger.info(`[createOrder] Order event published to RabbitMQ - orderId=${order.id}`);
    } catch (mqError) {
      logger.error('[createOrder] Failed to publish to RabbitMQ (order still created):', mqError.message);
      // No bloqueamos la respuesta - la orden ya fue creada exitosamente
    }

    // Notification — order created
    const userInfo = await getUserEmail(userId);
    sendNotification('order-created', {
      orderNumber: order.orderNumber,
      clientEmail: userInfo.email,
      clientName: userInfo.name || 'Cliente',
      restaurantName: finalRestaurantName || 'Restaurante',
      total: order.total,
      createdAt: new Date().toISOString(),
      items: orderItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, subtotal: (i.price * i.quantity) }))
    });
    
    res.status(201).json({
      success: true,
      message: `Orden ${order.orderNumber} creada exitosamente. Validación de catálogo superada.`,
      order: order.toJSON(),
      validation: {
        catalogValidated: true,
        itemsValidated: validationResponse.item_results?.length || items.length,
        serverTotal: validationResponse.total_calculated
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('[createOrder] Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al crear la orden.',
      message: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Update order status (generic — used by restaurant/admin)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const [existing] = await db().query('SELECT * FROM orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = Order.fromDatabase(existing[0]);
    const previousStatus = order.status;
    
    if (!order.canTransitionTo(status)) {
      console.log(`[updateOrderStatus] Invalid status transition attempted: ${order.status} → ${status}`);
      return res.status(400).json({ 
        error: `Cannot transition from ${order.status} to ${status}` 
      });
    }

    await db().query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    order.status = status;
    logger.info(`Order ${order.orderNumber} status updated from ${previousStatus} to ${status}`);

    // ── Fetch order items for notification ──────────────────────
    const [orderItemRows] = await db().query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const orderItemsList = orderItemRows.map(r => ({ name: r.name, quantity: r.quantity, price: parseFloat(r.price), subtotal: parseFloat(r.subtotal) }));

    // ── Send notifications based on new status ──────────────────────
    const userInfo = await getUserEmail(order.userId);
    const notifBase = {
      orderNumber: order.orderNumber,
      clientEmail: userInfo.email,
      clientName: userInfo.name || 'Cliente',
      restaurantName: order.restaurantName || 'Restaurante',
      total: order.total,
      items: orderItemsList
    };

    if (status === Order.STATUS.EN_CAMINO) {
      sendNotification('order-shipped', { ...notifBase, driverName: req.body.driverName || 'Repartidor asignado' });
    } else if (status === Order.STATUS.CANCELADO) {
      sendNotification('order-cancelled-provider', {
        ...notifBase,
        providerName: req.body.providerName || order.restaurantName || 'Restaurante',
        providerType: req.body.providerType || 'RESTAURANTE',
        reason: req.body.reason || 'Cancelado por el restaurante'
      });
    }
    
    res.json(order.toJSON());
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ error: 'Error updating order' });
  }
};

/**
 * Cancel order — used by the CLIENT (CANCELADO status)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = Order.fromDatabase(existing[0]);
    
    if (!order.canTransitionTo(Order.STATUS.CANCELADO)) {
      return res.status(400).json({ 
        error: `No se puede cancelar una orden con estado ${order.status}` 
      });
    }

    await db().query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [Order.STATUS.CANCELADO, id]
    );

    order.status = Order.STATUS.CANCELADO;
    logger.info(`Order ${order.orderNumber} cancelled by client`);

    // Fetch order items for notification
    const [cancelItemRows] = await db().query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const cancelItemsList = cancelItemRows.map(r => ({ name: r.name, quantity: r.quantity, price: parseFloat(r.price), subtotal: parseFloat(r.subtotal) }));

    // Notification — order cancelled by client
    const userInfo = await getUserEmail(order.userId);
    sendNotification('order-cancelled-client', {
      orderNumber: order.orderNumber,
      clientEmail: userInfo.email,
      clientName: userInfo.name || 'Cliente',
      restaurantName: order.restaurantName || 'Restaurante',
      total: order.total,
      cancelledAt: new Date().toISOString(),
      items: cancelItemsList
    });
    
    res.json({ message: 'Orden cancelada exitosamente', order: order.toJSON() });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Error cancelling order' });
  }
};

/**
 * Reject order — used by the RESTAURANT (RECHAZADA status)
 */
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const [existing] = await db().query('SELECT * FROM orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = Order.fromDatabase(existing[0]);
    
    if (!order.canTransitionTo(Order.STATUS.RECHAZADA)) {
      return res.status(400).json({ 
        error: `No se puede rechazar una orden con estado ${order.status}` 
      });
    }

    await db().query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [Order.STATUS.RECHAZADA, id]
    );

    order.status = Order.STATUS.RECHAZADA;
    logger.info(`Order ${order.orderNumber} rejected by restaurant. Reason: ${reason || 'N/A'}`);

    // Fetch order items for notification
    const [rejectItemRows] = await db().query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const rejectItemsList = rejectItemRows.map(r => ({ name: r.name, quantity: r.quantity, price: parseFloat(r.price), subtotal: parseFloat(r.subtotal) }));

    // Notification — order rejected by restaurant
    const userInfo = await getUserEmail(order.userId);
    sendNotification('order-rejected', {
      orderNumber: order.orderNumber,
      clientEmail: userInfo.email,
      clientName: userInfo.name || 'Cliente',
      restaurantName: order.restaurantName || 'Restaurante',
      total: order.total,
      reason: reason || 'Rechazada por el restaurante',
      items: rejectItemsList
    });
    
    res.json({ message: 'Orden rechazada', order: order.toJSON() });
  } catch (error) {
    logger.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Error rejecting order' });
  }
};
