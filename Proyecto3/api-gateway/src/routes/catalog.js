const express = require('express')
const axios = require('axios')
const { authMiddleware, authorize } = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

const CATALOG_URL = `http://${process.env.CATALOG_SERVICE_URL || 'catalog-service:3002'}`
  .replace(':50052', ':3002') // ensure REST port, not gRPC

// ─── Public routes (no auth needed to browse catalog) ────────────────────────

// Get all restaurants
router.get('/restaurants', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/restaurants`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (restaurants):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener restaurantes' })
  }
})

// Advanced search & filtering
router.get('/search', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/search`, { params: req.query })
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (search):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al buscar en catálogo' })
  }
})

// Get restaurant by ID (with menu)
router.get('/restaurants/:id', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/restaurants/${req.params.id}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (restaurant):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener restaurante' })
  }
})

// Get menu items by restaurant
router.get('/restaurants/:id/menu', async (req, res) => {
  try {
    const allParam = req.query.all === 'true' ? '?all=true' : ''
    const { data } = await axios.get(`${CATALOG_URL}/api/menu-items/restaurant/${req.params.id}${allParam}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (menu):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener menú' })
  }
})

// Get all menu items
router.get('/menu-items', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/menu-items`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (menu-items):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener items del menú' })
  }
})

// ─── Promotions & Coupons (public read) ─────────────────────────────────────
router.get('/promotions', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/promotions`, { params: req.query })
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (promotions):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener promociones' })
  }
})

router.get('/coupons', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/coupons`, { params: req.query })
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (coupons):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener cupones' })
  }
})

router.post('/promotions/validate', async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/promotions/validate`, req.body)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (promotions validate):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al validar promocion' })
  }
})

router.post('/coupons/validate', async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/coupons/validate`, req.body)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (coupons validate):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al validar cupon' })
  }
})

// ─── Ratings (public read, authenticated create) ────────────────────────────
router.get('/ratings/restaurants/:restaurantId', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/ratings/restaurants/${req.params.restaurantId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (restaurant ratings):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener calificaciones' })
  }
})

router.get('/ratings/menu-items/:menuItemId', async (req, res) => {
  try {
    const { data } = await axios.get(`${CATALOG_URL}/api/ratings/menu-items/${req.params.menuItemId}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (menu item ratings):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al obtener calificaciones' })
  }
})

// ─── Protected routes ────────────────────────────────────────────────────────

// Create restaurant (RESTAURANTE role)
router.post('/restaurants', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/restaurants`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (create restaurant):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al crear restaurante' })
  }
})

// Create menu item (RESTAURANTE role)
router.post('/menu-items', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/menu-items`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (create menu item):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al crear item de menú' })
  }
})

router.post('/ratings/restaurants', authMiddleware, authorize(['CLIENTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/ratings/restaurants`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (create restaurant rating):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al calificar restaurante' })
  }
})

router.post('/ratings/menu-items', authMiddleware, authorize(['CLIENTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/ratings/menu-items`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (create menu item rating):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al calificar producto' })
  }
})

// Promotions (protected)
router.post('/promotions', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/promotions`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (create promotion):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al crear promocion' })
  }
})

router.patch('/promotions/:id/toggle', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.patch(`${CATALOG_URL}/api/promotions/${req.params.id}/toggle`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (toggle promotion):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al cambiar promocion' })
  }
})

router.delete('/promotions/:id', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.delete(`${CATALOG_URL}/api/promotions/${req.params.id}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (delete promotion):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al eliminar promocion' })
  }
})

// Coupons (protected)
router.post('/coupons', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.post(`${CATALOG_URL}/api/coupons`, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (create coupon):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al crear cupon' })
  }
})

router.patch('/coupons/:id/toggle', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.patch(`${CATALOG_URL}/api/coupons/${req.params.id}/toggle`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (toggle coupon):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al cambiar cupon' })
  }
})

router.delete('/coupons/:id', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.delete(`${CATALOG_URL}/api/coupons/${req.params.id}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (delete coupon):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: 'Error al eliminar cupon' })
  }
})

// Update restaurant
router.put('/restaurants/:id', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.put(`${CATALOG_URL}/api/restaurants/${req.params.id}`, req.body)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (update restaurant):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al actualizar restaurante' })
  }
})

// Delete restaurant
router.delete('/restaurants/:id', authMiddleware, authorize(['ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.delete(`${CATALOG_URL}/api/restaurants/${req.params.id}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (delete restaurant):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al eliminar restaurante' })
  }
})

// Toggle restaurant status
router.patch('/restaurants/:id/toggle', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.patch(`${CATALOG_URL}/api/restaurants/${req.params.id}/toggle`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (toggle restaurant):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al cambiar estado' })
  }
})

// Update menu item
router.put('/menu-items/:id', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.put(`${CATALOG_URL}/api/menu-items/${req.params.id}`, req.body)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (update menu item):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al actualizar item' })
  }
})

// Delete menu item
router.delete('/menu-items/:id', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.delete(`${CATALOG_URL}/api/menu-items/${req.params.id}`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (delete menu item):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al eliminar item' })
  }
})

// Toggle menu item availability
router.patch('/menu-items/:id/toggle', authMiddleware, authorize(['RESTAURANTE', 'ADMIN']), async (req, res) => {
  try {
    const { data } = await axios.patch(`${CATALOG_URL}/api/menu-items/${req.params.id}/toggle`)
    res.json({ success: true, data })
  } catch (error) {
    logger.error('Catalog proxy error (toggle menu item):', error.message)
    res.status(error.response?.status || 502).json({ success: false, message: error.response?.data?.error || 'Error al cambiar disponibilidad' })
  }
})

module.exports = router
