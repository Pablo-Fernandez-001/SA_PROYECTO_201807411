class TicketController {
  constructor(ticketService) {
    this.ticketService = ticketService;
  }

  create = async (req, res, next) => {
    try {
      const result = await this.ticketService.createTicket(req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status,
        requester_id: req.query.requester_id ? Number(req.query.requester_id) : undefined,
      };
      const data = await this.ticketService.getTickets(filters);
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.ticketService.getTicketById(Number(req.params.id));
      if (!data) {
        return res.status(404).json({ message: "ticket not found" });
      }
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.ticketService.updateTicket(Number(req.params.id), req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const result = await this.ticketService.deleteTicket(Number(req.params.id));
      if (result.status === 204) {
        return res.status(204).send();
      }
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = TicketController;
