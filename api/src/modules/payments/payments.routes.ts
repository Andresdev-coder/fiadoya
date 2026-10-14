import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { createPaymentSchema, listPaymentsSchema } from "./payments.schemas";
import * as service from "./payments.service";
import { idParam } from "../../middlewares/params";
import { voidPaymentSchema } from "./payments.schemas";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post("/", async (req, res) => {
  const data = createPaymentSchema.parse(req.body);
  const payment = await service.create({ storeId: req.user!.storeId, userId: req.user!.id }, data);
  res.status(201).json(payment);
});

paymentsRouter.post("/:id/void", requireRole("OWNER"), async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { reason } = voidPaymentSchema.parse(req.body);
  res.json(
    await service.voidPayment({ storeId: req.user!.storeId, userId: req.user!.id }, id, reason),
  );
});

paymentsRouter.get("/", async (req, res) => {
  const query = listPaymentsSchema.parse(req.query);
  res.json(await service.list(req.user!.storeId, query));
});