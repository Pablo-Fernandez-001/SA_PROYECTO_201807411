const express = require("express");

function userRoutes(controller) {
  const router = express.Router();

  router.get("/health", (req, res) => res.status(200).json({ service: "users-service", status: "ok" }));
  router.post("/users", controller.create);
  router.get("/users", controller.list);
  router.get("/users/:id", controller.getById);
  router.put("/users/:id", controller.update);
  router.delete("/users/:id", controller.delete);

  return router;
}

module.exports = userRoutes;
