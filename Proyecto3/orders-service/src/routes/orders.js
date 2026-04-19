const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// GET all orders
router.get('/', orderController.getAllOrders);

// GET orders by user
router.get('/user/:userId', orderController.getOrdersByUser);

// GET orders by restaurant
router.get('/restaurant/:restaurantId', orderController.getOrdersByRestaurant);

// GET order by order number
router.get('/number/:orderNumber', orderController.getOrderByNumber);

// GET order by ID
router.get('/:id', orderController.getOrderById);

// POST create order
router.post('/', orderController.createOrder);

// PATCH update order status
router.patch('/:id/status', orderController.updateOrderStatus);

// POST cancel order
router.post('/:id/cancel', orderController.cancelOrder);

// POST reject order (restaurant rejects)
router.post('/:id/reject', orderController.rejectOrder);

module.exports = router;
