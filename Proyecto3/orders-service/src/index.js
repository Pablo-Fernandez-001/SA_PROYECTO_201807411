require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const { initDatabase } = require('./config/database');
const { connectRabbitMQ } = require('./messaging/rabbitmqPublisher');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'orders-service', timestamp: new Date().toISOString() });
});

// Routes
const orderRoutes = require('./routes/orders');

app.use('/api/orders', orderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── Bootstrap: DB → RabbitMQ → REST ─────────────────────────────────────────
async function start() {
  try {
    await initDatabase();
    await connectRabbitMQ();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Orders REST API running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start orders service:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
