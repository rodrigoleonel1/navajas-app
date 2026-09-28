import mongoose from "mongoose";
import { createAppError } from "../utils/appError.js";
import { Appointment } from "../models/Appointment.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";

// Milisegundos de un día (24h*60m*60s*1000ms).
const DAY_MS = 24 * 60 * 60 * 1000;

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
function dayKeyUTC(date) {
  return date.toISOString().slice(0, 10);
}

// Convierte una hora a minutos desde la medianoche UTC (14:30 -> 870)
// para compararla numéricamente con la jornada del barbero.
function minutesSinceMidnightUTC(date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
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

// RN10 (sin feriados en este paso): el turno debe caer dentro de la
// jornada del barbero y en un día que no sea franco. Todo en UTC.
function assertWithinBarberAvailability(start, end, barberProfile) {
  const workingHours = barberProfile?.workingHours ?? {};
  const open = parseWorkHour(workingHours.start, 9 * 60);
  const close = parseWorkHour(workingHours.end, 18 * 60);

  if (dayKeyUTC(start) !== dayKeyUTC(end)) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno debe empezar y terminar el mismo día",
    );
  }

  const startMin = minutesSinceMidnightUTC(start);
  const endMin = minutesSinceMidnightUTC(end);
  if (startMin < open || endMin > close) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno está fuera de la jornada laboral del barbero",
    );
  }

  const startDay = dayKeyUTC(start);
  const daysOff = barberProfile?.daysOff ?? [];
  const isDayOff = daysOff.some(
    (dayOff) => dayKeyUTC(new Date(dayOff)) === startDay,
  );
  if (isDayOff) {
    throw createAppError(
      400,
      "BARBER_DAY_OFF",
      "El barbero no trabaja ese día",
    );
  }
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
  const barberOid = toObjectIdOrThrow(barberId, "ID de barbero inválido");
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Debe seleccionar al menos un servicio",
    );
  }
  const serviceOids = serviceIds.map((id) =>
    toObjectIdOrThrow(id, "ID de servicio inválido"),
  );

  const start = parseISODate(startAt);

  // RN2: duración total y precio base = suma de los servicios elegidos.
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
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const barber = await User.findById(barberOid)
    .select("role name barberProfile")
    .lean();
  if (!barber || barber.role !== "barber") {
    throw createAppError(404, "NOT_FOUND", "Barbero no encontrado");
  }

  // RN10: jornada + francos (holidays queda para V2).
  assertWithinBarberAvailability(start, end, barber.barberProfile);

  // RN1: sin solapamiento con otro turno pendiente del mismo barbero.
  const overlap = await Appointment.exists({
    barber_id: barberOid,
    status: "pending",
    start_at: { $lt: end },
    end_at: { $gt: start },
  });
  if (overlap) {
    throw createAppError(
      409,
      "CONFLICT",
      "Horario no disponible para ese barbero",
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
    const day = parseISODate(date);
    const dayStart = new Date(day);
    dayStart.setUTCHours(0, 0, 0, 0);
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
