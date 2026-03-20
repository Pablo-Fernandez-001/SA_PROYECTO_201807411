const express = require('express')
const router = express.Router()
const ratingsController = require('../controllers/ratingsController')

router.post('/restaurants', ratingsController.createRestaurantRating)
router.get('/restaurants/:restaurantId', ratingsController.getRestaurantRatingSummary)

router.post('/menu-items', ratingsController.createMenuItemRating)
router.get('/menu-items/:menuItemId', ratingsController.getMenuItemRatingSummary)

module.exports = router
