const mysql = require('mysql2/promise')
const logger = require('../utils/logger')

let connection = null

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
}

async function waitForDatabase() {
  const maxRetries = 30
  let retries = 0
  
  while (retries < maxRetries) {
    try {
      const tempConnection = mysql.createPool({
        ...dbConfig,
        database: undefined // Connect without specific database first
      })
      
      await tempConnection.execute('SELECT 1')
      await tempConnection.end()
      logger.info('Database server is available')
      return
    } catch (error) {
      retries++
      logger.info(`Database not ready (attempt ${retries}/${maxRetries}). Waiting...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  throw new Error('Database is not available after maximum retries')
}

async function initDatabase() {
  try {
    // Wait for database server to be available
    await waitForDatabase()
    
    // First, create the database if it doesn't exist
    await createDatabaseIfNotExists()
    
    // Now connect to the specific database
    connection = mysql.createPool(dbConfig)
    
    // Test connection with the specific database
    await connection.execute('SELECT 1')
    logger.info('Database connected successfully')
    
    // Create tables if not exist
    await createTables()
    await seedData()
    
  } catch (error) {
    logger.error('Database connection failed:', error)
    throw error
  }
}

async function createDatabaseIfNotExists() {
  try {
    // Connect without specifying database
    const tempConnection = mysql.createPool({
      ...dbConfig,
      database: undefined
    })
    
    // Create database if it doesn't exist
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``)
    logger.info(`Database '${dbConfig.database}' created or verified`)
    
    await tempConnection.end()
  } catch (error) {
    logger.error('Error creating database:', error)
    throw error
  }
}

async function createTables() {
  try {
    // Create roles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role_id INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id),
        INDEX idx_email (email),
        INDEX idx_role_id (role_id)
      )
    `)

    logger.info('Database tables created/verified successfully')
  } catch (error) {
    logger.error('Error creating tables:', error)
    throw error
  }
}

async function seedData() {
  try {
    // Check if roles exist
    const [roles] = await connection.execute('SELECT COUNT(*) as count FROM roles')
    
    if (roles[0].count === 0) {
      // Insert default roles
      await connection.execute(`
        INSERT INTO roles (name) VALUES 
        ('ADMIN'), 
        ('CLIENTE'), 
        ('RESTAURANTE'), 
        ('REPARTIDOR')
      `)
      
      logger.info('Default roles seeded successfully')
    }
  } catch (error) {
    logger.error('Error seeding data:', error)
    throw error
  }
}

function getConnection() {
  if (!connection) {
    throw new Error('Database not initialized')
  }
  return connection
}

async function closeConnection() {
  if (connection) {
    await connection.end()
    connection = null
    logger.info('Database connection closed')
  }
}

module.exports = {
  initDatabase,
  getConnection,
  closeConnection
}