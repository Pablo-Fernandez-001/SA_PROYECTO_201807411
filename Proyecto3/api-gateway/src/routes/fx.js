const express = require('express')
const axios = require('axios')
const { authMiddleware, authorize } = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

const FX_URL = `http://${process.env.FX_SERVICE_URL || 'fx-service:5000'}`

// GET exchange rate
router.get('/rate', async (req, res) => {
  try {
    const { data } = await axios.get(`${FX_URL}/api/fx/rate`, { params: req.query })
    res.json({ success: true, data })
  } catch (error) {
    logger.error('FX proxy error (rate):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener tasa de cambio' })
  }
})

// GET multiple rates
router.get('/rates', async (req, res) => {
  try {
    const { data } = await axios.get(`${FX_URL}/api/fx/rates`, { params: req.query })
    res.json({ success: true, data })
  } catch (error) {
    logger.error('FX proxy error (rates):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener tasas' })
  }
})

// POST convert amount
router.post('/convert', async (req, res) => {
  try {
    const { data } = await axios.post(`${FX_URL}/api/fx/convert`, req.body)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('FX proxy error (convert):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al convertir monto' })
  }
})

// GET supported currencies
router.get('/currencies', async (req, res) => {
  try {
    const { data } = await axios.get(`${FX_URL}/api/fx/currencies`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('FX proxy error (currencies):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener monedas' })
  }
})

// GET cache stats (admin only)
router.get('/cache/stats', authMiddleware, authorize(['ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.get(`${FX_URL}/api/fx/cache/stats`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('FX proxy error (cache stats):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener stats de caché' })
  }
})

module.exports = router
