const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const amqp = require("amqplib");
const pino = require("pino");

const logger = pino({ name: "audit-service" });
const app = express();
const port = Number(process.env.PORT || 3104);
const eventBusUrl = process.env.EVENT_BUS_URL || "amqp://helpdesk:helpdesk123@rabbitmq:5672";
const exchange = "helpdesk.events";
const queue = "helpdesk.audit.queue";

const eventsBuffer = [];
const maxBuffer = 1000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ service: "audit-service", status: "ok", events_buffered: eventsBuffer.length });
});

app.get("/api/events", (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const items = eventsBuffer.slice(-limit).reverse();
  res.status(200).json({ total: eventsBuffer.length, items });
});

async function startConsumer() {
  try {
    const conn = await amqp.connect(eventBusUrl);
    const channel = await conn.createChannel();

    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, "#");

    channel.consume(
      queue,
      (msg) => {
        if (!msg) return;

        const payload = msg.content.toString();
        let parsedPayload = null;

        try {
          parsedPayload = JSON.parse(payload);
        } catch (error) {
          parsedPayload = { raw: payload };
        }

        const eventRecord = {
          routing_key: msg.fields.routingKey,
          occurred_at: new Date().toISOString(),
          payload: parsedPayload,
        };

        eventsBuffer.push(eventRecord);
        if (eventsBuffer.length > maxBuffer) {
          eventsBuffer.shift();
        }

        logger.info({ routing_key: eventRecord.routing_key }, "Event consumed");
        channel.ack(msg);
      },
      { noAck: false }
    );

    logger.info("audit-service connected to RabbitMQ and consuming events");
  } catch (error) {
    logger.error({ error: error.message }, "Failed to start RabbitMQ consumer");
    setTimeout(startConsumer, 3000);
  }
}

app.listen(port, () => {
  logger.info({ port }, "audit-service running");
  startConsumer();
});
