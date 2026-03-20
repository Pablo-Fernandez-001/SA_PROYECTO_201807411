const { getPool } = require('../config/database')
const logger = require('../utils/logger')

const db = () => getPool()

exports.searchCatalog = async (req, res) => {
  try {
    const {
      q,
      category,
      foodType,
      promotions,
      includeMenu,
      restaurantId
    } = req.query

    const params = []
    const where = []

    const hasPromoSql = `EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.restaurant_id = r.id
        AND p.is_active = true
        AND (p.starts_at IS NULL OR p.starts_at <= NOW())
        AND (p.expires_at IS NULL OR p.expires_at >= NOW())
    )`

    if (q) {
      where.push('(r.name LIKE ? OR r.description LIKE ? OR EXISTS (SELECT 1 FROM menu_items miq WHERE miq.restaurant_id = r.id AND (miq.name LIKE ? OR miq.description LIKE ?)))')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }

    if (foodType) {
      where.push('EXISTS (SELECT 1 FROM menu_items mif WHERE mif.restaurant_id = r.id AND mif.category = ?)')
      params.push(foodType)
    }

    if (restaurantId) {
      where.push('r.id = ?')
      params.push(restaurantId)
    }

    if (category) {
      if (category === 'new') {
        where.push('r.created_at >= (NOW() - INTERVAL 30 DAY)')
      } else if (category === 'featured') {
        where.push(`(${hasPromoSql} OR avg_r.avg_rating >= 4.3)`) 
      } else if (category === 'top') {
        where.push('avg_r.avg_rating >= 4.5')
      }
    }

    if (promotions === 'true') {
      where.push(hasPromoSql)
    }

    let sql = `
      SELECT r.*, 
             COALESCE(avg_r.avg_rating, 0) AS avg_rating,
             COALESCE(avg_r.total, 0) AS rating_count,
             ${hasPromoSql} AS has_promo
      FROM restaurants r
      LEFT JOIN (
        SELECT restaurant_id, AVG(rating) AS avg_rating, COUNT(*) AS total
        FROM restaurant_ratings
        GROUP BY restaurant_id
      ) avg_r ON avg_r.restaurant_id = r.id
    `

    if (where.length) {
      sql += ` WHERE ${where.join(' AND ')}`
    }

    sql += ' ORDER BY r.is_active DESC, r.name'

    const [restaurants] = await db().query(sql, params)

    let menuItems = []
    if (includeMenu === 'true') {
      const ids = restaurants.map(r => r.id)
      if (ids.length > 0) {
        const miParams = []
        let miWhere = `mi.restaurant_id IN (${ids.map(() => '?').join(',')})`
        miParams.push(...ids)

        if (q) {
          miWhere += ' AND (mi.name LIKE ? OR mi.description LIKE ?)'
          miParams.push(`%${q}%`, `%${q}%`)
        }

        if (foodType) {
          miWhere += ' AND mi.category = ?'
          miParams.push(foodType)
        }

        const [rows] = await db().query(
          `SELECT mi.*, 
                  COALESCE(avg_m.avg_rating, 0) AS avg_rating,
                  COALESCE(avg_m.total, 0) AS rating_count
           FROM menu_items mi
           LEFT JOIN (
             SELECT menu_item_id, AVG(rating) AS avg_rating, COUNT(*) AS total
             FROM menu_item_ratings
             GROUP BY menu_item_id
           ) avg_m ON avg_m.menu_item_id = mi.id
           WHERE ${miWhere}
           ORDER BY mi.name` ,
          miParams
        )
        menuItems = rows
      }
    }

    res.json({ restaurants, menuItems })
  } catch (error) {
    logger.error('Error searching catalog:', error)
    res.status(500).json({ error: 'Error searching catalog' })
  }
}
