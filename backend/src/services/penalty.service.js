import { Appointment } from "../models/Appointment.js";
import { twoMonthsAgo } from "../utils/cancellation.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";

// RN5: con 3 o más inasistencias sin usar de los últimos 2 meses, la próxima
// reserva lleva un recargo del 20%.
export const PENALTY_THRESHOLD = 3;
export const PENALTY_SURCHARGE_PERCENT = 20;
export const PENALTY_WINDOW_MONTHS = 2;

// Filtro compartido con applyPenaltyIfNeeded: inasistencias no usadas dentro de
// la ventana de 2 meses. Cuentan el no-show y la cancelación tardía/bloqueada.
export function penaltyFilter({ clientOid, now = new Date() }) {
  return {
    client_id: clientOid,
    penalty_used: false,
    start_at: { $gte: twoMonthsAgo(now) },
    $or: [
      { status: "no_show" },
      { status: "cancelled", cancel_type: { $in: ["late", "blocked"] } },
    ],
  };
}

// Estado de penalizaciones del cliente para mostrar el aviso previo a reservar
// y la tarjeta de "Mis vales". Es solo lectura: no marca nada como usado.
export async function getClientPenaltyStatus({ userId, now = new Date() }) {
  const clientOid = toObjectIdOrThrow(userId, "ID de cliente inválido");
  const count = await Appointment.countDocuments(
    penaltyFilter({ clientOid, now }),
  );

  return {
    count,
    threshold: PENALTY_THRESHOLD,
    remaining: Math.max(PENALTY_THRESHOLD - count, 0),
    surchargePercent: PENALTY_SURCHARGE_PERCENT,
    windowMonths: PENALTY_WINDOW_MONTHS,
    willApply: count >= PENALTY_THRESHOLD,
  };
}

// RN5: al reservar se cuentan las inasistencias no usadas de los últimos
// 2 meses. Con 3 o más se aplica el recargo y se marcan como usadas.
export async function applyPenaltyIfNeeded({
  clientOid,
  basePrice,
  session,
  now,
}) {
  const noShows = await Appointment.find(penaltyFilter({ clientOid, now }))
    .select("_id")
    .session(session)
    .lean();

  if (noShows.length < PENALTY_THRESHOLD) {
    return { extra: 0, price: basePrice };
  }

  await Appointment.updateMany(
    { _id: { $in: noShows.map((item) => item._id) } },
    { $set: { penalty_used: true } },
    { session },
  );

  const extra = Math.round(
    (basePrice * PENALTY_SURCHARGE_PERCENT) / 100,
  );
  return { extra, price: basePrice + extra };
}
