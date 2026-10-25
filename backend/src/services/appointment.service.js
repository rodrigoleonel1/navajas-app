import { waitUntil } from "@vercel/functions";
import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { BookingLock } from "../models/BookingLock.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { createAppError } from "../utils/appError.js";
import {
  businessDayStartUtc,
  DAY_MS,
  dayKeyUTC,
  parseWorkHour,
  tzParts,
} from "../utils/businessTime.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";
import {
  createNotification,
  sendNotification,
} from "./notification.service.js";

// Parsea un ISO8601 UTC o tira 400 VALIDATION_ERROR si es inválido.
function parseISODate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createAppError(400, "VALIDATION_ERROR", "Fecha inválida, use ISO8601 UTC");
  }
  return date;
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
  const orderedServices = serviceIds.map((id) => servicesById.get(id));
  return { serviceOids, services: orderedServices, duration, price };
}

async function getBarberOrThrow(barberId) {
  const barberOid = toObjectIdOrThrow(barberId, "ID de barbero inválido");
  const barber = await User.findById(barberOid)
    .select("role name active barberProfile")
    .lean();
  if (!barber || barber.role !== "barber" || !barber.active) {
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

// Mantiene vivo el envío en Vercel sin bloquear la respuesta HTTP. En local
// no hay contexto de Vercel, así que se usa el comportamiento anterior.
function scheduleNotificationSend(notificationId) {
  const sendPromise = sendNotification(notificationId).catch((err) => {
    console.error(
      "[appointment] no se pudo enviar la confirmación",
      err?.code || "",
      err?.message || err,
    );
  });

  if (process.env.VERCEL) {
    try {
      waitUntil(sendPromise);
      return;
    } catch (err) {
      console.error(
        "[appointment] no se pudo registrar waitUntil",
        err?.message || err,
      );
    }
  }

  void sendPromise;
}

// Encola la confirmación por email (RN0) después de crear el turno. El envío
// no bloquea la respuesta: si falla, queda registrado en la notificación para
// poder reintentarlo más adelante.
async function enqueueAppointmentConfirmation({
  appointment,
  client,
  barber,
  services,
}) {
  try {
    const notification = await createNotification({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type: "confirmacion_turno",
      payload: {
        clientName: client.name,
        barberName: barber.name,
        services: services.map((service) => service.name),
        startAt: new Date(appointment.start_at).toISOString(),
        endAt: new Date(appointment.end_at).toISOString(),
        duration: appointment.duration_snapshot,
        price: appointment.price_snapshot,
      },
    });

    scheduleNotificationSend(notification._id);
  } catch (err) {
    // Un fallo al encolar tampoco debe afectar la reserva.
    console.error(
      "[appointment] no se pudo crear la notificación",
      err?.code || "",
      err?.message || err,
    );
  }
}

// Arma el 409 con la sugerencia de próximo horario libre. Se usa después de
// que la transacción detecta el solapamiento, para no hacer queries extra
// mientras la transacción está abierta.
async function buildConflictError({ barberOid, start, duration, barberProfile }) {
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
      barberProfile,
      bookings,
      step: 30,
      horizonDays: 14,
    });
    suggestedStartAt = next?.startAt;
  } catch {
    suggestedStartAt = undefined;
  }

  return createAppError(
    409,
    "CONFLICT",
    "Horario no disponible para ese barbero",
    suggestedStartAt ? { suggestedStartAt } : undefined,
  );
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

  const client = await User.findById(clientOid)
    .select("name email role active")
    .lean();
  if (!client || client.role !== "client" || client.active === false) {
    throw createAppError(404, "NOT_FOUND", "Cliente no encontrado");
  }

  const start = parseISODate(startAt);

  // RN2: duración total y precio base = suma de los servicios elegidos.
  const { serviceOids, services, duration, price } =
    await resolveDurationAndPrice(serviceIds);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const { barber, barberOid } = await getBarberOrThrow(barberId);

  // RN10: jornada + francos + feriados.
  assertWithinBarberAvailability(start, end, barber.barberProfile);

  const session = await mongoose.startSession();
  let created;
  try {
    const runTransaction = () =>
      session.withTransaction(async () => {
        // Lock por barbero: dos transacciones del mismo barbero no pueden
        // incrementar este documento a la vez. La que pierde se reintenta.
        await BookingLock.findOneAndUpdate(
          { barber_id: barberOid },
          { $inc: { version: 1 } },
          { upsert: true, session },
        );

        // RN1: la verificación definitiva va dentro de la transacción.
        const overlap = await Appointment.exists({
          barber_id: barberOid,
          status: "pending",
          start_at: { $lt: end },
          end_at: { $gt: start },
        }).session(session);

        if (overlap) {
          throw createAppError(
            409,
            "CONFLICT",
            "Horario no disponible para ese barbero",
          );
        }

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

    try {
      await runTransaction();
    } catch (err) {
      // Dos primeras reservas del mismo barbero pueden chocar al crear el
      // lock con upsert. Se reintenta una vez; el resto de errores sigue.
      if (
        err?.code === 11000 &&
        (err?.keyPattern?.barber_id || err?.keyValue?.barber_id)
      ) {
        await runTransaction();
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (err?.statusCode === 409 && err?.code === "CONFLICT") {
      throw await buildConflictError({
        barberOid,
        start,
        duration,
        barberProfile: barber.barberProfile,
      });
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const appointmentDTO = toAppointmentDTO(created.toObject());

  // RN0: confirmación por email. La reserva ya está confirmada; un fallo de
  // email no la afecta.
  await enqueueAppointmentConfirmation({
    appointment: created,
    client,
    barber,
    services,
  });

  return appointmentDTO;
}

export async function listAppointments({
  requester,
  barberId,
  date,
  status,
  limit,
  cursor,
  order,
  page,
}) {
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

  // Cursor excluyente sobre start_at (paginación). Se combina con el rango de
  // `date` si lo hay: el más restrictivo de los dos límites gana.
  if (cursor) {
    const cursorDate = new Date(cursor);
    const isDesc = order === "desc";
    const bound = { ...(filter.start_at ?? {}) };
    const key = isDesc ? "$lt" : "$gt";
    const previous = bound[key];
    bound[key] =
      previous instanceof Date
        ? new Date(
            isDesc
              ? Math.min(previous.getTime(), cursorDate.getTime())
              : Math.max(previous.getTime(), cursorDate.getTime()),
          )
        : cursorDate;
    filter.start_at = bound;
  }

  // Sin limit no hay tope: admin y barbero listan el día completo como siempre.
  // El total es del filtro completo (sin skip/limit) y solo se cuenta al paginar.
  const total = limit ? await Appointment.countDocuments(filter) : null;

  const query = Appointment.find(filter)
    .select(
      "barber_id client_id service_ids start_at end_at status price_snapshot duration_snapshot",
    )
    .sort({ start_at: order === "desc" ? -1 : 1 })
    .populate("barber_id", "name")
    .populate("client_id", "name")
    .populate("service_ids", "name price duration")
    .lean();

  if (limit) {
    query.limit(limit);
    if (page && page > 1) query.skip((page - 1) * limit);
  }

  const appointments = await query;

  return { appointments: appointments.map(toAppointmentDTO), total };
}

// V1: el admin pasa un turno pendiente a completado o cancelado.
// Al salir de pending el horario se libera solo (solapes solo cuentan pending).
export async function updateAppointmentStatus({ id, status }) {
  if (!["completed", "cancelled"].includes(status)) {
    throw createAppError(400, "VALIDATION_ERROR", "Estado inválido");
  }
  const appointmentOid = toObjectIdOrThrow(id, "ID de turno inválido");
  const appointment = await Appointment.findById(appointmentOid);
  if (!appointment) {
    throw createAppError(404, "NOT_FOUND", "Turno no encontrado");
  }
  if (appointment.status !== "pending") {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Solo se puede cambiar un turno pendiente",
    );
  }
  appointment.status = status;
  await appointment.save();

  const populated = await Appointment.findById(appointmentOid)
    .select(
      "barber_id client_id service_ids start_at end_at status price_snapshot duration_snapshot",
    )
    .populate("barber_id", "name")
    .populate("client_id", "name")
    .populate("service_ids", "name price duration")
    .lean();
  return toAppointmentDTO(populated);
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
