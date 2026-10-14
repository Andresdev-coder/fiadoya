import { AppError } from "../middlewares/errorHandler";
import type { Db } from "../modules/customers/customers.service";
import { dateCO } from "./dates";

/** Impide anular movimientos en efectivo de un día que ya tiene cierre de caja. */
export async function assertDayOpen(tx: Db, storeId: string, createdAt: Date) {
  const date = dateCO(createdAt);
  const closing = await tx.cashClosing.findUnique({
    where: { storeId_date: { storeId, date: new Date(`${date}T00:00:00Z`) } },
  });
  if (closing) {
    throw new AppError(409, `No se puede anular: la caja del ${date} ya fue cerrada`);
  }
}