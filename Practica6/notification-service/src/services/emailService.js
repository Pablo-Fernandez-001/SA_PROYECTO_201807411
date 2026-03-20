const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter
let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    transporter.verify((error) => {
      if (error) {
        logger.warn('SMTP connection failed, emails will be logged only:', error.message);
      } else {
        logger.info('SMTP connection established successfully');
      }
    });
  }
  return transporter;
}

/**
 * Send email notification
 * Falls back to logging if SMTP is not configured
 */
async function sendEmail(to, subject, htmlContent) {
  const fromName = process.env.SMTP_FROM_NAME || 'DeliverEats';
  const fromEmail = process.env.SMTP_FROM || 'noreply@delivereats.com';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html: htmlContent
  };

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const info = await getTransporter().sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      // Log-only mode when SMTP is not configured
      logger.info(`[EMAIL-LOG] To: ${to} | Subject: ${subject}`);
      logger.info(`[EMAIL-LOG] Content: ${htmlContent.replace(/<[^>]*>/g, ' ').substring(0, 200)}...`);
      return { success: true, messageId: 'logged-only', mode: 'log' };
    }
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error.message);
    // Still log the email content even if sending fails
    logger.info(`[EMAIL-FALLBACK] To: ${to} | Subject: ${subject}`);
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail };
