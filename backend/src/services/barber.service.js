import { Appointment } from "../models/Appointment.js";
import { BookingLock } from "../models/BookingLock.js";
import { User } from "../models/User.js";
import { createAppError } from "../utils/appError.js";
import {
  DAY_MS,
  tzParts,
  utcDayStart,
} from "../utils/businessTime.js";
import { createHash } from "../utils/bcrypt.js";
import { assertObjectId } from "../utils/objectId.js";
import { DEFAULT_WORKING_HOURS } from "./availability.service.js";
import { cancelInvalidAppointmentsForBarber } from "./businessCancellation.service.js";
import { loadHolidayKeys } from "./holiday.service.js";

function toBarberDTO(barber, ratingStats = null) {
  const dto = {
    id: barber._id.toString(),
    name: barber.name,
    email: barber.email,
    role: barber.role,
    active: barber.active,
    barberProfile: barber.barberProfile,
  };
  // EP-7 / CA-21: promedio interno, solo para el panel de la barbería.
  if (ratingStats) {
    dto.ratingAverage = ratingStats.average;
    dto.ratingCount = ratingStats.count;
  }
  return dto;
}

// Promedio de calificaciones por barbero sobre turnos completados y
// calificados. Se redondea a 1 decimal; sin notas el promedio es null.
async function getRatingStatsByBarberIds(barberIds) {
  if (barberIds.length === 0) return new Map();

  const rows = await Appointment.aggregate([
    {
      $match: {
        barber_id: { $in: barberIds },
        status: "completed",
        rating: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$barber_id",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Todos los barberos consultados tienen entrada, con cero notas si no hay.
  const stats = new Map(
    barberIds.map((id) => [id.toString(), { average: null, count: 0 }]),
  );
  for (const row of rows) {
    stats.set(row._id.toString(), {
      average: Math.round(row.average * 10) / 10,
      count: row.count,
    });
  }
  return stats;
}

export async function createBarber({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const exists = await User.findOne({ email: normalizedEmail }).lean();
  if (exists) {
    throw createAppError(409, "CONFLICT", "Email ya registrado.");
  }

  const password_hash = await createHash(password);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password_hash,
    role: "barber",
  });

  // El lock se crea junto con el barbero. Si falla, la primera reserva lo
  // puede crear con upsert; no conviene romper el alta por esto.
  try {
    await BookingLock.updateOne(
      { barber_id: user._id },
      { $setOnInsert: { version: 0 } },
      { upsert: true },
    );
  } catch (err) {
    console.error(
      "[barber] no se pudo crear el booking lock",
      err?.code || "",
      err?.message || err,
    );
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function listBarbers({
  includeInactive = false,
  includeRating = false,
} = {}) {
  const filter = { role: "barber" };
  if (!includeInactive) {
    filter.active = true;
  }
  const barbers = await User.find(filter)
    .select("name email role active barberProfile")
    .lean();
  if (!includeRating) return barbers.map((barber) => toBarberDTO(barber));

  const stats = await getRatingStatsByBarberIds(
    barbers.map((barber) => barber._id),
  );
  return barbers.map((barber) =>
    toBarberDTO(barber, stats.get(barber._id.toString())),
  );
}

export async function getBarberById(id) {
  assertObjectId(id, "ID de barbero inválido");

  const barber = await User.findOne({ _id: id, role: "barber" })
    .select("name email role active barberProfile")
    .lean();
  if (!barber) {
    throw createAppError(404, "NOT_FOUND", "Barbero no encontrado");
  }

  const stats = await getRatingStatsByBarberIds([barber._id]);
  return toBarberDTO(barber, stats.get(barber._id.toString()));
}

export async function updateBarberProfile(
  id,
  patch,
  { actorId = null } = {},
) {
  assertObjectId(id, "ID de barbero inválido");

  const current = await User.findOne({ _id: id, role: "barber" })
    .select("barberProfile")
    .lean();
  if (!current) {
    throw createAppError(404, "NOT_FOUND", "Barbero no encontrado");
  }

  // 2.4: un PATCH parcial puede traer solo `start` o solo `end`. Se valida
  // contra los valores guardados para no dejar la jornada invertida.
  const currentStart =
    current.barberProfile?.workingHours?.start ??
    DEFAULT_WORKING_HOURS.start;
  const currentEnd =
    current.barberProfile?.workingHours?.end ??
    DEFAULT_WORKING_HOURS.end;
  const nextStart = patch.workingHours?.start ?? currentStart;
  const nextEnd = patch.workingHours?.end ?? currentEnd;
  if (nextStart >= nextEnd) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "La salida debe ser posterior a la entrada",
    );
  }

  const update = {};
  if (patch.name !== undefined) {
    const normalizedName = patch.name.trim();
    if (!normalizedName) {
      throw createAppError(400, "VALIDATION_ERROR", "Nombre requerido");
    }
    update.name = normalizedName;
  }
  if (patch.workingHours?.start !== undefined) {
    update["barberProfile.workingHours.start"] = patch.workingHours.start;
  }
  if (patch.workingHours?.end !== undefined) {
    update["barberProfile.workingHours.end"] = patch.workingHours.end;
  }
  if (patch.daysOff !== undefined) {
    update["barberProfile.daysOff"] = patch.daysOff.map((day) => new Date(day));
  }
  if (patch.weeklyDaysOff !== undefined) {
    update["barberProfile.weeklyDaysOff"] = [...new Set(patch.weeklyDaysOff)];
  }
  if (patch.active !== undefined) {
    if (patch.active === false) {
      const hasPending = await Appointment.exists({
        barber_id: id,
        status: "pending",
      });
      if (hasPending) {
        throw createAppError(
          409,
          "CONFLICT",
          "No se puede desactivar un barbero con turnos pendientes",
        );
      }
    }
    update.active = patch.active;
  }
  if (Object.keys(update).length === 0) {
    throw createAppError(400, "VALIDATION_ERROR", "Nada para actualizar");
  }

  const barber = await User.findOneAndUpdate(
    { _id: id, role: "barber" },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  )
    .select("name email role active barberProfile")
    .lean();

  if (!barber) {
    throw createAppError(404, "NOT_FOUND", "Barbero no encontrado");
  }

  // 2.6: si cambió la jornada o los francos, los turnos pendientes que quedaron
  // fuera de la nueva disponibilidad se cancelan sin penalización y se avisa
  // al cliente. Un fallo del barrido no revierte el cambio de perfil.
  let cancelledAppointments = 0;
  let failedCancellations = 0;
  const affectsAvailability =
    patch.workingHours !== undefined ||
    patch.daysOff !== undefined ||
    patch.weeklyDaysOff !== undefined;

  if (affectsAvailability) {
    const now = new Date();
    const todayKey = tzParts(now).dayKey;
    const lastPending = await Appointment.findOne({
      barber_id: barber._id,
      status: "pending",
      start_at: { $gte: now },
    })
      .sort({ start_at: -1 })
      .select("start_at")
      .lean();

    const lastKey = lastPending
      ? tzParts(new Date(lastPending.start_at)).dayKey
      : todayKey;
    const holidayKeys = await loadHolidayKeys({
      from: utcDayStart(todayKey),
      to: new Date(utcDayStart(lastKey).getTime() + DAY_MS),
    });

    const result = await cancelInvalidAppointmentsForBarber({
      barberId: barber._id,
      barberProfile: barber.barberProfile,
      holidayKeys,
      actorId,
      now,
    });
    cancelledAppointments = result.cancelled;
    failedCancellations = result.failed;
  }

  const stats = await getRatingStatsByBarberIds([barber._id]);
  return {
    ...toBarberDTO(barber, stats.get(barber._id.toString())),
    cancelledAppointments,
    failedCancellations,
  };
}
