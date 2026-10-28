import { Appointment } from "../models/Appointment.js";
import { User } from "../models/User.js";
import {
  businessDayRangeFilter,
  shiftDayKey,
  tzParts,
} from "../utils/businessTime.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";
import {
  addCompletedAppointment,
  emptyIncomeTotals,
} from "./income.js";

function dayKeysBetween(from, to) {
  const keys = [];
  let current = from;
  while (current <= to) {
    keys.push(current);
    current = shiftDayKey(current, 1);
  }
  return keys;
}

// Ingresos del barbero autenticado para un rango de días comerciales.
export async function getBarberEarnings({ barberId, from, to }) {
  const barberOid = toObjectIdOrThrow(barberId, "ID de barbero inválido");

  const appointments = await Appointment.find({
    barber_id: barberOid,
    status: "completed",
    start_at: businessDayRangeFilter(from, to),
  })
    .select("start_at price_snapshot")
    .lean();

  const days = new Map(
    dayKeysBetween(from, to).map((date) => [
      date,
      { date, ...emptyIncomeTotals() },
    ]),
  );
  const totals = emptyIncomeTotals();

  for (const appointment of appointments) {
    const date = tzParts(appointment.start_at).dayKey;
    const day = days.get(date);
    if (!day) continue;
    addCompletedAppointment(day, appointment.price_snapshot);
    addCompletedAppointment(totals, appointment.price_snapshot);
  }

  return {
    from,
    to,
    totals,
    days: [...days.values()],
  };
}

// Ingresos del admin para un rango de días comerciales: totales, serie diaria
// y detalle por barbero. Incluye a todos los barberos activos (aunque tengan
// cero turnos) y a los inactivos que sí tuvieron turnos completados en el rango.
export async function getAdminEarnings({ from, to }) {
  const [barbers, appointments] = await Promise.all([
    User.find({ role: "barber" }).select("name active").lean(),
    Appointment.find({
      status: "completed",
      start_at: businessDayRangeFilter(from, to),
    })
      .select("barber_id start_at price_snapshot")
      .lean(),
  ]);

  const barberById = new Map(
    barbers.map((barber) => [barber._id.toString(), barber]),
  );
  const rows = new Map();

  for (const barber of barbers) {
    if (barber.active) {
      rows.set(barber._id.toString(), {
        barberId: barber._id.toString(),
        barberName: barber.name,
        ...emptyIncomeTotals(),
      });
    }
  }

  const days = new Map(
    dayKeysBetween(from, to).map((date) => [
      date,
      { date, ...emptyIncomeTotals() },
    ]),
  );
  const totals = emptyIncomeTotals();

  for (const appointment of appointments) {
    const barberId = appointment.barber_id.toString();
    const barber = barberById.get(barberId);
    if (!barber) continue;

    let row = rows.get(barberId);
    if (!row) {
      row = {
        barberId,
        barberName: barber.name,
        ...emptyIncomeTotals(),
      };
      rows.set(barberId, row);
    }
    addCompletedAppointment(row, appointment.price_snapshot);
    addCompletedAppointment(totals, appointment.price_snapshot);

    const day = days.get(tzParts(appointment.start_at).dayKey);
    if (day) addCompletedAppointment(day, appointment.price_snapshot);
  }

  const barberRows = [...rows.values()].sort((a, b) =>
    a.barberName.localeCompare(b.barberName, "es"),
  );

  return {
    from,
    to,
    totals,
    days: [...days.values()],
    barbers: barberRows,
  };
}
