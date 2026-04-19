const express = require('express')
const router = express.Router()
const couponsController = require('../controllers/couponsController')

router.get('/', couponsController.getCoupons)
router.post('/', couponsController.createCoupon)
router.patch('/:id/toggle', couponsController.toggleCoupon)
router.delete('/:id', couponsController.deleteCoupon)
router.post('/validate', couponsController.validateCoupon)

module.exports = router
