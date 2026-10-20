import { createHash } from "../utils/bcrypt.js";
import { createAppError } from "../utils/appError.js";
import { assertObjectId } from "../utils/objectId.js";
import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";

function toBarberDTO(barber) {
  return {
    id: barber._id.toString(),
    name: barber.name,
    email: barber.email,
    role: barber.role,
    active: barber.active,
    barberProfile: barber.barberProfile,
  };
}

export async function createBarber({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const exists = await User.findOne({ email: normalizedEmail }).lean();
  if (exists) {
    throw createAppError(409, "CONFLICT", "Email ya registrado");
  }

  const password_hash = await createHash(password);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password_hash,
    role: "barber",
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function listBarbers({ includeInactive = false } = {}) {
  const filter = { role: "barber" };
  if (!includeInactive) {
    filter.active = true;
  }
  const barbers = await User.find(filter)
    .select("name email role active barberProfile")
    .lean();
  return barbers.map(toBarberDTO);
}

export async function getBarberById(id) {
  assertObjectId(id, "ID de barbero inválido");

  const barber = await User.findOne({ _id: id, role: "barber" })
    .select("name email role active barberProfile")
    .lean();
  if (!barber) {
    throw createAppError(404, "NOT_FOUND", "Barbero no encontrado");
  }

  return toBarberDTO(barber);
}

export async function updateBarberProfile(id, patch) {
  assertObjectId(id, "ID de barbero inválido");

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

  return toBarberDTO(barber);
}
