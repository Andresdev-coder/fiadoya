const TZ_OFFSET = "-05:00"; // Colombia

/** Rango [from, to] inclusivo por días, en hora de Colombia. */
export function dayRange(from?: string, to?: string) {
  return {
    gte: from ? new Date(`${from}T00:00:00${TZ_OFFSET}`) : undefined,
    lt: to ? new Date(new Date(`${to}T00:00:00${TZ_OFFSET}`).getTime() + 86_400_000) : undefined,
  };
}

/** Fecha en Colombia (AAAA-MM-DD) de un instante dado. */
export function dateCO(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
}

export const todayCO = () => dateCO(new Date());