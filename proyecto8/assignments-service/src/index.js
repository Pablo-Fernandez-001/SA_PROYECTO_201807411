require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pino = require("pino");

const db = require("./config/db");
const EventBus = require("./events/eventBus");
const AssignmentRepository = require("./repositories/assignmentRepository");
const { UsersClient, TicketsClient } = require("./services/externalClients");
const AssignmentService = require("./services/assignmentService");
const AssignmentController = require("./controllers/assignmentController");
const assignmentRoutes = require("./routes/assignmentRoutes");

const logger = pino({ name: "assignments-service" });

async function start() {
  const app = express();
  const port = Number(process.env.PORT || 3103);

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
      res.status(200).json({ service: "assignments-service", status: "ok", db: "up" });
    } catch (error) {
      res.status(503).json({ service: "assignments-service", status: "degraded", db: "down" });
    }
  });

  const eventBus = new EventBus(logger);
  await eventBus.connect();

  const assignmentRepository = new AssignmentRepository(db);
  const usersClient = new UsersClient(process.env.USERS_SERVICE_URL || "http://localhost:3101");
  const ticketsClient = new TicketsClient(process.env.TICKETS_SERVICE_URL || "http://localhost:3102");
  const assignmentService = new AssignmentService(assignmentRepository, usersClient, ticketsClient, eventBus);
  const assignmentController = new AssignmentController(assignmentService);

  app.use("/api", assignmentRoutes(assignmentController));

  app.use((err, req, res, next) => {
    logger.error({ err: err.message }, "Unhandled error");
    res.status(500).json({ message: "internal server error" });
  });

  const server = app.listen(port, () => {
    logger.info({ port }, "assignments-service running");
  });

  const shutdown = async () => {
    logger.info("assignments-service shutting down");
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();
