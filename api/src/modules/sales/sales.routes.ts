import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { createSaleSchema, listSalesSchema, voidSaleSchema } from "./sales.schemas";
import * as service from "./sales.service";
import { idParam } from "../../middlewares/params";

export const salesRouter = Router();

salesRouter.use(authenticate);

salesRouter.post("/", async (req, res) => {
  const data = createSaleSchema.parse(req.body);
  const sale = await service.create({ storeId: req.user!.storeId, userId: req.user!.id }, data);
  res.status(201).json(sale);
});

salesRouter.get("/", async (req, res) => {
  const query = listSalesSchema.parse(req.query);
  res.json(await service.list(req.user!.storeId, query));
});

salesRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await service.getById(req.user!.storeId, id));
});

salesRouter.post("/:id/void", requireRole("OWNER"), async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { reason } = voidSaleSchema.parse(req.body);
  res.json(
    await service.voidSale({ storeId: req.user!.storeId, userId: req.user!.id }, id, reason),
  );
});