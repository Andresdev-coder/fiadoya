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

/** Para fechas con hora real (ventas, abonos). */
export const formatDay = (iso: string) => day.format(new Date(iso));

/** Para columnas de solo fecha (cierres de caja): se guardan como medianoche UTC. */
export const formatDateOnly = (iso: string) => dayUtc.format(new Date(iso));

/** Hoy en Colombia, formato AAAA-MM-DD. */
export const todayCO = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));


export const formatCOP = (n: number) => cop.format(n);

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export const formatCompact = (n: number) => compact.format(n);

const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" });
const shortDateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });

/** Para mostrar mes y año (ej: enero de 2026). */
export const formatMonth = (iso: string) => monthFormat.format(new Date(iso));

/** Para fechas cortas (ej: 24 oct). */
export const formatShortDate = (iso: string) => shortDateFormat.format(new Date(iso));