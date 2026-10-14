export type Role = "OWNER" | "CASHIER";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  creditLimit: number;
  notes: string | null;
  active: boolean;
  createdAt: string;
  balance: number;
  available: number;
};

export type Sale = {
  id: string;
  type: "CASH" | "CREDIT";
  status: "ACTIVE" | "VOIDED";
  total: number;
  customerId: string | null;
  createdAt: string;
};

export type AuthResponse = { token: string; user: User };