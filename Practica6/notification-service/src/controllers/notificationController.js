const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Generate HTML email template
 */
function generateEmailHTML(title, content, statusColor = '#f97316') {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🍕 DeliverEats</h1>
    </div>
    <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
      <div style="background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 16px;">
        ${title}
      </div>
      ${content}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Este es un correo automático de DeliverEats. No responda a este mensaje.
      </p>
    </div>
  </body>
  </html>`;
}

/**
 * Format items list for email
 */
function formatItemsList(items) {
  if (!items || items.length === 0) return '<p style="color: #6b7280;">Sin productos detallados</p>';
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Producto</th>
          <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">Cant.</th>
          <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${item.name}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f3f4f6;">Q${parseFloat(item.subtotal || (item.price * item.quantity)).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

/**
 * Notification handlers for different order events
 */
const notificationController = {

  /**
   * POST /api/notifications/order-created
   * Notifica al cliente que su pedido fue creado
   * Min content: nombre cliente, número de orden, productos, total, timestamp, status CREADA
   */
  orderCreated: async (req, res) => {
    try {
      const { clientEmail, clientName, orderNumber, items, total, createdAt } = req.body;

      if (!clientEmail || !orderNumber) {
        return res.status(400).json({ error: 'clientEmail and orderNumber are required' });
      }

      const content = `
        <h2 style="color: #1f2937; margin-top: 0;">¡Tu pedido ha sido creado!</h2>
        <p style="color: #4b5563;">Hola <strong>${clientName || 'Cliente'}</strong>,</p>
        <p style="color: #4b5563;">Tu pedido ha sido registrado exitosamente. Aquí están los detalles:</p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Número de Orden:</strong> ${orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="color: #f97316; font-weight: bold;">CREADA</span></p>
          <p style="margin: 4px 0;"><strong>Fecha:</strong> ${new Date(createdAt || Date.now()).toLocaleString('es-GT')}</p>
        </div>
        <h3 style="color: #1f2937;">Productos ordenados:</h3>
        ${formatItemsList(items)}
        <div style="background: #fef3c7; border-radius: 8px; padding: 12px; margin-top: 16px;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">Total: Q${parseFloat(total || 0).toFixed(2)}</p>
        </div>
      `;

      const result = await sendEmail(
        clientEmail,
        `🛒 Pedido ${orderNumber} Creado - DeliverEats`,
        generateEmailHTML('PEDIDO CREADO', content, '#f97316')
      );

      logger.info(`[ORDER_CREATED] Notification sent for order ${orderNumber} to ${clientEmail}`);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[ORDER_CREATED] Error:', error);
      res.status(500).json({ error: 'Error sending notification' });
    }
  },

  /**
   * POST /api/notifications/order-cancelled-client
   * Notifica al cliente que canceló su pedido
   * Min content: nombre cliente, productos, timestamp cancelación, status CANCELADA
   */
  orderCancelledByClient: async (req, res) => {
    try {
      const { clientEmail, clientName, orderNumber, items, cancelledAt } = req.body;

      if (!clientEmail || !orderNumber) {
        return res.status(400).json({ error: 'clientEmail and orderNumber are required' });
      }

      const content = `
        <h2 style="color: #1f2937; margin-top: 0;">Pedido Cancelado</h2>
        <p style="color: #4b5563;">Hola <strong>${clientName || 'Cliente'}</strong>,</p>
        <p style="color: #4b5563;">Tu pedido ha sido cancelado exitosamente por tu solicitud.</p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Número de Orden:</strong> ${orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="color: #ef4444; font-weight: bold;">CANCELADA</span></p>
          <p style="margin: 4px 0;"><strong>Fecha de cancelación:</strong> ${new Date(cancelledAt || Date.now()).toLocaleString('es-GT')}</p>
        </div>
        <h3 style="color: #1f2937;">Productos que estaban en el pedido:</h3>
        ${formatItemsList(items)}
      `;

      const result = await sendEmail(
        clientEmail,
        `Pedido ${orderNumber} Cancelado - DeliverEats`,
        generateEmailHTML('PEDIDO CANCELADO', content, '#ef4444')
      );

      logger.info(`[ORDER_CANCELLED_CLIENT] Notification sent for order ${orderNumber} to ${clientEmail}`);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[ORDER_CANCELLED_CLIENT] Error:', error);
      res.status(500).json({ error: 'Error sending notification' });
    }
  },

  /**
   * POST /api/notifications/order-shipped
   * Notifica al cliente que su pedido está en camino
   * Min content: número de orden, nombre repartidor, productos, status EN_CAMINO
   */
  orderShipped: async (req, res) => {
    try {
      const { clientEmail, clientName, orderNumber, driverName, items } = req.body;

      if (!clientEmail || !orderNumber) {
        return res.status(400).json({ error: 'clientEmail and orderNumber are required' });
      }

      const content = `
        <h2 style="color: #1f2937; margin-top: 0;">¡Tu pedido va en camino!</h2>
        <p style="color: #4b5563;">Hola <strong>${clientName || 'Cliente'}</strong>,</p>
        <p style="color: #4b5563;">¡Buenas noticias! Tu pedido ya está siendo entregado.</p>
        <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Número de Orden:</strong> ${orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Repartidor:</strong> ${driverName || 'Asignado'}</p>
          <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="color: #3b82f6; font-weight: bold;">EN CAMINO</span></p>
        </div>
        <h3 style="color: #1f2937;">Productos en tu pedido:</h3>
        ${formatItemsList(items)}
      `;

      const result = await sendEmail(
        clientEmail,
        `Pedido ${orderNumber} En Camino - DeliverEats`,
        generateEmailHTML('EN CAMINO', content, '#3b82f6')
      );

      logger.info(`[ORDER_SHIPPED] Notification sent for order ${orderNumber} to ${clientEmail}`);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[ORDER_SHIPPED] Error:', error);
      res.status(500).json({ error: 'Error sending notification' });
    }
  },

  /**
   * POST /api/notifications/order-cancelled-provider
   * Notifica al cliente que un restaurante o repartidor canceló su pedido
   * Min content: nombre restaurante/repartidor, razón, productos, status CANCELADA
   */
  orderCancelledByProvider: async (req, res) => {
    try {
      const { clientEmail, clientName, orderNumber, providerName, providerType, reason, items } = req.body;

      if (!clientEmail || !orderNumber) {
        return res.status(400).json({ error: 'clientEmail and orderNumber are required' });
      }

      const providerLabel = providerType === 'REPARTIDOR' ? 'Repartidor' : 'Restaurante';

      const content = `
        <h2 style="color: #1f2937; margin-top: 0;">Pedido Cancelado</h2>
        <p style="color: #4b5563;">Hola <strong>${clientName || 'Cliente'}</strong>,</p>
        <p style="color: #4b5563;">Lamentamos informarte que tu pedido ha sido cancelado por el ${providerLabel.toLowerCase()}.</p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Número de Orden:</strong> ${orderNumber}</p>
          <p style="margin: 4px 0;"><strong>${providerLabel}:</strong> ${providerName || 'No especificado'}</p>
          <p style="margin: 4px 0;"><strong>Motivo:</strong> ${reason || 'No especificado'}</p>
          <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="color: #ef4444; font-weight: bold;">CANCELADA</span></p>
        </div>
        <h3 style="color: #1f2937;">Productos que estaban en el pedido:</h3>
        ${formatItemsList(items)}
      `;

      const result = await sendEmail(
        clientEmail,
        `Pedido ${orderNumber} Cancelado por ${providerLabel} - DeliverEats`,
        generateEmailHTML('CANCELADO', content, '#ef4444')
      );

      logger.info(`[ORDER_CANCELLED_PROVIDER] Notification sent for order ${orderNumber} to ${clientEmail} (by ${providerLabel})`);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[ORDER_CANCELLED_PROVIDER] Error:', error);
      res.status(500).json({ error: 'Error sending notification' });
    }
  },

  /**
   * POST /api/notifications/order-rejected
   * Notifica al cliente que el restaurante rechazó su pedido
   * Min content: nombre restaurante, número de orden, productos, status RECHAZADA
   */
  orderRejected: async (req, res) => {
    try {
      const { clientEmail, clientName, orderNumber, restaurantName, items } = req.body;

      if (!clientEmail || !orderNumber) {
        return res.status(400).json({ error: 'clientEmail and orderNumber are required' });
      }

      const content = `
        <h2 style="color: #1f2937; margin-top: 0;">Pedido Rechazado</h2>
        <p style="color: #4b5563;">Hola <strong>${clientName || 'Cliente'}</strong>,</p>
        <p style="color: #4b5563;">Lamentablemente, el restaurante ha rechazado tu pedido. Esto puede deberse a falta de stock o capacidad.</p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Número de Orden:</strong> ${orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Restaurante:</strong> ${restaurantName || 'No especificado'}</p>
          <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="color: #dc2626; font-weight: bold;">RECHAZADA</span></p>
        </div>
        <h3 style="color: #1f2937;">Productos del pedido:</h3>
        ${formatItemsList(items)}
        <p style="color: #4b5563; margin-top: 16px;">Te invitamos a realizar un nuevo pedido con otro restaurante.</p>
      `;

      const result = await sendEmail(
        clientEmail,
        `🚫 Pedido ${orderNumber} Rechazado - DeliverEats`,
        generateEmailHTML('RECHAZADA', content, '#dc2626')
      );

      logger.info(`[ORDER_REJECTED] Notification sent for order ${orderNumber} to ${clientEmail}`);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[ORDER_REJECTED] Error:', error);
      res.status(500).json({ error: 'Error sending notification' });
    }
  }
};

module.exports = notificationController;
