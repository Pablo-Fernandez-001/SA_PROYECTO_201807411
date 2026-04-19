require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'delivery-service', timestamp: new Date().toISOString() });
});

const deliveryRoutes = require('./routes/deliveries');
const ratingsRoutes = require('./routes/ratings');
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/ratings', ratingsRoutes);

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
      logger.info(`Delivery REST API running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start delivery service:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
