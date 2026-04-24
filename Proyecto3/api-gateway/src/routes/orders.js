const express = require('express')
const axios = require('axios')
const { authMiddleware, authorize } = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

const ORDERS_URL = `http://${process.env.ORDERS_SERVICE_URL || 'orders-service:3003'}`
  .replace(':50053', ':3003')

// Get all orders (admin) or user orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${ORDERS_URL}/api/orders`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Orders proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener órdenes' })
  }
})

// Get orders by user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${ORDERS_URL}/api/orders/user/${req.params.userId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Orders proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener órdenes del usuario' })
  }
})

// Get orders by restaurant
router.get('/restaurant/:restaurantId', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${ORDERS_URL}/api/orders/restaurant/${req.params.restaurantId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Orders proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener órdenes del restaurante' })
  }
})

// Create order — triggers gRPC validation in orders-service
router.post('/', authMiddleware, authorize(['CLIENTE', 'ADMIN']), async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      userId: req.user.id // inject authenticated user ID
    }
    const { data } = await axios.post(`${ORDERS_URL}/api/orders`, orderData)

    // Emit real-time event
    const io = req.app.get('io')
    io.emit('order:created', { order: data.order || data, userId: req.user.id, restaurantId: req.body.restaurantId })

    logger.info('Order created', {
      orderId: data.order.id,
      restaurantId: data.order.restaurant_id,
      totalAmount: data.order.total_amount,
      userId: data.order.user_id
    })

    res.status(201).json(data) // forward full response (includes validation info)
  } catch (error) {
    logger.error('Orders proxy error (create):', error.message)
    // Forward the detailed error from orders-service (gRPC validation errors)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(502).json({ success: false, message: 'Error al crear la orden' })
  }
})

// Get order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${ORDERS_URL}/api/orders/${req.params.id}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Orders proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener la orden' })
  }
})

// Update order status
router.patch('/:id/status', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.patch(`${ORDERS_URL}/api/orders/${req.params.id}/status`, req.body)

    // Emit real-time event
    const io = req.app.get('io')
    io.emit('order:statusChanged', { orderId: parseInt(req.params.id), newStatus: req.body.status, data })

    res.json({ success: true, data })
  } catch (error) {
    logger.error('Orders proxy error (status):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al actualizar estado' })
  }
})

// Cancel order (CLIENT can cancel their own orders)
router.post('/:id/cancel', authMiddleware, authorize(['CLIENTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${ORDERS_URL}/api/orders/${req.params.id}/cancel`)

    // Emit real-time event
    const io = req.app.get('io')
    io.emit('order:statusChanged', { orderId: parseInt(req.params.id), newStatus: 'CANCELADO', data })

    res.json({ success: true, data })
  } catch (error) {
    logger.error('Orders proxy error (cancel):', error.message)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al cancelar la orden' })
  }
})

// Reject order (RESTAURANT rejects order)
router.post('/:id/reject', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${ORDERS_URL}/api/orders/${req.params.id}/reject`, req.body)

    // Emit real-time event
    const io = req.app.get('io')
    io.emit('order:statusChanged', { orderId: parseInt(req.params.id), newStatus: 'RECHAZADA', data })

    res.json({ success: true, data })
  } catch (error) {
    logger.error('Orders proxy error (reject):', error.message)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al rechazar la orden' })
  }
})

// Reject stale orders (auto-rejected after 1 hour)
router.post('/reject-stale', async (req, res) => {
  try {
    // Buscar órdenes PENDIENTE/CONFIRMADA hace > 1 hora
    const staleOrders = await Order.findAll({
      where: {
        status: ['PENDING', 'CONFIRMED'],
        createdAt: {
          [Op.lt]: new Date(Date.now() - 60 * 60 * 1000) // Hace 1 hora
        }
      }
    });
    
    // Rechazarlas
    await Promise.all(
      staleOrders.map(order => 
        order.update({ 
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: 'Auto-rejected by system after 1 hour'
        })
      )
    );
    
    res.json({ 
      success: true, 
      rejectedCount: staleOrders.length 
    });
  } catch (error) {
    logger.error('Error rejecting stale orders', error);
    res.status(500).json({ error: 'Failed to reject stale orders' });
  }
})

module.exports = router