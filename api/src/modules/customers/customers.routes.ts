import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import {
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from "./customers.schemas";
import * as service from "./customers.service";

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

customersRouter.get("/:id", async (req, res) => {
  res.json(await service.getById(ctx(req), req.params.id));
});

customersRouter.patch("/:id", async (req, res) => {
  const data = updateCustomerSchema.parse(req.body);
  res.json(await service.update(ctx(req), req.params.id, data));
});