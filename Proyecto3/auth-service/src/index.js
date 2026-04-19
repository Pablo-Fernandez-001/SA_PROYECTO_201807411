require('dotenv').config()
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const path = require('path')
const fs = require('fs')
const logger = require('./utils/logger')
const authController = require('./controllers/authController')
const { initDatabase } = require('./config/database')

// Try Docker path first, then local development path
let PROTO_PATH = path.join(__dirname, '../protos/auth.proto')
if (!require('fs').existsSync(PROTO_PATH)) {
  PROTO_PATH = path.join(__dirname, '../../protos/auth.proto')
}

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

const authProto = grpc.loadPackageDefinition(packageDefinition).auth

const server = new grpc.Server()

server.addService(authProto.AuthService.service, {
  Register: authController.register,
  Login: authController.login,
  ValidateToken: authController.validateToken,
  GetUserById: authController.getUserById,
  UpdateUser: authController.updateUser,
  DeleteUser: authController.deleteUser,
  GetAllUsers: authController.getAllUsers,
  UpdateUserRole: authController.updateUserRole
})

const PORT = process.env.PORT || 50051

async function startServer() {
  try {
    // Initialize database
    await initDatabase()
    
    // Start gRPC server
    server.bindAsync(
      `0.0.0.0:${PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) {
          logger.error('Failed to start server:', err)
          return
        }
        
        server.start()
        logger.info(`Auth Service running on port ${port}`)
      }
    )
  } catch (error) {
    logger.error('Failed to start auth service:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down auth service...')
  server.forceShutdown()
  process.exit(0)
})

startServer()