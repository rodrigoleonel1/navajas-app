import { Appointment } from "../models/Appointment.js";
import { Offer } from "../models/Offer.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import {
  businessDayRangeFilter,
  tzParts,
} from "../utils/businessTime.js";
import {
  addCompletedAppointment,
  emptyIncomeTotals,
} from "./income.js";

const TOP_LIMIT = 5;

// Estados que representan demanda real: se excluyen los turnos cancelados,
// porque liberaron (o no ocuparon) la agenda.
const REQUESTED_STATUSES = ["pending", "completed", "no_show"];

// RN5: una inasistencia cuenta igual si el cliente no se presentó o si
// canceló con menos de 24 h (late / blocked).
const ABSENCE_CANCEL_TYPES = ["late", "blocked"];

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

// Promedio de calificaciones con 1 decimal; null si no hay notas.
function averageRating(sum, count) {
  return count === 0 ? null : Math.round((sum / count) * 10) / 10;
}

// Reporte del negocio para un rango de días comerciales: ingresos, ausencias
// de clientes por barbero y lo más solicitado (servicio / barbero / horario).
export async function getBusinessReport({ from, to }) {
  const [appointments, barbers, services, offers] = await Promise.all([
    Appointment.find({
      start_at: businessDayRangeFilter(from, to),
    })
      .select(
        "barber_id service_ids offer_id start_at status cancel_type price_snapshot rating",
      )
      .lean(),
    User.find({ role: "barber" }).select("name active").lean(),
    Service.find({}).select("name").lean(),
    Offer.find({}).select("name").lean(),
  ]);

  const barberById = new Map(
    barbers.map((barber) => [barber._id.toString(), barber]),
  );
  const serviceNameById = new Map(
    services.map((service) => [service._id.toString(), service.name]),
  );
  const offerNameById = new Map(
    offers.map((offer) => [offer._id.toString(), offer.name]),
  );

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

  // EP-7: promedio de notas por barbero sobre turnos completados del período.
  const ratingRows = new Map();
  for (const barber of barbers) {
    if (!barber.active) continue;
    ratingRows.set(barber._id.toString(), {
      barberId: barber._id.toString(),
      barberName: barber.name,
      sum: 0,
      count: 0,
    });
  }

  const serviceCounts = new Map();
  const barberCounts = new Map();
  const hourCounts = new Map();
  const offerCounts = new Map();

  const incomeTotals = emptyIncomeTotals();
  const absenceTotals = { noShow: 0, lateCancellations: 0, total: 0 };
  const ratingTotals = { sum: 0, count: 0 };

  for (const appointment of appointments) {
    const barberId = appointment.barber_id.toString();
    const name = barberName(barberById, barberId);

    if (appointment.status === "completed") {
      addCompletedAppointment(incomeTotals, appointment.price_snapshot);

      if (appointment.rating != null) {
        let ratingRow = ratingRows.get(barberId);
        if (!ratingRow) {
          ratingRow = { barberId, barberName: name, sum: 0, count: 0 };
          ratingRows.set(barberId, ratingRow);
        }
        ratingRow.sum += appointment.rating;
        ratingRow.count += 1;
        ratingTotals.sum += appointment.rating;
        ratingTotals.count += 1;
      }
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

    if (appointment.offer_id) {
      const key = appointment.offer_id.toString();
      const label = offerNameById.get(key) ?? "Combo eliminado";
      offerCounts.set(label, (offerCounts.get(label) ?? 0) + 1);
    }

    const hour = Math.floor(tzParts(appointment.start_at).minutes / 60);
    const hourLabel = `${String(hour).padStart(2, "0")}:00`;
    hourCounts.set(hourLabel, (hourCounts.get(hourLabel) ?? 0) + 1);
  }

  const absenceBarbers = [...absenceRows.values()].sort(
    (a, b) => b.total - a.total || a.barberName.localeCompare(b.barberName, "es"),
  );
  const ratingBarbers = [...ratingRows.values()]
    .sort((a, b) => a.barberName.localeCompare(b.barberName, "es"))
    .map(({ sum, ...row }) => ({
      ...row,
      average: averageRating(sum, row.count),
    }));

  return {
    from,
    to,
    income: {
      totals: incomeTotals,
    },
    absences: {
      totals: absenceTotals,
      barbers: absenceBarbers,
    },
    ratings: {
      average: averageRating(ratingTotals.sum, ratingTotals.count),
      count: ratingTotals.count,
      barbers: ratingBarbers,
    },
    popular: {
      services: topRows(serviceCounts),
      offers: topRows(offerCounts),
      barbers: topRows(barberCounts),
      hours: topRows(hourCounts),
    },
  };
}
