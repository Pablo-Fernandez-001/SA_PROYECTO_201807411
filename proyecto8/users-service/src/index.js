require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pino = require("pino");

const db = require("./config/db");
const EventBus = require("./events/eventBus");
const UserRepository = require("./repositories/userRepository");
const UserService = require("./services/userService");
const UserController = require("./controllers/userController");
const userRoutes = require("./routes/userRoutes");

const logger = pino({ name: "users-service" });

async function start() {
  const app = express();
  const port = Number(process.env.PORT || 3101);

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
      res.status(200).json({ service: "users-service", status: "ok", db: "up" });
    } catch (error) {
      res.status(503).json({ service: "users-service", status: "degraded", db: "down" });
    }
  });

  const eventBus = new EventBus(logger);
  await eventBus.connect();

  const userRepository = new UserRepository(db);
  const userService = new UserService(userRepository, eventBus);
  const userController = new UserController(userService);

  app.use("/api", userRoutes(userController));

  app.use((err, req, res, next) => {
    logger.error({ err: err.message }, "Unhandled error");
    res.status(500).json({ message: "internal server error" });
  });

  const server = app.listen(port, () => {
    logger.info({ port }, "users-service running");
  });

  const shutdown = async () => {
    logger.info("users-service shutting down");
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();
