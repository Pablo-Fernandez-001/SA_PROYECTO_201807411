const jwt = require('jsonwebtoken')
const logger = require('../utils/logger')

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token is required' 
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'delivereats_super_secret_jwt_key_2024')
    req.user = decoded
    next()
  } catch (error) {
    logger.error('JWT verification failed:', error.message)
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    })
  }
}

const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      })
    }

    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      })
    }

    next()
  }
}

module.exports = { authMiddleware, authorize }