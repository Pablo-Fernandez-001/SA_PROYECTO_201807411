const express = require('express')
const axios = require('axios')
const { authMiddleware, authorize } = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

const DELIVERY_URL = `http://${process.env.DELIVERY_SERVICE_URL || 'delivery-service:3004'}`
  .replace(':50054', ':3004')

// Ratings (couriers)
router.post('/ratings/couriers', authMiddleware, authorize(['CLIENTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${DELIVERY_URL}/api/ratings/couriers`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (courier rating):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al calificar repartidor' })
  }
})

router.get('/ratings/couriers/:courierId', async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/ratings/couriers/${req.params.courierId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (courier rating get):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener calificacion' })
  }
})

// Get all deliveries
router.get('/', authMiddleware, authorize(['REPARTIDOR', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener entregas' })
  }
})

// Get available orders for repartidores (MUST be before /:id)
router.get('/available-orders', authMiddleware, authorize(['REPARTIDOR', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries/available-orders`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (available-orders):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener órdenes disponibles' })
  }
})

// Accept order (REPARTIDOR accepts available order)
router.post('/accept', authMiddleware, authorize(['REPARTIDOR', 'ADMIN']), async (req, res) => {
  try {
    const acceptData = {
      ...req.body,
      courier_id: req.user.id
    }
    const { data } = await axios.post(`${DELIVERY_URL}/api/deliveries/accept`, acceptData)

    // Emit real-time event — order accepted by driver
    const io = req.app.get('io')
    io.emit('order:statusChanged', { orderId: parseInt(req.body.orderExternalId || req.body.order_external_id), newStatus: 'EN_CAMINO', data })
    io.emit('delivery:updated', { type: 'accepted', data })

    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (accept):', error.message)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al aceptar la orden' })
  }
})

// Get deliveries by courier
router.get('/courier/:courierId', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries/courier/${req.params.courierId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener entregas del repartidor' })
  }
})

// Get delivery by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries/${req.params.id}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener entrega' })
  }
})

// Get delivery by order ID
router.get('/order/:orderId', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries/order/${req.params.orderId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener entrega por orden' })
  }
})

// Create delivery
router.post('/', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${DELIVERY_URL}/api/deliveries`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (create):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al crear entrega' })
  }
})

// Start delivery
router.post('/:id/start', authMiddleware, authorize(['REPARTIDOR', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${DELIVERY_URL}/api/deliveries/${req.params.id}/start`)

    const io = req.app.get('io')
    io.emit('order:statusChanged', { newStatus: 'EN_CAMINO', data })
    io.emit('delivery:updated', { type: 'started', deliveryId: parseInt(req.params.id), data })

    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (start):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al iniciar entrega' })
  }
})

// Complete delivery (with photo evidence)
router.post('/:id/complete', authMiddleware, authorize(['REPARTIDOR', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${DELIVERY_URL}/api/deliveries/${req.params.id}/complete`, req.body)

    const io = req.app.get('io')
    io.emit('order:statusChanged', { newStatus: 'ENTREGADO', data })
    io.emit('delivery:updated', { type: 'completed', deliveryId: parseInt(req.params.id), data })

    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (complete):', error.message)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al completar entrega' })
  }
})

// Fail delivery
router.post('/:id/fail', authMiddleware, authorize(['REPARTIDOR', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${DELIVERY_URL}/api/deliveries/${req.params.id}/fail`, req.body)

    const io = req.app.get('io')
    io.emit('order:statusChanged', { newStatus: 'CANCELADO', data })
    io.emit('delivery:updated', { type: 'failed', deliveryId: parseInt(req.params.id), data })

    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (fail):', error.message)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al reportar entrega fallida' })
  }
})

// Get delivery photo
router.get('/:id/photo', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries/${req.params.id}/photo`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (photo):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Foto no encontrada' })
  }
})

// Get delivery photo by order ID
router.get('/order/:orderId/photo', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries/order/${req.params.orderId}/photo`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (photo by order):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Foto no encontrada' })
  }
})

// Cancel delivery
router.post('/:id/cancel', authMiddleware, authorize(['REPARTIDOR', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${DELIVERY_URL}/api/deliveries/${req.params.id}/cancel`)

    const io = req.app.get('io')
    io.emit('order:statusChanged', { newStatus: 'CANCELADO', data })
    io.emit('delivery:updated', { type: 'cancelled', deliveryId: parseInt(req.params.id), data })

    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (cancel):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al cancelar entrega' })
  }
})

// Reassign delivery
router.put('/:id/reassign', authMiddleware, authorize(['ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.put(`${DELIVERY_URL}/api/deliveries/${req.params.id}/reassign`, req.body)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (reassign):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al reasignar entrega' })
  }
})

// Get active deliveries for courier
router.get('/courier/:courierId/active', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${DELIVERY_URL}/api/deliveries/courier/${req.params.courierId}/active`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Delivery proxy error (active deliveries):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener entregas activas' })
  }
})

module.exports = router
