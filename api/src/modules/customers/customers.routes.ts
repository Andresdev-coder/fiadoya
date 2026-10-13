import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import {
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from "./customers.schemas";
import * as service from "./customers.service";
import { idParam } from "../../middlewares/params";

export const customersRouter = Router();

customersRouter.use(authenticate);

const ctx = (req: Express.Request) => ({ storeId: req.user!.storeId, role: req.user!.role });

customersRouter.get("/", async (req, res) => {
  const query = listCustomersSchema.parse(req.query);
  res.json(await service.list(ctx(req), query));
});

customersRouter.post("/", async (req, res) => {
  const data = createCustomerSchema.parse(req.body);
  res.status(201).json(await service.create(ctx(req), data));
});

customersRouter.get("/:id/statement", async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await service.statement(ctx(req), id));
});

customersRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await service.getById(ctx(req), id));
});

customersRouter.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = updateCustomerSchema.parse(req.body);
  res.json(await service.update(ctx(req), id, data));
});