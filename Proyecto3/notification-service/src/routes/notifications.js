const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST - Order created notification
router.post('/order-created', notificationController.orderCreated);

// POST - Order cancelled by client notification
router.post('/order-cancelled-client', notificationController.orderCancelledByClient);

// POST - Order shipped (en camino) notification
router.post('/order-shipped', notificationController.orderShipped);

// POST - Order cancelled by restaurant/driver notification
router.post('/order-cancelled-provider', notificationController.orderCancelledByProvider);

// POST - Order rejected by restaurant notification
router.post('/order-rejected', notificationController.orderRejected);

module.exports = router;
