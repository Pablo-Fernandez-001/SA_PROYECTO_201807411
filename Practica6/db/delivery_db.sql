-- ============================================================================
-- DELIVERY DATABASE - DeliverEats
-- Aislamiento de persistencia: BD exclusiva del Delivery-Service
-- ============================================================================

CREATE DATABASE IF NOT EXISTS delivery_db;
USE delivery_db;

-- ─── Deliveries ──────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS deliveries;

CREATE TABLE deliveries (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  order_external_id  INT          NOT NULL,
  courier_id         INT,
  status             ENUM('ASIGNADO','EN_CAMINO','ENTREGADO','CANCELADO','FALLIDO') DEFAULT 'ASIGNADO',
  delivery_address   VARCHAR(500),
  photo_evidence     LONGTEXT,
  photo_content_type VARCHAR(50),
  failure_reason     TEXT,
  started_at         TIMESTAMP NULL,
  delivered_at       TIMESTAMP NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order   (order_external_id),
  INDEX idx_courier (courier_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Ratings: Couriers ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS courier_ratings;

CREATE TABLE courier_ratings (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  courier_id INT      NOT NULL,
  order_id   INT      NOT NULL,
  user_id    INT      NOT NULL,
  rating     INT      NOT NULL,
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_courier_rating (courier_id, order_id, user_id),
  INDEX idx_courier_rating_courier (courier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
