import { Appointment } from "../models/Appointment.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import {
  businessDayStartUtc,
  shiftDayKey,
  tzParts,
} from "../utils/businessTime.js";

// RN6: mismo reparto que la liquidación (60% barbero / 40% local).
const COMMISSION_RATE = 0.6;
const TOP_LIMIT = 5;

// Estados que representan demanda real: se excluyen los turnos cancelados,
// porque liberaron (o no ocuparon) la agenda.
const REQUESTED_STATUSES = ["pending", "completed", "no_show"];

// RN5: una inasistencia cuenta igual si el cliente no se presentó o si
// canceló con menos de 24 h (late / blocked).
const ABSENCE_CANCEL_TYPES = ["late", "blocked"];

function emptyIncomeTotals() {
  return {
    completed: 0,
    gross: 0,
    commission: 0,
    local: 0,
  };
}

function addCompletedAppointment(totals, priceSnapshot) {
  const price = Number(priceSnapshot) || 0;
  const commission = Math.round(price * COMMISSION_RATE);
  totals.completed += 1;
  totals.gross += price;
  totals.commission += commission;
  totals.local += price - commission;
}

function isAbsence(appointment) {
  if (appointment.status === "no_show") return "no_show";
  if (
    appointment.status === "cancelled" &&
    ABSENCE_CANCEL_TYPES.includes(appointment.cancel_type)
  ) {
    return "late";
  }
  return null;
}

function barberName(barberById, barberId) {
  return barberById.get(barberId)?.name ?? "Barbero eliminado";
}

function topRows(counts, limit = TOP_LIMIT) {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
    .slice(0, limit);
}

// Reporte del negocio para un rango de días comerciales: ingresos, ausencias
// de clientes por barbero y lo más solicitado (servicio / barbero / horario).
export async function getBusinessReport({ from, to }) {
  const [appointments, barbers, services] = await Promise.all([
    Appointment.find({
      start_at: {
        $gte: businessDayStartUtc(from),
        $lt: businessDayStartUtc(shiftDayKey(to, 1)),
      },
    })
      .select(
        "barber_id service_ids start_at status cancel_type price_snapshot",
      )
      .lean(),
    User.find({ role: "barber" }).select("name active").lean(),
    Service.find({}).select("name").lean(),
  ]);

  const barberById = new Map(
    barbers.map((barber) => [barber._id.toString(), barber]),
  );
  const serviceNameById = new Map(
    services.map((service) => [service._id.toString(), service.name]),
  );

  const incomeRows = new Map();
  for (const barber of barbers) {
    if (!barber.active) continue;
    incomeRows.set(barber._id.toString(), {
      barberId: barber._id.toString(),
      barberName: barber.name,
      ...emptyIncomeTotals(),
    });
  }

  const absenceRows = new Map();
  for (const barber of barbers) {
    if (!barber.active) continue;
    absenceRows.set(barber._id.toString(), {
      barberId: barber._id.toString(),
      barberName: barber.name,
      noShow: 0,
      lateCancellations: 0,
      total: 0,
    });
  }

  const serviceCounts = new Map();
  const barberCounts = new Map();
  const hourCounts = new Map();

  const incomeTotals = emptyIncomeTotals();
  const absenceTotals = { noShow: 0, lateCancellations: 0, total: 0 };

  for (const appointment of appointments) {
    const barberId = appointment.barber_id.toString();
    const name = barberName(barberById, barberId);

    if (appointment.status === "completed") {
      let row = incomeRows.get(barberId);
      if (!row) {
        row = { barberId, barberName: name, ...emptyIncomeTotals() };
        incomeRows.set(barberId, row);
      }
      addCompletedAppointment(row, appointment.price_snapshot);
      addCompletedAppointment(incomeTotals, appointment.price_snapshot);
    }

    const absence = isAbsence(appointment);
    if (absence) {
      let row = absenceRows.get(barberId);
      if (!row) {
        row = {
          barberId,
          barberName: name,
          noShow: 0,
          lateCancellations: 0,
          total: 0,
        };
        absenceRows.set(barberId, row);
      }
      if (absence === "no_show") {
        row.noShow += 1;
        absenceTotals.noShow += 1;
      } else {
        row.lateCancellations += 1;
        absenceTotals.lateCancellations += 1;
      }
      row.total += 1;
      absenceTotals.total += 1;
    }

    if (!REQUESTED_STATUSES.includes(appointment.status)) continue;

    for (const serviceId of appointment.service_ids) {
      const key = serviceId.toString();
      const label = serviceNameById.get(key) ?? "Servicio eliminado";
      serviceCounts.set(label, (serviceCounts.get(label) ?? 0) + 1);
    }
    barberCounts.set(name, (barberCounts.get(name) ?? 0) + 1);

    const hour = Math.floor(tzParts(appointment.start_at).minutes / 60);
    const hourLabel = `${String(hour).padStart(2, "0")}:00`;
    hourCounts.set(hourLabel, (hourCounts.get(hourLabel) ?? 0) + 1);
  }

  const incomeBarbers = [...incomeRows.values()].sort((a, b) =>
    a.barberName.localeCompare(b.barberName, "es"),
  );
  const absenceBarbers = [...absenceRows.values()].sort(
    (a, b) => b.total - a.total || a.barberName.localeCompare(b.barberName, "es"),
  );

  return {
    from,
    to,
    income: {
      totals: incomeTotals,
      barbers: incomeBarbers,
    },
    absences: {
      totals: absenceTotals,
      barbers: absenceBarbers,
    },
    popular: {
      services: topRows(serviceCounts),
      barbers: topRows(barberCounts),
      hours: topRows(hourCounts),
    },
  };
}
