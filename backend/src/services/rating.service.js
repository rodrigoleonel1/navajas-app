import { Appointment } from "../models/Appointment.js";
import { createAppError } from "../utils/appError.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";

// EP-7 / CA-21: el cliente califica con 1 a 5 estrellas un turno propio ya
// completado. La nota queda embebida en el turno y es inmutable: no se edita
// ni se borra, y un segundo intento se rechaza.
export async function createRating({ appointmentId, score, clientId }) {
  const appointmentOid = toObjectIdOrThrow(
    appointmentId,
    "ID de turno inválido",
  );

  const appointment = await Appointment.findOne({
    _id: appointmentOid,
    client_id: clientId,
  })
    .select("barber_id status rating")
    .lean();

  if (!appointment) {
    throw createAppError(404, "NOT_FOUND", "Turno no encontrado");
  }

  if (appointment.status !== "completed") {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Solo se puede calificar un turno completado",
    );
  }

  if (appointment.rating != null) {
    throw createAppError(
      409,
      "ALREADY_RATED",
      "Este turno ya fue calificado",
    );
  }

  const ratedAt = new Date();
  // Filtro atómico: si dos pedidos llegan a la vez, solo uno setea la nota.
  const updated = await Appointment.findOneAndUpdate(
    {
      _id: appointmentOid,
      client_id: clientId,
      status: "completed",
      rating: null,
    },
    { $set: { rating: score, rated_at: ratedAt } },
    { returnDocument: "after" },
  )
    .select("barber_id rating rated_at")
    .lean();

  if (!updated) {
    throw createAppError(
      409,
      "ALREADY_RATED",
      "Este turno ya fue calificado",
    );
  }

  return {
    appointmentId: updated._id.toString(),
    barberId: updated.barber_id.toString(),
    score: updated.rating,
    ratedAt: new Date(updated.rated_at).toISOString(),
  };
}
