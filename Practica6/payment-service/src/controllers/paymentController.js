const { getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const axios = require('axios');

const db = () => getPool();

// Service URLs
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://orders-service:3003';
const FX_SERVICE_URL = process.env.FX_SERVICE_URL || 'http://fx-service:5000';

/**
 * Obtener conversión de moneda desde fx-service
 */
async function getExchangeRate(from, to) {
  try {
    const { data } = await axios.get(`${FX_SERVICE_URL}/api/fx/rate`, {
      params: { from, to },
      timeout: 5000
    });
    return data;
  } catch (error) {
    logger.warn(`[FX] No se pudo obtener tasa ${from}→${to}: ${error.message}`);
    // Fallback: tasa 1:1 si fx-service no disponible
    return { rate: 1, from_currency: from, to_currency: to, is_fallback: true };
  }
}

/**
 * Sincronizar estado de orden en orders-service
 */
async function syncOrderStatus(orderId, status) {
  try {
    await axios.patch(`${ORDERS_SERVICE_URL}/api/orders/${orderId}/status`, { status }, { timeout: 5000 });
    logger.info(`[Payment→Orders] Synced order ${orderId} → ${status}`);
  } catch (error) {
    logger.warn(`[Payment→Orders] Failed to sync order ${orderId}: ${error.message}`);
  }
}

/**
 * Procesar pago simulado
 * Body: { orderId, userId, amount, currency, paymentMethod, cardLastFour }
 */
exports.processPayment = async (req, res) => {
  try {
    const {
      orderId, userId, amount, currency = 'GTQ',
      paymentMethod = 'CREDIT_CARD', cardLastFour = '0000'
    } = req.body;

    if (!orderId || !userId || !amount) {
      return res.status(400).json({ error: 'orderId, userId y amount son requeridos' });
    }

    // Verificar que no exista un pago previo para esta orden
    const [existing] = await db().query(
      'SELECT id FROM payments WHERE order_id = ? AND status = ?',
      [orderId, 'COMPLETADO']
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Esta orden ya fue pagada' });
    }

    // Consultar fx-service para obtener monto en USD (referencia)
    let amountUSD = amount;
    let exchangeRate = 1;
    let fxData = null;

    if (currency !== 'USD') {
      fxData = await getExchangeRate(currency, 'USD');
      exchangeRate = fxData.rate;
      amountUSD = Math.round(amount * exchangeRate * 100) / 100;
    }

    // Simular procesamiento de pago (siempre exitoso en simulación)
    const transactionId = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
    const paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const [result] = await db().query(
      `INSERT INTO payments 
       (payment_number, order_id, user_id, amount, currency, amount_usd, exchange_rate, 
        payment_method, card_last_four, transaction_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETADO')`,
      [paymentNumber, orderId, userId, amount, currency, amountUSD, exchangeRate,
       paymentMethod, cardLastFour, transactionId]
    );

    // Actualizar estado de la orden a PAGADO
    await syncOrderStatus(orderId, 'PAGADO');

    const payment = {
      id: result.insertId,
      paymentNumber,
      orderId,
      userId,
      amount,
      currency,
      amountUSD,
      exchangeRate,
      paymentMethod,
      cardLastFour,
      transactionId,
      status: 'COMPLETADO',
      fxInfo: fxData ? {
        fromCache: fxData.from_cache,
        isFallback: fxData.is_fallback
      } : null
    };

    logger.info(`Pago procesado: ${paymentNumber} — Orden #${orderId} — Q${amount} (USD ${amountUSD})`);

    res.status(201).json({
      success: true,
      message: 'Pago procesado exitosamente',
      payment
    });
  } catch (error) {
    logger.error('Error procesando pago:', error);
    res.status(500).json({ error: 'Error procesando pago' });
  }
};

/**
 * Procesar reembolso
 * Body: { orderId, reason }
 */
exports.processRefund = async (req, res) => {
  try {
    const { order_id, reason = 'Reembolso aprobado por administrador' } = req.body;
    if (!order_id) {
      return res.status(400).json({ error: 'orderId es requerido' });
    }

    // Buscar pago original
    const [payments] = await db().query(
      'SELECT * FROM payments WHERE order_id = ? AND status = ?',
      [order_id, 'COMPLETADO']
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'No se encontró un pago completado para esta orden' });
    }

    const originalPayment = payments[0];

    // Crear registro de reembolso
    const refundNumber = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const refundTransactionId = `RFTXN-${uuidv4().substring(0, 8).toUpperCase()}`;

    const [result] = await db().query(
      `INSERT INTO payments 
       (payment_number, order_id, user_id, amount, currency, amount_usd, exchange_rate, 
        payment_method, card_last_four, transaction_id, status, refund_reason, original_payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REEMBOLSADO', ?, ?)`,
      [refundNumber, order_id, originalPayment.user_id, originalPayment.amount,
       originalPayment.currency, originalPayment.amount_usd, originalPayment.exchange_rate,
       originalPayment.payment_method, originalPayment.card_last_four,
       refundTransactionId, reason, originalPayment.id]
    );

    // Marcar pago original como reembolsado
    await db().query(
      'UPDATE payments SET status = ? WHERE id = ?',
      ['REEMBOLSADO', originalPayment.id]
    );

    // Actualizar estado de la orden a REEMBOLSADO
    await syncOrderStatus(order_id, 'REEMBOLSADO');

    logger.info(`💰 Reembolso procesado: ${refundNumber} — Orden #${order_id} — Q${originalPayment.amount}`);

    res.status(201).json({
      success: true,
      message: 'Reembolso procesado exitosamente',
      refund: {
        id: result.insertId,
        refundNumber,
        orderId: order_id,
        amount: parseFloat(originalPayment.amount),
        currency: originalPayment.currency,
        reason,
        transactionId: refundTransactionId,
        originalPaymentNumber: originalPayment.payment_number,
        status: 'REEMBOLSADO'
      }
    });
  } catch (error) {
    logger.error('Error procesando reembolso:', error);
    res.status(500).json({ error: 'Error procesando reembolso' });
  }
};

/**
 * Obtener pago por orden
 */
exports.getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const [rows] = await db().query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC',
      [orderId]
    );
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Error fetching payment' });
  }
};

/**
 * Obtener todos los pagos
 */
exports.getAllPayments = async (req, res) => {
  try {
    const [rows] = await db().query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Error fetching payments' });
  }
};

/**
 * Obtener pago por ID
 */
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db().query('SELECT * FROM payments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    logger.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Error fetching payment' });
  }
};

/**
 * Proxy de conversión de moneda via fx-service
 */
exports.convertCurrency = async (req, res) => {
  try {
    const { from = 'GTQ', to = 'USD', amount = 1 } = req.query;
    const fxData = await getExchangeRate(from, to);
    const converted = Math.round(parseFloat(amount) * fxData.rate * 100) / 100;

    res.json({
      from_currency: from,
      to_currency: to,
      original_amount: parseFloat(amount),
      converted_amount: converted,
      rate: fxData.rate,
      from_cache: fxData.from_cache || false,
      is_fallback: fxData.is_fallback || false
    });
  } catch (error) {
    logger.error('Error converting currency:', error);
    res.status(500).json({ error: 'Error converting currency' });
  }
};
