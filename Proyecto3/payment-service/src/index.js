require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const { initDatabase } = require('./config/database');
const { createMetricsTracker } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 3006;
const metrics = createMetricsTracker('payment-service');

// Middleware
app.use(cors());
app.use(express.json());
app.use(metrics.middleware);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'payment-service', timestamp: new Date().toISOString() });
});

app.get('/metrics', metrics.handler);

// Routes
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start payment service:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
