const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'orders_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000
};

async function waitForDatabase() {
  const maxRetries = 30;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const tmp = mysql.createPool({ ...dbConfig, database: undefined });
      await tmp.execute('SELECT 1');
      await tmp.end();
      logger.info('[orders-db] Database server is available');
      return;
    } catch (err) {
      retries++;
      logger.info(`[orders-db] Not ready (attempt ${retries}/${maxRetries}). Waiting 2 s …`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('[orders-db] Database not available after maximum retries');
}

async function initDatabase() {
  await waitForDatabase();

  const tmp = mysql.createPool({ ...dbConfig, database: undefined });
  await tmp.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await tmp.end();

  pool = mysql.createPool(dbConfig);
  await pool.execute('SELECT 1');
  logger.info('[orders-db] Connected successfully');

  await createTables();
}

async function createTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      order_number    VARCHAR(50) UNIQUE NOT NULL,
      user_id         INT            NOT NULL,
      restaurant_id   INT            NOT NULL,
      restaurant_name VARCHAR(255),
      status          ENUM('CREADA','EN_PROCESO','FINALIZADA','RECHAZADA') DEFAULT 'CREADA',
      total           DECIMAL(10,2)  NOT NULL DEFAULT 0,
      delivery_address VARCHAR(500),
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user       (user_id),
      INDEX idx_restaurant (restaurant_id),
      INDEX idx_status     (status),
      INDEX idx_order_num  (order_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id                    INT AUTO_INCREMENT PRIMARY KEY,
      order_id              INT            NOT NULL,
      menu_item_external_id INT            NOT NULL,
      name                  VARCHAR(255)   NOT NULL,
      price                 DECIMAL(10,2)  NOT NULL,
      quantity              INT            NOT NULL DEFAULT 1,
      subtotal              DECIMAL(10,2)  NOT NULL,
      notes                 TEXT,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX idx_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  logger.info('[orders-db] Tables verified / created');
}

function getPool() {
  if (!pool) throw new Error('Database not initialised — call initDatabase() first');
  return pool;
}

module.exports = { initDatabase, getPool };
