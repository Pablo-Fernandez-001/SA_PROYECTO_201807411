const { getPool } = require('../config/database')
const logger = require('../utils/logger')

const db = () => getPool()

exports.createRestaurantRating = async (req, res) => {
  try {
    const { restaurantId, orderId, userId, rating, comment } = req.body
    if (!restaurantId || !orderId || !userId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const [result] = await db().query(
      `INSERT INTO restaurant_ratings (restaurant_id, order_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`
      , [restaurantId, orderId, userId, rating, comment || null]
    )

    const [rows] = await db().query('SELECT * FROM restaurant_ratings WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (error) {
    logger.error('Error creating restaurant rating:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Rating already exists for this order' })
    }
    res.status(500).json({ error: 'Error creating rating' })
  }
}

exports.getRestaurantRatingSummary = async (req, res) => {
  try {
    const { restaurantId } = req.params
    const [rows] = await db().query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total
       FROM restaurant_ratings
       WHERE restaurant_id = ?`
      , [restaurantId]
    )
    const [recent] = await db().query(
      `SELECT rating, comment, created_at
       FROM restaurant_ratings
       WHERE restaurant_id = ?
       ORDER BY created_at DESC
       LIMIT 10`
      , [restaurantId]
    )
    res.json({
      restaurantId: parseInt(restaurantId),
      average: rows[0].avg_rating ? parseFloat(rows[0].avg_rating) : 0,
      total: rows[0].total || 0,
      recent
    })
  } catch (error) {
    logger.error('Error fetching restaurant ratings:', error)
    res.status(500).json({ error: 'Error fetching ratings' })
  }
}

exports.createMenuItemRating = async (req, res) => {
  try {
    const { menuItemId, orderId, userId, rating, comment } = req.body
    if (!menuItemId || !orderId || !userId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const [result] = await db().query(
      `INSERT INTO menu_item_ratings (menu_item_id, order_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`
      , [menuItemId, orderId, userId, rating, comment || null]
    )

    const [rows] = await db().query('SELECT * FROM menu_item_ratings WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (error) {
    logger.error('Error creating menu item rating:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Rating already exists for this order' })
    }
    res.status(500).json({ error: 'Error creating rating' })
  }
}

exports.getMenuItemRatingSummary = async (req, res) => {
  try {
    const { menuItemId } = req.params
    const [rows] = await db().query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total
       FROM menu_item_ratings
       WHERE menu_item_id = ?`
      , [menuItemId]
    )
    const [recent] = await db().query(
      `SELECT rating, comment, created_at
       FROM menu_item_ratings
       WHERE menu_item_id = ?
       ORDER BY created_at DESC
       LIMIT 10`
      , [menuItemId]
    )
    res.json({
      menuItemId: parseInt(menuItemId),
      average: rows[0].avg_rating ? parseFloat(rows[0].avg_rating) : 0,
      total: rows[0].total || 0,
      recent
    })
  } catch (error) {
    logger.error('Error fetching menu item ratings:', error)
    res.status(500).json({ error: 'Error fetching ratings' })
  }
}
