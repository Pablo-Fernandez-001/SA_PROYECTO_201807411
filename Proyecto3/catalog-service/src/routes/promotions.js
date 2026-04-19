const express = require('express')
const router = express.Router()
const promotionsController = require('../controllers/promotionsController')

router.get('/', promotionsController.getPromotions)
router.post('/', promotionsController.createPromotion)
router.patch('/:id/toggle', promotionsController.togglePromotion)
router.delete('/:id', promotionsController.deletePromotion)
router.post('/validate', promotionsController.validatePromotion)

module.exports = router
