import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { createPaymentSchema, listPaymentsSchema } from "./payments.schemas";
import * as service from "./payments.service";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post("/", async (req, res) => {
  const data = createPaymentSchema.parse(req.body);
  const payment = await service.create({ storeId: req.user!.storeId, userId: req.user!.id }, data);
  res.status(201).json(payment);
});

paymentsRouter.get("/", async (req, res) => {
  const query = listPaymentsSchema.parse(req.query);
  res.json(await service.list(req.user!.storeId, query));
});