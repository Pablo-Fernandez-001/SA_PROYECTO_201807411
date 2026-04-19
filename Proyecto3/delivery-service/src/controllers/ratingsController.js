const { getPool } = require('../config/database')
const logger = require('../utils/logger')

const db = () => getPool()

exports.createCourierRating = async (req, res) => {
  try {
    const { courierId, orderId, userId, rating, comment } = req.body
    if (!courierId || !orderId || !userId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const [result] = await db().query(
      `INSERT INTO courier_ratings (courier_id, order_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`
      , [courierId, orderId, userId, rating, comment || null]
    )

    const [rows] = await db().query('SELECT * FROM courier_ratings WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (error) {
    logger.error('Error creating courier rating:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Rating already exists for this order' })
    }
    res.status(500).json({ error: 'Error creating rating' })
  }
}

exports.getCourierRatingSummary = async (req, res) => {
  try {
    const { courierId } = req.params
    const [rows] = await db().query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total
       FROM courier_ratings
       WHERE courier_id = ?`
      , [courierId]
    )
    const [recent] = await db().query(
      `SELECT rating, comment, created_at
       FROM courier_ratings
       WHERE courier_id = ?
       ORDER BY created_at DESC
       LIMIT 10`
      , [courierId]
    )
    res.json({
      courierId: parseInt(courierId),
      average: rows[0].avg_rating ? parseFloat(rows[0].avg_rating) : 0,
      total: rows[0].total || 0,
      recent
    })
  } catch (error) {
    logger.error('Error fetching courier ratings:', error)
    res.status(500).json({ error: 'Error fetching ratings' })
  }
}
