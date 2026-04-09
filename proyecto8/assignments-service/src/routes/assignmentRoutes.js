const express = require("express");

function assignmentRoutes(controller) {
  const router = express.Router();

  router.get("/health", (req, res) => res.status(200).json({ service: "assignments-service", status: "ok" }));
  router.post("/assignments", controller.create);
  router.get("/assignments", controller.list);
  router.get("/assignments/:id", controller.getById);
  router.put("/assignments/:id", controller.update);
  router.delete("/assignments/:id", controller.delete);

  return router;
}

module.exports = assignmentRoutes;
