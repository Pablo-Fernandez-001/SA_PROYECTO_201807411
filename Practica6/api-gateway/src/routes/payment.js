const express = require('express')
const axios = require('axios')
const { authMiddleware, authorize } = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

const PAYMENT_URL = `http://${process.env.PAYMENT_SERVICE_URL || 'payment-service:3006'}`

// POST process payment
router.post('/process', authMiddleware, authorize(['CLIENTE', 'ADMIN']), async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.user.id
    }
    console.log('Processing payment with data:', paymentData)
    const { data } = await axios.post(`${PAYMENT_URL}/api/payments/process`, paymentData)

    // Emit real-time event
    const io = req.app.get('io')
    io.emit('order:statusChanged', { orderId: parseInt(req.body.orderId), newStatus: 'PAGADO', data })
    io.emit('payment:processed', { orderId: req.body.orderId, data })

    res.status(201).json({ success: true, ...data })
  } catch (error) {
    logger.error('Payment proxy error (process):', error.message)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al procesar pago' })
  }
})

// POST process refund (ADMIN only)
router.post('/refund', authMiddleware, authorize(['ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${PAYMENT_URL}/api/payments/refund`, req.body)
    // Emit real-time event
    const io = req.app.get('io')
    io.emit('order:statusChanged', { orderId: parseInt(req.body.orderId), newStatus: 'REEMBOLSADO', data })
    io.emit('payment:refunded', { orderId: req.body.orderId, data })

    res.status(201).json({ success: true, ...data })
  } catch (error) {
    logger.error('Payment proxy error (refund):', error.message)
    if (error.response?.data) {
      return res.status(error.response.status).json(error.response.data)
    }
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al procesar reembolso' })
  }
})

// GET payment by order
router.get('/order/:orderId', authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get(`${PAYMENT_URL}/api/payments/order/${req.params.orderId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Payment proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener pago' })
  }
})

// GET all payments (admin)
router.get('/', authMiddleware, authorize(['ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.get(`${PAYMENT_URL}/api/payments`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Payment proxy error:', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener pagos' })
  }
})

// GET currency conversion
router.get('/fx/convert', async (req, res) => {
  try {
    const { data } = await axios.get(`${PAYMENT_URL}/api/payments/fx/convert`, { params: req.query })
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Payment proxy error (fx):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al convertir moneda' })
  }
})

module.exports = router
