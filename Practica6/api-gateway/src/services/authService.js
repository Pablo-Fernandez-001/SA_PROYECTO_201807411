const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const path = require('path')
const fs = require('fs')

class AuthServiceClient {
  constructor() {
    // Try Docker path first (/app/protos/), then local development path
    let protoPath = path.join(__dirname, '../../protos/auth.proto')
    if (!fs.existsSync(protoPath)) {
      protoPath = path.join(__dirname, '../../../protos/auth.proto')
    }
    
    this.packageDefinition = protoLoader.loadSync(
      protoPath,
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      }
    )
    
    this.authProto = grpc.loadPackageDefinition(this.packageDefinition).auth
    this.client = new this.authProto.AuthService(
      process.env.AUTH_SERVICE_URL || 'auth-service:50051',
      grpc.credentials.createInsecure()
    )
  }

  async register(userData) {
    return new Promise((resolve, reject) => {
      this.client.Register(userData, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }

  async login(credentials) {
    return new Promise((resolve, reject) => {
      this.client.Login(credentials, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }

  async validateToken(token) {
    return new Promise((resolve, reject) => {
      this.client.ValidateToken({ token }, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }

  async getUserById(userId) {
    return new Promise((resolve, reject) => {
      this.client.GetUserById({ id: userId }, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      this.client.GetAllUsers({}, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }

  async updateUser(userId, userData) {
    return new Promise((resolve, reject) => {
      this.client.UpdateUser({ id: userId, ...userData }, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }

  async updateUserRole(userId, role) {
    return new Promise((resolve, reject) => {
      this.client.UpdateUserRole({ id: userId, role }, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }

  async deleteUser(userId) {
    return new Promise((resolve, reject) => {
      this.client.DeleteUser({ id: userId }, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }
}

module.exports = new AuthServiceClient()