import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { createClosingSchema, dailySummarySchema, overdueSchema } from "./reports.schemas";
import * as service from "./reports.service";

export const reportsRouter = Router();
reportsRouter.use(authenticate, requireRole("OWNER"));

reportsRouter.get("/overdue", async (req, res) => {
  const { minDays } = overdueSchema.parse(req.query);
  res.json(await service.overdue(req.user!.storeId, minDays));
});

reportsRouter.get("/dashboard", async (req, res) => {
  res.json(await service.dashboard(req.user!.storeId));
});

reportsRouter.get("/daily-summary", async (req, res) => {
  const { date } = dailySummarySchema.parse(req.query);
  res.json(await service.dailySummary(req.user!.storeId, date));
});

export const closingsRouter = Router();
closingsRouter.use(authenticate);

// Cajero y dueño pueden cerrar caja.
closingsRouter.post("/", async (req, res) => {
  const data = createClosingSchema.parse(req.body);
  const closing = await service.createClosing(
    { storeId: req.user!.storeId, userId: req.user!.id },
    data,
  );
  res.status(201).json(closing);
});

// Solo el dueño ve el historial.
closingsRouter.get("/", requireRole("OWNER"), async (req, res) => {
  res.json(await service.listClosings(req.user!.storeId));
});