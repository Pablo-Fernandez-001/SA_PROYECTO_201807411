const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuItemController');

// GET all menu items
router.get('/', menuItemController.getAllMenuItems);

// GET menu items by restaurant
router.get('/restaurant/:restaurantId', menuItemController.getMenuItemsByRestaurant);

// GET menu item by ID
router.get('/:id', menuItemController.getMenuItemById);

// POST create menu item
router.post('/', menuItemController.createMenuItem);

// PUT update menu item
router.put('/:id', menuItemController.updateMenuItem);

// DELETE menu item (soft delete)
router.delete('/:id', menuItemController.deleteMenuItem);

// PATCH toggle menu item availability
router.patch('/:id/toggle', menuItemController.toggleMenuItem);

module.exports = router;
