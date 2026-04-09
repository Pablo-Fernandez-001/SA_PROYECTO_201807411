CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  role ENUM('requester', 'agent', 'admin') NOT NULL DEFAULT 'requester',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, role) VALUES
('Admin Helpdesk', 'admin@helpdesk.local', 'admin'),
('Agente Nivel 1', 'agent1@helpdesk.local', 'agent'),
('Usuario Solicitante', 'requester@helpdesk.local', 'requester')
ON DUPLICATE KEY UPDATE email = VALUES(email);
