// Zona horaria comercial: debe coincidir con BUSINESS_TZ del backend.
// Todo lo que se muestra al usuario (slots, confirmaciones) se formatea acá.
export const BUSINESS_TZ = "America/Argentina/Buenos_Aires";

const hourFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayHourFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fullFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatHour(iso: string): string {
  return hourFormatter.format(new Date(iso));
}

export function formatDayHour(iso: string): string {
  return dayHourFormatter.format(new Date(iso));
}

export function formatFull(iso: string): string {
  return fullFormatter.format(new Date(iso));
}

// Día comercial YYYY-MM-DD de un instante ISO.
export function toBusinessDayKey(iso: string): string {
  return dayKeyFormatter.format(new Date(iso));
}

const weekdayDayFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  weekday: "short",
  day: "numeric",
});

// Etiqueta corta de un día comercial ("sáb 3"). Mediodía UTC para no caer
// en el filo del día en ninguna zona.
export function formatWeekdayDay(dayKey: string): string {
  return weekdayDayFormatter.format(new Date(`${dayKey}T12:00:00Z`));
}

const dateKeyFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Día comercial YYYY-MM-DD en formato argentino DD/MM/YYYY.
export function formatDateKey(dayKey: string): string {
  return dateKeyFormatter.format(new Date(`${dayKey}T12:00:00Z`));
}

const weekdayFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  weekday: "short",
});

// Etiqueta de día con fecha ("jue 15/10").
export function formatDayLabel(dayKey: string): string {
  return `${weekdayFormatter.format(new Date(`${dayKey}T12:00:00Z`))} ${formatDateKey(dayKey).slice(0, 5)}`;
}

const weekdayLongFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  weekday: "long",
});

// Fecha completa argentina ("Viernes 16/10, 09:30 hs").
export function formatWeekdayDateTime(iso: string): string {
  const date = new Date(iso);
  const weekday = weekdayLongFormatter.format(date);
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${formatDateKey(toBusinessDayKey(iso)).slice(0, 5)}, ${formatHour(iso)} hs`;
}

// Día con semana ("Viernes 16/10").
export function formatWeekdayDate(iso: string): string {
  const date = new Date(iso);
  const weekday = weekdayLongFormatter.format(date);
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${formatDateKey(toBusinessDayKey(iso)).slice(0, 5)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Próximos `count` días comerciales desde hoy (inclusive).
export function businessDayKeysFromToday(count: number): string[] {
  const todayKey = toBusinessDayKey(new Date().toISOString());
  const [year, month, day] = todayKey.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day);
  return Array.from({ length: count }, (_, i) =>
    new Date(base + i * DAY_MS).toISOString().slice(0, 10),
  );
}

// Suma (o resta con delta negativo) días calendario a un YYYY-MM-DD.
export function shiftDayKey(dayKey: string, delta: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + delta * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
