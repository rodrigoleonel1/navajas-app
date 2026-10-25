import { Appointment } from "../models/Appointment.js";
import { User } from "../models/User.js";
import {
  businessDayStartUtc,
  DAY_MS,
  tzParts,
} from "../utils/businessTime.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";

// RN6: el barbero cobra el 60% del precio histórico final de cada turno
// completado. El 40% restante queda para el local.
const COMMISSION_RATE = 0.6;

function emptyTotals() {
  return {
    completed: 0,
    gross: 0,
    commission: 0,
    local: 0,
  };
}

function addAppointment(totals, priceSnapshot) {
  const price = Number(priceSnapshot) || 0;
  const commission = Math.round(price * COMMISSION_RATE);
  totals.completed += 1;
  totals.gross += price;
  totals.commission += commission;
  totals.local += price - commission;
}

function nextDayKey(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function dayKeysBetween(from, to) {
  const keys = [];
  let current = from;
  while (current <= to) {
    keys.push(current);
    current = nextDayKey(current);
  }
  return keys;
}

function dayRangeFilter(from, to) {
  return {
    $gte: businessDayStartUtc(from),
    $lt: businessDayStartUtc(nextDayKey(to)),
  };
}

// Ingresos del barbero autenticado para un rango de días comerciales.
export async function getBarberEarnings({ barberId, from, to }) {
  const barberOid = toObjectIdOrThrow(barberId, "ID de barbero inválido");

  const appointments = await Appointment.find({
    barber_id: barberOid,
    status: "completed",
    start_at: dayRangeFilter(from, to),
  })
    .select("start_at price_snapshot")
    .lean();

  const days = new Map(
    dayKeysBetween(from, to).map((date) => [
      date,
      { date, ...emptyTotals() },
    ]),
  );
  const totals = emptyTotals();

  for (const appointment of appointments) {
    const date = tzParts(appointment.start_at).dayKey;
    const day = days.get(date);
    if (!day) continue;
    addAppointment(day, appointment.price_snapshot);
    addAppointment(totals, appointment.price_snapshot);
  }

  return {
    from,
    to,
    totals,
    days: [...days.values()],
  };
}

// Liquidación diaria: todos los barberos activos (aunque tengan cero turnos)
// y los inactivos que sí tuvieron turnos completados ese día.
export async function getDailyEarnings({ date }) {
  const dayStart = businessDayStartUtc(date);
  const dayEnd = businessDayStartUtc(nextDayKey(date));

  const [barbers, appointments] = await Promise.all([
    User.find({ role: "barber" }).select("name active").lean(),
    Appointment.find({
      status: "completed",
      start_at: { $gte: dayStart, $lt: dayEnd },
    })
      .select("barber_id price_snapshot")
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
        ...emptyTotals(),
      });
    }
  }

  for (const appointment of appointments) {
    const barberId = appointment.barber_id.toString();
    const barber = barberById.get(barberId);
    if (!barber) continue;

    let row = rows.get(barberId);
    if (!row) {
      row = {
        barberId,
        barberName: barber.name,
        ...emptyTotals(),
      };
      rows.set(barberId, row);
    }
    addAppointment(row, appointment.price_snapshot);
  }

  const barberRows = [...rows.values()].sort((a, b) =>
    a.barberName.localeCompare(b.barberName, "es"),
  );
  const totals = emptyTotals();
  for (const row of barberRows) {
    totals.completed += row.completed;
    totals.gross += row.gross;
    totals.commission += row.commission;
    totals.local += row.local;
  }

  return {
    date,
    barbers: barberRows,
    totals,
  };
}
