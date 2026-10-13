import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { customersRouter } from "./modules/customers/customers.routes";
import { salesRouter } from "./modules/sales/sales.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRouter);
app.use("/customers", customersRouter)
app.use("/sales", salesRouter)
app.use("/payments", paymentsRouter)

app.use(errorHandler);