require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pino = require("pino");

const db = require("./config/db");
const EventBus = require("./events/eventBus");
const TicketRepository = require("./repositories/ticketRepository");
const UserClient = require("./services/userClient");
const TicketService = require("./services/ticketService");
const TicketController = require("./controllers/ticketController");
const ticketRoutes = require("./routes/ticketRoutes");

const logger = pino({ name: "tickets-service" });

async function start() {
  const app = express();
  const port = Number(process.env.PORT || 3102);

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use((req, res, next) => {
    const requestId = req.header("x-request-id") || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    res.setHeader("x-request-id", requestId);
    req.requestId = requestId;
    next();
  });

  app.get("/api/health/deep", async (req, res) => {
    try {
      await db.query("SELECT 1");
      res.status(200).json({ service: "tickets-service", status: "ok", db: "up" });
    } catch (error) {
      res.status(503).json({ service: "tickets-service", status: "degraded", db: "down" });
    }
  });

  const eventBus = new EventBus(logger);
  await eventBus.connect();

  const ticketRepository = new TicketRepository(db);
  const userClient = new UserClient(process.env.USERS_SERVICE_URL || "http://localhost:3101");
  const ticketService = new TicketService(ticketRepository, userClient, eventBus);
  const ticketController = new TicketController(ticketService);

  app.use("/api", ticketRoutes(ticketController));

  app.use((err, req, res, next) => {
    logger.error({ err: err.message }, "Unhandled error");
    res.status(500).json({ message: "internal server error" });
  });

  const server = app.listen(port, () => {
    logger.info({ port }, "tickets-service running");
  });

  const shutdown = async () => {
    logger.info("tickets-service shutting down");
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();
