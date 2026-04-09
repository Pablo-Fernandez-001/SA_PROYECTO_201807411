class AssignmentController {
  constructor(assignmentService) {
    this.assignmentService = assignmentService;
  }

  create = async (req, res, next) => {
    try {
      const result = await this.assignmentService.createAssignment(req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      const filters = {
        ticket_id: req.query.ticket_id ? Number(req.query.ticket_id) : undefined,
        agent_id: req.query.agent_id ? Number(req.query.agent_id) : undefined,
        is_active:
          req.query.is_active === undefined
            ? undefined
            : String(req.query.is_active).toLowerCase() === "true",
      };
      const data = await this.assignmentService.getAssignments(filters);
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.assignmentService.getAssignmentById(Number(req.params.id));
      if (!data) {
        return res.status(404).json({ message: "assignment not found" });
      }
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.assignmentService.updateAssignment(Number(req.params.id), req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const result = await this.assignmentService.deleteAssignment(Number(req.params.id));
      if (result.status === 204) {
        return res.status(204).send();
      }
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = AssignmentController;
