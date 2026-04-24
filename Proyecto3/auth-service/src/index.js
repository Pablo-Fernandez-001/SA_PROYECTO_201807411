require('dotenv').config()
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const path = require('path')
const fs = require('fs')
const http = require('http')
const logger = require('./utils/logger')
const authController = require('./controllers/authController')
const { initDatabase } = require('./config/database')

const METRICS_PORT = process.env.METRICS_PORT || 9101
const grpcCounters = {
  Register: 0,
  Login: 0,
  ValidateToken: 0,
  GetUserById: 0,
  UpdateUser: 0,
  DeleteUser: 0,
  GetAllUsers: 0,
  UpdateUserRole: 0
}
const grpcDuration = {}
const grpcDurationBuckets = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]

function createGrpcDurationState() {
  return {
    count: 0,
    sum: 0,
    buckets: grpcDurationBuckets.map(() => 0)
  }
}

function withGrpcMetric(methodName, handler) {
  return (call, callback) => {
    const startedNs = process.hrtime.bigint()
    grpcCounters[methodName] = (grpcCounters[methodName] || 0) + 1

    const wrappedCallback = (error, response) => {
      const durationSeconds = Number(process.hrtime.bigint() - startedNs) / 1e9
      const current = grpcDuration[methodName] || createGrpcDurationState()
      current.count += 1
      current.sum += durationSeconds
      for (let i = 0; i < grpcDurationBuckets.length; i += 1) {
        if (durationSeconds <= grpcDurationBuckets[i]) {
          current.buckets[i] += 1
        }
      }
      grpcDuration[methodName] = current
      callback(error, response)
    }

    return handler(call, wrappedCallback)
  }
}

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
  Register: withGrpcMetric('Register', authController.register),
  Login: withGrpcMetric('Login', authController.login),
  ValidateToken: withGrpcMetric('ValidateToken', authController.validateToken),
  GetUserById: withGrpcMetric('GetUserById', authController.getUserById),
  UpdateUser: withGrpcMetric('UpdateUser', authController.updateUser),
  DeleteUser: withGrpcMetric('DeleteUser', authController.deleteUser),
  GetAllUsers: withGrpcMetric('GetAllUsers', authController.getAllUsers),
  UpdateUserRole: withGrpcMetric('UpdateUserRole', authController.updateUserRole)
})

const PORT = process.env.PORT || 50051

function startMetricsServer() {
  const startedAt = Date.now()
  const metricsServer = http.createServer((req, res) => {
    if (req.url !== '/metrics') {
      res.writeHead(404)
      return res.end('not found')
    }

    const lines = []
    lines.push('# HELP service_up Service health status')
    lines.push('# TYPE service_up gauge')
    lines.push('service_up{service="auth-service"} 1')
    lines.push('# HELP process_uptime_seconds Process uptime in seconds')
    lines.push('# TYPE process_uptime_seconds gauge')
    lines.push(`process_uptime_seconds{service="auth-service"} ${Math.floor((Date.now() - startedAt) / 1000)}`)
    lines.push('# HELP grpc_requests_total Total gRPC calls processed')
    lines.push('# TYPE grpc_requests_total counter')

    Object.entries(grpcCounters).forEach(([method, count]) => {
      lines.push(`grpc_requests_total{service="auth-service",method="${method}"} ${count}`)
    })

    lines.push('# HELP grpc_request_duration_seconds gRPC request duration in seconds')
    lines.push('# TYPE grpc_request_duration_seconds histogram')
    Object.entries(grpcDuration).forEach(([method, metric]) => {
      grpcDurationBuckets.forEach((le, index) => {
        lines.push(`grpc_request_duration_seconds_bucket{service="auth-service",method="${method}",le="${le}"} ${metric.buckets[index]}`)
      })
      lines.push(`grpc_request_duration_seconds_bucket{service="auth-service",method="${method}",le="+Inf"} ${metric.count}`)
      lines.push(`grpc_request_duration_seconds_sum{service="auth-service",method="${method}"} ${metric.sum}`)
      lines.push(`grpc_request_duration_seconds_count{service="auth-service",method="${method}"} ${metric.count}`)
    })

    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' })
    res.end(`${lines.join('\n')}\n`)
  })

  metricsServer.listen(METRICS_PORT, '0.0.0.0', () => {
    logger.info(`Auth metrics endpoint running on port ${METRICS_PORT}`)
  })
}

async function startServer() {
  try {
    // Initialize database
    await initDatabase()
    startMetricsServer()
    
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