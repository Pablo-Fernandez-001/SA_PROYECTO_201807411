const express = require("express");

function ticketRoutes(controller) {
  const router = express.Router();

  router.get("/health", (req, res) => res.status(200).json({ service: "tickets-service", status: "ok" }));
  router.post("/tickets", controller.create);
  router.get("/tickets", controller.list);
  router.get("/tickets/:id", controller.getById);
  router.put("/tickets/:id", controller.update);
  router.delete("/tickets/:id", controller.delete);

  return router;
}

module.exports = ticketRoutes;
