import { Appointment } from "../models/Appointment.js";
import { Holiday } from "../models/Holiday.js";
import { createAppError } from "../utils/appError.js";
import {
  businessDayStartUtc,
  DAY_MS,
  dayKeyUTC,
  utcDayStart,
} from "../utils/businessTime.js";
import { assertObjectId } from "../utils/objectId.js";

function toHolidayDTO(holiday) {
  return {
    id: holiday._id.toString(),
    date: dayKeyUTC(new Date(holiday.date)),
    name: holiday.name,
  };
}

async function countPendingAppointments(dayKey) {
  const dayStart = businessDayStartUtc(dayKey);
  return Appointment.countDocuments({
    status: "pending",
    start_at: {
      $gte: dayStart,
      $lt: new Date(dayStart.getTime() + DAY_MS),
    },
  });
}

export async function listHolidays() {
  const holidays = await Holiday.find({}).sort({ date: 1 }).lean();
  return holidays.map(toHolidayDTO);
}

export async function createHoliday({ date, name }) {
  let holiday;
  try {
    holiday = await Holiday.create({
      date: utcDayStart(date),
      name: name.trim(),
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

  // No se cancelan turnos automáticamente: el admin recibe la advertencia y
  // decide si los cancela. Un fallo del conteo no debe romper el alta.
  let affectedAppointments = 0;
  try {
    affectedAppointments = await countPendingAppointments(date);
  } catch (err) {
    console.error(
      "[holiday] no se pudieron contar los turnos afectados",
      err?.code || "",
      err?.message || err,
    );
  }

  return {
    holiday: toHolidayDTO(holiday.toObject()),
    affectedAppointments,
  };
}

export async function updateHoliday(id, patch) {
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

  try {
    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!holiday) {
      throw createAppError(404, "NOT_FOUND", "Feriado no encontrado");
    }
    return toHolidayDTO(holiday);
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
