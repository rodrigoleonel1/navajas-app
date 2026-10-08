import mongoose from "mongoose";
import { createAppError } from "../utils/appError.js";
import { Appointment } from "../models/Appointment.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";

// Milisegundos de un día (24h*60m*60s*1000ms).
const DAY_MS = 24 * 60 * 60 * 1000;

// Zona horaria comercial: la jornada, los francos y los slots se interpretan
// en esta zona. El wire sigue siendo ISO8601 UTC; Vercel corre en UTC y eso
// deja de importar porque nunca se usa la hora del sistema.
export const BUSINESS_TZ = process.env.BUSINESS_TZ ?? "America/Argentina/Buenos_Aires";

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

function toObjectIdOrThrow(id, message = "ID inválido") {
  if (!mongoose.isValidObjectId(id)) {
    throw createAppError(400, "INVALID_ID", message);
  }
  return new mongoose.Types.ObjectId(id);
}

// Parsea un ISO8601 UTC o tira 400 VALIDATION_ERROR si es inválido.
function parseISODate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createAppError(400, "VALIDATION_ERROR", "Fecha inválida, use ISO8601 UTC");
  }
  return date;
}

// Recorta un Date a su día calendario UTC ("2026-09-29"). Se usa para exigir
// mismo día inicio/fin del turno y para comparar contra los francos (daysOff).
// Día calendario UTC de un Date (para comparar francos/feriados guardados
// como YYYY-MM-DD). Distinto de tzParts: esto es calendario UTC puro.
function dayKeyUTC(date) {
  return date.toISOString().slice(0, 10);
}

// Convierte "HH:MM" del workingHours a minutos en la misma escala.
// Si el formato es inválido o falta, devuelve el fallback (09:00/18:00 por defecto).
function parseWorkHour(hhmm, fallback) {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

// RN10: el turno debe caer dentro de la jornada del barbero y en un día
// que no sea franco, franco semanal ni feriado. Todo en zona comercial.
function isNonWorkingDay(parts, barberProfile) {
  const weeklyDaysOff = barberProfile?.weeklyDaysOff ?? [];
  if (weeklyDaysOff.includes(parts.weekday)) {
    return true;
  }
  const daysOff = barberProfile?.daysOff ?? [];
  if (
    daysOff.some((dayOff) => dayKeyUTC(new Date(dayOff)) === parts.dayKey)
  ) {
    return true;
  }
  const holidays = barberProfile?.holidays ?? [];
  return holidays.some((holiday) => dayKeyUTC(new Date(holiday)) === parts.dayKey);
}

function assertWithinBarberAvailability(start, end, barberProfile) {
  const workingHours = barberProfile?.workingHours ?? {};
  const open = parseWorkHour(workingHours.start, 9 * 60);
  const close = parseWorkHour(workingHours.end, 18 * 60);

  const startParts = tzParts(start);
  const endParts = tzParts(end);
  if (startParts.dayKey !== endParts.dayKey) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno debe empezar y terminar el mismo día",
    );
  }

  if (startParts.minutes < open || endParts.minutes > close) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno está fuera de la jornada laboral del barbero",
    );
  }

  if (isNonWorkingDay(startParts, barberProfile)) {
    throw createAppError(
      400,
      "BARBER_DAY_OFF",
      "El barbero no trabaja ese día",
    );
  }
}

// RN2: resuelve duración total y precio base desde los servicios elegidos.
async function resolveDurationAndPrice(serviceIds) {
  const serviceOids = serviceIds.map((id) =>
    toObjectIdOrThrow(id, "ID de servicio inválido"),
  );
  const services = await Service.find({
    _id: { $in: serviceOids },
    active: true,
  })
    .select("name duration price active")
    .lean();
  const servicesById = new Map(
    services.map((service) => [service._id.toString(), service]),
  );
  for (const id of serviceIds) {
    if (!servicesById.has(id)) {
      throw createAppError(
        404,
        "NOT_FOUND",
        "Servicio no encontrado o inactivo",
      );
    }
  }
  const duration = serviceIds.reduce(
    (total, id) => total + servicesById.get(id).duration,
    0,
  );
  const price = serviceIds.reduce(
    (total, id) => total + servicesById.get(id).price,
    0,
  );
  return { serviceOids, duration, price };
}

async function getBarberOrThrow(barberId) {
  const barberOid = toObjectIdOrThrow(barberId, "ID de barbero inválido");
  const barber = await User.findById(barberOid)
    .select("role name barberProfile")
    .lean();
  if (!barber || barber.role !== "barber") {
    throw createAppError(404, "NOT_FOUND", "Barbero no encontrado");
  }
  return { barber, barberOid };
}

function overlaps(candidateStart, candidateEnd, bookings) {
  return bookings.some(
    (booking) => candidateStart < booking.end && candidateEnd > booking.start,
  );
}

// Genera slots libres de un día (UTC) dentro de [open, close] con paso step.
function generateDaySlots({ dayStart, open, close, duration, step, bookings, now }) {
  const slots = [];
  for (
    let offset = open;
    offset + duration <= close;
    offset += step
  ) {
    const slotStart = new Date(dayStart.getTime() + offset * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
    if (slotEnd <= now) continue;
    if (overlaps(slotStart, slotEnd, bookings)) continue;
    slots.push({
      startAt: slotStart.toISOString(),
      endAt: slotEnd.toISOString(),
    });
  }
  return slots;
}

// Busca el próximo slot libre desde `from` (inclusive, redondeado al step)
// recorriendo el día actual y los siguientes hasta horizonDays.
function findNextAvailable({
  from,
  duration,
  barberProfile,
  bookings,
  step,
  horizonDays,
}) {
  const workingHours = barberProfile?.workingHours ?? {};
  const open = parseWorkHour(workingHours.start, 9 * 60);
  const close = parseWorkHour(workingHours.end, 18 * 60);
  const now = new Date();

  const fromParts = tzParts(from);
  const baseDay = businessDayStartUtc(fromParts.dayKey);

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const dayStart = new Date(baseDay.getTime() + dayOffset * DAY_MS);
    const dayParts = tzParts(dayStart);
    if (isNonWorkingDay(dayParts, barberProfile)) continue;

    let startOffset = open;
    if (dayOffset === 0) {
      const fromMin =
        fromParts.dayKey === dayParts.dayKey ? fromParts.minutes : open;
      // Redondea hacia arriba al múltiplo de step desde open.
      startOffset = Math.max(
        open,
        open + Math.ceil((fromMin - open) / step) * step,
      );
    }

    for (
      let offset = startOffset;
      offset + duration <= close;
      offset += step
    ) {
      const slotStart = new Date(dayStart.getTime() + offset * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
      if (slotStart < from || slotEnd <= now) continue;
      const slotParts = tzParts(slotStart);
      const slotEndParts = tzParts(slotEnd);
      if (
        slotParts.dayKey !== slotEndParts.dayKey ||
        slotParts.dayKey !== dayParts.dayKey
      ) {
        continue;
      }
      if (overlaps(slotStart, slotEnd, bookings)) continue;
      return {
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
      };
    }
  }
  return null;
}

// YYYY-MM-DD nombra un día comercial; un datetime toma su día comercial.
function toBusinessDayKey(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match) {
    const key = `${match[1]}-${match[2]}-${match[3]}`;
    const probe = new Date(`${key}T00:00:00Z`);
    if (
      Number.isNaN(probe.getTime()) ||
      probe.toISOString().slice(0, 10) !== key
    ) {
      throw createAppError(
        400,
        "VALIDATION_ERROR",
        "Fecha inválida, use YYYY-MM-DD o ISO8601 UTC",
      );
    }
    return key;
  }
  return tzParts(parseISODate(date)).dayKey;
}

function toAppointmentDTO(doc) {
  const barber =
    doc.barber_id && typeof doc.barber_id === "object"
      ? {
          id: doc.barber_id._id.toString(),
          name: doc.barber_id.name,
        }
      : { id: doc.barber_id.toString() };
  const client =
    doc.client_id && typeof doc.client_id === "object"
      ? {
          id: doc.client_id._id.toString(),
          name: doc.client_id.name,
        }
      : { id: doc.client_id.toString() };
  const services = Array.isArray(doc.service_ids)
    ? doc.service_ids.map((service) =>
        service && typeof service === "object"
          ? {
              id: service._id.toString(),
              name: service.name,
              price: service.price,
              duration: service.duration,
            }
          : { id: service.toString() },
      )
    : [];

  return {
    id: doc._id.toString(),
    barber,
    client,
    services,
    startAt: new Date(doc.start_at).toISOString(),
    endAt: new Date(doc.end_at).toISOString(),
    status: doc.status,
    priceSnapshot: doc.price_snapshot,
    durationSnapshot: doc.duration_snapshot,
  };
}

export async function createAppointment({
  clientId,
  barberId,
  serviceIds,
  startAt,
}) {
  const clientOid = toObjectIdOrThrow(clientId, "ID de cliente inválido");
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Debe seleccionar al menos un servicio",
    );
  }

  const start = parseISODate(startAt);

  // RN2: duración total y precio base = suma de los servicios elegidos.
  const { serviceOids, duration, price } =
    await resolveDurationAndPrice(serviceIds);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const { barber, barberOid } = await getBarberOrThrow(barberId);

  // RN10: jornada + francos + feriados.
  assertWithinBarberAvailability(start, end, barber.barberProfile);

  // RN1: sin solapamiento con otro turno pendiente del mismo barbero.
  const overlap = await Appointment.exists({
    barber_id: barberOid,
    status: "pending",
    start_at: { $lt: end },
    end_at: { $gt: start },
  });
  if (overlap) {
    // Sugerencia del próximo horario libre (no bloquea el 409 si falla).
    let suggestedStartAt;
    try {
      const horizonEnd = new Date(start.getTime() + 14 * DAY_MS);
      const upcoming = await Appointment.find({
        barber_id: barberOid,
        status: "pending",
        start_at: { $lt: horizonEnd },
        end_at: { $gt: start },
      })
        .select("start_at end_at")
        .lean();
      const bookings = upcoming.map((booking) => ({
        start: new Date(booking.start_at),
        end: new Date(booking.end_at),
      }));
      const next = findNextAvailable({
        from: start,
        duration,
        barberProfile: barber.barberProfile,
        bookings,
        step: 30,
        horizonDays: 14,
      });
      suggestedStartAt = next?.startAt;
    } catch {
      suggestedStartAt = undefined;
    }
    throw createAppError(
      409,
      "CONFLICT",
      "Horario no disponible para ese barbero",
      suggestedStartAt ? { suggestedStartAt } : undefined,
    );
  }

  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const docs = await Appointment.create(
        [
          {
            barber_id: barberOid,
            client_id: clientOid,
            service_ids: serviceOids,
            start_at: start,
            end_at: end,
            status: "pending",
            price_snapshot: price,
            duration_snapshot: duration,
          },
        ],
        { session },
      );
      created = docs[0];
    });
  } finally {
    await session.endSession();
  }

  return toAppointmentDTO(created.toObject());
}

export async function listAppointments({ requester, barberId, date, status }) {
  const filter = {};

  // Filtrado obligatorio por identidad (excepción: admin).
  if (requester.role === "client") {
    filter.client_id = toObjectIdOrThrow(
      requester.id,
      "ID de cliente inválido",
    );
  } else if (requester.role === "barber") {
    filter.barber_id = toObjectIdOrThrow(
      requester.id,
      "ID de barbero inválido",
    );
  } else if (barberId) {
    filter.barber_id = toObjectIdOrThrow(barberId, "ID de barbero inválido");
  }

  if (date) {
    const dayStart = businessDayStartUtc(toBusinessDayKey(date));
    filter.start_at = {
      $gte: dayStart,
      $lt: new Date(dayStart.getTime() + DAY_MS),
    };
  }

  if (status) {
    filter.status = status;
  }

  const appointments = await Appointment.find(filter)
    .select(
      "barber_id client_id service_ids start_at end_at status price_snapshot duration_snapshot",
    )
    .sort({ start_at: 1 })
    .populate("barber_id", "name")
    .populate("client_id", "name")
    .populate("service_ids", "name price duration")
    .lean();

  return appointments.map(toAppointmentDTO);
}

export async function getAvailability({
  barberId,
  date,
  serviceIds,
  durationMinutes,
  step = 30,
  horizonDays = 14,
}) {
  const { barber, barberOid } = await getBarberOrThrow(barberId);

  let duration = durationMinutes;
  if (serviceIds?.length) {
    const resolved = await resolveDurationAndPrice(serviceIds);
    duration = resolved.duration;
  }
  if (!Number.isInteger(duration) || duration < 1) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Debe enviar serviceIds o durationMinutes",
    );
  }

  const requestedKey = toBusinessDayKey(date);
  const baseDay = businessDayStartUtc(requestedKey);
  const horizonEnd = new Date(baseDay.getTime() + horizonDays * DAY_MS);

  const upcoming = await Appointment.find({
    barber_id: barberOid,
    status: "pending",
    start_at: { $lt: horizonEnd },
    end_at: { $gt: baseDay },
  })
    .select("start_at end_at")
    .lean();
  const bookings = upcoming.map((booking) => ({
    start: new Date(booking.start_at),
    end: new Date(booking.end_at),
  }));

  const workingHours = barber.barberProfile?.workingHours ?? {};
  const open = parseWorkHour(workingHours.start, 9 * 60);
  const close = parseWorkHour(workingHours.end, 18 * 60);
  const now = new Date();

  let slots = [];
  if (!isNonWorkingDay(tzParts(baseDay), barber.barberProfile)) {
    slots = generateDaySlots({
      dayStart: baseDay,
      open,
      close,
      duration,
      step,
      bookings,
      now,
    });
  }

  const nextAvailable = findNextAvailable({
    from: new Date(Math.max(baseDay.getTime(), now.getTime())),
    duration,
    barberProfile: barber.barberProfile,
    bookings,
    step,
    horizonDays,
  });

  // Días no laborables del horizonte (solo calendario, sin queries extra)
  // para que el front deshabilite esos días sin pedir availability por día.
  const nonWorkingDays = [];
  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const dayStart = new Date(baseDay.getTime() + dayOffset * DAY_MS);
    const dayParts = tzParts(dayStart);
    if (isNonWorkingDay(dayParts, barber.barberProfile)) {
      nonWorkingDays.push(dayParts.dayKey);
    }
  }

  return {
    barberId: barberOid.toString(),
    date: requestedKey,
    duration,
    workingHours: {
      start: workingHours.start ?? "09:00",
      end: workingHours.end ?? "18:00",
    },
    slots,
    nextAvailable,
    nonWorkingDays,
  };
}
