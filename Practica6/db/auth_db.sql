-- Auth Database Schema
-- CREATE DATABASE IF NOT EXISTS auth_db;
-- DROP DATABASE auth_db;
-- Note: In Docker, the database is already created by the MYSQL_DATABASE env variable
USE auth_db;

-- Drop tables if they exist to ensure clean setup
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- Create roles table
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  INDEX idx_email (email),
  INDEX idx_role_id (role_id)
);

-- Insert default roles
INSERT INTO roles (name) VALUES 
  ('ADMIN'), 
  ('CLIENTE'), 
  ('RESTAURANTE'), 
  ('REPARTIDOR');

-- Insert default users (password: admin123 for all)
-- Hash generated with bcrypt rounds=12: admin123
INSERT INTO users (name, email, password, role_id) VALUES 
  ('Administrator', 'admin@delivereats.com', '$2a$12$3StLlQIY/Y7VstL3KAXTVuIa6j7pYRxvET08jYllAxcb/f..BbXGm', 1),
  ('Test Cliente', 'cliente@test.com', '$2a$12$3StLlQIY/Y7VstL3KAXTVuIa6j7pYRxvET08jYllAxcb/f..BbXGm', 2),
  ('Test Restaurant', 'restaurant@test.com', '$2a$12$3StLlQIY/Y7VstL3KAXTVuIa6j7pYRxvET08jYllAxcb/f..BbXGm', 3),
  ('Test Delivery', 'delivery@test.com', '$2a$12$3StLlQIY/Y7VstL3KAXTVuIa6j7pYRxvET08jYllAxcb/f..BbXGm', 4);