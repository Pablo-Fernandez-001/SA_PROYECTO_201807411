const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Joi = require('joi')
const { getConnection } = require('../config/database')
const logger = require('../utils/logger')

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('ADMIN', 'CLIENTE', 'RESTAURANTE', 'REPARTIDOR').required()
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

class AuthController {
  async register(call, callback) {
    try {
      logger.info('Register request received:', { email: call.request.email })
      
      const { error, value } = registerSchema.validate(call.request)
      if (error) {
        logger.error('Validation error:', error.details[0].message)
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: error.details[0].message
        })
      }

      const { name, email, password, role } = value
      const connection = getConnection()

      // Check if user already exists
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      )

      if (existingUser.length > 0) {
        logger.error('User already exists:', email)
        return callback({
          code: 6, // ALREADY_EXISTS
          message: 'User with this email already exists'
        })
      }

      // Get role ID
      const [roleResult] = await connection.execute(
        'SELECT id FROM roles WHERE name = ?',
        [role]
      )

      if (roleResult.length === 0) {
        logger.error('Invalid role:', role)
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'Invalid role'
        })
      }

      const roleId = roleResult[0].id

      // Hash password
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Create user
      const [result] = await connection.execute(
        'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, roleId]
      )

      const userId = result.insertId

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: userId, 
          email, 
          role,
          name 
        },
        process.env.JWT_SECRET || 'delivereats_super_secret_jwt_key_2024',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      )

      const user = {
        id: userId,
        name,
        email,
        role,
        is_active: true,
        created_at: new Date().toISOString()
      }

      logger.info(`User registered successfully: ${email}`)

      callback(null, {
        user,
        token,
        message: 'User registered successfully'
      })

    } catch (error) {
      logger.error('Registration error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }

  async login(call, callback) {
    try {
      const { error, value } = loginSchema.validate(call.request)
      if (error) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: error.details[0].message
        })
      }

      const { email, password } = value
      const connection = getConnection()

      // Get user with role
      const [users] = await connection.execute(`
        SELECT u.id, u.name, u.email, u.password, u.is_active, r.name as role
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.email = ?
      `, [email])

      if (users.length === 0) {
        return callback({
          code: 5, // NOT_FOUND
          message: 'Invalid credentials'
        })
      }

      const user = users[0]

      if (!user.is_active) {
        return callback({
          code: 7, // PERMISSION_DENIED
          message: 'Este usuario está inactivado, consulte al administrador admin@delivereats.com'
        })
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return callback({
          code: 5, // NOT_FOUND
          message: 'Invalid credentials'
        })
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          name: user.name 
        },
        process.env.JWT_SECRET || 'delivereats_super_secret_jwt_key_2024',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      )

      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }

      logger.info(`User logged in successfully: ${email}`)

      callback(null, {
        user: userData,
        token,
        message: 'Login successful'
      })

    } catch (error) {
      logger.error('Login error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }

  async validateToken(call, callback) {
    try {
      const { token } = call.request

      if (!token) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'Token is required'
        })
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'delivereats_super_secret_jwt_key_2024')
      
      const connection = getConnection()

      // Verify user still exists and is active
      const [users] = await connection.execute(`
        SELECT u.id, u.name, u.email, u.is_active, r.name as role
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
      `, [decoded.id])

      if (users.length === 0 || !users[0].is_active) {
        return callback({
          code: 16, // UNAUTHENTICATED
          message: 'Invalid token'
        })
      }

      const user = users[0]

      callback(null, {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: new Date().toISOString()
        }
      })

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return callback({
          code: 16, // UNAUTHENTICATED
          message: 'Invalid or expired token'
        })
      }

      logger.error('Token validation error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }

  async getUserById(call, callback) {
    try {
      const { id } = call.request

      if (!id) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'User ID is required'
        })
      }

      const connection = getConnection()

      const [users] = await connection.execute(`
        SELECT u.id, u.name, u.email, u.is_active, r.name as role, u.created_at
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
      `, [id])

      if (users.length === 0) {
        return callback({
          code: 5, // NOT_FOUND
          message: 'User not found'
        })
      }

      const user = users[0]

      callback(null, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at
        }
      })

    } catch (error) {
      logger.error('Get user error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }

  async updateUser(call, callback) {
    try {
      const { id, name, email, is_active } = call.request

      if (!id) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'User ID is required'
        })
      }

      const connection = getConnection()

      // Check if user exists
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE id = ?',
        [id]
      )

      if (existingUser.length === 0) {
        return callback({
          code: 5, // NOT_FOUND
          message: 'User not found'
        })
      }

      // Update user
      const updateFields = []
      const updateValues = []

      // Only update if value is provided and not empty string
      if (name && name.trim() !== '') {
        updateFields.push('name = ?')
        updateValues.push(name)
      }

      if (email && email.trim() !== '') {
        updateFields.push('email = ?')
        updateValues.push(email)
      }

      // For boolean, check if it's explicitly set (not undefined)
      if (typeof is_active === 'boolean') {
        updateFields.push('is_active = ?')
        updateValues.push(is_active)
      }

      if (updateFields.length === 0) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'No fields to update'
        })
      }

      updateValues.push(id)

      await connection.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      )

      // Get updated user
      const [users] = await connection.execute(`
        SELECT u.id, u.name, u.email, r.name as role
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
      `, [id])

      const user = users[0]

      logger.info(`User updated successfully: ${user.email}`)

      callback(null, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        message: 'User updated successfully'
      })

    } catch (error) {
      logger.error('Update user error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }

  async deleteUser(call, callback) {
    try {
      const { id } = call.request

      if (!id) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'User ID is required'
        })
      }

      const connection = getConnection()

      // Hard delete - permanently remove user
      const [result] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      )

      if (result.affectedRows === 0) {
        return callback({
          code: 5, // NOT_FOUND
          message: 'User not found'
        })
      }

      logger.info(`User deleted permanently: ID ${id}`)

      callback(null, {
        success: true,
        message: 'User deleted permanently'
      })

    } catch (error) {
      logger.error('Delete user error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }

  async getAllUsers(call, callback) {
    try {
      const connection = getConnection()

      // Get all users with their roles
      const [users] = await connection.execute(`
        SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at, r.name as role
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        ORDER BY u.created_at DESC
      `)

      const userList = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at ? user.created_at.toISOString() : '',
        updated_at: user.updated_at ? user.updated_at.toISOString() : ''
      }))

      logger.info(`Retrieved ${userList.length} users`)

      callback(null, {
        users: userList
      })

    } catch (error) {
      logger.error('Get all users error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }

  async updateUserRole(call, callback) {
    try {
      const { id, role } = call.request

      if (!id || !role) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'User ID and role are required'
        })
      }

      const connection = getConnection()

      // Get role ID
      const [roleResult] = await connection.execute(
        'SELECT id FROM roles WHERE name = ?',
        [role]
      )

      if (roleResult.length === 0) {
        return callback({
          code: 3, // INVALID_ARGUMENT
          message: 'Invalid role'
        })
      }

      const roleId = roleResult[0].id

      // Update user role
      const [result] = await connection.execute(
        'UPDATE users SET role_id = ? WHERE id = ?',
        [roleId, id]
      )

      if (result.affectedRows === 0) {
        return callback({
          code: 5, // NOT_FOUND
          message: 'User not found'
        })
      }

      // Get updated user
      const [users] = await connection.execute(`
        SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.name as role
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
      `, [id])

      const user = users[0]

      logger.info(`User role updated successfully: ${user.email} -> ${role}`)

      callback(null, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at ? user.created_at.toISOString() : ''
        },
        message: 'User role updated successfully'
      })

    } catch (error) {
      logger.error('Update user role error:', error)
      callback({
        code: 13, // INTERNAL
        message: 'Internal server error'
      })
    }
  }
}

module.exports = new AuthController()