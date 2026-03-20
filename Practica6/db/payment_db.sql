-- ============================================================================
-- PAYMENT DATABASE - DeliverEats
-- Aislamiento de persistencia: BD exclusiva del Payment-Service
-- ============================================================================

CREATE DATABASE IF NOT EXISTS payment_db;
USE payment_db;

-- ─── Payments ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS payments;

CREATE TABLE payments (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  payment_number      VARCHAR(50) UNIQUE NOT NULL,
  order_id            INT          NOT NULL,
  user_id             INT          NOT NULL,
  amount              DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(10)  DEFAULT 'GTQ',
  amount_usd          DECIMAL(10,2),
  exchange_rate       DECIMAL(10,6) DEFAULT 1.000000,
  payment_method      ENUM('CREDIT_CARD','DEBIT_CARD') DEFAULT 'CREDIT_CARD',
  card_last_four      VARCHAR(4)   DEFAULT '0000',
  transaction_id      VARCHAR(100) UNIQUE,
  status              ENUM('PENDIENTE','COMPLETADO','FALLIDO','REEMBOLSADO') DEFAULT 'PENDIENTE',
  refund_reason       TEXT,
  original_payment_id INT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order    (order_id),
  INDEX idx_user     (user_id),
  INDEX idx_status   (status),
  INDEX idx_txn      (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
