const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST — Procesar pago simulado
router.post('/process', paymentController.processPayment);

// POST — Procesar reembolso
router.post('/refund', paymentController.processRefund);

// GET — Obtener pago por orden
router.get('/order/:orderId', paymentController.getPaymentByOrder);

// GET — Obtener todos los pagos
router.get('/', paymentController.getAllPayments);

// GET — Obtener pago por ID
router.get('/:id', paymentController.getPaymentById);

// GET — Conversión de moneda (proxy a fx-service)
router.get('/fx/convert', paymentController.convertCurrency);

module.exports = router;
