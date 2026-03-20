const express = require('express')
const { body, validationResult } = require('express-validator')
const authService = require('../services/authService')
const { authMiddleware } = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    })
  }
  next()
}

// Register
router.post('/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['CLIENTE', 'RESTAURANTE', 'REPARTIDOR']).withMessage('Invalid role')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await authService.register(req.body)
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          token: result.token
        }
      })
    } catch (error) {
      logger.error('Registration error:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      })
    }
  }
)

// Admin register - protected route for admins to register other users
router.post('/admin/register', 
  authMiddleware, // Require authentication
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['CLIENTE', 'ADMIN', 'RESTAURANTE', 'REPARTIDOR']).withMessage('Invalid role')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if requester is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can register new users'
        })
      }

      const result = await authService.register(req.body)
      
      // If the user is a RESTAURANTE, create a restaurant automatically
      if (req.body.role === 'RESTAURANTE') {
        try {
          const axios = require('axios')
          const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002'
          
          await axios.post(`${catalogUrl}/api/restaurants`, {
            name: `Restaurante ${req.body.name}`,
            address: 'Dirección por definir',
            ownerId: result.user.id
          })
          
          logger.info(`Restaurant created automatically for user ${result.user.id}`)
        } catch (catalogError) {
          logger.error('Error creating restaurant:', catalogError)
          // Don't fail the registration if restaurant creation fails
        }
      }
      
      res.status(201).json({
        success: true,
        message: `User registered successfully as ${req.body.role}`,
        data: {
          user: result.user
        }
      })
    } catch (error) {
      logger.error('Admin registration error:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      })
    }
  }
)

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await authService.login(req.body)
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token
        }
      })
    } catch (error) {
      logger.error('Login error:', error)
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      })
    }
  }
)

// Validate token
router.post('/validate',
  [
    body('token').exists().withMessage('Token is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await authService.validateToken(req.body.token)
      
      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Token validation error:', error)
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      })
    }
  }
)

// Get all users (Admin only)
router.get('/users',
  authMiddleware,
  async (req, res) => {
    try {
      // Check if requester is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can view all users'
        })
      }

      const result = await authService.getAllUsers()
      
      res.json({
        success: true,
        data: result.users
      })
    } catch (error) {
      logger.error('Get all users error:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get users'
      })
    }
  }
)

// Update user (Admin only)
router.put('/users/:id',
  authMiddleware,
  [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if requester is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can update users'
        })
      }

      const result = await authService.updateUser(parseInt(req.params.id), req.body)
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: result.user
      })
    } catch (error) {
      logger.error('Update user error:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update user'
      })
    }
  }
)

// Update user role (Admin only)
router.put('/users/:id/role',
  authMiddleware,
  [
    body('role').isIn(['CLIENTE', 'ADMIN', 'RESTAURANTE', 'REPARTIDOR']).withMessage('Invalid role')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if requester is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can update user roles'
        })
      }

      const result = await authService.updateUserRole(parseInt(req.params.id), req.body.role)
      
      res.json({
        success: true,
        message: 'User role updated successfully',
        data: result.user
      })
    } catch (error) {
      logger.error('Update user role error:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update user role'
      })
    }
  }
)

// Delete/deactivate user (Admin only)
router.delete('/users/:id',
  authMiddleware,
  async (req, res) => {
    try {
      // Check if requester is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can delete users'
        })
      }

      const result = await authService.deleteUser(parseInt(req.params.id))
      
      res.json({
        success: true,
        message: result.message || 'User deactivated successfully'
      })
    } catch (error) {
      logger.error('Delete user error:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete user'
      })
    }
  }
)

module.exports = router