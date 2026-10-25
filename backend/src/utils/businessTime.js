// Utilidades de zona horaria comercial: jornada, francos, feriados y slots se
// interpretan en BUSINESS_TZ. El wire sigue siendo ISO8601 UTC; nunca se usa la
// hora del sistema (Vercel corre en UTC y eso deja de importar).

// Milisegundos de un día (24h*60m*60s*1000ms).
export const DAY_MS = 24 * 60 * 60 * 1000;

// Zona horaria comercial: debe coincidir con BUSINESS_TZ del frontend.
export const BUSINESS_TZ =
  process.env.BUSINESS_TZ ?? "America/Argentina/Buenos_Aires";

// Offset de la zona comercial para un instante dado (ms a sumar a UTC).
function businessOffsetMs(date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

// Partes calendario de un instante en la zona comercial.
export function tzParts(date) {
  const shifted = new Date(date.getTime() + businessOffsetMs(date));
  return {
    dayKey: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

// Medianoche (00:00) de un día comercial YYYY-MM-DD expresada en UTC.
export function businessDayStartUtc(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(guess.getTime() - businessOffsetMs(guess));
  // Refinamiento por si el offset cambia justo a medianoche (transición DST).
  return new Date(
    start.getTime() + (businessOffsetMs(guess) - businessOffsetMs(start)),
  );
}

// Día calendario UTC de un Date ("2026-09-29"), para comparar francos y
// feriados guardados como YYYY-MM-DD. Distinto de tzParts: UTC puro.
export function dayKeyUTC(date) {
  return date.toISOString().slice(0, 10);
}

// Medianoche UTC de un día calendario YYYY-MM-DD. Se usa para entidades
// date-only como Holiday, no para días comerciales (esos usan businessDayStartUtc).
export function utcDayStart(dayKey) {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

// Convierte "HH:MM" del workingHours a minutos. Si el formato es inválido o
// falta, devuelve el fallback.
export function parseWorkHour(hhmm, fallback) {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

const businessDateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const businessTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Fecha larga en la zona comercial: "Jueves 10 de septiembre de 2026".
export function formatBusinessDate(value) {
  const text = businessDateFormatter
    .format(new Date(value))
    .replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Hora en la zona comercial: "15:00".
export function formatBusinessTime(value) {
  return businessTimeFormatter.format(new Date(value));
}
