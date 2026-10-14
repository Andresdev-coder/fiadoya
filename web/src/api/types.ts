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

export type StatementEntry = {
  kind: "SALE" | "PAYMENT";
  id: string;
  date: string;
  amount: number;
  status: "ACTIVE" | "VOIDED";
  detail: string;
  balanceAfter: number;
};

export type Statement = {
  customer: Customer;
  balance: number;
  entries: StatementEntry[];
};

export type OverdueCustomer = {
  id: string;
  name: string;
  phone: string | null;
  creditLimit: number;
  balance: number;
  oldestDebtDate: string | null;
  daysOverdue: number;
  lastPaymentAt: string | null;
};

export type Overdue = {
  count: number;
  totalDebt: number;
  customers: OverdueCustomer[];
};

export type DailySummary = {
  date: string;
  sales: { cash: number; credit: number; total: number; count: number };
  payments: { byMethod: { CASH: number; TRANSFER: number; OTHER: number }; total: number };
  voidedSales: number;
  expectedCash: number;
};

export type CashClosing = {
  id: string;
  date: string;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
  createdAt: string;
  createdBy?: { id: string; name: string };
};

export type SaleRow = {
  id: string;
  type: "CASH" | "CREDIT";
  status: "ACTIVE" | "VOIDED";
  voidReason: string | null;
  total: number;
  createdAt: string;
  customer: { id: string; name: string } | null;
  items: { description: string; quantity: number }[];
};

export type PaymentRow = {
  id: string;
  amount: number;
  method: "CASH" | "TRANSFER" | "OTHER";
  status: "ACTIVE" | "VOIDED";
  voidReason: string | null;
  note: string | null;
  createdAt: string;
  customer: { id: string; name: string };
};

export type AuthResponse = { token: string; user: User };