const express = require('express')
const router = express.Router()
const ratingsController = require('../controllers/ratingsController')

router.post('/couriers', ratingsController.createCourierRating)
router.get('/couriers/:courierId', ratingsController.getCourierRatingSummary)

module.exports = router
