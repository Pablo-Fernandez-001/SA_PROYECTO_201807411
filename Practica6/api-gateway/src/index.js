require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server: SocketIOServer } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')
const logger = require('./utils/logger')
const healthRoutes = require('./routes/health')
const authRoutes = require('./routes/auth')
const catalogRoutes = require('./routes/catalog')
const orderRoutes = require('./routes/orders')
const deliveryRoutes = require('./routes/delivery')
const fxRoutes = require('./routes/fx')
const paymentRoutes = require('./routes/payment')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 8080

// ── HTTP server + Socket.IO ─────────────────────────────────────────────────
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
})

// Make io accessible from routes via req.app
app.set('io', io)

io.on('connection', (socket) => {
  logger.info(`[Socket.IO] Client connected: ${socket.id}`)

  // Join rooms based on role
  socket.on('join', (room) => {
    socket.join(room)
    logger.info(`[Socket.IO] ${socket.id} joined room: ${room}`)
  })

  socket.on('disconnect', () => {
    logger.info(`[Socket.IO] Client disconnected: ${socket.id}`)
  })
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://34.55.27.36:3000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
})
app.use(limiter)

app.use(morgan('combined', { stream: { write: message => logger.info(message) } }))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Health check - both routes for compatibility
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'api-gateway' 
  })
})

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'api-gateway' 
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/delivery', deliveryRoutes)
app.use('/api/fx', fxRoutes)
app.use('/api/payments', paymentRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  })
})

// Error handler
app.use(errorHandler)

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`API Gateway running on port ${PORT}`)
  logger.info(`Socket.IO listening on port ${PORT}`)
})

module.exports = app