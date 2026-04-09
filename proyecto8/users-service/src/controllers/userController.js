class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  create = async (req, res, next) => {
    try {
      const result = await this.userService.createUser(req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      const data = await this.userService.getUsers();
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.userService.getUserById(Number(req.params.id));
      if (!data) {
        return res.status(404).json({ message: "user not found" });
      }
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.userService.updateUser(Number(req.params.id), req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const result = await this.userService.deleteUser(Number(req.params.id));
      if (result.status === 204) {
        return res.status(204).send();
      }
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = UserController;
