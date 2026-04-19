const { getPool } = require('../config/database')
const logger = require('../utils/logger')

const db = () => getPool()

const pad2 = (n) => String(n).padStart(2, '0')
const nowSql = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

const normalizeDateInput = (value, mode = 'start') => {
  if (!value) return null
  const str = String(value).trim()
  if (str.length === 10) {
    return mode === 'end' ? `${str} 23:59:59` : `${str} 00:00:00`
  }
  return str
}

const computeDiscountAmount = (type, value, subtotal) => {
  if (!subtotal || subtotal <= 0) return 0
  if (type === 'PERCENT') {
    return (subtotal * value) / 100
  }
  return value
}

exports.getCoupons = async (req, res) => {
  try {
    const { restaurantId, active } = req.query
    const params = []
    let sql = 'SELECT * FROM coupons'
    const where = []

    if (restaurantId) {
      where.push('restaurant_id = ?')
      params.push(restaurantId)
    }
    if (active === 'true') {
      where.push('is_active = true')
    }

    if (where.length) sql += ` WHERE ${where.join(' AND ')}`
    sql += ' ORDER BY created_at DESC'

    const [rows] = await db().query(sql, params)
    res.json(rows)
  } catch (error) {
    logger.error('Error fetching coupons:', error)
    res.status(500).json({ error: 'Error fetching coupons' })
  }
}

exports.createCoupon = async (req, res) => {
  try {
    const {
      restaurantId,
      code,
      discountType,
      discountValue,
      minOrder,
      maxUses,
      restrictions,
      startsAt,
      expiresAt,
      isActive
    } = req.body

    if (!restaurantId || !code || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const [result] = await db().query(
      `INSERT INTO coupons
        (restaurant_id, code, discount_type, discount_value, min_order, max_uses, restrictions, starts_at, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [
        restaurantId,
        String(code).trim().toUpperCase(),
        discountType,
        discountValue,
        minOrder || null,
        maxUses || null,
        restrictions || null,
        normalizeDateInput(startsAt, 'start'),
        normalizeDateInput(expiresAt, 'end'),
        isActive !== undefined ? !!isActive : true
      ])

    const [rows] = await db().query('SELECT * FROM coupons WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (error) {
    logger.error('Error creating coupon:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Coupon code already exists' })
    }
    res.status(500).json({ error: 'Error creating coupon' })
  }
}

exports.toggleCoupon = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db().query('SELECT is_active FROM coupons WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'Coupon not found' })

    const newStatus = !rows[0].is_active
    await db().query('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, id])
    res.json({ id: parseInt(id), is_active: newStatus })
  } catch (error) {
    logger.error('Error toggling coupon:', error)
    res.status(500).json({ error: 'Error toggling coupon' })
  }
}

exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params
    await db().query('DELETE FROM coupons WHERE id = ?', [id])
    res.json({ message: 'Coupon deleted' })
  } catch (error) {
    logger.error('Error deleting coupon:', error)
    res.status(500).json({ error: 'Error deleting coupon' })
  }
}

exports.validateCoupon = async (req, res) => {
  try {
    const { restaurantId, code, subtotal } = req.body
    if (!restaurantId || !code || subtotal === undefined) {
      return res.status(400).json({ error: 'Missing restaurantId, code, or subtotal' })
    }

    const now = nowSql()
    const [rows] = await db().query(
      `SELECT * FROM coupons
       WHERE restaurant_id = ?
         AND code = ?
         AND is_active = true
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (
           expires_at IS NULL
           OR expires_at >= ?
           OR (TIME(expires_at) = '00:00:00' AND DATE(expires_at) >= DATE(?))
         )
         AND (max_uses IS NULL OR used_count < max_uses)
         AND (min_order IS NULL OR min_order <= ?)`
      , [restaurantId, String(code).trim().toUpperCase(), now, now, now, subtotal]
    )

    if (!rows.length) {
      return res.json({ valid: false, discountAmount: 0, coupon: null })
    }

    const coupon = rows[0]
    const discount = computeDiscountAmount(coupon.discount_type, parseFloat(coupon.discount_value), parseFloat(subtotal))
    const capped = Math.min(discount, parseFloat(subtotal))

    res.json({ valid: true, discountAmount: parseFloat(capped.toFixed(2)), coupon })
  } catch (error) {
    logger.error('Error validating coupon:', error)
    res.status(500).json({ error: 'Error validating coupon' })
  }
}
