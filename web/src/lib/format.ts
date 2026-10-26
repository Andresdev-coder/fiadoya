const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

const day = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });
const dayUtc = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

// Estas dos reciben un día suelto (AAAA-MM-DD), por eso se formatean en UTC.
const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });

export const formatCOP = (n: number) => cop.format(n);
export const formatCompact = (n: number) => compact.format(n);

/** Para fechas con hora real (ventas, abonos). */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDay = (iso: string) => day.format(new Date(iso));

/** Para columnas de solo fecha (cierres de caja): se guardan como medianoche UTC. */
export const formatDateOnly = (iso: string) => dayUtc.format(new Date(iso));

/** Hoy en Colombia, formato AAAA-MM-DD. */
export const todayCO = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/** Mes y año de un día AAAA-MM-DD (ej: octubre de 2026). */
export const formatMonth = (ymd: string) => monthFormat.format(new Date(`${ymd}T00:00:00Z`));

/** Fecha corta de un día AAAA-MM-DD (ej: 24 oct). */
export const formatShortDate = (ymd: string) => shortDateFormat.format(new Date(`${ymd}T00:00:00Z`));