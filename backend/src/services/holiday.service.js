import { Holiday } from "../models/Holiday.js";
import { createAppError } from "../utils/appError.js";
import {
  dayKeyUTC,
  tzParts,
  utcDayStart,
} from "../utils/businessTime.js";
import { assertObjectId } from "../utils/objectId.js";
import { cancelAppointmentsOnHoliday } from "./businessCancellation.service.js";

function toHolidayDTO(holiday) {
  return {
    id: holiday._id.toString(),
    date: dayKeyUTC(new Date(holiday.date)),
    name: holiday.name,
  };
}

export async function listHolidays({ scope, limit, page } = {}) {
  const filter = {};
  if (scope) {
    // Los feriados son fechas calendario: el corte usa el día comercial actual
    // para que "hoy" siga contando como próximo.
    const todayStart = utcDayStart(tzParts(new Date()).dayKey);
    filter.date =
      scope === "past" ? { $lt: todayStart } : { $gte: todayStart };
  }

  // Sin limit no hay tope: mantiene el contrato de listado completo.
  const total = limit ? await Holiday.countDocuments(filter) : null;

  const query = Holiday.find(filter)
    .sort({ date: scope === "past" ? -1 : 1 })
    .lean();

  if (limit) {
    query.limit(limit);
    if (page && page > 1) query.skip((page - 1) * limit);
  }

  const holidays = await query;
  return { holidays: holidays.map(toHolidayDTO), total };
}

export async function createHoliday({ date, name, actorId = null }) {
  const holidayName = name.trim();
  let holiday;
  try {
    holiday = await Holiday.create({
      date: utcDayStart(date),
      name: holidayName,
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw createAppError(
        409,
        "CONFLICT",
        "Ya existe un feriado en esa fecha",
      );
    }
    throw err;
  }

  // RN10: los turnos pendientes de ese día se cancelan sin penalización y se
  // avisa al cliente por email + in-app. Un fallo del barrido no revierte el
  // feriado: se informa el conteo de fallos.
  const { cancelled, failed } = await cancelAppointmentsOnHoliday({
    dayKey: date,
    holidayName,
    actorId,
  });

  return {
    holiday: toHolidayDTO(holiday.toObject()),
    cancelledAppointments: cancelled,
    failedCancellations: failed,
  };
}

export async function updateHoliday(id, patch, { actorId = null } = {}) {
  assertObjectId(id, "ID de feriado inválido");

  const update = {};
  if (patch.date !== undefined) {
    update.date = utcDayStart(patch.date);
  }
  if (patch.name !== undefined) {
    update.name = patch.name.trim();
  }
  if (Object.keys(update).length === 0) {
    throw createAppError(400, "VALIDATION_ERROR", "Nada para actualizar");
  }

  let holiday;
  try {
    holiday = await Holiday.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!holiday) {
      throw createAppError(404, "NOT_FOUND", "Feriado no encontrado");
    }
  } catch (err) {
    if (err?.code === 11000) {
      throw createAppError(
        409,
        "CONFLICT",
        "Ya existe un feriado en esa fecha",
      );
    }
    throw err;
  }

  const dto = toHolidayDTO(holiday);

  // Si el feriado se movió de fecha, se cancelan los turnos del día nuevo.
  let cancelledAppointments = 0;
  let failedCancellations = 0;
  if (patch.date !== undefined) {
    const result = await cancelAppointmentsOnHoliday({
      dayKey: dto.date,
      holidayName: dto.name,
      actorId,
    });
    cancelledAppointments = result.cancelled;
    failedCancellations = result.failed;
  }

  return { ...dto, cancelledAppointments, failedCancellations };
}

export async function deleteHoliday(id) {
  assertObjectId(id, "ID de feriado inválido");
  const holiday = await Holiday.findByIdAndDelete(id).lean();
  if (!holiday) {
    throw createAppError(404, "NOT_FOUND", "Feriado no encontrado");
  }
  return toHolidayDTO(holiday);
}

// Devuelve un Set de YYYY-MM-DD para que la disponibilidad consulte feriados
// sin hacer una query por día.
export async function loadHolidayKeys({ from, to }) {
  if (!from || !to) return new Set();
  const holidays = await Holiday.find({
    date: { $gte: from, $lt: to },
  })
    .select("date")
    .lean();
  return new Set(holidays.map((holiday) => dayKeyUTC(new Date(holiday.date))));
}
