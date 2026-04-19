const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'catalog_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000
};

// ─── Wait for MySQL to become available ──────────────────────────────────────
async function waitForDatabase() {
  const maxRetries = 30;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const tmp = mysql.createPool({ ...dbConfig, database: undefined });
      await tmp.execute('SELECT 1');
      await tmp.end();
      logger.info('[catalog-db] Database server is available');
      return;
    } catch (err) {
      retries++;
      logger.info(`[catalog-db] Not ready (attempt ${retries}/${maxRetries}). Waiting 2 s …`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('[catalog-db] Database not available after maximum retries');
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function initDatabase() {
  await waitForDatabase();

  // Create DB if not exists
  const tmp = mysql.createPool({ ...dbConfig, database: undefined });
  await tmp.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await tmp.end();

  pool = mysql.createPool(dbConfig);
  await pool.execute('SELECT 1');
  logger.info('[catalog-db] Connected successfully');

  await createTables();
  await seedData();
}

// ─── Schema ──────────────────────────────────────────────────────────────────
async function createTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      owner_id    INT          NOT NULL,
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      address     VARCHAR(500) NOT NULL,
      phone       VARCHAR(50),
      is_active   BOOLEAN DEFAULT TRUE,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_owner (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT            NOT NULL,
      name          VARCHAR(255)   NOT NULL,
      description   TEXT,
      price         DECIMAL(10,2)  NOT NULL,
      category      VARCHAR(100),
      image_url     VARCHAR(500),
      is_available  BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      INDEX idx_restaurant (restaurant_id),
      INDEX idx_available  (is_available)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS promotions (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id  INT           NOT NULL,
      title          VARCHAR(255)  NOT NULL,
      description    TEXT,
      discount_type  ENUM('PERCENT','AMOUNT') NOT NULL,
      discount_value DECIMAL(10,2) NOT NULL,
      min_order      DECIMAL(10,2),
      max_uses       INT,
      used_count     INT           DEFAULT 0,
      restrictions   TEXT,
      starts_at      DATETIME,
      expires_at     DATETIME,
      is_active      BOOLEAN       DEFAULT TRUE,
      created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      INDEX idx_promo_restaurant (restaurant_id),
      INDEX idx_promo_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id  INT           NOT NULL,
      code           VARCHAR(50)   NOT NULL UNIQUE,
      discount_type  ENUM('PERCENT','AMOUNT') NOT NULL,
      discount_value DECIMAL(10,2) NOT NULL,
      min_order      DECIMAL(10,2),
      max_uses       INT,
      used_count     INT           DEFAULT 0,
      restrictions   TEXT,
      starts_at      DATETIME,
      expires_at     DATETIME,
      is_active      BOOLEAN       DEFAULT TRUE,
      created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      INDEX idx_coupon_restaurant (restaurant_id),
      INDEX idx_coupon_active (is_active),
      INDEX idx_coupon_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS restaurant_ratings (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id  INT           NOT NULL,
      order_id       INT           NOT NULL,
      user_id        INT           NOT NULL,
      rating         INT           NOT NULL,
      comment        TEXT,
      created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_restaurant_rating (restaurant_id, order_id, user_id),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      INDEX idx_restaurant_rating_restaurant (restaurant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS menu_item_ratings (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      menu_item_id   INT           NOT NULL,
      order_id       INT           NOT NULL,
      user_id        INT           NOT NULL,
      rating         INT           NOT NULL,
      comment        TEXT,
      created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_menu_item_rating (menu_item_id, order_id, user_id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
      INDEX idx_menu_item_rating_item (menu_item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  logger.info('[catalog-db] Tables verified / created');
}

// ─── Seed ────────────────────────────────────────────────────────────────────
async function seedData() {
  const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM restaurants');
  if (rows[0].cnt > 0) return;

  logger.info('[catalog-db] Seeding initial data …');

  await pool.execute(`
    INSERT INTO restaurants (id, owner_id, name, description, address, phone) VALUES
      (1, 3, 'Burger Palace',         'The best burgers in town',         '6ta Avenida 12-34, Zona 1',  '2234-5678'),
      (2, 3, 'Pizza Roma',            'Authentic Italian pizza',          '7ma Avenida 8-90, Zona 10',  '2345-6789'),
      (3, 3, 'Sushi Master',          'Fresh sushi and Japanese cuisine', '4ta Calle 15-20, Zona 14',   '2456-7890'),
      (4, 3, 'Taco Loco',             'Mexican street food',             '12 Calle 6-78, Zona 1',      '2567-8901'),
      (5, 3, 'Pollo Campero Express', 'Chicken & sides',                 '5ta Avenida 10-11, Zona 9',  '2678-9012')
  `);

  await pool.execute(`
    INSERT INTO menu_items (id, restaurant_id, name, description, price, category, is_available) VALUES
      (1,  1, 'Classic Burger',  'Beef patty with lettuce, tomato & special sauce', 45.00, 'Burgers', TRUE),
      (2,  1, 'Cheese Burger',   'Classic burger with melted cheddar',              50.00, 'Burgers', TRUE),
      (3,  1, 'Double Burger',   'Two beef patties with cheese',                    65.00, 'Burgers', TRUE),
      (4,  1, 'French Fries',    'Crispy golden fries',                             20.00, 'Sides',   TRUE),
      (5,  1, 'Milkshake',       'Chocolate or vanilla milkshake',                  25.00, 'Drinks',  FALSE),
      (6,  2, 'Margherita Pizza','Classic tomato, mozzarella & basil',              55.00, 'Pizzas',   TRUE),
      (7,  2, 'Pepperoni Pizza', 'Loaded with pepperoni and cheese',                65.00, 'Pizzas',   TRUE),
      (8,  2, 'Hawaiian Pizza',  'Ham and pineapple pizza',                         60.00, 'Pizzas',   TRUE),
      (9,  2, 'Garlic Bread',    'Toasted garlic bread with butter',                15.00, 'Sides',    TRUE),
      (10, 2, 'Tiramisu',        'Classic Italian dessert',                         35.00, 'Desserts', FALSE),
      (11, 3, 'California Roll', '8 pcs - crab, avocado, cucumber',                45.00, 'Rolls',  TRUE),
      (12, 3, 'Salmon Nigiri',   '4 pieces of fresh salmon',                       55.00, 'Nigiri', TRUE),
      (13, 3, 'Tempura Roll',    '8 pcs - shrimp tempura roll',                    50.00, 'Rolls',  TRUE),
      (14, 3, 'Miso Soup',       'Traditional miso soup',                          15.00, 'Soups',  TRUE),
      (15, 3, 'Dragon Roll',     'Special dragon roll with eel',                   70.00, 'Rolls',  FALSE),
      (16, 4, 'Tacos al Pastor', '3 tacos with marinated pork',                    35.00, 'Tacos',       TRUE),
      (17, 4, 'Quesadilla',      'Cheese quesadilla with guacamole',               30.00, 'Quesadillas', TRUE),
      (18, 4, 'Burrito Supreme', 'Large burrito with beans, rice & meat',           40.00, 'Burritos',    TRUE),
      (19, 4, 'Nachos',          'Nachos with cheese and jalapenos',                25.00, 'Sides',       TRUE),
      (20, 4, 'Horchata',        'Traditional rice drink',                          15.00, 'Drinks',      FALSE),
      (21, 5, 'Pollo Frito 2pc',      '2 pieces fried chicken',      30.00, 'Chicken', TRUE),
      (22, 5, 'Pollo Frito 5pc',      '5 pieces fried chicken',      65.00, 'Chicken', TRUE),
      (23, 5, 'Alitas BBQ',           'BBQ chicken wings (8 pcs)',   45.00, 'Wings',   TRUE),
      (24, 5, 'Coleslaw',             'Fresh coleslaw',              10.00, 'Sides',   TRUE),
      (25, 5, 'Papas Fritas Campero', 'Seasoned fries',              18.00, 'Sides',   FALSE)
  `);

  logger.info('[catalog-db] Seed data inserted (5 restaurants, 25 menu items)');
}

function getPool() {
  if (!pool) throw new Error('Database not initialised — call initDatabase() first');
  return pool;
}

module.exports = { initDatabase, getPool };
