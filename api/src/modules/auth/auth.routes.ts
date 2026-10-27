import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import {
  changePasswordSchema,
  loginSchema,
  recoverSchema,
  recoveryCodeSchema,
  registerSchema,
} from "./auth.schemas";
import * as service from "./auth.service";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const data = registerSchema.parse(req.body);
  res.status(201).json(await service.register(data));
});

authRouter.post("/login", async (req, res) => {
  const data = loginSchema.parse(req.body);
  res.json(await service.login(data));
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json(await service.me(req.user!.id));
});

authRouter.post("/change-password", authenticate, async (req, res) => {
  const data = changePasswordSchema.parse(req.body);
  res.json(await service.changePassword(req.user!.id, data));
});

authRouter.post("/recovery-code", authenticate, requireRole("OWNER"), async (req, res) => {
  const { password } = recoveryCodeSchema.parse(req.body);
  res.json(await service.issueRecoveryCode(req.user!.id, password));
});

authRouter.post("/recover", async (req, res) => {
  const data = recoverSchema.parse(req.body);
  res.json(await service.recover(data));
});