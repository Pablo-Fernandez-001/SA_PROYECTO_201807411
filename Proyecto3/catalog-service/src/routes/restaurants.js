const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const logger = require('../utils/logger');

// Middleware de logging para todas las rutas de restaurantes
router.use((req, res, next) => {
  logger.info(`[restaurants route] ${req.method} ${req.path} - Body:`, req.body);
  next();
});

// GET all restaurants
router.get('/', restaurantController.getAllRestaurants);

// GET restaurant by ID
router.get('/:id', restaurantController.getRestaurantById);

// GET restaurants by owner
router.get('/owner/:ownerId', restaurantController.getRestaurantsByOwner);

// POST create restaurant
router.post('/', restaurantController.createRestaurant);

// PUT update restaurant
router.put('/:id', restaurantController.updateRestaurant);

// DELETE restaurant (soft delete)
router.delete('/:id', restaurantController.deleteRestaurant);

// PATCH toggle restaurant active status
router.patch('/:id/toggle', restaurantController.toggleRestaurant);

module.exports = router;
