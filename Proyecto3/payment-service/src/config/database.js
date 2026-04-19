const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool = null;

async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'payment_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    logger.info('Payment DB connected');
    connection.release();
    return pool;
  } catch (error) {
    logger.error('Payment DB connection failed:', error.message);
    throw error;
  }
}

function getPool() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

module.exports = { initDatabase, getPool };
