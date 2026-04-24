const express = require('express')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.get('/links', authMiddleware, async (req, res) => {
  if (!['GRAPH', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only GRAPH and ADMIN users can access observability links'
    })
  }

  return res.json({
    success: true,
    data: {
      grafana: process.env.GRAFANA_URL || '',
      kibana: process.env.KIBANA_URL || '',
      prometheus: process.env.PROMETHEUS_URL || ''
    }
  })
})

module.exports = router
