const amqp = require("amqplib");

class EventBus {
  constructor(logger) {
    this.logger = logger;
    this.enabled = process.env.EVENT_BUS_ENABLED === "true";
    this.url = process.env.EVENT_BUS_URL;
    this.exchange = "helpdesk.events";
    this.channel = null;
  }

  async connect() {
    if (!this.enabled || !this.url) {
      this.logger.info("Event bus disabled for assignments-service");
      return;
    }

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        const conn = await amqp.connect(this.url);
        conn.on("close", () => {
          this.logger.warn("RabbitMQ connection closed (assignments-service)");
          this.channel = null;
        });
        this.channel = await conn.createChannel();
        await this.channel.assertExchange(this.exchange, "topic", { durable: true });
        this.logger.info({ attempt }, "Connected to RabbitMQ (assignments-service)");
        return;
      } catch (error) {
        this.logger.error(
          { attempt, error: error.message },
          "RabbitMQ connection failed (assignments-service)"
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    this.logger.error("RabbitMQ unavailable after retries (assignments-service)");
  }

  async publish(routingKey, payload) {
    if (!this.channel) return;
    this.channel.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: "application/json",
    });
  }
}

module.exports = EventBus;
