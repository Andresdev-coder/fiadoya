const TZ_OFFSET = "-05:00"; 

export function dayRange(from?: string, to?: string) {
  return {
    gte: from ? new Date(`${from}T00:00:00${TZ_OFFSET}`) : undefined,
    lt: to ? new Date(new Date(`${to}T00:00:00${TZ_OFFSET}`).getTime() + 86_400_000) : undefined,
  };
}

export function todayCO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}