// orders-service/src/messaging/rabbitmqPublisher.js
const amqp = require('amqplib');
const logger = require('../utils/logger');

let channel = null;
let connection = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'orders_exchange';
const ROUTING_KEY = 'orders.created';

/**
 * Conectar a RabbitMQ y configurar exchange
 */
async function connectRabbitMQ() {
  try {
    logger.info('Connecting to RabbitMQ...');
    
    connection = await amqp.connect(RABBITMQ_URL);
    logger.info('Connected to RabbitMQ');

    channel = await connection.createChannel();
    logger.info('Channel created');

    // Declarar exchange de tipo 'topic'
    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true
    });
    logger.info(`Exchange '${EXCHANGE_NAME}' declared`);

    // Manejar reconexión en caso de error
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed. Reconnecting...');
      setTimeout(connectRabbitMQ, 5000);
    });

    return true;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error.message);
    setTimeout(connectRabbitMQ, 5000);
    return false;
  }
}

/**
 * Publicar mensaje de orden creada
 * @param {Object} orderData - Datos de la orden
 * @returns {Promise<boolean>}
 */
async function publishOrderCreated(orderData) {
  try {
    if (!channel) {
      logger.warn('Channel not available. Reconnecting...');
      await connectRabbitMQ();
      if (!channel) {
        throw new Error('Failed to reconnect to RabbitMQ');
      }
    }

    const message = {
      event: 'order.created',
      timestamp: new Date().toISOString(),
      data: {
        orderId: orderData.orderId,
        restaurantId: orderData.restaurantId,
        userId: orderData.userId,
        items: orderData.items,
        total: orderData.total,
        deliveryAddress: orderData.deliveryAddress
      }
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));

    // Publicar mensaje en el exchange con routing key
    const published = channel.publish(
      EXCHANGE_NAME,
      ROUTING_KEY,
      messageBuffer,
      {
        persistent: true, // Persistir mensajes en disco
        contentType: 'application/json'
      }
    );

    if (published) {
      logger.info(`Order event published: orderId=${orderData.orderId}, restaurantId=${orderData.restaurantId}`);
      logger.debug(`Message: ${JSON.stringify(message, null, 2)}`);
      return true;
    } else {
      logger.error('Failed to publish message to RabbitMQ');
      return false;
    }
  } catch (error) {
    logger.error('Error publishing message to RabbitMQ:', error.message);
    return false;
  }
}

/**
 * Cerrar conexión con RabbitMQ
 */
async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  await closeRabbitMQ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRabbitMQ();
  process.exit(0);
});

module.exports = {
  connectRabbitMQ,
  publishOrderCreated,
  closeRabbitMQ
};
