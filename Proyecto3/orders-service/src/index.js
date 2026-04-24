require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const { initDatabase } = require('./config/database');
const { connectRabbitMQ } = require('./messaging/rabbitmqPublisher');
const { createMetricsTracker } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 3003;
const metrics = createMetricsTracker('orders-service');

// Middleware
app.use(cors());
app.use(express.json());
app.use(metrics.middleware);

app.use((req, res, next) => {
  const startedNs = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedNs) / 1e6;
    logger.info('http_request', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2))
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'orders-service', timestamp: new Date().toISOString() });
});

app.get('/metrics', metrics.handler);

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
