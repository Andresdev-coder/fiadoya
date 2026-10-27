import { env } from "../config/env";

const protectedEmails = new Set(
  env.DEMO_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const isDemoAccount = (email: string) => protectedEmails.has(email.toLowerCase());

export const DEMO_LOCKED = "Las cuentas de demostración no se pueden modificar";